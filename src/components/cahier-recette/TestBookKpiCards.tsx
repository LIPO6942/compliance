import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Layers, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { TestBookStats } from "@/types/testBook";

interface TestBookKpiCardsProps {
  stats: TestBookStats;
}

export const TestBookKpiCards: React.FC<TestBookKpiCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Cas */}
      <Card className="border-none shadow-md bg-white dark:bg-slate-900 rounded-2xl">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Cas de Test
            </span>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
              {stats.total}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tests Conformes */}
      <Card className="border-none shadow-md bg-white dark:bg-slate-900 rounded-2xl">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Conformes (OK)
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {stats.okCount}
              </span>
              <span className="text-xs font-bold text-emerald-600/80">
                ({stats.progressRate}%)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Anomalies Confirmées */}
      <Card className="border-none shadow-md bg-white dark:bg-slate-900 rounded-2xl">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Anomalies (KO)
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {stats.koCount}
              </span>
              <span className="text-xs font-bold text-rose-600/80">
                ({((stats.koCount / stats.total) * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Anomalies Critiques */}
      <Card className="border-none shadow-md bg-white dark:bg-slate-900 rounded-2xl">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Anomalies Critiques / Hautes
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {stats.criticalAnomalies}
              </span>
              <span className="text-xs font-bold text-slate-400">
                + {stats.highAnomalies} hautes
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
