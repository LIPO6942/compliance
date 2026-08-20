import React from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { TestCase, TestBookStats } from "@/types/testBook";

interface TestCasesTableProps {
  testCases: TestCase[];
  modulesList: string[];
  stats: TestBookStats;
  selectedModule: string;
  setSelectedModule: (mod: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  onToggleStatus: (testId: string) => void;
}

export const TestCasesTable: React.FC<TestCasesTableProps> = ({
  testCases,
  modulesList,
  stats,
  selectedModule,
  setSelectedModule,
  selectedStatus,
  setSelectedStatus,
  onToggleStatus
}) => {
  return (
    <div className="space-y-4">
      {/* Filtres de modules et statuts */}
      <div className="flex justify-between items-center gap-4 flex-wrap bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Module :</span>
          <button
            onClick={() => setSelectedModule("ALL")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
              selectedModule === "ALL"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
            )}
          >
            Tous ({stats.total})
          </button>
          {modulesList.map(mod => {
            return (
              <button
                key={mod}
                onClick={() => setSelectedModule(mod)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
                  selectedModule === mod
                    ? "bg-indigo-600 text-white shadow-sm font-bold"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                )}
              >
                {mod}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Statut :</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 outline-none"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="OK">✅ OK ({stats.okCount})</option>
            <option value="KO">❌ KO ({stats.koCount})</option>
            <option value="Non encore testé">⏭️ Non encore testé ({stats.pendingCount})</option>
          </select>
        </div>
      </div>

      {/* Tableau des cas de test */}
      <div className="overflow-x-auto border border-slate-200/60 dark:border-slate-800/60 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/60 dark:border-slate-800/60">
              <th className="p-3.5 w-[80px]">ID</th>
              <th className="p-3.5 w-[160px]">Module</th>
              <th className="p-3.5 w-[240px]">Titre du Test</th>
              <th className="p-3.5 w-[280px]">Étapes de Reproduction</th>
              <th className="p-3.5 w-[240px]">Résultat Attendu</th>
              <th className="p-3.5 w-[130px] text-center">Statut</th>
              <th className="p-3.5 w-[100px] text-center">Anomalie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {testCases.map((tc) => (
              <tr
                key={tc.id}
                className={cn(
                  "hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors",
                  tc.status === "KO" && "bg-rose-50/20 dark:bg-rose-950/10"
                )}
              >
                <td className="p-3.5 font-bold font-mono text-slate-900 dark:text-white">
                  {tc.id}
                </td>
                <td className="p-3.5">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                    {tc.module}
                  </span>
                </td>
                <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                  {tc.title}
                  {tc.comment && (
                    <p className="text-[10px] text-slate-500 font-normal mt-1 italic leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-md border border-slate-100 dark:border-slate-800">
                      💬 {tc.comment}
                    </p>
                  )}
                </td>
                <td className="p-3.5 text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed text-[11px]">
                  {tc.steps}
                </td>
                <td className="p-3.5 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                  {tc.expectedResult}
                </td>
                <td className="p-3.5 text-center">
                  <button
                    onClick={() => onToggleStatus(tc.id)}
                    title="Cliquer pour basculer le statut (OK → KO → Non testé)"
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105",
                      tc.status === "OK" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
                      tc.status === "KO" && "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
                      tc.status === "Non encore testé" && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                    )}
                  >
                    {tc.status === "OK" && <CheckCircle2 className="h-3 w-3" />}
                    {tc.status === "KO" && <XCircle className="h-3 w-3" />}
                    {tc.status === "Non encore testé" && <Clock className="h-3 w-3" />}
                    {tc.status === "OK" ? "OK" : tc.status === "KO" ? "KO" : "Non testé"}
                  </button>
                </td>
                <td className="p-3.5 text-center font-mono text-[10px]">
                  {tc.linkedAnomaly ? (
                    <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-900">
                      {tc.linkedAnomaly}
                    </span>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
