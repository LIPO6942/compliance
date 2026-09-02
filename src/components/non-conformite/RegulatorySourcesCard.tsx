'use client';

import React from 'react';
import { ExternalLink, Globe, Shield, BookCheck, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { REGULATORY_SOURCES_DATA } from '@/types/regulatoryWatch';

export function RegulatorySourcesCard() {
  return (
    <Card className="border border-slate-200/80 dark:border-slate-800 shadow-md rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
      <CardHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Sources Réglementaires & Règles de Gestion
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Portails institutionnels officiels et principes de non-redondance du corpus juridique
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-mono font-bold text-sky-700 dark:text-sky-300 border-sky-300">
            5 Référentiels Officiels
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REGULATORY_SOURCES_DATA.map((src, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-sky-300 dark:hover:border-sky-800 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    {src.source}
                  </span>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline"
                  >
                    <span>Accéder</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Périmètre couvert
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-snug mt-0.5">
                    {src.perimetre}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Règle de gestion
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-tight">
                  {src.regleGestion}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
