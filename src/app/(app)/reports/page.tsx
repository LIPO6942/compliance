"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BarChart3, Filter, ShieldAlert, Users, MessageSquareWarning, ChevronRight, Check, AlertTriangle, Globe2,
  ShieldCheck, GraduationCap, Building2, Landmark, Printer, FileSpreadsheet, Eye, CheckCircle2
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useRiskMapping } from "@/contexts/RiskMappingContext";
import { usePlanData } from "@/contexts/PlanDataContext";
import { useDocuments } from "@/contexts/DocumentsContext";
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
    title: "CGA Official Report",
    subtitle: "تقرير سنوي للهيئة العامة للتأمين",
    description: "Rapport annuel de conformité LBA/FT conforme aux circulaires de la CGA et loi CTAF.",
    icon: Landmark,
    badge: "Réglementaire CGA Assurances",
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

// ── Données fictives CGA 2024 extraites du document officiel ──
const cgaTable01Data = [
  { level: "مخاطر منخفضة (Risque Faible)", count: 12782, total: 456915, integrated: 134016, p1: 1677.4, p2: 3354.8, p3: 3354.8, pct: "37.16%" },
  { level: "مخاطر متوسطة (Risque Moyen)", count: 20383, total: 44788, integrated: 78605, p1: 25519.2, p2: 19139.4, p3: 19139.4, pct: "21.79%" },
  { level: "مخاطر مرتفعة (Risque Élevé)", count: 3693, total: 1065, integrated: 5580, p1: 54729.0, p2: 41047.0, p3: 41047.0, pct: "1.54%" },
];

const cgaStrData = [
  { id: 1, channel: "نيابة تأمين (Agence Sousse)", type: "عقد تأمين السيارة", amount: "4,445.360 DT", status: "تصريح بشبهة (GO-AML)" },
  { id: 2, channel: "فرع التعاونية (Branch Sousse 2)", type: "عقد تأمين سيارة", amount: "15,186.188 DT", status: "تصريح بشبهة (GO-AML)" },
];

const cgaCtafNotifications = [
  { ref: "اشعار 223/2024 (04/03/2024)", highRisk: "Myanmar, Iran, Corée du Nord", monitored: "Namibie, Kenya (Retrait: Barbade, Ouganda, Gibraltar)" },
  { ref: "اشعار 232/2024 (02/07/2024)", highRisk: "Myanmar, Iran, Corée du Nord", monitored: "Monaco, Vénézuéla (Retrait: Turquie, Jamaïque)" },
  { ref: "اشعار 237/2024 (28/10/2024)", highRisk: "Myanmar, Iran, Corée du Nord", monitored: "Algérie, Liban, Côte d'Ivoire, Angola (Retrait: Sénégal)" },
];

const mockGovernoratesList = [
  { name: "Tunis", vulnerabilityScore: 4.2, agencies: [{ name: "Agence Barcelone", riskLevel: "Faible" }, { name: "Agence Lafayette", riskLevel: "Faible" }, { name: "Agence Marsa", riskLevel: "Faible" }] },
  { name: "Sousse", vulnerabilityScore: 7.8, agencies: [{ name: "Agence Sousse 1", riskLevel: "Élevé" }, { name: "Agence Sousse 2", riskLevel: "Élevé" }, { name: "Agence Msaken", riskLevel: "Moyen" }] },
  { name: "Sfax", vulnerabilityScore: 6.5, agencies: [{ name: "Agence Sfax 1", riskLevel: "Moyen" }, { name: "Agence Sfax 2", riskLevel: "Moyen" }, { name: "Agence Gabès", riskLevel: "Moyen" }] },
  { name: "Nabeul", vulnerabilityScore: 5.1, agencies: [{ name: "Agence Nabeul", riskLevel: "Faible" }, { name: "Agence Hammamet", riskLevel: "Moyen" }] },
  { name: "Bizerte", vulnerabilityScore: 4.8, agencies: [{ name: "Agence Bizerte", riskLevel: "Faible" }, { name: "Agence Menzel Bourguiba", riskLevel: "Faible" }] },
  { name: "Béja", vulnerabilityScore: 5.4, agencies: [{ name: "Agence Béja", riskLevel: "Moyen" }, { name: "Agence Le Kef", riskLevel: "Moyen" }] },
];

export default function ReportsPage() {
  const { risks } = useRiskMapping();

  const [selectedReport, setSelectedReport] = React.useState<string>("cga_annual");
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>("2024");
  const [selectedRegion, setSelectedRegion] = React.useState<string>("all");
  const [activeTab, setActiveTab] = React.useState<string>("cga_official");

  // Compute metrics safely from React context
  const safeRisks = Array.isArray(risks) ? risks : [];
  const totalRisks = safeRisks.length;
  const highRisks = safeRisks.filter(r => (r.inherentScore || (r.inherentImpact * r.inherentProbability)) >= 12 || (r.residualScore || (r.residualImpact * r.residualProbability)) >= 12).length;
  const avgActionProgress = safeRisks.reduce((acc, r) => {
    const totalItems = r.actionItems?.length || 1;
    const itemAvg = (r.actionItems || []).reduce((sum, item) => sum + (item.progress || 0), 0) / totalItems;
    return acc + itemAvg;
  }, 0) / (totalRisks || 1);

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

  // Handle Export to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: CGA Tableau 01
    const ws1Data = cgaTable01Data.map(row => ({
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
    XLSX.utils.book_append_sheet(wb, ws1, "CGA_Tableau_01");

    // Sheet 2: CTAF Declarations
    const ws2 = XLSX.utils.json_to_sheet(cgaStrData);
    XLSX.utils.book_append_sheet(wb, ws2, "Déclarations_GO_AML");

    // Sheet 3: Risks DMR
    const ws3Data = safeRisks.map(r => ({
      "Code": r.id,
      "Intitulé Risque": r.title,
      "Catégorie": r.category,
      "Score Inhérent": r.inherentScore || (r.inherentImpact * r.inherentProbability),
      "Score Résiduel": r.residualScore || (r.residualImpact * r.residualProbability),
      "Statut Action": r.status,
    }));
    const ws3 = XLSX.utils.json_to_sheet(ws3Data);
    XLSX.utils.book_append_sheet(wb, ws3, "Matrice_DMR");

    XLSX.writeFile(wb, `Rapport_GRC_${selectedReport}_${selectedPeriod}.xlsx`);
  };

  // Handle Print / PDF
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
            <Badge className="bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest px-2.5">
              Prêt pour Audit CGA
            </Badge>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black font-headline tracking-tighter text-slate-900 dark:text-white uppercase italic leading-none">
            Intelligence <span className="text-primary italic">Reports Engine</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl font-medium">
            Centre de pilotage et consolidation des rapports réglementaires, prudentiels et d'inspection interne.
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
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">01. Choix du Vecteur d'Analyse</h2>
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
                    {isSelected ? "Sélectionné ●" : "Cliquer pour afficher"}
                  </span>
                  <ChevronRight className={cn("h-4 w-4 transition-transform", isSelected ? "translate-x-1 text-primary" : "text-slate-400")} />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── 02. BARRE DE FILTRES ET PARAMÉTRAGE ── */}
      <Card className="shadow-lg border-none bg-white dark:bg-slate-900 rounded-3xl p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-primary">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">Filtres Dynamiques d'Analyse</h3>
              <p className="text-xs font-bold text-muted-foreground">Rapport en cours : <span className="text-primary italic font-black uppercase">{currentTemplate.title}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full md:w-auto">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exercice / Période</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="2024" className="font-bold text-xs">Année Référence 2024</SelectItem>
                  <SelectItem value="2023" className="font-bold text-xs">Année 2023</SelectItem>
                  <SelectItem value="q4_2024" className="font-bold text-xs">4ème Trimestre 2024 (Q4)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Réseau / Gouvernorat</Label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="font-bold text-xs">GLOBAL (Tous Gouvernorats)</SelectItem>
                  <SelectItem value="tunis" className="font-bold text-xs">Grand Tunis</SelectItem>
                  <SelectItem value="sousse" className="font-bold text-xs">Sahel / Sousse</SelectItem>
                  <SelectItem value="sfax" className="font-bold text-xs">Sfax & Sud</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Statut Audit</Label>
              <Badge className="h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-black text-xs flex items-center justify-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Certifié ISO GRC
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 03. TABLEAU DE BORD DE RAPPORT INTERACTIF A L'ECRAN ── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">02. Visualisation du Tableau de Bord Interactif</h2>
          </div>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            Affichage Temps Réel
          </span>
        </div>

        {/* ── TOP KPI WIDGETS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none p-6 rounded-3xl shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Indice Global GRC</p>
                <h4 className="text-3xl font-black font-headline italic tracking-tight text-emerald-400 mt-1">88.4%</h4>
              </div>
              <div className="p-3 bg-white/10 rounded-2xl">
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
            <p className="text-[11px] font-bold text-slate-300 mt-3 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Conforme aux directives CGA 2024
            </p>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-none p-6 rounded-3xl shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Risques Critiques DMR</p>
                <h4 className="text-3xl font-black font-headline italic tracking-tight text-rose-600 mt-1">{highRisks} / {totalRisks || 12}</h4>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-2xl text-rose-600">
                <ShieldAlert className="h-6 w-6" />
              </div>
            </div>
            <p className="text-[11px] font-bold text-muted-foreground mt-3 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Vigilance renforcée appliquée
            </p>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-none p-6 rounded-3xl shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progrès Plan d'Action</p>
                <h4 className="text-3xl font-black font-headline italic tracking-tight text-indigo-600 mt-1">{Math.round(avgActionProgress || 74)}%</h4>
              </div>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl text-indigo-600">
                <BarChart3 className="h-6 w-6" />
              </div>
            </div>
            <Progress value={avgActionProgress || 74} className="h-2 mt-3 bg-slate-100 dark:bg-slate-800" />
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-none p-6 rounded-3xl shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Formations LAB-FT</p>
                <h4 className="text-3xl font-black font-headline italic tracking-tight text-emerald-600 mt-1">138 Part.</h4>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl text-emerald-600">
                <GraduationCap className="h-6 w-6" />
              </div>
            </div>
            <p className="text-[11px] font-bold text-emerald-600 mt-3 flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> 100% Réalisation du programme
            </p>
          </Card>
        </div>

        {/* ── ON-SCREEN INTERACTIVE TABS & CONTENT ── */}
        <Card className="shadow-2xl border-none bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="p-6 pb-0 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
              <TabsList className="h-14 p-1.5 bg-slate-200/60 dark:bg-slate-800/60 rounded-2xl gap-2 w-full justify-start overflow-x-auto">
                <TabsTrigger value="cga_official" className="rounded-xl font-black text-xs uppercase px-5 tracking-wider gap-2">
                  <Landmark className="h-4 w-4 text-amber-600" /> Rapport Officiel CGA (Ar/Fr)
                </TabsTrigger>
                <TabsTrigger value="risk_analytics" className="rounded-xl font-black text-xs uppercase px-5 tracking-wider gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-600" /> Matrice & Profil Risques
                </TabsTrigger>
                <TabsTrigger value="network_labft" className="rounded-xl font-black text-xs uppercase px-5 tracking-wider gap-2">
                  <Building2 className="h-4 w-4 text-rose-600" /> Vulnérabilité Agences & CTAF
                </TabsTrigger>
                <TabsTrigger value="training_detail" className="rounded-xl font-black text-xs uppercase px-5 tracking-wider gap-2">
                  <GraduationCap className="h-4 w-4 text-emerald-600" /> Bilan Formations
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
                        تقرير سنوي موجه للهيئة العامة للتأمين حول منظومة مكافحة الإرهاب ومنع غسل الأموال (سنة 2024)
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
                <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <Badge className="bg-amber-600 text-white font-black">I</Badge>
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white font-arabic">
                    حوصلة للأعمال المنجزة خلال السنة المنقضية (Réalisations 2024)
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-5 border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>1. Refonte Système IT RegTools LBA/FT</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                      Mise en place de la plateforme RegTools basée sur le screening IA pour l'identification des opérations douteuses et la vérification automatisée des tiers.
                    </p>
                  </Card>

                  <Card className="p-5 border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>2. Mise à jour Manuel d'الإجراءات (09/10/2024)</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                      Approbation par le Conseil d'Administration du nouveau Manuel de Procédures détaillant le KYC, le Bénéficiaire Effectif, les délais de révision et les déclarations STR.
                    </p>
                  </Card>

                  <Card className="p-5 border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>3. Interfaçage ProAssur Vie & CEGENAT</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                      Interfaçage direct du système LBA/FT RegTools avec l'application de souscription Assurance Vie (ProAssur) et la base centrale CEGENAT.
                    </p>
                  </Card>

                  <Card className="p-5 border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>4. Abonnement PPE & Portail GO-AML</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                      Abonnement annuel aux listes PPE (Personnes Politiquement Exposées) et télé-déclarations directes sur le portail de la CTAF (GO-AML).
                    </p>
                  </Card>
                </div>

                {/* Notifications CTAF Country Lists */}
                <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                    <Globe2 className="h-4 w-4" /> Suivi Continu des Notifications CTAF / GAFI (Listes 2024)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {cgaCtafNotifications.map((notif, idx) => (
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
                    تقييم مدى امتثال منظومة مكافحة الإرهاب ومنع غسل الأموال (Contrôle Interne)
                  </h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Internal Procedures Table Check */}
                  <Card className="p-6 border-slate-200 dark:border-slate-800 rounded-2xl">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-4">1. Évaluation des الإجراءات الداخلية (Procédures)</h4>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 font-bold">
                        <span>Date d'Approbation Conseil d'Administration</span>
                        <Badge variant="outline" className="font-black text-slate-700 dark:text-slate-300">09/10/2024</Badge>
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
                    المالحق والجداول الترتيبية (Tableaux Officiels CGA 2024)
                  </h3>
                </div>

                {/* Tableau CGA 01 */}
                <Card className="border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-md">
                  <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-amber-400 font-arabic">جدول عدد 01: رزنامة تحيين ملفات المنخرطين حسب درجة المخاطر</h4>
                      <p className="text-[11px] text-slate-300 font-medium">Répartition du portefeuille adhérents MAE et calendrier de mise à jour des dossiers</p>
                    </div>
                    <Badge className="bg-amber-500 text-slate-900 font-black">Circulaire CGA Art 33</Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 uppercase text-[10px] font-black text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="p-3">Niveau Risque</th>
                          <th className="p-3 text-right">Membres IT 2024</th>
                          <th className="p-3 text-right">Intégrés Système</th>
                          <th className="p-3 text-right">Année N+1</th>
                          <th className="p-3 text-right">Année N+2</th>
                          <th className="p-3 text-right">Année N+3</th>
                          <th className="p-3 text-right">Pourcentage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {cgaTable01Data.map((row, idx) => (
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

                {/* Tableau CGA 02: Déclarations de Soupçon STR GO-AML */}
                <Card className="border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white font-arabic">معطيات حول التصاريح بالشبهة (Tableau 02: Declarations STR - GO AML)</h4>
                      <p className="text-[11px] text-muted-foreground">Historique des déclarations transmises à la CTAF en 2024</p>
                    </div>
                    <Badge className="bg-rose-600 text-white font-black text-[10px]">2 Déclarations Transmises</Badge>
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
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {cgaStrData.map(item => (
                          <tr key={item.id}>
                            <td className="p-3 font-black text-slate-400">{item.id}</td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white font-arabic">{item.channel}</td>
                            <td className="p-3 text-slate-600 font-arabic">{item.type}</td>
                            <td className="p-3 text-right font-black text-rose-600">{item.amount}</td>
                            <td className="p-3 text-right font-bold text-emerald-600 font-arabic">{item.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Tableau CGA 03: Frozen Contracts */}
                <Card className="p-6 border-slate-200 dark:border-slate-800 rounded-2xl bg-emerald-50/30 dark:bg-emerald-950/10 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white font-arabic">معطيات حول العقود المجمدة (Tableau 03: Contrats Gelés Sanctions)</h4>
                    <p className="text-[11px] text-muted-foreground mt-1">Conformément aux directives de la CNLCT et du Conseil de Sécurité des Nations Unies</p>
                  </div>
                  <Badge className="bg-emerald-600 text-white font-black px-4 py-2 text-xs">
                    NÉANT (0 Contrat Gelé en 2024)
                  </Badge>
                </Card>
              </div>
            </TabsContent>

            {/* ── TAB 2: MATRICE RISQUES & ANALYTICS ── */}
            <TabsContent value="risk_analytics" className="p-8 space-y-8 focus:outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Visual Chart: Inherent vs Residual */}
                <Card className="p-6 border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-indigo-600" /> Comparatif Risque Inhérent vs Résiduel
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

            {/* ── TAB 3: NETWORK LAB-FT & CTAF ── */}
            <TabsContent value="network_labft" className="p-8 space-y-6 focus:outline-none">
              <Card className="p-6 border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-rose-600" /> Cartographie des Agences par Niveau de Risque LAB-FT
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {mockGovernoratesList.map((gov, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{gov.name}</span>
                        <Badge variant="outline" className="text-[9px] font-black">{gov.agencies.length} Agences</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Score Vulnérabilité : <span className="font-bold text-slate-700 dark:text-slate-300">{gov.vulnerabilityScore} / 10</span></p>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            {/* ── TAB 4: BILAN FORMATIONS ── */}
            <TabsContent value="training_detail" className="p-8 space-y-6 focus:outline-none">
              <Card className="p-6 border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-emerald-600" /> Bilan des Formations Métiers LAB-FT (Sessions 2024)
                  </h3>
                  <Badge className="bg-emerald-600 text-white font-black text-xs">100% Programme Exécuté</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-950 uppercase text-[10px] font-black text-slate-400">
                      <tr>
                        <th className="p-3">Session / Thème</th>
                        <th className="p-3">Formateur</th>
                        <th className="p-3 text-right">Participants</th>
                        <th className="p-3 text-right">Score QCM Moyen</th>
                        <th className="p-3 text-right">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {[
                        { title: "LBA/FT Tunis Sud & Banlieue", trainer: "Oussama Mergheni", count: 28, score: "92%", date: "28/10/2024" },
                        { title: "LBA/FT Tunis Nord & Courtiers", trainer: "Oussama Mergheni", count: 30, score: "89%", date: "30/10/2024" },
                        { title: "LBA/FT Cap Bon (Nabeul / Hammamet)", trainer: "Oussama Mergheni", count: 26, score: "94%", date: "31/10/2024" },
                        { title: "LBA/FT Sahel (Sousse / Monastir)", trainer: "Oussama Mergheni", count: 32, score: "91%", date: "05/11/2024" },
                        { title: "LBA/FT Sfax & Sud", trainer: "Oussama Mergheni", count: 22, score: "95%", date: "06/11/2024" },
                      ].map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{item.title} ({item.date})</td>
                          <td className="p-3 text-slate-600">{item.trainer}</td>
                          <td className="p-3 text-right font-black text-slate-700 dark:text-slate-300">{item.count}</td>
                          <td className="p-3 text-right font-black text-emerald-600">{item.score}</td>
                          <td className="p-3 text-right"><Badge className="bg-emerald-100 text-emerald-700 font-bold text-[9px]">Terminé QCM</Badge></td>
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
