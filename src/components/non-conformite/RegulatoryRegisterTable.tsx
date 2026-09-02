'use client';

import React, { useState, useMemo } from 'react';
import {
  RegulatoryWatchItem,
  ComplianceState,
} from '@/types/regulatoryWatch';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Calendar,
  Building2,
  ShieldAlert,
  ArrowUpDown,
  Tag,
  Eye,
  Check,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface RegulatoryRegisterTableProps {
  items: RegulatoryWatchItem[];
  onEdit: (item: RegulatoryWatchItem) => void;
  onDelete: (id: number) => void;
  onQuickStatusChange: (id: number, newStatus: ComplianceState) => void;
}

export function RegulatoryRegisterTable({
  items,
  onEdit,
  onDelete,
  onQuickStatusChange,
}: RegulatoryRegisterTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedAuthority, setSelectedAuthority] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({ 1: true, 7: true, 8: true });

  // Unique dropdown options
  const domains = useMemo(() => {
    const list = Array.from(new Set(items.map((i) => i.domaine).filter(Boolean)));
    return list.sort();
  }, [items]);

  const types = useMemo(() => {
    const list = Array.from(new Set(items.map((i) => i.typeTexte).filter(Boolean)));
    return list.sort();
  }, [items]);

  const authorities = useMemo(() => {
    const list = Array.from(new Set(items.map((i) => i.autorite).filter(Boolean)));
    return list.sort();
  }, [items]);

  // Filter & Sort
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          item.referenceTexte.toLowerCase().includes(q) ||
          item.objet.toLowerCase().includes(q) ||
          item.domaine.toLowerCase().includes(q) ||
          item.sousDomaine.toLowerCase().includes(q) ||
          item.autorite.toLowerCase().includes(q) ||
          item.articlesCles.toLowerCase().includes(q) ||
          item.obligation.toLowerCase().includes(q) ||
          item.processus.toLowerCase().includes(q) ||
          (item.actionCorrective && item.actionCorrective.toLowerCase().includes(q)) ||
          item.id.toString() === q;

        const matchesDomain = selectedDomain === 'all' || item.domaine === selectedDomain;
        const matchesType = selectedType === 'all' || item.typeTexte === selectedType;
        const matchesStatus = selectedStatus === 'all' || item.etatConformite === selectedStatus;
        const matchesAuthority = selectedAuthority === 'all' || item.autorite === selectedAuthority;

        return matchesQuery && matchesDomain && matchesType && matchesStatus && matchesAuthority;
      })
      .sort((a, b) => {
        if (sortOrder === 'asc') {
          return a.id - b.id;
        }
        return b.id - a.id;
      });
  }, [items, searchQuery, selectedDomain, selectedType, selectedStatus, selectedAuthority, sortOrder]);

  const toggleRow = (id: number) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAllRows = () => {
    const allOpen = filteredItems.every((item) => expandedRows[item.id]);
    const next: Record<number, boolean> = {};
    filteredItems.forEach((item) => {
      next[item.id] = !allOpen;
    });
    setExpandedRows(next);
  };

  const getStatusBadge = (status: ComplianceState) => {
    switch (status) {
      case 'Conforme':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
          dot: 'bg-emerald-500',
          label: 'Conforme',
          icon: '🟢',
        };
      case 'En cours de mise en conformité':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
          dot: 'bg-blue-500',
          label: 'En cours',
          icon: '🔵',
        };
      case 'Partiellement conforme':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
          dot: 'bg-amber-500',
          label: 'Partiellement conforme',
          icon: '🟠',
        };
      case 'Non conforme':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
          dot: 'bg-rose-500',
          label: 'Non conforme',
          icon: '🔴',
        };
      case 'Non applicable':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
          dot: 'bg-slate-400',
          label: 'Non applicable',
          icon: '⚪',
        };
      default:
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
          dot: 'bg-purple-500',
          label: 'À déterminer',
          icon: '🟣',
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Filter Toolbar ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par mot-clé, article, référence, autorité, processus, obligation..."
              className="pl-9 h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick toggle chronological sort & expand */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-between md:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="h-10 text-xs rounded-xl font-bold gap-1.5 border-slate-200 dark:border-slate-800"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{sortOrder === 'asc' ? 'N° Croissant (1 → 37)' : 'N° Décroissant (37 → 1)'}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAllRows}
              className="h-10 text-xs rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              {filteredItems.every((item) => expandedRows[item.id]) ? 'Replier tout' : 'Déplier tout'}
            </Button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          {/* Domaine */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">
              Domaine
            </label>
            <Select value={selectedDomain} onValueChange={setSelectedDomain}>
              <SelectTrigger className="h-8 text-xs rounded-lg bg-slate-50/50 dark:bg-slate-950/40">
                <SelectValue placeholder="Tous les domaines" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Tous les domaines ({items.length})</SelectItem>
                {domains.map((dom) => (
                  <SelectItem key={dom} value={dom} className="text-xs truncate">
                    {dom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type de texte */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">
              Type de texte
            </label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-8 text-xs rounded-lg bg-slate-50/50 dark:bg-slate-950/40">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Tous les types ({items.length})</SelectItem>
                {types.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* État de conformité */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">
              État de conformité
            </label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-8 text-xs rounded-lg bg-slate-50/50 dark:bg-slate-950/40">
                <SelectValue placeholder="Tous les états" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Tous les états</SelectItem>
                <SelectItem value="Conforme" className="text-xs font-bold text-emerald-600">🟢 Conforme</SelectItem>
                <SelectItem value="En cours de mise en conformité" className="text-xs font-bold text-blue-600">🔵 En cours</SelectItem>
                <SelectItem value="Partiellement conforme" className="text-xs font-bold text-amber-600">🟠 Partiellement</SelectItem>
                <SelectItem value="Non conforme" className="text-xs font-bold text-rose-600">🔴 Non conforme</SelectItem>
                <SelectItem value="Non applicable" className="text-xs font-bold text-slate-500">⚪ Non applicable</SelectItem>
                <SelectItem value="À déterminer" className="text-xs font-bold text-purple-600">🟣 À déterminer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Autorité émettrice */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">
              Autorité émettrice
            </label>
            <Select value={selectedAuthority} onValueChange={setSelectedAuthority}>
              <SelectTrigger className="h-8 text-xs rounded-lg bg-slate-50/50 dark:bg-slate-950/40">
                <SelectValue placeholder="Toutes les autorités" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Toutes les autorités</SelectItem>
                {authorities.map((auth) => (
                  <SelectItem key={auth} value={auth} className="text-xs">
                    {auth}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick filter pills & count */}
        <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {filteredItems.length} texte{filteredItems.length > 1 ? 's' : ''} affiché{filteredItems.length > 1 ? 's' : ''}
            </span>
            {(selectedDomain !== 'all' || selectedType !== 'all' || selectedStatus !== 'all' || selectedAuthority !== 'all' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedDomain('all');
                  setSelectedType('all');
                  setSelectedStatus('all');
                  setSelectedAuthority('all');
                  setSearchQuery('');
                }}
                className="h-6 px-2 text-[10px] text-rose-600 font-bold hover:bg-rose-50 rounded"
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Table ─────────────────────────────────────────────────────── */}
      <Card className="border border-slate-200/80 dark:border-slate-800 shadow-md rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                <th className="py-3.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 w-12 text-center">N°</th>
                <th className="py-3.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 w-28">Domaine</th>
                <th className="py-3.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 w-24">Type</th>
                <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-500 min-w-[280px]">Référence & Intitulé du Texte</th>
                <th className="py-3.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 w-24">Date</th>
                <th className="py-3.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 min-w-[150px]">Processus / Activité</th>
                <th className="py-3.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 min-w-[140px]">État de conformité</th>
                <th className="py-3.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-sm text-slate-600 dark:text-slate-400">Aucun texte réglementaire trouvé</p>
                    <p className="text-xs text-slate-400 mt-1">Modifiez vos critères de recherche ou de filtrage.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const isExpanded = !!expandedRows[item.id];
                  const statusCfg = getStatusBadge(item.etatConformite);

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        className={cn(
                          'group transition-colors duration-150 cursor-pointer',
                          index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-900/40',
                          isExpanded ? 'bg-indigo-50/20 dark:bg-indigo-950/15' : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                        )}
                        onClick={() => toggleRow(item.id)}
                      >
                        {/* N° */}
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center justify-center h-7 w-8 rounded-lg bg-slate-900 text-white font-black text-xs shadow-sm">
                            {item.id}
                          </span>
                        </td>

                        {/* Domaine */}
                        <td className="py-3 px-3">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-900/80 bg-indigo-50/50 dark:bg-indigo-950/40 truncate max-w-[130px]"
                            title={item.domaine}
                          >
                            {item.domaine}
                          </Badge>
                          {item.sousDomaine && (
                            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5" title={item.sousDomaine}>
                              {item.sousDomaine}
                            </p>
                          )}
                        </td>

                        {/* Type */}
                        <td className="py-3 px-3">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {item.typeTexte}
                          </span>
                        </td>

                        {/* Référence du texte & Intitulé */}
                        <td className="py-3 px-4">
                          <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                            {item.referenceTexte}
                          </p>
                          {item.objet && item.objet !== item.referenceTexte && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {item.objet}
                            </p>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-3">
                          <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-400">
                            {item.dateTexte || '—'}
                          </span>
                        </td>

                        {/* Processus */}
                        <td className="py-3 px-3">
                          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                            {item.processus || 'Transversal'}
                          </span>
                        </td>

                        {/* État de conformité */}
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className={cn(
                                'text-[11px] font-bold border px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all shadow-sm',
                                statusCfg.bg
                              )}>
                                <span className={cn('h-2 w-2 rounded-full', statusCfg.dot)} />
                                <span className="truncate max-w-[110px]">{statusCfg.label}</span>
                                <ChevronDown className="h-3 w-3 opacity-60" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 text-xs">
                              <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400">
                                Changer l'état de conformité
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => onQuickStatusChange(item.id, 'Conforme')} className="gap-2 text-emerald-600 font-bold">
                                🟢 Conforme
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onQuickStatusChange(item.id, 'En cours de mise en conformité')} className="gap-2 text-blue-600 font-bold">
                                🔵 En cours de mise en conformité
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onQuickStatusChange(item.id, 'Partiellement conforme')} className="gap-2 text-amber-600 font-bold">
                                🟠 Partiellement conforme
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onQuickStatusChange(item.id, 'Non conforme')} className="gap-2 text-rose-600 font-bold">
                                🔴 Non conforme
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onQuickStatusChange(item.id, 'Non applicable')} className="gap-2 text-slate-500 font-bold">
                                ⚪ Non applicable
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onQuickStatusChange(item.id, 'À déterminer')} className="gap-2 text-purple-600 font-bold">
                                🟣 À déterminer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit(item)}
                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                              title="Modifier les détails"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(item.id)}
                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                              title="Supprimer ce texte"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleRow(item.id)}
                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details Card */}
                      {isExpanded && (
                        <tr className={cn(index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-900/40')}>
                          <td colSpan={8} className="px-4 pb-4 pt-1">
                            <div className="p-4 rounded-xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-inner text-xs">
                              {/* 3 Sections in Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Section A : Dispositions & Référence */}
                                <div className="space-y-2.5 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80">
                                  <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" />
                                    1. Dispositions & Cadre Juridique
                                  </h4>

                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 block">Autorité émettrice :</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.autorite || '—'}</span>
                                  </div>

                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 block">Articles / Dispositions clés :</span>
                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed mt-0.5">
                                      {item.articlesCles || '—'}
                                    </p>
                                  </div>

                                  {item.observations && (
                                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">Observations :</span>
                                      <p className="text-slate-600 dark:text-slate-400 italic text-[11px] leading-snug mt-0.5">
                                        {item.observations}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Section B : Contrôles & Preuves */}
                                <div className="space-y-2.5 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80">
                                  <h4 className="text-[10px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    2. Modalités de Contrôle & Preuves
                                  </h4>

                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 block">Obligation / Exigence à contrôler :</span>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200 leading-snug mt-0.5">
                                      {item.obligation || item.controleConformite || '—'}
                                    </p>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="text-[10px] font-bold text-slate-400 block">Responsable :</span>
                                      <span className="text-slate-700 dark:text-slate-300 font-medium">{item.responsable || '—'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-bold text-slate-400 block">Fréquence :</span>
                                      <span className="text-slate-700 dark:text-slate-300 font-medium">{item.frequence || '—'}</span>
                                    </div>
                                  </div>

                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 block">Preuve / Justificatif attendu :</span>
                                    <p className="text-slate-700 dark:text-slate-300 leading-snug mt-0.5">
                                      {item.preuve || '—'}
                                    </p>
                                  </div>
                                </div>

                                {/* Section C : Plan d'Action & Remédiation */}
                                <div className="space-y-2.5 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80">
                                  <h4 className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                                    <ShieldAlert className="h-3.5 w-3.5" />
                                    3. Plan d'Action & Remédiation
                                  </h4>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="text-[10px] font-bold text-slate-400 block">Applicabilité :</span>
                                      <span className="font-bold text-slate-800 dark:text-slate-200">{item.applicabilite || 'Oui'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-bold text-slate-400 block">Statut Action :</span>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          'text-[10px] font-bold',
                                          item.statutAction === 'En cours'
                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                            : item.statutAction === 'Réalisée'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : item.statutAction === 'En retard'
                                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                                            : 'bg-slate-100 text-slate-700 border-slate-200'
                                        )}
                                      >
                                        {item.statutAction || 'Non démarrée'}
                                      </Badge>
                                    </div>
                                  </div>

                                  {item.actionCorrective ? (
                                    <div>
                                      <span className="text-[10px] font-bold text-slate-400 block">Action corrective :</span>
                                      <p className="text-slate-800 dark:text-slate-200 font-semibold leading-snug mt-0.5">
                                        {item.actionCorrective}
                                      </p>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="text-[10px] font-bold text-slate-400 block">Action corrective :</span>
                                      <span className="text-slate-400 italic text-[11px]">Aucune action requise</span>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                    <div>
                                      <span className="text-[10px] font-bold text-slate-400 block">Resp. Action :</span>
                                      <span className="text-slate-700 dark:text-slate-300 font-medium">{item.responsableAction || '—'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-bold text-slate-400 block">Échéance :</span>
                                      <span className="text-slate-700 dark:text-slate-300 font-mono font-medium">{item.echeance || '—'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Footer Edit Button */}
                              <div className="flex justify-end pt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onEdit(item)}
                                  className="h-8 text-xs font-bold gap-1.5 rounded-lg border-slate-200 dark:border-slate-700"
                                >
                                  <Edit2 className="h-3.5 w-3.5 text-indigo-600" />
                                  Modifier la fiche complète (N°{item.id})
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
