
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Image from "next/image";
import * as LucideIcons from "lucide-react"; // Import all icons
import {
  Users,
  BarChart2,
  CalendarDays as CalendarDaysIcon,
  BookOpen,
  CheckCircle,
  Percent,
  ListChecks,
  Megaphone,
  PlusCircle,
  Edit2,
  Trash2,
  MoreHorizontal,
  BookMarked,
  ClipboardCheck,
  MailCheck,
  FileQuestion,
  MessageSquarePlus,
  FileSignature,
  ScanSearch,
  UserCheck,
  MapPin,
  ThumbsUp,
  ShieldQuestion,
  ShieldAlert,
  FileText,
  Gavel,
  KeyRound
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useTrainingData } from "@/contexts/TrainingDataContext";
import type { TrainingRegistryItem, UpcomingSession, SensitizationCampaign } from "@/types/compliance";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/icons/Logo";

const kpiThemes = [
  { name: "LAB-FT", icon: ShieldAlert },
  { name: "RGPD", icon: FileText },
  { name: "Déontologie", icon: Gavel },
];

const completionCriterionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Le texte du critère est requis."),
  isCompleted: z.boolean(),
});

const trainingRegistryItemSchema = z.object({
  title: z.string().min(1, "Le titre est requis."),
  objective: z.string().min(1, "L'objectif est requis."),
  duration: z.string().min(1, "La durée est requise."),
  support: z.string().min(1, "Le support est requis."),
  completionCriteria: z.array(completionCriterionSchema).optional().default([]),
  successRate: z.coerce.number().min(0).max(100).optional(),
});
type TrainingRegistryItemFormValues = z.infer<typeof trainingRegistryItemSchema>;

const upcomingSessionSchema = z.object({
  title: z.string().min(1, "Le titre est requis."),
  date: z.date({ required_error: "La date est requise." }),
  type: z.enum(["Obligatoire", "Recommandée"], { required_error: "Le type est requis." }),
  department: z.string().min(1, "Le département est requis."),
  logisticsConfirmed: z.boolean().optional().default(false),
  materialsPrepared: z.boolean().optional().default(false),
  invitationsSent: z.boolean().optional().default(false),
  isCompleted: z.boolean().optional().default(false),
  participants: z.coerce.number().min(0).optional(),
  totalInvitees: z.coerce.number().min(0).optional(),
});
type UpcomingSessionFormValues = z.infer<typeof upcomingSessionSchema>;

const sensitizationCampaignSchema = z.object({
  name: z.string().min(1, "Le nom est requis."),
  status: z.enum(["En cours", "Planifiée", "Terminée"], { required_error: "Le statut est requis." }),
  launchDate: z.date({ required_error: "La date de lancement est requise." }),
  target: z.string().min(1, "La cible est requise."),
  completionCriteria: z.array(completionCriterionSchema).optional().default([]),
});
type SensitizationCampaignFormValues = z.infer<typeof sensitizationCampaignSchema>;


export default function TrainingPage() {
  const {
    trainingRegistryItems, addTrainingRegistryItem, editTrainingRegistryItem, removeTrainingRegistryItem,
    upcomingSessions, addUpcomingSession, editUpcomingSession, removeUpcomingSession,
    sensitizationCampaigns, addSensitizationCampaign, editSensitizationCampaign, removeSensitizationCampaign
  } = useTrainingData();
  const { toast } = useToast();

  const [dialogState, setDialogState] = React.useState<{
    type: "registry" | "session" | "campaign" | null;
    mode: "add" | "edit" | null;
    data?: TrainingRegistryItem | UpcomingSession | SensitizationCampaign;
  }>({ type: null, mode: null });

  const registryForm = useForm<TrainingRegistryItemFormValues>({
    resolver: zodResolver(trainingRegistryItemSchema),
    defaultValues: { title: "", objective: "", duration: "", support: "", completionCriteria: [], successRate: 0 }
  });
  const sessionForm = useForm<UpcomingSessionFormValues>({ resolver: zodResolver(upcomingSessionSchema), defaultValues: { title: "", date: new Date(), type: "Obligatoire", department: "", logisticsConfirmed: false, materialsPrepared: false, invitationsSent: false, isCompleted: false, participants: 0, totalInvitees: 0 } });
  const campaignForm = useForm<SensitizationCampaignFormValues>({
    resolver: zodResolver(sensitizationCampaignSchema),
    defaultValues: { name: "", status: "Planifiée", launchDate: new Date(), target: "", completionCriteria: [] }
  });

  const { fields: registryCriteriaFields, append: appendRegistryCriterion, remove: removeRegistryCriterion } = useFieldArray({
    control: registryForm.control,
    name: "completionCriteria",
  });

  const { fields: campaignCriteriaFields, append: appendCampaignCriterion, remove: removeCampaignCriterion } = useFieldArray({
    control: campaignForm.control,
    name: "completionCriteria",
  });


  const departmentOptions = ["Juridiques", "Finances", "Comptabilité", "Sinistres matériels", "Sinistre corporel", "Equipements", "RH", "DSI", "Audit", "Organisation", "Qualité Vie", "Commercial", "Recouvrement", "Inspection"];
  const targetOptions = ["Tous les employés", "Nouveaux recrutés", "Réseau de distribution", "Cadres et managers"];

  const [kpiData, setKpiData] = React.useState<any[]>([]);
  const [sensitizationKpiData, setSensitizationKpiData] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && upcomingSessions && trainingRegistryItems) {
      const completedSessions = upcomingSessions.filter(s => s.isCompleted);
      const mandatoryCompletedSessions = completedSessions.filter(s => s.type === 'Obligatoire' && s.isCompleted);
      const assessedItems = trainingRegistryItems.filter(i => i.successRate !== undefined);

      const totalMandatoryParticipants = mandatoryCompletedSessions.reduce((sum, s) => sum + (s.participants || 0), 0);
      const totalMandatoryInvitees = mandatoryCompletedSessions.reduce((sum, s) => sum + (s.totalInvitees || 0), 0);
      const coverageRate = totalMandatoryInvitees > 0 ? Math.round((totalMandatoryParticipants / totalMandatoryInvitees) * 100) : 0;

      const completedSessionsCount = completedSessions.length;

      const totalParticipants = completedSessions.reduce((sum, s) => sum + (s.participants || 0), 0);
      const totalInvitees = completedSessions.reduce((sum, s) => sum + (s.totalInvitees || 0), 0);
      const avgParticipationRate = totalInvitees > 0 ? Math.round((totalParticipants / totalInvitees) * 100) : 0;

      const totalSuccessRate = assessedItems.reduce((sum, i) => sum + (i.successRate || 0), 0);
      const avgSuccessRate = assessedItems.length > 0 ? Math.round(totalSuccessRate / assessedItems.length) : 0;

      const newKpiData = [
        { title: "Taux de couverture (obligatoire)", value: coverageRate, target: 95, unit: "%", icon: Percent },
        { title: "Nombre de sessions réalisées (Année)", value: completedSessionsCount, unit: " sessions", icon: CalendarDaysIcon },
        { title: "Taux de participation moyen", value: avgParticipationRate, unit: "%", icon: Users },
        { title: "Taux de réussite aux évaluations", value: avgSuccessRate, unit: "%", icon: CheckCircle },
      ];
      setKpiData(newKpiData);

      const derivedData = kpiThemes.map(theme => {
        const matchingSession = upcomingSessions.find(session =>
          session.title.toLowerCase().includes(theme.name.toLowerCase())
        );
        return {
          name: theme.name,
          rate: matchingSession?.progress ?? 0,
          icon: theme.icon,
        };
      });
      setSensitizationKpiData(derivedData);

      setIsLoading(false);
    }
  }, [upcomingSessions, trainingRegistryItems]);


  const openDialog = (type: "registry" | "session" | "campaign", mode: "add" | "edit", data?: any) => {
    setDialogState({ type, mode, data });
    if (mode === "edit" && data) {
      if (type === "registry") registryForm.reset({ ...data, successRate: data.successRate ?? 0, completionCriteria: data.completionCriteria || [] });
      if (type === "session") sessionForm.reset({ ...data, date: new Date(data.date), participants: data.participants ?? 0, totalInvitees: data.totalInvitees ?? 0 });
      if (type === "campaign") campaignForm.reset({ ...data, launchDate: new Date(data.launchDate), completionCriteria: data.completionCriteria || [] });
    } else {
      if (type === "registry") registryForm.reset({ title: "", objective: "", duration: "", support: "", completionCriteria: [], successRate: 0 });
      if (type === "session") sessionForm.reset({ title: "", date: new Date(), type: "Obligatoire", department: "", logisticsConfirmed: false, materialsPrepared: false, invitationsSent: false, isCompleted: false, participants: 0, totalInvitees: 0 });
      if (type === "campaign") campaignForm.reset({ name: "", status: "Planifiée", launchDate: new Date(), target: "", completionCriteria: [] });
    }
  };
  const closeDialog = () => setDialogState({ type: null, mode: null });

  const handleRegistrySubmit = (values: TrainingRegistryItemFormValues) => {
    if (dialogState.mode === "add") {
      addTrainingRegistryItem(values);
      toast({ title: "Formation ajoutée", description: `La formation "${values.title}" a été ajoutée.` });
    } else if (dialogState.mode === "edit" && dialogState.data?.id) {
      editTrainingRegistryItem(dialogState.data.id, values);
      toast({ title: "Formation modifiée", description: `La formation "${values.title}" a été mise à jour.` });
    }
    closeDialog();
  };
  const handleRemoveRegistryItem = (itemId: string, itemName: string) => {
    removeTrainingRegistryItem(itemId);
    toast({ title: "Formation supprimée", description: `La formation "${itemName}" a été supprimée.` });
  };

  const handleSessionSubmit = (values: UpcomingSessionFormValues) => {
    const sessionData = { ...values, date: format(values.date, "yyyy-MM-dd") };
    if (dialogState.mode === "add") {
      addUpcomingSession(sessionData);
      toast({ title: "Session ajoutée", description: `La session "${values.title}" a été ajoutée.` });
    } else if (dialogState.mode === "edit" && dialogState.data?.id) {
      editUpcomingSession(dialogState.data.id, sessionData);
      toast({ title: "Session modifiée", description: `La session "${values.title}" a été mise à jour.` });
    }
    closeDialog();
  };
  const handleRemoveSession = (sessionId: string, sessionName: string) => {
    removeUpcomingSession(sessionId);
    toast({ title: "Session supprimée", description: `La session "${sessionName}" a été supprimée.` });
  };

  const handleCampaignSubmit = (values: SensitizationCampaignFormValues) => {
    const campaignData = { ...values, launchDate: format(values.launchDate, "yyyy-MM-dd") };
    if (dialogState.mode === "add") {
      addSensitizationCampaign(campaignData);
      toast({ title: "Campagne ajoutée", description: `La campagne "${values.name}" a été ajoutée.` });
    } else if (dialogState.mode === "edit" && dialogState.data?.id) {
      editSensitizationCampaign(dialogState.data.id, campaignData);
      toast({ title: "Campagne modifiée", description: `La campagne "${values.name}" a été mise à jour.` });
    }
    closeDialog();
  };
  const handleRemoveCampaign = (campaignId: string, campaignName: string) => {
    removeSensitizationCampaign(campaignId);
    toast({ title: "Campagne supprimée", description: `La campagne "${campaignName}" a été supprimée.` });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Logo className="h-12 w-12 animate-spin" />
        <p className="ml-4 text-lg text-muted-foreground">Chargement des données de formation...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header & Vision */}
      <div className="relative mb-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Compliance Learning hub</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Formations et <span className="text-primary">Sensibilisation</span>
            </h1>
            <p className="text-slate-500 text-sm max-w-2xl">
              Gérez le cycle de vie des compétences et la culture de conformité de l'organisation.
            </p>
          </div>
        </div>
      </div>

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sensitizationKpiData.map(item => (
              <Card key={item.name} className="bg-muted/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{item.name}</CardTitle>
                  <item.icon className="h-4 w-4 text-muted-foreground" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle className="font-headline text-xl flex items-center">
                <CalendarDaysIcon className="mr-2 h-6 w-6 text-primary" />
                Planning des Formations
              </CardTitle>
              <CardDescription>Calendrier des sessions à venir et options de gestion.</CardDescription>
            </div>
            <Button onClick={() => openDialog("session", "add")}><PlusCircle className="mr-2 h-4 w-4" />Ajouter</Button>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune session planifiée.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {upcomingSessions.map(session => (
                  <Card key={session.id} className="p-3 hover:bg-muted/50 transition-colors group">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-medium">{session.title}</h5>
                        <p className="text-xs text-muted-foreground">Date: {format(new Date(session.date), "dd/MM/yyyy", { locale: fr })} | Dép: {session.department}</p>
                      </div>
                      <div className="flex items-center">
                        <Badge variant={session.type === "Obligatoire" ? "destructive" : "secondary"} className="text-xs mr-2">{session.type}</Badge>
                        <AlertDialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDialog("session", "edit", session)}><Edit2 className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                              </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer la session ?</AlertDialogTitle>
                              <AlertDialogDescription>"{session.title}" sera supprimée définitivement.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemoveSession(session.id, session.title)} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    {session.progress !== undefined && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Préparation</span>
                          <span>{session.progress}%</span>
                        </div>
                        <Progress value={session.progress} className="h-1.5" />
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle className="font-headline text-xl flex items-center">
                <Megaphone className="mr-2 h-6 w-6 text-primary" />
                Campagnes de Sensibilisation
              </CardTitle>
              <CardDescription>Suivi des campagnes en cours et planifiées.</CardDescription>
            </div>
            <Button onClick={() => openDialog("campaign", "add")}><PlusCircle className="mr-2 h-4 w-4" />Ajouter</Button>
          </CardHeader>
          <CardContent>
            {sensitizationCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune campagne planifiée.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {sensitizationCampaigns.map(campaign => (
                  <Card key={campaign.id} className="shadow-sm group p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-grow">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-sm flex items-center">{campaign.name}</h4>
                            <p className="text-xs text-muted-foreground">Lancée le: {format(new Date(campaign.launchDate), "dd/MM/yyyy", { locale: fr })} | Cible: {campaign.target}</p>
                          </div>
                          <div className="flex items-center flex-shrink-0">
                            <Badge variant={campaign.status === "En cours" ? "default" : campaign.status === "Planifiée" ? "outline" : "secondary"} className={`capitalize text-xs mr-2 ${campaign.status === "En cours" ? "bg-yellow-500 text-white hover:bg-yellow-600" : ""}`}>
                              {campaign.status}
                            </Badge>
                            <AlertDialog>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openDialog("campaign", "edit", campaign)}><Edit2 className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                                  </AlertDialogTrigger>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer la campagne ?</AlertDialogTitle>
                                  <AlertDialogDescription>"{campaign.name}" sera supprimée définitivement.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRemoveCampaign(campaign.id, campaign.name)} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        {campaign.progress !== undefined && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Avancement</span>
                              <span>{campaign.progress}%</span>
                            </div>
                            <Progress value={campaign.progress} className="h-1.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle className="font-headline text-xl flex items-center">
              <BookOpen className="mr-2 h-6 w-6 text-primary" />
              Registre des Formations
            </CardTitle>
            <CardDescription>Catalogue des formations disponibles, traçabilité et gestion des contenus.</CardDescription>
          </div>
          <Button onClick={() => openDialog("registry", "add")}>
            <PlusCircle className="mr-2 h-4 w-4" />Ajouter une Formation
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[250px]">Titre</TableHead>
                  <TableHead>Objectif</TableHead>
                  <TableHead className="text-center w-[80px]">Durée</TableHead>
                  <TableHead className="w-[150px]">Support</TableHead>
                  <TableHead className="w-[150px]">Avancement</TableHead>
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
                      <TableCell className="py-3">
                        {training.progress !== undefined && (
                          <div className="flex items-center gap-2">
                            <Progress value={training.progress} className="h-1.5 w-20" />
                            <span className="text-xs text-muted-foreground">{training.progress}%</span>
                          </div>
                        )}
                      </TableCell>
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
                              <DropdownMenuItem onClick={() => openDialog("registry", "edit", training)}>
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
                              <AlertDialogAction onClick={() => handleRemoveRegistryItem(training.id, training.title)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
                      Aucune formation dans le registre.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground space-y-1">
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
              src="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxsZWFybmluZ3xlbnwwfHx8fDE3NTA3NTEyMDJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Compliance Training Illustration"
              width={600}
              height={300}
              className="object-cover w-full h-full max-h-[250px] md:max-h-none"
              data-ai-hint="learning"
            />
          </div>
        </div>
      </Card>

      <Dialog open={!!dialogState.type} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
        <DialogContent className="rounded-[2.5rem] p-0 max-w-2xl border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] overflow-hidden bg-white dark:bg-slate-950">
          <div className="bg-slate-50/50 dark:bg-slate-900/50 p-10 border-b border-slate-100 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {dialogState.mode === "add" ? "Ajouter " : "Modifier "}
                <span className="text-primary italic">
                  {dialogState.type === "registry" ? "une Formation" :
                    dialogState.type === "session" ? "une Session" :
                      dialogState.type === "campaign" ? "une Campagne" : ""}
                </span>
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium italic">
                {dialogState.type === "registry" ? "Enregistrement d'un nouveau module dans le catalogue officiel." :
                  dialogState.type === "session" ? "Planification d'une intervention pédagogique ciblée." :
                    dialogState.type === "campaign" ? "Lancement d'une opération de culture de conformité." : ""}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {dialogState.type === "registry" && (
              <Form {...registryForm}>
                <form onSubmit={registryForm.handleSubmit(handleRegistrySubmit)} className="space-y-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-1 bg-primary rounded-full" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Détails de la Formation</h3>
                    </div>

                    <FormField control={registryForm.control} name="title" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Titre du module</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={registryForm.control} name="objective" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Objectif pédagogique</FormLabel><FormControl><Textarea {...field} rows={3} className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold" /></FormControl><FormMessage /></FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                      <FormField control={registryForm.control} name="duration" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Durée estimée</FormLabel><FormControl><Input {...field} placeholder="Ex: 2h" className="h-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={registryForm.control} name="support" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Support / Format</FormLabel><FormControl><Input {...field} placeholder="Ex: PPT, Webinar" className="h-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-1 bg-amber-500 rounded-full" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Critères de validation</h3>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => appendRegistryCriterion({ id: `new-${Date.now()}`, text: '', isCompleted: false })} className="text-primary font-bold text-[10px] tracking-widest uppercase">
                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {registryCriteriaFields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-3 p-3 bg-slate-50/30 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800">
                          <FormField
                            control={registryForm.control}
                            name={`completionCriteria.${index}.text`}
                            render={({ field: inputField }) => (
                              <FormItem className="flex-grow">
                                <FormControl><Input {...inputField} placeholder="Description du critère..." className="h-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-medium text-xs" /></FormControl>
                              </FormItem>
                            )}
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeRegistryCriterion(index)} className="text-rose-500 hover:bg-rose-50 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <DialogClose asChild><Button type="button" variant="ghost" className="h-12 px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest text-slate-500">Annuler</Button></DialogClose>
                    <Button type="submit" className="h-12 px-10 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl">
                      {dialogState.mode === "add" ? "Fixer le Module" : "Actualiser"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {dialogState.type === "session" && (
              <Form {...sessionForm}>
                <form onSubmit={sessionForm.handleSubmit(handleSessionSubmit)} className="space-y-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-1 bg-primary rounded-full" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Paramètres de la Session</h3>
                    </div>

                    <FormField control={sessionForm.control} name="title" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Titre de l'intervention</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold" /></FormControl><FormMessage /></FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-6">
                      <FormField control={sessionForm.control} name="date" render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Date prévue</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant={"outline"} className={`h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-sm ${!field.value && "text-muted-foreground"}`}>
                                  {field.value ? format(field.value, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                                  <LucideIcons.CalendarDays className="ml-auto h-4 w-4 opacity-50 text-primary" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date("1900-01-01")} initialFocus locale={fr} />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={sessionForm.control} name="type" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Niveau de priorité</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold"><SelectValue placeholder="Choisir un type" /></SelectTrigger></FormControl>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                              <SelectItem value="Obligatoire" className="font-bold">OBLIGATOIRE</SelectItem>
                              <SelectItem value="Recommandée" className="font-bold">RECOMMANDÉE</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={sessionForm.control} name="department" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Département cible</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold"><SelectValue placeholder="Choisir un département" /></SelectTrigger></FormControl>
                          <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                            {departmentOptions.map(option => (<SelectItem key={option} value={option} className="font-bold">{option}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <Separator />

                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-1 bg-emerald-500 rounded-full" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Logistique & Suivi</h3>
                    </div>

                    <div className="bg-slate-50/50 dark:bg-slate-900/30 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/50 space-y-4">
                      <FormField control={sessionForm.control} name="logisticsConfirmed" render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-bold flex items-center text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 cursor-pointer">Logistique confirmée</FormLabel></FormItem>
                      )} />
                      <FormField control={sessionForm.control} name="materialsPrepared" render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-bold flex items-center text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 cursor-pointer">Supports pédagogiques prêts</FormLabel></FormItem>
                      )} />
                      <FormField control={sessionForm.control} name="invitationsSent" render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-bold flex items-center text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 cursor-pointer">Invitations envoyées</FormLabel></FormItem>
                      )} />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <DialogClose asChild><Button type="button" variant="ghost" className="h-12 px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest text-slate-500">Annuler</Button></DialogClose>
                    <Button type="submit" className="h-12 px-10 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl">
                      {dialogState.mode === "add" ? "Fixer la Session" : "Actualiser"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {dialogState.type === "campaign" && (
              <Form {...campaignForm}>
                <form onSubmit={campaignForm.handleSubmit(handleCampaignSubmit)} className="space-y-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-1 bg-primary rounded-full" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Définition de la Campagne</h3>
                    </div>

                    <FormField control={campaignForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nom de l'opération</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold" /></FormControl><FormMessage /></FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-6">
                      <FormField control={campaignForm.control} name="launchDate" render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Lancement</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant={"outline"} className={`h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-sm ${!field.value && "text-muted-foreground"}`}>
                                  {field.value ? format(field.value, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                                  <LucideIcons.CalendarDays className="ml-auto h-4 w-4 opacity-50 text-primary" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={fr} />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={campaignForm.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">État initial</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold"><SelectValue placeholder="Choisir un statut" /></SelectTrigger></FormControl>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                              <SelectItem value="Planifiée" className="font-bold">PLANIFIÉE</SelectItem>
                              <SelectItem value="En cours" className="font-bold">EN COURS</SelectItem>
                              <SelectItem value="Terminée" className="font-bold">TERMINÉE</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={campaignForm.control} name="target" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Audience cible</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold"><SelectValue placeholder="Choisir une cible" /></SelectTrigger></FormControl>
                          <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                            {targetOptions.map(option => (<SelectItem key={option} value={option} className="font-bold">{option}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-1 bg-amber-500 rounded-full" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Objectifs de Sensibilisation</h3>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => appendCampaignCriterion({ id: `new-${Date.now()}`, text: '', isCompleted: false })} className="text-primary font-bold text-[10px] tracking-widest uppercase">
                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {campaignCriteriaFields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-3 p-3 bg-slate-50/30 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800">
                          <FormField
                            control={campaignForm.control}
                            name={`completionCriteria.${index}.text`}
                            render={({ field: inputField }) => (
                              <FormItem className="flex-grow">
                                <FormControl><Input {...inputField} placeholder="Description du critère..." className="h-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-medium text-xs" /></FormControl>
                              </FormItem>
                            )}
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeCampaignCriterion(index)} className="text-rose-500 hover:bg-rose-50 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <DialogClose asChild><Button type="button" variant="ghost" className="h-12 px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest text-slate-500">Annuler</Button></DialogClose>
                    <Button type="submit" className="h-12 px-10 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl">
                      {dialogState.mode === "add" ? "Lancer la Campagne" : "Actualiser"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
