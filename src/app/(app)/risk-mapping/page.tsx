
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
import { Map, PlusCircle, MoreHorizontal, Edit, Trash2, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { RiskMappingItem, RiskLikelihood, RiskImpact, RiskLevel } from '@/types/compliance';
import { useRiskMapping } from "@/contexts/RiskMappingContext";
import { useIdentifiedRegulations } from "@/contexts/IdentifiedRegulationsContext";

const riskSchema = z.object({
  department: z.string().min(1, "La direction est requise."),
  monitoringSubject: z.string().min(1, "Le sujet de veille est requis."),
  regulatoryContent: z.string().min(1, "Le contenu réglementaire est requis."),
  riskDescription: z.string().min(1, "La description du risque est requise."),
  likelihood: z.enum(["Faible", "Moyenne", "Élevée"]),
  impact: z.enum(["Faible", "Moyen", "Élevé"]),
  expectedAction: z.string().min(1, "L'action attendue est requise."),
  owner: z.string().min(1, "Le propriétaire est requis."),
});

type RiskFormValues = z.infer<typeof riskSchema>;

const likelihoodMap: Record<RiskLikelihood, number> = { "Faible": 1, "Moyenne": 2, "Élevée": 3 };
const impactMap: Record<RiskImpact, number> = { "Faible": 1, "Moyen": 2, "Élevé": 3 };

const calculateRiskLevel = (likelihood: RiskLikelihood, impact: RiskImpact): RiskLevel => {
  const score = likelihoodMap[likelihood] * impactMap[impact];
  if (score <= 2) return "Faible";
  if (score <= 4) return "Modéré";
  if (score <= 6) return "Important";
  return "Critique";
};

const riskLevelColors: Record<RiskLevel, string> = {
  "Faible": "bg-green-100 text-green-800 border-green-300 dark:bg-green-800/30 dark:text-green-300",
  "Modéré": "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-800/30 dark:text-yellow-400",
  "Important": "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-800/30 dark:text-orange-400",
  "Critique": "bg-red-100 text-red-800 border-red-300 dark:bg-red-800/30 dark:text-red-400",
};

const departmentOptions = ["Toutes", "Juridiques", "Finances", "Comptabilité", "Sinistres matériels", "Sinistre corporel", "Equipements", "RH", "DSI", "Audit", "Organisation", "Qualité Vie", "Commercial", "Recouvrement", "Inspection"];
const likelihoodOptions: RiskLikelihood[] = ["Faible", "Moyenne", "Élevée"];
const impactOptions: RiskImpact[] = ["Faible", "Moyen", "Élevé"];
const riskLevelOptions: RiskLevel[] = ["Faible", "Modéré", "Important", "Critique"];
const allRiskLevels = ["all", ...riskLevelOptions];
const allDepartments = ["all", ...departmentOptions];

export default function RiskMappingPage() {
  const { risks, addRisk, editRisk, removeRisk } = useRiskMapping();
  const { createAlertFromRisk } = useIdentifiedRegulations();
  const { toast } = useToast();
  
  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => { setIsClient(true) }, []);

  const [dialogState, setDialogState] = React.useState<{ mode: "add" | "edit" | null; data?: RiskMappingItem }>({ mode: null });
  const form = useForm<RiskFormValues>({ resolver: zodResolver(riskSchema) });
  
  const [filterRiskLevel, setFilterRiskLevel] = React.useState<string>("all");
  const [filterDepartment, setFilterDepartment] = React.useState<string>("all");

  const openDialog = (mode: "add" | "edit", data?: RiskMappingItem) => {
    setDialogState({ mode, data });
    if (mode === "edit" && data) {
      form.reset(data);
    } else {
      form.reset({ department: '', monitoringSubject: '', regulatoryContent: '', riskDescription: '', likelihood: 'Faible', impact: 'Faible', expectedAction: '', owner: '' });
    }
  };

  const closeDialog = () => setDialogState({ mode: null });

  const handleFormSubmit = (values: RiskFormValues) => {
    const riskLevel = calculateRiskLevel(values.likelihood as RiskLikelihood, values.impact as RiskImpact);
    const riskData = { ...values, riskLevel };
    
    if (dialogState.mode === "add") {
      addRisk(riskData);
      toast({ title: "Risque ajouté", description: `Le risque a été ajouté à la cartographie.` });
    } else if (dialogState.mode === "edit" && dialogState.data?.id) {
      editRisk(dialogState.data.id, riskData);
      toast({ title: "Risque modifié", description: `Le risque a été mis à jour.` });
    }
    closeDialog();
  };

  const handleRemoveRisk = (riskId: string) => {
    removeRisk(riskId);
    toast({ title: "Risque supprimé", description: "Le risque a été supprimé de la cartographie." });
  };
  
  const handleCreateAlert = (risk: RiskMappingItem) => {
    createAlertFromRisk(risk);
    toast({
      title: "Alerte créée",
      description: "Une nouvelle alerte a été créée avec succès dans le Centre d'Alertes.",
    });
  };

  const filteredRisks = React.useMemo(() => risks.filter(risk => {
    if (filterRiskLevel !== "all" && risk.riskLevel !== filterRiskLevel) return false;
    if (filterDepartment !== "all" && risk.department !== filterDepartment) return false;
    return true;
  }), [risks, filterRiskLevel, filterDepartment]);


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center">
            <Map className="mr-3 h-8 w-8 text-primary" />
            Cartographie des Risques de Non-Conformité
          </CardTitle>
          <CardDescription className="text-lg">
            Identifiez, évaluez et suivez les risques de non-conformité au sein de votre organisation.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
                <CardTitle>Liste des Risques</CardTitle>
            </div>
            {isClient && (
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                 <Select value={filterRiskLevel} onValueChange={setFilterRiskLevel}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filtrer par niveau de risque" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les niveaux</SelectItem>
                      {riskLevelOptions.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                    </SelectContent>
                  </Select>
                 <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filtrer par direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les directions</SelectItem>
                      {departmentOptions.slice(1).map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                    </SelectContent>
                  </Select>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => openDialog('add')}>
                  <PlusCircle className="mr-2 h-5 w-5" /> Ajouter un Risque
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Direction</TableHead>
                  <TableHead>Sujet de Veille</TableHead>
                  <TableHead>Probabilité</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Niveau de Risque</TableHead>
                  <TableHead>Action Attendue</TableHead>
                  <TableHead className="text-right w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isClient ? (
                  filteredRisks.length > 0 ? (
                    filteredRisks.map((risk) => (
                      <TableRow key={risk.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">{risk.department}</TableCell>
                        <TableCell className="text-muted-foreground">{risk.monitoringSubject}</TableCell>
                        <TableCell>{risk.likelihood}</TableCell>
                        <TableCell>{risk.impact}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs px-2.5 py-1 ${riskLevelColors[risk.riskLevel]}`}>
                            {risk.riskLevel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">{risk.expectedAction}</TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Ouvrir menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDialog('edit', risk)}>
                                  <Edit className="mr-2 h-4 w-4" /> Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCreateAlert(risk)}>
                                  <Bell className="mr-2 h-4 w-4" /> Créer une alerte
                                </DropdownMenuItem>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer ce risque ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveRisk(risk.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Aucun risque ne correspond à vos filtres.
                      </TableCell>
                    </TableRow>
                  )
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Chargement de la cartographie...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
         {isClient && filteredRisks.length > 0 && (
          <CardFooter className="justify-end text-sm text-muted-foreground pt-4">
             {filteredRisks.length} risque{filteredRisks.length > 1 ? 's' : ''} trouvé{filteredRisks.length > 1 ? 's' : ''}.
          </CardFooter>
        )}
      </Card>

      <Dialog open={!!dialogState.mode} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialogState.mode === "add" ? "Ajouter un nouveau risque" : "Modifier le risque"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-6 pl-1">
               <FormField control={form.control} name="department" render={({ field }) => (
                  <FormItem><FormLabel>Direction Concernée</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Choisir une direction"/></SelectTrigger></FormControl>
                    <SelectContent>{departmentOptions.slice(1).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />
              <FormField control={form.control} name="owner" render={({ field }) => (
                <FormItem><FormLabel>Propriétaire / Pilote</FormLabel><FormControl><Input {...field} placeholder="Ex: Direction Commerciale" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="monitoringSubject" render={({ field }) => (
                <FormItem><FormLabel>Sujet de Veille</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="regulatoryContent" render={({ field }) => (
                <FormItem><FormLabel>Contenu Réglementaire Associé</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="riskDescription" render={({ field }) => (
                <FormItem><FormLabel>Description du Risque</FormLabel><FormControl><Textarea {...field} placeholder="Description détaillée du risque de non-conformité..." /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                 <FormField control={form.control} name="likelihood" render={({ field }) => (
                  <FormItem><FormLabel>Probabilité</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>{likelihoodOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="impact" render={({ field }) => (
                  <FormItem><FormLabel>Impact</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>{impactOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="expectedAction" render={({ field }) => (
                <FormItem><FormLabel>Action Attendue / Plan de Maîtrise</FormLabel><FormControl><Textarea {...field} placeholder="Description du plan d'action pour maîtriser le risque..." /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={closeDialog}>Annuler</Button>
                <Button type="submit">{dialogState.mode === "add" ? "Ajouter" : "Enregistrer"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    