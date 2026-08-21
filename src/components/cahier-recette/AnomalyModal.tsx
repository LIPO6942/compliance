"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import { Anomaly, AnomalyPriority, AnomalyStatus } from "@/types/testBook";

interface AnomalyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (anomaly: Anomaly) => void;
  anomalyToEdit?: Anomaly | null;
  modulesList: string[];
  nextSuggestedId?: string;
}

export const AnomalyModal: React.FC<AnomalyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  anomalyToEdit,
  modulesList,
  nextSuggestedId = "ANO-010",
}) => {
  const [id, setId] = useState(nextSuggestedId);
  const [module, setModule] = useState(modulesList[0] || "Reporting");
  const [description, setDescription] = useState("");
  const [businessImpact, setBusinessImpact] = useState("");
  const [priority, setPriority] = useState<AnomalyPriority>("HAUTE");
  const [status, setStatus] = useState<AnomalyStatus>("OUVERTE");
  const [linkedTest, setLinkedTest] = useState("");

  useEffect(() => {
    if (anomalyToEdit) {
      setId(anomalyToEdit.id);
      setModule(anomalyToEdit.module);
      setDescription(anomalyToEdit.description || "");
      setBusinessImpact(anomalyToEdit.businessImpact || "");
      setPriority(anomalyToEdit.priority || "HAUTE");
      setStatus(anomalyToEdit.status || "OUVERTE");
      setLinkedTest(anomalyToEdit.linkedTest || "");
    } else {
      setId(nextSuggestedId);
      setModule(modulesList[0] || "Reporting");
      setDescription("");
      setBusinessImpact("");
      setPriority("HAUTE");
      setStatus("OUVERTE");
      setLinkedTest("");
    }
  }, [anomalyToEdit, nextSuggestedId, modulesList, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !description.trim()) return;

    onSave({
      id: id.trim(),
      module,
      description: description.trim(),
      businessImpact: businessImpact.trim(),
      priority,
      status,
      linkedTest: linkedTest.trim() || "N/A",
      resolvedAt: status === "RESOLUE" ? anomalyToEdit?.resolvedAt || new Date().toISOString() : undefined,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            {anomalyToEdit ? "Modifier l'Anomalie" : "Déclarer une Anomalie"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Ligne 1 : ID, Module & Priorité */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                ID Anomalie <span className="text-rose-500">*</span>
              </label>
              <Input
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="Ex: ANO-010"
                className="font-mono text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                Module Concerné <span className="text-rose-500">*</span>
              </label>
              <select
                value={module}
                onChange={(e) => setModule(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none h-9"
              >
                {modulesList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                Niveau de Priorité
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as AnomalyPriority)}
                className="w-full text-xs font-bold rounded-xl p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none h-9"
              >
                <option value="CRITIQUE">🚨 CRITIQUE</option>
                <option value="HAUTE">⚡ HAUTE</option>
                <option value="MOYENNE">🟠 MOYENNE</option>
                <option value="BASSE">🟢 BASSE</option>
              </select>
            </div>
          </div>

          {/* Statut & Cas de Test Lié */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                Statut de Traitement
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AnomalyStatus)}
                className="w-full text-xs font-bold rounded-xl p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none h-9"
              >
                <option value="OUVERTE">🔴 Ouverte (Non résolue)</option>
                <option value="EN COURS">🟡 En cours d'analyse</option>
                <option value="RESOLUE">🟢 Résolue / Corrigée</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                Cas de Test Associé(s)
              </label>
              <Input
                value={linkedTest}
                onChange={(e) => setLinkedTest(e.target.value)}
                placeholder="Ex: T-008 / T-009"
                className="text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
              Description du Dysfonctionnement <span className="text-rose-500">*</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez précisément l'anomalie constatée..."
              rows={3}
              className="text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 resize-none"
              required
            />
          </div>

          {/* Impact Métier */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
              Impact Métier & Risque Réglementaire
            </label>
            <Textarea
              value={businessImpact}
              onChange={(e) => setBusinessImpact(e.target.value)}
              placeholder="Impact sur le processus métier, risque LCB-FT ou de non-conformité..."
              rows={2}
              className="text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 resize-none"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs font-semibold"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20"
            >
              {anomalyToEdit ? "Enregistrer les modifications" : "Déclarer l'anomalie"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
