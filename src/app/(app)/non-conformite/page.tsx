'use client';

import React, { useState, useMemo } from 'react';
import {
  BookX,
  ShieldAlert,
  Scale,
  FileText,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Building2,
  BookOpen,
  Gavel,
  Filter,
  Download,
  Eye,
  PlusCircle,
  Edit2,
  Trash2,
  Search,
  Printer,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import ExcelJS from 'exceljs';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { RegulatoryWatchRegister } from '@/components/non-conformite/RegulatoryWatchRegister';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RegulatoryRisk {
  id: string;
  reference: string;
  risk: string;
  consequence: string;
  probability: 1 | 2 | 3;
  impact: 1 | 2 | 3;
  score: number;
  level: 'Faible' | 'Moyen' | 'Élevé';
  control: string;
}

// ─── Initial Data (MAE Assurances - Référentiels LBA/FT) ────────────────────────
const initialRisks: RegulatoryRisk[] = [
  {
    id: 'R01',
    reference: 'Art. 8 du Décret 2019-419',
    risk: 'Non-respect du délai de 8 heures pour geler les avoirs suite à notification CNLCT.',
    consequence: 'Violation directe des résolutions de l\'ONU. Sanction pénale de la structure.',
    probability: 2,
    impact: 3,
    score: 6,
    level: 'Élevé',
    control: 'Veille automatisée et alertes IT temps réel.',
  },
  {
    id: 'R02',
    reference: 'Art. 9 du Règlement CGA 2019-02',
    risk: 'Entrée en relation ou maintien avec une PPE sans l\'autorisation écrite de la Direction Générale.',
    consequence: 'Manquement aux obligations de vigilance renforcée. Sanction pécuniaire par le CGA.',
    probability: 2,
    impact: 2,
    score: 4,
    level: 'Moyen',
    control: 'Blocage système si visa DG absent.',
  },
  {
    id: 'R03',
    reference: 'Art. 13 du Règlement CGA 2019-02',
    risk: 'Absence de Déclaration de Soupçon (DS) à la CTAF suite à détection d\'opération inhabituelle.',
    consequence: 'Obstruction au travail de la CTAF. Responsabilité pénale du collaborateur et de l\'établissement.',
    probability: 2,
    impact: 3,
    score: 6,
    level: 'Élevé',
    control: 'Revue régulière des scénarios de détection (Annexe 01).',
  },
  {
    id: 'R04',
    reference: 'Art. 10 du Décret 2019-419',
    risk: 'Mise à disposition de fonds à une personne inscrite sur la liste nationale (CNLCT).',
    consequence: 'Financement direct du terrorisme. Poursuites pénales graves, retrait d\'agrément.',
    probability: 1,
    impact: 3,
    score: 3,
    level: 'Moyen',
    control: 'Filtrage systématique et quotidien des bases clients.',
  },
  {
    id: 'R05',
    reference: 'Art. 5 du Règlement CGA 2019-02',
    risk: 'Défaut d\'identification du Bénéficiaire Effectif (UBO) (détention > 20% non prouvée).',
    consequence: 'Opacité du client. Non-respect des directives CTAF n°2017-03.',
    probability: 3,
    impact: 2,
    score: 6,
    level: 'Élevé',
    control: 'Exigence de statuts à jour à chaque renouvellement.',
  },
  {
    id: 'R06',
    reference: 'Art. 12 du Règlement CGA 2019-02',
    risk: 'Défaut de formation continue du personnel sur les typologies de blanchiment.',
    consequence: 'Absence de moyens humains conformes. Sanction administrative.',
    probability: 2,
    impact: 1,
    score: 2,
    level: 'Faible',
    control: 'Plan de formation annuel obligatoire avec tracking.',
  },
  {
    id: 'R07',
    reference: 'Art. 115 de la Loi 2015-26',
    risk: 'Non-désignation officielle du Correspondant CNLCT ou de son suppléant.',
    consequence: 'Incapacité légale à recevoir les directives ou à déclarer. Sanction disciplinaire.',
    probability: 1,
    impact: 2,
    score: 2,
    level: 'Faible',
    control: 'Vérification formelle de la publication au JORT.',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const computeRiskScore = (prob: number, imp: number): number => prob * imp;

const computeRiskLevel = (prob: number, imp: number): 'Faible' | 'Moyen' | 'Élevé' => {
  const score = computeRiskScore(prob, imp);
  if (score >= 6) return 'Élevé';
  if (score >= 3) return 'Moyen';
  return 'Faible';
};

const getLevelConfig = (level: string) => {
  switch (level) {
    case 'Élevé':
      return {
        badge: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
        dot: 'bg-rose-500',
        badgeColor: 'bg-rose-500 text-white',
        card: 'border-rose-100 bg-rose-50/40 dark:bg-rose-950/20 dark:border-rose-900',
        icon: '🔴',
        gradient: 'from-rose-500 to-red-600',
        light: 'bg-rose-50 dark:bg-rose-950/30',
        text: 'text-rose-700 dark:text-rose-400',
      };
    case 'Moyen':
      return {
        badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
        dot: 'bg-amber-500',
        badgeColor: 'bg-amber-500 text-white',
        card: 'border-amber-100 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900',
        icon: '🟠',
        gradient: 'from-amber-500 to-orange-600',
        light: 'bg-amber-50 dark:bg-amber-950/30',
        text: 'text-amber-700 dark:text-amber-400',
      };
    default:
      return {
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
        dot: 'bg-emerald-500',
        badgeColor: 'bg-emerald-500 text-white',
        card: 'border-emerald-100 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900',
        icon: '🟢',
        gradient: 'from-emerald-500 to-teal-600',
        light: 'bg-emerald-50 dark:bg-emerald-950/30',
        text: 'text-emerald-700 dark:text-emerald-400',
      };
  }
};

const getCellColor = (prob: number, impact: number) => {
  const score = prob * impact;
  if (score >= 6) return 'bg-rose-100/90 border-rose-300 text-rose-900 hover:bg-rose-200 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200';
  if (score >= 4) return 'bg-amber-100/90 border-amber-300 text-amber-900 hover:bg-amber-200 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-200';
  if (score >= 2) return 'bg-yellow-50 border-yellow-200 text-yellow-900 hover:bg-yellow-100 dark:bg-yellow-950/40 dark:border-yellow-800 dark:text-yellow-200';
  return 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200';
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NonConformitePage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabParam = searchParams.get('tab');

  const [mainTab, setMainTab] = useState<'cartographie' | 'registre-veille'>(() => {
    if (tabParam === 'registre-veille' || tabParam === 'veille' || tabParam === 'registre-veille-conformite') {
      return 'registre-veille';
    }
    return 'cartographie';
  });

  React.useEffect(() => {
    if (tabParam === 'registre-veille' || tabParam === 'veille' || tabParam === 'registre-veille-conformite') {
      setMainTab('registre-veille');
    } else if (tabParam === 'cartographie') {
      setMainTab('cartographie');
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'cartographie' | 'registre-veille') => {
    setMainTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const [risks, setRisks] = useState<RegulatoryRisk[]>(initialRisks);
  const [activeTab, setActiveTab] = useState<'registre' | 'matrice' | 'analyse'>('registre');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({ R01: true, R03: true, R05: true });

  // Dialog state for adding/editing risks
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<RegulatoryRisk | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    reference: '',
    risk: '',
    consequence: '',
    probability: 2 as 1 | 2 | 3,
    impact: 2 as 1 | 2 | 3,
    control: '',
  });

  // Filtered risks
  const filteredRisks = useMemo(() => {
    return risks.filter(r => {
      const matchesFilter = filterLevel === 'all' || r.level === filterLevel;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q) ||
        r.risk.toLowerCase().includes(q) ||
        r.consequence.toLowerCase().includes(q) ||
        r.control.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [risks, filterLevel, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = risks.length;
    const high = risks.filter(r => r.level === 'Élevé').length;
    const medium = risks.filter(r => r.level === 'Moyen').length;
    const low = risks.filter(r => r.level === 'Faible').length;
    const avgScore = total > 0 ? (risks.reduce((s, r) => s + r.score, 0) / total).toFixed(1) : '0.0';
    return { total, high, medium, low, avgScore };
  }, [risks]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAdd = () => {
    const nextNum = risks.length + 1;
    const newId = `R${nextNum < 10 ? '0' : ''}${nextNum}`;
    setEditingRisk(null);
    setFormData({
      id: newId,
      reference: '',
      risk: '',
      consequence: '',
      probability: 2,
      impact: 2,
      control: '',
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (risk: RegulatoryRisk) => {
    setEditingRisk(risk);
    setFormData({
      id: risk.id,
      reference: risk.reference,
      risk: risk.risk,
      consequence: risk.consequence,
      probability: risk.probability,
      impact: risk.impact,
      control: risk.control,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setRisks(prev => prev.filter(r => r.id !== id));
    toast({
      title: 'Risque supprimé',
      description: `Le risque réglementaire ${id} a été retiré de la cartographie.`,
    });
  };

  const handleSaveRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reference.trim() || !formData.risk.trim() || !formData.control.trim()) {
      toast({
        title: 'Formulaire incomplet',
        description: 'Veuillez remplir tous les champs obligatoires.',
        variant: 'destructive',
      });
      return;
    }

    const score = computeRiskScore(formData.probability, formData.impact);
    const level = computeRiskLevel(formData.probability, formData.impact);

    if (editingRisk) {
      setRisks(prev =>
        prev.map(r =>
          r.id === editingRisk.id
            ? {
                ...r,
                reference: formData.reference,
                risk: formData.risk,
                consequence: formData.consequence,
                probability: formData.probability,
                impact: formData.impact,
                score,
                level,
                control: formData.control,
              }
            : r
        )
      );
      toast({
        title: 'Risque mis à jour',
        description: `Le risque ${formData.id} a été actualisé.`,
      });
    } else {
      const newRisk: RegulatoryRisk = {
        id: formData.id,
        reference: formData.reference,
        risk: formData.risk,
        consequence: formData.consequence,
        probability: formData.probability,
        impact: formData.impact,
        score,
        level,
        control: formData.control,
      };
      setRisks(prev => [...prev, newRisk]);
      toast({
        title: 'Nouveau risque ajouté',
        description: `Le risque ${formData.id} a été inséré dans le registre.`,
      });
    }

    setIsDialogOpen(false);
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'MAE Assurances - Compliance Navigator';
      wb.created = new Date();

      const ws = wb.addWorksheet('Non-Conformité Réglementaire');

      // Title & Header Information
      ws.mergeCells('A1:I1');
      ws.getCell('A1').value = 'CARTOGRAPHIE DES RISQUES DE NON-CONFORMITÉ RÉGLEMENTAIRE LBA/FT';
      ws.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF881337' } };
      ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 30;

      ws.mergeCells('A2:I2');
      ws.getCell('A2').value = 'Organisme : MAE ASSURANCES | Référentiel : Loi 2015-26, Règlement CGA n°2019-02, Décrets Gouvernementaux';
      ws.getCell('A2').font = { size: 10, italic: true, color: { argb: 'FF475569' } };
      ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(2).height = 20;

      // Table Header
      const headerRow = ws.getRow(4);
      headerRow.values = [
        'ID',
        'RÉFÉRENCE RÉGLEMENTAIRE',
        'RISQUE DE NON-CONFORMITÉ',
        'CONSÉQUENCE JURIDIQUE / SANCTION',
        'PROB (1-3)',
        'IMPACT (1-3)',
        'SCORE',
        'NIVEAU',
        'MESURE DE MAÎTRISE (CONTRÔLE)',
      ];
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 25;

      // Columns width
      ws.columns = [
        { width: 8 },
        { width: 30 },
        { width: 45 },
        { width: 45 },
        { width: 12 },
        { width: 12 },
        { width: 10 },
        { width: 14 },
        { width: 45 },
      ];

      // Add rows
      risks.forEach((r, idx) => {
        const row = ws.addRow([
          r.id,
          r.reference,
          r.risk,
          r.consequence,
          r.probability,
          r.impact,
          r.score,
          r.level,
          r.control,
        ]);

        row.alignment = { vertical: 'top', wrapText: true };
        row.getCell(1).alignment = { vertical: 'top', horizontal: 'center', font: { bold: true } };
        row.getCell(5).alignment = { vertical: 'top', horizontal: 'center' };
        row.getCell(6).alignment = { vertical: 'top', horizontal: 'center' };
        row.getCell(7).alignment = { vertical: 'top', horizontal: 'center', font: { bold: true } };
        row.getCell(8).alignment = { vertical: 'top', horizontal: 'center', font: { bold: true } };

        // Color coding for score & level
        const levelCell = row.getCell(8);
        const scoreCell = row.getCell(7);
        if (r.level === 'Élevé') {
          levelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
          levelCell.font = { color: { argb: 'FF9F1239' }, bold: true };
          scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
        } else if (r.level === 'Moyen') {
          levelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
          levelCell.font = { color: { argb: 'FF92400E' }, bold: true };
          scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        } else {
          levelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
          levelCell.font = { color: { argb: 'FF065F46' }, bold: true };
          scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        }

        // Zebra striping
        if (idx % 2 === 1 && r.level !== 'Élevé') {
          row.eachCell((cell, colNum) => {
            if (colNum !== 7 && colNum !== 8) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            }
          });
        }
      });

      // Borders
      ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber >= 4) {
          row.eachCell(cell => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            };
          });
        }
      });

      // Save buffer
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Cartographie_Non_Conformite_MAE_${new Date().toISOString().slice(0, 10)}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Exportation réussie',
        description: 'Le fichier Excel du Registre des Risques Réglementaires a été téléchargé.',
      });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erreur d\'exportation',
        description: 'Impossible d\'exporter vers Excel.',
        variant: 'destructive',
      });
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* ── Top Level Sub-Navigation Switcher ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => handleTabChange('cartographie')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-initial justify-center',
                mainTab === 'cartographie'
                  ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              <BookX className="h-4 w-4 text-rose-500" />
              <span>Cartographie des Risques Non-Conformité</span>
            </button>
            <button
              onClick={() => handleTabChange('registre-veille')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-initial justify-center',
                mainTab === 'registre-veille'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              <span>Registre Veille Réglementaire _conformite</span>
              <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300/40 text-[10px] font-bold px-1.5 py-0 hidden sm:inline-flex">
                37 Textes
              </Badge>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-500 pr-2">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span>MAE Assurances</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="font-mono text-[11px] text-slate-400">Ref 2026</span>
          </div>
        </div>

        {mainTab === 'registre-veille' ? (
          <RegulatoryWatchRegister />
        ) : (
          <div className="space-y-8">
            {/* ── Hero Banner ──────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 p-6 sm:p-8 shadow-2xl text-white">
          <div className="pointer-events-none absolute -top-16 -right-16 h-72 w-72 rounded-full bg-rose-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-orange-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-rose-500/30 shrink-0">
                <BookX className="h-8 w-8 sm:h-10 w-10 text-white" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-300/90 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-400/30">
                    MAE ASSURANCES · LBA/FT
                  </span>
                  <span className="text-[10px] font-bold text-slate-300">
                    Loi 2015-26 · CGA 2019-02
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                  Cartographie des Risques <br className="hidden sm:inline" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-orange-300 to-amber-200">
                    de Non-Conformité Réglementaire
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
                  Identification, scoring (P × I) et maîtrise des manquements réglementaires critiques LBA/FT
                  applicables au secteur de l'assurance en Tunisie.
                </p>
              </div>
            </div>

            {/* Quick Actions & Meta */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleExportExcel}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/40 text-xs font-bold rounded-xl gap-2 backdrop-blur-sm flex-1 sm:flex-initial"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export Excel
                </Button>
                <Button
                  onClick={() => window.print()}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/40 text-xs font-bold rounded-xl gap-2 backdrop-blur-sm flex-1 sm:flex-initial"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimer
                </Button>
                <Button
                  onClick={handleOpenAdd}
                  size="sm"
                  className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white text-xs font-bold rounded-xl gap-2 shadow-lg shadow-rose-500/30 flex-1 sm:flex-initial"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Nouveau Risque
                </Button>
              </div>

              {/* Institution badge */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 backdrop-blur-md flex items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-rose-300" />
                  <span className="text-slate-300 font-medium">MAE Assurances</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI Summary Cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: 'Total des Risques',
              value: stats.total,
              sub: 'Risques répertoriés',
              icon: Target,
              gradient: 'from-slate-700 to-slate-900',
              bg: 'bg-slate-50 dark:bg-slate-900/50',
              text: 'text-slate-900 dark:text-slate-100',
              border: 'border-slate-200 dark:border-slate-800',
            },
            {
              label: 'Risques Élevés 🔴',
              value: stats.high,
              sub: 'Score ≥ 6 · Priorité haute',
              icon: ShieldAlert,
              gradient: 'from-rose-500 to-red-600',
              bg: 'bg-rose-50/70 dark:bg-rose-950/30',
              text: 'text-rose-700 dark:text-rose-300',
              border: 'border-rose-200 dark:border-rose-900',
            },
            {
              label: 'Risques Moyens 🟠',
              value: stats.medium,
              sub: 'Score 3–4 · Suivi actif',
              icon: AlertTriangle,
              gradient: 'from-amber-500 to-orange-600',
              bg: 'bg-amber-50/70 dark:bg-amber-950/30',
              text: 'text-amber-700 dark:text-amber-300',
              border: 'border-amber-200 dark:border-amber-900',
            },
            {
              label: 'Risques Faibles 🟢',
              value: stats.low,
              sub: 'Score ≤ 2 · Contrôle standard',
              icon: CheckCircle2,
              gradient: 'from-emerald-500 to-teal-600',
              bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
              text: 'text-emerald-700 dark:text-emerald-300',
              border: 'border-emerald-200 dark:border-emerald-900',
            },
          ].map(({ label, value, sub, icon: Icon, gradient, bg, text, border }) => (
            <Card key={label} className={cn('border shadow-sm rounded-2xl overflow-hidden', border, bg)}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn('h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md', gradient)}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className={cn('text-3xl font-black', text)}>{value}</span>
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{label}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Methodological Framework Note ────────────────────────────────── */}
        <Card className="border border-indigo-100 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-slate-50/60 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900/40 rounded-2xl">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex gap-3.5 items-start">
                <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                    <span>1. Méthodologie d'Évaluation des Risques de Non-Conformité</span>
                    <Badge variant="outline" className="text-[9px] font-mono border-indigo-200 text-indigo-700 dark:text-indigo-300">
                      P (1-3) × I (1-3) = Score (1-9)
                    </Badge>
                  </p>
                  <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 mt-1 leading-relaxed">
                    Identique à la cartographie générale : la criticité est obtenue par le produit de la <strong>Probabilité</strong> (1: Faible, 2: Modérée, 3: Élevée) et de l'<strong>Impact</strong> (1: Faible, 2: Modéré, 3: Élevé).
                    Seuils : <strong>Score ≥ 6</strong> → 🔴 Élevé | <strong>Score 3–4</strong> → 🟠 Moyen | <strong>Score 1–2</strong> → 🟢 Faible.
                  </p>
                </div>
              </div>

              {/* Referentials pills */}
              <div className="flex flex-wrap gap-1.5 shrink-0">
                <Badge className="bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 text-[10px] font-semibold">
                  Loi n° 2015-26
                </Badge>
                <Badge className="bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 text-[10px] font-semibold">
                  Règlement CGA 2019-02
                </Badge>
                <Badge className="bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 text-[10px] font-semibold">
                  Décret 2019-419
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Main Navigation Tabs ─────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <TabsList className="bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl h-auto">
              <TabsTrigger
                value="registre"
                className="rounded-lg text-xs font-bold px-4 py-2 gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm"
              >
                <FileText className="h-4 w-4 text-rose-500" />
                2. Registre des Risques ({risks.length})
              </TabsTrigger>
              <TabsTrigger
                value="matrice"
                className="rounded-lg text-xs font-bold px-4 py-2 gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm"
              >
                <BarChart3 className="h-4 w-4 text-orange-500" />
                Matrice Heatmap
              </TabsTrigger>
              <TabsTrigger
                value="analyse"
                className="rounded-lg text-xs font-bold px-4 py-2 gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm"
              >
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                3. Analyse & Action Prioritaire
              </TabsTrigger>
            </TabsList>

            {/* Quick search input */}
            {activeTab === 'registre' && (
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Filtrer par mot-clé, article, sanction..."
                    className="pl-8 h-9 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 1 : REGISTRE DES RISQUES (TABLEAU DÉTAILLÉ)
             ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="registre" className="space-y-4 m-0">
            {/* Filter tags */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1">
                  <Filter className="h-3.5 w-3.5" />
                  Filtrer :
                </span>
                {[
                  { key: 'all', label: 'Tous les risques', count: risks.length },
                  { key: 'Élevé', label: '🔴 Élevé', count: stats.high },
                  { key: 'Moyen', label: '🟠 Moyen', count: stats.medium },
                  { key: 'Faible', label: '🟢 Faible', count: stats.low },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setFilterLevel(key)}
                    className={cn(
                      'text-xs font-bold px-3 py-1.5 rounded-xl border transition-all duration-150 flex items-center gap-1.5',
                      filterLevel === key
                        ? key === 'Élevé'
                          ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                          : key === 'Moyen'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                          : key === 'Faible'
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                          : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    )}
                  >
                    <span>{label}</span>
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.2 rounded-full font-black',
                        filterLevel === key ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      )}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const allOpen = filteredRisks.every(r => expandedRows[r.id]);
                    const next: Record<string, boolean> = {};
                    filteredRisks.forEach(r => {
                      next[r.id] = !allOpen;
                    });
                    setExpandedRows(next);
                  }}
                  className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 h-8"
                >
                  {filteredRisks.every(r => expandedRows[r.id]) ? 'Replier tout' : 'Déplier tout'}
                </Button>
              </div>
            </div>

            {/* Main Risk Table */}
            <Card className="border border-slate-200/80 dark:border-slate-800 shadow-md rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-500 w-14 text-center">ID</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-500 min-w-[200px]">Référence Réglementaire</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-500 min-w-[280px]">Risque de Non-Conformité</th>
                      <th className="py-3.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 text-center w-20">Prob (1-3)</th>
                      <th className="py-3.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 text-center w-20">Impact (1-3)</th>
                      <th className="py-3.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 text-center w-16">Score</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-500 w-28">Niveau</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRisks.map((risk, index) => {
                      const isExpanded = !!expandedRows[risk.id];
                      const cfg = getLevelConfig(risk.level);

                      return (
                        <React.Fragment key={risk.id}>
                          <tr
                            className={cn(
                              'group transition-colors duration-150 cursor-pointer',
                              index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-900/40',
                              isExpanded ? 'bg-rose-50/20 dark:bg-rose-950/10' : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                            )}
                            onClick={() => toggleRow(risk.id)}
                          >
                            {/* ID */}
                            <td className="py-4 px-4 text-center">
                              <span className="inline-flex items-center justify-center h-8 w-11 rounded-xl bg-slate-900 text-white font-black text-xs shadow-sm">
                                {risk.id}
                              </span>
                            </td>

                            {/* Référence Réglementaire */}
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 px-2.5 py-1 rounded-lg inline-block">
                                  {risk.reference}
                                </span>
                              </div>
                            </td>

                            {/* Risque */}
                            <td className="py-4 px-4">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">{risk.risk}</p>
                              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                                <span className="font-semibold text-rose-600 dark:text-rose-400">
                                  Contrôle : {risk.control}
                                </span>
                              </div>
                            </td>

                            {/* Probabilité */}
                            <td className="py-4 px-3 text-center">
                              <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                                {risk.probability}
                              </span>
                            </td>

                            {/* Impact */}
                            <td className="py-4 px-3 text-center">
                              <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                                {risk.impact}
                              </span>
                            </td>

                            {/* Score */}
                            <td className="py-4 px-3 text-center">
                              <span
                                className={cn(
                                  'inline-flex items-center justify-center h-8 w-8 rounded-xl text-xs font-black shadow-sm',
                                  risk.score >= 6
                                    ? 'bg-rose-500 text-white shadow-rose-500/20'
                                    : risk.score >= 4
                                    ? 'bg-amber-500 text-white shadow-amber-500/20'
                                    : 'bg-emerald-500 text-white shadow-emerald-500/20'
                                )}
                              >
                                {risk.score}
                              </span>
                            </td>

                            {/* Niveau */}
                            <td className="py-4 px-4">
                              <Badge className={cn('text-[11px] font-bold border px-2.5 py-0.5 rounded-lg', cfg.badge)}>
                                {cfg.icon} {risk.level}
                              </Badge>
                            </td>

                            {/* Actions & Expand */}
                            <td className="py-4 px-4 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEdit(risk)}
                                  className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800"
                                  title="Modifier le risque"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(risk.id)}
                                  className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                  title="Supprimer le risque"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleRow(risk.id)}
                                  className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800"
                                >
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Detail Panel */}
                          {isExpanded && (
                            <tr className={cn(index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-900/40')}>
                              <td colSpan={8} className="px-4 pb-4 pt-1">
                                <div className="ml-14 grid sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/60 dark:from-slate-800/40 dark:to-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-inner">
                                  {/* Conséquence juridique / Sanction */}
                                  <div className="space-y-1.5 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/60 shadow-sm">
                                    <div className="flex items-center gap-2">
                                      <div className="h-5 w-5 rounded-md bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                                        <Gavel className="h-3 w-3" />
                                      </div>
                                      <p className="text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                                        Conséquence Juridique & Sanction
                                      </p>
                                    </div>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pl-7">
                                      {risk.consequence}
                                    </p>
                                  </div>

                                  {/* Mesure de Maîtrise / Contrôle */}
                                  <div className="space-y-1.5 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/60 shadow-sm">
                                    <div className="flex items-center gap-2">
                                      <div className="h-5 w-5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                        <ShieldCheck className="h-3 w-3" />
                                      </div>
                                      <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                        Mesure de Maîtrise (Contrôle Recommandé)
                                      </p>
                                    </div>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pl-7">
                                      {risk.control}
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {filteredRisks.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-slate-400">
                          <Eye className="h-10 w-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Aucun risque réglementaire trouvé</p>
                          <p className="text-xs text-slate-400 mt-1">Modifiez vos filtres de recherche ou ajoutez un nouveau risque.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 2 : MATRICE DES RISQUES HEATMAP (3x3)
             ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="matrice" className="space-y-6 m-0">
            <Card className="border border-slate-200/80 dark:border-slate-800 shadow-md rounded-2xl bg-white dark:bg-slate-900">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                        Matrice de Criticité 3 × 3 (Probabilité vs Impact)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Répartition spatiale des {risks.length} risques réglementaires selon leur criticité brute.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono border-rose-200 text-rose-700 self-start sm:self-auto">
                    P (1-3) × I (1-3)
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="max-w-3xl mx-auto">
                  {/* Heatmap Grid */}
                  <div className="flex gap-3">
                    {/* Y-axis (Probabilité) */}
                    <div className="flex flex-col justify-around items-center w-8 shrink-0 py-6">
                      <span
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 rotate-180 text-center"
                        style={{ writingMode: 'vertical-rl' }}
                      >
                        Probabilité (Fréquence) →
                      </span>
                    </div>

                    <div className="flex-1 space-y-2">
                      {/* Columns headers (Impact) */}
                      <div className="grid grid-cols-3 gap-2 ml-24 text-center">
                        {[
                          { val: 1, label: '1 · Faible' },
                          { val: 2, label: '2 · Modéré' },
                          { val: 3, label: '3 · Élevé' },
                        ].map(({ val, label }) => (
                          <div key={val} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-black text-slate-700 dark:text-slate-300">
                            {label}
                          </div>
                        ))}
                      </div>

                      {/* Rows (Prob 3 -> 1) */}
                      {[
                        { prob: 3, label: '3 · Élevée' },
                        { prob: 2, label: '2 · Modérée' },
                        { prob: 1, label: '1 · Faible' },
                      ].map(({ prob, label }) => (
                        <div key={prob} className="flex gap-2 items-stretch">
                          {/* Row label */}
                          <div className="w-24 shrink-0 flex items-center justify-end pr-2 text-right">
                            <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">{label}</span>
                          </div>

                          {/* 3 Cells for this Prob */}
                          <div className="grid grid-cols-3 gap-2 flex-1">
                            {[1, 2, 3].map(impact => {
                              const cellRisks = risks.filter(r => r.probability === prob && r.impact === impact);
                              const score = prob * impact;

                              return (
                                <Tooltip key={impact}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={cn(
                                        'min-h-[90px] rounded-2xl border-2 p-3 transition-all duration-200 flex flex-col justify-between cursor-pointer group',
                                        getCellColor(prob, impact)
                                      )}
                                      onClick={() => {
                                        if (cellRisks.length > 0) {
                                          setActiveTab('registre');
                                          setSearchQuery(cellRisks[0].id);
                                        }
                                      }}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold opacity-60">Score {score}</span>
                                        <span className="text-xs font-black px-1.5 py-0.5 rounded-full bg-white/70 dark:bg-slate-900/60 shadow-xs">
                                          {cellRisks.length} {cellRisks.length === 1 ? 'risque' : 'risques'}
                                        </span>
                                      </div>

                                      {/* Risk ID Badges */}
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {cellRisks.map(r => (
                                          <span
                                            key={r.id}
                                            className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-900 text-white shadow-sm"
                                          >
                                            {r.id}
                                          </span>
                                        ))}
                                        {cellRisks.length === 0 && (
                                          <span className="text-[11px] opacity-40 font-medium">Aucun</span>
                                        )}
                                      </div>
                                    </div>
                                  </TooltipTrigger>

                                  {cellRisks.length > 0 && (
                                    <TooltipContent className="max-w-sm p-3 bg-slate-900 text-white border-slate-800 space-y-2">
                                      <p className="font-bold text-xs text-rose-300">
                                        Score {score} · {cellRisks.length} Risque(s)
                                      </p>
                                      <div className="space-y-1.5">
                                        {cellRisks.map(r => (
                                          <div key={r.id} className="text-[11px] border-b border-slate-800 pb-1 last:border-0">
                                            <strong className="text-amber-300">{r.id}</strong> ({r.reference}) : {r.risk}
                                          </div>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {/* X-axis Label */}
                      <div className="text-center pt-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          ← Impact (Gravité / Sanction) →
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Legend & Distribution */}
                  <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-3.5 w-3.5 rounded-md bg-rose-200 border border-rose-300" />
                        <span className="font-semibold text-slate-600 dark:text-slate-300">Score ≥ 6 : 🔴 Élevé</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3.5 w-3.5 rounded-md bg-amber-200 border border-amber-300" />
                        <span className="font-semibold text-slate-600 dark:text-slate-300">Score 3–4 : 🟠 Moyen</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3.5 w-3.5 rounded-md bg-emerald-200 border border-emerald-300" />
                        <span className="font-semibold text-slate-600 dark:text-slate-300">Score 1–2 : 🟢 Faible</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 italic">
                      Cliquez sur une cellule pour filtrer les risques correspondants.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 3 : ANALYSE DES RISQUES RÉGLEMENTAIRES MAJEURS & PRIORITÉS
             ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="analyse" className="space-y-6 m-0">
            {/* Action Prioritaire Hero Card */}
            <Card className="border-2 border-rose-400 dark:border-rose-800 bg-gradient-to-br from-rose-50 via-orange-50/60 to-white dark:from-rose-950/40 dark:via-orange-950/20 dark:to-slate-900 rounded-3xl shadow-xl overflow-hidden">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                  <div className="flex gap-4 items-start">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg shadow-rose-500/30 text-white shrink-0">
                      <Target className="h-7 w-7" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-rose-500 text-white font-black text-xs px-2.5 py-0.5">
                          ACTION PRIORITAIRE N°1
                        </Badge>
                        <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
                          Art. 8 du Décret 2019-419 · Risque R01
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                        Capacité Technique à Respecter le Délai Impératif de 8 Heures
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl">
                        <strong>L'action prioritaire doit impérativement se concentrer sur la capacité technique à respecter le délai de 8 heures</strong> pour le gel des avoirs suite à notification de la CNLCT. Tout dépassement constitue une violation directe des résolutions du Conseil de Sécurité de l'ONU et engage la <strong>responsabilité pénale</strong> de la structure et de ses dirigeants.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/80 shrink-0 w-full md:w-64 shadow-sm text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      Dispositif Recommandé
                    </p>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-1">
                      Veille Automatisée & Alertes IT Temps Réel
                    </p>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                      <Check className="h-3.5 w-3.5" />
                      Plan d'urgence 24/7
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* In-depth Category Breakdown */}
            <div className="grid md:grid-cols-3 gap-5">
              {/* Risques Élevés */}
              <Card className="border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 rounded-2xl shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-rose-500 text-white font-black text-xs">🔴 ÉLEVÉ ({stats.high})</Badge>
                    <span className="text-xs font-mono font-bold text-rose-700 dark:text-rose-400">Score = 6</span>
                  </div>
                  <CardTitle className="text-sm font-black text-slate-800 dark:text-slate-100 mt-2">
                    Obligations à Risque Pénal Direct
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  <p>
                    Les scores élevés se concentrent sur les <strong>obligations à délai strict</strong> (R01 : 8h gel) et les <strong>omissions de déclaration</strong> (R03 : DS à la CTAF), qui exposent directement la MAE à des poursuites pénales et sanctions disciplinaires majeures.
                  </p>
                  <p>
                    Le <strong>R05 (Défaut UBO)</strong> présente une probabilité d'occurrence maximale (P=3) en raison de l'opacité fréquente des structures sociétaires complexes.
                  </p>
                  <div className="pt-2 border-t border-rose-100 dark:border-rose-900/40">
                    <p className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-400 mb-1">Risques associés :</p>
                    <div className="flex flex-wrap gap-1">
                      {['R01 (Gel 8h)', 'R03 (DS CTAF)', 'R05 (UBO >20%)'].map(tag => (
                        <span key={tag} className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 rounded-md">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Risques Moyens */}
              <Card className="border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 rounded-2xl shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-amber-500 text-white font-black text-xs">🟠 MOYEN ({stats.medium})</Badge>
                    <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">Score = 3–4</span>
                  </div>
                  <CardTitle className="text-sm font-black text-slate-800 dark:text-slate-100 mt-2">
                    Vigilance Renforcée & Listes Sanctions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  <p>
                    Les risques moyens concernent les défaillances de filtrage (R04 : Mise à disposition de fonds) et le non-respect des règles d'agrément DG pour les PPE (R02).
                  </p>
                  <p>
                    Le contrôle repose sur des <strong>blocages applicatifs stricts</strong> (refus d'émission de contrat sans visa DG) et un screening automatisé quotidien de la base client.
                  </p>
                  <div className="pt-2 border-t border-amber-100 dark:border-amber-900/40">
                    <p className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 mb-1">Risques associés :</p>
                    <div className="flex flex-wrap gap-1">
                      {['R02 (Autorisation PPE)', 'R04 (Fonds CNLCT)'].map(tag => (
                        <span key={tag} className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-md">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Risques Faibles */}
              <Card className="border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 rounded-2xl shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-emerald-500 text-white font-black text-xs">🟢 FAIBLE ({stats.low})</Badge>
                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">Score = 2</span>
                  </div>
                  <CardTitle className="text-sm font-black text-slate-800 dark:text-slate-100 mt-2">
                    Gouvernance & Formation Continue
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  <p>
                    Les risques faibles relèvent de la gouvernance administrative : désignation formelle au JORT du Correspondant CNLCT (R07) et déploiement du plan de formation annuel obligatoire (R06).
                  </p>
                  <p>
                    Ces obligations sont maîtrisées par le suivi du calendrier RH et les publications officielles.
                  </p>
                  <div className="pt-2 border-t border-emerald-100 dark:border-emerald-900/40">
                    <p className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 mb-1">Risques associés :</p>
                    <div className="flex flex-wrap gap-1">
                      {['R06 (Formation LBA)', 'R07 (Correspondant CNLCT)'].map(tag => (
                        <span key={tag} className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-md">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* ── Dialog for Adding / Editing Risks ────────────────────────────── */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-xl rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookX className="h-5 w-5 text-rose-500" />
                {editingRisk ? `Modifier le Risque Réglementaire ${editingRisk.id}` : 'Ajouter un Risque Réglementaire'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Renseignez les détails du manquement réglementaire, ses impacts légaux et les contrôles associés.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveRisk} className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-bold">Identifiant (ID)</Label>
                  <Input
                    value={formData.id}
                    onChange={e => setFormData({ ...formData, id: e.target.value })}
                    className="h-9 text-xs rounded-xl mt-1 font-mono font-bold"
                    placeholder="R08"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-bold">Référence Réglementaire</Label>
                  <Input
                    value={formData.reference}
                    onChange={e => setFormData({ ...formData, reference: e.target.value })}
                    className="h-9 text-xs rounded-xl mt-1"
                    placeholder="ex: Art. 8 du Décret 2019-419"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold">Risque de Non-Conformité</Label>
                <Textarea
                  value={formData.risk}
                  onChange={e => setFormData({ ...formData, risk: e.target.value })}
                  rows={2}
                  className="text-xs rounded-xl mt-1"
                  placeholder="Description précise du manquement..."
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Conséquence Juridique / Sanction</Label>
                <Textarea
                  value={formData.consequence}
                  onChange={e => setFormData({ ...formData, consequence: e.target.value })}
                  rows={2}
                  className="text-xs rounded-xl mt-1"
                  placeholder="Sanction pénale, pécuniaire, retrait d'agrément..."
                />
              </div>

              {/* Scoring P x I */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div>
                  <Label className="text-xs font-bold">Probabilité (1 à 3)</Label>
                  <Select
                    value={String(formData.probability)}
                    onValueChange={v => setFormData({ ...formData, probability: Number(v) as 1 | 2 | 3 })}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl mt-1">
                      <SelectValue placeholder="Probabilité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 · Faible</SelectItem>
                      <SelectItem value="2">2 · Modérée</SelectItem>
                      <SelectItem value="3">3 · Élevée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-bold">Impact (1 à 3)</Label>
                  <Select
                    value={String(formData.impact)}
                    onValueChange={v => setFormData({ ...formData, impact: Number(v) as 1 | 2 | 3 })}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl mt-1">
                      <SelectValue placeholder="Impact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 · Faible</SelectItem>
                      <SelectItem value="2">2 · Modéré</SelectItem>
                      <SelectItem value="3">3 · Élevé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold">Mesure de Maîtrise (Contrôle)</Label>
                <Input
                  value={formData.control}
                  onChange={e => setFormData({ ...formData, control: e.target.value })}
                  className="h-9 text-xs rounded-xl mt-1"
                  placeholder="ex: Veille automatisée et alertes IT temps réel."
                  required
                />
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="text-xs rounded-xl h-9"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="text-xs rounded-xl h-9 bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {editingRisk ? 'Enregistrer les modifications' : 'Ajouter le risque'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
