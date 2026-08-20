"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
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
  Layers,
  CheckCircle2,
  Check,
  Pin,
  X,
  Loader2,
  Clock,
  ShieldCheck,
  Zap
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
      setTitle(memoToEdit.title || "");
      setContent(memoToEdit.content || "");
      setPillar(memoToEdit.pillar || "LAB_FT");
      setScope(memoToEdit.scope || "COLLABORATIVE");
      setPriority(memoToEdit.priority || "ATTENTION");
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
          description: "La reformulation IA est prête.",
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
      title: "Post-it mis à jour !",
      description: "Le texte reformulé a été inséré dans votre mémo.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Champs requis",
        description: "Veuillez renseigner un titre et le contenu de votre mémo.",
        variant: "destructive",
      });
      return;
    }

    if (memoToEdit && memoToEdit.id) {
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
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-0 border-none bg-transparent shadow-none">
        {/* ═══════════════════════════════════════════════════════════════════════
             DESIGN POST-IT PREMIUM : PAPIER IVOIRE / AMBRE GRC
             ═══════════════════════════════════════════════════════════════════════ */}
        <div
          className="relative rounded-3xl p-6 sm:p-7 transition-all duration-300 border-2 bg-gradient-to-b from-[#FFFDF8] via-[#FEFBF0] to-[#FDF6E2] dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-950 border-amber-300/80 dark:border-amber-600/40 text-slate-800 dark:text-slate-100 shadow-2xl"
          style={{
            boxShadow:
              "0 20px 45px -10px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(251, 191, 36, 0.15) inset, 0 8px 16px rgba(0,0,0,0.06)",
          }}
        >
          {/* Ruban adhésif / Punaise supérieure */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-6 rounded-md backdrop-blur-md border border-amber-400/40 dark:border-amber-600/30 transform -rotate-1 shadow-sm flex items-center justify-center bg-amber-200/50 dark:bg-amber-500/20 z-20">
            <div className="h-2 w-2 rounded-full bg-rose-500 shadow-sm border border-rose-400" />
          </div>

          {/* Bouton Fermer */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-20 text-slate-500 dark:text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>

          {/* En-tête du Mémo Post-it */}
          <div className="flex justify-between items-center pb-3 border-b border-amber-200/60 dark:border-slate-800 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-black uppercase tracking-tight flex items-center gap-1.5 text-slate-900 dark:text-white">
                <Pin className="h-4 w-4 fill-current text-rose-500 rotate-12" />
                {memoToEdit ? "Modifier le Post-it" : "Nouveau Mémo Post-it"}
              </span>
            </div>

            <div className="mr-8">
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/60 dark:border-amber-700/60">
                📌 Note Active
              </Badge>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-3.5">
            {/* Titre Post-it */}
            <div className="space-y-1">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre ou objet du mémo..."
                className="text-sm font-black tracking-tight rounded-xl bg-white/90 dark:bg-slate-800/90 border-amber-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-xs focus-visible:ring-1 focus-visible:ring-amber-500"
                required
              />
            </div>

            {/* Badges / Sélecteurs Métier, Portée & Priorité */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Volet */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Volet Métier
                </label>
                <select
                  value={pillar}
                  onChange={(e) => setPillar(e.target.value as MemoPillar)}
                  className="w-full text-xs font-bold rounded-xl p-2 bg-white/90 dark:bg-slate-800/90 border border-amber-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none shadow-xs"
                >
                  <option value="LAB_FT">🛡️ LAB / FT</option>
                  <option value="CONFORMITE_REGLEMENTAIRE">⚖️ Réglementaire</option>
                  <option value="AUDIT_CONTROLE">🔍 Audit & Contrôle</option>
                  <option value="GENERAL">📌 Général</option>
                </select>
              </div>

              {/* Portée */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Portée / Visibilité
                </label>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-amber-200 dark:border-slate-700 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setScope("COLLABORATIVE")}
                    className={cn(
                      "py-1 px-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1",
                      scope === "COLLABORATIVE"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    <Users className="h-3 w-3" />
                    Équipe
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope("PRIVATE")}
                    className={cn(
                      "py-1 px-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1",
                      scope === "PRIVATE"
                        ? "bg-slate-800 dark:bg-slate-700 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    <User className="h-3 w-3" />
                    Privé
                  </button>
                </div>
              </div>

              {/* Priorité */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Niveau de Priorité
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as MemoPriority)}
                  className="w-full text-xs font-bold rounded-xl p-2 bg-white/90 dark:bg-slate-800/90 border border-amber-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none shadow-xs"
                >
                  <option value="URGENT">🚨 Urgent / Bloquant</option>
                  <option value="ATTENTION">⚡ Attention</option>
                  <option value="INFO">🟢 Information</option>
                </select>
              </div>
            </div>

            {/* Section Applicative Associée */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Layers className="h-3 w-3 text-indigo-500" />
                Section Applicative Associée
              </label>
              <select
                value={associatedSectionHref}
                onChange={(e) => handleSectionChange(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl p-2 bg-white/90 dark:bg-slate-800/90 border border-amber-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none shadow-xs truncate"
              >
                {APP_SECTIONS.map((sec) => (
                  <option key={sec.href} value={sec.href}>
                    [{sec.group}] — {sec.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Zone de texte & Barre d'Outils IA */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center flex-wrap gap-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Contenu du mémo <span className="text-rose-500">*</span>
                </label>

                {/* Boutons Reformulation IA */}
                <div className="flex items-center gap-1 bg-amber-500/10 dark:bg-slate-800 p-1 rounded-xl border border-amber-300/40 dark:border-slate-700">
                  <span className="text-[9px] font-black uppercase text-amber-700 dark:text-amber-400 px-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" /> IA :
                  </span>
                  <button
                    type="button"
                    disabled={isReformulating || !content.trim()}
                    onClick={() => handleReformulate("FORMAL")}
                    className="px-2 py-0.5 text-[9px] font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-amber-500 hover:text-white transition-all shadow-xs disabled:opacity-40"
                    title="Ton formel et soigné pour note de direction"
                  >
                    {isReformulating && aiStyle === "FORMAL" ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : "Formel"}
                  </button>
                  <button
                    type="button"
                    disabled={isReformulating || !content.trim()}
                    onClick={() => handleReformulate("SYNTHETIC")}
                    className="px-2 py-0.5 text-[9px] font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-amber-500 hover:text-white transition-all shadow-xs disabled:opacity-40"
                    title="Synthèse en bullet points orientée action"
                  >
                    {isReformulating && aiStyle === "SYNTHETIC" ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : "Synthétique"}
                  </button>
                  <button
                    type="button"
                    disabled={isReformulating || !content.trim()}
                    onClick={() => handleReformulate("LEGAL")}
                    className="px-2 py-0.5 text-[9px] font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-amber-500 hover:text-white transition-all shadow-xs disabled:opacity-40"
                    title="Formulation réglementaire rigoureuse"
                  >
                    {isReformulating && aiStyle === "LEGAL" ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : "Réglementaire"}
                  </button>
                </div>
              </div>

              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Rédigez vos observations, instructions, questions ou consignes ici..."
                rows={4}
                className="text-xs rounded-2xl font-medium leading-relaxed bg-white/90 dark:bg-slate-800/90 border-amber-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-xs resize-none focus-visible:ring-1 focus-visible:ring-amber-500"
                required
              />
            </div>

            {/* Prévisualisation Reformulation IA */}
            {showAiPreview && aiSuggestion && (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-500/60 shadow-md space-y-2 animate-in fade-in duration-200">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Proposition IA ({aiStyle === "FORMAL" ? "Formel" : aiStyle === "SYNTHETIC" ? "Synthétique" : "Réglementaire"})
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleApplyAiSuggestion}
                      className="h-7 px-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black gap-1"
                    >
                      <Check className="h-3 w-3" /> Insérer cette version
                    </Button>
                    <button
                      type="button"
                      onClick={() => setShowAiPreview(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {aiSuggestion.title && (
                  <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                    <span className="text-slate-400 font-normal">Titre suggéré :</span> {aiSuggestion.title}
                  </p>
                )}
                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-medium bg-amber-50/50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-amber-200/50 dark:border-slate-700">
                  {aiSuggestion.text}
                </p>
              </div>
            )}

            {/* Checklist / Actions */}
            <div className="space-y-2 pt-1 border-t border-amber-200/60 dark:border-slate-800">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
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
                  placeholder="Ajouter une action (ex: Contrôler la pièce d'identité)..."
                  className="text-xs rounded-xl h-8 bg-white/90 dark:bg-slate-800/90 border-amber-200 dark:border-slate-700"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddChecklistItem}
                  className="h-8 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-bold shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Ajouter
                </Button>
              </div>

              {checklists.length > 0 && (
                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                  {checklists.map((chk) => (
                    <div
                      key={chk.id}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-amber-200/40 dark:border-slate-700 text-xs"
                    >
                      <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                        • {chk.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistItem(chk.id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pied du Post-it */}
            <div className="pt-3 border-t border-amber-200/60 dark:border-slate-800 flex justify-between items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-9 px-4 rounded-xl text-xs font-semibold bg-white/80 dark:bg-slate-800 border-amber-200 dark:border-slate-700"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="h-9 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black shadow-md shadow-amber-500/20"
              >
                {memoToEdit ? "Enregistrer les modifications" : "Épingler le Post-it 📌"}
              </Button>
            </div>
          </form>

          {/* Effet d'ombre de coin replié en bas à droite */}
          <div
            className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none rounded-br-3xl opacity-30"
            style={{
              background: "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.15) 50%)",
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
