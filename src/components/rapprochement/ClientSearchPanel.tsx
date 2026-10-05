"use client";

import React, { useState, useMemo } from "react";
import {
  Search, Users, AlertTriangle, Fingerprint,
  ChevronDown, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiIdSuspect {
  normName: string;
  compositeKey?: string;
  displayName: string;
  ids: string[];
  idTypes?: ("CIN" | "PASSPORT" | "UNKNOWN")[];
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  discriminators?: number;
  discriminatorLabels?: string[];
}

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
  const [suspectQuery, setSuspectQuery] = useState("");
  const [expandedSuspect, setExpandedSuspect] = useState<string | null>(null);

  // Safe KPI values — guard against old reports without these fields
  const totalForms           = regtoolsKPIs?.totalForms           ?? 0;
  const multiIdClients       = regtoolsKPIs?.multiIdClients       ?? 0;
  const estimatedUniqueClients = regtoolsKPIs?.estimatedUniqueClients ?? 0;
  const multiIdDetails: MultiIdSuspect[] = regtoolsKPIs?.multiIdDetails ?? [];

  const filteredSuspects = useMemo(() => {
    const q = suspectQuery.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!q) return multiIdDetails;
    return multiIdDetails.filter(s => {
      const nameN = s.displayName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const hasId = s.ids.some(id => id.toLowerCase().includes(q));
      return nameN.includes(q) || hasId;
    });
  }, [multiIdDetails, suspectQuery]);

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

          {/* Multi-ID suspects → clickable to scroll */}
          <div className="text-center">
            <p className="text-sm font-black text-violet-600">
              − {multiIdClients > 0 ? multiIdClients.toLocaleString("fr-FR") : "0"}
            </p>
            <p className="text-[8px] font-bold uppercase text-violet-400 tracking-wider">Suspects CIN+PP</p>
          </div>

          {/* Estimated unique */}
          <div className="text-center border-l border-emerald-200 dark:border-emerald-800/50 pl-8">
            <p className="text-3xl font-black text-emerald-600">
              {estimatedUniqueClients > 0
                ? estimatedUniqueClients.toLocaleString("fr-FR")
                : totalForms > 0
                ? totalForms.toLocaleString("fr-FR")
                : "—"}
            </p>
            <p className="text-[9px] font-black uppercase text-emerald-600 tracking-wider">≈ Clients Uniques Sains</p>
          </div>
        </div>
      </div>

      {/* ── Suspects Multi-ID Header ── */}
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-3.5 w-3.5 text-violet-500" />
          <p className="text-xs font-black text-slate-700 dark:text-slate-200">Suspects Multi-Identifiant</p>
          <span className="ml-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-violet-100 dark:bg-violet-900/40 text-violet-600">
            {multiIdClients}
          </span>
          <span className="ml-auto text-[9px] text-slate-400 font-medium">
            même nom + type d'entité, IDs de formats différents (CIN ≠ Passeport)
          </span>
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
          <p className="text-[10px] text-slate-400">{filteredSuspects.length.toLocaleString("fr-FR")} résultat{filteredSuspects.length !== 1 ? "s" : ""}</p>
        )}
      </div>

      {/* ── Suspects list ── */}
      <div className="overflow-y-auto px-5 py-3 space-y-1.5 max-h-[500px]">
        {filteredSuspects.length === 0 ? (
          <div className="text-center py-14 text-slate-400 text-xs font-semibold">
            <Fingerprint className="h-8 w-8 mx-auto mb-3 opacity-30" />
            {multiIdDetails.length === 0
              ? "Aucun suspect dans ce rapport."
              : "Aucun résultat pour cette recherche."}
          </div>
        ) : (
          filteredSuspects.slice(0, 500).map((suspect, idx) => {
            const key = `s_${suspect.normName}_${idx}`;
            const isExpanded = expandedSuspect === key;
            const conf = suspect.confidence ?? "LOW";

            const confBadge = {
              HIGH:   { label: "Confirmé CIN + Passeport", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", dot: "bg-emerald-500" },
              MEDIUM: { label: "2 Passeports (info)",       cls: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",           dot: "bg-slate-400" },
              LOW:    { label: "Incertain (nom seul)",       cls: "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500",           dot: "bg-slate-300" },
            }[conf];

            return (
              <div key={key} className={cn(
                "rounded-xl border transition-all overflow-hidden",
                isExpanded
                  ? "border-violet-300 dark:border-violet-700 shadow-md shadow-violet-500/10"
                  : "border-slate-200/70 dark:border-slate-800/70 hover:border-violet-200 dark:hover:border-violet-800"
              )}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
                  onClick={() => setExpandedSuspect(isExpanded ? null : key)}
                >
                  <div className="h-7 w-7 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                    <Fingerprint className="h-3.5 w-3.5 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {highlight(suspect.displayName, suspectQuery)}
                    </p>
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
                  <div className="border-t border-violet-100 dark:border-violet-900/30 bg-violet-50/40 dark:bg-violet-950/10 px-4 py-3 space-y-2">
                    {/* ID list with type badges */}
                    <div className="flex flex-wrap gap-2">
                      {suspect.ids.map((id, i) => {
                        const idType = suspect.idTypes?.[i];
                        return (
                          <div key={i} className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-800 text-slate-700 dark:text-slate-300">
                              {highlight(id, suspectQuery)}
                            </span>
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
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    <p className="text-[8px] text-slate-400 leading-relaxed">
                      {conf === "LOW"
                        ? "⚠ Même nom uniquement — risque de faux positif. Vérification manuelle recommandée. Non comptabilisé dans le KPI."
                        : conf === "MEDIUM"
                        ? "Deux passeports distincts pour le même profil. Affiché pour information — non soustrait du portefeuille sain."
                        : `Ce client est présent ${suspect.ids.length}× dans RegTools avec des documents d'identité différents → 1 seule fiche réelle attendue. Soustrait du portefeuille sain.`}
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
