"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pin,
  CheckCircle2,
  Users,
  User,
  Edit2,
  Trash2,
  ExternalLink,
  Sparkles,
  Calendar,
  Layers,
  CheckSquare2,
  Square,
  Clock,
  RotateCcw
} from "lucide-react";
import { ComplianceMemo, PILLAR_CONFIG } from "@/types/memo";
import { useMemos } from "@/contexts/MemoContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MemoCardProps {
  memo: ComplianceMemo;
  onEdit: (memo: ComplianceMemo) => void;
  onCloseDrawer?: () => void;
}

export const MemoCard: React.FC<MemoCardProps> = ({ memo, onEdit, onCloseDrawer }) => {
  const router = useRouter();
  const { deleteMemo, toggleResolveMemo, togglePinMemo, toggleChecklistItem } = useMemos();

  const pillarInfo = PILLAR_CONFIG[memo.pillar] || PILLAR_CONFIG.GENERAL;
  const isResolved = memo.status === "RESOLVED";

  const dateFormatted = new Date(memo.createdAt).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeFormatted = new Date(memo.createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const handleNavigateToSection = () => {
    if (onCloseDrawer) onCloseDrawer();
    router.push(memo.associatedSectionHref);
  };

  return (
    <div
      className={cn(
        "p-4 rounded-2xl border transition-all duration-300 relative group/card flex flex-col justify-between gap-3 shadow-sm",
        isResolved
          ? "bg-slate-50/60 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/50 opacity-75"
          : memo.pinned
          ? "bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 dark:from-amber-950/20 dark:via-slate-900 dark:to-amber-950/10 border-amber-300/80 dark:border-amber-700/80 shadow-md shadow-amber-500/5"
          : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 hover:shadow-md"
      )}
    >
      {/* En-tête de la carte */}
      <div className="space-y-2">
        <div className="flex justify-between items-start gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Badge Volet */}
            <Badge
              variant="outline"
              className={cn("text-[9px] font-black uppercase px-2 py-0.5 border", pillarInfo.badgeClass)}
            >
              {pillarInfo.icon} {pillarInfo.short}
            </Badge>

            {/* Badge Portée */}
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 border-none",
                memo.scope === "COLLABORATIVE"
                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              )}
            >
              {memo.scope === "COLLABORATIVE" ? (
                <span className="flex items-center gap-1">
                  <Users className="h-2.5 w-2.5" /> Équipe
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <User className="h-2.5 w-2.5" /> Privé
                </span>
              )}
            </Badge>

            {/* Badge Priorité */}
            {memo.priority === "URGENT" && (
              <Badge className="bg-rose-500 text-white text-[8px] font-black uppercase px-1.5 py-0.2 animate-pulse border-none">
                🚨 Urgent
              </Badge>
            )}
            {memo.priority === "ATTENTION" && (
              <Badge className="bg-amber-500 text-white text-[8px] font-bold uppercase px-1.5 py-0.2 border-none">
                ⚡ Attention
              </Badge>
            )}
          </div>

          {/* Boutons d'actions rapides (Pin, Résoudre, Menu) */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => togglePinMemo(memo.id)}
              title={memo.pinned ? "Détacher de l'écran" : "Épingler en mémo flottant"}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                memo.pinned
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Pin className={cn("h-3.5 w-3.5", memo.pinned && "fill-current")} />
            </button>

            <button
              onClick={() => toggleResolveMemo(memo.id)}
              title={isResolved ? "Réouvrir le mémo" : "Marquer comme traité / résolu"}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                isResolved
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              )}
            >
              {isResolved ? <RotateCcw className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Titre */}
        <h4
          className={cn(
            "text-xs font-black tracking-tight leading-snug",
            isResolved
              ? "line-through text-slate-400 dark:text-slate-500"
              : "text-slate-900 dark:text-white"
          )}
        >
          {memo.title}
        </h4>

        {/* Section Associée (Lien d'ancrage cliquable) */}
        <button
          onClick={handleNavigateToSection}
          className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-2 py-0.5 rounded-md border border-indigo-100/60 dark:border-indigo-900/50 transition-colors"
          title={`Aller à la section : ${memo.associatedSectionLabel}`}
        >
          <Layers className="h-3 w-3" />
          <span>{memo.associatedSectionLabel}</span>
          <ExternalLink className="h-2.5 w-2.5 opacity-60 ml-0.5" />
        </button>

        {/* Contenu */}
        <p
          className={cn(
            "text-[11px] leading-relaxed whitespace-pre-line font-medium",
            isResolved
              ? "text-slate-400 dark:text-slate-500 italic"
              : "text-slate-700 dark:text-slate-300"
          )}
        >
          {memo.content}
        </p>

        {/* Checklist */}
        {memo.checklists && memo.checklists.length > 0 && (
          <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
            {memo.checklists.map((chk) => (
              <div
                key={chk.id}
                onClick={() => toggleChecklistItem(memo.id, chk.id)}
                className="flex items-start gap-2 text-[10px] font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <button
                  type="button"
                  className={cn(
                    "mt-0.5 h-3.5 w-3.5 rounded border flex items-center justify-center transition-all shrink-0",
                    chk.completed
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  )}
                >
                  {chk.completed && <CheckSquare2 className="h-2.5 w-2.5" />}
                </button>
                <span className={cn(chk.completed && "line-through opacity-50")}>
                  {chk.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pied de carte : Auteur, Date/Heure et Actions Modifier/Supprimer */}
      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[9px] text-slate-400">
        <div className="space-y-0.5">
          <div className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
            <span>👤 {memo.authorName}</span>
          </div>
          <div className="font-mono text-[8.5px] text-slate-400">
            {dateFormatted} à {timeFormatted}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(memo)}
            className="h-6 px-1.5 text-[10px] text-slate-500 hover:text-primary gap-1"
          >
            <Edit2 className="h-3 w-3" />
            Modifier
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.confirm(`Supprimer le mémo "${memo.title}" ?`)) {
                deleteMemo(memo.id);
              }
            }}
            className="h-6 px-1.5 text-[10px] text-slate-400 hover:text-rose-600"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};
