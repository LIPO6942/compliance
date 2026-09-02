'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FileSpreadsheet,
  Printer,
  PlusCircle,
  Download,
  RotateCcw,
  SlidersHorizontal,
  FileText,
  Scale,
  Globe,
  CheckCircle2,
  Building2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  RegulatoryWatchItem,
  ComplianceState,
  INITIAL_REGULATORY_WATCH_DATA,
  REGULATORY_SOURCES_DATA,
  REFERENCE_LISTS,
} from '@/types/regulatoryWatch';
import { RegulatoryRegisterTable } from './RegulatoryRegisterTable';
import { RegulatoryRegisterStats } from './RegulatoryRegisterStats';
import { RegulatoryPerimeterCard } from './RegulatoryPerimeterCard';
import { RegulatorySourcesCard } from './RegulatorySourcesCard';
import { RegulatoryListsModal } from './RegulatoryListsModal';
import { EditRegulatoryTextModal } from './EditRegulatoryTextModal';
import ExcelJS from 'exceljs';

const STORAGE_KEY = 'mae_regulatory_watch_register_v2026_src_aligned';

export function RegulatoryWatchRegister() {
  const { toast } = useToast();
  const [items, setItems] = useState<RegulatoryWatchItem[]>(INITIAL_REGULATORY_WATCH_DATA);
  const [activeSubTab, setActiveSubTab] = useState<'tableau' | 'perimetre' | 'sources'>('tableau');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RegulatoryWatchItem | null>(null);
  const [isListsModalOpen, setIsListsModalOpen] = useState(false);

  // Load from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading saved regulatory watch data', e);
    }
  }, []);

  // Save to localStorage
  const saveItems = (newItems: RegulatoryWatchItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch (e) {
      console.error('Error saving regulatory watch data', e);
    }
  };

  const handleQuickStatusChange = (id: number, newStatus: ComplianceState) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, etatConformite: newStatus } : item
    );
    saveItems(updated);
    toast({
      title: 'Statut de conformité mis à jour',
      description: `Le texte N°${id} est désormais classé en "${newStatus}".`,
    });
  };

  const handleOpenAdd = () => {
    const nextId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
    setEditingItem(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (item: RegulatoryWatchItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleDelete = (id: number) => {
    const updated = items.filter((i) => i.id !== id);
    saveItems(updated);
    toast({
      title: 'Texte supprimé',
      description: `La référence N°${id} a été retirée du registre.`,
    });
  };

  const handleSaveItem = (savedItem: RegulatoryWatchItem) => {
    let updated: RegulatoryWatchItem[];
    if (editingItem) {
      updated = items.map((i) => (i.id === savedItem.id ? savedItem : i));
      toast({
        title: 'Texte réglementaire actualisé',
        description: `La référence N°${savedItem.id} a été mise à jour avec succès.`,
      });
    } else {
      updated = [...items, savedItem];
      toast({
        title: 'Nouveau texte ajouté',
        description: `Le texte N°${savedItem.id} a été inséré dans le registre.`,
      });
    }
    saveItems(updated);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Voulez-vous réinitialiser le registre avec les 37 textes réglementaires officiels par défaut ?')) {
      saveItems(INITIAL_REGULATORY_WATCH_DATA);
      toast({
        title: 'Registre réinitialisé',
        description: 'Les 37 textes originaux ont été restaurés.',
      });
    }
  };

  // Export to professional Excel
  const handleExportExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'MAE Assurances - Compliance Navigator';
      wb.created = new Date();

      // Sheet 1: Registre complet
      const ws = wb.addWorksheet('Registre Veille Réglementaire');

      // Title Banner
      ws.mergeCells('A1:W1');
      const titleCell = ws.getCell('A1');
      titleCell.value = 'REGISTRE DE VEILLE & CONFORMITÉ RÉGLEMENTAIRE — SECTEUR TUNISIEN DES ASSURANCES 2026';
      titleCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 32;

      ws.mergeCells('A2:W2');
      const subtitleCell = ws.getCell('A2');
      subtitleCell.value = 'Organisme : MAE ASSURANCES | Sources : CGA, FTUSA, JORT, BCT, CTAF, INPDP, RNE | Version de travail 2026';
      subtitleCell.font = { size: 10, italic: true, color: { argb: 'FF475569' } };
      subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(2).height = 20;

      // Table Headers
      const headers = [
        'N°',
        'Domaine',
        'Sous-domaine',
        'Type de texte',
        'Référence du texte',
        'Date',
        'Autorité émettrice',
        'Objet / intitulé',
        'Articles / dispositions clés',
        'Processus / activité concerné',
        'Obligation / exigence à contrôler',
        'Responsable',
        'Contrôle de conformité',
        'Fréquence',
        'Preuve / justificatif attendu',
        'État de conformité',
        'Applicabilité',
        'Écart / constat',
        'Action corrective',
        'Responsable action',
        'Échéance',
        'Statut action',
        'Observations',
      ];

      const headerRow = ws.getRow(4);
      headerRow.values = headers;
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF312E81' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 28;

      // Column widths
      ws.columns = [
        { width: 6 },
        { width: 26 },
        { width: 22 },
        { width: 16 },
        { width: 45 },
        { width: 12 },
        { width: 24 },
        { width: 35 },
        { width: 38 },
        { width: 26 },
        { width: 35 },
        { width: 24 },
        { width: 32 },
        { width: 22 },
        { width: 30 },
        { width: 20 },
        { width: 14 },
        { width: 25 },
        { width: 35 },
        { width: 22 },
        { width: 14 },
        { width: 18 },
        { width: 35 },
      ];

      // Add Data Rows
      items.forEach((item, idx) => {
        const row = ws.addRow([
          item.id,
          item.domaine,
          item.sousDomaine || '',
          item.typeTexte,
          item.referenceTexte,
          item.dateTexte || '',
          item.autorite,
          item.objet || '',
          item.articlesCles || '',
          item.processus || '',
          item.obligation || '',
          item.responsable || '',
          item.controleConformite || '',
          item.frequence || '',
          item.preuve || '',
          item.etatConformite,
          item.applicabilite || 'Oui',
          item.ecartConstat || '',
          item.actionCorrective || '',
          item.responsableAction || '',
          item.echeance || '',
          item.statutAction || '',
          item.observations || '',
        ]);

        row.alignment = { vertical: 'top', wrapText: true };
        row.getCell(1).alignment = { vertical: 'top', horizontal: 'center', font: { bold: true } };
        row.getCell(6).alignment = { vertical: 'top', horizontal: 'center' };
        row.getCell(16).alignment = { vertical: 'top', horizontal: 'center', font: { bold: true } };

        // Color coding for compliance state
        const stateCell = row.getCell(16);
        if (item.etatConformite === 'Conforme') {
          stateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
          stateCell.font = { color: { argb: 'FF065F46' }, bold: true };
        } else if (item.etatConformite === 'En cours de mise en conformité') {
          stateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
          stateCell.font = { color: { argb: 'FF1E40AF' }, bold: true };
        } else if (item.etatConformite === 'Partiellement conforme') {
          stateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
          stateCell.font = { color: { argb: 'FF92400E' }, bold: true };
        } else if (item.etatConformite === 'Non conforme') {
          stateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
          stateCell.font = { color: { argb: 'FF9F1239' }, bold: true };
        }

        // Alternating row styling
        if (idx % 2 === 1 && item.etatConformite !== 'Conforme' && item.etatConformite !== 'Non conforme') {
          row.eachCell((cell, col) => {
            if (col !== 16) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            }
          });
        }
      });

      // Apply borders
      ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber >= 4) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            };
          });
        }
      });

      // Sheet 2: Sources réglementaires
      const wsSources = wb.addWorksheet('Sources & Référentiels');
      wsSources.addRow(['SOURCE', 'URL OFFICIELLE', 'PÉRIMÈTRE COUVERT', 'RÈGLE DE GESTION']);
      const srcHeader = wsSources.getRow(1);
      srcHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      srcHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
      srcHeader.height = 25;

      REGULATORY_SOURCES_DATA.forEach((s) => {
        wsSources.addRow([s.source, s.url, s.perimetre, s.regleGestion]);
      });
      wsSources.columns = [{ width: 25 }, { width: 45 }, { width: 40 }, { width: 50 }];

      // Download buffer
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Registre_Veille_Reglementaire_MAE_2026_${new Date().toISOString().split('T')[0]}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export Excel réussi',
        description: 'Le classeur du registre de veille réglementaire a été généré.',
      });
    } catch (error) {
      console.error('Error exporting Excel', error);
      toast({
        title: "Erreur lors de l'export",
        description: 'Impossible de générer le fichier Excel.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Hero Banner ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 border border-indigo-800/40 p-6 sm:p-8 shadow-xl text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-300/90 bg-indigo-500/20 px-2.5 py-0.5 rounded-full border border-indigo-400/30 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-300" />
                MAE ASSURANCES · VEILLE & CONFORMITÉ 2026
              </span>
              <span className="text-[10px] font-bold text-slate-300">
                Corpus Sectoriel & Transversal ({items.length} Textes)
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              Registre de Veille Réglementaire <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-sky-200 to-purple-200">
                & de Conformité Sectorielle
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Recensement exhaustif, classement chronologique, cartographie des obligations, suivi des contrôles et plans de remédiation conformité pour la MAE.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 w-full lg:w-auto shrink-0">
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Button
                onClick={handleExportExcel}
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/40 text-xs font-bold rounded-xl gap-1.5 backdrop-blur-sm flex-1 sm:flex-initial"
              >
                <Download className="h-3.5 w-3.5" />
                Export Excel
              </Button>
              <Button
                onClick={() => window.print()}
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/40 text-xs font-bold rounded-xl gap-1.5 backdrop-blur-sm flex-1 sm:flex-initial"
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimer
              </Button>
              <Button
                onClick={() => setIsListsModalOpen(true)}
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/40 text-xs font-bold rounded-xl gap-1.5 backdrop-blur-sm flex-1 sm:flex-initial"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Listes
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleOpenAdd}
                size="sm"
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold rounded-xl gap-2 shadow-lg shadow-indigo-500/30 flex-1"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Nouveau Texte
              </Button>

              <Button
                onClick={handleResetDefaults}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl"
                title="Restaurer les 37 textes par défaut"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Summary Dashboard ──────────────────────────────────────────── */}
      <RegulatoryRegisterStats items={items} />

      {/* ── Sub Navigation Tabs ────────────────────────────────────────────── */}
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as any)} className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <TabsList className="bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl h-auto">
            <TabsTrigger
              value="tableau"
              className="rounded-lg text-xs font-bold px-4 py-2 gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm"
            >
              <FileSpreadsheet className="h-4 w-4 text-indigo-500" />
              1. Tableau du Registre ({items.length} textes)
            </TabsTrigger>
            <TabsTrigger
              value="perimetre"
              className="rounded-lg text-xs font-bold px-4 py-2 gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm"
            >
              <Scale className="h-4 w-4 text-purple-500" />
              2. Périmètre & Méthodologie
            </TabsTrigger>
            <TabsTrigger
              value="sources"
              className="rounded-lg text-xs font-bold px-4 py-2 gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm"
            >
              <Globe className="h-4 w-4 text-sky-500" />
              3. Sources Réglementaires ({REGULATORY_SOURCES_DATA.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1 : Tableau du Registre */}
        <TabsContent value="tableau" className="space-y-6 m-0">
          <RegulatoryRegisterTable
            items={items}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
            onQuickStatusChange={handleQuickStatusChange}
          />
        </TabsContent>

        {/* Tab 2 : Périmètre & Méthodologie */}
        <TabsContent value="perimetre" className="space-y-6 m-0">
          <RegulatoryPerimeterCard />
        </TabsContent>

        {/* Tab 3 : Sources Réglementaires */}
        <TabsContent value="sources" className="space-y-6 m-0">
          <RegulatorySourcesCard />
        </TabsContent>
      </Tabs>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <EditRegulatoryTextModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        item={editingItem}
        onSave={handleSaveItem}
        nextId={items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1}
      />

      <RegulatoryListsModal
        open={isListsModalOpen}
        onOpenChange={setIsListsModalOpen}
      />
    </div>
  );
}
