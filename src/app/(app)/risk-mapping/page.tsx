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
import { Map, PlusCircle, MoreHorizontal, Edit, Trash2, Bell, BellOff, FileText, Link as LinkIcon, ChevronsUpDown, LayoutGrid, List, AlertTriangle, UserX, FileWarning, ShieldAlert, Target, Activity, Search, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { RiskMappingItem, RiskLikelihood, RiskImpact, RiskLevel, RiskCategory, Document } from '@/types/compliance';
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
  documentIds: z.array(z.string()).optional(),
  riskDescription: z.string().min(1, "La description du risque est requise."),
  likelihood: z.enum(["Faible", "Modérée", "Élevée", "Très élevée"]),
  impact: z.enum(["Faible", "Modéré", "Élevé", "Très élevé"]),
  expectedAction: z.string().min(1, "L'action attendue est requise."),
  owner: z.string().min(1, "Le propriétaire est requis."),
});

type RiskFormValues = z.infer<typeof riskSchema>;

const likelihoodMap: Record<RiskLikelihood, number> = { "Faible": 1, "Modérée": 2, "Élevée": 3, "Très élevée": 4 };
const impactMap: Record<RiskImpact, number> = { "Faible": 1, "Modéré": 2, "Élevé": 3, "Très élevé": 4 };

const calculateRiskScore = (likelihood: RiskLikelihood, impact: RiskImpact): number => {
  return (likelihoodMap[likelihood] || 1) * (impactMap[impact] || 1);
};

const calculateRiskLevel = (likelihood: RiskLikelihood, impact: RiskImpact): RiskLevel => {
  const score = calculateRiskScore(likelihood, impact);
  if (score <= 4) return "Faible";
  if (score <= 8) return "Modéré";
  if (score <= 11) return "Élevé";
  return "Très élevé";
};

const riskLevelColors: Record<RiskLevel, string> = {
  "Faible": "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-800/20 dark:text-emerald-300 dark:border-emerald-700/50",
  "Modéré": "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-800/20 dark:text-amber-300 dark:border-amber-700/50",
  "Élevé": "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-800/20 dark:text-orange-300 dark:border-orange-700/50",
  "Très élevé": "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-800/20 dark:text-rose-300 dark:border-rose-700/50",
};

const departmentOptions = ["Juridiques", "Finances", "Comptabilité", "Sinistres matériels", "Sinistre corporel", "Equipements", "RH", "DSI", "Audit", "Organisation", "Qualité Vie", "Commercial", "Recouvrement", "Inspection"];
const categoryOptions: RiskCategory[] = ["Clients", "Produits et Services", "Pays et Zones Géographiques", "Canaux de Distribution"];
const likelihoodOptions: RiskLikelihood[] = ["Faible", "Modérée", "Élevée", "Très élevée"];
const impactOptions: RiskImpact[] = ["Faible", "Modéré", "Élevé", "Très élevé"];

export default function RiskMappingPage() {
  const { risks, addRisk, editRisk, removeRisk } = useRiskMapping();
  const { createAlertFromRisk, findAlertByRiskId, removeAlertByRiskId } = useIdentifiedRegulations();
  const { documents } = useDocuments();
  const { toast } = useToast();

  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => { setIsClient(true) }, []);

  const [dialogState, setDialogState] = React.useState<{ mode: "add" | "edit" | null; data?: RiskMappingItem }>({ mode: null });
  const form = useForm<RiskFormValues>({ resolver: zodResolver(riskSchema) });

  const [filterRiskLevel, setFilterRiskLevel] = React.useState<string>("all");
  const [filterDepartment, setFilterDepartment] = React.useState<string>("all");
  const [filterCategory, setFilterCategory] = React.useState<string>("all");
  const [viewMode, setViewMode] = React.useState<"table" | "heatmap" | "analysis">("table");

  const openDialog = (mode: "add" | "edit", data?: RiskMappingItem) => {
    setDialogState({ mode, data });
    if (mode === "edit" && data) {
      form.reset({
        ...data,
        documentIds: data.documentIds || [],
      });
    } else {
      form.reset({
        department: departmentOptions[0],
        category: categoryOptions[0],
        likelihood: "Modérée",
        impact: "Modéré",
        riskDescription: "",
        expectedAction: "",
        owner: "",
        documentIds: [],
      });
    }
  };

  const closeDialog = () => setDialogState({ mode: null });

  const handleFormSubmit = async (values: RiskFormValues) => {
    try {
      if (dialogState.mode === "add") {
        await addRisk({
          ...values,
          riskLevel: calculateRiskLevel(values.likelihood, values.impact)
        });
        toast({ title: "Risque identifié", description: "La cartographie a été mise à jour." });
      } else if (dialogState.mode === "edit" && dialogState.data?.id) {
        await editRisk(dialogState.data.id, {
          ...values,
          riskLevel: calculateRiskLevel(values.likelihood, values.impact)
        });
        toast({ title: "Risque modifié", description: "Les détails du risque ont été actualisés." });
      }
      closeDialog();
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer les modifications." });
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
    const matchesLevel = filterRiskLevel === "all" || calculateRiskLevel(risk.likelihood, risk.impact) === filterRiskLevel;
    const matchesDept = filterDepartment === "all" || risk.department === filterDepartment;
    const matchesCategory = filterCategory === "all" || risk.category === filterCategory;
    return matchesLevel && matchesDept && matchesCategory;
  }), [risks, filterRiskLevel, filterDepartment, filterCategory]);

  if (!isClient) {
    return <div className="flex justify-center items-center h-[60vh]"><Logo className="h-10 w-10 animate-spin" /></div>;
  }

  return (
    <div className="space-y-10 pb-20">

      {/* Header & Vision */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <Badge variant="outline" className="border-primary/50 text-primary bg-primary/5 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            Module de Surveillance
          </Badge>
          <h1 className="text-5xl font-black font-headline tracking-tighter text-slate-900 dark:text-white uppercase italic leading-none">
            Risk <span className="text-primary">Mapping</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Visualisation multidimensionnelle de l'exposition aux risques de conformité.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => openDialog('add')}
          className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-slate-900/20"
        >
          <PlusCircle className="mr-3 h-5 w-5" /> Identifier un Risque
        </Button>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl h-14 w-full md:w-auto shadow-inner">
            <TabsTrigger value="table" className="rounded-xl px-6 h-12 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-lg font-black text-[10px] tracking-widest uppercase">
              <List className="h-4 w-4 mr-2" /> Inventaire
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="rounded-xl px-6 h-12 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-lg font-black text-[10px] tracking-widest uppercase">
              <LayoutGrid className="h-4 w-4 mr-2" /> Heatmap
            </TabsTrigger>
            <TabsTrigger value="analysis" className="rounded-xl px-6 h-12 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-lg font-black text-[10px] tracking-widest uppercase">
              <Activity className="h-4 w-4 mr-2" /> Analytics
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="h-12 w-full sm:w-[160px] rounded-xl border-none bg-white dark:bg-slate-900 shadow-xl text-[10px] font-black uppercase tracking-widest">
                <SelectValue placeholder="DIRECTION" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-[10px] font-black uppercase">TOUTES DIRECTIONS</SelectItem>
                {departmentOptions.map(d => <SelectItem key={d} value={d} className="text-[10px] font-black uppercase">{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterRiskLevel} onValueChange={setFilterRiskLevel}>
              <SelectTrigger className="h-12 w-full sm:w-[160px] rounded-xl border-none bg-white dark:bg-slate-900 shadow-xl text-[10px] font-black uppercase tracking-widest">
                <SelectValue placeholder="NIVEAU" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-[10px] font-black uppercase">TOUS NIVEAUX</SelectItem>
                {["Faible", "Modéré", "Élevé", "Très élevé"].map(l => <SelectItem key={l} value={l} className="text-[10px] font-black uppercase">{l}</SelectItem>)}
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
          <Card className="shadow-2xl border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                      <TableHead className="py-6 px-8 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Scénario de Risque</TableHead>
                      <TableHead className="py-6 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Direction</TableHead>
                      <TableHead className="py-6 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Paramètres</TableHead>
                      <TableHead className="py-6 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Niveau</TableHead>
                      <TableHead className="py-6 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Propriétaire</TableHead>
                      <TableHead className="py-6 text-right font-black uppercase tracking-widest text-[10px] text-muted-foreground px-8">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRisks.length > 0 ? (
                      filteredRisks.map((risk) => {
                        const score = calculateRiskScore(risk.likelihood, risk.impact);
                        const level = calculateRiskLevel(risk.likelihood, risk.impact);
                        const hasAlert = !!findAlertByRiskId(risk.id);
                        return (
                          <TableRow key={risk.id} className="group hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-all border-b border-slate-50 dark:border-slate-800/50">
                            <TableCell className="py-8 px-8 max-w-[340px]">
                              <div className="space-y-1">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest opacity-40">{risk.category}</p>
                                <p className="text-base font-black leading-tight group-hover:underline cursor-pointer" onClick={() => openDialog('edit', risk)}>{risk.riskDescription}</p>
                                {risk.documentIds && risk.documentIds.length > 0 && (
                                  <div className="flex items-center gap-2 pt-2">
                                    <FileText className="h-3 w-3 text-emerald-500" />
                                    <span className="text-[9px] font-black uppercase text-emerald-600">{risk.documentIds.length} Preuves Liées</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-8">
                              <Badge variant="outline" className="border-slate-200 dark:border-slate-800 text-[9px] font-black uppercase px-2 py-1">
                                {risk.department}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-8">
                              <div className="space-y-1">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Proba: <span className="text-slate-900 dark:text-white">{risk.likelihood}</span></div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Impact: <span className="text-slate-900 dark:text-white">{risk.impact}</span></div>
                              </div>
                            </TableCell>
                            <TableCell className="py-8">
                              <Badge className={cn("text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border-2 shadow-sm", riskLevelColors[level])}>
                                {level} {score >= 12 && '🔥'}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-8">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px] font-black">
                                  {risk.owner[0].toUpperCase()}
                                </div>
                                <span className="text-sm font-bold">{risk.owner}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-8 text-right px-8">
                              <div className="flex justify-end gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleToggleAlert(risk)}
                                        className={cn("h-10 w-10 rounded-xl border-slate-100 dark:border-slate-800 transition-all", hasAlert ? "bg-rose-50 border-rose-200 text-rose-500" : "hover:bg-slate-50")}
                                      >
                                        {hasAlert ? <Bell className="h-4 w-4 fill-current" /> : <BellOff className="h-4 w-4" />}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="rounded-xl px-4 py-2 font-bold text-[10px] uppercase shadow-2xl border-none">
                                      {hasAlert ? "Désactiver l'alerte" : "Propager en alerte critique"}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                                      <ChevronsUpDown className="h-5 w-5 opacity-40" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl p-2 border-none bg-white dark:bg-slate-950">
                                    <DropdownMenuLabel className="text-[10px] font-black uppercase opacity-30 px-3 py-2">Administration</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => openDialog('edit', risk)} className="rounded-xl cursor-pointer">
                                      <Edit className="mr-3 h-4 w-4 text-indigo-500" /> Modifier le scénario
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="mx-2 my-1" />
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 rounded-xl cursor-pointer">
                                        <Trash2 className="mr-3 h-4 w-4" /> Supprimer du registre
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-96 text-center">
                          <div className="flex flex-col items-center justify-center space-y-4 opacity-30">
                            <ShieldAlert className="h-20 w-20" />
                            <p className="text-2xl font-black italic uppercase tracking-tighter">Niveau Zéro Risque</p>
                            <p className="text-sm font-bold">Aucun risque ne correspond à vos filtres actuels.</p>
                          </div>
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground underline decoration-rose-200 underline-offset-4">Inhérent</span>
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{filteredRisks.length} Scénarios Monitorés</p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modern Dialog Implementation */}
      <Dialog open={!!dialogState.mode} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
        <DialogContent className="rounded-[3rem] p-10 max-w-2xl border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)]">
          <DialogHeader className="pb-8">
            <DialogTitle className="text-4xl font-black font-headline tracking-tighter uppercase italic">
              Risk <span className="text-primary">Profiling</span>
            </DialogTitle>
            <DialogDescription className="text-base font-medium pt-1">
              Évaluez et documentez une exposition potentielle.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8 max-h-[60vh] overflow-y-auto pr-6 custom-scrollbar">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <FormField control={form.control} name="department" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Direction Affectée</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">{departmentOptions.map(d => <SelectItem key={d} value={d} className="font-bold">{d}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Classification</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">{categoryOptions.map(c => <SelectItem key={c} value={c} className="font-bold">{c}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="riskDescription" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Description du Scénario</FormLabel>
                    <FormControl><Textarea {...field} className="min-h-[100px] rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold p-6 shadow-inner" placeholder="Ex: Défaillance du processus KYC sur les comptes dormants..." /></FormControl><FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-6">
                  <FormField control={form.control} name="likelihood" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Fréquence / Probabilité</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">{likelihoodOptions.map(l => <SelectItem key={l} value={l} className="font-bold">{l}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="impact" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Gravité / Impact</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">{impactOptions.map(i => <SelectItem key={i} value={i} className="font-bold">{i}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="expectedAction" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Action Corrective</FormLabel>
                    <FormControl><Textarea {...field} className="min-h-[80px] rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold p-6 shadow-inner" placeholder="Décrivez les mesures de remédiation..." /></FormControl><FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="owner" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Chef de File</FormLabel>
                      <FormControl><Input {...field} className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold" /></FormControl><FormMessage />
                    </FormItem>
                  )} />

                  <FormField
                    control={form.control}
                    name="documentIds"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Preuves Associées</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="h-14 w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border-none justify-between px-4 font-bold">
                              {field.value && field.value.length > 0 ? `${field.value.length} fichiers liés` : "Sélectionner des documents"}
                              <LinkIcon className="h-4 w-4 opacity-30" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0 rounded-2xl border-none shadow-2xl">
                            <ScrollArea className="h-64 p-4">
                              {documents.map((doc) => (
                                <div key={doc.id} className="flex items-center space-x-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                  <Checkbox
                                    checked={field.value?.includes(doc.id)}
                                    onCheckedChange={(checked) => {
                                      const cur = field.value || [];
                                      field.onChange(checked ? [...cur, doc.id] : cur.filter((id) => id !== doc.id));
                                    }}
                                  />
                                  <Label className="text-xs font-bold leading-none cursor-pointer">{doc.name}</Label>
                                </div>
                              ))}
                            </ScrollArea>
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter className="pt-6 gap-3">
                <DialogClose asChild><Button type="button" variant="outline" className="h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest border-slate-200">Annuler</Button></DialogClose>
                <Button type="submit" className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
                  {dialogState.mode === "add" ? "Fixer le Scénario" : "Mettre à jour l'Exposition"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reusable Delete Dialog */}
      <AlertDialog>
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
