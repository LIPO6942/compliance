"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Map, PlusCircle, MoreHorizontal, Edit, Trash2, Bell, BellOff, FileText, Link as LinkIcon, ChevronsUpDown, LayoutGrid, List, AlertTriangle, UserX, FileWarning, ShieldAlert, Target, Activity, Search, ShieldCheck, FolderOpen, Info, Download, Save, Settings, ClipboardList } from "lucide-react";
import ExcelJS from "exceljs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { RiskMappingItem, RiskLevel, RiskCategory, Document } from '@/types/compliance';
import { useRiskMapping } from "@/contexts/RiskMappingContext";
import { useActivityLog } from "@/contexts/ActivityLogContext";
import { useUser } from "@/contexts/UserContext";
import { useIdentifiedRegulations } from "@/contexts/IdentifiedRegulationsContext";
import { useDocuments } from "@/contexts/DocumentsContext";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RiskKPIs } from "./RiskKPIs";
import { RiskHeatmap } from "./RiskHeatmap";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/icons/Logo";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const riskSchema = z.object({
  department: z.string().min(1, "La direction est requise."),
  category: z.enum(["Clients", "Produits et Services", "Pays et Zones Géographiques", "Canaux de Distribution"]),
  riskDescription: z.string().min(1, "Les facteurs de risques sont requis."),
  subFactors: z.string().optional(),
  probabilite: z.coerce.number().min(1, "Min: 1").max(4, "Max: 4"),
  impact: z.coerce.number().min(1, "Min: 1").max(4, "Max: 4"),
  expectedAction: z.string().min(1, "L'action attendue est requise."),
  justification: z.string().optional(),
  documentId: z.string().optional(),
  documentAnchor: z.string().optional(),
  dmrEfficiency: z.coerce.number().min(1).max(4).optional(),
  dmrProbability: z.coerce.number().min(1).max(4).optional(),
  weaknessPoint: z.string().optional(),
  actionCorrective: z.string().optional(),
  deadline: z.string().optional(),
  responsible: z.string().optional(),
  completionLevel: z.coerce.number().min(0).max(100).optional(),
});

type RiskFormValues = z.infer<typeof riskSchema>;

const dmrEfficiencyLevels = [
  { value: 1, label: "Très efficace", color: "text-emerald-600 bg-emerald-50 border-emerald-100", description: "Mesures optimales, contrôles robustes et conformité totale." },
  { value: 2, label: "Moyennement efficace", color: "text-blue-600 bg-blue-50 border-blue-100", description: "Dispositif satisfaisant," },
  { value: 3, label: "Peu efficace", color: "text-orange-600 bg-orange-50 border-orange-100", description: "Lacunes notables dans la mise en œuvre ou la conception des contrôles." },
  { value: 4, label: "Défaillant", color: "text-rose-600 bg-rose-50 border-rose-100", description: "Défaillances majeures ou absence totale de mesures d'atténuation." },
];

const calculateRiskScore = (probabilite: number, impact: number): number => {
  return (probabilite || 1) * (impact || 1);
};

const calculateRiskLevel = (probabilite: number, impact: number): RiskLevel => {
  const score = calculateRiskScore(probabilite, impact);
  if (score <= 4) return "Faible";
  if (score <= 8) return "Modéré";
  if (score <= 12) return "Élevé";
  return "Très élevé";
};

const exportToExcel = async (risks: import('@/types/compliance').RiskMappingItem[], logAction: any, user: any, maePositions: Record<number, string>, documents: any[], mode: 'principal' | 'dmr' | 'plan-actions' | 'combined' = 'principal') => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Compliance Navigator";
  wb.created = new Date();

  const probLabels: Record<number, string> = { 1: "Improbable", 2: "Rarement", 3: "Fréquent", 4: "Souvent" };
  const impLabels: Record<number, string> = { 1: "Faible", 2: "Modéré", 3: "Élevé", 4: "Très élevé" };
  const effLabels: Record<number, string> = { 1: "Très efficace", 2: "Moyennement efficace", 3: "Peu efficace", 4: "Défaillant" };

  // ── Risk level styles ───────────────────────────────────────────────────────
  type ExcelColor = { argb: string };
  const levelBg: Record<string, ExcelColor> = {
    "Faible": { argb: "FFD1FAE5" },  // emerald-100
    "Modéré": { argb: "FFFEF9C3" },  // yellow-100
    "Élevé": { argb: "FFFFEDD5" },  // orange-100
    "Très élevé": { argb: "FFFFE4E6" },  // rose-100
  };
  const levelFont: Record<string, ExcelColor> = {
    "Faible": { argb: "FF065F46" },
    "Modéré": { argb: "FF78350F" },
    "Élevé": { argb: "FF9A3412" },
    "Très élevé": { argb: "FF881337" },
  };

  const getMAEPosForScore = (score: number): string => {
    if (score <= 4) return maePositions[1];
    if (score <= 8) return maePositions[2];
    if (score <= 12) return maePositions[3];
    return maePositions[4];
  };

  const applyBorder = (cell: ExcelJS.Cell, color = "FFE2E8F0") => {
    const side = { style: "thin" as const, color: { argb: color } };
    cell.border = { top: side, bottom: side, left: side, right: side };
  };

  // ── SHEET 1 : Cartographie/DMR ──────────────────────────────────────────────
  const sheetName = mode === 'principal' ? "Cartographie" : (mode === 'dmr' ? "DMR" : "Cartographie & DMR");
  const ws1 = wb.addWorksheet(sheetName);

  const columns: any[] = [{ header: "N°", key: "num", width: 5 }];

  if (mode === 'principal' || mode === 'combined') {
    columns.push(
      { header: "Facteurs de risques", key: "desc", width: 45 },
      { header: "Sous facteurs de risques", key: "sub", width: 45 },
      { header: "Catégorie", key: "cat", width: 25 },
      { header: "Direction", key: "dept", width: 15 },
      { header: "Probabilité (V)", key: "pv", width: 12 },
      { header: "Impact (V)", key: "iv", width: 10 },
      { header: "Score Brut", key: "scoreBrut", width: 10 },
      { header: "Niveau Brut", key: "levelBrut", width: 15 },
      { header: "Mesure d'atténuation", key: "action", width: 45 }
    );
  }

  if (mode === 'dmr') {
    columns.push({ header: "Facteurs de risques", key: "desc", width: 45 });
  }
  if (mode === 'dmr' || mode === 'combined') {
    columns.push(
      { header: "Efficacité DMR (V)", key: "effV", width: 15 },
      { header: "Efficacité DMR (L)", key: "effL", width: 20 },
      { header: "Probabilité DMR", key: "dmrProb", width: 15 },
      { header: "Score Résiduel", key: "scoreRes", width: 15 },
      { header: "Niveau Résiduel", key: "levelRes", width: 15 },
      { header: "Position MAE", key: "maePos", width: 45 },
      { header: "Liens & Justifs", key: "justification", width: 35 }
    );
  }

  // Removed separate push for action at the end


  ws1.columns = columns;

  // Style header row
  const headerRow = ws1.getRow(1);
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    applyBorder(cell, "FF94A3B8");
  });

  // Data rows
  risks.forEach((risk, i) => {
    const scoreBrut = calculateRiskScore(risk.probabilite, risk.impact);
    const levelBrut = calculateRiskLevel(risk.probabilite, risk.impact);
    const dmrEff = (risk as any).dmrEfficiency || 2;
    const dmrProb = (risk as any).dmrProbability || risk.probabilite || 2;
    const scoreRes = dmrEff * dmrProb;
    const styleRes = getRiskScoreStyle(scoreRes);
    const maePos = getMAEPosition(scoreRes, maePositions);

    const rowData: any = { num: i + 1, desc: risk.riskDescription };

    if (mode === 'principal' || mode === 'combined') {
      rowData.sub = risk.subFactors || "-";
      rowData.cat = risk.category;
      rowData.dept = risk.department;
      rowData.pv = risk.probabilite;
      rowData.iv = risk.impact;
      rowData.scoreBrut = scoreBrut;
      rowData.levelBrut = levelBrut;
      rowData.action = risk.expectedAction;
    }
    if (mode === 'dmr' || mode === 'combined') {
      const docName = risk.documentId ? documents.find((d: any) => d.id === risk.documentId)?.name : "";
      rowData.effV = dmrEff;
      rowData.effL = effLabels[dmrEff] ?? "";
      rowData.dmrProb = dmrProb;
      rowData.scoreRes = scoreRes;
      rowData.levelRes = styleRes.label;
      rowData.maePos = maePos;
      rowData.justification = (docName ? `[Document: ${docName}] ` : "") + ((risk as any).justification || "-");
    }

    const row = ws1.addRow(rowData);
    row.height = 40;
    const rowBg = i % 2 === 0 ? "FFF8FAFC" : "FFFFFFFF";

    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: "middle", wrapText: true, horizontal: "left" };
      applyBorder(cell);
      const colKey = columns[colNumber - 1]?.key;

      if (colKey === "levelBrut") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: levelBg[levelBrut] || { argb: "FFFFFFFF" } };
        cell.font = { bold: true, color: levelFont[levelBrut] || { argb: "FF000000" }, size: 9 };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (colKey === "levelRes") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: levelBg[styleRes.label] || { argb: "FFFFFFFF" } };
        cell.font = { bold: true, color: levelFont[styleRes.label] || { argb: "FF000000" }, size: 9 };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.font = { color: { argb: "FF1E293B" }, size: 9 };
      }
    });
  });

  // ── SHEET : Plan d'actions ──────────────────────────────────────────────────
  if (mode === 'plan-actions' || mode === 'combined') {
    const wsPlan = wb.addWorksheet("Plan d'actions");
    wsPlan.columns = [
      { header: "N°", key: "num", width: 5 },
      { header: "Facteurs de risques", key: "desc", width: 40 },
      { header: "Sous facteurs de risques", key: "sub", width: 40 },
      { header: "Catégorie", key: "cat", width: 25 },
      { header: "Direction", key: "dept", width: 15 },
      { header: "Point de faiblesse", key: "weakness", width: 35 },
      { header: "Action corrective prévue", key: "action", width: 45 },
      { header: "Échéance", key: "deadline", width: 15 },
      { header: "Responsable", key: "resp", width: 20 },
      { header: "Niveau d'avancement", key: "comp", width: 20 }
    ];

    // Style header
    const planHeaderRow = wsPlan.getRow(1);
    planHeaderRow.height = 32;
    planHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      applyBorder(cell, "FF94A3B8");
    });

    // Plan Data
    risks.forEach((risk, i) => {
      const row = wsPlan.addRow({
        num: i + 1,
        desc: risk.riskDescription,
        sub: risk.subFactors || "-",
        cat: risk.category,
        dept: risk.department,
        weakness: risk.weaknessPoint || "-",
        action: (risk as any).actionCorrective || "-",
        deadline: risk.deadline || "-",
        resp: risk.responsible || "-",
        comp: `${risk.completionLevel || 0}%`
      });
      row.height = 35;
      const rowBg = i % 2 === 0 ? "FFF8FAFC" : "FFFFFFFF";
      row.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: "middle", wrapText: true, horizontal: "left" };
        applyBorder(cell);

        // Color completion
        if (wsPlan.columns[colNumber - 1]?.key === "comp") {
          const lv = risk.completionLevel || 0;
          let color = "FF94A3B8"; // gris
          if (lv > 0 && lv <= 20) color = "FFF43F5E"; // rose
          else if (lv > 20 && lv <= 40) color = "FFF97316"; // orange
          else if (lv > 40 && lv <= 60) color = "FFF59E0B"; // ambre
          else if (lv > 60 && lv <= 80) color = "FF84CC16"; // lime
          else if (lv > 80 && lv <= 100) color = "FF10B981"; // emerald

          cell.font = { bold: true, color: { argb: color }, size: 10 };
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
          cell.font = { color: { argb: "FF1E293B" }, size: 9 };
        }
      });
    });
  }

  // ── SHEET 2 : Légende ───────────────────────────────────────────────────────
  const ws2 = wb.addWorksheet("Légende");
  ws2.columns = [
    { key: "a", width: 35 },
    { key: "b", width: 20 },
    { key: "c", width: 35 },
    { key: "d", width: 33 },
  ];

  const addTitle = (text: string) => {
    const r = ws2.addRow([text]);
    r.height = 26;
    const cell = r.getCell(1);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    cell.alignment = { vertical: "middle" };
  };

  const addSubHeader = (cols: string[]) => {
    const r = ws2.addRow(cols);
    r.height = 22;
    r.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FF1E293B" }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCBD5E1" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      applyBorder(cell, "FF94A3B8");
    });
  };

  const addDataRow2 = (cols: (string | number)[], level?: string) => {
    const r = ws2.addRow(cols);
    r.height = 20;
    r.eachCell((cell, col) => {
      cell.alignment = { vertical: "middle", horizontal: col === 1 ? "center" : "left" };
      applyBorder(cell);
      if (level) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: levelBg[level] || { argb: "FFFFFFFF" } };
        cell.font = { bold: true, color: levelFont[level] || { argb: "FF000000" }, size: 10 };
      } else {
        cell.font = { color: { argb: "FF1E293B" }, size: 10 };
      }
    });
  };

  addTitle("LÉGENDE — RÉFÉRENTIEL DE GESTION DES RISQUES");

  if (mode === 'principal' || mode === 'combined') {
    ws2.addRow([]);
    addTitle("1. GRILLE DE PROBABILITÉ / FRÉQUENCE");
    addSubHeader(["Valeur", "Libellé", "Description", ""]);
    addDataRow2(["1", "Improbable", "Une fois tous les 1 à 5 ans", ""]);
    addDataRow2(["2", "Rarement", "Semestrielle / Annuelle", ""]);
    addDataRow2(["3", "Fréquent", "Mensuelle à Semestrielle", ""]);
    addDataRow2(["4", "Souvent", "Hebdomadaire / Quotidien", ""]);

    ws2.addRow([]);
    addTitle("2. GRILLE D'IMPACT");
    addSubHeader(["Valeur", "Libellé", "Description", ""]);
    addDataRow2(["1", "Faible", "Menace mineure", ""]);
    addDataRow2(["2", "Modéré", "Menace raisonnable", ""]);
    addDataRow2(["3", "Élevé", "Menace importante", ""]);
    addDataRow2(["4", "Très élevé", "Menace majeure", ""]);

    ws2.addRow([]);
    addTitle("3. SCORE BRUT → NIVEAU DE RISQUE");
    addSubHeader(["Score", "Niveau", "Couleur", "Interprétation"]);
    addDataRow2(["≤ 4", "Faible", "Vert", "Risque acceptable"], "Faible");
    addDataRow2(["5 – 8", "Modéré", "Jaune", "Surveillance recommandée"], "Modéré");
    addDataRow2(["9 – 12", "Élevé", "Orange", "Action corrective requise"], "Élevé");
    addDataRow2(["≥ 13", "Très élevé", "Rouge", "Escalade immédiate"], "Très élevé");
  }

  if (mode === 'dmr' || mode === 'combined') {
    ws2.addRow([]);
    addTitle((mode === 'combined' ? "4" : "1") + ". NIVEAU D'EFFICACITÉ (DMR)");
    addSubHeader(["Valeur", "Libellé", "Description", ""]);
    dmrEfficiencyLevels.forEach(l => {
      addDataRow2([l.value, l.label, l.description, ""]);
    });

    ws2.addRow([]);
    addTitle((mode === 'combined' ? "5" : "2") + ". POSITION DE LA MAE (RÉSIDUEL)");
    addSubHeader(["Score", "Niveau", "Description", ""]);
    addDataRow2(["≤ 4", "Faible", getMAEPosForScore(4), ""], "Faible");
    addDataRow2(["5 – 8", "Modéré", getMAEPosForScore(8), ""], "Modéré");
    addDataRow2(["9 – 12", "Élevé", getMAEPosForScore(12), ""], "Élevé");
    addDataRow2(["≥ 13", "Très élevé", getMAEPosForScore(16), ""], "Très élevé");
  }

  // ── Download ────────────────────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const filename = mode === 'principal' ? 'Cartographie' : (mode === 'dmr' ? 'DMR' : (mode === 'plan-actions' ? 'Plan_Actions' : 'Cartographie_Complet'));
  a.download = `${filename}_${today}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);

  // LOG ACTION
  if (user) {
    logAction({
      userEmail: user.email,
      userName: user.name,
      action: 'OTHER',
      label: `A exporté ${mode === 'principal' ? 'la cartographie' : (mode === 'dmr' ? 'le tableau DMR' : (mode === 'plan-actions' ? 'le plan d\'actions' : 'le tableau complet'))} (${risks.length} lignes)`,
      module: 'Cartographie des Risques'
    });
  }
};

const getRiskScoreStyle = (score: number): { bg: string; text: string; border: string; label: string } => {
  if (score <= 4) return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Faible" };
  if (score <= 8) return { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", label: "Modéré" };
  if (score <= 12) return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "Élevé" };
  return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", label: "Très élevé" };
};

const getMAEPosition = (score: number, maePositions: Record<number, string>): string => {
  if (score <= 4) return maePositions[1] || "Accepté – contrôles standards";
  if (score <= 8) return maePositions[2] || "Accepté sous conditions – contrôles renforcés";
  if (score <= 12) return maePositions[3] || "Tolérance très limitée – validation Direction Générale";
  return maePositions[4] || "Acceptable uniquement suite à dérogation légale validée par l'organe de gouvernance";
};

const formatMitigationMeasures = (text: string) => {
  if (!text) return <span className="italic opacity-50">Aucune mesure définie</span>;

  // Split by common separators: newline, bullet point, plus sign, or semicolon
  const items = text.split(/[\n\+;•]+/).map(item => item.trim()).filter(item => item.length > 0);

  if (items.length <= 1) return <span>{text}</span>;

  return (
    <ul className="list-none space-y-1.5">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start gap-2">
          <span className="text-primary mt-1 flex-shrink-0">•</span>
          <span className="leading-snug">{item}</span>
        </li>
      ))}
    </ul>
  );
};

const riskLevelColors: Record<RiskLevel, string> = {
  "Faible": "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-800/20 dark:text-emerald-300 dark:border-emerald-700/50",
  "Modéré": "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-800/20 dark:text-yellow-300 dark:border-yellow-700/50",
  "Élevé": "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-800/20 dark:text-orange-300 dark:border-orange-700/50",
  "Très élevé": "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-800/20 dark:text-rose-300 dark:border-rose-700/50",
};

const departmentOptions = ["Juridiques", "Finances", "Comptabilité", "Sinistres matériels", "Sinistre corporel", "Equipements", "RH", "DSI", "Audit", "Organisation", "Qualité Vie", "Commercial", "Recouvrement", "Inspection"];
const categoryOptions: RiskCategory[] = ["Clients", "Produits et Services", "Pays et Zones Géographiques", "Canaux de Distribution"];

// Labels pour probabilité
const probabiliteLabels: Record<number, { label: string; description: string }> = {
  1: { label: "Improbable", description: "Une fois 1An / 5 ans" },
  2: { label: "Rarement", description: "Semestrielle/annuelle" },
  3: { label: "Fréquent", description: "Mensuelle à semestrielle" },
  4: { label: "Souvent", description: "Hebdomadaire/Quotidien" },
};

// Labels pour impact
const impactLabels: Record<number, { label: string; description: string }> = {
  1: { label: "Faible", description: "Menace mineure" },
  2: { label: "Modéré", description: "Menace raisonnable" },
  3: { label: "Élevé", description: "Menace importante" },
  4: { label: "Très élevé", description: "Menace majeure" },
};

// Options d'avancement du Plan d'actions (pas de 20%)
const completionOptions = [
  { value: 0, label: "0% - Non commencé", color: "bg-slate-400", text: "text-slate-500" },
  { value: 20, label: "20% - Initié", color: "bg-rose-500", text: "text-rose-600" },
  { value: 40, label: "40% - En cours", color: "bg-orange-500", text: "text-orange-600" },
  { value: 60, label: "60% - Avancé", color: "bg-amber-500", text: "text-amber-600" },
  { value: 80, label: "80% - Presque achevé", color: "bg-lime-500", text: "text-lime-600" },
  { value: 100, label: "100% - Terminé", color: "bg-emerald-500", text: "text-emerald-600" }
];

export default function RiskMappingPage() {
  const { risks, addRisk, editRisk, removeRisk, globalDocumentIds, setGlobalDocumentIds, maePositions, updateMaePosition } = useRiskMapping();
  const { createAlertFromRisk, findAlertByRiskId, removeAlertByRiskId } = useIdentifiedRegulations();
  const { documents } = useDocuments();
  const { toast } = useToast();
  const { logAction } = useActivityLog();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as "table" | "heatmap" | "plan-actions" | "dmr" | null;

  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => { setIsClient(true) }, []);

  const [dialogState, setDialogState] = React.useState<{ mode: "add" | "edit" | "delete" | null; data?: RiskMappingItem }>({ mode: null });
  const form = useForm<RiskFormValues>({ resolver: zodResolver(riskSchema) });

  const watchedProba = form.watch("probabilite");
  const watchedImpact = form.watch("impact");
  const liveScore = React.useMemo(() => {
    const p = Number(watchedProba);
    const i = Number(watchedImpact);
    if (p >= 1 && p <= 4 && i >= 1 && i <= 4) return p * i;
    return null;
  }, [watchedProba, watchedImpact]);

  const [filterRiskLevel, setFilterRiskLevel] = React.useState<string>("all");
  const [filterDepartment, setFilterDepartment] = React.useState<string>("all");
  const [filterCategory, setFilterCategory] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isViewerOpen, setIsViewerOpen] = React.useState(false);
  const [viewerConfig, setViewerConfig] = React.useState({ url: "", title: "", anchor: "" });
  const [viewMode, setViewMode] = React.useState<"table" | "heatmap" | "plan-actions" | "dmr" | "settings">(tabParam || "table");

  const [tempMaePositions, setTempMaePositions] = React.useState<Record<number, string>>(maePositions);

  React.useEffect(() => {
    setTempMaePositions(maePositions);
  }, [maePositions]);

  React.useEffect(() => {
    setViewMode(tabParam || "table");
  }, [tabParam]);

  // Global documents popover state
  const [globalDocsOpen, setGlobalDocsOpen] = React.useState(false);

  const openDialog = (mode: "add" | "edit" | "delete", data?: RiskMappingItem) => {
    setDialogState({ mode, data });
    if (mode === "edit" && data) {
      form.reset({
        department: data.department,
        category: data.category,
        riskDescription: data.riskDescription,
        subFactors: data.subFactors || "",
        probabilite: data.probabilite ?? 1,
        impact: data.impact ?? 1,
        expectedAction: data.expectedAction,
        justification: (data as any).justification || "",
        documentId: data.documentId || "",
        documentAnchor: (data as any).documentAnchor || "",
        dmrEfficiency: (data as any).dmrEfficiency || 2,
        dmrProbability: (data as any).dmrProbability || (data.probabilite ?? 2),
        weaknessPoint: data.weaknessPoint || "",
        actionCorrective: (data as any).actionCorrective || "",
        deadline: data.deadline || "",
        responsible: data.responsible || "",
        completionLevel: data.completionLevel || 0,
      });
    } else {
      form.reset({
        department: departmentOptions[0],
        category: categoryOptions[0],
        probabilite: 2,
        impact: 2,
        riskDescription: "",
        subFactors: "",
        expectedAction: "",
        actionCorrective: "",
        justification: "",
        documentId: "",
        documentAnchor: "",
        dmrEfficiency: 2,
        dmrProbability: 2,
        weaknessPoint: "",
        deadline: "",
        responsible: "",
        completionLevel: 0,
      });
    }
  };

  const closeDialog = () => setDialogState({ mode: null });

  const handleFormSubmit = async (values: RiskFormValues) => {
    try {
      const numProba = Number(values.probabilite) || 1;
      const numImpact = Number(values.impact) || 1;

      const sanitizedValues = {
        department: values.department || "",
        category: values.category || "Clients",
        riskDescription: values.riskDescription || "",
        subFactors: values.subFactors || "",
        expectedAction: values.expectedAction || "",
        justification: values.justification || "",
        documentId: values.documentId && values.documentId !== "none" ? values.documentId : undefined,
        documentAnchor: values.documentAnchor || "",
        weaknessPoint: values.weaknessPoint || "",
        deadline: values.deadline || "",
        responsible: values.responsible || "",
        completionLevel: values.completionLevel || 0,
      };

      if (dialogState.mode === "add") {
        await addRisk({
          ...sanitizedValues,
          probabilite: numProba,
          impact: numImpact,
          dmrEfficiency: Number(values.dmrEfficiency) || 2,
          dmrProbability: Number(values.dmrProbability) || numProba,
          riskLevel: calculateRiskLevel(numProba, numImpact),
        });
        toast({ title: "Risque identifié", description: "La cartographie a été mise à jour." });
        if (user) {
          logAction({
            userEmail: user.email,
            userName: user.name,
            action: 'RISK_ADD',
            label: `A ajouté un risque : ${sanitizedValues.riskDescription}`,
            detail: sanitizedValues.category,
            module: 'Cartographie des Risques'
          });
        }
      } else if (dialogState.mode === "edit" && dialogState.data?.id) {
        await editRisk(dialogState.data.id, {
          ...sanitizedValues,
          probabilite: numProba,
          impact: numImpact,
          dmrEfficiency: Number(values.dmrEfficiency) || 2,
          dmrProbability: Number(values.dmrProbability) || numProba,
          riskLevel: calculateRiskLevel(numProba, numImpact),
        });
        toast({ title: "Risque modifié", description: "Les détails du risque ont été actualisés." });
        if (user) {
          logAction({
            userEmail: user.email,
            userName: user.name,
            action: 'RISK_EDIT',
            label: `A modifié un risque : ${sanitizedValues.riskDescription}`,
            detail: sanitizedValues.category,
            module: 'Cartographie des Risques'
          });
        }
      }
      closeDialog();
    } catch (e: any) {
      console.error("Erreur lors de la sauvegarde du risque:", e);
      toast({ variant: "destructive", title: "Erreur", description: `Impossible d'enregistrer les modifications: ${e.message || 'Erreur inconnue'}` });
    }
  };

  const handleDeleteRisk = async (id: string, riskDescription: string) => {
    try {
      const alert = findAlertByRiskId(id);
      if (alert) await removeAlertByRiskId(id);
      await removeRisk(id);
      toast({ title: "Risque supprimé", description: "Le risque a été retiré de la cartographie." });
      if (user) {
        logAction({
          userEmail: user.email,
          userName: user.name,
          action: 'RISK_DELETE',
          label: `A supprimé un risque : ${riskDescription}`,
          module: 'Cartographie des Risques'
        });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Action impossible." });
    }
  };

  const handleToggleAlert = async (risk: RiskMappingItem) => {
    const existingAlert = findAlertByRiskId(risk.id);
    if (existingAlert) {
      await removeAlertByRiskId(risk.id);
      toast({ title: "Alerte désactivée", description: "Le lien entre ce risque et le centre d'alertes est rompu." });
      if (user) {
        logAction({
          userEmail: user.email,
          userName: user.name,
          action: 'ALERT_REMOVE',
          label: `A supprimé une alerte pour le risque : ${risk.riskDescription}`,
          module: 'Cartographie des Risques'
        });
      }
    } else {
      createAlertFromRisk(risk);
      toast({ title: "Alerte générée", description: "Une alerte critique a été envoyée au centre de commande." });
      if (user) {
        logAction({
          userEmail: user.email,
          userName: user.name,
          action: 'ALERT_CREATE',
          label: `A généré une alerte critique pour : ${risk.riskDescription}`,
          module: 'Cartographie des Risques'
        });
      }
    }
  };

  const filteredRisks = React.useMemo(() => risks.filter(risk => {
    const matchesSearch = risk.riskDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      risk.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = filterRiskLevel === "all" || calculateRiskLevel(risk.probabilite, risk.impact) === filterRiskLevel;
    const matchesDept = filterDepartment === "all" || risk.department === filterDepartment;
    const matchesCategory = filterCategory === "all" || risk.category === filterCategory;
    return matchesSearch && matchesLevel && matchesDept && matchesCategory;
  }), [risks, searchQuery, filterRiskLevel, filterDepartment, filterCategory]);

  const globalDocsDetails = React.useMemo(
    () => documents.filter(d => globalDocumentIds.includes(d.id)),
    [documents, globalDocumentIds]
  );

  if (!isClient) {
    return <div className="flex justify-center items-center h-[60vh]"><Logo className="h-10 w-10 animate-spin" /></div>;
  }

  return (
    <div className="space-y-8 pb-20 w-full">
      {/* Header */}
      <div className="relative mb-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Risk Intelligence Center</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Cartographie des <span className="text-primary">Risques</span>
            </h1>
            <p className="text-slate-500 text-sm max-w-xl">
              Pilotage stratégique de l'exposition réglementaire et opérationnelle en temps réel.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] shadow-sm transition-all hover:scale-[1.02]"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Exporter Excel
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-xl shadow-2xl p-2 border-none">
                <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 px-3 py-2">Choisir le format d'export</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                <DropdownMenuItem onClick={() => exportToExcel(filteredRisks, logAction, user, maePositions, documents, 'principal')} className="rounded-lg py-3 cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                      <List className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700">Tableau Principal</span>
                      <span className="text-[9px] text-slate-400">Inventaire et cotation brute</span>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToExcel(filteredRisks, logAction, user, maePositions, documents, 'dmr')} className="rounded-lg py-3 cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700">Tableau DMR</span>
                      <span className="text-[9px] text-slate-400">Efficacité et risque résiduel</span>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToExcel(filteredRisks, logAction, user, maePositions, documents, 'plan-actions')} className="rounded-lg py-3 cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                      <Target className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700">Plan d'Actions</span>
                      <span className="text-[9px] text-slate-400">Actions et avancement</span>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                <DropdownMenuItem onClick={() => exportToExcel(filteredRisks, logAction, user, maePositions, documents, 'combined')} className="rounded-lg py-3 cursor-pointer group bg-slate-50 hover:bg-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <LayoutGrid className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900">Tableau Complet</span>
                      <span className="text-[9px] text-slate-500">Cartographie brute + Volet DMR</span>
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setViewMode('settings')}
              className={cn(
                "h-14 w-14 rounded-xl border-2 transition-all hover:scale-[1.02] shadow-lg",
                viewMode === 'settings'
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
              title="Paramètres"
            >
              <Settings className="h-6 w-6" />
            </Button>
            <Button
              size="lg"
              onClick={() => openDialog('add')}
              className="h-14 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-lg transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Identifier un Risque
            </Button>
          </div>
        </div>
      </div>

      {/* ─── GLOBAL DOCUMENTS SECTION ─── */}
      <Card className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 shadow-none">
        <CardHeader className="pb-3 pt-5 px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                <FolderOpen className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400 h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-white">Documents liés à la Cartographie</CardTitle>
                <CardDescription className="text-xs text-slate-500">Référentiels, politiques et procédures applicables à l'ensemble des risques</CardDescription>
              </div>
            </div>
            <Popover open={globalDocsOpen} onOpenChange={setGlobalDocsOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-bold text-xs bg-white dark:bg-slate-900 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all">
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
                  Gérer les documents
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0 rounded-2xl border-none shadow-2xl">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Sélectionner les documents</p>
                </div>
                <ScrollArea className="h-64 p-3">
                  {documents.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-8">Aucun document disponible</p>
                  )}
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center space-x-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                      <Checkbox
                        checked={globalDocumentIds.includes(doc.id)}
                        onCheckedChange={(checked) => {
                          const cur = globalDocumentIds || [];
                          setGlobalDocumentIds(checked ? [...cur, doc.id] : cur.filter((id) => id !== doc.id));
                          if (user) {
                            logAction({
                              userEmail: user.email || "system",
                              userName: user.displayName || "Utilisateur",
                              action: "SETTINGS_UPDATE",
                              label: checked ? "Liaison document global" : "Suppression liaison document global",
                              detail: `Document: ${doc.name}`,
                              module: "Risk Mapping"
                            });
                          }
                        }}
                      />
                      <Label className="text-xs font-bold leading-none cursor-pointer">{doc.name}</Label>
                    </div>
                  ))}
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>

        {globalDocsDetails.length > 0 && (
          <CardContent className="px-6 pb-5 pt-2">
            <div className="flex flex-wrap gap-2">
              {globalDocsDetails.map((doc) => (
                <div key={doc.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm relative group/doc">
                  {doc.url ? (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors">
                      <FileText className="h-3 w-3 text-indigo-500 flex-shrink-0" />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover/doc:underline">{doc.name}</span>
                    </a>
                  ) : (
                    <>
                      <FileText className="h-3 w-3 text-indigo-500 flex-shrink-0" />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{doc.name}</span>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setGlobalDocumentIds(globalDocumentIds.filter(id => id !== doc.id));
                      if (user) {
                        logAction({
                          userEmail: user.email || "system",
                          userName: user.displayName || "Utilisateur",
                          action: "SETTINGS_UPDATE",
                          label: "Suppression liaison document global",
                          detail: `Document: ${doc.name}`,
                          module: "Risk Mapping"
                        });
                      }
                    }}
                    className="ml-1 text-slate-300 hover:text-rose-500 transition-colors text-base leading-none font-bold"
                    aria-label="Retirer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        )}

        {globalDocsDetails.length === 0 && (
          <CardContent className="px-6 pb-5 pt-0">
            <p className="text-[11px] text-slate-400 italic">Aucun document lié — cliquez sur "Gérer les documents" pour en ajouter.</p>
          </CardContent>
        )}
      </Card>

      {/* ─── SCORE LEGEND ─── */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Barème du score :</span>
        {[
          { label: "Faible", range: "≤ 4", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
          { label: "Modéré", range: "5–8", bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200" },
          { label: "Élevé", range: "9–12", bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
          { label: "Très élevé", range: "≥ 13", bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
        ].map(item => (
          <div key={item.label} className={cn("flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-bold", item.bg, item.text, item.border)}>
            <span>{item.range}</span>
            <span className="opacity-60">→</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
        {/* Navigation & Advanced Filters */}
        <div className="flex flex-col xl:flex-row items-center gap-4 mb-6">
          <TabsList className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl h-12 w-full xl:w-auto border border-slate-200 dark:border-slate-800 shrink-0">
            <TabsTrigger value="table" className="rounded-lg px-6 h-10 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm font-bold text-[11px] uppercase tracking-wider transition-all">
              <List className="h-3.5 w-3.5 mr-2" /> Inventaire
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="rounded-lg px-6 h-10 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm font-bold text-[11px] uppercase tracking-wider transition-all">
              <LayoutGrid className="h-3.5 w-3.5 mr-2" /> Heatmap
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 flex flex-nowrap items-center gap-2 w-full overflow-x-auto scrollbar-hide bg-white/50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-3 rounded-lg border-none bg-slate-100 dark:bg-slate-800 font-medium text-xs shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
              />
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block shrink-0" />

            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="h-9 w-[130px] shrink-0 rounded-lg border-none bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider shadow-none">
                <SelectValue placeholder="Ttes Directions" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xl">
                <SelectItem value="all" className="text-[10px] font-bold uppercase">Ttes Directions</SelectItem>
                {departmentOptions.map(d => <SelectItem key={d} value={d} className="text-[10px] font-bold uppercase">{d}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9 w-[130px] shrink-0 rounded-lg border-none bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider shadow-none">
                <SelectValue placeholder="Ttes Catégories" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xl">
                <SelectItem value="all" className="text-[10px] font-bold uppercase">Ttes Catégories</SelectItem>
                {categoryOptions.map(c => <SelectItem key={c} value={c} className="text-[10px] font-bold uppercase">{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterRiskLevel} onValueChange={setFilterRiskLevel}>
              <SelectTrigger className="h-9 w-[120px] shrink-0 rounded-lg border-none bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider shadow-none">
                <SelectValue placeholder="Ts Niveaux" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xl">
                <SelectItem value="all" className="text-[10px] font-bold uppercase">Ts Niveaux</SelectItem>
                <SelectItem value="Faible" className="text-[10px] font-bold uppercase text-emerald-600">Faible</SelectItem>
                <SelectItem value="Modéré" className="text-[10px] font-bold uppercase text-yellow-600">Modéré</SelectItem>
                <SelectItem value="Élevé" className="text-[10px] font-bold uppercase text-orange-600">Élevé</SelectItem>
                <SelectItem value="Très élevé" className="text-[10px] font-bold uppercase text-rose-600">Très élevé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="plan-actions" className="mt-0 focus-visible:ring-0">
          <RiskKPIs risks={filteredRisks} />
          <Card className="shadow-xl border-none bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-4 pt-6 px-8 border-b border-slate-50 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-slate-800 dark:text-white">Plan d'actions de Contrôle</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-1">Suivi et pilotage des mesures d'atténuation et de leur avancement</CardDescription>
                </div>
                <Badge variant="outline" className="h-7 px-3 rounded-lg border-2 border-primary/10 bg-primary/5 text-primary font-bold text-[10px]">
                  {filteredRisks.length} Actions planifiées
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="border-collapse">
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none w-[20%]">Facteurs de risques</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none text-center w-[8%]">Cotation Net</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none w-[12%]">Point de faiblesse</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none w-[20%]">Action corrective</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none text-center w-[8%]">Échéance</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none w-[10%]">Responsable</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none w-[12%] text-center">Niveau d'avancement</TableHead>
                      <TableHead className="py-3 px-4 text-right font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none w-[5%]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRisks.length > 0 ? (
                      (() => {
                        const grouped: Record<string, typeof filteredRisks> = {};
                        filteredRisks.forEach(risk => {
                          if (!grouped[risk.category]) grouped[risk.category] = [];
                          grouped[risk.category].push(risk);
                        });
                        return Object.entries(grouped).map(([category, categoryRisks]) => (
                          <React.Fragment key={category}>
                            <TableRow className="bg-slate-50/80 dark:bg-slate-900/40 border-y border-slate-200/50 dark:border-slate-800/50">
                              <TableCell colSpan={9} className="py-2.5 px-4 border-l-4 border-l-primary">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-800 dark:text-slate-200">{category}</span>
                                  <span className="text-[9px] font-bold text-slate-400 ml-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">{categoryRisks.length} Action{categoryRisks.length > 1 ? 's' : ''}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                            {categoryRisks.map((risk) => {
                              const dmrEff = (risk as any).dmrEfficiency || 2;
                              const dmrPro = (risk as any).dmrProbability || risk.probabilite || 2;
                              const scoreRes = dmrEff * dmrPro;
                              const styleRes = getRiskScoreStyle(scoreRes);
                              const completion = (risk as any).completionLevel || 0;
                              return (
                                <TableRow key={risk.id} className="group hover:bg-primary/[0.02] transition-all border-b border-slate-200/60 dark:border-slate-800/60 border-l-2 border-l-transparent hover:border-l-primary divide-x divide-slate-100 dark:divide-slate-800/40">
                                  <TableCell className="py-3 px-4">
                                    <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                                      {risk.riskDescription}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-3 px-4 text-center">
                                    <div className={cn("inline-flex flex-col items-center justify-center w-10 h-10 rounded-lg border", styleRes.bg, styleRes.text, styleRes.border)}>
                                      <span className="text-sm font-black">{scoreRes}</span>
                                      <span className="text-[7px] font-bold uppercase">{styleRes.label}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-3 px-4">
                                    <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight italic">
                                      {(risk as any).weaknessPoint || "-"}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-3 px-4 text-center">
                                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 leading-tight">
                                      {(risk as any).actionCorrective || "-"}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-3 px-4 text-center">
                                    <span className="text-[11px] font-bold text-slate-500">
                                      {(risk as any).deadline || "-"}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-3 px-4 text-center">
                                    <Badge variant="ghost" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-none font-bold text-[10px]">
                                      {(risk as any).responsible || "-"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-3 px-4">
                                    <div className="flex flex-col gap-1.5 items-center">
                                      <span className={cn("text-[10px] font-black", completionOptions.find(o => o.value === completion)?.text || "text-slate-500")}>{completion}%</span>
                                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                          className={cn(
                                            "h-full transition-all duration-500",
                                            completionOptions.find(o => o.value === completion)?.color || "bg-slate-400"
                                          )}
                                          style={{ width: `${completion}%` }}
                                        />
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-3 px-4 text-right">
                                    <div className="flex justify-end">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setViewMode('settings')}
                                        className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                                        title="Paramétrer ce plan d'actions"
                                      >
                                        <Settings className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </React.Fragment>
                        ));
                      })()
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="h-40 text-center text-slate-400 text-sm font-bold">
                          Aucune action planifiée correspondante
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap" className="mt-0 focus-visible:ring-0">
          <RiskHeatmap risks={filteredRisks} onEditRisk={(risk) => openDialog('edit', risk)} />
        </TabsContent>

        <TabsContent value="dmr" className="mt-0 focus-visible:ring-0">
          <RiskKPIs risks={filteredRisks} />
          <Card className="shadow-xl border-none bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-4 pt-6 px-8 border-b border-slate-50 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-slate-800 dark:text-white">Dispositif de Management des Risques (DMR)</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-1">Évaluation du risque résiduel et position de la MAE Assurance</CardDescription>
                </div>
                <Badge variant="outline" className="h-7 px-3 rounded-lg border-2 border-indigo-100 bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                  {filteredRisks.length} Scénarios identifiés
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="border-collapse">
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none w-[25%]">Facteurs de risques</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none text-center w-[12%]">Niveau d'efficacité</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none text-center w-[10%]">Proba. DMR</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none text-center w-[10%]">Score Résiduel</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none w-[23%]">Position de la MAE Assurance</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none w-[15%]">Liens & Justifs</TableHead>
                      <TableHead className="py-3 px-4 text-right font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none w-[5%]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRisks.length > 0 ? (
                      (() => {
                        const grouped: Record<string, typeof filteredRisks> = {};
                        filteredRisks.forEach(risk => {
                          if (!grouped[risk.category]) grouped[risk.category] = [];
                          grouped[risk.category].push(risk);
                        });
                        return Object.entries(grouped).map(([category, categoryRisks]) => (
                          <React.Fragment key={category}>
                            <TableRow className="bg-slate-50/80 dark:bg-slate-900/40 border-y border-slate-200/50 dark:border-slate-800/50">
                              <TableCell colSpan={7} className="py-2.5 px-4 border-l-4 border-l-indigo-500">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-800 dark:text-slate-200">{category}</span>
                                  <span className="text-[9px] font-bold text-slate-400 ml-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">{categoryRisks.length} Scénario{categoryRisks.length > 1 ? 's' : ''}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                            {categoryRisks.map((risk) => {
                              const dmrEff = (risk as any).dmrEfficiency || 2;
                              const dmrPro = (risk as any).dmrProbability || risk.probabilite || 2;
                              const score = dmrEff * dmrPro;
                              const style = getRiskScoreStyle(score);
                              const maePosition = getMAEPosition(score, maePositions);
                              const hasAlert = !!findAlertByRiskId(risk.id);
                              return (
                                <TableRow key={risk.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors border-b border-slate-200 dark:border-slate-800 border-l-2 border-l-transparent hover:border-l-indigo-500 divide-x divide-slate-100 dark:divide-slate-800">
                                  <TableCell className="py-3 px-4">
                                    <div className="flex items-start gap-2">
                                      <div className="flex flex-col gap-0.5 flex-1">
                                        <button
                                          onClick={() => setViewMode("table")}
                                          className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 leading-tight text-left hover:text-primary transition-colors hover:underline flex items-center gap-1 group/link"
                                        >
                                          {risk.riskDescription}
                                          <LinkIcon className="h-2.5 w-2.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                        </button>
                                      </div>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0 rounded-full hover:bg-indigo-50 hover:text-indigo-600 flex-shrink-0">
                                              <Info className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent side="right" className="max-w-sm p-3 rounded-xl">
                                            <div className="space-y-2">
                                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mesures d'atténuation</p>
                                              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                                {formatMitigationMeasures(risk.expectedAction)}
                                              </div>
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-3 px-4 text-center">
                                    {(() => {
                                      const eff = dmrEfficiencyLevels.find(l => l.value === dmrEff) || dmrEfficiencyLevels[1];
                                      return (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                onClick={(e) => { e.stopPropagation(); openDialog('edit', risk); }}
                                                className={cn("text-[9px] font-bold uppercase tracking-tight py-1 px-2.5 rounded-md border shadow-sm transition-all hover:scale-110 cursor-pointer underline decoration-dotted", eff.color)}
                                              >
                                                {dmrEff} - {eff.label}
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="bg-slate-900 text-white border-none p-2 rounded-lg shadow-xl">
                                              <p className="text-[10px] font-semibold">{eff.description}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      );
                                    })()}
                                  </TableCell>
                                  <TableCell className="py-3 px-4 text-center">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openDialog('edit', risk); }}
                                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-all hover:scale-110 font-black text-xs text-slate-700 shadow-sm cursor-pointer underline decoration-dotted"
                                    >
                                      {dmrPro}
                                    </button>
                                  </TableCell>
                                  <TableCell className="py-3 px-4 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <div className={cn("inline-flex items-center justify-center w-8 h-8 rounded-lg border font-bold text-xs", style.bg, style.text, style.border)}>
                                        {score}
                                      </div>
                                      <span className={cn("text-[9px] font-bold uppercase tracking-tight", style.text)}>
                                        {style.label}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-3 px-4">
                                    <div className="flex items-start gap-2">
                                      <div className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0",
                                        score <= 4 ? "bg-emerald-500" :
                                          score <= 8 ? "bg-yellow-500" :
                                            score <= 12 ? "bg-orange-500" : "bg-rose-500"
                                      )} />
                                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                                        {maePosition}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-3 px-4">
                                    {(() => {
                                      const justifText = (risk as any).justification || "";
                                      const linkedDoc = risk.documentId ? documents.find((d: any) => d.id === risk.documentId) : null;
                                      const justifLines = justifText ? justifText.split(/[\n]+/).map((s: string) => s.trim()).filter((s: string) => s.length > 0) : [];
                                      const hasContent = justifLines.length > 0 || linkedDoc;
                                      if (!hasContent) return <span className="text-slate-300 dark:text-slate-700 text-[10px] italic">—</span>;
                                      return (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="flex flex-col gap-1 cursor-default w-fit">
                                                {linkedDoc && (
                                                  linkedDoc.url ? (
                                                    <button
                                                      type="button"
                                                      onClick={(e: any) => {
                                                        e.stopPropagation();
                                                        const url = linkedDoc.url || "";
                                                        const anchor = (risk as any).documentAnchor || "";
                                                        
                                                        // Option collaborative : On ouvre le panneau latéral
                                                        setViewerConfig({
                                                          url: url,
                                                          title: linkedDoc.name,
                                                          anchor: anchor
                                                        });
                                                        setIsViewerOpen(true);
                                                      }}
                                                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-all border border-indigo-100 dark:border-indigo-800/50 shadow-sm w-fit"
                                                    >
                                                      <FileText className="h-3 w-3" />
                                                      <span className="text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                                                        Doc lié
                                                        {(risk as any).documentAnchor && (
                                                          <span className="bg-indigo-200/50 dark:bg-indigo-800/50 px-1 py-0.5 rounded text-[7px]">
                                                            {/^\d+$/.test((risk as any).documentAnchor) ? `p.${(risk as any).documentAnchor}` : (risk as any).documentAnchor}
                                                          </span>
                                                        )}
                                                      </span>
                                                    </button>
                                                  ) : (
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-900/40 text-slate-400 border border-slate-100 dark:border-slate-800 shadow-sm w-fit">
                                                      <FileText className="h-3 w-3" />
                                                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Doc lié</span>
                                                    </div>
                                                  )
                                                )}
                                                {justifLines.length > 0 && (
                                                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 shadow-sm w-fit">
                                                    <ClipboardList className="h-3 w-3 text-amber-500" />
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">{justifLines.length} justif{justifLines.length > 1 ? 's' : ''}</span>
                                                  </div>
                                                )}
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="left" className="rounded-2xl p-4 bg-slate-900 text-white border-none shadow-2xl max-w-sm">
                                              <div className="space-y-3">
                                                {linkedDoc && (
                                                  <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Document associé</p>
                                                    <p className="text-[11px] font-bold text-indigo-300">{linkedDoc.name}</p>
                                                  </div>
                                                )}
                                                {justifLines.length > 0 && (
                                                  <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Justificatifs</p>
                                                    <ul className="space-y-1.5">
                                                      {justifLines.map((line: string, idx: number) => (
                                                        <li key={idx} className="flex items-start gap-2">
                                                          <span className="text-amber-400 mt-0.5 flex-shrink-0 text-xs">–</span>
                                                          <span className="text-[11px] leading-snug text-slate-200">{line.replace(/^[-–•]\s*/, '')}</span>
                                                        </li>
                                                      ))}
                                                    </ul>
                                                  </div>
                                                )}
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      );
                                    })()}
                                  </TableCell>
                                  <TableCell className="py-3 px-4 text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleToggleAlert(risk)}
                                        className={cn("h-7 w-7 rounded transition-all", hasAlert ? "text-rose-500 bg-rose-50" : "text-slate-400 hover:bg-slate-100")}
                                      >
                                        {hasAlert ? <Bell className="h-4 w-4 fill-current" /> : <BellOff className="h-4 w-4" />}
                                      </Button>

                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" className="h-7 w-7 p-0 rounded hover:bg-slate-100">
                                            <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40 rounded-lg shadow-xl">
                                          <DropdownMenuItem onClick={() => openDialog('edit', risk)} className="text-xs font-bold py-2">
                                            <Edit className="mr-2 h-3.5 w-3.5 text-indigo-500" /> Modifier
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            onClick={() => openDialog('delete', risk)}
                                            className="text-rose-600 text-xs font-bold py-2 focus:text-rose-600 focus:bg-rose-50"
                                          >
                                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Supprimer
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </React.Fragment>
                        ));
                      })()
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-40 text-center text-slate-400 text-sm font-bold">
                          Aucun risque ne correspond aux filtres
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-0 focus-visible:ring-0 space-y-6">
          <Card className="shadow-2xl border-none bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-6 pt-8 px-10 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shadow-sm border border-amber-100 dark:border-amber-800/50">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Configuration du Plan d'actions</CardTitle>
                  <CardDescription className="text-[13px] font-semibold text-slate-500 mt-1.5">
                    Gestion centralisée des mesures correctives, responsables et échéances pour chaque risque identifié.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                      <TableHead className="py-4 px-6 font-bold uppercase tracking-wider text-[10px] text-slate-500 w-[30%]">Risque</TableHead>
                      <TableHead className="py-4 px-6 font-bold uppercase tracking-wider text-[10px] text-slate-500 w-[30%]">Action Corrective</TableHead>
                      <TableHead className="py-4 px-6 font-bold uppercase tracking-wider text-[10px] text-slate-500 w-[15%]">Responsable</TableHead>
                      <TableHead className="py-4 px-6 font-bold uppercase tracking-wider text-[10px] text-slate-500 w-[15%]">Échéance</TableHead>
                      <TableHead className="py-4 px-6 font-bold uppercase tracking-wider text-[10px] text-slate-500 text-center w-[10%]">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {risks.map((risk) => (
                      <TableRow key={risk.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 divide-x divide-slate-100 dark:divide-slate-800">
                        <TableCell className="py-4 px-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest leading-none">{risk.category}</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight line-clamp-2">{risk.riskDescription}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <Textarea
                            className="text-xs font-semibold bg-transparent border-slate-200 focus:bg-white dark:focus:bg-slate-950 min-h-[60px] rounded-xl"
                            defaultValue={(risk as any).actionCorrective || ""}
                            onBlur={(e) => {
                              if (e.target.value !== (risk as any).actionCorrective) {
                                editRisk(risk.id, { actionCorrective: e.target.value } as any);
                                toast({ title: "Action mise à jour", description: "Le plan d'action a été actualisé." });
                                if (user) logAction({ userEmail: user.email, userName: user.name, action: 'PLAN_UPDATE', label: `A modifié l'action corrective du risque : ${risk.riskDescription}`, detail: risk.category, module: 'Plan d\'actions' });
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <Input
                            className="text-xs font-bold bg-transparent border-slate-200 focus:bg-white dark:focus:bg-slate-950 h-9 rounded-lg"
                            defaultValue={(risk as any).responsible}
                            onBlur={(e) => {
                              if (e.target.value !== (risk as any).responsible) {
                                editRisk(risk.id, { responsible: e.target.value } as any);
                                toast({ title: "Responsable mis à jour" });
                                if (user) logAction({ userEmail: user.email, userName: user.name, action: 'PLAN_UPDATE', label: `A modifié le responsable du risque : ${risk.riskDescription}`, detail: `Responsable: ${e.target.value}`, module: 'Plan d\'actions' });
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <Input
                            type="date"
                            className="text-xs font-bold bg-transparent border-slate-200 focus:bg-white dark:focus:bg-slate-950 h-9 rounded-lg"
                            defaultValue={(risk as any).deadline}
                            onBlur={(e) => {
                              if (e.target.value !== (risk as any).deadline) {
                                editRisk(risk.id, { deadline: e.target.value } as any);
                                toast({ title: "Échéance mise à jour" });
                                if (user) logAction({ userEmail: user.email, userName: user.name, action: 'PLAN_UPDATE', label: `A modifié l'échéance du risque : ${risk.riskDescription}`, detail: `Échéance: ${e.target.value}`, module: 'Plan d\'actions' });
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <div className="flex w-full min-w-[130px] justify-center">
                            <Select
                              value={String((risk as any).completionLevel || 0)}
                              onValueChange={(v) => {
                                editRisk(risk.id, { completionLevel: Number(v) } as any);
                                toast({ title: "Avancement mis à jour" });
                                if (user) logAction({ userEmail: user.email, userName: user.name, action: 'PLAN_UPDATE', label: `A modifié l'avancement du risque : ${risk.riskDescription}`, detail: `Avancement: ${v}%`, module: 'Plan d\'actions' });
                              }}
                            >
                              <SelectTrigger className="h-9 w-full bg-transparent border-slate-200 focus:bg-white dark:focus:bg-slate-950 font-bold text-[10px] rounded-lg shadow-none">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl shadow-2xl">
                                {completionOptions.map(opt => (
                                  <SelectItem key={opt.value} value={String(opt.value)} className="font-bold text-[10px]">
                                    <div className="flex items-center gap-2">
                                      <div className={cn("w-2 h-2 rounded-full", opt.color)} />
                                      <span>{opt.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 italic text-[11px] text-slate-400 font-medium">
              <Info className="h-3.5 w-3.5 mr-2 inline" />
              Les modifications sont enregistrées automatiquement lorsque vous quittez un champ de saisie (onBlur).
            </CardFooter>
          </Card>

          <Card className="shadow-2xl border-none bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-6 pt-8 px-10 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-800/50">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Paramètres Généraux des Risques</CardTitle>
                  <CardDescription className="text-[13px] font-semibold text-slate-500 mt-1.5 flex items-center gap-2">
                    Configuration des textes de la <span className="text-indigo-500 dark:text-indigo-400 font-bold decoration-indigo-200 underline underline-offset-4 decoration-2">Position de la MAE Assurance</span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {[
                  { level: 1, label: "Score ≤ 4 (Faible)", icon: "🛡️", color: "border-emerald-500/30 bg-emerald-50/30 text-emerald-700" },
                  { level: 2, label: "Score 5 – 8 (Modéré)", icon: "⚠️", color: "border-yellow-500/30 bg-yellow-50/30 text-yellow-700" },
                  { level: 3, label: "Score 9 – 12 (Élevé)", icon: "🔥", color: "border-orange-500/30 bg-orange-50/30 text-orange-700" },
                  { level: 4, label: "Score ≥ 13 (Très élevé)", icon: "🚨", color: "border-rose-500/30 bg-rose-50/30 text-rose-700" },
                ].map((item) => (
                  <div key={item.level} className={cn("p-6 rounded-3xl border-2 transition-all hover:shadow-lg space-y-4", item.color)}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{item.icon}</span>
                      <Label className="text-[11px] font-black uppercase tracking-widest opacity-70">{item.label}</Label>
                    </div>
                    <Textarea
                      placeholder="Définir le texte pour ce niveau..."
                      value={tempMaePositions[item.level] || ""}
                      onChange={(e) => setTempMaePositions({ ...tempMaePositions, [item.level]: e.target.value })}
                      className="min-h-[100px] bg-white/80 dark:bg-slate-900/80 border-none shadow-inner rounded-xl font-bold text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3 text-slate-400 italic text-[11px] font-medium">
                  <Info className="h-4 w-4" />
                  Ces textes seront utilisés dans le tableau DMR et lors de l'export Excel.
                </div>
                <Button
                  onClick={async () => {
                    for (const [level, text] of Object.entries(tempMaePositions)) {
                      await updateMaePosition(Number(level), text);
                    }
                    toast({
                      title: "Paramètres enregistrés",
                      description: "Les positions de la MAE ont été mises à jour avec succès.",
                    });
                    if (user) {
                      logAction({
                        userEmail: user.email,
                        userName: user.name,
                        action: 'SETTINGS_UPDATE',
                        label: "A mis à jour les positions de la MAE Assurance",
                        module: 'Cartographie des Risques'
                      });
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest px-10 h-12 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                >
                  <Save className="mr-2 h-4 w-4" /> Enregistrer les positions
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table" className="mt-0 focus-visible:ring-0">
          <RiskKPIs risks={filteredRisks} />
          <Card className="shadow-xl border-none bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="border-collapse">
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none w-[28%]">Facteurs de risques</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none w-[20%]">Sous facteurs de risques</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none">Direction</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none text-center">Impact</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none text-center">Probabilité / Fréquence</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none text-center">Score</TableHead>
                      <TableHead className="py-3 px-4 text-right font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-none">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRisks.length > 0 ? (
                      (() => {
                        // Group risks by category
                        const grouped: Record<string, typeof filteredRisks> = {};
                        filteredRisks.forEach(risk => {
                          if (!grouped[risk.category]) grouped[risk.category] = [];
                          grouped[risk.category].push(risk);
                        });
                        return Object.entries(grouped).map(([category, categoryRisks]) => (
                          <React.Fragment key={category}>
                            {/* Category header row */}
                            <TableRow className="bg-slate-50/80 dark:bg-slate-900/40 border-y border-slate-200/50 dark:border-slate-800/50 group/cat">
                              <TableCell colSpan={7} className="py-2.5 px-4 border-l-4 border-l-primary">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-800 dark:text-slate-200">{category}</span>
                                  <span className="text-[9px] font-bold text-slate-400 ml-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">{categoryRisks.length} Scénario{categoryRisks.length > 1 ? 's' : ''}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                            {categoryRisks.map((risk) => {
                              const score = calculateRiskScore(risk.probabilite, risk.impact);
                              const style = getRiskScoreStyle(score);
                              const hasAlert = !!findAlertByRiskId(risk.id);
                              const dateLabel = risk.lastUpdated && risk.lastUpdated !== risk.createdAt
                                ? `Modifié le ${new Date(risk.lastUpdated).toLocaleDateString('fr-FR')}`
                                : risk.createdAt
                                  ? `Créé le ${new Date(risk.createdAt).toLocaleDateString('fr-FR')}`
                                  : risk.lastUpdated
                                    ? `Créé le ${new Date(risk.lastUpdated).toLocaleDateString('fr-FR')}`
                                    : null;
                              return (
                                <TableRow key={risk.id} className="group hover:bg-primary/[0.02] transition-all border-b border-slate-200/60 dark:border-slate-800/60 border-l-2 border-l-transparent hover:border-l-primary divide-x divide-slate-100 dark:divide-slate-800/40">
                                  <TableCell className="py-3 px-4">
                                    <div className="flex items-start gap-2">
                                      <div className="flex flex-col gap-0.5 flex-1">
                                        <div className="flex items-center gap-2">
                                          {risk.documentId && documents.find(d => d.id === risk.documentId) && (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                {documents.find(d => d.id === risk.documentId)?.url ? (
                                                  <a href={documents.find(d => d.id === risk.documentId)?.url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-700 transition-colors">
                                                    <FileText className="h-3 w-3" />
                                                  </a>
                                                ) : (
                                                  <div className="text-slate-400">
                                                    <FileText className="h-3 w-3" />
                                                  </div>
                                                )}
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p className="text-[10px] font-bold">Document: {documents.find(d => d.id === risk.documentId)?.name}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
                                        <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 leading-tight group-hover:underline cursor-pointer decoration-primary/30" onClick={() => openDialog('edit', risk)}>
                                          {risk.riskDescription}
                                        </span>
                                        {dateLabel && (
                                          <span className="text-[9px] text-slate-400 font-medium mt-0.5">{dateLabel}</span>
                                        )}
                                      </div>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0 rounded-full hover:bg-indigo-50 hover:text-indigo-600 flex-shrink-0">
                                            <Info className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="max-w-sm p-3 rounded-xl">
                                          <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mesures d'atténuation</p>
                                            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                              {formatMitigationMeasures(risk.expectedAction)}
                                            </div>
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-3 px-4">
                                    {risk.subFactors ? (
                                      <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300 leading-tight">{risk.subFactors}</span>
                                    ) : (
                                      <span className="text-[11px] italic text-slate-300 dark:text-slate-600">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-3 px-4">
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                                      {risk.department}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-3 px-4 text-center">
                                    <span className="text-xl font-black text-slate-700 dark:text-slate-300">{risk.impact}</span>
                                    <span className="text-[9px] text-slate-400 block">/4</span>
                                  </TableCell>
                                  <TableCell className="py-3 px-4 text-center">
                                    <span className="text-xl font-black text-slate-700 dark:text-slate-300">{risk.probabilite}</span>
                                    <span className="text-[9px] text-slate-400 block">/4</span>
                                  </TableCell>
                                  <TableCell className="py-3 px-4 text-center">
                                    <div className={cn("inline-flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2", style.bg, style.border)}>
                                      <span className={cn("text-2xl font-black leading-none", style.text)}>{score}</span>
                                      <span className={cn("text-[8px] font-bold uppercase leading-tight", style.text)}>{style.label}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-3 px-4 text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleToggleAlert(risk)}
                                        className={cn("h-7 w-7 rounded transition-all", hasAlert ? "text-rose-500 bg-rose-50" : "text-slate-400 hover:bg-slate-100")}
                                      >
                                        {hasAlert ? <Bell className="h-4 w-4 fill-current" /> : <BellOff className="h-4 w-4" />}
                                      </Button>

                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" className="h-7 w-7 p-0 rounded hover:bg-slate-100">
                                            <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40 rounded-lg shadow-xl">
                                          <DropdownMenuItem onClick={() => openDialog('edit', risk)} className="text-xs font-bold py-2">
                                            <Edit className="mr-2 h-3.5 w-3.5 text-indigo-500" /> Modifier
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            onClick={() => openDialog('delete', risk)}
                                            className="text-rose-600 text-xs font-bold py-2 focus:text-rose-600 focus:bg-rose-50"
                                          >
                                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Supprimer
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </React.Fragment>
                        ));
                      })()
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-40 text-center text-slate-400 text-sm font-bold">
                          Aucun risque ne correspond aux filtres
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="p-8 border-t border-slate-50 dark:border-slate-800 justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground underline decoration-emerald-200 underline-offset-4">Residuel</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground underline decoration-rose-200 underline-offset-4">Critique</span>
                </div>
              </div>
              <p className="text-[10px] font-bold text-slate-400">Dernière mise à jour : {new Date().toLocaleDateString()}</p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Add/Edit Risk Dialog ─── */}
      <Dialog open={dialogState.mode === "add" || dialogState.mode === "edit"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="rounded-[2.5rem] p-0 max-w-3xl border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] overflow-hidden bg-white dark:bg-slate-950">
          <div className="bg-slate-50/50 dark:bg-slate-900/50 p-10 border-b border-slate-100 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {dialogState.mode === "add" ? "Fixer une" : "Ajuster l'"} <span className="text-primary italic">Exposition</span>
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">
                Paramétrez les détails du scénario pour affiner la cartographie des risques.
              </DialogDescription>
            </DialogHeader>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)}>
              <div className="p-10 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">

                {/* SECTION 1: CONTEXTE DU RISQUE */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-1 bg-primary rounded-full" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Identification & Contexte</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="riskDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Facteurs de risques</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Décrivez le facteur de risque principal..." className="min-h-[100px] rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 font-semibold text-sm transition-all shadow-sm" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="subFactors"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sous facteurs de risques</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Détaillez les sous-facteurs liés à ce risque..." className="min-h-[80px] rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 font-semibold text-sm transition-all shadow-sm" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="expectedAction"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mesure d'atténuation (existante)</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Dispositif en place pour atténuer le risque..." className="min-h-[80px] rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 font-semibold text-sm transition-all shadow-sm" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Direction Responsable</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                              <FormControl><SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 font-bold shadow-sm"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent className="rounded-xl border-none shadow-2xl">
                                {departmentOptions.map(d => <SelectItem key={d} value={d} className="font-bold">{d}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Domaine d'Application</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                              <FormControl><SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 font-bold shadow-sm"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent className="rounded-xl border-none shadow-2xl">
                                {categoryOptions.map(c => <SelectItem key={c} value={c} className="font-bold">{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800 w-full" />

                {/* SECTION 2: ÉVALUATIONS DES RISQUES */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Evaluation Brute */}
                  <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/40 p-6 rounded-[2rem] border border-slate-200/60 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-4 w-1 bg-amber-500 rounded-full" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Évaluation Brute</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="impact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Impact</FormLabel>
                            <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value || 1)}>
                              <FormControl><SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold shadow-sm">{field.value}</SelectTrigger></FormControl>
                              <SelectContent className="rounded-xl border-none shadow-2xl">
                                {[1, 2, 3, 4].map((v) => <SelectItem key={v} value={String(v)} className="font-bold">{v} - {impactLabels[v].label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="probabilite"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Probabilité</FormLabel>
                            <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value || 1)}>
                              <FormControl><SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold shadow-sm">{field.value}</SelectTrigger></FormControl>
                              <SelectContent className="rounded-xl border-none shadow-2xl">
                                {[1, 2, 3, 4].map((v) => <SelectItem key={v} value={String(v)} className="font-bold">{v} - {probabiliteLabels[v].label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Score Brut</span>
                      <div className={cn("px-3 py-1 rounded-lg border font-black text-sm", getRiskScoreStyle(Number(form.watch('impact') || 1) * Number(form.watch('probabilite') || 1)).bg, getRiskScoreStyle(Number(form.watch('impact') || 1) * Number(form.watch('probabilite') || 1)).text)}>
                        {Number(form.watch('impact') || 1) * Number(form.watch('probabilite') || 1)}
                      </div>
                    </div>
                  </div>

                  {/* Evaluation Résiduelle (DMR) */}
                  <div className="space-y-4 bg-primary/5 dark:bg-primary/10 p-6 rounded-[2rem] border border-primary/20 dark:border-primary/40 relative overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-4 w-1 bg-primary rounded-full" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Évaluation Résiduelle (DMR)</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dmrEfficiency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Niveau d'efficacité</FormLabel>
                            <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value || 2)}>
                              <FormControl><SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-900 border-2 border-primary/20 font-bold shadow-sm">{field.value}</SelectTrigger></FormControl>
                              <SelectContent className="rounded-xl border-none shadow-2xl">
                                {dmrEfficiencyLevels.map((level) => (
                                  <SelectItem key={level.value} value={String(level.value)} className="font-bold py-2">
                                    <div className="flex flex-col">
                                      <span className="text-[10px] uppercase">{level.value} - {level.label}</span>
                                      <span className="text-[8px] font-normal opacity-60 italic leading-tight">{level.description}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dmrProbability"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Proba. DMR</FormLabel>
                            <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value || 1)}>
                              <FormControl><SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-900 border-2 border-primary/20 font-bold shadow-sm">{field.value}</SelectTrigger></FormControl>
                              <SelectContent className="rounded-xl border-none shadow-2xl">
                                {[1, 2, 3, 4].map((v) => <SelectItem key={v} value={String(v)} className="font-bold">{v} - {probabiliteLabels[v].label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-primary/20">
                      <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">Score Résiduel</span>
                      <div className={cn("px-3 py-1 rounded-lg border font-black text-sm", getRiskScoreStyle(Number(form.watch('dmrEfficiency') || 2) * Number(form.watch('dmrProbability') || form.watch('probabilite') || 1)).bg, getRiskScoreStyle(Number(form.watch('dmrEfficiency') || 2) * Number(form.watch('dmrProbability') || form.watch('probabilite') || 1)).text)}>
                        {Number(form.watch('dmrEfficiency') || 2) * Number(form.watch('dmrProbability') || form.watch('probabilite') || 1)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: PLAN D'ACTIONS & DETAILS */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-1 bg-indigo-500 rounded-full" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Plan d'actions & Suivi</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="weaknessPoint"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Point de faiblesse identifié</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: Absence de procédure formalisée..." className="h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold text-xs shadow-sm" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="actionCorrective"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Action corrective prévue</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                value={field.value || ""}
                                placeholder="Mesures pour réduire le risque..."
                                className="min-h-[100px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold text-xs shadow-sm"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="deadline"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Échéance</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" className="h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-xs shadow-sm" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="responsible"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Responsable</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Nom ou Direction..." className="h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-xs shadow-sm" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="completionLevel"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              <span>Niveau d'avancement</span>
                              <span className="text-primary">{field.value}%</span>
                            </FormLabel>
                            <FormControl>
                              <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value || 0)}>
                                <SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-xs shadow-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                  {completionOptions.map(opt => (
                                    <SelectItem key={opt.value} value={String(opt.value)} className="font-bold">
                                      <div className="flex items-center gap-2">
                                        <div className={cn("w-2.5 h-2.5 rounded-full", opt.color)} />
                                        <span>{opt.label}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    <div className="md:col-span-1">
                      <FormField
                        control={form.control}
                        name="documentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Document de référence</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || "none"}>
                              <FormControl><SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold shadow-sm"><SelectValue placeholder="Aucun document" /></SelectTrigger></FormControl>
                              <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="none" className="font-bold text-slate-400">Aucun document</SelectItem>
                                {documents.map((doc: any) => <SelectItem key={doc.id} value={doc.id} className="font-bold">{doc.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <FormField
                        control={form.control}
                        name="documentAnchor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Page / Mot-clé</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: 12 ou 'Article 5'..." className="h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold text-xs shadow-sm" />
                            </FormControl>
                            <FormDescription className="text-[8px] italic opacity-60">Redirige vers cette page ou cherche ce texte dans le PDF.</FormDescription>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <FormField
                        control={form.control}
                        name="justification"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Liens & Justifs</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Base légale, procédure interne..."
                                className="min-h-[80px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold text-xs shadow-sm"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 p-8 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <DialogClose asChild>
                  <Button type="button" variant="ghost" className="h-12 px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest text-slate-500">Annuler</Button>
                </DialogClose>
                <Button type="submit" className="h-12 px-10 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl transition-all active:scale-95">
                  {dialogState.mode === "add" ? "Fixer le Scénario" : "Mettre à jour"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={dialogState.mode === "delete"} onOpenChange={(open) => !open && closeDialog()}>
        <AlertDialogContent className="rounded-[3rem] p-10 border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-3xl font-black tracking-tighter uppercase italic">Effacer le <span className="text-rose-600">Risque</span></AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium">
              Voulez-vous vraiment retirer ce scénario du registre officiel ? Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-8 gap-3">
            <AlertDialogCancel className="h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest border-slate-200">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => dialogState.data && handleDeleteRisk(dialogState.data.id, dialogState.data.riskDescription)}
              className="h-14 px-8 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-rose-600/20"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* LECTEUR PDF COLLABORATIF */}
      <Sheet open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <SheetContent side="right" className="sm:max-w-[70vw] w-full p-0 flex flex-col gap-0 border-l border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
          <SheetHeader className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950">
                <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <SheetTitle className="text-lg font-black text-slate-800 dark:text-white line-clamp-1 truncate max-w-[50vw]">
                  {viewerConfig.title || "Document"}
                </SheetTitle>
                <SheetDescription className="text-[11px] font-bold text-slate-500">
                  {viewerConfig.anchor ? `Navigation vers : ${viewerConfig.anchor}` : "Consultation collaborative du document"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          
          <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative">
            {viewerConfig.url ? (
              <iframe 
                src={(() => {
                  let baseUrl = viewerConfig.url;
                  
                  // Traitement spécial pour les liens Dropbox
                  if (baseUrl.includes('dropbox.com')) {
                    // Nettoyage des paramètres existants pour forcer le mode brut (raw=1)
                    // C'est le seul mode qui permet au navigateur d'utiliser son lecteur natif (et donc la pagination)
                    baseUrl = baseUrl.replace(/[?&]dl=[01]/g, '');
                    baseUrl = baseUrl.includes('?') ? `${baseUrl}&raw=1` : `${baseUrl}?raw=1`;
                  }

                  const anchor = viewerConfig.anchor;
                  if (!anchor) return baseUrl;
                  
                  // Construction de l'URL avec paramètres PDF.js (compatible Chrome/Edge/Firefox)
                  // On s'assure que le hash est bien à la toute fin
                  if (/^\d+$/.test(anchor)) return `${baseUrl}#page=${anchor}`;
                  return `${baseUrl}#search="${encodeURIComponent(anchor)}"`;
                })()}
                className="w-full h-full border-none"
                title="Lecteur PDF"
                // On permet le mode plein écran et les scripts nécessaires au lecteur PDF natif
                allow="autoplay; fullscreen"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                <FileWarning className="h-12 w-12 opacity-20" />
                <p className="font-bold text-sm">Impossible de charger le document</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
