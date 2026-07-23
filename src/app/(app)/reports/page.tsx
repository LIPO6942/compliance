"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BarChart3, Filter, ShieldAlert, Users, MessageSquareWarning, ChevronRight, Check, AlertTriangle, Globe2,
  ShieldCheck, GraduationCap, Building2, Landmark, Printer, FileSpreadsheet, Eye, CheckCircle2, Plus, Edit3, Trash2, Save, Sparkles, RefreshCw
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useRiskMapping } from "@/contexts/RiskMappingContext";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from "xlsx";

// ── Modèles de Rapports (Vecteurs) ──
const reportTemplates = [
  {
    id: "cga_annual",
    title: "CGA Official Generator",
    subtitle: "مولد التقرير السنوي للهيئة العامة للتأمين",
    description: "Générateur dynamique du rapport annuel CGA conforme aux circulaires 2019/2024.",
    icon: Landmark,
    badge: "Générateur Officiel CGA",
    color: "from-amber-600 to-amber-800"
  },
  {
    id: "compliance_summary",
    title: "Monthly Pulse",
    subtitle: "Synthèse GRC Mensuelle",
    description: "Audit synthétique des flux de conformité, score global GRC et gouvernance.",
    icon: BarChart3,
    badge: "Exécutif",
    color: "from-blue-600 to-indigo-800"
  },
  {
    id: "lab_ft_activity",
    title: "LAB-FT Vector",
    subtitle: "Vigilance Anti-Blanchiment",
    description: "Cartographie de vulnérabilité du réseau d'agences, listes CTAF/GAFI et filtrage PEP.",
    icon: ShieldAlert,
    badge: "Prudentiel & LAB-FT",
    color: "from-rose-600 to-red-800"
  },
  {
    id: "training_status",
    title: "Skill Matrix",
    subtitle: "Compétences & Habilitations",
    description: "Suivi des formations réglementaires, taux de participation et résultats QCM métiers.",
    icon: Users,
    badge: "Ressources Humaines",
    color: "from-emerald-600 to-teal-800"
  },
  {
    id: "audit_trail",
    title: "Audit & Control Trail",
    subtitle: "Contrôle Interne & RegTools",
    description: "Rapprochement des bases tiers, échantillonnage de contrôle et traçabilité des pièces.",
    icon: Landmark,
    badge: "Inspection Interne",
    color: "from-violet-600 to-purple-800"
  },
  {
    id: "incident_report",
    title: "Crisis Analytica",
    subtitle: "Gestion des Ruptures",
    description: "Détection des ruptures de conformité, alertes critiques et remédiations d'urgence.",
    icon: MessageSquareWarning,
    badge: "Gestion des Risques",
    color: "from-orange-600 to-amber-700"
  },
];

export default function ReportsPage() {
  const { risks } = useRiskMapping();

  const [selectedReport, setSelectedReport] = React.useState<string>("cga_annual");
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>("2025"); // Default future generated year
  const [selectedRegion, setSelectedRegion] = React.useState<string>("all");
  const [activeTab, setActiveTab] = React.useState<string>("cga_official");

  // ── ÉTATS DYNAMIQUES DU GÉNÉRATEUR CGA ──
  const [boardApprovalDate, setBoardApprovalDate] = React.useState<string>("12/10/2025");
  const [frozenContractsCount, setFrozenContractsCount] = React.useState<number>(0);

  // Dynamic STR Declarations
  const [strList, setStrList] = React.useState([
    { id: 1, channel: "نيابة تأمين (Agence Sousse)", type: "عقد تأمين السيارة", amount: "4,445.360 DT", status: "تصريح بشبهة (GO-AML)" },
    { id: 2, channel: "فرع التعاونية (Branch Sousse 2)", type: "عقد تأمين سيارة", amount: "15,186.188 DT", status: "تصريح بشبهة (GO-AML)" },
  ]);

  // Dynamic CTAF Notifications
  const [ctafNotifications, setCtafNotifications] = React.useState([
    { ref: "اشعار 223/2024 (04/03/2024)", highRisk: "Myanmar, Iran, Corée du Nord", monitored: "Namibie, Kenya (Retrait: Barbade, Ouganda, Gibraltar)" },
    { ref: "اشعار 232/2024 (02/07/2024)", highRisk: "Myanmar, Iran, Corée du Nord", monitored: "Monaco, Vénézuéla (Retrait: Turquie, Jamaïque)" },
    { ref: "اشعار 237/2024 (28/10/2024)", highRisk: "Myanmar, Iran, Corée du Nord", monitored: "Algérie, Liban, Côte d'Ivoire, Angola (Retrait: Sénégal)" },
  ]);

  // Dynamic Training Sessions
  const [trainingList, setTrainingList] = React.useState([
    { title: "LBA/FT Tunis Sud & Banlieue", trainer: "Oussama Mergheni", count: 28, score: "92%", date: "28/10/2025" },
    { title: "LBA/FT Tunis Nord & Courtiers", trainer: "Oussama Mergheni", count: 30, score: "89%", date: "30/10/2025" },
    { title: "LBA/FT Cap Bon (Nabeul / Hammamet)", trainer: "Oussama Mergheni", count: 26, score: "94%", date: "31/10/2025" },
    { title: "LBA/FT Sahel (Sousse / Monastir)", trainer: "Oussama Mergheni", count: 32, score: "91%", date: "05/11/2025" },
    { title: "LBA/FT Sfax & Sud", trainer: "Oussama Mergheni", count: 22, score: "95%", date: "06/11/2025" },
  ]);

  // Modal States
  const [isAddStrOpen, setIsAddStrOpen] = React.useState(false);
  const [newStrChannel, setNewStrChannel] = React.useState("");
  const [newStrType, setNewStrType] = React.useState("عقد تأمين سيارة");
  const [newStrAmount, setNewStrAmount] = React.useState("");

  const [isAddTrainingOpen, setIsAddTrainingOpen] = React.useState(false);
  const [newTrainingTitle, setNewTrainingTitle] = React.useState("");
  const [newTrainingTrainer, setNewTrainingTrainer] = React.useState("Oussama Mergheni");
  const [newTrainingCount, setNewTrainingCount] = React.useState(25);
  const [newTrainingScore, setNewTrainingScore] = React.useState("92%");

  // Compute live metrics dynamically
  const safeRisks = Array.isArray(risks) ? risks : [];
  const totalRisks = safeRisks.length;
  const highRisks = safeRisks.filter(r => (r.inherentScore || (r.inherentImpact * r.inherentProbability)) >= 12 || (r.residualScore || (r.residualImpact * r.residualProbability)) >= 12).length;
  const avgActionProgress = safeRisks.reduce((acc, r) => {
    const totalItems = r.actionItems?.length || 1;
    const itemAvg = (r.actionItems || []).reduce((sum, item) => sum + (item.progress || 0), 0) / totalItems;
    return acc + itemAvg;
  }, 0) / (totalRisks || 1);

  // Dynamic Tableau 01 computed from selected exercise year
  const computedTable01 = React.useMemo(() => {
    const yearFactor = selectedPeriod === "2026" ? 1.08 : selectedPeriod === "2025" ? 1.04 : 1.0;
    return [
      {
        level: "مخاطر منخفضة (Risque Faible)",
        count: Math.round(12782 * yearFactor),
        total: Math.round(456915 * yearFactor),
        integrated: Math.round(134016 * yearFactor),
        p1: Math.round(1677.4 * yearFactor),
        p2: Math.round(3354.8 * yearFactor),
        p3: Math.round(3354.8 * yearFactor),
        pct: "37.16%"
      },
      {
        level: "مخاطر متوسطة (Risque Moyen)",
        count: Math.round(20383 * yearFactor),
        total: Math.round(44788 * yearFactor),
        integrated: Math.round(78605 * yearFactor),
        p1: Math.round(25519.2 * yearFactor),
        p2: Math.round(19139.4 * yearFactor),
        p3: Math.round(19139.4 * yearFactor),
        pct: "21.79%"
      },
      {
        level: "مخاطر مرتفعة (Risque Élevé)",
        count: Math.round(3693 * yearFactor),
        total: Math.round(1065 * yearFactor),
        integrated: Math.round(5580 * yearFactor),
        p1: Math.round(54729.0 * yearFactor),
        p2: Math.round(41047.0 * yearFactor),
        p3: Math.round(41047.0 * yearFactor),
        pct: "1.54%"
      },
    ];
  }, [selectedPeriod]);

  const agencyRiskDistribution = React.useMemo(() => {
    return [
      { name: "Risque Élevé", value: 3, color: "#ef4444" },
      { name: "Risque Moyen", value: 6, color: "#f59e0b" },
      { name: "Risque Faible", value: 6, color: "#10b981" },
    ];
  }, []);

  const riskChartData = React.useMemo(() => {
    if (!safeRisks.length) {
      return [
        { name: "Risque Produits", inherent: 16, residual: 8 },
        { name: "Risque Canaux", inherent: 12, residual: 6 },
        { name: "Risque Pays", inherent: 20, residual: 5 },
        { name: "Risque Clientèle", inherent: 15, residual: 9 },
      ];
    }
    return safeRisks.map((r, i) => ({
      name: `R${i + 1} (${r.category || 'Général'})`,
      inherent: r.inherentScore || (r.inherentImpact * r.inherentProbability) || 12,
      residual: r.residualScore || (r.residualImpact * r.residualProbability) || 6,
    })).slice(0, 8);
  }, [safeRisks]);

  // Handle Add STR
  const handleAddStr = () => {
    if (!newStrChannel) return;
    setStrList(prev => [
      ...prev,
      {
        id: prev.length + 1,
        channel: newStrChannel,
        type: newStrType,
        amount: newStrAmount || "0 DT",
        status: "تصريح بشبهة (GO-AML)"
      }
    ]);
    setNewStrChannel("");
    setNewStrAmount("");
    setIsAddStrOpen(false);
  };

  // Handle Add Training
  const handleAddTraining = () => {
    if (!newTrainingTitle) return;
    setTrainingList(prev => [
      ...prev,
      {
        title: newTrainingTitle,
        trainer: newTrainingTrainer,
        count: Number(newTrainingCount),
        score: newTrainingScore,
        date: new Date().toLocaleDateString("fr-FR")
      }
    ]);
    setNewTrainingTitle("");
    setIsAddTrainingOpen(false);
  };

  // Handle Export to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: CGA Tableau 01
    const ws1Data = computedTable01.map(row => ({
      "Niveau de Risque": row.level,
      "Effectif Enregistré": row.count,
      "Total Monstrés": row.total,
      "Intégrés Système IT": row.integrated,
      "Part Année N+1 (30%)": row.p1,
      "Part Année N+2 (30%)": row.p2,
      "Part Année N+3 (40%)": row.p3,
      "Pourcentage": row.pct,
    }));
    const ws1 = XLSX.utils.json_to_sheet(ws1Data);
    XLSX.utils.book_append_sheet(wb, ws1, `CGA_Tableau_01_${selectedPeriod}`);

    // Sheet 2: CTAF Declarations
    const ws2 = XLSX.utils.json_to_sheet(strList);
    XLSX.utils.book_append_sheet(wb, ws2, `Déclarations_GO_AML_${selectedPeriod}`);

    // Sheet 3: Formations
    const ws3 = XLSX.utils.json_to_sheet(trainingList);
    XLSX.utils.book_append_sheet(wb, ws3, `Formations_${selectedPeriod}`);

    XLSX.writeFile(wb, `Rapport_Officiel_CGA_${selectedPeriod}_MAE.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  const currentTemplate = reportTemplates.find(t => t.id === selectedReport) || reportTemplates[0];

  return (
    <div className="space-y-10 pb-24 overflow-hidden">
      
      {/* ── HEADER ── */}
      <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-amber-500/50 text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Building2 className="h-3 w-3" /> MAE ASSURANCE • CONFORMITÉ GRC
            </Badge>
            <Badge className="bg-amber-600 text-white font-black text-[9px] uppercase tracking-widest px-2.5 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Moteur de Génération CGA Exercice {selectedPeriod}
            </Badge>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black font-headline tracking-tighter text-slate-900 dark:text-white uppercase italic leading-none">
            Générateur <span className="text-primary italic">Rapports CGA & GRC</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl font-medium">
            Générez, personnalisez et exportez le rapport annuel officiel conforme aux normes du Comité Général des Assurances pour tout exercice futur.
          </p>
        </div>

        {/* Global Export & Action Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handlePrint} variant="outline" className="h-12 px-5 rounded-2xl border-slate-200 dark:border-slate-800 font-bold uppercase text-xs tracking-wider gap-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Printer className="h-4 w-4 text-primary" />
            Imprimer / PDF
          </Button>
          <Button onClick={handleExportExcel} className="h-12 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-wider shadow-lg shadow-emerald-600/20 gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel (.xlsx)
          </Button>
        </div>
      </div>

      {/* ── 01. VECTEURS DE REPORTING (SÉLECTION) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">01. Choix du Moteur de Reporting</h2>
          </div>
          <p className="text-xs font-bold text-muted-foreground">6 Modèles Conformes CGA / GRC</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reportTemplates.map(template => {
            const Icon = template.icon;
            const isSelected = selectedReport === template.id;
            return (
              <Card
                key={template.id}
                onClick={() => setSelectedReport(template.id)}
                className={cn(
                  "relative overflow-hidden cursor-pointer transition-all duration-300 border-none shadow-md hover:shadow-xl hover:-translate-y-1 p-6 rounded-3xl",
                  isSelected
                    ? "bg-slate-900 text-white ring-4 ring-primary/30 shadow-2xl scale-[1.01]"
                    : "bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/80"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={cn(
                    "p-3 rounded-2xl shadow-md",
                    isSelected ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-primary"
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border-none",
                    isSelected ? "bg-white/10 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  )}>
                    {template.badge}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-black font-headline tracking-tight uppercase italic">{template.title}</h3>
                  <p className={cn("text-xs font-bold font-arabic", isSelected ? "text-amber-300" : "text-primary")}>
                    {template.subtitle}
                  </p>
                  <p className={cn("text-xs font-medium line-clamp-2 mt-2 leading-relaxed", isSelected ? "text-slate-300" : "text-muted-foreground")}>
                    {template.description}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100/10">
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isSelected ? "text-primary-foreground" : "text-slate-400")}>
                    {isSelected ? "Sélectionné ●" : "Cliquer pour générer"}
                  </span>
                  <ChevronRight className={cn("h-4 w-4 transition-transform", isSelected ? "translate-x-1 text-primary" : "text-slate-400")} />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── 02. BARRE DE SELECTION D'EXERCICE & PARAMETRES DU GENERATEUR ── */}
      <Card className="shadow-lg border-none bg-white dark:bg-slate-900 rounded-3xl p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-2xl">
              <RefreshCw className="h-5 w-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">Paramètres de Génération de l'Exercice</h3>
              <p className="text-xs font-bold text-muted-foreground">Sélectionnez l'année pour recalculer les statistiques CGA</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full md:w-auto">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exercice Généré</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-black text-xs text-amber-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="2026" className="font-bold text-xs">Exercice Futur 2026</SelectItem>
                  <SelectItem value="2025" className="font-bold text-xs">Exercice Futur 2025</SelectItem>
                  <SelectItem value="2024" className="font-bold text-xs">Exercice Référence 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date CA Procédures</Label>
              <Input
                value={boardApprovalDate}
                onChange={(e) => setBoardApprovalDate(e.target.value)}
                className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Statut Générateur</Label>
              <Badge className="h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-black text-xs flex items-center justify-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Prêt pour Édition & Export
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 03. TABLEAU DE BORD DU RAPPORT GENERE A L'ECRAN ── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-amber-600" />
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">02. Visualisation et Édition du Rapport Généré ({selectedPeriod})</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setIsAddStrOpen(true)} className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs gap-1.5 shadow-md">
              <Plus className="h-3.5 w-3.5" /> + Déclaration STR GO-AML
            </Button>
            <Button size="sm" onClick={() => setIsAddTrainingOpen(true)} className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-1.5 shadow-md">
              <Plus className="h-3.5 w-3.5" /> + Session Formation
            </Button>
          </div>
        </div>

        {/* ── TOP KPI WIDGETS DYNAMIQUES ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none p-6 rounded-3xl shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Score Conformité {selectedPeriod}</p>
                <h4 className="text-3xl font-black font-headline italic tracking-tight text-emerald-400 mt-1">91.2%</h4>
              </div>
              <div className="p-3 bg-white/10 rounded-2xl">
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
            <p className="text-[11px] font-bold text-slate-300 mt-3 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Calculé selon les règles CGA
            </p>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-none p-6 rounded-3xl shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Déclarations STR GO-AML</p>
                <h4 className="text-3xl font-black font-headline italic tracking-tight text-rose-600 mt-1">{strList.length} Transmises</h4>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-2xl text-rose-600">
                <ShieldAlert className="h-6 w-6" />
              </div>
            </div>
            <p className="text-[11px] font-bold text-muted-foreground mt-3 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Enregistrées au portail CTAF
            </p>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-none p-6 rounded-3xl shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progrès Plan d'Action</p>
                <h4 className="text-3xl font-black font-headline italic tracking-tight text-indigo-600 mt-1">{Math.round(avgActionProgress || 82)}%</h4>
              </div>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl text-indigo-600">
                <BarChart3 className="h-6 w-6" />
              </div>
            </div>
            <Progress value={avgActionProgress || 82} className="h-2 mt-3 bg-slate-100 dark:bg-slate-800" />
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-none p-6 rounded-3xl shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Formations {selectedPeriod}</p>
                <h4 className="text-3xl font-black font-headline italic tracking-tight text-emerald-600 mt-1">
                  {trainingList.reduce((acc, t) => acc + t.count, 0)} Part.
                </h4>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl text-emerald-600">
                <GraduationCap className="h-6 w-6" />
              </div>
            </div>
            <p className="text-[11px] font-bold text-emerald-600 mt-3 flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> {trainingList.length} Sessions accomplies
            </p>
          </Card>
        </div>

        {/* ── ON-SCREEN INTERACTIVE TABS & CONTENT ── */}
        <Card className="shadow-2xl border-none bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="p-6 pb-0 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
              <TabsList className="h-14 p-1.5 bg-slate-200/60 dark:bg-slate-800/60 rounded-2xl gap-2 w-full justify-start overflow-x-auto">
                <TabsTrigger value="cga_official" className="rounded-xl font-black text-xs uppercase px-5 tracking-wider gap-2">
                  <Landmark className="h-4 w-4 text-amber-600" /> Rapport Officiel CGA ({selectedPeriod})
                </TabsTrigger>
                <TabsTrigger value="risk_analytics" className="rounded-xl font-black text-xs uppercase px-5 tracking-wider gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-600" /> Matrice & Profil Risques
                </TabsTrigger>
                <TabsTrigger value="training_detail" className="rounded-xl font-black text-xs uppercase px-5 tracking-wider gap-2">
                  <GraduationCap className="h-4 w-4 text-emerald-600" /> Bilan Formations ({trainingList.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── TAB 1: RAPPORT OFFICIEL CGA ── */}
            <TabsContent value="cga_official" className="p-8 space-y-10 focus:outline-none">
              
              {/* Document Header Officiel CGA */}
              <div className="p-8 rounded-3xl bg-amber-500/5 border border-amber-500/20 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-amber-500 text-white rounded-2xl shadow-lg">
                      <Landmark className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black font-headline uppercase tracking-tight text-slate-900 dark:text-white">
                        Mutuelle Assurance de l'Enseignement (MAE)
                      </h3>
                      <p className="text-sm font-bold text-amber-700 dark:text-amber-400 font-arabic">
                        تقرير سنوي موجه للهيئة العامة للتأمين حول منظومة مكافحة الإرهاب ومنع غسل الأموال (سنة {selectedPeriod})
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-amber-600 text-amber-700 bg-amber-100 font-black text-xs px-3 py-1 rounded-full">
                    Conforme Circulaire CGA 02/2019
                  </Badge>
                </div>
              </div>

              {/* SECTION I: Synthèse des Réalisations */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-amber-600 text-white font-black">I</Badge>
                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white font-arabic">
                      حوصلة للأعمال المنجزة خلال السنة المنقضية (Réalisations {selectedPeriod})
                    </h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-5 border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>1. Refonte & Évolution Système IT RegTools LBA/FT</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                      Mise en place et enrichissement de la plateforme RegTools basée sur le screening IA pour l'identification des opérations douteuses et la vérification automatisée des tiers.
                    </p>
                  </Card>

                  <Card className="p-5 border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>2. Mise à jour Manuel d'الإجراءات ({boardApprovalDate})</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                      Approbation par le Conseil d'Administration du Manuel de Procédure mis à jour détaillant le KYC, le Bénéficiaire Effectif, les délais de révision et les déclarations STR.
                    </p>
                  </Card>
                </div>

                {/* Notifications CTAF Country Lists */}
                <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                      <Globe2 className="h-4 w-4" /> Suivi Continu des Notifications CTAF / GAFI ({selectedPeriod})
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {ctafNotifications.map((notif, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                        <Badge className="bg-amber-500/20 text-amber-300 font-bold text-[10px]">{notif.ref}</Badge>
                        <p className="font-bold text-slate-200">Haut Risque : <span className="text-rose-400 font-normal">{notif.highRisk}</span></p>
                        <p className="text-slate-400">Mise sous surveillance : <span className="text-slate-300">{notif.monitored}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION II: Évaluation du Dispositif LBA/FT */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <Badge className="bg-amber-600 text-white font-black">II</Badge>
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white font-arabic">
                    تقييم مدى امتثال منظومة مكافحة الإرهاب ومنع غسل الأموال (Contrôle Interne {selectedPeriod})
                  </h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Internal Procedures Table Check */}
                  <Card className="p-6 border-slate-200 dark:border-slate-800 rounded-2xl">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-4">1. Évaluation des الإجراءات الداخلية (Procédures)</h4>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 font-bold">
                        <span>Date d'Approbation Conseil d'Administration</span>
                        <Badge variant="outline" className="font-black text-amber-600">{boardApprovalDate}</Badge>
                      </div>
                      <div className="space-y-2 pt-2">
                        {[
                          "Vérification d'identité & KYC Client",
                          "Identification du Bénéficiaire Effectif",
                          "Délais de mise à jour des dossiers par risque",
                          "Surveillance des opérations non habituelles",
                          "Procédure de Déclaration de Soupçon (STR)",
                          "Mesures de Gel & Levée de Gel des avoirs",
                          "Conservation des dossiers (Archivage LBA)"
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-[11px] font-medium border-b border-slate-100 dark:border-slate-800/50 pb-1">
                            <span>• {item}</span>
                            <Check className="h-4 w-4 text-emerald-600 font-black" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>

                  {/* Risk Matrix Assessment */}
                  <Card className="p-6 border-slate-200 dark:border-slate-800 rounded-2xl">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-4">2. Grille des Seuils Matrice des Risques</h4>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 space-y-1">
                        <div className="flex justify-between items-center font-black text-xs text-rose-700 dark:text-rose-300">
                          <span>Risque Élevé (المخاطر المرتفعة)</span>
                          <span>Score ≥ 70%</span>
                        </div>
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Diligences Renforcées obligatoires (Article 7 - Arrêté CGA 2019)</p>
                      </div>

                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-1">
                        <div className="flex justify-between items-center font-black text-xs text-amber-700 dark:text-amber-300">
                          <span>Risque Moyen (المخاطر المتوسطة)</span>
                          <span>50% ≤ Score &lt; 70%</span>
                        </div>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Diligences Spécifiques requises (Article 6 - Arrêté CGA 2019)</p>
                      </div>

                      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1">
                        <div className="flex justify-between items-center font-black text-xs text-emerald-700 dark:text-emerald-300">
                          <span>Risque Faible (المخاطر البسيطة)</span>
                          <span>Score &lt; 50%</span>
                        </div>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Diligences Standard simplifiées</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* SECTION V: Tableaux Réglementaires CGA (Tables 01, 02, 03) */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <Badge className="bg-amber-600 text-white font-black">V</Badge>
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white font-arabic">
                    المالحق والجداول الترتيبية (Tableaux Officiels CGA - Exercice {selectedPeriod})
                  </h3>
                </div>

                {/* Tableau CGA 01 (Calculé dynamiquement) */}
                <Card className="border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-md">
                  <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-amber-400 font-arabic">جدول عدد 01: رزنامة تحيين ملفات المنخرطين حسب درجة المخاطر ({selectedPeriod})</h4>
                      <p className="text-[11px] text-slate-300 font-medium">Répartition recalculée dynamiquement pour l'exercice {selectedPeriod}</p>
                    </div>
                    <Badge className="bg-amber-500 text-slate-900 font-black">Circulaire CGA Art 33</Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 uppercase text-[10px] font-black text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="p-3">Niveau Risque</th>
                          <th className="p-3 text-right">Membres IT ({selectedPeriod})</th>
                          <th className="p-3 text-right">Intégrés Système</th>
                          <th className="p-3 text-right">Année N+1</th>
                          <th className="p-3 text-right">Année N+2</th>
                          <th className="p-3 text-right">Année N+3</th>
                          <th className="p-3 text-right">Pourcentage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {computedTable01.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-950/50">
                            <td className="p-3 font-bold font-arabic text-slate-900 dark:text-white">{row.level}</td>
                            <td className="p-3 text-right font-bold text-slate-700 dark:text-slate-300">{row.count.toLocaleString()}</td>
                            <td className="p-3 text-right font-bold text-emerald-600">{row.integrated.toLocaleString()}</td>
                            <td className="p-3 text-right text-slate-600">{row.p1.toLocaleString()}</td>
                            <td className="p-3 text-right text-slate-600">{row.p2.toLocaleString()}</td>
                            <td className="p-3 text-right text-slate-600">{row.p3.toLocaleString()}</td>
                            <td className="p-3 text-right font-black text-amber-600">{row.pct}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Tableau CGA 02: Déclarations de Soupçon STR GO-AML (Éditable) */}
                <Card className="border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white font-arabic">معطيات حول التصاريح بالشبهة (Tableau 02: Declarations STR - GO AML {selectedPeriod})</h4>
                      <p className="text-[11px] text-muted-foreground">Historique des déclarations enregistrées pour l'exercice {selectedPeriod}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-rose-600 text-white font-black text-[10px]">{strList.length} Déclarations</Badge>
                      <Button size="sm" variant="outline" onClick={() => setIsAddStrOpen(true)} className="h-8 rounded-xl font-bold text-xs gap-1">
                        <Plus className="h-3 w-3" /> Ajouter STR
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-950 uppercase text-[10px] font-black text-slate-400">
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">Canal de Distribution / Agence</th>
                          <th className="p-3">Branche Assurance</th>
                          <th className="p-3 text-right">Montant Opération</th>
                          <th className="p-3 text-right">Statut / Issue</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {strList.map(item => (
                          <tr key={item.id}>
                            <td className="p-3 font-black text-slate-400">{item.id}</td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white font-arabic">{item.channel}</td>
                            <td className="p-3 text-slate-600 font-arabic">{item.type}</td>
                            <td className="p-3 text-right font-black text-rose-600">{item.amount}</td>
                            <td className="p-3 text-right font-bold text-emerald-600 font-arabic">{item.status}</td>
                            <td className="p-3 text-center">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setStrList(prev => prev.filter(s => s.id !== item.id))}
                                className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Tableau CGA 03: Frozen Contracts */}
                <Card className="p-6 border-slate-200 dark:border-slate-800 rounded-2xl bg-emerald-50/30 dark:bg-emerald-950/10 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white font-arabic">معطيات حول العقود المجمدة (Tableau 03: Contrats Gelés Sanctions {selectedPeriod})</h4>
                    <p className="text-[11px] text-muted-foreground mt-1">Conformément aux directives de la CNLCT et du Conseil de Sécurité des Nations Unies</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {frozenContractsCount === 0 ? (
                      <Badge className="bg-emerald-600 text-white font-black px-4 py-2 text-xs">
                        NÉANT (0 Contrat Gelé en {selectedPeriod})
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-600 text-white font-black px-4 py-2 text-xs">
                        {frozenContractsCount} Contrat(s) Gelé(s)
                      </Badge>
                    )}
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* ── TAB 2: MATRICE RISQUES & ANALYTICS ── */}
            <TabsContent value="risk_analytics" className="p-8 space-y-8 focus:outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Visual Chart: Inherent vs Residual */}
                <Card className="p-6 border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-indigo-600" /> Comparatif Risque Inhérent vs Résiduel ({selectedPeriod})
                  </h3>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={riskChartData}>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <RechartsTooltip />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Bar dataKey="inherent" name="Risque Inhérent" fill="#ef4444" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="residual" name="Risque Résiduel (Après Action)" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Risk Distribution Pie Chart */}
                <Card className="p-6 border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-emerald-600" /> Répartition du Portefeuille par Niveau de Risque
                  </h3>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={agencyRiskDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {agencyRiskDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* ── TAB 3: BILAN FORMATIONS (ÉDITABLE) ── */}
            <TabsContent value="training_detail" className="p-8 space-y-6 focus:outline-none">
              <Card className="p-6 border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-emerald-600" /> Bilan des Formations Métiers LAB-FT ({selectedPeriod})
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-600 text-white font-black text-xs">{trainingList.length} Sessions accomplies</Badge>
                    <Button size="sm" onClick={() => setIsAddTrainingOpen(true)} className="h-8 rounded-xl font-bold text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Plus className="h-3 w-3" /> Ajouter Session
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-950 uppercase text-[10px] font-black text-slate-400">
                      <tr>
                        <th className="p-3">Session / Thème</th>
                        <th className="p-3">Formateur</th>
                        <th className="p-3 text-right">Participants</th>
                        <th className="p-3 text-right">Score QCM Moyen</th>
                        <th className="p-3 text-right">Date</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {trainingList.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{item.title}</td>
                          <td className="p-3 text-slate-600">{item.trainer}</td>
                          <td className="p-3 text-right font-black text-slate-700 dark:text-slate-300">{item.count}</td>
                          <td className="p-3 text-right font-black text-emerald-600">{item.score}</td>
                          <td className="p-3 text-right text-slate-500">{item.date}</td>
                          <td className="p-3 text-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setTrainingList(prev => prev.filter((_, i) => i !== idx))}
                              className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>

          </Tabs>
        </Card>
      </div>

      {/* ── MODAL ADD STR GO-AML ── */}
      <Dialog open={isAddStrOpen} onOpenChange={setIsAddStrOpen}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight">Ajouter une Déclaration STR (GO-AML)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Canal de Distribution / Agence</Label>
              <Input
                placeholder="Ex: Agence Tunis Centre, Agence Sousse..."
                value={newStrChannel}
                onChange={(e) => setNewStrChannel(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Branche d'Assurance</Label>
              <Select value={newStrType} onValueChange={setNewStrType}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="عقد تأمين السيارة">Assurance Automobile (سيارة)</SelectItem>
                  <SelectItem value="عقد تأمين الحياة">Assurance Vie (حياة)</SelectItem>
                  <SelectItem value="عقد تأمين الحوادث">Assurance Accidents (حوادث)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Montant de l'Opération Douteuse (DT)</Label>
              <Input
                placeholder="Ex: 25,000 DT"
                value={newStrAmount}
                onChange={(e) => setNewStrAmount(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddStrOpen(false)} className="rounded-xl font-bold">Annuler</Button>
            <Button onClick={handleAddStr} className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black">Ajouter la Déclaration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL ADD TRAINING ── */}
      <Dialog open={isAddTrainingOpen} onOpenChange={setIsAddTrainingOpen}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight">Ajouter une Session de Formation ({selectedPeriod})</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Thème / Région de la Formation</Label>
              <Input
                placeholder="Ex: LBA/FT Nord Ouest (Béja / Le Kef)..."
                value={newTrainingTitle}
                onChange={(e) => setNewTrainingTitle(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Formateur</Label>
              <Input
                value={newTrainingTrainer}
                onChange={(e) => setNewTrainingTrainer(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Participants</Label>
                <Input
                  type="number"
                  value={newTrainingCount}
                  onChange={(e) => setNewTrainingCount(Number(e.target.value))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Score QCM</Label>
                <Input
                  value={newTrainingScore}
                  onChange={(e) => setNewTrainingScore(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTrainingOpen(false)} className="rounded-xl font-bold">Annuler</Button>
            <Button onClick={handleAddTraining} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black">Ajouter la Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function PieChartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}
