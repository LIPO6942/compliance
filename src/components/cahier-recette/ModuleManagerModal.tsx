"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Settings2,
  X,
  Pencil,
  Check,
  XCircle,
  AlertTriangle,
  Layers,
  ShieldAlert,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ModuleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  modulesList: string[];
  /** Called when admin renames a module */
  onRenameModule: (oldName: string, newName: string) => void;
  /** Number of active anomalies per module (key = module name lowercase) */
  anomalyCountByModule: Record<string, number>;
  /** Number of test cases per module (key = module name lowercase) */
  testCountByModule: Record<string, number>;
}

export const ModuleManagerModal: React.FC<ModuleManagerModalProps> = ({
  isOpen,
  onClose,
  modulesList,
  onRenameModule,
  anomalyCountByModule,
  testCountByModule,
}) => {
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset editing state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEditingModule(null);
      setEditValue("");
      setEditError("");
    }
  }, [isOpen]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingModule !== null) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [editingModule]);

  const startEdit = (mod: string) => {
    setEditingModule(mod);
    setEditValue(mod);
    setEditError("");
  };

  const cancelEdit = () => {
    setEditingModule(null);
    setEditValue("");
    setEditError("");
  };

  const confirmEdit = () => {
    const trimmed = editValue.trim();

    if (!trimmed) {
      setEditError("Le nom du module ne peut pas être vide.");
      return;
    }
    if (trimmed.toLowerCase() === editingModule!.toLowerCase()) {
      cancelEdit();
      return;
    }
    if (
      modulesList.some(
        (m) =>
          m.toLowerCase() === trimmed.toLowerCase() &&
          m.toLowerCase() !== editingModule!.toLowerCase()
      )
    ) {
      setEditError("Un module avec ce nom existe déjà.");
      return;
    }

    onRenameModule(editingModule!, trimmed);
    cancelEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") confirmEdit();
    if (e.key === "Escape") cancelEdit();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Gestion des modules fonctionnels"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-700/60 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
              <Settings2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                Gestion des Modules Fonctionnels
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Renommez les modules — les cas de test et anomalies seront mis à jour automatiquement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Admin notice */}
        <div className="flex items-start gap-2.5 mx-6 mt-4 mb-1 px-3.5 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[10.5px] text-amber-700 dark:text-amber-300 font-semibold leading-relaxed">
            Action réservée à l&apos;administrateur. Renommer un module affectera tous les
            cas de test et anomalies associés dans le cahier de recette.
          </p>
        </div>

        {/* Module list */}
        <div className="overflow-y-auto flex-1 px-6 py-3 space-y-2">
          {modulesList.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-semibold">
              Aucun module fonctionnel trouvé.
            </div>
          ) : (
            modulesList.map((mod) => {
              const anoCount = anomalyCountByModule[mod.toLowerCase()] ?? 0;
              const testCount = testCountByModule[mod.toLowerCase()] ?? 0;
              const isEditing = editingModule === mod;

              return (
                <div
                  key={mod}
                  className={cn(
                    "group flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200",
                    isEditing
                      ? "border-indigo-400 dark:border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30 shadow-sm shadow-indigo-200/50"
                      : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800/40"
                  )}
                >
                  {/* Module icon */}
                  <div className="h-8 w-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                    <Layers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  </div>

                  {/* Name / Edit input */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-1">
                        <Input
                          ref={inputRef}
                          value={editValue}
                          onChange={(e) => {
                            setEditValue(e.target.value);
                            setEditError("");
                          }}
                          onKeyDown={handleKeyDown}
                          className={cn(
                            "h-7 text-xs font-bold rounded-xl px-2.5",
                            editError
                              ? "border-rose-400 dark:border-rose-600 focus-visible:ring-rose-400"
                              : "border-indigo-300 dark:border-indigo-700 focus-visible:ring-indigo-400"
                          )}
                          placeholder="Nom du module..."
                          aria-label="Nouveau nom du module"
                        />
                        {editError && (
                          <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            {editError}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {mod}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {testCount} test{testCount > 1 ? "s" : ""}
                          </span>
                          {anoCount > 0 && (
                            <>
                              <span className="text-slate-300 dark:text-slate-600">·</span>
                              <span
                                className={cn(
                                  "text-[10px] font-bold",
                                  anoCount >= 3
                                    ? "text-rose-600 dark:text-rose-400"
                                    : anoCount === 2
                                    ? "text-orange-600 dark:text-orange-400"
                                    : "text-amber-600 dark:text-amber-400"
                                )}
                              >
                                {anoCount} anomalie{anoCount > 1 ? "s" : ""} ouverte{anoCount > 1 ? "s" : ""}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Edit button */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          onClick={confirmEdit}
                          className="h-7 w-7 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm shadow-indigo-500/30"
                          title="Confirmer le renommage (Entrée)"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="h-7 w-7 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Annuler (Échap)"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(mod)}
                        className="h-7 w-7 flex items-center justify-center rounded-xl text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 opacity-0 group-hover:opacity-100 transition-all"
                        title={`Renommer le module "${mod}"`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end shrink-0">
          <Button
            onClick={onClose}
            size="sm"
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 shadow-md shadow-indigo-500/20"
          >
            <Save className="h-3.5 w-3.5" />
            Terminer
          </Button>
        </div>
      </div>
    </div>
  );
};
