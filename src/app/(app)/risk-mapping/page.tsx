
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
import { Map, PlusCircle, MoreHorizontal, Edit, Trash2, Bell, BellOff, FileText, Link as LinkIcon, ChevronsUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

const calculateRiskLevel = (likelihood: RiskLikelihood, impact: RiskImpact): RiskLevel => {
  const score = likelihoodMap[likelihood] * impactMap[impact];
  if (score <= 4) return "Faible";
  if (score <= 8) return "Modéré";
  if (score <= 11) return "Élevé";
  return "Très élevé";
};

const riskLevelColors: Record<RiskLevel, string> = {
  "Faible": "bg-green-100 text-green-800 border-green-300 dark:bg-green-800/30 dark:text-green-300",
  "Modéré": "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-800/30 dark:text-yellow-400",
  "Élevé": "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-800/30 dark:text-orange-400",
  "Très élevé": "bg-red-100 text-red-800 border-red-300 dark:bg-red-800/30 dark:text-red-400",
};

const departmentOptions = ["Toutes", "Juridiques", "Finances", "Comptabilité", "Sinistres matériels", "Sinistre corporel", "Equipements", "RH", "DSI", "Audit", "Organisation", "Qualité Vie", "Commercial", "Recouvrement", "Inspection"];
const categoryOptions: RiskCategory[] = ["Clients", "Produits et Services", "Pays et Zones Géographiques", "Canaux de Distribution"];
const likelihoodOptions: RiskLikelihood[] = ["Faible", "Modérée", "Élevée", "Très élevée"];
const impactOptions: RiskImpact[] = ["Faible", "Modéré", "Élevé", "Très élevé"];
const riskLevelOptions: RiskLevel[] = ["Faible", "Modéré", "Élevé", "Très élevé"];
const allRiskLevels = ["all", ...riskLevelOptions];
const allDepartments = ["all", ...departmentOptions];
const allCategories = ["all", ...categoryOptions];

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

  const openDialog = (mode: "add" | "edit", data?: RiskMappingItem) => {
    setDialogState({ mode, data });
    if (mode === "edit" && data) {
      form.reset({
        ...data,
        documentIds: data.documentIds || [],
      });
    } else {
      form.reset({ department: '', category: 'Clients', riskDescription: '', likelihood: 'Faible', impact: 'Faible', expectedAction: '', owner: '', documentIds: [] });
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
  
  const handleToggleAlert = async (risk: RiskMappingItem) => {
    const existingAlert = findAlertByRiskId(risk.id);
    if (existingAlert) {
      await removeAlertByRiskId(risk.id);
      toast({
        title: "Alerte Retirée",
        description: "L'alerte associée à ce risque a été supprimée.",
        variant: "default",
      });
    } else {
      await createAlertFromRisk(risk);
      toast({
        title: "Alerte Créée",
        description: "Une nouvelle alerte a été créée avec succès dans le Centre d'Alertes.",
      });
    }
  };

  const filteredRisks = React.useMemo(() => risks.filter(risk => {
    if (filterRiskLevel !== "all" && risk.riskLevel !== filterRiskLevel) return false;
    if (filterDepartment !== "all" && risk.department !== filterDepartment) return false;
    if (filterCategory !== "all" && risk.category !== filterCategory) return false;
    return true;
  }), [risks, filterRiskLevel, filterDepartment, filterCategory]);

  const getLinkedDocuments = (risk: RiskMappingItem): Document[] => {
    if (!risk.documentIds || risk.documentIds.length === 0) return [];
    return documents.filter(doc => risk.documentIds!.includes(doc.id));
  };


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
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto flex-wrap justify-end">
                 <Select value={filterRiskLevel} onValueChange={setFilterRiskLevel}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Niveau de risque" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les niveaux</SelectItem>
                      {riskLevelOptions.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                    </SelectContent>
                  </Select>
                 <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les directions</SelectItem>
                      {departmentOptions.slice(1).map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                    </SelectContent>
                  </Select>
                 <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Catégorie de risque" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les catégories</SelectItem>
                      {categoryOptions.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
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
                  <TableHead>Description du Risque</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Contenu Réglementaire</TableHead>
                  <TableHead>Niveau de Risque</TableHead>
                  <TableHead>Action Attendue</TableHead>
                  <TableHead>Propriétaire</TableHead>
                  <TableHead className="text-right w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isClient ? (
                  filteredRisks.length > 0 ? (
                    filteredRisks.map((risk) => {
                      const existingAlert = findAlertByRiskId(risk.id);
                      const linkedDocs = getLinkedDocuments(risk);
                      return (
                        <TableRow key={risk.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium max-w-xs truncate">{risk.riskDescription}</TableCell>
                          <TableCell className="text-muted-foreground">{risk.category}</TableCell>
                          <TableCell className="max-w-xs">
                             <div className="flex flex-col items-start gap-1">
                                {linkedDocs.length > 0 ? linkedDocs.map(doc => (
                                  <Link 
                                      key={doc.id}
                                      href={doc.url || '#'} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-xs text-blue-600 hover:underline flex items-center gap-1.5"
                                      onClick={(e) => !doc.url && e.preventDefault()}
                                  >
                                    <FileText className="h-3 w-3" />
                                    <span>{doc.name}</span>
                                    {doc.url && <LinkIcon className="h-3 w-3" />}
                                  </Link>
                                )) : <span className="text-xs text-muted-foreground">Aucun</span>}
                              </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs px-2.5 py-1 ${riskLevelColors[risk.riskLevel]}`}>
                              {risk.riskLevel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-xs truncate">{risk.expectedAction}</TableCell>
                          <TableCell>{risk.owner}</TableCell>
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
                                  <DropdownMenuItem onClick={() => handleToggleAlert(risk)} className={existingAlert ? "text-amber-600 focus:text-amber-600" : ""}>
                                    {existingAlert ? <BellOff className="mr-2 h-4 w-4" /> : <Bell className="mr-2 h-4 w-4" />}
                                    {existingAlert ? "Retirer de l'alerte" : "Créer une alerte"}
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
                      );
                    })
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
               <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem><FormLabel>Catégorie de Risque</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Choisir une catégorie"/></SelectTrigger></FormControl>
                    <SelectContent>{categoryOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />
               <FormField control={form.control} name="department" render={({ field }) => (
                  <FormItem><FormLabel>Direction Concernée</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Choisir une direction"/></SelectTrigger></FormControl>
                    <SelectContent>{departmentOptions.slice(1).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />
              <FormField control={form.control} name="owner" render={({ field }) => (
                <FormItem><FormLabel>Propriétaire / Pilote</FormLabel><FormControl><Input {...field} placeholder="Ex: Direction Commerciale" /></FormControl><FormMessage /></FormItem>
              )} />
              
              <FormField
                control={form.control}
                name="documentIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Documents Liés (Optionnel)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between h-auto min-h-10",
                              !field.value?.length && "text-muted-foreground"
                            )}
                          >
                             <div className="flex gap-1 flex-wrap">
                                {field.value && field.value.length > 0
                                ? documents
                                    .filter((doc) => field.value?.includes(doc.id))
                                    .map((doc) => <Badge key={doc.id} variant="secondary">{doc.name}</Badge>)
                                : "Sélectionner des documents"}
                             </div>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                         <ScrollArea className="h-48">
                            <div className="p-2 space-y-1">
                            {documents.map((doc) => {
                                const isSelected = field.value?.includes(doc.id) ?? false;
                                return (
                                <div
                                    key={doc.id}
                                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                                    onClick={() => {
                                        const selectedDocs = field.value || [];
                                        const newSelectedDocs = isSelected
                                        ? selectedDocs.filter((id: string) => id !== doc.id)
                                        : [...selectedDocs, doc.id];
                                        field.onChange(newSelectedDocs);
                                    }}
                                >
                                    <Checkbox
                                        id={`doc-${doc.id}`}
                                        checked={isSelected}
                                        readOnly
                                    />
                                    <label htmlFor={`doc-${doc.id}`} className="text-sm font-medium leading-none cursor-pointer">
                                        {doc.name}
                                    </label>
                                </div>
                                );
                            })}
                            </div>
                         </ScrollArea>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Liez des documents de référence à ce risque.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

    