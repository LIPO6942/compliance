"use client";

import React, { useState, useMemo } from "react";
import {
  Search, UserRound, Building2, Calendar, Hash, AlertCircle,
  ChevronDown, ChevronRight, X, Fingerprint, Users
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientOccurrence {
  monthKey: string;
  monthLabel: string;
  portfolio: "NS" | "VIE";
  identifiant: string;
  agenceCode: string;
  agenceName: string;
  matchType: string;
  nameInFile: string;
  allFields: Record<string, string>;
}

interface ClientGroup {
  normalizedName: string;
  displayName: string;
  occurrences: ClientOccurrence[];
  identifiants: string[];
  agences: string[];
  isDuplicate: boolean;
}

interface ClientSearchPanelProps {
  savedReports: any[];
  resolveAgencyInfo: (code: any) => { code: string; name: string; type: string };
  onClose?: () => void;
}

const normalizeName = (name: any): string => {
  if (!name) return "";
  return String(name).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(ep|epouse|ben|abd|de|el|al|bin|bnt|la|le|du|ould)\b/g, " ")
    .replace(/\s+/g, " ").trim()
    .split(" ").filter(Boolean).sort().join(" ");
};

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
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [portfolioFilter, setPortfolioFilter] = useState<"ALL" | "NS" | "VIE">("ALL");

  const clientIndex = useMemo((): ClientGroup[] => {
    const groups: Record<string, ClientGroup> = {};

    const processRows = (
      rows: any[], portfolio: "NS" | "VIE",
      idCol: string, agenceCol: string, nameCol: string,
      monthKey: string, monthLabel: string
    ) => {
      if (!rows || !Array.isArray(rows)) return;
      for (const row of rows) {
        const rawName = row[nameCol] || row["NOM_CLIENT"] || row["nom_client"] || row["Nom et pr\u00e9nom du souscripteur"] || "";
        if (!rawName) continue;
        const norm = normalizeName(rawName);
        if (!norm) continue;

        const identifiant = String(row[idCol] || row["Identifiant"] || row["identifiant"] || "").trim();
        const agenceRaw = row[agenceCol] || row["N_GESTIONNAIRE"] || row["n_gestionnaire"] || "";
        const agInfo = resolveAgencyInfo(agenceRaw);
        const matchType = row.__matchType || "Absent";

        const allFields: Record<string, string> = {};
        Object.entries(row).forEach(([k, v]) => {
          if (!k.startsWith("__") && v !== undefined && v !== null && v !== "") {
            allFields[k] = String(v);
          }
        });

        const occ: ClientOccurrence = {
          monthKey, monthLabel, portfolio, identifiant,
          agenceCode: agInfo.code,
          agenceName: agInfo.name || agInfo.code,
          matchType,
          nameInFile: String(rawName).trim(),
          allFields,
        };

        if (!groups[norm]) {
          groups[norm] = {
            normalizedName: norm,
            displayName: String(rawName).trim().toUpperCase(),
            occurrences: [],
            identifiants: [],
            agences: [],
            isDuplicate: false,
          };
        }

        groups[norm].occurrences.push(occ);
        if (identifiant && !groups[norm].identifiants.includes(identifiant)) {
          groups[norm].identifiants.push(identifiant);
        }
        const agLabel = agInfo.name || agInfo.code;
        if (agLabel && !groups[norm].agences.includes(agLabel)) {
          groups[norm].agences.push(agLabel);
        }
        if (String(rawName).trim().length > groups[norm].displayName.length) {
          groups[norm].displayName = String(rawName).trim().toUpperCase();
        }
      }
    };

    for (const report of savedReports) {
      const monthKey: string = report.monthKey || "";
      const monthLabel: string = report.monthLabel || monthKey;
      const rType = report.reconciliationType || "NS";

      const nsIdCol = report.mapping?.nsId || "Identifiant";
      const nsAgCol = report.mapping?.nsAgence || "N_GESTIONNAIRE";
      const nsNameCol = (report.columnsNS || []).find((c: string) => /nom/i.test(c) && !/num|n_|n\u00b0/i.test(c)) || "NOM_CLIENT";
      const vieIdCol = report.mapping?.vieId || "Num\u00e9ro de carte d identit\u00e9 ou matricule fiscal";
      const vieAgCol = report.mapping?.vieAgence || "Canal de souscription";
      const vieNameCol = (report.columnsVIE || []).find((c: string) => /nom/i.test(c) && !/num|n_|n\u00b0/i.test(c)) || "Nom et pr\u00e9nom du souscripteur";

      if (rType === "BOTH") {
        const nsMissing = (report.missingRows || []).filter((r: any) => r.__sourcePortfolio !== "VIE");
        const vieMissing = (report.missingRows || []).filter((r: any) => r.__sourcePortfolio === "VIE");
        processRows(nsMissing, "NS", nsIdCol, nsAgCol, nsNameCol, monthKey, monthLabel);
        processRows(vieMissing, "VIE", vieIdCol, vieAgCol, vieNameCol, monthKey, monthLabel);
        processRows((report.similarRows || []).filter((r: any) => r.__sourcePortfolio !== "VIE"), "NS", nsIdCol, nsAgCol, nsNameCol, monthKey, monthLabel);
        processRows((report.similarRows || []).filter((r: any) => r.__sourcePortfolio === "VIE"), "VIE", vieIdCol, vieAgCol, vieNameCol, monthKey, monthLabel);
      } else if (rType === "VIE") {
        processRows(report.missingRows || [], "VIE", vieIdCol, vieAgCol, vieNameCol, monthKey, monthLabel);
        processRows(report.similarRows || [], "VIE", vieIdCol, vieAgCol, vieNameCol, monthKey, monthLabel);
      } else {
        processRows(report.missingRows || [], "NS", nsIdCol, nsAgCol, nsNameCol, monthKey, monthLabel);
        processRows(report.similarRows || [], "NS", nsIdCol, nsAgCol, nsNameCol, monthKey, monthLabel);
      }
    }

    Object.values(groups).forEach(g => {
      g.isDuplicate = g.identifiants.length > 1;
      g.occurrences.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    });

    return Object.values(groups).sort((a, b) => b.occurrences.length - a.occurrences.length);
  }, [savedReports, resolveAgencyInfo]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return clientIndex.filter(g => {
      if (showDuplicatesOnly && !g.isDuplicate) return false;
      if (portfolioFilter !== "ALL" && !g.occurrences.some(o => o.portfolio === portfolioFilter)) return false;
      if (!q) return true;
      const disp = g.displayName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return g.normalizedName.includes(q) || disp.includes(q) || g.identifiants.some(id => id.toLowerCase().includes(q));
    });
  }, [clientIndex, searchQuery, showDuplicatesOnly, portfolioFilter]);

  const totalClients = clientIndex.length;
  const duplicateCount = clientIndex.filter(g => g.isDuplicate).length;
  const displayedResults = filtered.slice(0, 100);

  const matchTypeColor = (t: string) => {
    if (/absent/i.test(t)) return "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800";
    if (/similitude|similar/i.test(t)) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800";
    return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800";
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 rounded-3xl border border-slate-200/80 dark:border-slate-800/60 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/30">
            <Search className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">Recherche Client — Cross-Mois</h2>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{totalClients.toLocaleString("fr-FR")} clients · {savedReports.length} mois importés</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 dark:hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
        {[
          { label: "Clients indexés", value: totalClients, color: "text-blue-600" },
          { label: "Multi-identifiants", value: duplicateCount, color: "text-violet-600" },
          { label: "Mois importés", value: savedReports.length, color: "text-amber-600" },
        ].map((kpi, i) => (
          <div key={i} className={cn("px-4 py-3 text-center", i < 2 && "border-r border-slate-100 dark:border-slate-800")}>
            <p className={cn("text-lg font-black", kpi.color)}>{kpi.value.toLocaleString("fr-FR")}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Search & filters */}
      <div className="px-5 py-3 space-y-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher un nom ou identifiant..."
            className="w-full pl-8 pr-9 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-400 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-[10px] font-bold">
            {(["ALL", "NS", "VIE"] as const).map(p => (
              <button key={p} onClick={() => setPortfolioFilter(p)}
                className={cn("px-2.5 py-1.5 transition-colors", portfolioFilter === p ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-900 text-slate-500")}>
                {p === "ALL" ? "Tous" : p}
              </button>
            ))}
          </div>
          <button onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all",
              showDuplicatesOnly ? "bg-violet-600 text-white border-violet-600" : "bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-700")}>
            <Fingerprint className="h-3 w-3" />Multi-identifiants
          </button>
          <span className="ml-auto text-[10px] text-slate-400 font-semibold">
            {filtered.length > 100 ? "100+ résultats" : `${filtered.length} résultat${filtered.length > 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
        {totalClients === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs font-semibold">
            <Users className="h-8 w-8 mx-auto mb-3 opacity-40" />
            Aucune donnée. Importez au moins un rapport pour indexer les clients.
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs font-semibold">
            Aucun client trouvé pour « {searchQuery} »
          </div>
        ) : displayedResults.map(group => {
          const isExpanded = expandedClient === group.normalizedName;
          const monthsCount = new Set(group.occurrences.map(o => o.monthKey)).size;
          return (
            <div key={group.normalizedName}
              className={cn("rounded-2xl border transition-all duration-200",
                isExpanded ? "border-blue-400 dark:border-blue-600 bg-blue-50/30 dark:bg-blue-950/20 shadow-sm"
                  : "border-slate-100 dark:border-slate-800 bg-slate-50/30 hover:border-slate-200 dark:hover:border-slate-700")}>
              <button className="w-full flex items-center gap-3 p-3 text-left"
                onClick={() => setExpandedClient(isExpanded ? null : group.normalizedName)}>
                <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                  isExpanded ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500")}>
                  <UserRound className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate">{highlight(group.displayName, searchQuery)}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {group.identifiants.slice(0, 2).map(id => (
                      <span key={id} className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                        {highlight(id, searchQuery)}
                      </span>
                    ))}
                    {group.isDuplicate && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-lg bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 flex items-center gap-1">
                        <Fingerprint className="h-2.5 w-2.5" />Multi-ID
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0 text-[10px] text-slate-500 font-semibold">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{monthsCount} mois</span>
                  <span className="flex items-center gap-1 truncate max-w-[120px]"><Building2 className="h-3 w-3" />{group.agences[0] || "—"}{group.agences.length > 1 && ` +${group.agences.length - 1}`}</span>
                </div>
                {isExpanded ? <ChevronDown className="h-4 w-4 text-blue-500 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  {/* Identifiants */}
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Identifiants détectés</p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.identifiants.map(id => (
                        <span key={id} className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <Hash className="h-3 w-3 text-blue-500" />{id}
                        </span>
                      ))}
                      {group.isDuplicate && (
                        <span className="text-[9px] text-violet-600 font-bold flex items-center gap-1 ml-1">
                          <AlertCircle className="h-3 w-3" />Doublon potentiel (multi-documents)
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Occurrences par mois */}
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 px-1">Présence par mois</p>
                    {group.occurrences.map((occ, i) => (
                      <div key={`${occ.monthKey}-${i}`} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col items-center shrink-0 min-w-[58px]">
                          <span className="text-[9px] font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-900 text-center">
                            {occ.monthLabel}
                          </span>
                          <span className={cn("text-[8px] font-bold mt-0.5", occ.portfolio === "VIE" ? "text-purple-500" : "text-blue-500")}>{occ.portfolio}</span>
                        </div>
                        <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-lg border shrink-0 mt-0.5", matchTypeColor(occ.matchType))}>
                          {occ.matchType}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {occ.identifiant && <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1"><Hash className="h-2.5 w-2.5 text-slate-400" />{occ.identifiant}</span>}
                            {occ.agenceName && <span className="text-[10px] text-slate-600 dark:text-slate-400 flex items-center gap-1"><Building2 className="h-2.5 w-2.5 text-slate-400" />{occ.agenceName}{occ.agenceCode && occ.agenceCode !== occ.agenceName && <span className="text-slate-400">({occ.agenceCode})</span>}</span>}
                          </div>
                          {occ.nameInFile && occ.nameInFile.toUpperCase() !== group.displayName && (
                            <p className="text-[9px] text-slate-400 mt-0.5 italic">Fichier : {occ.nameInFile}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length > 100 && (
          <p className="text-center text-[10px] text-slate-400 py-3 font-semibold">Affichage limité à 100 — affinez votre recherche.</p>
        )}
      </div>
    </div>
  );
};
