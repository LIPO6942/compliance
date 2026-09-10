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
  onSave: (anomaly: Anomaly, auditRemark?: string, auditAuthor?: string) => void;
  anomalyToEdit?: Anomaly | null;
  modulesList: string[];
  nextSuggestedId?: string;
  currentUser?: string;
}

export const AnomalyModal: React.FC<AnomalyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  anomalyToEdit,
  modulesList,
  nextSuggestedId = "ANO-010",
  currentUser = "Équipe Conformité",
}) => {
  const [id, setId] = useState(nextSuggestedId);
  const [module, setModule] = useState(modulesList[0] || "Reporting");
  const [description, setDescription] = useState("");
  const [businessImpact, setBusinessImpact] = useState("");
  const [priority, setPriority] = useState<AnomalyPriority>("HAUTE");
  const [status, setStatus] = useState<AnomalyStatus>("OUVERTE");
  const [linkedTest, setLinkedTest] = useState("");
  const [auditRemark, setAuditRemark] = useState("");
  const [showRemarkStep, setShowRemarkStep] = useState(false);
  const [pendingAnomaly, setPendingAnomaly] = useState<Anomaly | null>(null);

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
    setAuditRemark("");
    setShowRemarkStep(false);
    setPendingAnomaly(null);
  }, [anomalyToEdit, nextSuggestedId, modulesList, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !description.trim()) return;

    const nowIso = new Date().toISOString();
    const isResolved = status === "RESOLUE";

    const anomalyResult: Anomaly = {
      id: id.trim(),
      module,
      description: description.trim(),
      businessImpact: businessImpact.trim(),
      priority,
      status,
      linkedTest: linkedTest.trim() || "N/A",
      createdAt: anomalyToEdit?.createdAt || nowIso,
      updatedAt: nowIso,
      resolvedAt: isResolved ? (anomalyToEdit?.resolvedAt || nowIso) : undefined,
      resolvedBy: isResolved ? (anomalyToEdit?.resolvedBy || currentUser) : undefined,
    };

    if (anomalyToEdit) {
      // Edit flow: show optional remark step
      setPendingAnomaly(anomalyResult);
      setShowRemarkStep(true);
    } else {
      // New anomaly: save directly
      onSave(anomalyResult, undefined, currentUser);
      onClose();
    }
  };

  const handleConfirmWithRemark = (remark?: string) => {
    if (pendingAnomaly) {
      onSave(pendingAnomaly, remark, currentUser);
    }
    setShowRemarkStep(false);
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
                <option value="EN COURS">🟡 En cours d&apos;analyse</option>
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
              Impact Métier &amp; Risque Réglementaire
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
            <div className="flex justify-end gap-2 w-full">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-xl text-xs font-semibold">
                Annuler
              </Button>
              <Button type="submit" className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20">
                {anomalyToEdit ? "Enregistrer les modifications" : "Déclarer l'anomalie"}
              </Button>
            </div>
          </DialogFooter>
        </form>

        {/* Optional Remark Overlay — shown only for edits */}
        {showRemarkStep && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
            <div className="w-full max-w-sm mx-6 space-y-4">
              <div className="text-center space-y-1">
                <div className="h-12 w-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <p className="font-black text-sm text-slate-900 dark:text-white">Ajouter une remarque ?</p>
                <p className="text-[11px] text-slate-400">Optionnel — apparaîtra dans le journal des modifications</p>
              </div>
              <Textarea
                autoFocus
                value={auditRemark}
                onChange={(e) => setAuditRemark(e.target.value)}
                placeholder="Ex: Correction effectuée suite à la revue du 10/09 — validée par le responsable..."
                rows={3}
                className="text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border-rose-200 dark:border-rose-900/60 resize-none w-full"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleConfirmWithRemark(undefined)}
                  className="flex-1 rounded-xl text-xs font-semibold text-slate-500"
                >
                  Passer
                </Button>
                <Button
                  type="button"
                  onClick={() => handleConfirmWithRemark(auditRemark.trim() || undefined)}
                  className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  Confirmer
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
