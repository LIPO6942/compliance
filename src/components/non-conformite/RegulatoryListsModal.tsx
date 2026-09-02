'use client';

import React from 'react';
import { ListFilter, CheckCircle2, ShieldAlert, Clock, SlidersHorizontal } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { REFERENCE_LISTS } from '@/types/regulatoryWatch';

interface RegulatoryListsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegulatoryListsModal({ open, onOpenChange }: RegulatoryListsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Référentiels & Listes de Valeurs
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Nomenclatures standardisées utilisées pour qualifier les exigences réglementaires et les plans d'actions.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* États de conformité */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              États de conformité
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {REFERENCE_LISTS.etatsConformite.map((item, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-xs font-semibold py-1 px-2.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                >
                  {item}
                </Badge>
              ))}
            </div>
          </div>

          {/* Applicabilité */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-indigo-500" />
              Applicabilité
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {REFERENCE_LISTS.applicabilite.map((item, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-xs font-semibold py-1 px-2.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                >
                  {item}
                </Badge>
              ))}
            </div>
          </div>

          {/* Statut action */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ListFilter className="h-3.5 w-3.5 text-amber-500" />
              Statuts des actions
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {REFERENCE_LISTS.statutAction.map((item, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-xs font-semibold py-1 px-2.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                >
                  {item}
                </Badge>
              ))}
            </div>
          </div>

          {/* Fréquence */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-sky-500" />
              Fréquences de contrôle
            </h4>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              {REFERENCE_LISTS.frequence.map((item, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-[11px] font-semibold py-0.5 px-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                >
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
