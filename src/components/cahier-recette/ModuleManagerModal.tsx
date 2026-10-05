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
  ArrowRightLeft,
  ChevronRight,
  MoveRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Mode = "rename" | "transfer";

interface ModuleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  modulesList: string[];
  onRenameModule: (oldName: string, newName: string) => void;
  onTransferModule: (fromModule: string, toModule: string) => void;
  anomalyCountByModule: Record<string, number>;
  testCountByModule: Record<string, number>;
}

export const ModuleManagerModal: React.FC<ModuleManagerModalProps> = ({
  isOpen,
  onClose,
  modulesList,
  onRenameModule,
  onTransferModule,
  anomalyCountByModule,
  testCountByModule,
}) => {
  const [mode, setMode] = useState<Mode>("rename");
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [transferFrom, setTransferFrom] = useState<string>("");
  const [transferTo, setTransferTo] = useState<string>("");
  const [transferError, setTransferError] = useState("");
  const [transferPending, setTransferPending] = useState(false);

  useEffect(() => {
    if (!isOpen) { setMode("rename"); resetRename(); resetTransfer(); }
  }, [isOpen]);

  useEffect(() => { resetRename(); resetTransfer(); }, [mode]);
  useEffect(() => { if (editingModule !== null) setTimeout(() => inputRef.current?.focus(), 50); }, [editingModule]);

  const resetRename = () => { setEditingModule(null); setEditValue(""); setEditError(""); };
  const resetTransfer = () => { setTransferFrom(""); setTransferTo(""); setTransferError(""); setTransferPending(false); };

  const startEdit = (mod: string) => { setEditingModule(mod); setEditValue(mod); setEditError(""); };
  const cancelEdit = () => resetRename();
  const confirmEdit = () => {
    const trimmed = editValue.trim();
    if (!trimmed) { setEditError("Le nom du module ne peut pas etre vide."); return; }
    if (trimmed.toLowerCase() === editingModule!.toLowerCase()) { cancelEdit(); return; }
    if (modulesList.some((m) => m.toLowerCase() === trimmed.toLowerCase() && m.toLowerCase() !== editingModule!.toLowerCase())) {
      setEditError("Un module avec ce nom existe deja."); return;
    }
    onRenameModule(editingModule!, trimmed);
    cancelEdit();
  };
  const handleRenameKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") cancelEdit(); };

  const handleTransferFromChange = (val: string) => { setTransferFrom(val); setTransferTo(""); setTransferError(""); setTransferPending(false); };
  const handleTransferToChange = (val: string) => { setTransferTo(val); setTransferError(""); setTransferPending(false); };
  const handleTransferRequest = () => {
    if (!transferFrom) { setTransferError("Selectionnez le module source."); return; }
    if (!transferTo) { setTransferError("Selectionnez le module de destination."); return; }
    if (transferFrom.toLowerCase() === transferTo.toLowerCase()) { setTransferError("La source et la destination doivent etre differentes."); return; }
    setTransferPending(true);
  };
  const handleTransferConfirm = () => { onTransferModule(transferFrom, transferTo); resetTransfer(); };

  const getTestCount = (m: string) => testCountByModule[m.toLowerCase()] ?? 0;
  const getAnoCount  = (m: string) => anomalyCountByModule[m.toLowerCase()] ?? 0;

  if (!isOpen) return null;

  const transferTargets = modulesList.filter((m) => m.toLowerCase() !== transferFrom.toLowerCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-700/60 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
              <Settings2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Gestion des Modules Fonctionnels</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Renommez ou transferez les contenus entre modules</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex px-6 pt-4 gap-2 shrink-0">
          <button onClick={() => setMode("rename")} className={cn("flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-2xl text-xs font-bold transition-all duration-200 border", mode === "rename" ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20" : "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:text-indigo-600")}>
            <Pencil className="h-3.5 w-3.5" />Renommer un module
          </button>
          <button onClick={() => setMode("transfer")} className={cn("flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-2xl text-xs font-bold transition-all duration-200 border", mode === "transfer" ? "bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-500/20" : "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-violet-300 hover:text-violet-600")}>
            <ArrowRightLeft className="h-3.5 w-3.5" />Transferer vers un autre
          </button>
        </div>

        {/* Admin notice */}
        <div className="flex items-start gap-2.5 mx-6 mt-3 mb-1 px-3.5 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 shrink-0">
          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[10.5px] text-amber-700 dark:text-amber-300 font-semibold leading-relaxed">
            {mode === "rename" ? "Renommer un module met a jour tous les cas de test et anomalies associes." : "Transferer fusionne les contenus d un module dans un autre sans suppression ni recreation."}
          </p>
        </div>

        {/* RENAME MODE */}
        {mode === "rename" && (
          <div className="overflow-y-auto flex-1 px-6 py-3 space-y-2">
            {modulesList.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-semibold">Aucun module fonctionnel trouve.</div>
            ) : modulesList.map((mod) => {
              const anoCount = getAnoCount(mod); const testCount = getTestCount(mod); const isEditing = editingModule === mod;
              return (
                <div key={mod} className={cn("group flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200", isEditing ? "border-indigo-400 dark:border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30 shadow-sm" : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800/40")}>
                  <div className="h-8 w-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0"><Layers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /></div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-1">
                        <Input ref={inputRef} value={editValue} onChange={(e) => { setEditValue(e.target.value); setEditError(""); }} onKeyDown={handleRenameKeyDown} className={cn("h-7 text-xs font-bold rounded-xl px-2.5", editError ? "border-rose-400 focus-visible:ring-rose-400" : "border-indigo-300 dark:border-indigo-700 focus-visible:ring-indigo-400")} placeholder="Nouveau nom..." />
                        {editError && <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1"><AlertTriangle className="h-3 w-3 shrink-0" />{editError}</p>}
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{mod}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500">{testCount} test{testCount > 1 ? "s" : ""}</span>
                          {anoCount > 0 && <><span className="text-slate-300 dark:text-slate-600">·</span><span className={cn("text-[10px] font-bold", anoCount >= 3 ? "text-rose-600" : anoCount === 2 ? "text-orange-600" : "text-amber-600")}>{anoCount} ano.</span></>}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <><button onClick={confirmEdit} className="h-7 w-7 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors" title="Confirmer"><Check className="h-3.5 w-3.5" /></button>
                      <button onClick={cancelEdit} className="h-7 w-7 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors" title="Annuler"><XCircle className="h-3.5 w-3.5" /></button></>
                    ) : (
                      <button onClick={() => startEdit(mod)} className="h-7 w-7 flex items-center justify-center rounded-xl text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 opacity-0 group-hover:opacity-100 transition-all" title={`Renommer "${mod}"`}><Pencil className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TRANSFER MODE */}
        {mode === "transfer" && (
          <div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto">
            {/* Step 1 - Source */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span className="h-4 w-4 rounded-full bg-violet-600 text-white text-[9px] font-black flex items-center justify-center shrink-0">1</span>
                Module source (a vider)
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {modulesList.map((mod) => {
                  const tc = getTestCount(mod); const ac = getAnoCount(mod); const selected = transferFrom === mod;
                  return (
                    <button key={mod} onClick={() => handleTransferFromChange(mod)} className={cn("flex items-center gap-3 p-3 rounded-2xl border text-left transition-all duration-200", selected ? "border-violet-500 dark:border-violet-500 bg-violet-50 dark:bg-violet-950/30 shadow-sm" : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 hover:border-violet-200 hover:bg-violet-50/30")}>
                      <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-colors", selected ? "bg-violet-600" : "bg-slate-100 dark:bg-slate-800")}>
                        <Layers className={cn("h-3.5 w-3.5", selected ? "text-white" : "text-slate-500 dark:text-slate-400")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-bold truncate", selected ? "text-violet-700 dark:text-violet-300" : "text-slate-800 dark:text-slate-200")}>{mod}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500">{tc} test{tc > 1 ? "s" : ""}</span>
                          {ac > 0 && <><span className="text-slate-300 dark:text-slate-600">·</span><span className={cn("text-[10px] font-bold", ac >= 3 ? "text-rose-600" : ac === 2 ? "text-orange-600" : "text-amber-600")}>{ac} ano.</span></>}
                        </div>
                      </div>
                      {selected && <Check className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2 - Destination */}
            {transferFrom && (
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span className="h-4 w-4 rounded-full bg-violet-600 text-white text-[9px] font-black flex items-center justify-center shrink-0">2</span>
                  Module destination (qui recevra le contenu)
                </label>
                <select value={transferTo} onChange={(e) => handleTransferToChange(e.target.value)} className="w-full text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-all">
                  <option value="">— Choisir la destination —</option>
                  {transferTargets.map((m) => <option key={m} value={m}>{m} ({getTestCount(m)} test{getTestCount(m) > 1 ? "s" : ""}{getAnoCount(m) > 0 ? `, ${getAnoCount(m)} ano.` : ""})</option>)}
                </select>
              </div>
            )}

            {/* Error */}
            {transferError && (
              <p className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{transferError}
              </p>
            )}

            {/* Confirmation panel */}
            {transferPending && transferFrom && transferTo && (
              <div className="rounded-2xl border-2 border-violet-400 dark:border-violet-600 bg-violet-50 dark:bg-violet-950/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
                  <p className="text-xs font-black text-violet-800 dark:text-violet-200">Confirmer le transfert</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-xl bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 px-3 py-2 text-center">
                    <p className="text-[10px] text-slate-500 font-semibold mb-0.5">Source</p>
                    <p className="text-xs font-black text-violet-700 dark:text-violet-300 truncate">{transferFrom}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{getTestCount(transferFrom)} test(s) · {getAnoCount(transferFrom)} ano.</p>
                  </div>
                  <MoveRight className="h-5 w-5 text-violet-500 shrink-0" />
                  <div className="flex-1 rounded-xl bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 px-3 py-2 text-center">
                    <p className="text-[10px] text-slate-500 font-semibold mb-0.5">Destination</p>
                    <p className="text-xs font-black text-violet-700 dark:text-violet-300 truncate">{transferTo}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">+ {getTestCount(transferFrom)} test(s) · + {getAnoCount(transferFrom)} ano.</p>
                  </div>
                </div>
                <p className="text-[10.5px] text-violet-700 dark:text-violet-300 font-semibold leading-relaxed">
                  Tous les elements de &quot;{transferFrom}&quot; seront rattaches a &quot;{transferTo}&quot;. Cette action est enregistree dans le journal d&apos;audit.
                </p>
                <div className="flex gap-2">
                  <button onClick={resetTransfer} className="flex-1 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Annuler</button>
                  <button onClick={handleTransferConfirm} className="flex-1 py-1.5 rounded-xl text-xs font-black bg-violet-600 hover:bg-violet-700 text-white transition-colors shadow-md shadow-violet-500/25 flex items-center justify-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5" />Confirmer le transfert
                  </button>
                </div>
              </div>
            )}

            {/* Transfer button */}
            {!transferPending && (
              <Button onClick={handleTransferRequest} size="sm" disabled={!transferFrom || !transferTo} className={cn("w-full rounded-xl text-xs font-bold gap-1.5 shadow-md transition-all", transferFrom && transferTo ? "bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none")}>
                <ArrowRightLeft className="h-4 w-4" />Transferer le contenu
              </Button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end shrink-0">
          <Button onClick={onClose} size="sm" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 shadow-md shadow-indigo-500/20">
            <Save className="h-3.5 w-3.5" />Terminer
          </Button>
        </div>
      </div>
    </div>
  );
};
