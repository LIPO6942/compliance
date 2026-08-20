"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Check,
  Pin,
  X,
  Loader2,
  Palette
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

type PostItColor = "yellow" | "purple" | "emerald" | "blue";

const POST_IT_THEMES: Record<PostItColor, {
  name: string;
  bgClass: string;
  tapeClass: string;
  borderClass: string;
  textClass: string;
  inputBgClass: string;
  accentClass: string;
}> = {
  yellow: {
    name: "Jaune Classique",
    bgClass: "bg-gradient-to-b from-[#fefce8] via-[#fef9c3] to-[#fef08a] dark:from-[#37320c] dark:via-[#2c2808] dark:to-[#1f1c05]",
    tapeClass: "bg-amber-300/40 dark:bg-amber-500/20 border-amber-300/60 shadow-inner",
    borderClass: "border-amber-300/80 dark:border-amber-600/50",
    textClass: "text-[#713f12] dark:text-[#fef08a]",
    inputBgClass: "bg-amber-50/60 dark:bg-amber-950/40 text-[#422006] dark:text-[#fef9c3] placeholder:text-amber-700/40 dark:placeholder:text-amber-300/30",
    accentClass: "bg-amber-500 text-white"
  },
  purple: {
    name: "Lavande LAB/FT",
    bgClass: "bg-gradient-to-b from-[#faf5ff] via-[#f3e8ff] to-[#e9d5ff] dark:from-[#2e1065] dark:via-[#1e0a45] dark:to-[#13042e]",
    tapeClass: "bg-purple-300/40 dark:bg-purple-500/20 border-purple-300/60 shadow-inner",
    borderClass: "border-purple-300/80 dark:border-purple-600/50",
    textClass: "text-[#581c87] dark:text-[#e9d5ff]",
    inputBgClass: "bg-purple-50/60 dark:bg-purple-950/40 text-[#3b0764] dark:text-[#f3e8ff] placeholder:text-purple-700/40 dark:placeholder:text-purple-300/30",
    accentClass: "bg-purple-600 text-white"
  },
  emerald: {
    name: "Menthe Réglementaire",
    bgClass: "bg-gradient-to-b from-[#f0fdf4] via-[#dcfce7] to-[#bbf7d0] dark:from-[#052e16] dark:via-[#032010] dark:to-[#02140a]",
    tapeClass: "bg-emerald-300/40 dark:bg-emerald-500/20 border-emerald-300/60 shadow-inner",
    borderClass: "border-emerald-300/80 dark:border-emerald-600/50",
    textClass: "text-[#065f46] dark:text-[#bbf7d0]",
    inputBgClass: "bg-emerald-50/60 dark:bg-emerald-950/40 text-[#064e3b] dark:text-[#dcfce7] placeholder:text-emerald-700/40 dark:placeholder:text-emerald-300/30",
    accentClass: "bg-emerald-600 text-white"
  },
  blue: {
    name: "Bleu Ciel Audit",
    bgClass: "bg-gradient-to-b from-[#f0f9ff] via-[#e0f2fe] to-[#bae6fd] dark:from-[#082f49] dark:via-[#041d2e] dark:to-[#021019]",
    tapeClass: "bg-sky-300/40 dark:bg-sky-500/20 border-sky-300/60 shadow-inner",
    borderClass: "border-sky-300/80 dark:border-sky-600/50",
    textClass: "text-[#075985] dark:text-[#bae6fd]",
    inputBgClass: "bg-sky-50/60 dark:bg-sky-950/40 text-[#0c4a6e] dark:text-[#e0f2fe] placeholder:text-sky-700/40 dark:placeholder:text-sky-300/30",
    accentClass: "bg-sky-600 text-white"
  }
};

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
  const [postItColor, setPostItColor] = useState<PostItColor>("yellow");
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
      setPostItColor(
        memoToEdit.pillar === "LAB_FT" ? "purple" :
        memoToEdit.pillar === "CONFORMITE_REGLEMENTAIRE" ? "emerald" :
        memoToEdit.pillar === "AUDIT_CONTROLE" ? "blue" : "yellow"
      );
    } else {
      setTitle("");
      setContent("");
      setPillar("LAB_FT");
      setScope("COLLABORATIVE");
      setPriority("ATTENTION");
      setAssociatedSectionHref(defaultSectionHref);
      setAssociatedSectionLabel(defaultSectionLabel);
      setChecklists([]);
      setPostItColor("yellow");
    }
    setShowAiPreview(false);
    setAiSuggestion(null);
  }, [memoToEdit, defaultSectionHref, defaultSectionLabel, isOpen]);

  const theme = POST_IT_THEMES[postItColor];

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
        description: "Veuillez d'abord rédiger quelques lignes de note pour que l'IA puisse les reformuler.",
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
          title: "Reformulation générée",
          description: "La proposition de style a été créée avec succès.",
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
      description: "Le texte reformulé a été inséré dans votre post-it.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Champs requis",
        description: "Veuillez renseigner un titre et le contenu de votre post-it.",
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
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-0 border-none bg-transparent shadow-none">
        {/* ═══════════════════════════════════════════════════════════════════════
             VÉRITABLE DESIGN POST-IT / STICKY NOTE AVEC BANDE ADHÉSIVE
             ═══════════════════════════════════════════════════════════════════════ */}
        <div
          className={cn(
            "relative rounded-3xl p-6 sm:p-7 shadow-2xl transition-all duration-300 border-2",
            theme.bgClass,
            theme.borderClass,
            theme.textClass
          )}
          style={{
            boxShadow:
              "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 8px 12px 24px rgba(0,0,0,0.15)",
          }}
        >
          {/* Bande de ruban adhésif / Tape translucide en haut */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-6 rounded-md backdrop-blur-md border border-white/60 dark:border-white/20 transform -rotate-1 shadow-sm flex items-center justify-center bg-white/40 dark:bg-white/10 z-20">
            <div className="h-1.5 w-1.5 rounded-full bg-rose-500/80 shadow-sm" />
          </div>

          {/* Bouton Fermer */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-20"
          >
            <X className="h-4 w-4 opacity-70" />
          </button>

          {/* En-tête du Post-it */}
          <div className="flex justify-between items-center pb-3 border-b border-black/10 dark:border-white/10 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-black uppercase tracking-tight flex items-center gap-1.5">
                <Pin className="h-4 w-4 fill-current text-rose-500 rotate-12" />
                {memoToEdit ? "Modifier le Post-it" : "Nouveau Post-it Mémo"}
              </span>
            </div>

            {/* Sélecteur de couleur du Post-it */}
            <div className="flex items-center gap-1.5 mr-6">
              <button
                type="button"
                onClick={() => setPostItColor("yellow")}
                className={cn(
                  "h-4 w-4 rounded-full bg-[#fef08a] border-2 transition-transform",
                  postItColor === "yellow" ? "border-amber-600 scale-125 shadow-sm" : "border-amber-300 opacity-60"
                )}
                title="Jaune Classique"
              />
              <button
                type="button"
                onClick={() => setPostItColor("purple")}
                className={cn(
                  "h-4 w-4 rounded-full bg-[#e9d5ff] border-2 transition-transform",
                  postItColor === "purple" ? "border-purple-600 scale-125 shadow-sm" : "border-purple-300 opacity-60"
                )}
                title="Lavande LAB/FT"
              />
              <button
                type="button"
                onClick={() => setPostItColor("emerald")}
                className={cn(
                  "h-4 w-4 rounded-full bg-[#bbf7d0] border-2 transition-transform",
                  postItColor === "emerald" ? "border-emerald-600 scale-125 shadow-sm" : "border-emerald-300 opacity-60"
                )}
                title="Menthe Réglementaire"
              />
              <button
                type="button"
                onClick={() => setPostItColor("blue")}
                className={cn(
                  "h-4 w-4 rounded-full bg-[#bae6fd] border-2 transition-transform",
                  postItColor === "blue" ? "border-sky-600 scale-125 shadow-sm" : "border-sky-300 opacity-60"
                )}
                title="Bleu Ciel Audit"
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 pt-3">
            {/* Titre Post-it */}
            <div className="space-y-1">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de la note..."
                className={cn(
                  "text-sm font-black tracking-tight rounded-xl border-none shadow-sm focus-visible:ring-1 focus-visible:ring-black/20",
                  theme.inputBgClass
                )}
                required
              />
            </div>

            {/* Badges / Sélecteurs Métier & Portée */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Volet */}
              <div>
                <select
                  value={pillar}
                  onChange={(e) => {
                    const nextPillar = e.target.value as MemoPillar;
                    setPillar(nextPillar);
                    if (nextPillar === "LAB_FT") setPostItColor("purple");
                    else if (nextPillar === "CONFORMITE_REGLEMENTAIRE") setPostItColor("emerald");
                    else if (nextPillar === "AUDIT_CONTROLE") setPostItColor("blue");
                  }}
                  className={cn(
                    "w-full text-[11px] font-bold rounded-xl p-2 border border-black/10 dark:border-white/10 outline-none shadow-sm",
                    theme.inputBgClass
                  )}
                >
                  <option value="LAB_FT">🛡️ LAB / FT</option>
                  <option value="CONFORMITE_REGLEMENTAIRE">⚖️ Réglementaire</option>
                  <option value="AUDIT_CONTROLE">🔍 Audit & Contrôle</option>
                  <option value="GENERAL">📌 Général</option>
                </select>
              </div>

              {/* Portée */}
              <div className="grid grid-cols-2 gap-1 p-0.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => setScope("COLLABORATIVE")}
                  className={cn(
                    "py-1 px-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1",
                    scope === "COLLABORATIVE"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "opacity-60 hover:opacity-100"
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
                      ? "bg-white dark:bg-slate-800 shadow-sm"
                      : "opacity-60 hover:opacity-100"
                  )}
                >
                  <User className="h-3 w-3" />
                  Privé
                </button>
              </div>

              {/* Priorité */}
              <div>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as MemoPriority)}
                  className={cn(
                    "w-full text-[11px] font-bold rounded-xl p-2 border border-black/10 dark:border-white/10 outline-none shadow-sm",
                    theme.inputBgClass
                  )}
                >
                  <option value="URGENT">🚨 Urgent</option>
                  <option value="ATTENTION">⚡ Attention</option>
                  <option value="INFO">🟢 Info</option>
                </select>
              </div>
            </div>

            {/* Section Associée */}
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 opacity-60 shrink-0" />
              <select
                value={associatedSectionHref}
                onChange={(e) => handleSectionChange(e.target.value)}
                className={cn(
                  "w-full text-[11px] font-semibold rounded-xl p-1.5 border border-black/10 dark:border-white/10 outline-none shadow-sm truncate",
                  theme.inputBgClass
                )}
              >
                {APP_SECTIONS.map((sec) => (
                  <option key={sec.href} value={sec.href}>
                    {sec.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Zone de texte du Post-it & Barre Outil IA */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center flex-wrap gap-1">
                <span className="text-[10px] font-black uppercase tracking-wider opacity-70">
                  Corps du Post-it
                </span>

                {/* Boutons Reformulation IA intégrés */}
                <div className="flex items-center gap-1 bg-black/5 dark:bg-white/10 p-0.5 rounded-lg border border-black/10 dark:border-white/10">
                  <span className="text-[9px] font-black uppercase px-1 flex items-center gap-1 opacity-80">
                    <Sparkles className="h-2.5 w-2.5 text-rose-500" /> IA :
                  </span>
                  <button
                    type="button"
                    disabled={isReformulating || !content.trim()}
                    onClick={() => handleReformulate("FORMAL")}
                    className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-white/80 dark:bg-slate-800 hover:bg-amber-500 hover:text-white transition-all shadow-xs disabled:opacity-40"
                    title="Style formel de direction"
                  >
                    {isReformulating && aiStyle === "FORMAL" ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : "Formel"}
                  </button>
                  <button
                    type="button"
                    disabled={isReformulating || !content.trim()}
                    onClick={() => handleReformulate("SYNTHETIC")}
                    className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-white/80 dark:bg-slate-800 hover:bg-amber-500 hover:text-white transition-all shadow-xs disabled:opacity-40"
                    title="Style synthétique à puces"
                  >
                    {isReformulating && aiStyle === "SYNTHETIC" ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : "Synthétique"}
                  </button>
                  <button
                    type="button"
                    disabled={isReformulating || !content.trim()}
                    onClick={() => handleReformulate("LEGAL")}
                    className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-white/80 dark:bg-slate-800 hover:bg-amber-500 hover:text-white transition-all shadow-xs disabled:opacity-40"
                    title="Style réglementaire juridique"
                  >
                    {isReformulating && aiStyle === "LEGAL" ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : "Réglementaire"}
                  </button>
                </div>
              </div>

              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Écrivez vos notes, consignes, observations de contrôle..."
                rows={4}
                className={cn(
                  "text-xs rounded-2xl font-medium leading-relaxed border-none shadow-sm focus-visible:ring-1 focus-visible:ring-black/20 resize-none",
                  theme.inputBgClass
                )}
                required
              />
            </div>

            {/* Prévisualisation Reformulation IA */}
            {showAiPreview && aiSuggestion && (
              <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-black/10 dark:border-white/10 shadow-md space-y-2 animate-in fade-in duration-200">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Proposition IA ({aiStyle})
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleApplyAiSuggestion}
                      className="h-6 px-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[9px] font-bold gap-1"
                    >
                      <Check className="h-2.5 w-2.5" /> Insérer
                    </Button>
                    <button
                      type="button"
                      onClick={() => setShowAiPreview(false)}
                      className="text-[9px] opacity-60 hover:opacity-100 p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <p className="text-[11px] whitespace-pre-line leading-relaxed font-medium">
                  {aiSuggestion.text}
                </p>
              </div>
            )}

            {/* Checklist / Actions */}
            <div className="space-y-1.5 pt-1 border-t border-black/10 dark:border-white/10">
              <div className="flex gap-1.5">
                <Input
                  value={checklistInput}
                  onChange={(e) => setChecklistInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                  placeholder="Ajouter une action à cocher..."
                  className={cn(
                    "text-[11px] rounded-xl h-7 border-none shadow-xs",
                    theme.inputBgClass
                  )}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddChecklistItem}
                  className="h-7 px-2.5 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black/20 text-[10px] font-bold shrink-0"
                >
                  <Plus className="h-3 w-3 mr-0.5" />
                  Ajouter
                </Button>
              </div>

              {checklists.length > 0 && (
                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                  {checklists.map((chk) => (
                    <div
                      key={chk.id}
                      className="flex items-center justify-between gap-1.5 px-2 py-1 bg-white/40 dark:bg-black/20 rounded-lg text-[10px]"
                    >
                      <span className="truncate font-medium">☑ {chk.text}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistItem(chk.id)}
                        className="opacity-50 hover:opacity-100 p-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pied du Post-it */}
            <div className="pt-3 border-t border-black/10 dark:border-white/10 flex justify-between items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="h-8 px-3 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="h-8 px-4 rounded-xl bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 text-xs font-black shadow-md"
              >
                {memoToEdit ? "Sauvegarder" : "Coller le Post-it 📌"}
              </Button>
            </div>
          </form>

          {/* Effet d'ombre de coin replié en bas à droite */}
          <div
            className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none rounded-br-3xl"
            style={{
              background: "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.08) 50%)",
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
