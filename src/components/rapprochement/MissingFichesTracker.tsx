"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ClipboardList, CheckCircle2, XCircle, AlertTriangle, Building2,
  Calendar, ChevronDown, ChevronRight, X, TrendingDown, TrendingUp,
  Minus, ArrowRight, RefreshCw, Hash, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface AbsentClient {
  identifiant: string;
  name: string;
  agenceCode: string;
  agenceName: string;
  allFields: Record<string, string>;
}

interface AgencyEcart {
  agenceCode: string;
  agenceName: string;
  agenceType: string;
  missingCount: number;
  clients: AbsentClient[];
}

interface MonthEcartReport {
  monthKey: string;
  monthLabel: string;
  agencies: AgencyEcart[];
  totalMissing: number;
}

interface TrackerEntry {
  agenceCode: string;
  agenceName: string;
  agenceType: string;
  // Per month: resolved / still absent / new
  months: Record<string, {
    monthKey: string;
    monthLabel: string;
    missingCount: number;
    identifiants: string[];
    resolvedFromPrev: number;  // clients absent month M-1 now present in M
    stillAbsent: number;       // clients absent in M-1 still absent in M
    newAbsent: number;         // new absences in M not in M-1
  }>;
}

interface MissingFichesTrackerProps {
  savedReports: any[];
  resolveAgencyInfo: (code: any) => { code: string; name: string; type: string };
  onClose?: () => void;
  isExternalLoading?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
// Returns sorted unique BASE month keys (e.g. "052026"), merging NS+VIE duplicates
const sortedMonthKeys = (reports: any[]): string[] => {
  const bases = new Set<string>();
  reports.forEach(r => {
    const base = String(r.monthKey || "").replace(/_(NS|VIE)$/i, "");
    if (base) bases.add(base);
  });
  return [...bases].sort();
};

// Merge all reports that share the same base month key into one combined report
const mergeReportsForBaseKey = (reports: any[], baseKey: string): any => {
  const matching = reports.filter(r =>
    String(r.monthKey || "").replace(/_(NS|VIE)$/i, "") === baseKey
  );
  if (matching.length === 0) return null;
  if (matching.length === 1) return matching[0];
  // Merge: combine missingRows and similarRows from all matching
  const merged = { ...matching[0] };
  const allMissing: any[] = [];
  const allSimilar: any[] = [];
  matching.forEach(r => {
    if (r.missingRows) allMissing.push(...r.missingRows);
    if (r.similarRows) allSimilar.push(...r.similarRows);
  });
  merged.missingRows = allMissing;
  merged.similarRows = allSimilar;
  merged.monthKey = baseKey;
  merged.reconciliationType = "BOTH";
  return merged;
};

const buildAgencyEcartForMonth = (
  report: any,
  resolveAgencyInfo: (code: any) => { code: string; name: string; type: string }
): AgencyEcart[] => {
  const agencyMap: Record<string, AgencyEcart> = {};

  const processRows = (rows: any[], idCol: string, agenceCol: string, nameCol: string) => {
    if (!rows || !Array.isArray(rows)) return;
    for (const row of rows) {
      // missingRows contains ONLY absent clients (matchType="Aucun" from the comparison engine)
      // No need to filter by matchType — if it's in missingRows, it IS absent

      const agRaw = row[agenceCol] || row["N_GESTIONNAIRE"] || "";
      const agInfo = resolveAgencyInfo(agRaw);
      const key = agInfo.code || String(agRaw).trim() || "UNKNOWN";

      const identifiant = String(row[idCol] || row["Identifiant"] || "").trim();
      const rawName = row[nameCol] || row["NOM_CLIENT"] || row["nom_client"] || row["Nom et pr\u00e9nom du souscripteur"] || "";

      const allFields: Record<string, string> = {};
      Object.entries(row).forEach(([k, v]) => {
        if (!k.startsWith("__") && v !== undefined && v !== null && v !== "") {
          allFields[k] = String(v);
        }
      });

      if (!agencyMap[key]) {
        agencyMap[key] = {
          agenceCode: agInfo.code,
          agenceName: agInfo.name || `Agence ${key}`,
          agenceType: agInfo.type || "Inconnu",
          missingCount: 0,
          clients: [],
        };
      }

      agencyMap[key].missingCount++;
      agencyMap[key].clients.push({
        identifiant,
        name: String(rawName).trim().toUpperCase(),
        agenceCode: agInfo.code,
        agenceName: agInfo.name || key,
        allFields,
      });
    }
  };

  const rType = report.reconciliationType || "NS";
  const nsIdCol = report.mapping?.nsId || "Identifiant";
  const nsAgCol = report.mapping?.nsAgence || "N_GESTIONNAIRE";
  const nsNameCol = (report.columnsNS || []).find((c: string) => /nom/i.test(c) && !/num|n_|n\u00b0/i.test(c)) || "NOM_CLIENT";
  const vieIdCol = report.mapping?.vieId || "Num\u00e9ro de carte d identit\u00e9 ou matricule fiscal";
  const vieAgCol = report.mapping?.vieAgence || "Canal de souscription";
  const vieNameCol = (report.columnsVIE || []).find((c: string) => /nom/i.test(c) && !/num|n_|n\u00b0/i.test(c)) || "Nom et pr\u00e9nom du souscripteur";

  if (rType === "BOTH") {
    processRows((report.missingRows || []).filter((r: any) => r.__sourcePortfolio !== "VIE"), nsIdCol, nsAgCol, nsNameCol);
    processRows((report.missingRows || []).filter((r: any) => r.__sourcePortfolio === "VIE"), vieIdCol, vieAgCol, vieNameCol);
  } else if (rType === "VIE") {
    processRows(report.missingRows || [], vieIdCol, vieAgCol, vieNameCol);
  } else {
    processRows(report.missingRows || [], nsIdCol, nsAgCol, nsNameCol);
  }

  return Object.values(agencyMap).sort((a, b) => b.missingCount - a.missingCount);
};

// ─── Main Component ─────────────────────────────────────────────────────────
export const MissingFichesTracker: React.FC<MissingFichesTrackerProps> = ({
  savedReports,
  resolveAgencyInfo,
  onClose,
  isExternalLoading = false,
}) => {
  const [expandedAgency, setExpandedAgency] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"ALL" | "Succursale" | "Agence" | "courtier">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "RESOLVED" | "PERSISTENT" | "NEW">("ALL");
  const [expandedClientRow, setExpandedClientRow] = useState<string | null>(null);
  const [enrichedReports, setEnrichedReports] = useState<any[]>(savedReports);
  const [isLoading, setIsLoading] = useState(false);

  const effectivelyLoading = isExternalLoading || isLoading;

  // ─── Load full report data / unminify Firestore data on mount ─────────────
  useEffect(() => {
    setIsLoading(true);

    const unminify = (minified: any[][], cols: string[]): any[] => {
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

    const enriched = savedReports.map(report => {
      if (report.missingRows && report.missingRows.length > 0) return report;

      let result = { ...report };

      // 1. Try localStorage
      try {
        const stored = localStorage.getItem(`regtools_report_${report.monthKey}`);
        if (stored) {
          const full = JSON.parse(stored);
          result = { ...result, ...full };
        }
      } catch (e) { /* ignore */ }

      // 2. Unminify from Firestore compressed data
      if ((!result.missingRows || result.missingRows.length === 0) && result.minifiedMissingRows && result.minifiedMissingRows.length > 0) {
        const cols = result.columnsNS || [];
        result.missingRows = unminify(result.minifiedMissingRows, cols);
      }
      if ((!result.similarRows || result.similarRows.length === 0) && result.minifiedSimilarRows && result.minifiedSimilarRows.length > 0) {
        const cols = result.columnsNS || [];
        result.similarRows = unminify(result.minifiedSimilarRows, cols);
      }

      return result;
    });

    setEnrichedReports(enriched);
    setIsLoading(false);
  }, [savedReports]);

  // Unique base months (strip _NS / _VIE suffix)
  const uniqueMonthCount = useMemo(() => {
    const bases = new Set(savedReports.map(r => String(r.monthKey).replace(/_(NS|VIE)$/i, "")));
    return bases.size;
  }, [savedReports]);

  // ─── Build month-by-month per-agency ecart data ──────────────────────────
  const { months, trackerEntries, orderedMonthKeys } = useMemo(() => {
    const orderedKeys = sortedMonthKeys(enrichedReports);

    // Map monthKey -> { agenceCode -> Set<identifiant> }
    const monthAgencyIds: Record<string, Record<string, Set<string>>> = {};
    const monthEcartByReport: Record<string, AgencyEcart[]> = {};

    for (const baseKey of orderedKeys) {
      const report = mergeReportsForBaseKey(enrichedReports, baseKey);
      if (!report) continue;
      const mk = baseKey;
      const ecarts = buildAgencyEcartForMonth(report, resolveAgencyInfo);
      monthEcartByReport[mk] = ecarts;
      monthAgencyIds[mk] = {};
      for (const ag of ecarts) {
        monthAgencyIds[mk][ag.agenceCode] = new Set(ag.clients.map(c => c.identifiant).filter(Boolean));
      }
    }

    // Collect all unique agencies
    const allAgencies: Record<string, { name: string; type: string }> = {};
    Object.values(monthEcartByReport).forEach(ecarts => {
      ecarts.forEach(ag => {
        allAgencies[ag.agenceCode] = { name: ag.agenceName, type: ag.agenceType };
      });
    });

    // Build tracker entries
    const entries: TrackerEntry[] = Object.entries(allAgencies).map(([code, info]) => {
      const monthsData: TrackerEntry["months"] = {};

      orderedKeys.forEach((mk, idx) => {
        const report = mergeReportsForBaseKey(enrichedReports, mk);
        const monthLabel = report?.monthLabel || mk;
        const currentEcart = monthEcartByReport[mk]?.find(ag => ag.agenceCode === code);
        const currentIds = monthAgencyIds[mk]?.[code] || new Set<string>();

        let resolvedFromPrev = 0;
        let stillAbsent = 0;
        let newAbsent = 0;

        if (idx > 0) {
          const prevMk = orderedKeys[idx - 1];
          const prevIds = monthAgencyIds[prevMk]?.[code] || new Set<string>();

          // Resolved = in prevIds but not in currentIds
          resolvedFromPrev = [...prevIds].filter(id => id && !currentIds.has(id)).length;
          // Still absent = in both
          stillAbsent = [...prevIds].filter(id => id && currentIds.has(id)).length;
          // New = in current but not in prev
          newAbsent = [...currentIds].filter(id => id && !prevIds.has(id)).length;
        } else {
          newAbsent = currentIds.size;
        }

        monthsData[mk] = {
          monthKey: mk,
          monthLabel,
          missingCount: currentEcart?.missingCount || 0,
          identifiants: currentEcart?.clients.map(c => c.identifiant).filter(Boolean) || [],
          resolvedFromPrev,
          stillAbsent,
          newAbsent,
        };
      });

      return {
        agenceCode: code,
        agenceName: info.name,
        agenceType: info.type,
        months: monthsData,
      };
    });

    // Sort by total missing (last month) desc
    const lastMk = orderedKeys[orderedKeys.length - 1] || "";
    entries.sort((a, b) =>
      (b.months[lastMk]?.missingCount || 0) - (a.months[lastMk]?.missingCount || 0)
    );

    // Build months summary for the header
    const monthsSummary: MonthEcartReport[] = orderedKeys.map(mk => {
      const report = mergeReportsForBaseKey(enrichedReports, mk);
      const ecarts = monthEcartByReport[mk] || [];
      return {
        monthKey: mk,
        monthLabel: report?.monthLabel || mk,
        agencies: ecarts,
        totalMissing: ecarts.reduce((s, a) => s + a.missingCount, 0),
      };
    });

    return { months: monthsSummary, trackerEntries: entries, orderedMonthKeys: orderedKeys };
  }, [enrichedReports, resolveAgencyInfo]);

  const lastMonthKey = orderedMonthKeys[orderedMonthKeys.length - 1] || "";
  const prevMonthKey = orderedMonthKeys[orderedMonthKeys.length - 2] || "";

  const filteredEntries = useMemo(() => {
    return trackerEntries.filter(e => {
      if (typeFilter !== "ALL" && e.agenceType !== typeFilter) return false;
      if (statusFilter !== "ALL") {
        const lastData = e.months[lastMonthKey];
        const prevData = e.months[prevMonthKey];
        if (!lastData && !prevData) return false;
        if (statusFilter === "RESOLVED") {
          // Was absent in prev, now 0 missing
          return (prevData?.missingCount || 0) > 0 && (lastData?.missingCount || 0) === 0;
        }
        if (statusFilter === "PERSISTENT") {
          // Still has missing in latest AND had missing in prev
          return (lastData?.stillAbsent || 0) > 0;
        }
        if (statusFilter === "NEW") {
          return (lastData?.newAbsent || 0) > 0;
        }
      }
      // Only show agencies that have at least 1 missing in any month
      return Object.values(e.months).some(m => m.missingCount > 0);
    });
  }, [trackerEntries, typeFilter, statusFilter, lastMonthKey, prevMonthKey]);

  const totalLastMonth = months.find(m => m.monthKey === lastMonthKey)?.totalMissing || 0;
  const totalPrevMonth = months.find(m => m.monthKey === prevMonthKey)?.totalMissing || 0;
  const globalTrend = totalLastMonth - totalPrevMonth;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 rounded-3xl border border-slate-200/80 dark:border-slate-800/60 overflow-hidden shadow-xl">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-950/30 dark:to-orange-950/20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-rose-600 flex items-center justify-center shadow-md shadow-rose-500/30">
            <ClipboardList className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">Suivi des Fiches Absentes (Écart)</h2>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
              Vérification mois après mois — résolutions et persistances
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 dark:hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="px-4 py-3 text-center border-r border-slate-100 dark:border-slate-800">
          <p className="text-lg font-black text-rose-600">{totalLastMonth.toLocaleString("fr-FR")}</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Fiches absentes actuelles</p>
        </div>
        <div className="px-4 py-3 text-center border-r border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-center gap-1">
            <p className={cn("text-lg font-black", globalTrend < 0 ? "text-emerald-600" : globalTrend > 0 ? "text-rose-600" : "text-slate-600")}>
              {globalTrend > 0 ? "+" : ""}{globalTrend.toLocaleString("fr-FR")}
            </p>
            {globalTrend < 0 ? <TrendingDown className="h-4 w-4 text-emerald-500" /> : globalTrend > 0 ? <TrendingUp className="h-4 w-4 text-rose-500" /> : <Minus className="h-4 w-4 text-slate-400" />}
          </div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">vs. mois précédent</p>
        </div>
        <div className="px-4 py-3 text-center border-r border-slate-100 dark:border-slate-800">
          <p className="text-lg font-black text-amber-600">{filteredEntries.filter(e => (e.months[lastMonthKey]?.stillAbsent || 0) > 0).length}</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Agences persistantes</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-lg font-black text-emerald-600">{filteredEntries.filter(e => (e.months[prevMonthKey]?.missingCount || 0) > 0 && (e.months[lastMonthKey]?.missingCount || 0) === 0).length}</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Agences régularisées</p>
        </div>
      </div>

      {/* Month timeline */}
      {months.length > 0 && (
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Timeline des écarts</p>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {months.map((m, i) => (
              <React.Fragment key={m.monthKey}>
                <div className="flex flex-col items-center shrink-0">
                  <span className="text-[9px] font-bold text-slate-500">{m.monthLabel}</span>
                  <div className={cn("mt-1 px-2.5 py-1 rounded-lg text-[10px] font-black border",
                    m.totalMissing === 0 ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      : m.totalMissing > 1000 ? "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                      : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                  )}>
                    {m.totalMissing.toLocaleString("fr-FR")}
                  </div>
                </div>
                {i < months.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-700 shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap shrink-0">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 mr-1">Type :</span>
        {(["ALL", "Succursale", "Agence", "courtier"] as const).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={cn("px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all",
              typeFilter === t ? "bg-rose-600 text-white border-rose-600" : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-rose-300")}>
            {t === "ALL" ? "Tous" : t}
          </button>
        ))}
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-2 mr-1">Statut :</span>
        {([
          ["ALL", "Tous", "slate"],
          ["PERSISTENT", "Persistantes", "amber"],
          ["NEW", "Nouvelles", "rose"],
          ["RESOLVED", "Régularisées", "emerald"],
        ] as const).map(([val, label, color]) => (
          <button key={val} onClick={() => setStatusFilter(val as any)}
            className={cn("px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all",
              statusFilter === val
                ? `bg-${color}-600 text-white border-${color}-600`
                : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700")}>
            {label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-slate-400 font-semibold">{filteredEntries.length} agence{filteredEntries.length > 1 ? "s" : ""}</span>
      </div>

      {/* Agency list */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
        {savedReports.length < 2 ? (
          <div className="text-center py-16 text-slate-400 text-xs font-semibold">
            <RefreshCw className="h-8 w-8 mx-auto mb-3 opacity-40" />
            Importez au moins <strong>2 mois</strong> de rapprochement pour activer le suivi.
          </div>
        ) : effectivelyLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
            <p className="text-xs font-semibold">Chargement des données depuis Firestore...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs font-semibold">
            Aucune agence avec écart trouvée pour ce filtre.
          </div>
        ) : filteredEntries.map(entry => {
          const isExpanded = expandedAgency === entry.agenceCode;
          const lastData = entry.months[lastMonthKey];
          const prevData = entry.months[prevMonthKey];
          const currentMissing = lastData?.missingCount || 0;
          const prevMissing = prevData?.missingCount || 0;
          const isResolved = prevMissing > 0 && currentMissing === 0;
          const isPersistent = (lastData?.stillAbsent || 0) > 0;
          const hasNew = (lastData?.newAbsent || 0) > 0;

          return (
            <div key={entry.agenceCode}
              className={cn("rounded-2xl border transition-all duration-200",
                isExpanded ? "border-rose-400 dark:border-rose-700 bg-rose-50/20 dark:bg-rose-950/10 shadow-sm"
                  : "border-slate-100 dark:border-slate-800 bg-slate-50/30 hover:border-slate-200 dark:hover:border-slate-700")}>

              <button className="w-full flex items-center gap-3 p-3 text-left"
                onClick={() => setExpandedAgency(isExpanded ? null : entry.agenceCode)}>
                <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                  isResolved ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600"
                    : isPersistent ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600"
                    : hasNew ? "bg-rose-100 dark:bg-rose-900/40 text-rose-600"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500")}>
                  <Building2 className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate">{entry.agenceName}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-lg">{entry.agenceType}</span>
                    <span className="text-[9px] text-slate-400 font-mono">#{entry.agenceCode}</span>
                    {isResolved && <span className="flex items-center gap-1 text-[9px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800"><CheckCircle2 className="h-2.5 w-2.5" />Régularisée</span>}
                    {isPersistent && <span className="flex items-center gap-1 text-[9px] font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800"><AlertTriangle className="h-2.5 w-2.5" />Persistante ({lastData?.stillAbsent})</span>}
                    {hasNew && !isPersistent && <span className="flex items-center gap-1 text-[9px] font-black text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800"><XCircle className="h-2.5 w-2.5" />Nouveau ({lastData?.newAbsent})</span>}
                  </div>
                </div>

                {/* Month-by-month spark */}
                <div className="flex items-center gap-1 shrink-0">
                  {orderedMonthKeys.map(mk => {
                    const md = entry.months[mk];
                    const cnt = md?.missingCount || 0;
                    return (
                      <div key={mk} title={`${entry.months[mk]?.monthLabel || mk} : ${cnt} absent(s)`}
                        className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black border",
                          cnt === 0 ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border-emerald-200 dark:border-emerald-900"
                            : cnt > 50 ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 border-rose-200 dark:border-rose-900"
                            : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 border-amber-200 dark:border-amber-900"
                        )}>
                        {cnt > 99 ? "99+" : cnt || "✓"}
                      </div>
                    );
                  })}
                </div>

                {isExpanded ? <ChevronDown className="h-4 w-4 text-rose-500 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />}
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3">
                  {/* Month-by-month status */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="text-left text-[9px] font-black uppercase tracking-wider text-slate-400">
                          <th className="pb-2 pr-3">Mois</th>
                          <th className="pb-2 pr-3 text-right">Absents</th>
                          <th className="pb-2 pr-3 text-right text-emerald-600">Résolus</th>
                          <th className="pb-2 pr-3 text-right text-amber-600">Persistants</th>
                          <th className="pb-2 text-right text-rose-600">Nouveaux</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {orderedMonthKeys.map((mk, idx) => {
                          const md = entry.months[mk];
                          if (!md) return null;
                          return (
                            <tr key={mk}>
                              <td className="py-2 pr-3 font-bold text-slate-700 dark:text-slate-300">{md.monthLabel}</td>
                              <td className={cn("py-2 pr-3 text-right font-black", md.missingCount > 0 ? "text-rose-600" : "text-emerald-600")}>
                                {md.missingCount}
                              </td>
                              <td className="py-2 pr-3 text-right font-bold text-emerald-600">{idx === 0 ? "—" : md.resolvedFromPrev || 0}</td>
                              <td className="py-2 pr-3 text-right font-bold text-amber-600">{idx === 0 ? "—" : md.stillAbsent || 0}</td>
                              <td className="py-2 text-right font-bold text-rose-600">{idx === 0 ? md.missingCount : (md.newAbsent || 0)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Client list for latest month */}
                  {lastData && lastData.identifiants.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5 px-1">
                        Clients encore absents — {lastData.monthLabel} ({lastData.missingCount})
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {/* Find client objects from the report */}
                        {(() => {
                          const report = mergeReportsForBaseKey(enrichedReports, lastMonthKey);
                          if (!report) return null;
                          const ecarts = buildAgencyEcartForMonth(report, resolveAgencyInfo);
                          const agEcart = ecarts.find(a => a.agenceCode === entry.agenceCode);
                          if (!agEcart) return null;

                          // Build set of IDs absent in the PREVIOUS month for this agency
                          const prevReport = mergeReportsForBaseKey(enrichedReports, prevMonthKey);
                          const prevEcarts = prevReport ? buildAgencyEcartForMonth(prevReport, resolveAgencyInfo) : [];
                          const prevAgEcart = prevEcarts.find(a => a.agenceCode === entry.agenceCode);
                          const prevIds = new Set<string>(
                            (prevAgEcart?.clients || []).map(c => c.identifiant).filter(Boolean)
                          );

                          return agEcart.clients.slice(0, 30).map((client, i) => {
                            const rowKey = `${entry.agenceCode}-${client.identifiant}-${i}`;
                            const isClientExp = expandedClientRow === rowKey;
                            // A client is PERSISTENT if their ID was also absent the previous month
                            const isPersistentClient = Boolean(client.identifiant && prevIds.has(client.identifiant));
                            return (
                              <div key={rowKey}
                                className={cn(
                                  "rounded-xl border overflow-hidden transition-colors",
                                  isPersistentClient
                                    ? "border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/10"
                                    : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                                )}>
                                <button
                                  className="w-full flex items-center gap-2 px-3 py-2 text-left"
                                  onClick={() => setExpandedClientRow(isClientExp ? null : rowKey)}
                                >
                                  <Hash className="h-3 w-3 text-rose-400 shrink-0" />
                                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 flex-1 truncate">
                                    {client.name || "—"}
                                  </span>
                                  {/* Persistent badge */}
                                  {isPersistentClient && (
                                    <span
                                      title="Persistant — absent également le mois précédent"
                                      className="shrink-0 h-4 w-4 flex items-center justify-center rounded-full bg-amber-500 text-white text-[8px] font-black shadow-sm shadow-amber-500/40"
                                    >
                                      P
                                    </span>
                                  )}
                                  {client.identifiant && (
                                    <span className="text-[9px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{client.identifiant}</span>
                                  )}
                                  {isClientExp ? <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" /> : <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />}
                                </button>
                                {isClientExp && (
                                  <div className="px-3 pb-2 space-y-1">
                                    {isPersistentClient && (
                                      <p className="text-[8px] font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        <span className="h-3.5 w-3.5 flex items-center justify-center rounded-full bg-amber-500 text-white text-[7px] font-black">P</span>
                                        Persistant — absent également en {entry.months[prevMonthKey]?.monthLabel || "mois précédent"}
                                      </p>
                                    )}
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                      {Object.entries(client.allFields).slice(0, 12).map(([k, v]) => (
                                        <div key={k} className="flex items-start gap-1.5">
                                          <span className="text-[8px] font-black uppercase text-slate-400 shrink-0 mt-0.5">{k.substring(0, 14)}:</span>
                                          <span className="text-[9px] text-slate-700 dark:text-slate-300 font-medium truncate">{v}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                        {lastData.missingCount > 30 && (
                          <p className="text-center text-[9px] text-slate-400 py-1 font-semibold">
                            + {lastData.missingCount - 30} autres clients absents...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
