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
import { CheckSquare, Plus, Edit2, AlertCircle } from "lucide-react";
import { TestCase, TestStatus, Anomaly } from "@/types/testBook";
import { cn } from "@/lib/utils";

interface TestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (testCase: TestCase) => void;
  testCaseToEdit?: TestCase | null;
  modulesList: string[];
  existingAnomalies?: Anomaly[];
  nextSuggestedId?: string;
}

export const TestCaseModal: React.FC<TestCaseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  testCaseToEdit,
  modulesList,
  existingAnomalies = [],
  nextSuggestedId = "T-025",
}) => {
  const [id, setId] = useState(nextSuggestedId);
  const [module, setModule] = useState(modulesList[0] || "Reporting");
  const [customModule, setCustomModule] = useState("");
  const [isCustomModule, setIsCustomModule] = useState(false);
  const [title, setTitle] = useState("");
  const [steps, setSteps] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [status, setStatus] = useState<TestStatus>("Non encore testé");
  const [linkedAnomaly, setLinkedAnomaly] = useState("");
  const [comment, setComment] = useState("");

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
      setLinkedAnomaly(testCaseToEdit.linkedAnomaly || "");
      setComment(testCaseToEdit.comment || "");
    } else {
      setId(nextSuggestedId);
      setModule(modulesList[0] || "Reporting");
      setIsCustomModule(false);
      setCustomModule("");
      setTitle("");
      setSteps("");
      setExpectedResult("");
      setStatus("Non encore testé");
      setLinkedAnomaly("");
      setComment("");
    }
  }, [testCaseToEdit, nextSuggestedId, modulesList, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !title.trim()) return;

    const finalModule = isCustomModule ? (customModule.trim() || "Général") : module;

    onSave({
      id: id.trim(),
      module: finalModule,
      title: title.trim(),
      steps: steps.trim(),
      expectedResult: expectedResult.trim(),
      status,
      linkedAnomaly: linkedAnomaly.trim() || undefined,
      comment: comment.trim() || undefined,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <CheckSquare className="h-5 w-5" />
            </div>
            {testCaseToEdit ? "Modifier le Cas de Test" : "Nouveau Cas de Test"}
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
                    placeholder="Nom du nouveau module..."
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

            {/* Statut Initial */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                Statut Initial
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TestStatus)}
                className="w-full text-xs font-bold rounded-xl p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none h-9"
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

          {/* Étapes de Reproduction */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
              Étapes de Reproduction
            </label>
            <Textarea
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder={"1. Naviguer vers le module...\n2. Appliquer les filtres...\n3. Observer le comportement..."}
              rows={3}
              className="text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 resize-none"
            />
          </div>

          {/* Résultat Attendu */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
              Résultat Attendu
            </label>
            <Textarea
              value={expectedResult}
              onChange={(e) => setExpectedResult(e.target.value)}
              placeholder="Ex: Le tableau s'affiche avec toutes les alertes triées sans perte de données."
              rows={2}
              className="text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 resize-none"
            />
          </div>

          {/* Anomalie liée & Commentaire */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                Anomalie Liée (optionnelle)
              </label>
              <Input
                value={linkedAnomaly}
                onChange={(e) => setLinkedAnomaly(e.target.value)}
                placeholder="Ex: ANO-009"
                className="font-mono text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                Commentaire / Remarque
              </label>
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ex: Testé sur l'environnement de recette..."
                className="text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>
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
              {testCaseToEdit ? "Enregistrer les modifications" : "Ajouter le cas de test"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
