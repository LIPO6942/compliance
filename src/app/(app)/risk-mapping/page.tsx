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
import { Map, PlusCircle, MoreHorizontal, Edit, Trash2, Bell, BellOff, FileText, Link as LinkIcon, ChevronsUpDown, LayoutGrid, List, AlertTriangle, UserX, FileWarning, ShieldAlert, Target, Activity, Search, ShieldCheck, FolderOpen, Info, Download } from "lucide-react";
import ExcelJS from "exceljs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { RiskMappingItem, RiskLevel, RiskCategory, Document } from '@/types/compliance';
import { useRiskMapping } from "@/contexts/RiskMappingContext";
import { useIdentifiedRegulations } from "@/contexts/IdentifiedRegulationsContext";
import { useDocuments } from "@/contexts/DocumentsContext";
import Link from "next/link";
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

const riskSchema = z.object({
  department: z.string().min(1, "La direction est requise."),
  category: z.enum(["Clients", "Produits et Services", "Pays et Zones Géographiques", "Canaux de Distribution"]),
  riskDescription: z.string().min(1, "La description du risque est requise."),
  probabilite: z.coerce.number().min(1, "Min: 1").max(4, "Max: 4"),
  impact: z.coerce.number().min(1, "Min: 1").max(4, "Max: 4"),
  expectedAction: z.string().min(1, "L'action attendue est requise."),
  owner: z.string().min(1, "Le propriétaire est requis."),
  documentId: z.string().optional(),
});

type RiskFormValues = z.infer<typeof riskSchema>;

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

const exportToExcel = async (risks: import('@/types/compliance').RiskMappingItem[]) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Compliance Navigator";
  wb.created = new Date();

  const probLabels: Record<number, string> = { 1: "Improbable", 2: "Rarement", 3: "Fréquent", 4: "Souvent" };
  const impLabels: Record<number, string> = { 1: "Faible", 2: "Modéré", 3: "Élevé", 4: "Très élevé" };

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

  const applyBorder = (cell: ExcelJS.Cell, color = "FFE2E8F0") => {
    const side = { style: "thin" as const, color: { argb: color } };
    cell.border = { top: side, bottom: side, left: side, right: side };
  };

  // ── SHEET 1 : Cartographie ──────────────────────────────────────────────────
  const ws1 = wb.addWorksheet("Cartographie");

  ws1.columns = [
    { header: "N°", key: "num", width: 5 },
    { header: "Scénario de Risque", key: "desc", width: 52 },
    { header: "Catégorie", key: "cat", width: 30 },
    { header: "Direction", key: "dept", width: 18 },
    { header: "Probabilité (valeur)", key: "pv", width: 22 },
    { header: "Probabilité (libellé)", key: "pl", width: 20 },
    { header: "Impact (valeur)", key: "iv", width: 16 },
    { header: "Impact (libellé)", key: "il", width: 16 },
    { header: "Score", key: "score", width: 8 },
    { header: "Niveau de Risque", key: "level", width: 16 },
    { header: "Propriétaire du Risque", key: "owner", width: 25 },
    { header: "Mesure d'atténuation", key: "action", width: 52 },
  ];

  // Style header row
  const headerRow = ws1.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    applyBorder(cell, "FF94A3B8");
  });

  // Data rows
  risks.forEach((risk, i) => {
    const score = calculateRiskScore(risk.probabilite, risk.impact);
    const level = calculateRiskLevel(risk.probabilite, risk.impact);
    const rowBg = i % 2 === 0 ? "FFF8FAFC" : "FFFFFFFF";

    const row = ws1.addRow({
      num: i + 1,
      desc: risk.riskDescription,
      cat: risk.category,
      dept: risk.department,
      pv: risk.probabilite,
      pl: probLabels[risk.probabilite] ?? "",
      iv: risk.impact,
      il: impLabels[risk.impact] ?? "",
      score,
      level,
      owner: risk.owner,
      action: risk.expectedAction,
    });
    row.height = 36;

    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: "middle", wrapText: true, horizontal: colNumber === 1 ? "center" : "left" };
      applyBorder(cell);
      if (colNumber === 10) {
        // Level column — color by risk level
        cell.fill = { type: "pattern", pattern: "solid", fgColor: levelBg[level] || { argb: "FFFFFFFF" } };
        cell.font = { bold: true, color: levelFont[level] || { argb: "FF000000" }, size: 10 };
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.font = { color: { argb: "FF1E293B" }, size: 10 };
      }
    });
  });

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

  // Grille Probabilité
  addTitle("LÉGENDE — GRILLE DE COTATION DES RISQUES");
  ws2.addRow([]);
  addTitle("1. GRILLE DE PROBABILITÉ / FRÉQUENCE");
  addSubHeader(["Valeur", "Libellé", "Description", ""]);
  addDataRow2(["1", "Improbable", "Une fois tous les 1 à 5 ans", ""]);
  addDataRow2(["2", "Rarement", "Semestrielle / Annuelle", ""]);
  addDataRow2(["3", "Fréquent", "Mensuelle à Semestrielle", ""]);
  addDataRow2(["4", "Souvent", "Hebdomadaire / Quotidien", ""]);

  // Grille Impact
  ws2.addRow([]);
  addTitle("2. GRILLE D'IMPACT");
  addSubHeader(["Valeur", "Libellé", "Description", ""]);
  addDataRow2(["1", "Faible", "Menace mineure", ""]);
  addDataRow2(["2", "Modéré", "Menace raisonnable", ""]);
  addDataRow2(["3", "Élevé", "Menace importante", ""]);
  addDataRow2(["4", "Très élevé", "Menace majeure", ""]);

  // Grille Score
  ws2.addRow([]);
  addTitle("3. GRILLE SCORE → NIVEAU DE RISQUE");
  addSubHeader(["Score (Probabilité × Impact)", "Niveau de Risque", "Couleur", "Interprétation"]);
  addDataRow2(["≤ 4", "Faible", "Vert", "Risque résiduel acceptable"], "Faible");
  addDataRow2(["5 – 8", "Modéré", "Jaune", "Surveillance recommandée"], "Modéré");
  addDataRow2(["9 – 12", "Élevé", "Orange", "Action corrective requise"], "Élevé");
  addDataRow2(["≥ 13", "Très élevé", "Rouge", "Escalade immédiate nécessaire"], "Très élevé");

  // ── Download ────────────────────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Cartographie_Risques_${today}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};

const getRiskScoreStyle = (score: number): { bg: string; text: string; border: string; label: string } => {
  if (score <= 4) return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Faible" };
  if (score <= 8) return { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", label: "Modéré" };
  if (score <= 12) return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "Élevé" };
  return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", label: "Très élevé" };
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

export default function RiskMappingPage() {
  const { risks, addRisk, editRisk, removeRisk, globalDocumentIds, setGlobalDocumentIds } = useRiskMapping();
  const { createAlertFromRisk, findAlertByRiskId, removeAlertByRiskId } = useIdentifiedRegulations();
  const { documents } = useDocuments();
  const { toast } = useToast();

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
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [viewMode, setViewMode] = React.useState<"table" | "heatmap" | "analysis">("table");

  // Global documents popover state
  const [globalDocsOpen, setGlobalDocsOpen] = React.useState(false);

  const openDialog = (mode: "add" | "edit" | "delete", data?: RiskMappingItem) => {
    setDialogState({ mode, data });
    if (mode === "edit" && data) {
      form.reset({
        department: data.department,
        category: data.category,
        riskDescription: data.riskDescription,
        probabilite: data.probabilite ?? 1,
        impact: data.impact ?? 1,
        expectedAction: data.expectedAction,
        owner: data.owner,
        documentId: data.documentId || "",
      });
    } else {
      form.reset({
        department: departmentOptions[0],
        category: categoryOptions[0],
        probabilite: 2,
        impact: 2,
        riskDescription: "",
        expectedAction: "",
        owner: "",
        documentId: "",
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
        expectedAction: values.expectedAction || "",
        owner: values.owner || "",
        documentId: values.documentId && values.documentId !== "none" ? values.documentId : undefined,
      };

      if (dialogState.mode === "add") {
        await addRisk({
          ...sanitizedValues,
          probabilite: numProba,
          impact: numImpact,
          riskLevel: calculateRiskLevel(numProba, numImpact),
        });
        toast({ title: "Risque identifié", description: "La cartographie a été mise à jour." });
      } else if (dialogState.mode === "edit" && dialogState.data?.id) {
        await editRisk(dialogState.data.id, {
          ...sanitizedValues,
          probabilite: numProba,
          impact: numImpact,
          riskLevel: calculateRiskLevel(numProba, numImpact),
        });
        toast({ title: "Risque modifié", description: "Les détails du risque ont été actualisés." });
      }
      closeDialog();
    } catch (e: any) {
      console.error("Erreur lors de la sauvegarde du risque:", e);
      toast({ variant: "destructive", title: "Erreur", description: `Impossible d'enregistrer les modifications: ${e.message || 'Erreur inconnue'}` });
    }
  };

  const handleDeleteRisk = async (id: string) => {
    try {
      const alert = findAlertByRiskId(id);
      if (alert) await removeAlertByRiskId(id);
      await removeRisk(id);
      toast({ title: "Risque supprimé", description: "Le risque a été retiré de la cartographie." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Action impossible." });
    }
  };

  const handleToggleAlert = async (risk: RiskMappingItem) => {
    const existingAlert = findAlertByRiskId(risk.id);
    if (existingAlert) {
      await removeAlertByRiskId(risk.id);
      toast({ title: "Alerte désactivée", description: "Le lien entre ce risque et le centre d'alertes est rompu." });
    } else {
      createAlertFromRisk(risk);
      toast({ title: "Alerte générée", description: "Une alerte critique a été envoyée au centre de commande." });
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportToExcel(filteredRisks)}
              className="h-9 px-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] shadow-sm transition-all hover:scale-[1.02]"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Exporter Excel
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
                    onClick={() => setGlobalDocumentIds(globalDocumentIds.filter(id => id !== doc.id))}
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
          <TabsList className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl h-12 w-full xl:w-auto border border-slate-200 dark:border-slate-800">
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

        <TabsContent value="analysis" className="mt-0 focus-visible:ring-0">
          <RiskKPIs risks={filteredRisks} />
        </TabsContent>

        <TabsContent value="heatmap" className="mt-0 focus-visible:ring-0">
          <RiskHeatmap risks={filteredRisks} onEditRisk={(risk) => openDialog('edit', risk)} />
        </TabsContent>

        <TabsContent value="table" className="mt-0 focus-visible:ring-0">
          <RiskKPIs risks={filteredRisks} />
          <Card className="shadow-xl border-none bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="border-collapse">
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 divide-x divide-slate-200 dark:divide-slate-800">
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-400 w-[35%] bg-slate-50/50 dark:bg-transparent">Scénario de Risque</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-400">Direction</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-400 text-center">Impact</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-400 text-center">Probabilité / Fréquence</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-400 text-center">Score</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-400">Propriétaire du risque</TableHead>
                      <TableHead className="py-3 px-4 text-right font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRisks.length > 0 ? (
                      filteredRisks.map((risk) => {
                        const score = calculateRiskScore(risk.probabilite, risk.impact);
                        const style = getRiskScoreStyle(score);
                        const hasAlert = !!findAlertByRiskId(risk.id);
                        return (
                          <TableRow key={risk.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors border-b border-slate-200 dark:border-slate-800 divide-x divide-slate-100 dark:divide-slate-800">
                            <TableCell className="py-3 px-4">
                              <div className="flex items-start gap-2">
                                <div className="flex flex-col gap-0.5 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold text-primary/70 uppercase tracking-widest leading-none">{risk.category}</span>
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
                                </div>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0 rounded-full hover:bg-indigo-50 hover:text-indigo-600 flex-shrink-0">
                                      <Info className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-sm p-3 rounded-xl">
                                    <div className="space-y-2">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mesure d'atténuation</p>
                                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{risk.expectedAction || "Aucune mesure définie"}</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
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
                            <TableCell className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[9px] font-black uppercase">
                                  {risk.owner[0]}
                                </div>
                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">{risk.owner}</span>
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
                      })
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
                    <FormField
                      control={form.control}
                      name="riskDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Scénario de Risque</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Décrivez le scénario redouté..." className="min-h-[120px] rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 font-semibold text-sm transition-all shadow-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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

                {/* SECTION 2: SCORING */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-1 bg-amber-500 rounded-full" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cotation du Risque</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: numeric inputs + live score */}
                    <div className="bg-slate-50/60 dark:bg-slate-900/30 p-6 rounded-3xl space-y-6 border-2 border-slate-100 dark:border-slate-800/50 shadow-inner">
                      <div className="grid grid-cols-2 gap-10">
                        <FormField
                          control={form.control}
                          name="impact"
                          render={({ field }) => {
                            const impactValue = Number(field.value) || 1;
                            const impactLabel = impactLabels[impactValue as keyof typeof impactLabels];
                            return (
                              <FormItem className="w-full">
                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Impact</FormLabel>
                                <Select onValueChange={(v) => field.onChange(Number(v))} value={String(impactValue)}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 w-full rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 font-bold shadow-sm">
                                      <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 text-xs font-black">
                                          {impactValue}
                                        </span>
                                        <span className="text-sm">{impactLabel?.label}</span>
                                      </div>
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="rounded-xl border-none shadow-2xl">
                                    {[1, 2, 3, 4].map((val) => (
                                      <SelectItem key={val} value={String(val)} className="font-bold">
                                        <div className="flex items-center gap-2">
                                          <span className={cn(
                                            "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black",
                                            val === 1 && "bg-emerald-100 text-emerald-600",
                                            val === 2 && "bg-yellow-100 text-yellow-600",
                                            val === 3 && "bg-orange-100 text-orange-600",
                                            val === 4 && "bg-rose-100 text-rose-600"
                                          )}>
                                            {val}
                                          </span>
                                          <div>
                                            <span className="text-sm font-bold">{impactLabels[val].label}</span>
                                            <p className="text-[9px] text-slate-400 font-normal">{impactLabels[val].description}</p>
                                          </div>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-[9px] text-slate-400 mt-1">{impactLabel?.description}</p>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />

                        <FormField
                          control={form.control}
                          name="probabilite"
                          render={({ field }) => {
                            const probaValue = Number(field.value) || 1;
                            const probaLabel = probabiliteLabels[probaValue as keyof typeof probabiliteLabels];
                            return (
                              <FormItem className="w-full">
                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Probabilité / Fréquence</FormLabel>
                                <Select onValueChange={(v) => field.onChange(Number(v))} value={String(probaValue)}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 w-full rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 font-bold shadow-sm">
                                      <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black">
                                          {probaValue}
                                        </span>
                                        <span className="text-sm">{probaLabel?.label}</span>
                                      </div>
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="rounded-xl border-none shadow-2xl">
                                    {[1, 2, 3, 4].map((val) => (
                                      <SelectItem key={val} value={String(val)} className="font-bold">
                                        <div className="flex items-center gap-2">
                                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black">
                                            {val}
                                          </span>
                                          <div>
                                            <span className="text-sm font-bold">{probabiliteLabels[val].label}</span>
                                            <p className="text-[9px] text-slate-400 font-normal">{probabiliteLabels[val].description}</p>
                                          </div>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-[9px] text-slate-400 mt-1">{probaLabel?.description}</p>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </div>

                      {/* Live score display */}
                      <div className="flex flex-col items-center gap-1 pt-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Score calculé</span>
                        {liveScore !== null ? (() => {
                          const style = getRiskScoreStyle(liveScore);
                          return (
                            <div className={cn("flex flex-col items-center justify-center w-24 h-24 rounded-2xl border-2 transition-all", style.bg, style.border)}>
                              <span className={cn("text-4xl font-black leading-none", style.text)}>{liveScore}</span>
                              <span className={cn("text-[9px] font-black uppercase leading-tight mt-1", style.text)}>{style.label}</span>
                            </div>
                          );
                        })() : (
                          <div className="flex flex-col items-center justify-center w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50">
                            <span className="text-3xl font-black text-slate-300">—</span>
                          </div>
                        )}
                        <p className="text-[9px] text-slate-400 mt-1">Probabilité × Impact</p>
                      </div>
                    </div>

                    {/* Right: action + owner */}
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="documentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Document lié (optionnel)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || "none"}>
                              <FormControl><SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 font-bold shadow-sm"><SelectValue placeholder="Aucun document" /></SelectTrigger></FormControl>
                              <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="none" className="font-bold text-slate-400">Aucun document</SelectItem>
                                {documents.map((doc: Document) => <SelectItem key={doc.id} value={doc.id} className="font-bold">{doc.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="owner"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Propriétaire du Risque</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Identité du responsable..." className="h-12 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 font-bold shadow-sm" />
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
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mesure d'atténuation</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Mesures prévues pour réduire le risque..."
                                className="min-h-[110px] rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 font-semibold text-sm shadow-sm leading-relaxed"
                                onChange={(e) => {
                                  let val = e.target.value;

                                  // Auto-format into bullet points
                                  if (val.length > 0) {
                                    // If the text doesn't start with a bullet, add one
                                    if (!val.startsWith('• ')) {
                                      val = '• ' + val;
                                    }

                                    // If user pressed Enter, add a bullet on the new line
                                    val = val.replace(/\n(?!\• )/g, '\n• ');
                                  }

                                  field.onChange(val);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
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
              onClick={() => dialogState.data && handleDeleteRisk(dialogState.data.id)}
              className="h-14 px-8 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-rose-600/20"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
