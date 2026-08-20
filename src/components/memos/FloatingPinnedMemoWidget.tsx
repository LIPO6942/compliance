"use client";

import React, { useState } from "react";
import { Pin, X, ChevronUp, ChevronDown, CheckSquare2, Layers, ExternalLink } from "lucide-react";
import { useMemos } from "@/contexts/MemoContext";
import { PILLAR_CONFIG } from "@/types/memo";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export const FloatingPinnedMemoWidget: React.FC = () => {
  const router = useRouter();
  const { pinnedMemos, togglePinMemo, toggleChecklistItem } = useMemos();
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeMemoIndex, setActiveMemoIndex] = useState(0);

  if (pinnedMemos.length === 0) return null;

  const currentMemo = pinnedMemos[Math.min(activeMemoIndex, pinnedMemos.length - 1)];
  const pillarInfo = PILLAR_CONFIG[currentMemo.pillar] || PILLAR_CONFIG.GENERAL;

  return (
    <div className="fixed bottom-5 right-5 z-40 max-w-sm w-full transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-2 border-amber-300/80 dark:border-amber-700/80 rounded-2xl shadow-2xl overflow-hidden shadow-amber-500/10">
        {/* Header Widget */}
        <div className="p-3 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-b border-amber-200/50 dark:border-amber-800/50 flex justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="p-1 rounded-md bg-amber-500 text-white shrink-0">
              <Pin className="h-3 w-3 fill-current" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 truncate">
              Mémo Épinglé ({pinnedMemos.length})
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Pagination si plusieurs mémos épinglés */}
            {pinnedMemos.length > 1 && (
              <div className="flex items-center gap-0.5 mr-1 bg-white/80 dark:bg-slate-800/80 px-1.5 py-0.5 rounded-md text-[9px] font-bold">
                <button
                  onClick={() => setActiveMemoIndex((prev) => (prev > 0 ? prev - 1 : pinnedMemos.length - 1))}
                  className="hover:text-primary px-0.5"
                >
                  ◀
                </button>
                <span>{activeMemoIndex + 1}/{pinnedMemos.length}</span>
                <button
                  onClick={() => setActiveMemoIndex((prev) => (prev < pinnedMemos.length - 1 ? prev + 1 : 0))}
                  className="hover:text-primary px-0.5"
                >
                  ▶
                </button>
              </div>
            )}

            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
              title={isMinimized ? "Agrandir" : "Réduire"}
            >
              {isMinimized ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            <button
              onClick={() => togglePinMemo(currentMemo.id)}
              className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
              title="Détacher le mémo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Corps du Widget (si non réduit) */}
        {!isMinimized && (
          <div className="p-3.5 space-y-2.5 max-h-64 overflow-y-auto">
            <div className="flex justify-between items-start gap-2">
              <Badge variant="outline" className={cn("text-[8.5px] font-black uppercase px-1.5 py-0.2 border", pillarInfo.badgeClass)}>
                {pillarInfo.icon} {pillarInfo.short}
              </Badge>

              <button
                onClick={() => router.push(currentMemo.associatedSectionHref)}
                className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 truncate max-w-[150px]"
                title={`Aller à : ${currentMemo.associatedSectionLabel}`}
              >
                <Layers className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{currentMemo.associatedSectionLabel}</span>
              </button>
            </div>

            <h5 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
              {currentMemo.title}
            </h5>

            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-line bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
              {currentMemo.content}
            </p>

            {/* Checklist interactive */}
            {currentMemo.checklists && currentMemo.checklists.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                {currentMemo.checklists.map((chk) => (
                  <div
                    key={chk.id}
                    onClick={() => toggleChecklistItem(currentMemo.id, chk.id)}
                    className="flex items-start gap-1.5 text-[10px] font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <button
                      type="button"
                      className={cn(
                        "mt-0.5 h-3 w-3 rounded border flex items-center justify-center transition-all shrink-0",
                        chk.completed
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      )}
                    >
                      {chk.completed && <CheckSquare2 className="h-2 w-2" />}
                    </button>
                    <span className={cn(chk.completed && "line-through opacity-50 truncate")}>
                      {chk.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
