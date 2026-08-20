"use client";

import React, { useState, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  X,
  Plus,
  Search,
  StickyNote,
  Filter,
  Users,
  User,
  CheckCircle2,
  Pin,
  Sparkles,
  Layers,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMemos } from "@/contexts/MemoContext";
import { MemoCard } from "@/components/memos/MemoCard";
import { MemoEditorModal } from "@/components/memos/MemoEditorModal";
import { ComplianceMemo, MemoPillar, APP_SECTIONS } from "@/types/memo";
import { cn } from "@/lib/utils";

export const MemoDrawer: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const currentFullHref = tab ? `${pathname}?tab=${tab}` : pathname;

  const currentSection = APP_SECTIONS.find(
    (s) => s.href === currentFullHref || s.href === pathname
  );
  const currentSectionLabel = currentSection ? currentSection.label : "Cette page";

  const {
    memos,
    isDrawerOpen,
    setIsDrawerOpen,
    isEditorOpen,
    setIsEditorOpen,
    activeEditorMemo,
    setActiveEditorMemo,
    openDrawerWithNewMemo,
    collaborativeCount,
    privateCount,
  } = useMemos();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterPillar, setFilterPillar] = useState<string>("ALL");
  const [filterScope, setFilterScope] = useState<string>("ALL");
  const [filterLocation, setFilterLocation] = useState<"ALL" | "CURRENT_PAGE">("ALL");
  const [filterStatus, setFilterStatus] = useState<"ACTIVE" | "RESOLVED" | "ALL">("ACTIVE");

  const filteredMemos = useMemo(() => {
    return memos.filter((m) => {
      const matchesSearch =
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.associatedSectionLabel.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPillar = filterPillar === "ALL" || m.pillar === filterPillar;
      const matchesScope = filterScope === "ALL" || m.scope === filterScope;
      const matchesStatus = filterStatus === "ALL" || m.status === filterStatus;

      const matchesLocation =
        filterLocation === "ALL" ||
        m.associatedSectionHref === currentFullHref ||
        m.associatedSectionHref === pathname ||
        (m.associatedSectionHref.includes("risk-mapping") && pathname.includes("risk-mapping"));

      return matchesSearch && matchesPillar && matchesScope && matchesStatus && matchesLocation;
    });
  }, [memos, searchQuery, filterPillar, filterScope, filterLocation, filterStatus, currentFullHref, pathname]);

  const currentPageCount = useMemo(() => {
    return memos.filter(
      (m) =>
        m.status === "ACTIVE" &&
        (m.associatedSectionHref === currentFullHref ||
          m.associatedSectionHref === pathname ||
          (m.associatedSectionHref.includes("risk-mapping") && pathname.includes("risk-mapping")))
    ).length;
  }, [memos, currentFullHref, pathname]);

  const handleEdit = (memo: ComplianceMemo) => {
    setActiveEditorMemo(memo);
    setIsEditorOpen(true);
  };

  const handleCreateNew = () => {
    openDrawerWithNewMemo(currentFullHref, currentSectionLabel);
  };

  if (!isDrawerOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setIsDrawerOpen(false)}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity animate-in fade-in duration-300"
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-l border-slate-200/80 dark:border-slate-800/80 z-50 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right-full duration-300">
        {/* Header du Drawer */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-3 shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <StickyNote className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  Compliance Mémos
                  <Badge className="bg-amber-500 text-white text-[9px] font-black uppercase px-2 py-0.2 border-none">
                    Live
                  </Badge>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Notes & consignes contextuelles d'équipe ou personnelles
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Bouton Nouveau Mémo & Recherche */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher dans les notes..."
                className="pl-8 text-xs h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>

            <Button
              onClick={handleCreateNew}
              size="sm"
              className="h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1 shadow-md shadow-indigo-500/20 shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Nouveau Mémo
            </Button>
          </div>

          {/* Sélecteur de portée : Collaboratif (Équipe) / Privé (Individuel) / Tous */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
            <button
              onClick={() => setFilterScope("ALL")}
              className={cn(
                "py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                filterScope === "ALL"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              🌐 Tous ({memos.length})
            </button>
            <button
              onClick={() => setFilterScope("COLLABORATIVE")}
              className={cn(
                "py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                filterScope === "COLLABORATIVE"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                  : "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              Équipe ({collaborativeCount})
            </button>
            <button
              onClick={() => setFilterScope("PRIVATE")}
              className={cn(
                "py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                filterScope === "PRIVATE"
                  ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              )}
            >
              <User className="h-3.5 w-3.5" />
              Privés ({privateCount})
            </button>
          </div>

          {/* Filtres contextuels & Volet */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Filtre Emplacement */}
              <button
                onClick={() => setFilterLocation("ALL")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
                  filterLocation === "ALL"
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                )}
              >
                Toutes sections
              </button>

              <button
                onClick={() => setFilterLocation(filterLocation === "CURRENT_PAGE" ? "ALL" : "CURRENT_PAGE")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1",
                  filterLocation === "CURRENT_PAGE"
                    ? "bg-amber-500 text-white shadow-sm font-black"
                    : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60"
                )}
              >
                📍 Sur cette page ({currentPageCount})
              </button>

              {/* Filtre Volet */}
              <button
                onClick={() => setFilterPillar(filterPillar === "LAB_FT" ? "ALL" : "LAB_FT")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
                  filterPillar === "LAB_FT"
                    ? "bg-amber-600 text-white shadow-sm font-bold"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                )}
              >
                🛡️ LAB/FT
              </button>

              <button
                onClick={() =>
                  setFilterPillar(filterPillar === "CONFORMITE_REGLEMENTAIRE" ? "ALL" : "CONFORMITE_REGLEMENTAIRE")
                }
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
                  filterPillar === "CONFORMITE_REGLEMENTAIRE"
                    ? "bg-emerald-600 text-white shadow-sm font-bold"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                )}
              >
                ⚖️ Réglementaire
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
              <span>{filteredMemos.length} mémo(s) affiché(s)</span>
              <button
                onClick={() => setFilterStatus(filterStatus === "ACTIVE" ? "RESOLVED" : "ACTIVE")}
                className="hover:text-primary transition-colors font-semibold"
              >
                {filterStatus === "ACTIVE" ? "Afficher les résolus" : "Afficher les actifs"}
              </button>
            </div>
          </div>
        </div>

        {/* Liste des Mémos (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredMemos.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="h-12 w-12 rounded-3xl bg-slate-100 dark:bg-slate-900 text-slate-400 mx-auto flex items-center justify-center">
                <StickyNote className="h-6 w-6 opacity-40" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Aucun mémo correspondant
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto">
                  {filterLocation === "CURRENT_PAGE"
                    ? `Aucune note attachée à ${currentSectionLabel}. Cliquez sur "Nouveau Mémo" pour en créer une.`
                    : "Modifiez vos filtres ou créez votre première note de conformité."}
                </p>
              </div>
              <Button
                onClick={handleCreateNew}
                size="sm"
                variant="outline"
                className="rounded-xl text-xs font-bold gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Créer un mémo pour cette page
              </Button>
            </div>
          ) : (
            filteredMemos.map((memo) => (
              <MemoCard
                key={memo.id}
                memo={memo}
                onEdit={handleEdit}
                onCloseDrawer={() => setIsDrawerOpen(false)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center font-medium">
          MAE Assurance • Espace de collaboration GRC & Mémos
        </div>
      </div>
    </>
  );
};
