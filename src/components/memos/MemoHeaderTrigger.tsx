"use client";

import React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { StickyNote, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemos } from "@/contexts/MemoContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const MemoHeaderTrigger: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const fullHref = tab ? `${pathname}?tab=${tab}` : pathname;

  const { isDrawerOpen, setIsDrawerOpen, getMemosForSection, totalActiveCount } = useMemos();

  const sectionMemos = getMemosForSection(fullHref).filter(m => m.status === "ACTIVE");
  const hasSectionMemos = sectionMemos.length > 0;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className={cn(
              "group relative overflow-hidden rounded-xl border transition-all duration-300 font-extrabold text-xs h-9 px-3 gap-2 shadow-sm",
              hasSectionMemos
                ? "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-amber-500/10"
                : "border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            )}
          >
            <div className="relative flex items-center justify-center">
              <StickyNote
                className={cn(
                  "h-4 w-4 transition-transform group-hover:rotate-6",
                  hasSectionMemos ? "text-amber-500 animate-pulse" : "text-slate-400 group-hover:text-primary"
                )}
              />
              {hasSectionMemos && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}
            </div>

            <span className="font-black uppercase tracking-wider text-[10px]">
              Mémos
            </span>

            {/* Badge de comptage contextuel */}
            <div className="flex items-center gap-1">
              {hasSectionMemos ? (
                <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-black tracking-tighter">
                  {sectionMemos.length}
                </span>
              ) : totalActiveCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] font-bold">
                  {totalActiveCount}
                </span>
              ) : null}
            </div>

            {/* Mini lueur animée au survol */}
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-xs p-3">
          <p className="font-bold mb-1 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Compliance Mémos Intelligents
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {hasSectionMemos
              ? `📍 ${sectionMemos.length} mémo(s) associé(s) à cette section (${totalActiveCount} au total).`
              : `Consultez ou créez des mémos collaboratifs/privés pour cette page (${totalActiveCount} actifs).`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
