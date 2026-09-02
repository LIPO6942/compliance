'use client';

import React from 'react';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  TrendingUp,
  Activity,
  Layers,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { RegulatoryWatchItem } from '@/types/regulatoryWatch';
import { cn } from '@/lib/utils';

interface RegulatoryRegisterStatsProps {
  items: RegulatoryWatchItem[];
  onSelectStatusFilter?: (status: string) => void;
}

export function RegulatoryRegisterStats({ items, onSelectStatusFilter }: RegulatoryRegisterStatsProps) {
  const total = items.length;
  const applicables = items.filter((i) => i.applicabilite !== 'Non').length;
  const conformes = items.filter((i) => i.etatConformite === 'Conforme').length;
  const enCours = items.filter((i) => i.etatConformite === 'En cours de mise en conformité').length;
  const partiellement = items.filter((i) => i.etatConformite === 'Partiellement conforme').length;
  const nonConformes = items.filter((i) => i.etatConformite === 'Non conforme').length;
  const aDeterminer = items.filter((i) => i.etatConformite === 'À déterminer').length;
  const nonApplicables = items.filter((i) => i.etatConformite === 'Non applicable').length;
  const actionsEnRetard = items.filter((i) => i.statutAction === 'En retard').length;

  const conformiteRate = total > 0 ? Math.round((conformes / (total - nonApplicables || 1)) * 100) : 0;

  const kpis = [
    {
      label: 'Références recensées',
      value: total,
      sub: `${applicables} textes applicables MAE`,
      icon: FileText,
      gradient: 'from-slate-700 to-slate-900',
      bg: 'bg-slate-50 dark:bg-slate-900/50',
      text: 'text-slate-900 dark:text-slate-100',
      border: 'border-slate-200 dark:border-slate-800',
      filterKey: 'all',
    },
    {
      label: 'Conformes 🟢',
      value: conformes,
      sub: `${total > 0 ? ((conformes / total) * 100).toFixed(0) : 0}% du registre total`,
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-teal-600',
      bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-900',
      filterKey: 'Conforme',
    },
    {
      label: 'En cours de mise en conformité 🔵',
      value: enCours,
      sub: 'Plans d\'actions actifs',
      icon: Activity,
      gradient: 'from-blue-500 to-indigo-600',
      bg: 'bg-blue-50/70 dark:bg-blue-950/30',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-900',
      filterKey: 'En cours de mise en conformité',
    },
    {
      label: 'Partiellement conformes 🟠',
      value: partiellement,
      sub: 'Mise à niveau requise',
      icon: AlertTriangle,
      gradient: 'from-amber-500 to-orange-600',
      bg: 'bg-amber-50/70 dark:bg-amber-950/30',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-900',
      filterKey: 'Partiellement conforme',
    },
    {
      label: 'Non conformes 🔴',
      value: nonConformes,
      sub: 'Écarts prioritaires',
      icon: AlertCircle,
      gradient: 'from-rose-500 to-red-600',
      bg: 'bg-rose-50/70 dark:bg-rose-950/30',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-900',
      filterKey: 'Non conforme',
    },
    {
      label: 'Actions en retard ⚠️',
      value: actionsEnRetard,
      sub: 'Échéances dépassées',
      icon: Clock,
      gradient: 'from-purple-600 to-indigo-700',
      bg: 'bg-purple-50/70 dark:bg-purple-950/30',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-900',
      filterKey: 'all',
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── KPI Cards Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.label}
              onClick={() => onSelectStatusFilter && onSelectStatusFilter(kpi.filterKey)}
              className={cn(
                'border shadow-sm rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer',
                kpi.border,
                kpi.bg
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={cn('h-8 w-8 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md', kpi.gradient)}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className={cn('text-2xl font-black', kpi.text)}>{kpi.value}</span>
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight truncate">
                  {kpi.label}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5 truncate">
                  {kpi.sub}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Progress Bar Breakdown ─────────────────────────────────────────── */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">Répartition des 37 Références Réglementaires</span>
            <span className="text-[11px] text-slate-400 font-mono">
              (Conformes: {conformes} · En cours: {enCours} · À déterminer: {aDeterminer} · Non applicable: {nonApplicables})
            </span>
          </div>
          <span className="font-black text-indigo-600 dark:text-indigo-400">
            Taux de conformité : {conformiteRate}%
          </span>
        </div>

        {/* Visual Multi-segment Progress Bar */}
        <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden p-0.5 gap-0.5">
          {conformes > 0 && (
            <div
              style={{ width: `${(conformes / total) * 100}%` }}
              className="h-full bg-emerald-500 rounded-full transition-all"
              title={`Conformes: ${conformes}`}
            />
          )}
          {enCours > 0 && (
            <div
              style={{ width: `${(enCours / total) * 100}%` }}
              className="h-full bg-blue-500 rounded-full transition-all"
              title={`En cours: ${enCours}`}
            />
          )}
          {partiellement > 0 && (
            <div
              style={{ width: `${(partiellement / total) * 100}%` }}
              className="h-full bg-amber-500 rounded-full transition-all"
              title={`Partiellement: ${partiellement}`}
            />
          )}
          {nonConformes > 0 && (
            <div
              style={{ width: `${(nonConformes / total) * 100}%` }}
              className="h-full bg-rose-500 rounded-full transition-all"
              title={`Non conformes: ${nonConformes}`}
            />
          )}
          {aDeterminer > 0 && (
            <div
              style={{ width: `${(aDeterminer / total) * 100}%` }}
              className="h-full bg-purple-400 rounded-full transition-all"
              title={`À déterminer: ${aDeterminer}`}
            />
          )}
          {nonApplicables > 0 && (
            <div
              style={{ width: `${(nonApplicables / total) * 100}%` }}
              className="h-full bg-slate-300 dark:bg-slate-700 rounded-full transition-all"
              title={`Non applicables: ${nonApplicables}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
