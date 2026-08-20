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
import {
  Sparkles,
  Plus,
  Trash2,
  Users,
  User,
  AlertTriangle,
  Info,
  ShieldAlert,
  Layers,
  CheckCircle2,
  ChevronDown,
  Wand2,
  Loader2,
  Check,
  RefreshCw
} from "lucide-react";
import { ComplianceMemo, MemoPillar, MemoScope, MemoPriority, APP_SECTIONS, PILLAR_CONFIG } from "@/types/memo";
import { useMemos } from "@/contexts/MemoContext";
import { reformulateMemoAction } from "@/app/(app)/memos/actions";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface MemoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  memoToEdit: ComplianceMemo | null;
  defaultSectionHref?: string;
  defaultSectionLabel?: string;
}

export const MemoEditorModal: React.FC<MemoEditorModalProps> = ({
  isOpen,
  onClose,
  memoToEdit,
  defaultSectionHref = "/dashboard",
  defaultSectionLabel = "Dashboard Général",
}) => {
  const { addMemo, updateMemo } = useMemos();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pillar, setPillar] = useState<MemoPillar>("LAB_FT");
  const [scope, setScope] = useState<MemoScope>("COLLABORATIVE");
  const [priority, setPriority] = useState<MemoPriority>("ATTENTION");
  const [associatedSectionHref, setAssociatedSectionHref] = useState(defaultSectionHref);
  const [associatedSectionLabel, setAssociatedSectionLabel] = useState(defaultSectionLabel);
  const [checklistInput, setChecklistInput] = useState("");
  const [checklists, setChecklists] = useState<{ id: string; text: string; completed: boolean }[]>([]);

  // AI Reformulation State
  const [isReformulating, setIsReformulating] = useState(false);
  const [aiStyle, setAiStyle] = useState<"FORMAL" | "SYNTHETIC" | "LEGAL">("FORMAL");
  const [showAiPreview, setShowAiPreview] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ title?: string; text?: string } | null>(null);

  useEffect(() => {
    if (memoToEdit) {
      setTitle(memoToEdit.title);
      setContent(memoToEdit.content);
      setPillar(memoToEdit.pillar);
      setScope(memoToEdit.scope);
      setPriority(memoToEdit.priority);
      setAssociatedSectionHref(memoToEdit.associatedSectionHref || defaultSectionHref);
      setAssociatedSectionLabel(memoToEdit.associatedSectionLabel || defaultSectionLabel);
      setChecklists(memoToEdit.checklists || []);
    } else {
      setTitle("");
      setContent("");
      setPillar("LAB_FT");
      setScope("COLLABORATIVE");
      setPriority("ATTENTION");
      setAssociatedSectionHref(defaultSectionHref);
      setAssociatedSectionLabel(defaultSectionLabel);
      setChecklists([]);
    }
    setShowAiPreview(false);
    setAiSuggestion(null);
  }, [memoToEdit, defaultSectionHref, defaultSectionLabel, isOpen]);

  const handleAddChecklistItem = () => {
    if (!checklistInput.trim()) return;
    setChecklists((prev) => [
      ...prev,
      {
        id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        text: checklistInput.trim(),
        completed: false,
      },
    ]);
    setChecklistInput("");
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklists((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSectionChange = (href: string) => {
    const selected = APP_SECTIONS.find((s) => s.href === href);
    setAssociatedSectionHref(href);
    setAssociatedSectionLabel(selected ? selected.label : "Section personnalisée");
  };

  // AI Reformulation Handler
  const handleReformulate = async (selectedStyle: "FORMAL" | "SYNTHETIC" | "LEGAL") => {
    if (!content.trim()) {
      toast({
        title: "Texte requis",
        description: "Veuillez d'abord rédiger une ébauche de note pour que l'IA puisse la reformuler.",
        variant: "destructive",
      });
      return;
    }

    setIsReformulating(true);
    setAiStyle(selectedStyle);

    try {
      const result = await reformulateMemoAction({
        text: content,
        title: title || undefined,
        pillar,
        style: selectedStyle,
        sectionLabel: associatedSectionLabel,
      });

      if (result.error) {
        toast({
          title: "Erreur IA",
          description: result.error,
          variant: "destructive",
        });
      } else if (result.reformulatedText) {
        setAiSuggestion({
          title: result.suggestedTitle,
          text: result.reformulatedText,
        });
        setShowAiPreview(true);
        toast({
          title: "Proposition générée",
          description: "La reformulation IA est prête pour relecture.",
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Erreur IA",
        description: "Échec de connexion au service d'intelligence cognitive.",
        variant: "destructive",
      });
    } finally {
      setIsReformulating(false);
    }
  };

  const handleApplyAiSuggestion = () => {
    if (!aiSuggestion) return;
    if (aiSuggestion.text) setContent(aiSuggestion.text);
    if (aiSuggestion.title && !title) setTitle(aiSuggestion.title);
    setShowAiPreview(false);
    toast({
      title: "Texte appliqué !",
      description: "La reformulation IA a été insérée dans votre mémo.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Champs requis",
        description: "Veuillez renseigner au minimum un titre et le contenu du mémo.",
        variant: "destructive",
      });
      return;
    }

    if (memoToEdit) {
      await updateMemo(memoToEdit.id, {
        title: title.trim(),
        content: content.trim(),
        pillar,
        scope,
        priority,
        associatedSectionHref,
        associatedSectionLabel,
        checklists,
      });
    } else {
      await addMemo({
        title: title.trim(),
        content: content.trim(),
        pillar,
        scope,
        priority,
        associatedSectionHref,
        associatedSectionLabel,
        checklists,
        pinned: false,
        status: "ACTIVE",
      });
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-950 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                {memoToEdit ? "Modifier le Mémo" : "Nouveau Compliance Mémo"}
              </DialogTitle>
              <p className="text-xs text-slate-400">
                Note de travail collaborative ou personnelle rattachée aux processus de conformité
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Titre */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Titre du mémo <span className="text-rose-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Point de vigilance sur les clients sous sanctions..."
              className="text-xs rounded-xl font-semibold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              required
            />
          </div>

          {/* Sélecteurs Volet Métier, Portée & Priorité */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Volet */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Volet Métier
              </label>
              <select
                value={pillar}
                onChange={(e) => setPillar(e.target.value as MemoPillar)}
                className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 outline-none"
              >
                <option value="LAB_FT">🛡️ LAB / FT</option>
                <option value="CONFORMITE_REGLEMENTAIRE">⚖️ Conformité Réglementaire</option>
                <option value="AUDIT_CONTROLE">🔍 Audit & Contrôle</option>
                <option value="GENERAL">📌 Général / Pense-bête</option>
              </select>
            </div>

            {/* Portée */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Visibilité / Portée
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setScope("COLLABORATIVE")}
                  className={cn(
                    "py-1.5 px-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1",
                    scope === "COLLABORATIVE"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <Users className="h-3 w-3" />
                  Équipe
                </button>
                <button
                  type="button"
                  onClick={() => setScope("PRIVATE")}
                  className={cn(
                    "py-1.5 px-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1",
                    scope === "PRIVATE"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <User className="h-3 w-3" />
                  Privé
                </button>
              </div>
            </div>

            {/* Priorité */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Priorité
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as MemoPriority)}
                className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 outline-none"
              >
                <option value="URGENT">🚨 Urgent / Bloquant</option>
                <option value="ATTENTION">⚡ Point d'attention</option>
                <option value="INFO">🟢 Information</option>
              </select>
            </div>
          </div>

          {/* Section Associée */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3 w-3 text-indigo-500" />
              Section Applicative Associée
            </label>
            <select
              value={associatedSectionHref}
              onChange={(e) => handleSectionChange(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 outline-none"
            >
              {APP_SECTIONS.map((sec) => (
                <option key={sec.href} value={sec.href}>
                  [{sec.group}] — {sec.label}
                </option>
              ))}
            </select>
          </div>

          {/* Contenu avec Barre d'Action IA */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Contenu de la note <span className="text-rose-500">*</span>
              </label>

              {/* Barre de boutons IA */}
              <div className="flex items-center gap-1 bg-amber-500/10 dark:bg-amber-500/5 p-1 rounded-xl border border-amber-300/40 dark:border-amber-700/40">
                <span className="text-[9px] font-black uppercase text-amber-700 dark:text-amber-400 px-1.5 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Reformuler :
                </span>
                <button
                  type="button"
                  disabled={isReformulating || !content.trim()}
                  onClick={() => handleReformulate("FORMAL")}
                  className="px-2 py-1 text-[9px] font-bold rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-amber-500 hover:text-white transition-all shadow-sm disabled:opacity-50"
                  title="Ton professionnel et soigné pour note de direction"
                >
                  {isReformulating && aiStyle === "FORMAL" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Formel"
                  )}
                </button>
                <button
                  type="button"
                  disabled={isReformulating || !content.trim()}
                  onClick={() => handleReformulate("SYNTHETIC")}
                  className="px-2 py-1 text-[9px] font-bold rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-amber-500 hover:text-white transition-all shadow-sm disabled:opacity-50"
                  title="Synthèse en bullet points orientée action"
                >
                  {isReformulating && aiStyle === "SYNTHETIC" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Synthétique"
                  )}
                </button>
                <button
                  type="button"
                  disabled={isReformulating || !content.trim()}
                  onClick={() => handleReformulate("LEGAL")}
                  className="px-2 py-1 text-[9px] font-bold rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-amber-500 hover:text-white transition-all shadow-sm disabled:opacity-50"
                  title="Formulation juridique & réglementaire rigoureuse"
                >
                  {isReformulating && aiStyle === "LEGAL" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Réglementaire"
                  )}
                </button>
              </div>
            </div>

            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Rédigez vos observations, instructions, questions ou consignes ici..."
              rows={4}
              className="text-xs rounded-xl font-medium leading-relaxed bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              required
            />
          </div>

          {/* Aperçu de la Reformulation IA */}
          {showAiPreview && aiSuggestion && (
            <div className="p-3.5 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 dark:from-amber-950/20 dark:via-slate-900 dark:to-amber-950/10 rounded-2xl border-2 border-amber-300 dark:border-amber-700/60 shadow-md space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Suggestion de Reformulation IA ({aiStyle === "FORMAL" ? "Style Formel" : aiStyle === "SYNTHETIC" ? "Style Synthétique" : "Style Réglementaire"})
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApplyAiSuggestion}
                    className="h-7 px-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black gap-1 shadow-sm"
                  >
                    <Check className="h-3 w-3" />
                    Appliquer cette version
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAiPreview(false)}
                    className="h-7 text-[10px] text-slate-400 hover:text-slate-600"
                  >
                    Ignorer
                  </Button>
                </div>
              </div>

              {aiSuggestion.title && (
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  <span className="text-slate-400">Titre suggéré :</span> {aiSuggestion.title}
                </p>
              )}

              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-medium bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-800/50">
                {aiSuggestion.text}
              </p>
            </div>
          )}

          {/* Checklist / Tâches */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Checklist / Actions à vérifier
            </label>

            <div className="flex gap-2">
              <Input
                value={checklistInput}
                onChange={(e) => setChecklistInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                placeholder="Ajouter une action (ex: Valider justificatif identité)..."
                className="text-xs rounded-xl h-8 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddChecklistItem}
                className="h-8 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold shrink-0"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Ajouter
              </Button>
            </div>

            {checklists.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {checklists.map((chk) => (
                  <div
                    key={chk.id}
                    className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-xs"
                  >
                    <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                      • {chk.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(chk.id)}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-2">
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
              {memoToEdit ? "Enregistrer les modifications" : "Créer le Mémo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
