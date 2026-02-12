
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
import { BellRing, Search, MoreHorizontal, Edit, Archive, Circle, TriangleAlert, CheckCircle2, Shield, Eye, Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { IdentifiedRegulation, AlertStatus, AlertCriticality, AlertType } from "@/types/compliance";
import { useIdentifiedRegulations } from "@/contexts/IdentifiedRegulationsContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

const alertSchema = z.object({
  status: z.enum(["Nouveau", "En cours d'analyse", "Traité", "Sans impact", "Archivé"]),
  criticality: z.enum(["Haute", "Moyenne", "Basse"]),
  deadline: z.string().optional(),
  affectedDepartments: z.string().optional(),
  requiredActions: z.string().optional(),
  analysisNotes: z.string().optional(),
  source: z.string().min(1, "La source est requise."),
  type: z.enum(["Nouvelle loi", "Modification réglementaire", "Alerte urgente", "Risque Interne", "Autre"]),
});
type AlertFormValues = z.infer<typeof alertSchema>;

const statusConfig: Record<AlertStatus, { label: string; icon: React.ElementType; color: string }> = {
  "Nouveau": { label: "Nouveau", icon: BellRing, color: "text-blue-500 bg-blue-100 dark:bg-blue-800/30 dark:text-blue-300 border-blue-300" },
  "En cours d'analyse": { label: "En Analyse", icon: Edit, color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-800/30 dark:text-yellow-400 border-yellow-300" },
  "Traité": { label: "Traité", icon: CheckCircle2, color: "text-green-600 bg-green-100 dark:bg-green-800/30 dark:text-green-400 border-green-300" },
  "Sans impact": { label: "Sans Impact", icon: Shield, color: "text-gray-600 bg-gray-100 dark:bg-gray-700/30 dark:text-gray-400 border-gray-600" },
  "Archivé": { label: "Archivé", icon: Archive, color: "text-purple-600 bg-purple-100 dark:bg-purple-800/30 dark:text-purple-400 border-purple-300" },
};

const criticalityConfig: Record<AlertCriticality, { label: string; icon: React.ElementType; color: string }> = {
  "Haute": { label: "Haute", icon: TriangleAlert, color: "text-red-600 bg-red-100 dark:bg-red-800/30 dark:text-red-400 border-red-300" },
  "Moyenne": { label: "Moyenne", icon: TriangleAlert, color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-800/30 dark:text-yellow-400 border-yellow-300" },
  "Basse": { label: "Basse", icon: Circle, color: "text-green-600 bg-green-100 dark:bg-green-800/30 dark:text-green-400 border-green-300" },
};

export default function AlertsPage() {
  const { identifiedRegulations, updateRegulation } = useIdentifiedRegulations();
  const { toast } = useToast();
  
  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => { setIsClient(true) }, []);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<string>("actives");
  const [filterCriticality, setFilterCriticality] = React.useState<string>("all");

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingAlert, setEditingAlert] = React.useState<IdentifiedRegulation | null>(null);

  const form = useForm<AlertFormValues>();

  const openDialog = (alert: IdentifiedRegulation) => {
    setEditingAlert(alert);
    form.reset({
      ...alert,
      deadline: alert.deadline ? format(parseISO(alert.deadline), 'yyyy-MM-dd') : '',
      affectedDepartments: alert.affectedDepartments?.join(', ') || ''
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setEditingAlert(null);
    setIsDialogOpen(false);
  };

  const handleFormSubmit = (values: AlertFormValues) => {
    if (!editingAlert) return;

    // Build the update object carefully, avoiding undefined values
    const updateData: Partial<IdentifiedRegulation> = {
      status: values.status,
      criticality: values.criticality,
      source: values.source,
      type: values.type,
    };
    
    if (values.deadline) {
      updateData.deadline = new Date(values.deadline).toISOString();
    } else {
      updateData.deadline = '';
    }
    
    if (values.affectedDepartments) {
      updateData.affectedDepartments = values.affectedDepartments.split(',').map(d => d.trim()).filter(Boolean);
    } else {
      updateData.affectedDepartments = [];
    }
    
    if (values.requiredActions) {
      updateData.requiredActions = values.requiredActions;
    }
    
    if (values.analysisNotes) {
      updateData.analysisNotes = values.analysisNotes;
    }
    
    // Firestore does not allow `undefined`. We must clean the object.
    const finalUpdateData = Object.fromEntries(Object.entries(updateData).filter(([_, v]) => v !== undefined && v !== ''));

    updateRegulation(editingAlert.id, finalUpdateData);
    toast({ title: "Alerte mise à jour", description: `L'alerte a été modifiée avec succès.` });
    closeDialog();
  };
  
  const filteredAlerts = React.useMemo(() => identifiedRegulations.filter(alert => {
    if (filterStatus === "actives") {
        if (alert.status !== "Nouveau" && alert.status !== "En cours d'analyse") return false;
    } else if (filterStatus !== "all" && alert.status !== filterStatus) {
        return false;
    }

    if (filterCriticality !== "all" && alert.criticality !== filterCriticality) return false;
    
    const searchLower = searchTerm.toLowerCase();
    if (searchLower && 
        !alert.summary.toLowerCase().includes(searchLower) &&
        !alert.source.toLowerCase().includes(searchLower) &&
        !alert.type.toLowerCase().includes(searchLower)) {
        return false;
    }
    return true;
  }), [identifiedRegulations, searchTerm, filterStatus, filterCriticality]);

  const allStatuses = Object.keys(statusConfig) as AlertStatus[];
  const allCriticalities = Object.keys(criticalityConfig) as AlertCriticality[];
  const allTypes: AlertType[] = ["Nouvelle loi", "Modification réglementaire", "Alerte urgente", "Risque Interne", "Autre"];
  const allSources = ["JORT", "CGA", "CTAF", "GAFI", "OFAC", "Veille IA", "Cartographie des Risques", "Autre"];

  return (
    <div className="space-y-6">

      <Card className="shadow-md">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par résumé, source, type..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isClient && (
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actives">Alertes Actives</SelectItem>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {allStatuses.map(s => <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCriticality} onValueChange={setFilterCriticality}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filtrer par criticité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les criticités</SelectItem>
                  {allCriticalities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Résumé</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date Pub.</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Criticité</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead className="text-right w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isClient ? (
                  filteredAlerts.length > 0 ? (
                    filteredAlerts.map((alert) => {
                      const StatusIcon = statusConfig[alert.status].icon;
                      const CritIcon = criticalityConfig[alert.criticality].icon;
                      return (
                        <TableRow key={alert.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium max-w-xs truncate">{alert.summary}</TableCell>
                          <TableCell>{alert.source}</TableCell>
                          <TableCell className="text-muted-foreground">{alert.type}</TableCell>
                          <TableCell className="text-muted-foreground">{format(parseISO(alert.publicationDate), "dd/MM/yyyy")}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs px-2 py-1 ${statusConfig[alert.status].color}`}>
                              <StatusIcon className="h-3 w-3 mr-1.5" />
                              {statusConfig[alert.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs px-2 py-1 ${criticalityConfig[alert.criticality].color}`}>
                              <CritIcon className="h-3 w-3 mr-1.5" />
                              {alert.criticality}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {alert.deadline ? format(parseISO(alert.deadline), "dd/MM/yyyy") : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                             <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Ouvrir menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDialog(alert)}>
                                  <Edit className="mr-2 h-4 w-4" /> Analyser / Modifier
                                </DropdownMenuItem>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <DropdownMenuItem onSelect={(e)=>e.preventDefault()}>
                                            <Info className="mr-2 h-4 w-4" /> Voir détails IA
                                        </DropdownMenuItem>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-96">
                                      <div className="space-y-4">
                                        <h4 className="font-medium leading-none">Détails de l'Analyse IA</h4>
                                        {alert.aiAnalysis && Object.keys(alert.aiAnalysis).length > 0 ? (
                                          <div className="space-y-3">
                                            {Object.entries(alert.aiAnalysis).map(([keyword, points]) => (
                                              <div key={keyword}>
                                                <p className="text-sm font-semibold text-primary">Analyse pour : {keyword}</p>
                                                <ul className="text-sm list-disc pl-5 mt-1 space-y-1 text-muted-foreground">
                                                  {points.map((point, index) => <li key={index}>{point}</li>)}
                                                </ul>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-sm text-muted-foreground">Aucune analyse IA disponible pour cette alerte.</p>
                                        )}
                                      </div>
                                    </PopoverContent>
                                </Popover>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        Aucune alerte trouvée.
                      </TableCell>
                    </TableRow>
                  )
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      Chargement des alertes...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
         {isClient && filteredAlerts.length > 0 && (
          <CardFooter className="justify-between text-sm text-muted-foreground pt-4">
             <div>
              {filteredAlerts.length} alerte{filteredAlerts.length > 1 ? 's' : ''} trouvée{filteredAlerts.length > 1 ? 's' : ''}.
            </div>
          </CardFooter>
        )}
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Analyser / Modifier l'Alerte</DialogTitle>
            <DialogDescription>{editingAlert?.summary}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-6 pl-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="source" render={({ field }) => (
                    <FormItem><FormLabel>Source</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>{allSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>{allTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )}/>
              </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Statut d'analyse</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>{allStatuses.map(s => <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )}/>
                 <FormField control={form.control} name="criticality" render={({ field }) => (
                    <FormItem><FormLabel>Criticité</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>{allCriticalities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="deadline" render={({ field }) => (
                  <FormItem><FormLabel>Échéance</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="affectedDepartments" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Services Concernés</FormLabel>
                    <FormControl><Input {...field} placeholder="commercial, sinistres, IT..." /></FormControl>
                    <FormDescription>Séparez les services par des virgules.</FormDescription>
                    <FormMessage />
                  </FormItem>
              )} />
               <FormField control={form.control} name="requiredActions" render={({ field }) => (
                  <FormItem><FormLabel>Actions Requises</FormLabel><FormControl><Textarea {...field} placeholder="Ex: adaptation d'un produit, formation, mise à jour d'un process..." /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="analysisNotes" render={({ field }) => (
                  <FormItem><FormLabel>Notes d'Analyse</FormLabel><FormControl><Textarea {...field} placeholder="Risques de non-conformité, impacts potentiels..." /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={closeDialog}>Annuler</Button>
                <Button type="submit">Enregistrer les Modifications</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
