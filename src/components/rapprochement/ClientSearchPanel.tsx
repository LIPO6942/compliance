"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search, Users, AlertTriangle, Fingerprint,
  ChevronDown, ChevronRight, CheckCircle2, XCircle,
  Download, Undo2, Check, ShieldCheck, ArrowRight
} from "lucide-react";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { db, isFirebaseConfigured } from "@/lib/firebase";

export interface MultiIdSuspect {
  normName: string;
  compositeKey?: string;
  displayName: string;
  ids: string[];
  idTypes?: ("CIN" | "PASSPORT" | "UNKNOWN")[];
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  discriminators?: number;
  discriminatorLabels?: string[];
}

export interface MultiIdValidationRecord {
  status: "VALIDATED" | "DISMISSED";
  validatedAt: string;
  validatedBy: string;
  primaryId?: string;
  notes?: string;
}

type ValidationsMap = Record<string, MultiIdValidationRecord>;
type SubTab = "SUSPECTS" | "VALIDATED" | "DISMISSED";

const STORAGE_KEY = "compliance_multi_id_validations";

interface ClientSearchPanelProps {
  savedReports: any[];
  resolveAgencyInfo: (code: any) => { code: string; name: string; type: string };
  onClose?: () => void;
  isExternalLoading?: boolean;
  regtoolsKPIs?: {
    totalForms?: number;
    multiIdClients?: number;
    estimatedUniqueClients?: number;
    multiIdDetails?: MultiIdSuspect[];
  } | null;
}

const highlight = (text: string, query: string): React.ReactNode => {
  if (!query.trim() || !text) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((p, i) =>
    p.toLowerCase() === query.trim().toLowerCase()
      ? <mark key={i} className="bg-amber-200 dark:bg-amber-700/60 text-amber-900 dark:text-amber-100 rounded px-0.5">{p}</mark>
      : p
  );
};

export const ClientSearchPanel: React.FC<ClientSearchPanelProps> = ({
  savedReports,
  resolveAgencyInfo,
  onClose,
  isExternalLoading = false,
  regtoolsKPIs = null,
}) => {
  const { user } = useUser();
  const [suspectQuery, setSuspectQuery] = useState("");
  const [expandedSuspect, setExpandedSuspect] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<SubTab>("SUSPECTS");
  const [validations, setValidations] = useState<ValidationsMap>({});
  const [selectedPrimaryIds, setSelectedPrimaryIds] = useState<Record<string, string>>({});

  // ─── 1. Load & Sync Validations (localStorage + Firestore) ─────────
  useEffect(() => {
    // 1. Initial load from localStorage
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        setValidations(JSON.parse(local));
      }
    } catch (e) {
      console.warn("Erreur lecture localStorage validations Multi-ID:", e);
    }

    // 2. Fetch and synchronize from Firestore if configured
    if (isFirebaseConfigured && db) {
      import("firebase/firestore").then(({ doc, getDoc, onSnapshot }) => {
        const docRef = doc(db, "complianceSettings", "multiIdValidations");
        getDoc(docRef).then(snap => {
          if (snap.exists()) {
            const data = snap.data();
            if (data && data.validations) {
              setValidations(prev => {
                const merged = { ...prev, ...data.validations };
                try {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                } catch {}
                return merged;
              });
            }
          }
        }).catch(err => console.warn("Firestore fetch error multiIdValidations:", err));

        // Realtime listener
        const unsub = onSnapshot(docRef, snap => {
          if (snap.exists()) {
            const data = snap.data();
            if (data && data.validations) {
              setValidations(prev => {
                const merged = { ...prev, ...data.validations };
                try {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                } catch {}
                return merged;
              });
            }
          }
        }, err => console.warn("Firestore listener error multiIdValidations:", err));

        return () => unsub();
      }).catch(err => console.warn("Firestore dynamic import error:", err));
    }
  }, []);

  // Save validation to state, localStorage and Firestore
  const saveValidation = useCallback((normName: string, record: MultiIdValidationRecord | null) => {
    setValidations(prev => {
      const updated = { ...prev };
      if (record === null) {
        delete updated[normName];
      } else {
        updated[normName] = record;
      }

      // LocalStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn("LocalStorage save error:", e);
      }

      // Firestore
      if (isFirebaseConfigured && db) {
        import("firebase/firestore").then(({ doc, setDoc }) => {
          const docRef = doc(db, "complianceSettings", "multiIdValidations");
          setDoc(docRef, { validations: updated, updatedAt: new Date().toISOString() }, { merge: true })
            .catch(err => console.error("Firestore write multiIdValidations error:", err));
        }).catch(e => console.error("Firestore import error:", e));
      }

      return updated;
    });
  }, []);

  // ─── 2. Data Categorization & KPIs ─────────────────────────────────
  const totalForms = regtoolsKPIs?.totalForms ?? 0;
  const multiIdDetails: MultiIdSuspect[] = regtoolsKPIs?.multiIdDetails ?? [];

  // Group suspects according to their validation status
  const { pendingSuspects, validatedSuspects, dismissedSuspects } = useMemo(() => {
    const pending: MultiIdSuspect[] = [];
    const validated: MultiIdSuspect[] = [];
    const dismissed: MultiIdSuspect[] = [];

    multiIdDetails.forEach(suspect => {
      const val = validations[suspect.normName];
      if (val?.status === "VALIDATED") {
        validated.push(suspect);
      } else if (val?.status === "DISMISSED") {
        dismissed.push(suspect);
      } else {
        pending.push(suspect);
      }
    });

    return {
      pendingSuspects: pending,
      validatedSuspects: validated,
      dismissedSuspects: dismissed
    };
  }, [multiIdDetails, validations]);

  // Total verified deductions for clean portfolio estimation
  const effectiveDeductions = useMemo(() => {
    return multiIdDetails.filter(s => {
      const val = validations[s.normName];
      // 1. Confirmed validated Multi-ID
      if (val?.status === "VALIDATED") return true;
      // 2. High confidence suspects that are NOT dismissed as false positives
      if (s.confidence === "HIGH" && val?.status !== "DISMISSED") return true;
      return false;
    }).length;
  }, [multiIdDetails, validations]);

  const estimatedCleanClients = totalForms > 0 ? Math.max(0, totalForms - effectiveDeductions) : 0;

  // Active items for current sub-tab
  const currentTabItems = useMemo(() => {
    if (subTab === "VALIDATED") return validatedSuspects;
    if (subTab === "DISMISSED") return dismissedSuspects;
    return pendingSuspects;
  }, [subTab, pendingSuspects, validatedSuspects, dismissedSuspects]);

  // Apply search query filter
  const filteredItems = useMemo(() => {
    const q = suspectQuery.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!q) return currentTabItems;
    return currentTabItems.filter(s => {
      const nameN = s.displayName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const hasId = s.ids.some(id => id.toLowerCase().includes(q));
      return nameN.includes(q) || hasId;
    });
  }, [currentTabItems, suspectQuery]);

  // ─── 3. Action Handlers ───────────────────────────────────────────
  const handleValidateSuspect = (suspect: MultiIdSuspect) => {
    const cinIdx = suspect.idTypes?.findIndex(t => t === "CIN") ?? -1;
    const defaultPrimary = (cinIdx !== -1 ? suspect.ids[cinIdx] : suspect.ids[0]) || "";
    const primaryId = selectedPrimaryIds[suspect.normName] || defaultPrimary;

    const record: MultiIdValidationRecord = {
      status: "VALIDATED",
      validatedAt: new Date().toISOString(),
      validatedBy: user?.name || "Responsable Conformité",
      primaryId,
    };

    saveValidation(suspect.normName, record);
    setExpandedSuspect(null);
  };

  const handleDismissSuspect = (suspect: MultiIdSuspect) => {
    const record: MultiIdValidationRecord = {
      status: "DISMISSED",
      validatedAt: new Date().toISOString(),
      validatedBy: user?.name || "Responsable Conformité",
    };

    saveValidation(suspect.normName, record);
    setExpandedSuspect(null);
  };

  const handleResetValidation = (suspect: MultiIdSuspect) => {
    saveValidation(suspect.normName, null);
  };

  // ─── 4. Excel Export: Multi-ID validés pour correction ─────────────
  const handleExportValidated = () => {
    if (validatedSuspects.length === 0) return;

    const headers = [
      "Nom du Client",
      "Statut de l'Anomalie",
      "Nombre d'Identifiants",
      "Identifiant Principal (À conserver)",
      "Identifiants Secondaires (À fusionner)",
      "Tous les Identifiants Détectés",
      "Détail des Documents",
      "Critères de Concordance",
      "Validé Par",
      "Date de Validation"
    ];

    const rows = validatedSuspects.map(suspect => {
      const val = validations[suspect.normName];
      const primaryId = val?.primaryId || suspect.ids[0];
      const secondaryIds = suspect.ids.filter(id => id !== primaryId).join(" ; ");
      const typesStr = (suspect.idTypes || []).map((t, i) => `${suspect.ids[i]} (${t})`).join(" ; ");
      const criteriaStr = (suspect.discriminatorLabels || []).join(", ");
      const dateFormatted = val?.validatedAt
        ? new Date(val.validatedAt).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })
        : "";

      return [
        suspect.displayName,
        "Multi-ID Validé (À corriger)",
        suspect.ids.length,
        primaryId,
        secondaryIds,
        suspect.ids.join(" ; "),
        typesStr,
        criteriaStr,
        val?.validatedBy || "Responsable Conformité",
        dateFormatted
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Multi-ID à Corriger");

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    XLSX.writeFile(wb, `Multi_ID_Valides_Pour_Correction_${dateStr}.xlsx`);
  };

  return (
    <div className="flex flex-col bg-white dark:bg-slate-950 rounded-3xl border border-slate-200/80 dark:border-slate-800/60 overflow-hidden shadow-xl">

      {/* ── Portefeuille Sain Banner ── */}
      <div className="rounded-t-3xl border-b border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 px-6 py-4 flex items-center gap-6">
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow shadow-emerald-500/30">
            <Users className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Portefeuille Sain Estimé</p>
            <p className="text-[8px] text-slate-500 dark:text-slate-400">Total RegTools − clients à double document confirmé (CIN + Passeport)</p>
          </div>
        </div>

        <div className="flex gap-8 ml-auto items-center">
          {/* Total RegTools */}
          <div className="text-center">
            <p className="text-sm font-black text-slate-700 dark:text-slate-200">
              {totalForms > 0 ? totalForms.toLocaleString("fr-FR") : "—"}
            </p>
            <p className="text-[8px] font-bold uppercase text-slate-400 tracking-wider">Total RegTools</p>
          </div>

          {/* Multi-ID suspects / doublons déduits */}
          <div className="text-center">
            <p className="text-sm font-black text-violet-600">
              − {effectiveDeductions > 0 ? effectiveDeductions.toLocaleString("fr-FR") : "0"}
            </p>
            <p className="text-[8px] font-bold uppercase text-violet-400 tracking-wider">Doublons CIN+PP</p>
          </div>

          {/* Estimated unique */}
          <div className="text-center border-l border-emerald-200 dark:border-emerald-800/50 pl-8">
            <p className="text-3xl font-black text-emerald-600">
              {estimatedCleanClients > 0
                ? estimatedCleanClients.toLocaleString("fr-FR")
                : totalForms > 0
                ? totalForms.toLocaleString("fr-FR")
                : "—"}
            </p>
            <p className="text-[9px] font-black uppercase text-emerald-600 tracking-wider">≈ Clients Uniques Sains</p>
          </div>
        </div>
      </div>

      {/* ── Sub-tabs Navigation ── */}
      <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-xs font-bold">
        <button
          onClick={() => { setSubTab("SUSPECTS"); setExpandedSuspect(null); }}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer",
            subTab === "SUSPECTS"
              ? "bg-violet-600 text-white shadow-sm shadow-violet-600/30 font-black"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
          )}
        >
          <Fingerprint className="h-3.5 w-3.5" />
          <span>Suspects Multi-Identifiant</span>
          <span className={cn(
            "px-1.5 py-0.5 rounded-md text-[9px] font-black",
            subTab === "SUSPECTS" ? "bg-white/20 text-white" : "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
          )}>
            {pendingSuspects.length}
          </span>
        </button>

        <button
          onClick={() => { setSubTab("VALIDATED"); setExpandedSuspect(null); }}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer",
            subTab === "VALIDATED"
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-black"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Multi-ID validés (À corriger)</span>
          <span className={cn(
            "px-1.5 py-0.5 rounded-md text-[9px] font-black",
            subTab === "VALIDATED" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          )}>
            {validatedSuspects.length}
          </span>
        </button>

        <button
          onClick={() => { setSubTab("DISMISSED"); setExpandedSuspect(null); }}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer",
            subTab === "DISMISSED"
              ? "bg-slate-700 text-white shadow-sm font-black"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
          )}
        >
          <XCircle className="h-3.5 w-3.5" />
          <span>Faux Positifs écartés</span>
          <span className={cn(
            "px-1.5 py-0.5 rounded-md text-[9px] font-black",
            subTab === "DISMISSED" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          )}>
            {dismissedSuspects.length}
          </span>
        </button>

        {subTab === "VALIDATED" && validatedSuspects.length > 0 && (
          <button
            onClick={handleExportValidated}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black shadow-sm shadow-emerald-600/30 transition-all cursor-pointer"
            title="Exporter les Multi-ID validés pour correction au format Excel"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exporter les Multi-ID validés pour correction</span>
          </button>
        )}
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          {subTab === "SUSPECTS" ? (
            <>
              <Fingerprint className="h-3.5 w-3.5 text-violet-500" />
              <p className="text-xs font-black text-slate-700 dark:text-slate-200">Suspects en attente d'examen</p>
              <span className="ml-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-violet-100 dark:bg-violet-900/40 text-violet-600">
                {pendingSuspects.length}
              </span>
              <span className="ml-auto text-[9px] text-slate-400 font-medium">
                même nom + type d'entité, IDs de formats différents (CIN ≠ Passeport)
              </span>
            </>
          ) : subTab === "VALIDATED" ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <p className="text-xs font-black text-slate-700 dark:text-slate-200">Dossiers confirmés à assainir</p>
              <span className="ml-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600">
                {validatedSuspects.length}
              </span>
              <span className="ml-auto text-[9px] text-slate-400 font-medium">
                Multi-identifiants confirmés par la conformité
              </span>
            </>
          ) : (
            <>
              <XCircle className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-xs font-black text-slate-700 dark:text-slate-200">Homonymes classés sans suite</p>
              <span className="ml-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {dismissedSuspects.length}
              </span>
              <span className="ml-auto text-[9px] text-slate-400 font-medium">
                Cas écartés de la détection de doublons
              </span>
            </>
          )}
        </div>

        {multiIdDetails.length === 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Aucun suspect calculé. Relancez un rapprochement avec le fichier RegTools pour alimenter cette liste.
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={suspectQuery}
            onChange={e => setSuspectQuery(e.target.value)}
            placeholder="Rechercher par nom ou identifiant..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
          {suspectQuery && (
            <button onClick={() => setSuspectQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
          )}
        </div>
        {suspectQuery && (
          <p className="text-[10px] text-slate-400">{filteredItems.length.toLocaleString("fr-FR")} résultat{filteredItems.length !== 1 ? "s" : ""}</p>
        )}
      </div>

      {/* ── Suspects list ── */}
      <div className="overflow-y-auto px-5 py-3 space-y-2 max-h-[500px]">
        {filteredItems.length === 0 ? (
          <div className="text-center py-14 text-slate-400 text-xs font-semibold">
            {subTab === "SUSPECTS" ? (
              <>
                <Fingerprint className="h-8 w-8 mx-auto mb-3 opacity-30 text-violet-500" />
                {pendingSuspects.length === 0
                  ? "Tous les suspects ont été validés ou classés ! Aucun suspect en attente."
                  : "Aucun suspect ne correspond à cette recherche."}
              </>
            ) : subTab === "VALIDATED" ? (
              <>
                <CheckCircle2 className="h-8 w-8 mx-auto mb-3 opacity-30 text-emerald-500" />
                {validatedSuspects.length === 0
                  ? "Aucun Multi-ID validé pour le moment. Examinez les suspects pour en valider."
                  : "Aucun Multi-ID validé ne correspond à cette recherche."}
              </>
            ) : (
              <>
                <XCircle className="h-8 w-8 mx-auto mb-3 opacity-30 text-slate-400" />
                {dismissedSuspects.length === 0
                  ? "Aucun dossier écarté pour le moment."
                  : "Aucun dossier écarté ne correspond à cette recherche."}
              </>
            )}
          </div>
        ) : (
          filteredItems.slice(0, 500).map((suspect, idx) => {
            const key = `s_${suspect.normName}_${idx}`;
            const isExpanded = expandedSuspect === key;
            const conf = suspect.confidence ?? "LOW";
            const valRecord = validations[suspect.normName];

            const confBadge = {
              HIGH:   { label: "Confirmé CIN + Passeport", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", dot: "bg-emerald-500" },
              MEDIUM: { label: "2 Passeports (info)",       cls: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",           dot: "bg-slate-400" },
              LOW:    { label: "Incertain (nom seul)",       cls: "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500",           dot: "bg-slate-300" },
            }[conf];

            // Resolve default master ID
            const cinIdx = suspect.idTypes?.findIndex(t => t === "CIN") ?? -1;
            const defaultMasterId = (cinIdx !== -1 ? suspect.ids[cinIdx] : suspect.ids[0]) || "";
            const currentSelectedMaster = selectedPrimaryIds[suspect.normName] || valRecord?.primaryId || defaultMasterId;

            return (
              <div key={key} className={cn(
                "rounded-xl border transition-all overflow-hidden",
                valRecord?.status === "VALIDATED"
                  ? "border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/10"
                  : valRecord?.status === "DISMISSED"
                  ? "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 opacity-75"
                  : isExpanded
                  ? "border-violet-300 dark:border-violet-700 shadow-md shadow-violet-500/10"
                  : "border-slate-200/70 dark:border-slate-800/70 hover:border-violet-200 dark:hover:border-violet-800"
              )}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer"
                  onClick={() => setExpandedSuspect(isExpanded ? null : key)}
                >
                  <div className={cn(
                    "h-7 w-7 rounded-xl flex items-center justify-center shrink-0",
                    valRecord?.status === "VALIDATED"
                      ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600"
                      : valRecord?.status === "DISMISSED"
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-500"
                      : "bg-violet-100 dark:bg-violet-900/30 text-violet-500"
                  )}>
                    {valRecord?.status === "VALIDATED" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : valRecord?.status === "DISMISSED" ? (
                      <XCircle className="h-4 w-4 text-slate-500" />
                    ) : (
                      <Fingerprint className="h-3.5 w-3.5 text-violet-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {highlight(suspect.displayName, suspectQuery)}
                      </p>
                      {valRecord?.status === "VALIDATED" && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          Multi-ID Validé (À corriger)
                        </span>
                      )}
                      {valRecord?.status === "DISMISSED" && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Faux Positif (Écarté)
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-violet-500 font-semibold mt-0.5">
                      {suspect.ids.length} identifiant{suspect.ids.length > 1 ? "s" : ""} distincts
                      {suspect.discriminators ? ` · ${suspect.discriminators} critère${suspect.discriminators > 1 ? "s" : ""} confirmé${suspect.discriminators > 1 ? "s" : ""}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={cn("h-1.5 w-1.5 rounded-full", confBadge.dot)} />
                    <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-md", confBadge.cls)}>
                      {confBadge.label}
                    </span>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600">
                      ×{suspect.ids.length}
                    </span>
                  </div>

                  {isExpanded
                    ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    : <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-violet-100 dark:border-violet-900/30 bg-violet-50/40 dark:bg-violet-950/10 px-4 py-3 space-y-3">
                    {/* Validation info banner if already validated */}
                    {valRecord && (
                      <div className={cn(
                        "p-2.5 rounded-xl border text-[10px] flex items-center justify-between",
                        valRecord.status === "VALIDATED"
                          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                          : "bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                      )}>
                        <div>
                          <span className="font-bold">
                            {valRecord.status === "VALIDATED" ? "✓ Multi-ID validé pour correction" : "✕ Faux positif écarté"}
                          </span>
                          <span className="opacity-75 ml-2 font-medium">
                            par {valRecord.validatedBy} le {new Date(valRecord.validatedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleResetValidation(suspect)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-[9px] cursor-pointer text-slate-600 dark:text-slate-300 shadow-2xs"
                          title="Annuler la décision et renvoyer vers les suspects"
                        >
                          <Undo2 className="h-3 w-3" />
                          <span>Annuler décision</span>
                        </button>
                      </div>
                    )}

                    {/* ID list with type badges and selectable master */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                          Identifiants détectés dans RegTools :
                        </span>
                        {valRecord?.status !== "DISMISSED" && (
                          <span className="text-[8px] text-slate-400 font-medium">
                            {valRecord?.status === "VALIDATED" ? "Identifiant de référence désigné :" : "Cliquez sur une pièce pour la désigner comme document maître à conserver"}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {suspect.ids.map((id, i) => {
                          const idType = suspect.idTypes?.[i];
                          const isMaster = currentSelectedMaster === id;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                if (!valRecord || valRecord.status !== "DISMISSED") {
                                  setSelectedPrimaryIds(prev => ({ ...prev, [suspect.normName]: id }));
                                }
                              }}
                              className={cn(
                                "flex flex-col items-center gap-0.5 p-1.5 rounded-xl border text-left transition-all cursor-pointer",
                                isMaster
                                  ? "bg-white dark:bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
                                  : "bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-violet-300"
                              )}
                            >
                              <div className="flex items-center gap-1">
                                {isMaster && <Check className="h-2.5 w-2.5 text-emerald-600" />}
                                <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200">
                                  {highlight(id, suspectQuery)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className={cn(
                                  "text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider",
                                  idType === "CIN"
                                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
                                    : idType === "PASSPORT"
                                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
                                    : "bg-slate-100 text-slate-400"
                                )}>
                                  {idType === "CIN" ? "CIN" : idType === "PASSPORT" ? "Passeport" : "?"}
                                </span>
                                {isMaster && (
                                  <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-emerald-600 text-white uppercase tracking-wider">
                                    Maître
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanation */}
                    <p className="text-[8px] text-slate-400 leading-relaxed">
                      {conf === "LOW"
                        ? "⚠ Même nom uniquement — risque de faux positif. Vérification manuelle recommandée."
                        : conf === "MEDIUM"
                        ? "Deux passeports distincts pour le même profil. Affiché pour information."
                        : `Ce client est présent ${suspect.ids.length}× dans RegTools avec des documents d'identité différents (1 seule fiche réelle attendue).`}
                    </p>

                    {/* Discriminator labels */}
                    {suspect.discriminatorLabels && suspect.discriminatorLabels.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[8px] text-slate-400 font-semibold mr-0.5">Critères confirmés :</span>
                        {suspect.discriminatorLabels.map((lbl, i) => (
                          <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-bold">
                            {lbl}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* ── Action Buttons ── */}
                    <div className="pt-2 border-t border-violet-100 dark:border-violet-900/30 flex flex-wrap items-center gap-2">
                      {valRecord?.status !== "VALIDATED" && (
                        <button
                          type="button"
                          onClick={() => handleValidateSuspect(suspect)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black shadow-sm shadow-emerald-600/30 transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Valider Multi-ID (À corriger)</span>
                        </button>
                      )}

                      {valRecord?.status !== "DISMISSED" && (
                        <button
                          type="button"
                          onClick={() => handleDismissSuspect(suspect)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold transition-all cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Faux Positif (Homonyme)</span>
                        </button>
                      )}

                      {valRecord && (
                        <button
                          type="button"
                          onClick={() => handleResetValidation(suspect)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 text-[10px] font-semibold transition-all cursor-pointer ml-auto"
                        >
                          <Undo2 className="h-3 w-3" />
                          <span>Remettre en suspect</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
