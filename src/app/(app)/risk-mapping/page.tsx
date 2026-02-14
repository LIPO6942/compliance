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
  const [searchQuery, setSearchQuery] = React.useState<string>("");
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
    const matchesSearch = risk.riskDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      risk.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = filterRiskLevel === "all" || calculateRiskLevel(risk.likelihood, risk.impact) === filterRiskLevel;
    const matchesDept = filterDepartment === "all" || risk.department === filterDepartment;
    const matchesCategory = filterCategory === "all" || risk.category === filterCategory;
    return matchesSearch && matchesLevel && matchesDept && matchesCategory;
  }), [risks, searchQuery, filterRiskLevel, filterDepartment, filterCategory]);

  if (!isClient) {
    return <div className="flex justify-center items-center h-[60vh]"><Logo className="h-10 w-10 animate-spin" /></div>;
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header & Vision */}
      <div className="relative mb-8">
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
          <Button
            size="lg"
            onClick={() => openDialog('add')}
            className="h-14 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-lg transition-all hover:scale-[1.02]"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Identifier un Risque
          </Button>
        </div>
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

          <div className="flex-1 flex flex-wrap items-center gap-3 w-full xl:w-auto bg-white/50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-3 rounded-lg border-none bg-slate-100 dark:bg-slate-800 font-medium text-xs shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
              />
            </div>

            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="h-9 w-[130px] rounded-lg border-none bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider shadow-none">
                <SelectValue placeholder="DIRECTION" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xl">
                <SelectItem value="all" className="text-[10px] font-bold uppercase">TOUTES DIRECTIONS</SelectItem>
                {departmentOptions.map(d => <SelectItem key={d} value={d} className="text-[10px] font-bold uppercase">{d}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9 w-[130px] rounded-lg border-none bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider shadow-none">
                <SelectValue placeholder="CATÉGORIE" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xl">
                <SelectItem value="all" className="text-[10px] font-bold uppercase">TOUTES CATÉGORIES</SelectItem>
                {categoryOptions.map(c => <SelectItem key={c} value={c} className="text-[10px] font-bold uppercase">{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterRiskLevel} onValueChange={setFilterRiskLevel}>
              <SelectTrigger className="h-9 w-[130px] rounded-lg border-none bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider shadow-none">
                <SelectValue placeholder="NIVEAU" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xl">
                <SelectItem value="all" className="text-[10px] font-bold uppercase">TOUS NIVEAUX</SelectItem>
                <SelectItem value="Faible" className="text-[10px] font-bold uppercase text-emerald-600">Faible</SelectItem>
                <SelectItem value="Modéré" className="text-[10px] font-bold uppercase text-amber-600">Modéré</SelectItem>
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
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-400 text-center">Likelihood</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-400 text-center">Impact</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-400 text-center">Score Brut</TableHead>
                      <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-400">Owner</TableHead>
                      <TableHead className="py-3 px-4 text-right font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRisks.length > 0 ? (
                      filteredRisks.map((risk) => {
                        const level = calculateRiskLevel(risk.likelihood, risk.impact);
                        const hasAlert = !!findAlertByRiskId(risk.id);
                        return (
                          <TableRow key={risk.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors border-b border-slate-200 dark:border-slate-800 divide-x divide-slate-100 dark:divide-slate-800">
                            <TableCell className="py-3 px-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-bold text-primary/70 uppercase tracking-widest leading-none">{risk.category}</span>
                                <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 leading-tight group-hover:underline cursor-pointer decoration-primary/30" onClick={() => openDialog('edit', risk)}>
                                  {risk.riskDescription}
                                </span>
                                {risk.documentIds && risk.documentIds.length > 0 && (
                                  <div className="flex items-center gap-1.5 mt-0.5 opacity-60">
                                    <FileText className="h-3 w-3 text-emerald-500" />
                                    <span className="text-[9px] font-bold text-emerald-600 uppercase">{risk.documentIds.length} docs</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                                {risk.department}
                              </span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-center">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{risk.likelihood}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-center">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{risk.impact}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-center">
                              <Badge className={cn(
                                "text-[9px] font-bold uppercase px-2 py-0.5 rounded border shadow-none",
                                level === "Faible" && "bg-emerald-50 text-emerald-600 border-emerald-100",
                                level === "Modéré" && "bg-amber-50 text-amber-600 border-amber-100",
                                level === "Élevé" && "bg-orange-50 text-orange-600 border-orange-100",
                                level === "Très élevé" && "bg-rose-50 text-rose-600 border-rose-100"
                              )}>
                                {level}
                              </Badge>
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
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem className="text-rose-600 text-xs font-bold py-2 focus:text-rose-600 focus:bg-rose-50">
                                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Supprimer
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

      {/* Add/Edit Risk Dialog */}
      <Dialog open={dialogState.mode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="rounded-[3rem] p-10 max-w-4xl border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)]">
          <DialogHeader className="pb-8">
            <DialogTitle className="text-4xl font-black font-headline tracking-tighter uppercase italic">
              {dialogState.mode === "add" ? "Fixer un" : "Ajuster l'"} <span className="text-primary">Exposition</span>
            </DialogTitle>
            <DialogDescription className="text-base font-medium">
              Paramétrez les détails du scénario pour affiner la cartographie des risques.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Left Column: Context */}
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="riskDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Scénario de Risque</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Décrivez le scénario redouté..." className="min-h-[120px] rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Direction</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
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
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Domaine</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                              {categoryOptions.map(c => <SelectItem key={c} value={c} className="font-bold">{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="owner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Propriétaire du Risque</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ex: Jean Dupont" className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Right Column: Scoring & Mitigation */}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="likelihood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Probabilité</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                              {likelihoodOptions.map(l => <SelectItem key={l} value={l} className="font-bold">{l}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="impact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Impact GRC</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                              {impactOptions.map(i => <SelectItem key={i} value={i} className="font-bold">{i}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="expectedAction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Action de Mitigation</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Mesures prévues pour réduire le risque..." className="min-h-[100px] rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="documentIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Preuves de Contrôle (Evidence Vault)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="h-14 w-full rounded-2xl border-slate-200 dark:border-slate-800 justify-between font-bold text-sm bg-slate-50 dark:bg-slate-950">
                              <span className="truncate">{field.value && field.value.length > 0 ? `${field.value.length} documents sélectionnés` : "Sélectionner des preuves"}</span>
                              <PlusCircle className="h-4 w-4 opacity-50" />
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
