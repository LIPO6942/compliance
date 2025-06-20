
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Image from "next/image";
import { 
    Users, 
    BarChart2, 
    CalendarDays, 
    BookOpen, 
    AlertTriangle, 
    CheckCircle, 
    Percent, 
    ListChecks, 
    Megaphone, 
    Send,
    ShieldAlert,
    FileText,
    Gavel,
    // ShieldCheck, // No longer used from here, specificSensitizationData updated
    KeyRound,
    PlusCircle,
    Edit2,
    Trash2,
    MoreHorizontal
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useTrainingData } from "@/contexts/TrainingDataContext";
import type { TrainingRegistryItem } from "@/types/compliance";


const kpiData = [
  { title: "Taux de couverture (obligatoire)", value: 85, target: 95, unit: "%", icon: Percent },
  { title: "Nombre de sessions réalisées (Année)", value: 42, unit: "sessions", icon: CalendarDays },
  { title: "Taux de participation moyen", value: 78, unit: "%", icon: Users },
  { title: "Taux de réussite aux évaluations", value: 92, unit: "%", icon: CheckCircle },
];

// Cybersécurité removed from here
const specificSensitizationData = [
    { name: "LAB-FT", rate: 90, icon: ShieldAlert},
    { name: "RGPD", rate: 88, icon: FileText},
    { name: "Déontologie", rate: 95, icon: Gavel},
];

const upcomingSessions = [
  { id: "sess001", title: "Formation LAB-FT (Recyclage)", date: "2024-09-15", type: "Obligatoire", department: "Tous" },
  { id: "sess002", title: "Nouveautés RGPD et Impact Opérationnel", date: "2024-10-05", type: "Recommandée", department: "Marketing, IT" },
  { id: "sess003", title: "Sensibilisation à la Déontologie Financière", date: "2024-11-20", type: "Obligatoire", department: "Finance, Vente" },
];

const campaignsMock = [
    { id: "camp001", name: "Campagne Phishing - Q3", status: "En cours", launchDate: "2024-07-10", target: "Tous les employés", icon: AlertTriangle },
    { id: "camp002", name: "Rappel bonnes pratiques mots de passe", status: "Planifiée", launchDate: "2024-08-01", target: "Tous les employés", icon: KeyRound },
    { id: "camp003", name: "Journée de la Protection des Données", status: "Terminée", launchDate: "2024-01-28", target: "Tous les employés", icon: CheckCircle }
];

const trainingRegistryItemSchema = z.object({
  title: z.string().min(1, "Le titre est requis."),
  objective: z.string().min(1, "L'objectif est requis."),
  duration: z.string().min(1, "La durée est requise."),
  support: z.string().min(1, "Le support est requis."),
});
type TrainingRegistryItemFormValues = z.infer<typeof trainingRegistryItemSchema>;


export default function TrainingPage() {
  const { trainingRegistryItems, addTrainingRegistryItem, editTrainingRegistryItem, removeTrainingRegistryItem } = useTrainingData();
  const { toast } = useToast();
  
  const [dialogState, setDialogState] = React.useState<{
    mode: "add" | "edit" | null;
    data?: TrainingRegistryItem;
  }>({ mode: null });

  const form = useForm<TrainingRegistryItemFormValues>({
    resolver: zodResolver(trainingRegistryItemSchema),
    defaultValues: { title: "", objective: "", duration: "", support: "" },
  });

  const openDialog = (mode: "add" | "edit", data?: TrainingRegistryItem) => {
    setDialogState({ mode, data });
    if (mode === "edit" && data) {
      form.reset(data);
    } else {
      form.reset({ title: "", objective: "", duration: "", support: "" });
    }
  };
  const closeDialog = () => setDialogState({ mode: null });

  const handleAddOrEditItem = (values: TrainingRegistryItemFormValues) => {
    if (dialogState.mode === "add") {
      addTrainingRegistryItem(values);
      toast({ title: "Formation ajoutée", description: `La formation "${values.title}" a été ajoutée au registre.` });
    } else if (dialogState.mode === "edit" && dialogState.data?.id) {
      editTrainingRegistryItem(dialogState.data.id, values);
      toast({ title: "Formation modifiée", description: `La formation "${values.title}" a été mise à jour.` });
    }
    closeDialog();
  };

  const handleRemoveItem = (itemId: string, itemName: string) => {
    removeTrainingRegistryItem(itemId);
    toast({ title: "Formation supprimée", description: `La formation "${itemName}" a été supprimée du registre.` });
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center">
            <Users className="mr-3 h-8 w-8 text-primary" />
            Formations et Sensibilisation
          </CardTitle>
          <CardDescription className="text-lg">
            Suivez, planifiez et gérez toutes les initiatives de formation et de sensibilisation à la conformité.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Section 1: Indicateurs de Suivi */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <BarChart2 className="mr-2 h-6 w-6 text-primary" />
            Indicateurs de Suivi (KPIs)
          </CardTitle>
          <CardDescription>Aperçu de la performance des programmes de formation et de sensibilisation.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {kpiData.map((kpi) => (
            <Card key={kpi.title} className="flex flex-col justify-between">
              <CardHeader className="pb-2">
                 <div className="flex items-center justify-between">
                    <CardDescription className="text-sm">{kpi.title}</CardDescription>
                    <kpi.icon className="h-5 w-5 text-muted-foreground" />
                 </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-headline">{kpi.value}{kpi.unit}</div>
                {kpi.target && <p className="text-xs text-muted-foreground pt-1">Objectif: {kpi.target}{kpi.unit}</p>}
                <Progress value={kpi.target ? (kpi.value / kpi.target) * 100 : kpi.value} className="mt-2 h-2" />
              </CardContent>
            </Card>
          ))}
        </CardContent>
        <CardContent>
            <h3 className="text-md font-semibold mb-3 text-muted-foreground">Taux de sensibilisation par thématique :</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {specificSensitizationData.map(item => (
                    <Card key={item.name} className="bg-muted/30">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{item.name}</CardTitle>
                            <item.icon className="h-4 w-4 text-muted-foreground"/>
                        </CardHeader>
                        <CardContent>
                             <div className="text-2xl font-bold">{item.rate}%</div>
                             <Progress value={item.rate} className="mt-1 h-1.5" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </CardContent>
      </Card>

      {/* Section 2: Planning et Campagnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
              <CalendarDays className="mr-2 h-6 w-6 text-primary" />
              Planning des Formations
            </CardTitle>
            <CardDescription>Calendrier des sessions à venir et options de gestion.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 border rounded-md bg-blue-50 dark:bg-blue-900/20">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    <span className="font-semibold">Note :</span> Les fonctionnalités de modification pour cette section (planning, campagnes) seront ajoutées ultérieurement.
                </p>
            </div>
            <h4 className="font-semibold mb-2 text-muted-foreground">Prochaines Sessions :</h4>
            <div className="space-y-3 max-h-60 overflow-y-auto">
                {upcomingSessions.map(session => (
                    <div key={session.id} className="p-3 border rounded-md hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-start">
                            <h5 className="font-medium">{session.title}</h5>
                            <Badge variant={session.type === "Obligatoire" ? "destructive" : "secondary" } className="text-xs">{session.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Date: {session.date} | Département(s): {session.department}</p>
                    </div>
                ))}
            </div>
            <Button variant="outline" className="mt-4 w-full">Voir tout le planning</Button>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
              <Megaphone className="mr-2 h-6 w-6 text-primary" />
              Campagnes de Sensibilisation
            </CardTitle>
            <CardDescription>Suivi des campagnes en cours et planifiées.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                {campaignsMock.map(campaign => (
                    <Card key={campaign.id} className="shadow-sm">
                        <CardHeader className="p-3 flex flex-row items-start justify-between">
                             <div>
                                <h4 className="font-semibold text-sm">{campaign.name}</h4>
                                <p className="text-xs text-muted-foreground">Lancée le: {campaign.launchDate} | Cible: {campaign.target}</p>
                             </div>
                             <Badge variant={campaign.status === "En cours" ? "default" : campaign.status === "Planifiée" ? "outline" : "secondary"} className={`capitalize text-xs ${campaign.status === "En cours" ? "bg-yellow-500 text-white" : ""}`}>
                                <campaign.icon className="h-3 w-3 mr-1.5"/>
                                {campaign.status}
                             </Badge>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                             {campaign.status === "En cours" && <Button size="sm" variant="outline" className="w-full"><Send className="h-4 w-4 mr-2"/>Envoyer un rappel</Button>}
                             {campaign.status === "Planifiée" && <Button size="sm" variant="ghost" className="w-full text-primary">Configurer la campagne</Button>}
                             {campaign.status === "Terminée" && <Button size="sm" variant="link" className="w-full">Voir les résultats</Button>}
                        </CardContent>
                    </Card>
                ))}
             </div>
             <Button className="mt-4 w-full bg-primary hover:bg-primary/90">
                <PlusCircle className="mr-2 h-5 w-5" /> Lancer une nouvelle campagne
             </Button>
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Registre des Formations - MODIFIABLE */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <BookOpen className="mr-2 h-6 w-6 text-primary" />
            Registre des Formations
          </CardTitle>
          <CardDescription>Catalogue des formations disponibles, traçabilité et gestion des contenus.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="mb-4 flex justify-end">
                <Button onClick={() => openDialog("add")}>
                  <PlusCircle className="mr-2 h-4 w-4"/>Ajouter une Formation
                </Button>
            </div>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[250px]">Titre</TableHead>
                  <TableHead>Objectif</TableHead>
                  <TableHead className="text-center w-[80px]">Durée</TableHead>
                  <TableHead className="w-[200px]">Support</TableHead>
                  <TableHead className="text-center w-[120px]">Dernière MàJ</TableHead>
                  <TableHead className="text-right w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainingRegistryItems.length > 0 ? (
                  trainingRegistryItems.map((training) => (
                    <TableRow key={training.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium py-3">{training.title}</TableCell>
                      <TableCell className="text-xs text-muted-foreground py-3">{training.objective}</TableCell>
                      <TableCell className="text-center text-xs py-3">{training.duration}</TableCell>
                      <TableCell className="text-xs py-3">{training.support}</TableCell>
                      <TableCell className="text-center text-xs py-3">{training.lastUpdated}</TableCell>
                      <TableCell className="py-3 text-right">
                        <AlertDialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Ouvrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDialog("edit", training)}>
                                <Edit2 className="mr-2 h-4 w-4" /> Modifier
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                               <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                  onSelect={(e) => e.preventDefault()} 
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette formation ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible et supprimera la formation "{training.title}" du registre.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemoveItem(training.id, training.title)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Aucune formation dans le registre.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
           <div className="mt-4 text-sm text-muted-foreground">
                <p><span className="font-semibold">Traçabilité :</span> Le système assure un suivi complet de qui a suivi quelle formation, quand, et avec quels résultats (consultable dans la section de gestion du registre).</p>
                <p><span className="font-semibold">Mise à jour des contenus :</span> Les contenus de formation sont revus et mis à jour annuellement ou dès qu'une évolution réglementaire majeure l'exige.</p>
            </div>
        </CardContent>
      </Card>

        <Card className="shadow-md overflow-hidden">
            <div className="md:flex">
                <div className="md:w-1/2 p-6 flex flex-col justify-center">
                    <CardHeader className="p-0 pb-4">
                        <CardTitle className="font-headline text-2xl">Culture de Conformité Robuste</CardTitle>
                        <CardDescription>Investir dans la formation, c'est investir dans la sécurité et la pérennité de votre entreprise.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                    <p className="text-muted-foreground mb-6">
                        Des employés bien formés sont la première ligne de défense contre les risques de non-conformité.
                    </p>
                    </CardContent>
                </div>
                <div className="md:w-1/2">
                    <Image
                        src="https://placehold.co/600x300.png"
                        alt="Compliance Training Illustration"
                        width={600}
                        height={300}
                        className="object-cover w-full h-full max-h-[250px] md:max-h-none"
                        data-ai-hint="compliance training"
                    />
                </div>
            </div>
      </Card>

      {/* Dialog for Add/Edit Training Registry Item */}
      <Dialog open={!!dialogState.mode} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState.mode === "add" ? "Ajouter une formation au registre" : "Modifier la formation"}
            </DialogTitle>
            <DialogDescription>
              Remplissez les détails de la formation ci-dessous.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddOrEditItem)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre de la formation</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="objective" render={({ field }) => (
                <FormItem>
                  <FormLabel>Objectif</FormLabel>
                  <FormControl><Textarea {...field} rows={3} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="duration" render={({ field }) => (
                <FormItem>
                  <FormLabel>Durée</FormLabel>
                  <FormControl><Input {...field} placeholder="Ex: 2h, 3 jours" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="support" render={({ field }) => (
                <FormItem>
                  <FormLabel>Support utilisé</FormLabel>
                  <FormControl><Input {...field} placeholder="Ex: PPT, Vidéo, Quiz" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose>
                <Button type="submit">{dialogState.mode === "add" ? "Ajouter" : "Enregistrer les modifications"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

    </div>
  );
}

