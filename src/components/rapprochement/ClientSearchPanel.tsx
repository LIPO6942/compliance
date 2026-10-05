"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Search, UserRound, Users, Loader2,
  ChevronDown, ChevronRight, FileSearch, AlertTriangle, Fingerprint
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientRow {
  identifiant: string;
  name: string;
  agenceCode: string;
  agenceName: string;
  agenceType: string;
  portfolio: "NS" | "VIE";
  allFields: Record<string, string>;
}

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

const unminifyRows = (minified: any[][], cols: string[]): any[] => {
  if (!minified || !cols || cols.length === 0) return [];
  return minified.map(rowArr => {
    const rowObj: any = {};
    cols.forEach((col, idx) => { rowObj[col] = rowArr[idx]; });
    const lastEl = rowArr[rowArr.length - 1];
    if (rowArr.length === cols.length + 1 && typeof lastEl === "string" && lastEl.startsWith("{")) {
      try { Object.assign(rowObj, JSON.parse(lastEl)); } catch (e) { /* ignore */ }
    }
    return rowObj;
  });
};

export const ClientSearchPanel: React.FC<ClientSearchPanelProps> = ({
  savedReports,
  resolveAgencyInfo,
  onClose,
  isExternalLoading = false,
  regtoolsKPIs = null,
}) => {
  const [activeTab, setActiveTab] = useState<"absents" | "suspects">("absents");
  const [searchQuery, setSearchQuery] = useState("");
  const [suspectQuery, setSuspectQuery] = useState("");
  const [portfolioFilter, setPortfolioFilter] = useState<"ALL" | "NS" | "VIE">("ALL");
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [expandedSuspect, setExpandedSuspect] = useState<string | null>(null);
  const [lastMonthRows, setLastMonthRows] = useState<ClientRow[]>([]);
  const [lastMonthLabel, setLastMonthLabel] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const effectivelyLoading = isExternalLoading || isLoading;

  // Safe KPI values (guard against old reports missing fields)
  const totalForms = regtoolsKPIs?.totalForms ?? 0;
  const multiIdClients = regtoolsKPIs?.multiIdClients ?? 0;
  const estimatedUniqueClients = regtoolsKPIs?.estimatedUniqueClients ?? 0;
  const multiIdDetails: MultiIdSuspect[] = regtoolsKPIs?.multiIdDetails ?? [];

  // Extract clients from the most recent month only
  useEffect(() => {
    setIsLoading(true);

    const baseKeys = [...new Set(savedReports.map((r: any) => String(r.monthKey).replace(/_(NS|VIE)$/i, "")))]
      .sort((a, b) => b.localeCompare(a));

    const mostRecentBase = baseKeys[0];
    if (!mostRecentBase) { setIsLoading(false); return; }

    const matching = savedReports.filter((r: any) =>
      String(r.monthKey).replace(/_(NS|VIE)$/i, "") === mostRecentBase
    );

    setLastMonthLabel(matching[0]?.monthLabel || mostRecentBase);

    const clients: ClientRow[] = [];

    for (const report of matching) {
      let missingRows = report.missingRows || [];
      if (missingRows.length === 0 && report.minifiedMissingRows?.length > 0) {
        missingRows = unminifyRows(report.minifiedMissingRows, report.columnsNS || []);
      }
      if (missingRows.length === 0) {
        try {
          const stored = localStorage.getItem(`regtools_report_${report.monthKey}`);
          if (stored) {
            const full = JSON.parse(stored);
            missingRows = full.missingRows || [];
            if (missingRows.length === 0 && full.minifiedMissingRows?.length > 0) {
              missingRows = unminifyRows(full.minifiedMissingRows, full.columnsNS || report.columnsNS || []);
            }
          }
        } catch (e) { /* ignore */ }
      }

      const rType = report.reconciliationType || "NS";
      const isVie = rType === "VIE";
      const idCol = isVie
        ? (report.mapping?.vieId || "Numero de carte d identite ou matricule fiscal")
        : (report.mapping?.nsId || "Identifiant");
      const agCol = isVie
        ? (report.mapping?.vieAgence || "Canal de souscription")
        : (report.mapping?.nsAgence || "N_GESTIONNAIRE");
      const cols: string[] = isVie ? (report.columnsVIE || []) : (report.columnsNS || []);
      const nameCol = cols.find((c: string) => /nom/i.test(c) && !/num|n_/i.test(c))
        || (isVie ? "Nom et prenom du souscripteur" : "NOM_CLIENT");

      for (const row of missingRows) {
        const rawName = row[nameCol] || row["NOM_CLIENT"] || row["nom_client"] || row["Nom et prenom du souscripteur"] || "";
        if (!rawName) continue;
        const identifiant = String(row[idCol] || row["Identifiant"] || "").trim();
        const agRaw = row[agCol] || row["N_GESTIONNAIRE"] || "";
        const agInfo = resolveAgencyInfo(agRaw);
        const allFields: Record<string, string> = {};
        Object.entries(row).forEach(([k, v]) => {
          if (!k.startsWith("__") && v !== undefined && v !== null && v !== "") {
            allFields[k] = String(v);
          }
        });
        clients.push({
          identifiant,
          name: String(rawName).trim().toUpperCase(),
          agenceCode: agInfo.code,
          agenceName: agInfo.name || agInfo.code,
          agenceType: agInfo.type || "",
          portfolio: isVie ? "VIE" : "NS",
          allFields,
        });
      }
    }

    setLastMonthRows(clients);
    setIsLoading(false);
  }, [savedReports]);

  const filteredAbsents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return lastMonthRows.filter(c => {
      if (portfolioFilter !== "ALL" && c.portfolio !== portfolioFilter) return false;
      if (!q) return true;
      const nameN = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const agN = c.agenceName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return nameN.includes(q) || c.identifiant.toLowerCase().includes(q) || agN.includes(q);
    });
  }, [lastMonthRows, searchQuery, portfolioFilter]);

  const filteredSuspects = useMemo(() => {
    const q = suspectQuery.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!q) return multiIdDetails;
    return multiIdDetails.filter(s => {
      const nameN = s.displayName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const hasId = s.ids.some(id => id.toLowerCase().includes(q));
      return nameN.includes(q) || hasId;
    });
  }, [multiIdDetails, suspectQuery]);

  const uniqueMonthCount = new Set(savedReports.map((r: any) => String(r.monthKey).replace(/_(NS|VIE)$/i, ""))).size;

  return (
    <div className="flex flex-col bg-white dark:bg-slate-950 rounded-3xl border border-slate-200/80 dark:border-slate-800/60 overflow-hidden shadow-xl">

      {/* Portefeuille Sain Banner — always visible */}
      {totalForms > 0 && (
        <div className="mx-0 rounded-t-3xl border-b border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 px-6 py-3 flex items-center gap-6">
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow shadow-emerald-500/30">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Portefeuille Sain Estimé</p>
              <p className="text-[8px] text-slate-500">Total RegTools − clients à double document (CIN + Passeport)</p>
            </div>
          </div>
          <div className="flex gap-6 ml-auto items-center">
            <div className="text-center">
              <p className="text-sm font-black text-slate-700 dark:text-slate-200">{totalForms.toLocaleString("fr-FR")}</p>
              <p className="text-[8px] font-bold uppercase text-slate-400">Total RegTools</p>
            </div>
            <div className="text-center">
              <button
                onClick={() => setActiveTab("suspects")}
                className="group cursor-pointer"
              >
                <p className="text-sm font-black text-violet-600 group-hover:underline">−{multiIdClients.toLocaleString("fr-FR")}</p>
                <p className="text-[8px] font-bold uppercase text-violet-400 group-hover:text-violet-600">Multi-IDs ↗ voir détails</p>
              </button>
            </div>
            <div className="text-center border-l border-emerald-200 dark:border-emerald-800/50 pl-6">
              <p className="text-2xl font-black text-emerald-600">
                {estimatedUniqueClients > 0 ? estimatedUniqueClients.toLocaleString("fr-FR") : (totalForms > 0 ? totalForms.toLocaleString("fr-FR") : "—")}
              </p>
              <p className="text-[9px] font-black uppercase text-emerald-600">≈ Clients Uniques Sains</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
        <button
          onClick={() => setActiveTab("absents")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all border-b-2",
            activeTab === "absents"
              ? "border-rose-500 text-rose-600 dark:text-rose-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <UserRound className="h-3.5 w-3.5" />
          Absents — {lastMonthLabel}
          <span className={cn(
            "ml-1 px-1.5 py-0.5 rounded-md text-[9px] font-black",
            activeTab === "absents" ? "bg-rose-100 text-rose-600" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
          )}>
            {lastMonthRows.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("suspects")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all border-b-2",
            activeTab === "suspects"
              ? "border-violet-500 text-violet-600 dark:text-violet-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <Fingerprint className="h-3.5 w-3.5" />
          Suspects Multi-ID
          <span className={cn(
            "ml-1 px-1.5 py-0.5 rounded-md text-[9px] font-black",
            activeTab === "suspects" ? "bg-violet-100 text-violet-600" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
          )}>
            {multiIdClients}
          </span>
        </button>
      </div>

      {/* ── TAB: Absents ── */}
      {activeTab === "absents" && (
        <>
          {/* Filters */}
          <div className="px-5 py-3 space-y-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un nom, identifiant ou agence..."
                className="w-full pl-9 pr-8 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(["ALL", "NS", "VIE"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setPortfolioFilter(f)}
                  className={cn(
                    "px-3 py-1 text-[10px] font-bold rounded-lg transition-all",
                    portfolioFilter === f ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  )}
                >
                  {f === "ALL" ? "Tous" : f}
                </button>
              ))}
              <span className="ml-auto text-[10px] text-slate-400 font-medium">
                {filteredAbsents.length.toLocaleString("fr-FR")} résultat{filteredAbsents.length > 1 ? "s" : ""}
                {filteredAbsents.length > 200 && " (200 affichés)"}
              </span>
            </div>
          </div>

          {/* Results */}
          <div className="overflow-y-auto px-5 py-3 space-y-1.5 max-h-[420px]">
            {effectivelyLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                <p className="text-xs font-semibold">Chargement depuis Firestore...</p>
              </div>
            ) : lastMonthRows.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs font-semibold">
                <FileSearch className="h-8 w-8 mx-auto mb-3 opacity-40" />
                Aucune donnée. Importez un rapport pour voir les absents.
              </div>
            ) : filteredAbsents.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
                Aucun client ne correspond.
              </div>
            ) : (
              filteredAbsents.slice(0, 200).map((client, idx) => {
                const key = `a_${client.identifiant}_${idx}`;
                const isExpanded = expandedClient === key;
                return (
                  <div key={key} className={cn(
                    "rounded-xl border transition-all overflow-hidden",
                    isExpanded
                      ? "border-blue-300 dark:border-blue-700 shadow-md shadow-blue-500/10"
                      : "border-slate-200/70 dark:border-slate-800/70 hover:border-slate-300"
                  )}>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left" onClick={() => setExpandedClient(isExpanded ? null : key)}>
                      <div className="h-7 w-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <UserRound className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{highlight(client.name, searchQuery)}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {client.identifiant && <span className="text-[9px] text-slate-400 font-mono">#{highlight(client.identifiant, searchQuery)}</span>}
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md",
                            client.portfolio === "VIE" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                          )}>{client.portfolio}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{highlight(client.agenceName, searchQuery)}</p>
                        {client.agenceType && <p className="text-[8px] text-slate-400">{client.agenceType}</p>}
                      </div>
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                    </button>
                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3">
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Tous les champs</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {Object.entries(client.allFields).slice(0, 20).map(([k, v]) => (
                            <div key={k} className="flex gap-2">
                              <span className="text-[9px] text-slate-400 font-semibold shrink-0 min-w-[80px] truncate">{k}</span>
                              <span className="text-[9px] text-slate-700 dark:text-slate-300 truncate">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ── TAB: Suspects Multi-ID ── */}
      {activeTab === "suspects" && (
        <>
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0 space-y-2">
            {multiIdDetails.length === 0 && !effectivelyLoading && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Les détails sont calculés lors du prochain import. Relancez un rapprochement pour alimenter cette liste.
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={suspectQuery}
                onChange={e => setSuspectQuery(e.target.value)}
                placeholder="Rechercher un nom ou un identifiant suspect..."
                className="w-full pl-9 pr-8 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
              {suspectQuery && <button onClick={() => setSuspectQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">✕</button>}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">{filteredSuspects.length.toLocaleString("fr-FR")} suspect{filteredSuspects.length > 1 ? "s" : ""} · même nom normalisé, IDs différents dans RegTools</p>
          </div>

          <div className="overflow-y-auto px-5 py-3 space-y-1.5 max-h-[420px]">
            {filteredSuspects.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                <Fingerprint className="h-8 w-8 mx-auto mb-3 opacity-40" />
                {multiIdDetails.length === 0 ? "Aucun suspect calculé pour ce rapport." : "Aucun résultat pour cette recherche."}
              </div>
            ) : (
              filteredSuspects.slice(0, 300).map((suspect, idx) => {
                const key = `s_${suspect.normName}_${idx}`;
                const isExpanded = expandedSuspect === key;
                const conf = suspect.confidence ?? "LOW";
                const confBadge = {
                  HIGH:   { label: "Confirmé CIN+PP ✓✓", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
                  MEDIUM: { label: "2 Passeports (info)",  cls: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
                  LOW:    { label: "Incertain ~",          cls: "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500" },
                }[conf];
                return (
                  <div key={key} className={cn(
                    "rounded-xl border transition-all overflow-hidden",
                    isExpanded
                      ? "border-violet-300 dark:border-violet-700 shadow-md shadow-violet-500/10"
                      : "border-slate-200/70 dark:border-slate-800/70 hover:border-violet-200"
                  )}>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left" onClick={() => setExpandedSuspect(isExpanded ? null : key)}>
                      <div className="h-7 w-7 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                        <Fingerprint className="h-3.5 w-3.5 text-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{highlight(suspect.displayName, suspectQuery)}</p>
                        <p className="text-[9px] text-violet-500 font-semibold mt-0.5">
                          {suspect.ids.length} identifiant{suspect.ids.length > 1 ? "s" : ""} distincts
                          {suspect.discriminators ? ` · ${suspect.discriminators} critère${suspect.discriminators > 1 ? "s" : ""} confirmé${suspect.discriminators > 1 ? "s" : ""}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded-md", confBadge.cls)}>
                          {confBadge.label}
                        </span>
                        <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600">
                          ×{suspect.ids.length}
                        </span>
                      </div>
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                    </button>
                    {isExpanded && (
                      <div className="border-t border-violet-100 dark:border-violet-900/30 bg-violet-50/50 dark:bg-violet-950/10 px-4 py-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="text-[9px] font-black uppercase tracking-wider text-violet-400">Identifiants dans RegTools</p>
                          <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-md ml-auto", confBadge.cls)}>
                            {conf === "HIGH" ? "Identité confirmée par plusieurs critères" :
                             conf === "MEDIUM" ? "Identité probable (1-2 critères)" :
                             "Nom seul — risque de faux positif élevé"}
                          </span>
                        </div>
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
                        <p className="text-[8px] text-slate-400">
                          {conf === "LOW"
                            ? "⚠ Nom seul — peut être 2 personnes différentes. Vérification manuelle recommandée."
                            : `Ce client est enregistré ${suspect.ids.length}× dans RegTools avec des identifiants différents → 1 seule fiche réelle attendue.`}
                        </p>
                        {suspect.discriminatorLabels && suspect.discriminatorLabels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-[8px] text-slate-400 font-semibold mr-1">Confirmé par :</span>
                            {suspect.discriminatorLabels.map((lbl, i) => (
                              <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-600 font-bold">{lbl}</span>
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
        </>
      )}
    </div>
  );
};
