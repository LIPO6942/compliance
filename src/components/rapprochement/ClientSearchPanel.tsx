"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Search, UserRound, Users, Loader2,
  ChevronDown, ChevronRight, FileSearch
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

interface ClientSearchPanelProps {
  savedReports: any[];
  resolveAgencyInfo: (code: any) => { code: string; name: string; type: string };
  onClose?: () => void;
  isExternalLoading?: boolean;
  regtoolsKPIs?: { totalForms: number; multiIdClients: number; estimatedUniqueClients: number } | null;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [portfolioFilter, setPortfolioFilter] = useState<"ALL" | "NS" | "VIE">("ALL");
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [lastMonthRows, setLastMonthRows] = useState<ClientRow[]>([]);
  const [lastMonthLabel, setLastMonthLabel] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const effectivelyLoading = isExternalLoading || isLoading;

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
      const nameCol = cols.find((c: string) => /nom/i.test(c) && !/num|n_|n°/i.test(c))
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

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return lastMonthRows.filter(c => {
      if (portfolioFilter !== "ALL" && c.portfolio !== portfolioFilter) return false;
      if (!q) return true;
      const nameN = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const agN = c.agenceName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return nameN.includes(q) || c.identifiant.toLowerCase().includes(q) || agN.includes(q);
    });
  }, [lastMonthRows, searchQuery, portfolioFilter]);

  const uniqueMonthCount = new Set(savedReports.map((r: any) => String(r.monthKey).replace(/_(NS|VIE)$/i, ""))).size;

  return (
    <div className="flex flex-col bg-white dark:bg-slate-950 rounded-3xl border border-slate-200/80 dark:border-slate-800/60 overflow-hidden shadow-xl">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/30">
            <Search className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">
              Absents — {lastMonthLabel || "Dernier mois"}
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
              {effectivelyLoading
                ? "Chargement depuis Firestore..."
                : `${lastMonthRows.length.toLocaleString("fr-FR")} clients absents · ${uniqueMonthCount} mois importés`}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
        {[
          { label: "Absents ce mois", value: lastMonthRows.length, color: "text-rose-600" },
          { label: "Résultats filtrés", value: filtered.length, color: "text-blue-600" },
          { label: "Mois importés", value: uniqueMonthCount, color: "text-amber-600" },
        ].map((kpi, i) => (
          <div key={i} className={cn("px-4 py-3 text-center", i < 2 && "border-r border-slate-100 dark:border-slate-800")}>
            {effectivelyLoading && i < 2 ? (
              <Loader2 className="h-5 w-5 mx-auto animate-spin text-slate-300" />
            ) : (
              <p className={cn("text-lg font-black", kpi.color)}>{kpi.value.toLocaleString("fr-FR")}</p>
            )}
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Portefeuille Sain Banner */}
      {regtoolsKPIs && (
        <div className="mx-5 mt-3 mb-1 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 px-5 py-3 flex items-center gap-6 shrink-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow shadow-emerald-500/30">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Portefeuille Sain Estimé</p>
              <p className="text-[8px] text-slate-500">Total RegTools − clients multi-identifiants détectés</p>
            </div>
          </div>
          <div className="flex gap-6 ml-auto items-center">
            <div className="text-center">
              <p className="text-sm font-black text-slate-700 dark:text-slate-200">{regtoolsKPIs.totalForms.toLocaleString("fr-FR")}</p>
              <p className="text-[8px] font-bold uppercase text-slate-400">Total RegTools</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-violet-600">−{regtoolsKPIs.multiIdClients.toLocaleString("fr-FR")}</p>
              <p className="text-[8px] font-bold uppercase text-slate-400">Multi-IDs</p>
            </div>
            <div className="text-center border-l border-emerald-200 dark:border-emerald-800/50 pl-6">
              <p className="text-2xl font-black text-emerald-600">{regtoolsKPIs.estimatedUniqueClients.toLocaleString("fr-FR")}</p>
              <p className="text-[9px] font-black uppercase text-emerald-600">≈ Clients Uniques Sains</p>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
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
                portfolioFilter === f
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700"
              )}
            >
              {f === "ALL" ? "Tous" : f}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-slate-400 font-medium">
            {filtered.length.toLocaleString("fr-FR")} résultat{filtered.length > 1 ? "s" : ""}
            {filtered.length > 200 && " (200 affichés)"}
          </span>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5 max-h-[480px]">
        {effectivelyLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            <p className="text-xs font-semibold">Chargement des données depuis Firestore...</p>
          </div>
        ) : lastMonthRows.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs font-semibold">
            <FileSearch className="h-8 w-8 mx-auto mb-3 opacity-40" />
            Aucune donnée. Importez un rapport pour voir les absents.
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs font-semibold">
            <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
            Aucun client ne correspond à cette recherche.
          </div>
        ) : (
          filtered.slice(0, 200).map((client, idx) => {
            const key = `${client.identifiant}_${idx}`;
            const isExpanded = expandedClient === key;
            return (
              <div
                key={key}
                className={cn(
                  "rounded-xl border transition-all overflow-hidden",
                  isExpanded
                    ? "border-blue-300 dark:border-blue-700 shadow-md shadow-blue-500/10"
                    : "border-slate-200/70 dark:border-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
                  onClick={() => setExpandedClient(isExpanded ? null : key)}
                >
                  <div className="h-7 w-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <UserRound className="h-3.5 w-3.5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {highlight(client.name, searchQuery)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {client.identifiant && (
                        <span className="text-[9px] text-slate-400 font-mono">#{highlight(client.identifiant, searchQuery)}</span>
                      )}
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded-md",
                        client.portfolio === "VIE"
                          ? "bg-purple-100 dark:bg-purple-950/40 text-purple-600"
                          : "bg-blue-100 dark:bg-blue-950/40 text-blue-600"
                      )}>
                        {client.portfolio}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                        {highlight(client.agenceName, searchQuery)}
                      </p>
                      {client.agenceType && (
                        <p className="text-[8px] text-slate-400">{client.agenceType}</p>
                      )}
                    </div>
                    {isExpanded
                      ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                      : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                  </div>
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
    </div>
  );
};
