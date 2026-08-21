"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, Clock, Plus, Edit2, Trash2, Layers, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { TestCase, TestBookStats, Anomaly, TestStatus } from "@/types/testBook";
import { Button } from "@/components/ui/button";
import { TestCaseModal } from "@/components/cahier-recette/TestCaseModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TestCasesTableProps {
  testCases: TestCase[];
  allTestCases: TestCase[];
  anomalies: Anomaly[];
  modulesList: string[];
  stats: TestBookStats;
  selectedModule: string;
  setSelectedModule: (mod: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  onToggleStatus: (testId: string) => void;
  onAddTestCase: (testCase: TestCase, associatedAnomaly?: Anomaly) => void;
  onUpdateTestCase: (testCase: TestCase, associatedAnomaly?: Anomaly) => void;
  onDeleteTestCase: (testId: string) => void;
}

export const TestCasesTable: React.FC<TestCasesTableProps> = ({
  testCases,
  allTestCases,
  anomalies,
  modulesList,
  stats,
  selectedModule,
  setSelectedModule,
  selectedStatus,
  setSelectedStatus,
  onToggleStatus,
  onAddTestCase,
  onUpdateTestCase,
  onDeleteTestCase,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);

  // Helper to count active/open anomalies for a given module
  const getModuleAnomalyCount = (mod: string): number => {
    if (mod === "ALL") {
      return anomalies.filter((a) => a.status !== "RESOLUE").length;
    }
    // Count active anomalies linked to this module
    const directAnomalies = anomalies.filter(
      (a) => a.module.toLowerCase().trim() === mod.toLowerCase().trim() && a.status !== "RESOLUE"
    ).length;

    // Also include KO tests that don't have an anomaly object in the anomalies list
    const unlinkedKOTests = allTestCases.filter(
      (t) =>
        t.module.toLowerCase().trim() === mod.toLowerCase().trim() &&
        t.status === "KO" &&
        (!t.linkedAnomaly || !anomalies.some((a) => a.id === t.linkedAnomaly))
    ).length;

    return directAnomalies + unlinkedKOTests;
  };

  // Helper to compute color classes according to exact user rules:
  // - > 3 (ou >= 3) anomalies : Rouge
  // - 2 anomalies : Orange
  // - 1 anomalie : Jaune
  // - Sinon (0 anomalie) : Vert
  const getFilterColorClasses = (count: number, isSelected: boolean) => {
    if (count >= 3) {
      return isSelected
        ? "bg-rose-600 text-white font-black border-rose-600 shadow-md shadow-rose-500/25 ring-2 ring-rose-400/40"
        : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-bold";
    }
    if (count === 2) {
      return isSelected
        ? "bg-orange-500 text-white font-black border-orange-500 shadow-md shadow-orange-500/25 ring-2 ring-orange-400/40"
        : "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/60 font-bold";
    }
    if (count === 1) {
      return isSelected
        ? "bg-amber-500 text-white font-black border-amber-500 shadow-md shadow-amber-500/25 ring-2 ring-amber-400/40"
        : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/60 font-bold";
    }
    return isSelected
      ? "bg-emerald-600 text-white font-black border-emerald-600 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/40"
      : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-medium";
  };

  // Next suggested test ID e.g. T-025
  const nextId = React.useMemo(() => {
    const ids = allTestCases
      .map((t) => parseInt(t.id.replace(/\D/g, ""), 10))
      .filter((n) => !isNaN(n));
    const max = ids.length > 0 ? Math.max(...ids) : 0;
    return `T-${String(max + 1).padStart(3, "0")}`;
  }, [allTestCases]);

  // Next suggested anomaly ID e.g. ANO-010
  const nextAnomalyId = React.useMemo(() => {
    const ids = anomalies
      .map((a) => parseInt(a.id.replace(/\D/g, ""), 10))
      .filter((n) => !isNaN(n));
    const max = ids.length > 0 ? Math.max(...ids) : 0;
    return `ANO-${String(max + 1).padStart(3, "0")}`;
  }, [anomalies]);

  const handleOpenAddModal = () => {
    setEditingTestCase(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tc: TestCase) => {
    setEditingTestCase(tc);
    setIsModalOpen(true);
  };

  const handleSaveModal = (savedTestCase: TestCase, associatedAnomaly?: Anomaly) => {
    if (editingTestCase) {
      onUpdateTestCase(savedTestCase, associatedAnomaly);
    } else {
      onAddTestCase(savedTestCase, associatedAnomaly);
    }
  };

  const allAnomaliesCount = getModuleAnomalyCount("ALL");

  // Helper to format date and time
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      const datePart = d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const timePart = d.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${datePart} ${timePart}`;
    } catch {
      return null;
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        {/* Barre d'outils, Filtres & Bouton d'ajout */}
        <div className="space-y-3 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
          <div className="flex justify-between items-center gap-3 flex-wrap">
            {/* Titre de section des filtres */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-600" />
                Matrice des Cas de Test
              </span>
            </div>

            {/* Bouton Ajouter un Cas de Test */}
            <Button
              onClick={handleOpenAddModal}
              size="sm"
              className="h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 shadow-md shadow-indigo-500/20 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Nouveau Cas de Test
            </Button>
          </div>

          {/* Filtres de modules avec code couleur et Tooltip sur le bouton TOUS */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">
              Module :
            </span>

            {/* Bouton "Tous" avec Tooltip explicatif au survol */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSelectedModule("ALL")}
                  className={cn(
                    "px-3 py-1 rounded-xl text-xs transition-all duration-200 flex items-center gap-1.5 cursor-pointer",
                    getFilterColorClasses(allAnomaliesCount, selectedModule === "ALL")
                  )}
                >
                  <span>Tous ({allTestCases.length})</span>
                  {allAnomaliesCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-white/30 dark:bg-black/30">
                      {allAnomaliesCount} ano.
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="p-3 text-xs space-y-2 shadow-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-2xl max-w-xs z-50 text-slate-900 dark:text-white"
              >
                <p className="font-black text-[11px] uppercase tracking-wider text-slate-800 dark:text-slate-100 border-b pb-1.5 border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-indigo-500" />
                  État des anomalies par module
                </p>
                <div className="space-y-1.5 text-[10.5px] font-semibold">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0 shadow-xs" />
                    <span>≥ 3 anomalies : <strong className="font-black uppercase">Rouge</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0 shadow-xs" />
                    <span>2 anomalies : <strong className="font-black uppercase">Orange</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0 shadow-xs" />
                    <span>1 anomalie : <strong className="font-black uppercase">Jaune</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0 shadow-xs" />
                    <span>0 anomalie : <strong className="font-black uppercase">Vert</strong></span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>

            {/* Boutons pour chaque module */}
            {modulesList.map((mod) => {
              const anomalyCount = getModuleAnomalyCount(mod);
              const isSelected = selectedModule === mod;

              return (
                <button
                  key={mod}
                  onClick={() => setSelectedModule(mod)}
                  className={cn(
                    "px-2.5 py-1 rounded-xl text-xs transition-all duration-200 flex items-center gap-1.5",
                    getFilterColorClasses(anomalyCount, isSelected)
                  )}
                >
                  <span>{mod}</span>
                  {anomalyCount > 0 ? (
                    <span
                      className={cn(
                        "px-1.5 py-0.2 rounded-full text-[9.5px] font-black leading-tight",
                        isSelected
                          ? "bg-white/30 text-white"
                          : anomalyCount >= 3
                          ? "bg-rose-500 text-white"
                          : anomalyCount === 2
                          ? "bg-orange-500 text-white"
                          : "bg-amber-500 text-white"
                      )}
                    >
                      ({anomalyCount})
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "text-[9.5px] font-bold opacity-75",
                        isSelected ? "text-white" : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      (0)
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Filtre par statut */}
          <div className="flex justify-between items-center gap-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Statut :
              </span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1 text-slate-800 dark:text-slate-200 outline-none shadow-xs"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="OK">🟢 Conformes OK ({stats.okCount})</option>
                <option value="KO">🔴 Anomalies KO ({stats.koCount})</option>
                <option value="Non encore testé">⚪ Non encore testé ({stats.pendingCount})</option>
              </select>
            </div>

            <div className="text-[11px] text-slate-400 font-semibold">
              {testCases.length} cas de test affiché(s)
            </div>
          </div>
        </div>

        {/* Tableau des cas de test */}
        <div className="overflow-x-auto border border-slate-200/60 dark:border-slate-800/60 rounded-3xl bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/60 dark:border-slate-800/60">
                <th className="p-3.5 w-[110px]">ID / Date</th>
                <th className="p-3.5 w-[160px]">Module</th>
                <th className="p-3.5 w-[240px]">Titre du Test</th>
                <th className="p-3.5 w-[280px]">Étapes de Reproduction</th>
                <th className="p-3.5 w-[240px]">Résultat Attendu</th>
                <th className="p-3.5 w-[130px] text-center">Statut</th>
                <th className="p-3.5 w-[100px] text-center">Anomalie</th>
                <th className="p-3.5 w-[80px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {testCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <div className="space-y-2">
                      <p className="font-bold text-xs text-slate-600 dark:text-slate-300">
                        Aucun cas de test ne correspond aux filtres sélectionnés
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenAddModal}
                        className="rounded-xl text-xs font-bold gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Créer un cas de test
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                testCases.map((tc) => (
                  <tr
                    key={tc.id}
                    className={cn(
                      "hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors group",
                      tc.status === "KO" && "bg-rose-50/20 dark:bg-rose-950/10"
                    )}
                  >
                    <td className="p-3.5 align-top">
                      <div className="font-bold font-mono text-slate-900 dark:text-white">
                        {tc.id}
                      </div>
                      {tc.createdAt && (
                        <div
                          className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-1 shrink-0"
                          title={`Enregistré le ${formatDateTime(tc.createdAt)}`}
                        >
                          <Clock className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                          <span>{formatDateTime(tc.createdAt)}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 align-top">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                        {tc.module}
                      </span>
                    </td>
                    <td className="p-3.5 align-top font-semibold text-slate-800 dark:text-slate-200">
                      {tc.title}
                      {tc.comment && (
                        <p className="text-[10px] text-slate-500 font-normal mt-1 italic leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-md border border-slate-100 dark:border-slate-800">
                          💬 {tc.comment}
                        </p>
                      )}
                    </td>
                    <td className="p-3.5 align-top text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed text-[11px]">
                      {tc.steps}
                    </td>
                    <td className="p-3.5 align-top text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                      {tc.expectedResult}
                    </td>
                    <td className="p-3.5 align-top text-center">
                      <button
                        onClick={() => onToggleStatus(tc.id)}
                        title="Cliquer pour basculer le statut (OK → KO → Non testé)"
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-105",
                          tc.status === "OK" &&
                            "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
                          tc.status === "KO" &&
                            "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
                          tc.status === "Non encore testé" &&
                            "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        )}
                      >
                        {tc.status === "OK" && <CheckCircle2 className="h-3 w-3" />}
                        {tc.status === "KO" && <XCircle className="h-3 w-3" />}
                        {tc.status === "Non encore testé" && <Clock className="h-3 w-3" />}
                        {tc.status === "OK" ? "OK" : tc.status === "KO" ? "KO" : "Non testé"}
                      </button>
                    </td>
                    <td className="p-3.5 align-top text-center font-mono text-[10px]">
                      {tc.linkedAnomaly ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-black border border-rose-200 dark:border-rose-900">
                          {tc.linkedAnomaly}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>
                    <td className="p-3.5 align-top text-center">
                      <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={() => handleOpenEditModal(tc)}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Modifier ce test"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Supprimer le cas de test ${tc.id} : "${tc.title}" ?`)) {
                              onDeleteTestCase(tc.id);
                            }
                          }}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Supprimer ce test"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal d'ajout / modification de Cas de Test */}
        <TestCaseModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTestCase(null);
          }}
          onSave={handleSaveModal}
          testCaseToEdit={editingTestCase}
          modulesList={modulesList}
          existingAnomalies={anomalies}
          nextSuggestedId={nextId}
          nextSuggestedAnomalyId={nextAnomalyId}
        />
      </div>
    </TooltipProvider>
  );
};
