"use client";

import React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { StickyNote, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemos } from "@/contexts/MemoContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { APP_SECTIONS } from "@/types/memo";

export const MemoHeaderTrigger: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const fullHref = tab ? `${pathname}?tab=${tab}` : pathname;

  const currentSection = APP_SECTIONS.find(
    (s) => s.href === fullHref || s.href === pathname
  );
  const currentSectionLabel = currentSection ? currentSection.label : "Cette page";

  const {
    isDrawerOpen,
    setIsDrawerOpen,
    getMemosForSection,
    totalActiveCount,
    openDrawerWithNewMemo,
  } = useMemos();

  const sectionMemos = getMemosForSection(fullHref).filter((m) => m.status === "ACTIVE");
  const hasSectionMemos = sectionMemos.length > 0;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center bg-white/90 dark:bg-slate-900/90 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        {/* Bouton principal pour ouvrir la liste des mémos */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className={cn(
                "h-8 px-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
                hasSectionMemos
                  ? "text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <div className="relative flex items-center justify-center">
                <StickyNote
                  className={cn(
                    "h-3.5 w-3.5 transition-transform hover:rotate-6",
                    hasSectionMemos ? "text-amber-500 animate-pulse" : "text-slate-500"
                  )}
                />
                {hasSectionMemos && (
                  <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                  </span>
                )}
              </div>

              <span className="text-[10px] font-black">Mémos</span>

              {/* Badges de comptage */}
              {hasSectionMemos ? (
                <span className="px-1.5 py-0.2 rounded-md bg-amber-500 text-white text-[9px] font-black">
                  {sectionMemos.length}
                </span>
              ) : totalActiveCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-bold">
                  {totalActiveCount}
                </span>
              ) : null}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-xs p-3">
            <p className="font-bold mb-1 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Compliance Mémos
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {hasSectionMemos
                ? `📍 ${sectionMemos.length} mémo(s) sur ${currentSectionLabel} (${totalActiveCount} au total).`
                : `Ouvrir le panneau des mémos de conformité (${totalActiveCount} actifs).`}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Séparateur */}
        <div className="h-4 w-[1px] bg-slate-200 dark:border-slate-800 dark:bg-slate-800 mx-0.5" />

        {/* Bouton '+' pour ajout rapide immédiat d'un Post-it */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDrawerWithNewMemo(fullHref, currentSectionLabel)}
              className="h-8 w-8 p-0 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 dark:hover:text-white transition-all font-black shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs p-2">
            <p className="font-bold text-[11px] flex items-center gap-1">
              <span>➕ Nouveau Mémo Post-it</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Créer rapidement une note pour <b>{currentSectionLabel}</b>
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
