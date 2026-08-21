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
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Plus, AlertTriangle, ShieldAlert } from "lucide-react";
import { TestCase, TestStatus, Anomaly, AnomalyPriority } from "@/types/testBook";
import { cn } from "@/lib/utils";

interface TestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (testCase: TestCase, associatedAnomaly?: Anomaly) => void;
  testCaseToEdit?: TestCase | null;
  modulesList: string[];
  existingAnomalies?: Anomaly[];
  nextSuggestedId?: string;
  nextSuggestedAnomalyId?: string;
}

export const TestCaseModal: React.FC<TestCaseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  testCaseToEdit,
  modulesList,
  existingAnomalies = [],
  nextSuggestedId = "T-025",
  nextSuggestedAnomalyId = "ANO-010",
}) => {
  const [id, setId] = useState(nextSuggestedId);
  const [module, setModule] = useState(modulesList[0] || "Reporting");
  const [customModule, setCustomModule] = useState("");
  const [isCustomModule, setIsCustomModule] = useState(false);
  const [title, setTitle] = useState("");
  const [steps, setSteps] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [status, setStatus] = useState<TestStatus>("Non encore testé");
  const [comment, setComment] = useState("");

  // Anomaly integration
  const [declareAnomaly, setDeclareAnomaly] = useState(false);
  const [anomalyId, setAnomalyId] = useState(nextSuggestedAnomalyId);
  const [anomalyDescription, setAnomalyDescription] = useState("");
  const [anomalyImpact, setAnomalyImpact] = useState("");
  const [anomalyPriority, setAnomalyPriority] = useState<AnomalyPriority>("HAUTE");

  useEffect(() => {
    if (testCaseToEdit) {
      setId(testCaseToEdit.id);
      if (modulesList.includes(testCaseToEdit.module)) {
        setModule(testCaseToEdit.module);
        setIsCustomModule(false);
        setCustomModule("");
      } else {
        setModule("CUSTOM");
        setIsCustomModule(true);
        setCustomModule(testCaseToEdit.module);
      }
      setTitle(testCaseToEdit.title || "");
      setSteps(testCaseToEdit.steps || "");
      setExpectedResult(testCaseToEdit.expectedResult || "");
      setStatus(testCaseToEdit.status || "Non encore testé");
      setComment(testCaseToEdit.comment || "");

      // Check if linked anomaly exists
      if (testCaseToEdit.linkedAnomaly) {
        const found = existingAnomalies.find((a) => a.id === testCaseToEdit.linkedAnomaly);
        setDeclareAnomaly(true);
        setAnomalyId(testCaseToEdit.linkedAnomaly);
        setAnomalyDescription(found ? found.description : "");
        setAnomalyImpact(found ? found.businessImpact : "");
        setAnomalyPriority(found ? found.priority : "HAUTE");
      } else if (testCaseToEdit.status === "KO") {
        setDeclareAnomaly(true);
        setAnomalyId(nextSuggestedAnomalyId);
        setAnomalyDescription(testCaseToEdit.comment || testCaseToEdit.title || "");
        setAnomalyImpact("");
        setAnomalyPriority("HAUTE");
      } else {
        setDeclareAnomaly(false);
        setAnomalyId(nextSuggestedAnomalyId);
        setAnomalyDescription("");
        setAnomalyImpact("");
        setAnomalyPriority("HAUTE");
      }
    } else {
      setId(nextSuggestedId);
      setModule(modulesList[0] || "Reporting");
      setIsCustomModule(false);
      setCustomModule("");
      setTitle("");
      setSteps("");
      setExpectedResult("");
      setStatus("Non encore testé");
      setComment("");
      setDeclareAnomaly(false);
      setAnomalyId(nextSuggestedAnomalyId);
      setAnomalyDescription("");
      setAnomalyImpact("");
      setAnomalyPriority("HAUTE");
    }
  }, [testCaseToEdit, nextSuggestedId, nextSuggestedAnomalyId, modulesList, existingAnomalies, isOpen]);

  // When user switches status to KO, auto-enable anomaly declaration
  const handleStatusChange = (newStatus: TestStatus) => {
    setStatus(newStatus);
    if (newStatus === "KO" && !declareAnomaly) {
      setDeclareAnomaly(true);
      if (!anomalyDescription) {
        setAnomalyDescription(title ? `Dysfonctionnement constaté lors du test : ${title}` : "");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !title.trim()) return;

    const finalModule = isCustomModule ? customModule.trim() || "Général" : module;
    const finalLinkedAnomaly = declareAnomaly && anomalyId.trim() ? anomalyId.trim() : undefined;
    const nowIso = new Date().toISOString();

    const testCaseResult: TestCase = {
      id: id.trim(),
      module: finalModule,
      title: title.trim(),
      steps: steps.trim(),
      expectedResult: expectedResult.trim(),
      status,
      linkedAnomaly: finalLinkedAnomaly,
      comment: comment.trim() || undefined,
      createdAt: testCaseToEdit?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    let associatedAnomalyResult: Anomaly | undefined = undefined;

    if (declareAnomaly && anomalyId.trim()) {
      const existingAno = existingAnomalies.find((a) => a.id === anomalyId.trim());
      const isResolved = status === "OK";
      associatedAnomalyResult = {
        id: anomalyId.trim(),
        module: finalModule,
        description: anomalyDescription.trim() || `Anomalie constatée sur le test ${id.trim()} : ${title.trim()}`,
        businessImpact: anomalyImpact.trim() || "Impact à qualifier par l'équipe conformité.",
        priority: anomalyPriority,
        linkedTest: id.trim(),
        status: isResolved ? "RESOLUE" : "OUVERTE",
        createdAt: existingAno?.createdAt || nowIso,
        updatedAt: nowIso,
        resolvedAt: isResolved ? (existingAno?.resolvedAt || nowIso) : undefined,
        resolvedBy: isResolved ? (existingAno?.resolvedBy || "Équipe Conformité") : undefined,
      };
    }

    onSave(testCaseResult, associatedAnomalyResult);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <CheckSquare className="h-5 w-5" />
            </div>
            {testCaseToEdit ? `Modifier le Cas de Test ${testCaseToEdit.id}` : "Nouveau Cas de Test"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Ligne 1 : ID, Module & Statut */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* ID */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                ID du Cas <span className="text-rose-500">*</span>
              </label>
              <Input
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="Ex: T-025"
                className="font-mono text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                required
              />
            </div>

            {/* Module */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                Module Fonctionnel <span className="text-rose-500">*</span>
              </label>
              {!isCustomModule ? (
                <select
                  value={module}
                  onChange={(e) => {
                    if (e.target.value === "NEW_CUSTOM") {
                      setIsCustomModule(true);
                      setCustomModule("");
                    } else {
                      setModule(e.target.value);
                    }
                  }}
                  className="w-full text-xs font-semibold rounded-xl p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none h-9"
                >
                  {modulesList.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                  <option value="NEW_CUSTOM">➕ Autre module personnalisé...</option>
                </select>
              ) : (
                <div className="flex gap-1">
                  <Input
                    value={customModule}
                    onChange={(e) => setCustomModule(e.target.value)}
                    placeholder="Nom du module..."
                    className="text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 h-9"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCustomModule(false)}
                    className="h-9 px-2 text-xs text-slate-400"
                    title="Choisir parmi les modules existants"
                  >
                    ✕
                  </Button>
                </div>
              )}
            </div>

            {/* Statut */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                Statut du Test
              </label>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as TestStatus)}
                className={cn(
                  "w-full text-xs font-bold rounded-xl p-2 border outline-none h-9 transition-colors",
                  status === "OK" && "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300",
                  status === "KO" && "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300",
                  status === "Non encore testé" && "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                )}
              >
                <option value="OK">🟢 Conforme (OK)</option>
                <option value="KO">🔴 Anomalie (KO)</option>
                <option value="Non encore testé">⚪ Non encore testé</option>
              </select>
            </div>
          </div>

          {/* Titre */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
              Titre / Objet du Test <span className="text-rose-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Contrôle de la pagination des alertes filtrées..."
              className="text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              required
            />
          </div>

          {/* Étapes & Résultat Attendu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                Étapes de Reproduction
              </label>
              <Textarea
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder={"1. Naviguer vers le module...\n2. Appliquer les filtres..."}
                rows={3}
                className="text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                Résultat Attendu
              </label>
              <Textarea
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                placeholder="Ex: Le tableau s'affiche avec toutes les alertes triées sans perte de données."
                rows={3}
                className="text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 resize-none"
              />
            </div>
          </div>

          {/* Commentaire */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
              Commentaire / Observation
            </label>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Remarques éventuelles sur l'exécution..."
              className="text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>

          {/* SECTION DÉCLARATION D'ANOMALIE ASSOCIÉE AU CAS DE TEST */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <div>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                    Déclarer / Associer une Anomalie à ce cas de test
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Les anomalies sont obligatoirement rattachées à un cas de test.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={declareAnomaly}
                onChange={(e) => setDeclareAnomaly(e.target.checked)}
                className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500 border-rose-300 cursor-pointer"
              />
            </div>

            {declareAnomaly && (
              <div className="mt-3 p-3.5 rounded-2xl bg-rose-50/30 dark:bg-rose-950/10 border border-rose-200/50 dark:border-rose-900/30 space-y-3 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                      ID Anomalie <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={anomalyId}
                      onChange={(e) => setAnomalyId(e.target.value)}
                      placeholder="Ex: ANO-010"
                      className="font-mono text-xs font-black rounded-xl bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/60"
                      required={declareAnomaly}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                      Priorité de l'Anomalie
                    </label>
                    <select
                      value={anomalyPriority}
                      onChange={(e) => setAnomalyPriority(e.target.value as AnomalyPriority)}
                      className="w-full text-xs font-bold rounded-xl p-2 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 text-slate-800 dark:text-slate-200 outline-none h-9"
                    >
                      <option value="CRITIQUE">🚨 CRITIQUE</option>
                      <option value="HAUTE">⚡ HAUTE</option>
                      <option value="MOYENNE">🟠 MOYENNE</option>
                      <option value="BASSE">🟢 BASSE</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                    Description du Dysfonctionnement <span className="text-rose-500">*</span>
                  </label>
                  <Textarea
                    value={anomalyDescription}
                    onChange={(e) => setAnomalyDescription(e.target.value)}
                    placeholder="Décrivez précisément le comportement anormal constaté..."
                    rows={2}
                    className="text-xs font-medium rounded-xl bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/60 resize-none"
                    required={declareAnomaly}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                    Impact Métier & Risque Réglementaire
                  </label>
                  <Input
                    value={anomalyImpact}
                    onChange={(e) => setAnomalyImpact(e.target.value)}
                    placeholder="Ex: Risque de non-détection PEP lors des contrôles LCB-FT..."
                    className="text-xs rounded-xl bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/60"
                  />
                </div>
              </div>
            )}
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
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20"
            >
              {testCaseToEdit ? "Enregistrer les modifications" : "Enregistrer le cas de test"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
