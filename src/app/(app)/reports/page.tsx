"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BarChart3, Filter, ShieldAlert, Users, MessageSquareWarning, ChevronRight, Check,
  AlertTriangle, Globe2, ShieldCheck, GraduationCap, Building2, Landmark, Printer,
  FileSpreadsheet, FileText, Eye, CheckCircle2, Plus, Trash2, RefreshCw, Layers,
  Calendar, Pencil, X, Save, Info
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useRiskMapping } from "@/contexts/RiskMappingContext";
import { Logo } from "@/components/icons/Logo";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from "xlsx";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface Table01Row {
  id: string;
  level: string;
  count: number | string;
  integrated: number | string;
  p1: number | string;
  p2: number | string;
  p3: number | string;
  pct: string;
}

interface StrRow {
  id: number;
  channel: string;
  type: string;
  amount: string;
  status: string;
}

interface TrainingRow {
  title: string;
  trainer: string;
  count: number;
  score: string;
  date: string;
}

interface ProcedureCheck {
  label: string;
  checked: boolean;
}

interface RealisationItem {
  id: string;
  title: string;
  description: string;
}

interface ExerciceData {
  boardApprovalDate: string;
  frozenContractsCount: number;
  strList: StrRow[];
  trainingList: TrainingRow[];
  procedureChecks: ProcedureCheck[];
  realisations: RealisationItem[];
  table01: Table01Row[];
}

// ─────────────────────────────────────────────────────────────────────────────
// MODÈLES DE RAPPORT EN FRANÇAIS
// ─────────────────────────────────────────────────────────────────────────────
const reportTemplates = [
  {
    id: "cga_annual",
    title: "Générateur Officiel CGA",
    subtitle: "Rapport Annuel de Conformité CGA",
    description: "Générateur dynamique du rapport annuel officiel conforme aux circulaires de la CGA et de la CTAF.",
    icon: Landmark,
    badge: "Réglementaire CGA Assurances",
    tabLabel: "Rapport Officiel CGA",
    defaultTab: "cga_official",
  },
  {
    id: "compliance_summary",
    title: "Baromètre Mensuel GRC",
    subtitle: "Synthèse Exécutive de Conformité",
    description: "Audit synthétique des flux de conformité, score global GRC et état de la gouvernance.",
    icon: BarChart3,
    badge: "Exécutif & Gouvernance",
    tabLabel: "Analyse GRC",
    defaultTab: "risk_analytics",
  },
  {
    id: "lab_ft_activity",
    title: "Vigilance LAB-FT",
    subtitle: "Anti-Blanchiment & Filtrage PEP",
    description: "Cartographie de vulnérabilité du réseau d'agences, notifications CTAF/GAFI et filtrage PEP.",
    icon: ShieldAlert,
    badge: "Prudentiel & Agences",
    tabLabel: "Réseau & LAB-FT",
    defaultTab: "network_labft",
  },
  {
    id: "training_status",
    title: "Matrice des Compétences",
    subtitle: "Formations & Habilitations Métiers",
    description: "Suivi des formations réglementaires, taux de participation et résultats QCM des équipes.",
    icon: Users,
    badge: "Ressources Humaines",
    tabLabel: "Bilan Formations",
    defaultTab: "training_detail",
  },
  {
    id: "audit_trail",
    title: "Piste d'Audit & Contrôle",
    subtitle: "Rapprochements & Inspection Interne",
    description: "Rapprochement des bases tiers, échantillonnage de contrôle et traçabilité des dossiers.",
    icon: Layers,
    badge: "Contrôle Interne",
    tabLabel: "Audit & Contrôle",
    defaultTab: "risk_analytics",
  },
  {
    id: "incident_report",
    title: "Analyse d'Incidents & Crises",
    subtitle: "Gestion des Ruptures de Conformité",
    description: "Détection des ruptures de conformité, alertes critiques et remédiations d'urgence.",
    icon: MessageSquareWarning,
    badge: "Gestion des Risques",
    tabLabel: "Incidents & Crises",
    defaultTab: "risk_analytics",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DONNÉES INITIALES PAR EXERCICE
// ─────────────────────────────────────────────────────────────────────────────
const PROCEDURE_ITEMS = [
  "Vérification d'identité & KYC Client",
  "Identification du Bénéficiaire Effectif",
  "Délais de mise à jour des dossiers par niveau de risque",
  "Surveillance des opérations non habituelles",
  "Procédure de Déclaration de Soupçon (STR)",
  "Mesures de Gel & Levée de Gel des avoirs",
  "Conservation des dossiers (Archivage LBA)",
];

const REF_REALISATIONS_2024: RealisationItem[] = [
  { id: "r1", title: "Refonte Système IT RegTools LBA/FT", description: "Mise en place et enrichissement de la plateforme RegTools basée sur le screening IA pour l'identification des opérations douteuses et la vérification automatisée des tiers (NS, PEP, CTAF)." },
  { id: "r2", title: "Mise à jour du Manuel de Procédure (CA 09/10/2024)", description: "Approbation par le Conseil d'Administration du Manuel de Procédure intégrant le KYC renforcé, le Bénéficiaire Effectif, les délais de révision et les déclarations STR." },
  { id: "r3", title: "Lancement de ProAssur Vie & Filtre PPE GO-AML", description: "Activation du module ProAssur Vie avec filtrage automatique des Personnes Politiquement Exposées (PPE) et connexion au portail GO-AML de la CTAF." },
];

const REF_TABLE01_2024: Table01Row[] = [
  { id: "t1", level: "مخاطر منخفضة (Risque Faible)", count: 12782, integrated: 134016, p1: 1677, p2: 3355, p3: 3355, pct: "37.16%" },
  { id: "t2", level: "مخاطر متوسطة (Risque Moyen)", count: 20383, integrated: 78605, p1: 25519, p2: 19139, p3: 19139, pct: "21.79%" },
  { id: "t3", level: "مخاطر مرتفعة (Risque Élevé)", count: 3693, integrated: 5580, p1: 54729, p2: 41047, p3: 41047, pct: "1.54%" },
];

const REF_STR_2024: StrRow[] = [
  { id: 1, channel: "نيابة تأمين (Agence Sousse)", type: "عقد تأمين السيارة", amount: "4,445.360 DT", status: "تصريح بشبهة (GO-AML)" },
  { id: 2, channel: "فرع التعاونية (Branch Sousse 2)", type: "عقد تأمين سيارة", amount: "15,186.188 DT", status: "تصريح بشبهة (GO-AML)" },
];

const REF_TRAININGS_2024: TrainingRow[] = [
  { title: "LBA/FT Tunis Sud & Banlieue", trainer: "Oussama Mergheni", count: 28, score: "92%", date: "28/10/2024" },
  { title: "LBA/FT Tunis Nord & Courtiers", trainer: "Oussama Mergheni", count: 30, score: "89%", date: "30/10/2024" },
  { title: "LBA/FT Cap Bon (Nabeul / Hammamet)", trainer: "Oussama Mergheni", count: 26, score: "94%", date: "31/10/2024" },
  { title: "LBA/FT Sahel (Sousse / Monastir)", trainer: "Oussama Mergheni", count: 32, score: "91%", date: "05/11/2024" },
  { title: "LBA/FT Sfax & Sud", trainer: "Oussama Mergheni", count: 22, score: "95%", date: "06/11/2024" },
];

const getInitialExerciceData = (year: string): ExerciceData => {
  const isRef = year === "2024";
  return {
    boardApprovalDate: isRef ? "09/10/2024" : "",
    frozenContractsCount: 0,
    strList: isRef ? REF_STR_2024 : [],
    trainingList: isRef ? REF_TRAININGS_2024 : [],
    procedureChecks: PROCEDURE_ITEMS.map((label) => ({ label, checked: isRef })),
    realisations: isRef
      ? REF_REALISATIONS_2024
      : [{ id: "r_new", title: "", description: "" }],
    table01: isRef
      ? REF_TABLE01_2024
      : [
          { id: "t1", level: "مخاطر منخفضة (Risque Faible)", count: "", integrated: "", p1: "", p2: "", p3: "", pct: "" },
          { id: "t2", level: "مخاطر متوسطة (Risque Moyen)", count: "", integrated: "", p1: "", p2: "", p3: "", pct: "" },
          { id: "t3", level: "مخاطر مرتفعة (Risque Élevé)", count: "", integrated: "", p1: "", p2: "", p3: "", pct: "" },
        ],
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GOUVERNORATS
// ─────────────────────────────────────────────────────────────────────────────
const mockGovernoratesList = [
  { name: "Tunis", vulnerabilityScore: 4.2, agencies: 3 },
  { name: "Sousse", vulnerabilityScore: 7.8, agencies: 3 },
  { name: "Sfax", vulnerabilityScore: 6.5, agencies: 3 },
  { name: "Nabeul", vulnerabilityScore: 5.1, agencies: 2 },
  { name: "Bizerte", vulnerabilityScore: 4.8, agencies: 2 },
  { name: "Béja", vulnerabilityScore: 5.4, agencies: 2 },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { risks } = useRiskMapping();

  const [selectedReport, setSelectedReport] = React.useState<string>("cga_annual");
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>("2026");
  const [activeTab, setActiveTab] = React.useState<string>("cga_official");

  // Données par exercice (store isolé)
  const [exerciceStore, setExerciceStore] = React.useState<Record<string, ExerciceData>>({
    "2024": getInitialExerciceData("2024"),
    "2025": getInitialExerciceData("2025"),
    "2026": getInitialExerciceData("2026"),
  });

  const data = exerciceStore[selectedPeriod];

  const updateData = React.useCallback(
    (patch: Partial<ExerciceData>) => {
      setExerciceStore((prev) => ({
        ...prev,
        [selectedPeriod]: { ...prev[selectedPeriod], ...patch },
      }));
    },
    [selectedPeriod]
  );

  // Date du jour
  const todayFormatted = React.useMemo(
    () => new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }),
    []
  );

  const isCurrentYear = selectedPeriod === "2026";

  // Moteur sélectionné
  const currentTemplate = reportTemplates.find((t) => t.id === selectedReport) || reportTemplates[0];

  // CTAF : Risques "Pays" réels de la Matrice des Risques
  const safeRisks = Array.isArray(risks) ? risks : [];
  const countryRisks = safeRisks.filter(
    (r) =>
      r.category?.toLowerCase().includes("pays") ||
      r.riskDescription?.toLowerCase().includes("pays") ||
      r.category?.toLowerCase().includes("country")
  );

  // Notifications CTAF statiques (base documentaire officielle) enrichies par la matrice
  const ctafNotifications = React.useMemo(() => {
    const base = [
      {
        ref: `اشعار 223/${selectedPeriod} (04/03/${selectedPeriod})`,
        highRisk: "Myanmar, Iran, Corée du Nord",
        monitored: "Namibie, Kenya",
        removed: "Barbade, Ouganda, Gibraltar",
      },
      {
        ref: `اشعار 232/${selectedPeriod} (02/07/${selectedPeriod})`,
        highRisk: "Myanmar, Iran, Corée du Nord",
        monitored: "Monaco, Vénézuéla",
        removed: "Turquie, Jamaïque",
      },
      {
        ref: `اشعار 237/${selectedPeriod} (28/10/${selectedPeriod})`,
        highRisk: "Myanmar, Iran, Corée du Nord",
        monitored: "Algérie, Liban, Côte d'Ivoire, Angola",
        removed: "Sénégal",
      },
    ];
    return base;
  }, [selectedPeriod]);

  // Graphiques
  const riskChartData = React.useMemo(() => {
    if (!safeRisks.length) {
      return [
        { name: "Produits", inherent: 16, residual: 8 },
        { name: "Canaux", inherent: 12, residual: 6 },
        { name: "Pays", inherent: 20, residual: 5 },
        { name: "Clientèle", inherent: 15, residual: 9 },
      ];
    }
    return safeRisks.slice(0, 8).map((r, i) => ({
      name: `R${i + 1}`,
      inherent: r.probabilite * r.impact || 12,
      residual: (r.dmrEfficiency || 2) * (r.dmrProbability || 2) || 6,
    }));
  }, [safeRisks]);

  const agencyRiskDistribution = [
    { name: "Risque Élevé", value: 3, color: "#ef4444" },
    { name: "Risque Moyen", value: 6, color: "#f59e0b" },
    { name: "Risque Faible", value: 6, color: "#10b981" },
  ];

  // Modals
  const [isAddStrOpen, setIsAddStrOpen] = React.useState(false);
  const [newStr, setNewStr] = React.useState({ channel: "", type: "عقد تأمين السيارة", amount: "" });

  const [isAddTrainingOpen, setIsAddTrainingOpen] = React.useState(false);
  const [newTraining, setNewTraining] = React.useState({
    title: "",
    trainer: "Oussama Mergheni",
    count: 25,
    score: "90%",
    date: todayFormatted,
  });

  // Édition réalisation
  const [editingRealisationId, setEditingRealisationId] = React.useState<string | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddStr = () => {
    if (!newStr.channel) return;
    updateData({
      strList: [
        ...data.strList,
        { id: data.strList.length + 1, channel: newStr.channel, type: newStr.type, amount: newStr.amount || "0 DT", status: "تصريح بشبهة (GO-AML)" },
      ],
    });
    setNewStr({ channel: "", type: "عقد تأمين السيارة", amount: "" });
    setIsAddStrOpen(false);
  };

  const handleDeleteStr = (id: number) => {
    updateData({ strList: data.strList.filter((s) => s.id !== id) });
  };

  const handleAddTraining = () => {
    if (!newTraining.title) return;
    updateData({ trainingList: [...data.trainingList, { ...newTraining }] });
    setNewTraining({ title: "", trainer: "Oussama Mergheni", count: 25, score: "90%", date: todayFormatted });
    setIsAddTrainingOpen(false);
  };

  const handleDeleteTraining = (idx: number) => {
    updateData({ trainingList: data.trainingList.filter((_, i) => i !== idx) });
  };

  const handleToggleProcedure = (idx: number) => {
    const updated = data.procedureChecks.map((p, i) =>
      i === idx ? { ...p, checked: !p.checked } : p
    );
    updateData({ procedureChecks: updated });
  };

  // Table 01 cell edit
  const handleTable01Cell = (rowId: string, field: keyof Table01Row, value: string) => {
    updateData({
      table01: data.table01.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)),
    });
  };

  // Réalisation CRUD
  const handleAddRealisation = () => {
    updateData({
      realisations: [
        ...data.realisations,
        { id: `r_${Date.now()}`, title: "", description: "" },
      ],
    });
  };

  const handleUpdateRealisation = (id: string, field: "title" | "description", value: string) => {
    updateData({
      realisations: data.realisations.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    });
  };

  const handleDeleteRealisation = (id: string) => {
    updateData({ realisations: data.realisations.filter((r) => r.id !== id) });
  };

  // ── Export Word CGA ────────────────────────────────────────────────────────
  const handleExportWordCGA = () => {
    const dateMention = isCurrentYear
      ? `Données arrêtées à la date du jour (${todayFormatted})`
      : `Statistiques arrêtées au 31/12/${selectedPeriod}`;

    const realisationsHtml = data.realisations
      .filter((r) => r.title || r.description)
      .map(
        (r, i) => `<p><strong>${i + 1}. ${r.title}</strong><br/>${r.description}</p>`
      )
      .join("");

    const proceduresHtml = data.procedureChecks
      .map(
        (p) =>
          `<tr><td>${p.label}</td><td style="text-align:center; font-size:14pt;">${p.checked ? "✔" : "☐"}</td></tr>`
      )
      .join("");

    const table01Html = data.table01
      .map(
        (r) =>
          `<tr><td>${r.level}</td><td>${r.count || "—"}</td><td>${r.integrated || "—"}</td><td>${r.p1 || "—"}</td><td>${r.p2 || "—"}</td><td>${r.p3 || "—"}</td><td>${r.pct || "—"}</td></tr>`
      )
      .join("");

    const strHtml = data.strList.length
      ? data.strList
          .map(
            (s) =>
              `<tr><td>${s.id}</td><td>${s.channel}</td><td>${s.type}</td><td>${s.amount}</td><td>${s.status}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="5" style="text-align:center;">Aucune déclaration pour l'exercice ${selectedPeriod}</td></tr>`;

    const wordContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Rapport Annuel CGA MAE ${selectedPeriod}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.6; }
          h1 { color: #d97706; font-size: 18pt; text-align: center; }
          h2 { color: #0f172a; font-size: 13pt; border-bottom: 2px solid #d97706; padding-bottom: 4px; margin-top: 24px; }
          h3 { color: #334155; font-size: 11pt; margin-top: 16px; }
          .arabic { direction: rtl; text-align: right; }
          .date-badge { background: #d97706; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 9pt; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 16px; }
          th { background: #0f172a; color: #fff; padding: 7px; border: 1px solid #334155; font-size: 9pt; }
          td { padding: 7px; border: 1px solid #cbd5e1; font-size: 9pt; }
        </style>
      </head>
      <body>
        <table style="width:100%;border:none;margin-bottom:20px;">
          <tr style="border:none;">
            <td style="border:none;width:100px;">
              <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/mae_logo.png" width="80" alt="MAE Logo" />
            </td>
            <td style="border:none;text-align:center;">
              <h1 style="margin:0;color:#92400e;">MUTUELLE ASSURANCE DE L'ENSEIGNEMENT (MAE)</h1>
              <p class="arabic" style="font-size:13pt;margin:6px 0;font-weight:bold;">
                تقرير سنوي موجه للهيئة العامة للتأمين حول منظومة مكافحة الإرهاب ومنع غسل الأموال (سنة ${selectedPeriod})
              </p>
              <span class="date-badge">${dateMention}</span>
            </td>
          </tr>
        </table>

        <h2>I. حوصلة للأعمال المنجزة خلال السنة المنقضية (Réalisations ${selectedPeriod})</h2>
        ${realisationsHtml || "<p><em>Aucune réalisation saisie pour cet exercice.</em></p>"}

        <h2>II. تقييم مدى امتثال منظومة مكافحة الإرهاب ومنع غسل الأموال</h2>
        <h3>1. Évaluation des الإجراءات الداخلية (Procédures)</h3>
        <table>
          <thead><tr><th>Point de Contrôle</th><th>Statut</th></tr></thead>
          <tbody>${proceduresHtml}</tbody>
        </table>

        <h3>2. Suivi Continu des Notifications CTAF / GAFI (${selectedPeriod})</h3>
        ${ctafNotifications.map(n => `
          <p><strong>${n.ref}</strong> — Haut Risque : ${n.highRisk} — Surveillance : ${n.monitored} — Retrait : ${n.removed}</p>
        `).join("")}
        ${countryRisks.length > 0 ? `<p><em>Facteurs pays issus de la Matrice des Risques (mis à jour le ${todayFormatted}) : ${countryRisks.map(r => r.riskDescription || r.category).join(", ")}</em></p>` : ""}

        <h2>V. المالحق والجداول الترتيبية (Tableaux Officiels CGA)</h2>
        <h3>جدول عدد 01: رزنامة تحيين ملفات المنخرطين حسب درجة المخاطر</h3>
        <table>
          <thead><tr>
            <th>Niveau de Risque</th><th>Adhérents (${selectedPeriod})</th>
            <th>Intégrés Système</th><th>N+1</th><th>N+2</th><th>N+3</th><th>%</th>
          </tr></thead>
          <tbody>${table01Html}</tbody>
        </table>

        <h3>جدول عدد 02: معطيات حول التصاريح بالشبهة (STR GO-AML)</h3>
        <table>
          <thead><tr>
            <th>#</th><th>Canal / Agence</th><th>Branche</th><th>Montant</th><th>Statut</th>
          </tr></thead>
          <tbody>${strHtml}</tbody>
        </table>

        <h3>جدول عدد 03: معطيات حول العقود المجمدة</h3>
        <p>${data.frozenContractsCount === 0 ? `<strong>NÉANT</strong> — 0 contrat gelé pour l'exercice ${selectedPeriod}` : `${data.frozenContractsCount} contrat(s) gelé(s) recensé(s).`}</p>

        <br/><br/>
        <p style="text-align:right;font-weight:bold;">Fait à Tunis, le ${todayFormatted}</p>
        <p style="text-align:right;">Direction du Contrôle Interne — Mutuelle Assurance de l'Enseignement (MAE)</p>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + wordContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Rapport_Officiel_CGA_${selectedPeriod}_MAE.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Export Excel ───────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(
      data.table01.map((r) => ({
        "Niveau de Risque": r.level,
        "Adhérents": r.count,
        "Intégrés Système": r.integrated,
        "N+1": r.p1,
        "N+2": r.p2,
        "N+3": r.p3,
        "%": r.pct,
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws1, `Tableau_01_${selectedPeriod}`);
    const ws2 = XLSX.utils.json_to_sheet(data.strList);
    XLSX.utils.book_append_sheet(wb, ws2, `STR_GO_AML_${selectedPeriod}`);
    const ws3 = XLSX.utils.json_to_sheet(data.trainingList);
    XLSX.utils.book_append_sheet(wb, ws3, `Formations_${selectedPeriod}`);
    XLSX.writeFile(wb, `Rapport_CGA_${selectedPeriod}_MAE.xlsx`);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-10 pb-24">

      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Logo className="h-8 w-8" />
            <Badge variant="outline" className="border-amber-500/50 text-amber-600 bg-amber-50 dark:bg-amber-950/30 text-[10px] font-black uppercase tracking-widest">
              MAE ASSURANCE • CONFORMITÉ GRC
            </Badge>
            {isCurrentYear ? (
              <Badge className="bg-amber-600 text-white text-[9px] font-black flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Données arrêtées à la date du jour ({todayFormatted})
              </Badge>
            ) : (
              <Badge className="bg-slate-600 text-white text-[9px] font-black">
                Exercice Référence {selectedPeriod}
              </Badge>
            )}
          </div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic leading-none">
            {currentTemplate.title} <span className="text-primary">({selectedPeriod})</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl font-medium">
            {currentTemplate.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleExportWordCGA} className="h-11 px-5 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-black text-xs uppercase tracking-wider gap-2">
            <FileText className="h-4 w-4" /> Export Word (.doc) Trame CGA
          </Button>
          <Button onClick={handleExportExcel} className="h-11 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Export Excel (.xlsx)
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="h-11 px-5 rounded-2xl font-bold text-xs gap-2">
            <Printer className="h-4 w-4 text-primary" /> Imprimer / PDF
          </Button>
        </div>
      </div>

      {/* ── SÉLECTEUR MOTEUR + EXERCICE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 6 Vecteurs de reporting */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
          {reportTemplates.map((template) => {
            const Icon = template.icon;
            const isSelected = selectedReport === template.id;
            return (
              <Card
                key={template.id}
                onClick={() => {
                  setSelectedReport(template.id);
                  setActiveTab(template.defaultTab);
                }}
                className={cn(
                  "cursor-pointer transition-all duration-300 border-none shadow-md hover:shadow-xl hover:-translate-y-0.5 p-5 rounded-3xl",
                  isSelected
                    ? "bg-slate-900 text-white ring-4 ring-primary/30 shadow-2xl"
                    : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className={cn("p-2.5 rounded-xl", isSelected ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-primary")}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-emerald-400" />}
                </div>
                <h3 className={cn("text-sm font-black uppercase tracking-tight leading-tight", isSelected ? "text-white" : "text-slate-900 dark:text-white")}>
                  {template.title}
                </h3>
                <p className={cn("text-[10px] font-bold mt-1", isSelected ? "text-amber-300" : "text-primary")}>
                  {template.subtitle}
                </p>
              </Card>
            );
          })}
        </div>

        {/* Paramètres de l'exercice */}
        <Card className="p-6 shadow-lg border-none bg-white dark:bg-slate-900 rounded-3xl space-y-5">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-amber-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Paramètres de l'Exercice</h3>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exercice Généré</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-black text-sm text-amber-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="2026" className="font-bold text-sm">⚡ Exercice en cours 2026</SelectItem>
                <SelectItem value="2025" className="font-bold text-sm">Exercice 2025</SelectItem>
                <SelectItem value="2024" className="font-bold text-sm">📁 Exercice Référence 2024</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isCurrentYear && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 flex-shrink-0" />
                Exercice en cours — les statistiques sont à saisir manuellement par le responsable Compliance.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date CA Approbation Procédures</Label>
            <Input
              value={data.boardApprovalDate}
              onChange={(e) => updateData({ boardApprovalDate: e.target.value })}
              placeholder="JJ/MM/AAAA"
              className="h-10 rounded-xl text-sm font-bold"
            />
          </div>

          <Button onClick={handleExportWordCGA} className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs gap-2">
            <FileText className="h-4 w-4" /> Générer Word (.doc) CGA
          </Button>
        </Card>
      </div>

      {/* ── KPI WIDGETS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none p-6 rounded-3xl shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rapport Actif</p>
              <h4 className="text-lg font-black italic tracking-tight text-amber-400 mt-1 leading-tight">{currentTemplate.title}</h4>
              <p className="text-[11px] text-slate-400 mt-1">{currentTemplate.badge}</p>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl"><ShieldCheck className="h-6 w-6 text-emerald-400" /></div>
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-none p-6 rounded-3xl shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Déclarations STR GO-AML</p>
              <h4 className="text-3xl font-black italic tracking-tight text-rose-600 mt-1">{data.strList.length}</h4>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-2xl text-rose-600"><ShieldAlert className="h-6 w-6" /></div>
          </div>
          <p className="text-[11px] font-bold text-muted-foreground mt-3 flex items-center gap-1">
            {data.strList.length === 0 ? (
              <><Info className="h-3.5 w-3.5 text-amber-500" /> À saisir pour {selectedPeriod}</>
            ) : (
              <><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Enregistrées au portail CTAF</>
            )}
          </p>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-none p-6 rounded-3xl shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Procédures Validées</p>
              <h4 className="text-3xl font-black italic tracking-tight text-indigo-600 mt-1">
                {data.procedureChecks.filter((p) => p.checked).length}/{data.procedureChecks.length}
              </h4>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl text-indigo-600"><CheckCircle2 className="h-6 w-6" /></div>
          </div>
          <Progress value={(data.procedureChecks.filter((p) => p.checked).length / data.procedureChecks.length) * 100} className="h-2 mt-3" />
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-none p-6 rounded-3xl shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Formations {selectedPeriod}</p>
              <h4 className="text-3xl font-black italic tracking-tight text-emerald-600 mt-1">
                {data.trainingList.reduce((a, t) => a + t.count, 0)} Part.
              </h4>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl text-emerald-600"><GraduationCap className="h-6 w-6" /></div>
          </div>
          <p className="text-[11px] font-bold text-emerald-600 mt-3 flex items-center gap-1">
            <Check className="h-3.5 w-3.5" /> {data.trainingList.length} Sessions accomplies
          </p>
        </Card>
      </div>

      {/* ── TABLEAU DE BORD INTERACTIF PRINCIPAL ── */}
      <Card className="shadow-2xl border-none bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="p-6 pb-0 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 overflow-x-auto">
            <TabsList className="h-14 p-1.5 bg-slate-200/60 dark:bg-slate-800/60 rounded-2xl gap-2 w-max">
              <TabsTrigger value="cga_official" className="rounded-xl font-black text-xs uppercase px-5 tracking-wider gap-2 whitespace-nowrap">
                <Landmark className="h-4 w-4 text-amber-600" /> {currentTemplate.tabLabel} ({selectedPeriod})
              </TabsTrigger>
              <TabsTrigger value="risk_analytics" className="rounded-xl font-black text-xs uppercase px-5 tracking-wider gap-2 whitespace-nowrap">
                <BarChart3 className="h-4 w-4 text-indigo-600" /> Matrice & Profil Risques
              </TabsTrigger>
              <TabsTrigger value="network_labft" className="rounded-xl font-black text-xs uppercase px-5 tracking-wider gap-2 whitespace-nowrap">
                <Building2 className="h-4 w-4 text-rose-600" /> Vulnérabilité Réseau & CTAF
              </TabsTrigger>
              <TabsTrigger value="training_detail" className="rounded-xl font-black text-xs uppercase px-5 tracking-wider gap-2 whitespace-nowrap">
                <GraduationCap className="h-4 w-4 text-emerald-600" /> Formations ({data.trainingList.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: RAPPORT OFFICIEL CGA — ENTIÈREMENT ÉDITABLE PAR EXERCICE
              ══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="cga_official" className="p-8 space-y-10 focus:outline-none">

            {/* En-tête officiel avec logo MAE */}
            <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <Logo className="h-14 w-14 shadow-md rounded-full bg-white p-1" />
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      Mutuelle Assurance de l'Enseignement (MAE)
                    </h3>
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400" dir="rtl">
                      تقرير سنوي موجه للهيئة العامة للتأمين حول منظومة مكافحة الإرهاب ومنع غسل الأموال (سنة {selectedPeriod})
                    </p>
                    <div className="mt-1">
                      {isCurrentYear ? (
                        <Badge className="bg-amber-600 text-white font-black text-[10px]">
                          Données arrêtées à la date du jour ({todayFormatted})
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-700 text-white font-black text-[10px]">
                          Statistiques arrêtées au 31/12/{selectedPeriod}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button onClick={handleExportWordCGA} className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-4 rounded-xl gap-2">
                  <FileText className="h-4 w-4" /> Export Word (.doc)
                </Button>
              </div>
            </div>

            {/* ── SECTION I: RÉALISATIONS ÉDITABLES ── */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <Badge className="bg-amber-600 text-white font-black text-sm px-3">I</Badge>
                  <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white" dir="rtl">
                    حوصلة للأعمال المنجزة خلال السنة المنقضية (Réalisations {selectedPeriod})
                  </h3>
                </div>
                <Button size="sm" onClick={handleAddRealisation} className="h-8 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs gap-1">
                  <Plus className="h-3.5 w-3.5" /> Ajouter
                </Button>
              </div>

              {isCurrentYear && data.realisations.every((r) => !r.title && !r.description) && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex items-center gap-3">
                  <Info className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                    Aucune réalisation saisie pour l'exercice {selectedPeriod}. Cliquez sur « Ajouter » pour renseigner les travaux accomplis.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.realisations.map((r, idx) => (
                  <div key={r.id} className="relative group">
                    {editingRealisationId === r.id ? (
                      <Card className="p-4 border-primary/40 rounded-2xl space-y-3 shadow-md">
                        <Input
                          value={r.title}
                          onChange={(e) => handleUpdateRealisation(r.id, "title", e.target.value)}
                          placeholder={`Titre de la réalisation ${idx + 1}...`}
                          className="rounded-xl font-bold text-sm"
                        />
                        <Textarea
                          value={r.description}
                          onChange={(e) => handleUpdateRealisation(r.id, "description", e.target.value)}
                          placeholder="Description détaillée de la réalisation..."
                          rows={3}
                          className="rounded-xl text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => setEditingRealisationId(null)} className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1">
                            <Save className="h-3.5 w-3.5" /> Enregistrer
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteRealisation(r.id)} className="h-8 rounded-xl text-rose-500 hover:bg-rose-50 font-bold text-xs gap-1">
                            <Trash2 className="h-3.5 w-3.5" /> Supprimer
                          </Button>
                        </div>
                      </Card>
                    ) : (
                      <Card className="p-5 border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 space-y-2 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                            <span>{r.title || <span className="text-slate-400 italic font-normal">Titre à saisir...</span>}</span>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => setEditingRealisationId(r.id)} className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-primary">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                          {r.description || <span className="italic">Description à saisir — cliquez sur le crayon pour éditer.</span>}
                        </p>
                      </Card>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── SECTION II: PROCÉDURES + SEUILS ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <Badge className="bg-amber-600 text-white font-black text-sm px-3">II</Badge>
                <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white" dir="rtl">
                  تقييم مدى امتثال منظومة مكافحة الإرهاب ومنع غسل الأموال (Contrôle Interne {selectedPeriod})
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Checkboxes procédures — INTERACTIVES ET PERSISTANTES PAR EXERCICE */}
                <Card className="p-6 border-slate-200 dark:border-slate-800 rounded-2xl">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                    1. ÉVALUATION DES الإجراءات الداخلية (PROCÉDURES)
                  </h4>
                  <p className="text-[10px] text-muted-foreground mb-4">
                    Date d'Approbation CA :
                    <span className="font-bold text-amber-600 ml-1">{data.boardApprovalDate || "À renseigner"}</span>
                  </p>
                  <div className="space-y-2">
                    {data.procedureChecks.map((proc, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleToggleProcedure(idx)}
                        className={cn(
                          "w-full flex items-center justify-between text-[11px] font-medium border rounded-xl px-3 py-2.5 transition-all",
                          proc.checked
                            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                            : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                        )}
                      >
                        <span>• {proc.label}</span>
                        <div className={cn(
                          "h-5 w-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all",
                          proc.checked
                            ? "bg-emerald-600 border-emerald-600"
                            : "border-slate-300 dark:border-slate-600"
                        )}>
                          {proc.checked && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>

                {/* Grille des seuils */}
                <Card className="p-6 border-slate-200 dark:border-slate-800 rounded-2xl">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-4">2. GRILLE DES SEUILS MATRICE DES RISQUES</h4>
                  <div className="space-y-4">
                    {[
                      { label: "Risque Élevé (المخاطر المرتفعة)", range: "Score ≥ 70%", note: "Diligences Renforcées — Article 7 CGA 2019", color: "rose" },
                      { label: "Risque Moyen (المخاطر المتوسطة)", range: "50% ≤ Score < 70%", note: "Diligences Spécifiques — Article 6 CGA 2019", color: "amber" },
                      { label: "Risque Faible (المخاطر البسيطة)", range: "Score < 50%", note: "Diligences Standard simplifiées", color: "emerald" },
                    ].map((s, i) => (
                      <div key={i} className={cn(
                        "p-4 rounded-xl border space-y-1",
                        s.color === "rose" && "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800",
                        s.color === "amber" && "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
                        s.color === "emerald" && "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
                      )}>
                        <div className={cn("flex justify-between font-black text-xs",
                          s.color === "rose" && "text-rose-700 dark:text-rose-300",
                          s.color === "amber" && "text-amber-700 dark:text-amber-300",
                          s.color === "emerald" && "text-emerald-700 dark:text-emerald-300",
                        )}>
                          <span>{s.label}</span><span>{s.range}</span>
                        </div>
                        <p className={cn("text-[10px] font-medium",
                          s.color === "rose" && "text-rose-600",
                          s.color === "amber" && "text-amber-600",
                          s.color === "emerald" && "text-emerald-600",
                        )}>{s.note}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* CTAF depuis Matrice des Risques */}
              <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                    <Globe2 className="h-4 w-4" /> SUIVI CONTINU DES NOTIFICATIONS CTAF / GAFI ({selectedPeriod})
                  </h4>
                  <Badge variant="outline" className="border-amber-400 text-amber-400 text-[9px] font-black">Relié à la Matrice des Risques</Badge>
                </div>

                {countryRisks.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <p className="text-[10px] font-bold text-amber-300 mb-2">
                      🔗 Facteurs Risques « Pays » mis à jour dans la Matrice des Risques :
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {countryRisks.map((r, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1">
                          <span className="text-[10px] font-bold text-white">{r.riskDescription || r.category}</span>
                          {r.lastUpdated && (
                            <span className="text-[9px] text-slate-400">• modifié le {r.lastUpdated}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {ctafNotifications.map((notif, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                      <Badge className="bg-amber-500/20 text-amber-300 font-bold text-[10px]">{notif.ref}</Badge>
                      <p className="font-bold text-slate-200">Haut Risque : <span className="text-rose-400 font-normal">{notif.highRisk}</span></p>
                      <p className="text-slate-400">Surveillance : <span className="text-slate-300">{notif.monitored}</span></p>
                      <p className="text-slate-400">Retrait liste : <span className="text-emerald-400">{notif.removed}</span></p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── SECTION V: TABLEAUX OFFICIELS CGA ── */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <Badge className="bg-amber-600 text-white font-black text-sm px-3">V</Badge>
                <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white" dir="rtl">
                  المالحق والجداول الترتيبية (Tableaux Officiels CGA — Exercice {selectedPeriod})
                </h3>
              </div>

              {/* ─── TABLEAU 01 : ÉDITABLE PAR CELLULE ─── */}
              <Card className="border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-md">
                <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-amber-400" dir="rtl">
                      جدول عدد 01: رزنامة تحيين ملفات المنخرطين حسب درجة المخاطر ({selectedPeriod})
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
                      {isCurrentYear
                        ? "⚠️ Exercice en cours — cliquez sur une cellule pour saisir les données"
                        : "Données de référence — cliquez sur une cellule pour modifier"}
                    </p>
                  </div>
                  <Badge className="bg-amber-500 text-slate-900 font-black">Circulaire CGA Art 33</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 uppercase text-[10px] font-black text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-3">Niveau de Risque</th>
                        <th className="p-3 text-right">Adhérents ({selectedPeriod})</th>
                        <th className="p-3 text-right">Intégrés Système</th>
                        <th className="p-3 text-right">Année N+1</th>
                        <th className="p-3 text-right">Année N+2</th>
                        <th className="p-3 text-right">Année N+3</th>
                        <th className="p-3 text-right">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.table01.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/50">
                          <td className="p-3 font-bold text-slate-900 dark:text-white" dir="rtl">{row.level}</td>
                          {(["count", "integrated", "p1", "p2", "p3", "pct"] as const).map((field) => (
                            <td key={field} className="p-2 text-right">
                              <input
                                type="text"
                                value={row[field] as string}
                                onChange={(e) => handleTable01Cell(row.id, field, e.target.value)}
                                placeholder={isCurrentYear ? "—" : ""}
                                className={cn(
                                  "w-full text-right font-bold text-xs rounded-lg px-2 py-1.5 border focus:ring-2 focus:ring-primary/30 focus:outline-none transition-colors",
                                  row[field] === "" || row[field] === 0
                                    ? "border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700 text-amber-600 placeholder-amber-400"
                                    : "border-transparent bg-transparent text-slate-700 dark:text-slate-300"
                                )}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* ─── TABLEAU 02 : STR GO-AML ─── */}
              <Card className="border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white" dir="rtl">
                      معطيات حول التصاريح بالشبهة (Tableau 02: Declarations STR — GO AML {selectedPeriod})
                    </h4>
                    {isCurrentYear && data.strList.length === 0 && (
                      <p className="text-[10px] font-bold text-amber-600 mt-1 flex items-center gap-1">
                        <Info className="h-3 w-3" /> Exercice en cours — cliquez sur « + Ajouter STR » pour saisir les déclarations
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("font-black text-[10px]", data.strList.length > 0 ? "bg-rose-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300")}>
                      {data.strList.length} Déclaration(s)
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => setIsAddStrOpen(true)} className="h-8 rounded-xl font-bold text-xs gap-1">
                      <Plus className="h-3 w-3" /> Ajouter STR
                    </Button>
                  </div>
                </div>

                {data.strList.length === 0 ? (
                  <div className="p-8 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-sm font-bold text-slate-400">Aucune déclaration STR pour l'exercice {selectedPeriod}</p>
                    <Button size="sm" onClick={() => setIsAddStrOpen(true)} className="mt-3 h-8 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1">
                      <Plus className="h-3.5 w-3.5" /> Ajouter une déclaration
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-950 uppercase text-[10px] font-black text-slate-400">
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">Canal / Agence</th>
                          <th className="p-3">Branche Assurance</th>
                          <th className="p-3 text-right">Montant</th>
                          <th className="p-3 text-right">Statut GO-AML</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.strList.map((item) => (
                          <tr key={item.id}>
                            <td className="p-3 font-black text-slate-400">{item.id}</td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white" dir="rtl">{item.channel}</td>
                            <td className="p-3 text-slate-600" dir="rtl">{item.type}</td>
                            <td className="p-3 text-right font-black text-rose-600">{item.amount}</td>
                            <td className="p-3 text-right font-bold text-emerald-600" dir="rtl">{item.status}</td>
                            <td className="p-3 text-center">
                              <Button size="icon" variant="ghost" onClick={() => handleDeleteStr(item.id)} className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* ─── TABLEAU 03 : CONTRATS GELÉS ─── */}
              <Card className="p-6 border-slate-200 dark:border-slate-800 rounded-2xl bg-emerald-50/30 dark:bg-emerald-950/10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white" dir="rtl">
                      معطيات حول العقود المجمدة (Tableau 03: Contrats Gelés Sanctions {selectedPeriod})
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-1">CNLCT & Conseil de Sécurité des Nations Unies</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={0}
                      value={data.frozenContractsCount}
                      onChange={(e) => updateData({ frozenContractsCount: Number(e.target.value) })}
                      className="w-24 h-9 rounded-xl text-center font-black text-sm"
                    />
                    <Badge className={cn("font-black px-4 py-2 text-xs", data.frozenContractsCount === 0 ? "bg-emerald-600 text-white" : "bg-rose-600 text-white")}>
                      {data.frozenContractsCount === 0 ? `NÉANT (0 Gelé en ${selectedPeriod})` : `${data.frozenContractsCount} Contrat(s) Gelé(s)`}
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: MATRICE RISQUES & ANALYTICS
              ══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="risk_analytics" className="p-8 space-y-8 focus:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="p-6 border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-600" /> Risque Inhérent vs Résiduel ({selectedPeriod})
                </h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskChartData}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartsTooltip />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="inherent" name="Risque Inhérent" fill="#ef4444" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="residual" name="Risque Résiduel" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6 border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Filter className="h-4 w-4 text-emerald-600" /> Répartition Portefeuille par Niveau de Risque
                </h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={agencyRiskDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                        {agencyRiskDistribution.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Facteurs risques pays depuis la matrice */}
            {countryRisks.length > 0 && (
              <Card className="p-6 border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe2 className="h-4 w-4 text-rose-600" /> Facteurs de Risque « Pays » — Matrice des Risques (Mise à jour temps réel)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {countryRisks.map((r, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-1">
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{r.riskDescription}</p>
                      <div className="flex gap-2">
                        <Badge className={cn("text-[9px] font-black", r.riskLevel === "Élevé" ? "bg-rose-100 text-rose-700" : r.riskLevel === "Moyen" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
                          {r.riskLevel}
                        </Badge>
                        {r.lastUpdated && <span className="text-[9px] text-slate-400">modifié {r.lastUpdated}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3: VULNÉRABILITÉ RÉSEAU & CTAF
              ══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="network_labft" className="p-8 space-y-6 focus:outline-none">
            <Card className="p-6 border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-rose-600" /> Cartographie Réseau par Vulnérabilité LAB-FT ({selectedPeriod})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mockGovernoratesList.map((gov, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-sm text-slate-900 dark:text-white">{gov.name}</span>
                      <Badge variant="outline" className="text-[9px] font-black">{gov.agencies} Agences</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={(gov.vulnerabilityScore / 10) * 100} className={cn("h-2 flex-1", gov.vulnerabilityScore >= 7 ? "[&>div]:bg-rose-500" : gov.vulnerabilityScore >= 5 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500")} />
                      <span className={cn("text-xs font-black", gov.vulnerabilityScore >= 7 ? "text-rose-600" : gov.vulnerabilityScore >= 5 ? "text-amber-600" : "text-emerald-600")}>
                        {gov.vulnerabilityScore}/10
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════════
              TAB 4: FORMATIONS — ÉDITABLE
              ══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="training_detail" className="p-8 space-y-6 focus:outline-none">
            <Card className="p-6 border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-emerald-600" /> Bilan Formations Métiers LAB-FT ({selectedPeriod})
                  </h3>
                  {isCurrentYear && data.trainingList.length === 0 && (
                    <p className="text-[10px] text-amber-600 font-bold mt-1 flex items-center gap-1">
                      <Info className="h-3 w-3" /> Exercice en cours — saisissez les sessions réalisées
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white font-black text-xs">
                    {data.trainingList.reduce((a, t) => a + t.count, 0)} Participants
                  </Badge>
                  <Button size="sm" onClick={() => setIsAddTrainingOpen(true)} className="h-8 rounded-xl font-bold text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="h-3 w-3" /> Ajouter Session
                  </Button>
                </div>
              </div>

              {data.trainingList.length === 0 ? (
                <div className="p-8 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-sm font-bold text-slate-400">Aucune session de formation enregistrée pour {selectedPeriod}</p>
                  <Button size="sm" onClick={() => setIsAddTrainingOpen(true)} className="mt-3 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1">
                    <Plus className="h-3.5 w-3.5" /> Ajouter une session
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-950 uppercase text-[10px] font-black text-slate-400">
                      <tr>
                        <th className="p-3">Session / Thème</th>
                        <th className="p-3">Formateur</th>
                        <th className="p-3 text-right">Participants</th>
                        <th className="p-3 text-right">Score QCM</th>
                        <th className="p-3 text-right">Date</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.trainingList.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{item.title}</td>
                          <td className="p-3 text-slate-600">{item.trainer}</td>
                          <td className="p-3 text-right font-black text-slate-700 dark:text-slate-300">{item.count}</td>
                          <td className="p-3 text-right font-black text-emerald-600">{item.score}</td>
                          <td className="p-3 text-right text-slate-500">{item.date}</td>
                          <td className="p-3 text-center">
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteTraining(idx)} className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </Card>

      {/* ── MODAL: AJOUTER STR GO-AML ── */}
      <Dialog open={isAddStrOpen} onOpenChange={setIsAddStrOpen}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight">
              Ajouter une Déclaration STR GO-AML ({selectedPeriod})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Canal de Distribution / Agence</Label>
              <Input
                placeholder="Ex: Agence Tunis Centre, Agence Sousse..."
                value={newStr.channel}
                onChange={(e) => setNewStr({ ...newStr, channel: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Branche d'Assurance</Label>
              <Select value={newStr.type} onValueChange={(v) => setNewStr({ ...newStr, type: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="عقد تأمين السيارة">Assurance Automobile (سيارة)</SelectItem>
                  <SelectItem value="عقد تأمين الحياة">Assurance Vie (حياة)</SelectItem>
                  <SelectItem value="عقد تأمين الحوادث">Assurance Accidents (حوادث)</SelectItem>
                  <SelectItem value="عقد تأمين شامل">Assurance Globale (شامل)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Montant de l'Opération Douteuse (DT)</Label>
              <Input
                placeholder="Ex: 25,000 DT"
                value={newStr.amount}
                onChange={(e) => setNewStr({ ...newStr, amount: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddStrOpen(false)} className="rounded-xl font-bold">Annuler</Button>
            <Button onClick={handleAddStr} className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black">Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: AJOUTER SESSION FORMATION ── */}
      <Dialog open={isAddTrainingOpen} onOpenChange={setIsAddTrainingOpen}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight">
              Ajouter une Session de Formation ({selectedPeriod})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Thème / Région de la Formation</Label>
              <Input
                placeholder="Ex: LBA/FT Nord Ouest (Béja / Le Kef)..."
                value={newTraining.title}
                onChange={(e) => setNewTraining({ ...newTraining, title: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Formateur</Label>
              <Input value={newTraining.trainer} onChange={(e) => setNewTraining({ ...newTraining, trainer: e.target.value })} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Participants</Label>
                <Input type="number" value={newTraining.count} onChange={(e) => setNewTraining({ ...newTraining, count: Number(e.target.value) })} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Score QCM Moyen</Label>
                <Input value={newTraining.score} onChange={(e) => setNewTraining({ ...newTraining, score: e.target.value })} className="rounded-xl" placeholder="Ex: 92%" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Date de la Session</Label>
              <Input value={newTraining.date} onChange={(e) => setNewTraining({ ...newTraining, date: e.target.value })} className="rounded-xl" placeholder="JJ/MM/AAAA" />
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
