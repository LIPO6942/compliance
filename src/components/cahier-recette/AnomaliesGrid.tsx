"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  RotateCcw,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Layers,
  Clock,
  ShieldCheck,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Anomaly, TestBookStats, AnomalyStatus } from "@/types/testBook";
import { AnomalyModal } from "@/components/cahier-recette/AnomalyModal";

interface AnomaliesGridProps {
  anomalies: Anomaly[];
  allAnomalies: Anomaly[];
  stats: TestBookStats;
  modulesList: string[];
  selectedPriority: string;
  setSelectedPriority: (priority: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  onToggleResolveAnomaly: (anomalyId: string) => void;
  onAddAnomaly: (anomaly: Anomaly) => void;
  onUpdateAnomaly: (anomaly: Anomaly) => void;
  onDeleteAnomaly: (anomalyId: string) => void;
}

export const AnomaliesGrid: React.FC<AnomaliesGridProps> = ({
  anomalies,
  allAnomalies,
  stats,
  modulesList,
  selectedPriority,
  setSelectedPriority,
  selectedStatus,
  setSelectedStatus,
  onToggleResolveAnomaly,
  onAddAnomaly,
  onUpdateAnomaly,
  onDeleteAnomaly,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnomaly, setEditingAnomaly] = useState<Anomaly | null>(null);

  const openCount = allAnomalies.filter((a) => a.status !== "RESOLUE").length;
  const resolvedCount = allAnomalies.filter((a) => a.status === "RESOLUE").length;

  // Next suggested ID e.g. ANO-010
  const nextId = React.useMemo(() => {
    const ids = allAnomalies
      .map((a) => parseInt(a.id.replace(/\D/g, ""), 10))
      .filter((n) => !isNaN(n));
    const max = ids.length > 0 ? Math.max(...ids) : 0;
    return `ANO-${String(max + 1).padStart(3, "0")}`;
  }, [allAnomalies]);

  const handleOpenAddModal = () => {
    setEditingAnomaly(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ano: Anomaly) => {
    setEditingAnomaly(ano);
    setIsModalOpen(true);
  };

  const handleSaveModal = (savedAnomaly: Anomaly) => {
    if (editingAnomaly) {
      onUpdateAnomaly(savedAnomaly);
    } else {
      onAddAnomaly(savedAnomaly);
    }
  };

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
      return `${datePart} à ${timePart}`;
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Barre d'outils et Filtres */}
      <div className="flex justify-between items-center gap-4 flex-wrap bg-slate-50/70 dark:bg-slate-900/40 p-3.5 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
        {/* Filtres de statut de traitement */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSelectedStatus("ALL")}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-lg transition-all",
                selectedStatus === "ALL"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              Toutes ({allAnomalies.length})
            </button>
            <button
              onClick={() => setSelectedStatus("OUVERTE")}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1",
                selectedStatus === "OUVERTE"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              Ouvertes ({openCount})
            </button>
            <button
              onClick={() => setSelectedStatus("RESOLUE")}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1",
                selectedStatus === "RESOLUE"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              )}
            >
              <CheckCircle2 className="h-3 w-3" />
              Résolues ({resolvedCount})
            </button>
          </div>

          {/* Séparateur */}
          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Filtres de Priorité */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Priorité :
            </span>
            <button
              onClick={() => setSelectedPriority("ALL")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
                selectedPriority === "ALL"
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              )}
            >
              Toutes
            </button>
            <button
              onClick={() => setSelectedPriority("CRITIQUE")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
                selectedPriority === "CRITIQUE"
                  ? "bg-rose-600 text-white shadow-xs font-bold"
                  : "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60"
              )}
            >
              Critiques ({stats.criticalAnomalies})
            </button>
            <button
              onClick={() => setSelectedPriority("HAUTE")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
                selectedPriority === "HAUTE"
                  ? "bg-amber-600 text-white shadow-xs font-bold"
                  : "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60"
              )}
            >
              Hautes ({stats.highAnomalies})
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-semibold">
          {anomalies.length} anomalie(s) répertoriée(s)
        </div>
      </div>

      {/* Grille des Cartes d'Anomalies */}
      {anomalies.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 mx-auto flex items-center justify-center">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Aucune anomalie ne correspond à ces critères
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Toutes les anomalies de cette catégorie sont résolues ou inexistantes.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {anomalies.map((ano) => {
            const isResolved = ano.status === "RESOLUE";

            return (
              <Card
                key={ano.id}
                className={cn(
                  "border-2 rounded-3xl shadow-sm overflow-hidden transition-all duration-300 relative group flex flex-col justify-between",
                  isResolved
                    ? "border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10 opacity-90"
                    : ano.priority === "CRITIQUE"
                    ? "border-rose-300/80 dark:border-rose-800/80 bg-gradient-to-br from-rose-50/40 via-white to-transparent dark:from-rose-950/20 dark:via-slate-900 dark:to-transparent shadow-rose-500/5"
                    : "border-amber-300/80 dark:border-amber-800/80 bg-gradient-to-br from-amber-50/40 via-white to-transparent dark:from-amber-950/20 dark:via-slate-900 dark:to-transparent"
                )}
              >
                <div>
                  {/* En-tête de la carte */}
                  <CardHeader className="p-4 pb-2.5 flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                          {ano.id}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                        >
                          {ano.module}
                        </Badge>
                      </div>
                      {ano.createdAt && (
                        <div className="flex items-center gap-1 text-[9.5px] text-slate-400 dark:text-slate-500 font-medium">
                          <Clock className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                          <span>Enregistrée le {formatDateTime(ano.createdAt)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Statut Résolu / Ouvert */}
                      <Badge
                        className={cn(
                          "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border-none",
                          isResolved
                            ? "bg-emerald-500 text-white"
                            : ano.status === "EN COURS"
                            ? "bg-amber-500 text-white"
                            : "bg-rose-500 text-white"
                        )}
                      >
                        {isResolved ? "🟢 Résolue" : ano.status === "EN COURS" ? "🟡 En cours" : "🔴 Ouverte"}
                      </Badge>

                      {/* Priorité */}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.2",
                          ano.priority === "CRITIQUE"
                            ? "border-rose-300 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50"
                            : "border-amber-300 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50"
                        )}
                      >
                        {ano.priority}
                      </Badge>
                    </div>
                  </CardHeader>

                  {/* Contenu */}
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Description du Dysfonctionnement
                      </span>
                      <p
                        className={cn(
                          "text-xs font-semibold leading-relaxed",
                          isResolved
                            ? "text-slate-500 dark:text-slate-400"
                            : "text-slate-800 dark:text-slate-100"
                        )}
                      >
                        {ano.description}
                      </p>
                    </div>

                    {ano.businessImpact && (
                      <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-[11px]">
                        <span className="text-[9.5px] font-black uppercase text-rose-600 dark:text-rose-400 block mb-0.5 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Impact Métier & Risque Réglementaire
                        </span>
                        <p className="text-slate-600 dark:text-slate-300 font-medium">
                          {ano.businessImpact}
                        </p>
                      </div>
                    )}

                    {isResolved && ano.resolvedAt && (
                      <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50 text-[10.5px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Résolue le <strong className="font-bold">{formatDateTime(ano.resolvedAt)}</strong>
                          {ano.resolvedBy ? ` par ${ano.resolvedBy}` : ""}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </div>

                {/* Pied de carte : Test lié & Bouton Résoudre / Réouvrir */}
                <div className="p-3 bg-slate-50/60 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
                  <div className="text-[10px] text-slate-400 font-medium truncate">
                    Test(s) lié(s) :{" "}
                    <strong className="text-slate-700 dark:text-slate-300 font-bold">
                      {ano.linkedTest}
                    </strong>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Bouton Résoudre / Réouvrir */}
                    <Button
                      size="sm"
                      onClick={() => onToggleResolveAnomaly(ano.id)}
                      className={cn(
                        "h-7 px-2.5 text-[10px] font-bold rounded-xl gap-1 transition-all shadow-xs",
                        isResolved
                          ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                      )}
                    >
                      {isResolved ? (
                        <>
                          <RotateCcw className="h-3 w-3" />
                          Réouvrir
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          Marquer comme résolue
                        </>
                      )}
                    </Button>

                    {/* Actions Modifier & Supprimer */}
                    <button
                      onClick={() => handleOpenEditModal(ano)}
                      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Modifier l'anomalie"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Supprimer l'anomalie ${ano.id} ?`)) {
                          onDeleteAnomaly(ano.id);
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Supprimer l'anomalie"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal d'ajout / modification d'anomalie */}
      <AnomalyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAnomaly(null);
        }}
        onSave={handleSaveModal}
        anomalyToEdit={editingAnomaly}
        modulesList={modulesList}
        nextSuggestedId={nextId}
      />
    </div>
  );
};
