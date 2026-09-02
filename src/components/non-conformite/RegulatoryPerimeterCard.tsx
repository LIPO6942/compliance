'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  AlertCircle,
  Clock,
  ShieldAlert,
  HelpCircle,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Scale,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function RegulatoryPerimeterCard() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Card className="border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-purple-950/20 shadow-md rounded-2xl overflow-hidden">
      <CardHeader className="p-5 pb-3 border-b border-indigo-100 dark:border-indigo-900/40">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-black text-indigo-950 dark:text-indigo-100">
                  Périmètre & Méthodologie du Registre
                </CardTitle>
                <Badge className="bg-indigo-600/10 text-indigo-700 dark:text-indigo-300 border-indigo-300 text-[10px] font-bold">
                  Version 2026
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cadre méthodologique, sources de référence et principes d'analyse de conformité sectorielle
              </CardDescription>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="h-8 px-3 rounded-lg text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 font-bold text-xs gap-1.5"
          >
            <span>{isOpen ? 'Masquer' : 'Afficher les détails'}</span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="p-5 space-y-4 text-xs">
          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Objet */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold">
                <FileCheck2 className="h-4 w-4" />
                <span>Objet du Registre</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Registre de conformité réglementaire – secteur tunisien des assurances (version de travail 2026), recensant l'exhaustivité des exigences applicables à la MAE.
              </p>
            </div>

            {/* Sources principales */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold">
                <BookOpen className="h-4 w-4" />
                <span>Sources Principales</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong>CGA :</strong> Code des assurances, circulaires, règlements, décisions du Collège, lignes directrices.<br />
                <strong>FTUSA :</strong> Code, décrets, textes législatifs et réglementaires, arrêtés.
              </p>
            </div>

            {/* Méthode */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold">
                <Sparkles className="h-4 w-4" />
                <span>Méthode de Recensement</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Recensement des textes sectoriels publiés sur les portails officiels CGA/FTUSA et ajout des textes transversaux essentiels (sociétés, données, fiscalité, numérique).
              </p>
            </div>

            {/* Classement Chronologique */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold">
                <Clock className="h-4 w-4" />
                <span>Classement Chronologique</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Ordre chronologique strict du texte le plus ancien au plus récent (promulgation / adoption / publication). Les textes sans date vérifiée sont placés en fin de registre.
              </p>
            </div>

            {/* Principe Non applicable */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold">
                <HelpCircle className="h-4 w-4" />
                <span>Principe d'Exhaustivité</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Une référence peut être <em>'Non applicable'</em> pour la MAE tout en restant conservée dans le registre afin de documenter et tracer l'analyse de périmètre.
              </p>
            </div>

            {/* LBA/FT/P */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold">
                <ShieldAlert className="h-4 w-4" />
                <span>Lignes Directrices LBA/FT/P</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Les lignes directrices CGA 2025 constituent des documents d'orientation opérationnelle rattachés aux obligations légales (Loi 2015-26 & Règlement 2019-02).
              </p>
            </div>
          </div>

          {/* Alerts & Critical Focus Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* Attention JORT */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-300/60 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-snug">
                <strong>Revue transversale obligatoire :</strong> Le registre doit être complété/validé par une revue continue du JORT, de la BCT, CTAF, INPDP, ANCS/ANSI, CMF, RNE et des Lois de Finances.
              </p>
            </div>

            {/* Point de vigilance Vie / Capitalisation */}
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-300/60 dark:border-rose-700/60 text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="leading-snug">
                <strong>Point de vigilance (Assurance Vie) :</strong> Le cadre Vie/Capitalisation comprend notamment le <em>Règlement CGA n°01/2016</em> et le <em>Règlement CGA n°04/2018</em> (et non une loi autonome « loi capitalisation »).
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
