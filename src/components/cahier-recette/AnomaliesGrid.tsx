import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Anomaly, TestBookStats } from "@/types/testBook";

interface AnomaliesGridProps {
  anomalies: Anomaly[];
  stats: TestBookStats;
  selectedPriority: string;
  setSelectedPriority: (priority: string) => void;
}

export const AnomaliesGrid: React.FC<AnomaliesGridProps> = ({
  anomalies,
  stats,
  selectedPriority,
  setSelectedPriority
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4 flex-wrap bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Priorité :</span>
          <button
            onClick={() => setSelectedPriority("ALL")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
              selectedPriority === "ALL"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
            )}
          >
            Toutes ({stats.criticalAnomalies + stats.highAnomalies})
          </button>
          <button
            onClick={() => setSelectedPriority("CRITIQUE")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
              selectedPriority === "CRITIQUE"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 text-rose-600 border border-rose-200"
            )}
          >
            Critiques ({stats.criticalAnomalies})
          </button>
          <button
            onClick={() => setSelectedPriority("HAUTE")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
              selectedPriority === "HAUTE"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 text-amber-600 border border-amber-200"
            )}
          >
            Hautes ({stats.highAnomalies})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {anomalies.map((ano) => (
          <Card
            key={ano.id}
            className={cn(
              "border rounded-2xl shadow-sm overflow-hidden",
              ano.priority === "CRITIQUE"
                ? "border-rose-200 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/30 to-transparent"
                : "border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/30 to-transparent"
            )}
          >
            <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                  {ano.id}
                </span>
                <Badge variant="outline" className="text-[10px] font-bold">
                  {ano.module}
                </Badge>
              </div>
              <Badge
                className={cn(
                  "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border-none",
                  ano.priority === "CRITIQUE"
                    ? "bg-rose-500 text-white animate-pulse"
                    : "bg-amber-500 text-white"
                )}
              >
                {ano.priority}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                  Description du Dysfonctionnement
                </span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                  {ano.description}
                </p>
              </div>

              {ano.businessImpact && (
                <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px]">
                  <span className="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 block mb-0.5">
                    Impact Métier & Risque Réglementaire
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 font-medium">
                    {ano.businessImpact}
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>Cas de test associé : <strong className="text-slate-700 dark:text-slate-300">{ano.linkedTest}</strong></span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
