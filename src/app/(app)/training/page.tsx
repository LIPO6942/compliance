"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import * as XLSX from "xlsx";

import {
  Users,
  BarChart2,
  CalendarDays,
  BookOpen,
  CheckCircle2,
  PlusCircle,
  Edit2,
  Trash2,
  MoreHorizontal,
  Search,
  Download,
  Printer,
  Sparkles,
  FileSpreadsheet,
  Building2,
  GraduationCap,
  ShieldCheck,
  Check,
  Layers,
  ArrowUpDown,
  Filter,
  RefreshCw,
  Plus,
  FileCheck2,
  ClipboardList,
  AlertCircle,
  UserCheck,
  Megaphone,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useTrainingData } from "@/contexts/TrainingDataContext";
import type {
  TrainingReportParticipant,
  RealizationDegree,
  TrainingRegistryItem,
  UpcomingSession,
  SensitizationCampaign,
} from "@/types/compliance";
import {
  COMMON_ENTITIES,
  DEFAULT_PROGRAM_MODULES,
  DEFAULT_REPORT_INTRO,
  DEFAULT_COMPLIANCE_NOTES,
} from "@/data/annualTrainingReportData";
import { getAgencyOptions } from "@/data/agencyGeography";
import { Logo } from "@/components/icons/Logo";

// Liste triée des agences/succursales issue du mapping regtools
const AGENCY_OPTIONS = getAgencyOptions();

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────
const participantFormSchema = z.object({
  participantNumber: z.coerce.number().min(1, "Numéro requis"),
  participantName: z.string().min(1, "Nom du participant requis"),
  entityName: z.string().min(1, "Entité / Direction requise"),
  trainer: z.string().min(1, "Formateur requis"),
  topic: z.string().min(1, "Thème de la formation requis"),
  sessionDate: z.string().min(1, "Date de session requise"),
  scoreQCM: z.string().optional(),
  notes: z.string().optional(),
});
type ParticipantFormValues = z.infer<typeof participantFormSchema>;

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
  type: z.enum(["Obligatoire", "Recommandée"]),
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
  status: z.enum(["En cours", "Planifiée", "Terminée"]),
  launchDate: z.date({ required_error: "La date est requise." }),
  target: z.string().min(1, "La cible est requise."),
  completionCriteria: z.array(completionCriterionSchema).optional().default([]),
});
type SensitizationCampaignFormValues = z.infer<typeof sensitizationCampaignSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function TrainingPage() {
  const {
    annualReportParticipants,
    annualProgramEvaluation,
    addReportParticipant,
    editReportParticipant,
    removeReportParticipant,
    bulkAddReportParticipants,
    updateAnnualEvaluation,
    resetReportParticipants,
    loadSampleReferenceData,

    trainingRegistryItems,
    addTrainingRegistryItem,
    editTrainingRegistryItem,
    removeTrainingRegistryItem,

    upcomingSessions,
    addUpcomingSession,
    editUpcomingSession,
    removeUpcomingSession,

    sensitizationCampaigns,
    addSensitizationCampaign,
    editSensitizationCampaign,
    removeSensitizationCampaign,

    loading,
  } = useTrainingData();

  const { toast } = useToast();

  // State local
  const [selectedYear, setSelectedYear] = React.useState<string>("2025");
  const [activeTab, setActiveTab] = React.useState<string>("report_participants");
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [filterTrainer, setFilterTrainer] = React.useState<string>("all");
  const [filterEntity, setFilterEntity] = React.useState<string>("all");
  const [filterDate, setFilterDate] = React.useState<string>("all");

  // Modal states
  const [participantModalOpen, setParticipantModalOpen] = React.useState(false);
  const [editingParticipant, setEditingParticipant] = React.useState<TrainingReportParticipant | null>(null);
  const [deleteParticipantId, setDeleteParticipantId] = React.useState<string | null>(null);
  const [bulkImportModalOpen, setBulkImportModalOpen] = React.useState(false);
  const [bulkInputText, setBulkInputText] = React.useState("");

  // Other registry dialogs
  const [legacyDialog, setLegacyDialog] = React.useState<{
    type: "registry" | "session" | "campaign" | "delete_registry" | "delete_session" | "delete_campaign" | null;
    mode: "add" | "edit" | null;
    data?: any;
  }>({ type: null, mode: null });

  // Forms
  const participantForm = useForm<ParticipantFormValues>({
    resolver: zodResolver(participantFormSchema),
    defaultValues: {
      participantNumber: 1,
      participantName: "",
      entityName: "",
      trainer: "أسامة مرغني",
      topic: "مكافحة غسل الأموال وتمويل الإرهاب",
      sessionDate: "",
      scoreQCM: "",
      notes: "",
    },
  });

  const registryForm = useForm<TrainingRegistryItemFormValues>({
    resolver: zodResolver(trainingRegistryItemSchema),
    defaultValues: { title: "", objective: "", duration: "", support: "", completionCriteria: [], successRate: 0 },
  });

  const sessionForm = useForm<UpcomingSessionFormValues>({
    resolver: zodResolver(upcomingSessionSchema),
    defaultValues: {
      title: "",
      date: new Date(),
      type: "Obligatoire",
      department: "",
      logisticsConfirmed: false,
      materialsPrepared: false,
      invitationsSent: false,
      isCompleted: false,
      participants: 0,
      totalInvitees: 0,
    },
  });

  const campaignForm = useForm<SensitizationCampaignFormValues>({
    resolver: zodResolver(sensitizationCampaignSchema),
    defaultValues: { name: "", status: "Planifiée", launchDate: new Date(), target: "", completionCriteria: [] },
  });

  const { fields: registryCriteriaFields, append: appendRegistryCriterion, remove: removeRegistryCriterion } =
    useFieldArray({ control: registryForm.control, name: "completionCriteria" });

  const { fields: campaignCriteriaFields, append: appendCampaignCriterion, remove: removeCampaignCriterion } =
    useFieldArray({ control: campaignForm.control, name: "completionCriteria" });

  // Evaluation Edit State
  const [editEvalMode, setEditEvalMode] = React.useState(false);
  const [evalDegree, setEvalDegree] = React.useState<RealizationDegree>(
    annualProgramEvaluation?.realizationDegree || "أنجز"
  );
  const [evalProgram, setEvalProgram] = React.useState<string>(
    annualProgramEvaluation?.approvedProgram || "الدورات التكوينية وورشات عمل حول مكافحة الإرهاب ومنع غسل الأموال"
  );
  const [evalNotes, setEvalNotes] = React.useState<string>(
    annualProgramEvaluation?.complianceNotes || DEFAULT_COMPLIANCE_NOTES
  );
  const [evalIntro, setEvalIntro] = React.useState<string>(
    annualProgramEvaluation?.introText || DEFAULT_REPORT_INTRO
  );

  React.useEffect(() => {
    if (annualProgramEvaluation) {
      setEvalDegree(annualProgramEvaluation.realizationDegree || "أنجز");
      setEvalProgram(annualProgramEvaluation.approvedProgram || "الدورات التكوينية وورشات عمل حول مكافحة الإرهاب ومنع غسل الأموال");
      setEvalNotes(annualProgramEvaluation.complianceNotes || DEFAULT_COMPLIANCE_NOTES);
      setEvalIntro(annualProgramEvaluation.introText || DEFAULT_REPORT_INTRO);
    }
  }, [annualProgramEvaluation]);

  // Unique list of filters
  const uniqueTrainers = React.useMemo(() => {
    const list = Array.from(new Set(annualReportParticipants.map((p) => p.trainer).filter(Boolean)));
    return list;
  }, [annualReportParticipants]);

  const uniqueDates = React.useMemo(() => {
    const list = Array.from(new Set(annualReportParticipants.map((p) => p.sessionDate).filter(Boolean)));
    return list;
  }, [annualReportParticipants]);

  const uniqueEntities = React.useMemo(() => {
    const list = Array.from(new Set(annualReportParticipants.map((p) => p.entityName).filter(Boolean)));
    return list;
  }, [annualReportParticipants]);

  // Filtered participants list
  const filteredParticipants = React.useMemo(() => {
    return annualReportParticipants.filter((p) => {
      const matchesSearch =
        searchTerm.trim() === "" ||
        p.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.trainer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sessionDate.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTrainer = filterTrainer === "all" || p.trainer === filterTrainer;
      const matchesEntity = filterEntity === "all" || p.entityName === filterEntity;
      const matchesDate = filterDate === "all" || p.sessionDate === filterDate;

      return matchesSearch && matchesTrainer && matchesEntity && matchesDate;
    });
  }, [annualReportParticipants, searchTerm, filterTrainer, filterEntity, filterDate]);

  // Statistics
  const totalParticipantsCount = annualReportParticipants.length;
  const distinctEntitiesCount = uniqueEntities.length;
  const distinctSessionsCount = uniqueDates.length;

  // Handlers for Participant Modal
  const handleOpenParticipantModal = (participant?: TrainingReportParticipant) => {
    if (participant) {
      setEditingParticipant(participant);
      participantForm.reset({
        participantNumber: participant.participantNumber,
        participantName: participant.participantName,
        entityName: participant.entityName,
        trainer: participant.trainer,
        topic: participant.topic,
        sessionDate: participant.sessionDate,
        scoreQCM: participant.scoreQCM || "",
        notes: participant.notes || "",
      });
    } else {
      setEditingParticipant(null);
      const nextNumber = annualReportParticipants.length + 1;
      participantForm.reset({
        participantNumber: nextNumber,
        participantName: "",
        entityName: "",
        trainer: "أسامة مرغني",
        topic: "مكافحة غسل الأموال وتمويل الإرهاب",
        sessionDate: "",
        scoreQCM: "",
        notes: "",
      });
    }
    setParticipantModalOpen(true);
  };

  const handleSaveParticipant = async (values: ParticipantFormValues) => {
    try {
      if (editingParticipant) {
        await editReportParticipant(editingParticipant.id, values);
        toast({
          title: "Participant mis à jour",
          description: `Les données de ${values.participantName} ont été enregistrées.`,
        });
      } else {
        await addReportParticipant(values);
        toast({
          title: "Participant ajouté",
          description: `${values.participantName} a été ajouté au tableau officiel.`,
        });
      }
      setParticipantModalOpen(false);
    } catch (e) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le participant.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteParticipant = async () => {
    if (deleteParticipantId) {
      await removeReportParticipant(deleteParticipantId);
      toast({
        title: "Participant supprimé",
        description: "La ligne a été retirée du tableau et les numéros réajustés.",
      });
      setDeleteParticipantId(null);
    }
  };

  // Bulk Import
  const handleBulkImport = async () => {
    if (!bulkInputText.trim()) return;
    const lines = bulkInputText.split("\n").filter((l) => l.trim().length > 0);
    const parsed: Omit<TrainingReportParticipant, "id">[] = [];

    lines.forEach((line, idx) => {
      // Try format: Nom | Entité | Formateur | Thème | Date
      const parts = line.split("|").map((p) => p.trim());
      const pName = parts[0] || `Participant ${idx + 1}`;
      const eName = parts[1] || "فرع التعاونية";
      const tTrainer = parts[2] || "أسامة مرغني";
      const tTopic = parts[3] || "مكافحة غسل الأموال وتمويل الإرهاب";
      const sDate = parts[4] || format(new Date(), "dd/MM/yyyy");

      parsed.push({
        participantNumber: annualReportParticipants.length + idx + 1,
        participantName: pName,
        entityName: eName,
        trainer: tTrainer,
        topic: tTopic,
        sessionDate: sDate,
        attendance: true,
      });
    });

    if (parsed.length > 0) {
      await bulkAddReportParticipants(parsed);
      toast({
        title: "Importation par lot réussie",
        description: `${parsed.length} participants ont été ajoutés avec succès.`,
      });
      setBulkInputText("");
      setBulkImportModalOpen(false);
    }
  };

  // Save Program Evaluation
  const handleSaveEvaluation = async () => {
    await updateAnnualEvaluation({
      realizationDegree: evalDegree,
      approvedProgram: evalProgram,
      complianceNotes: evalNotes,
      introText: evalIntro,
    });
    setEditEvalMode(false);
    toast({
      title: "Bilan officiel enregistré",
      description: "Le tableau de comparaison programme vs réalisations a été actualisé.",
    });
  };

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = annualReportParticipants.map((p) => ({
      "تاريخ الدورة (Date)": p.sessionDate,
      "موضوع الدورة / المحاور (Thème)": p.topic,
      "المكون (Formateur)": p.trainer,
      "عدد المشاركين (#)": p.participantNumber,
      "المشاركين (Participant)": p.participantName,
      "الإدارة المعنية (Entité/Direction)": p.entityName,
      "التقييم QCM": p.scoreQCM || "Complet",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Formations_${selectedYear}`);
    XLSX.writeFile(wb, `Rapport_Formations_LAB_FT_${selectedYear}.xlsx`);

    toast({
      title: "Export Excel généré",
      description: `Le fichier Rapport_Formations_LAB_FT_${selectedYear}.xlsx a été téléchargé.`,
    });
  };

  // Print Official Report
  const handlePrintReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-10rem)]">
        <Logo className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-base font-semibold text-muted-foreground">
          Chargement du centre de formation et des registres LAB-FT...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 print:p-0 print:space-y-4">
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* HEADER OFFICIEL & ACTIONS */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-8 rounded-3xl shadow-xl print:hidden relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10 max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-primary/90 text-white border-none font-bold uppercase tracking-wider text-[11px] px-3 py-1">
              <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
              LAB-FT & Déontologie
            </Badge>
            <Badge variant="outline" className="text-emerald-400 border-emerald-400/40 font-bold text-[11px] px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Conformité Règlementaire CGA & CTAF
            </Badge>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <span>Exercice :</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                aria-label="Sélectionner l'exercice"
                className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-2.5 py-1 text-xs font-bold text-white outline-none cursor-pointer transition-colors"
              >
                <option value="2026" className="text-slate-900">2026 (En cours)</option>
                <option value="2025" className="text-slate-900">2025 (Actif)</option>
                <option value="2024" className="text-slate-900">2024 (Réf / Archivé)</option>
              </select>
            </div>
          </div>

          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">
            الدورات التكوينية في مجال <span className="text-primary-foreground underline decoration-primary/40">مكافحة الإرهاب ومنع غسل الأموال</span>
          </h1>
          <p className="text-slate-300 text-xs lg:text-sm leading-relaxed">
            Plateforme de traçabilité et de reporting officiel : المقر الاجتماعي، الإدارات المركزية، الإدارات الجهوية، شبكة الفروع، نواب التأمين والسماسرة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10 w-full lg:w-auto justify-start lg:justify-end">
          <Button
            onClick={() => handleOpenParticipantModal()}
            className="h-11 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg text-xs flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Ajouter un Participant
          </Button>

          <Button
            variant="outline"
            onClick={() => setBulkImportModalOpen(true)}
            className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold flex items-center gap-2"
          >
            <Layers className="h-4 w-4" />
            Saisie par Lot
          </Button>

          <Button
            variant="outline"
            onClick={handleExportExcel}
            className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Excel (.xlsx)
          </Button>

          <Button
            variant="outline"
            onClick={handlePrintReport}
            className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-xl">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Options du Registre</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={loadSampleReferenceData}
                className="text-xs font-semibold cursor-pointer"
              >
                <Sparkles className="h-4 w-4 mr-2 text-primary" />
                Charger le Modèle de Référence
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={resetReportParticipants}
                className="text-xs font-semibold text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Vider la liste (Nouvelle année)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* KPIS CONSOLIDES */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-900">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Participants Inscrits
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {totalParticipantsCount}
                </span>
                <span className="text-xs text-muted-foreground font-medium">collaborateurs</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-900">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Entités & Agences Couvertes
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {distinctEntitiesCount}
                </span>
                <span className="text-xs text-muted-foreground font-medium">directions & agences</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Building2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-900">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Sessions & Dates Réalisées
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {distinctSessionsCount}
                </span>
                <span className="text-xs text-muted-foreground font-medium">dates de session</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
              <CalendarDays className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-900">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Réalisation du Programme
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  className={`font-black text-xs px-3 py-1 rounded-lg ${
                    annualProgramEvaluation.realizationDegree === "أنجز"
                      ? "bg-emerald-500 text-white"
                      : annualProgramEvaluation.realizationDegree === "أنجز جزئيا"
                      ? "bg-amber-500 text-white"
                      : "bg-rose-500 text-white"
                  }`}
                >
                  {annualProgramEvaluation.realizationDegree || "أنجز"}
                </Badge>
                <span className="text-xs text-muted-foreground font-medium">6 modules clés</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TABS NAVIGATION */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 print:hidden">
          <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl h-auto gap-1">
            <TabsTrigger
              value="report_participants"
              className="rounded-xl font-bold text-xs px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2 text-primary" />
              Rapport & Registre des Participants (جدول المشاركين)
            </TabsTrigger>

            <TabsTrigger
              value="program_evaluation"
              className="rounded-xl font-bold text-xs px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <FileCheck2 className="h-4 w-4 mr-2 text-emerald-600" />
              Programme vs Réalisations (مقارنة البرنامج بالإنجازات)
            </TabsTrigger>

            <TabsTrigger
              value="continuous_catalog"
              className="rounded-xl font-bold text-xs px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <BookOpen className="h-4 w-4 mr-2 text-indigo-600" />
              Catalogue & Sensibilisation
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ───────────────────────────────────────────────────────────────────── */}
        {/* TAB 1: REGISTRE OFFICIEL DES PARTICIPANTS (Word Report Table) */}
        {/* ───────────────────────────────────────────────────────────────────── */}
        <TabsContent value="report_participants" className="space-y-6 m-0">
          {/* Contexte Officiel (معطيات حول الدورات المنجزة) */}
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-gradient-to-br from-slate-50/50 via-white to-blue-50/20 dark:from-slate-900 dark:to-slate-950 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    معطيات حول الدورات المنجزة
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Synthèse de la participation des directions centrales, régionales et du réseau d'intermédiation
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs px-3 py-1.5 rounded-xl border-slate-200">
                {totalParticipantsCount} Participants enregistrés
              </Badge>
            </div>

            <div className="pt-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-arabic text-right space-y-2" dir="rtl">
              <p>
                {evalIntro}
              </p>
            </div>
          </Card>

          {/* Table Controls (Search & Filters) */}
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 p-6 print:hidden">
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher par nom de participant, direction, agence, formateur ou date..."
                  className="pl-10 h-11 rounded-2xl border-slate-200 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-semibold focus:bg-white"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    Effacer
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-48">
                  <Select value={filterTrainer} onValueChange={setFilterTrainer}>
                    <SelectTrigger className="h-11 rounded-2xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-800/50 border-slate-200">
                      <SelectValue placeholder="Formateur" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="all" className="text-xs font-bold">Tous les formateurs</SelectItem>
                      {uniqueTrainers.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-48">
                  <Select value={filterDate} onValueChange={setFilterDate}>
                    <SelectTrigger className="h-11 rounded-2xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-800/50 border-slate-200">
                      <SelectValue placeholder="Date de session" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="all" className="text-xs font-bold">Toutes les dates</SelectItem>
                      {uniqueDates.map((d) => (
                        <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(searchTerm || filterTrainer !== "all" || filterDate !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterTrainer("all");
                      setFilterDate("all");
                    }}
                    className="h-11 rounded-2xl text-xs text-slate-500 font-bold hover:bg-slate-100"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Réinitialiser filtres
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* TABLEAU OFFICIEL DES PARTICIPANTS */}
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/40 dark:bg-slate-800/20">
              <div className="space-y-1">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  جدول المشاركين والدورات التكوينية المنجزة (Exercice {selectedYear})
                </CardTitle>
                <CardDescription className="text-xs">
                  {filteredParticipants.length} ligne(s) affichée(s) sur un total de {totalParticipantsCount} participant(s)
                </CardDescription>
              </div>

              <Button
                onClick={() => handleOpenParticipantModal()}
                size="sm"
                className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-primary text-white font-bold text-xs shadow print:hidden"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Ajouter une ligne
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100/70 dark:bg-slate-800/50 hover:bg-slate-100/70 border-b border-slate-200 dark:border-slate-700">
                    <TableHead className="font-extrabold text-slate-900 dark:text-slate-100 text-center w-16 text-xs">
                      عدد المشاركين<br />
                      <span className="text-[10px] text-slate-500 font-normal"># N°</span>
                    </TableHead>
                    <TableHead className="font-extrabold text-slate-900 dark:text-slate-100 text-right text-xs">
                      المشاركين<br />
                      <span className="text-[10px] text-slate-500 font-normal">Nom & Prénom</span>
                    </TableHead>
                    <TableHead className="font-extrabold text-slate-900 dark:text-slate-100 text-right text-xs">
                      الإدارة المعنية / الفرع / النيابة<br />
                      <span className="text-[10px] text-slate-500 font-normal">Direction / Agence</span>
                    </TableHead>
                    <TableHead className="font-extrabold text-slate-900 dark:text-slate-100 text-center text-xs">
                      المكون<br />
                      <span className="text-[10px] text-slate-500 font-normal">Formateur</span>
                    </TableHead>
                    <TableHead className="font-extrabold text-slate-900 dark:text-slate-100 text-right text-xs">
                      موضوع الدورة / المحاور<br />
                      <span className="text-[10px] text-slate-500 font-normal">Thème / Modules</span>
                    </TableHead>
                    <TableHead className="font-extrabold text-slate-900 dark:text-slate-100 text-center text-xs w-32">
                      تاريخ الدورة<br />
                      <span className="text-[10px] text-slate-500 font-normal">Date Session</span>
                    </TableHead>
                    <TableHead className="font-extrabold text-slate-900 dark:text-slate-100 text-center text-xs w-20 print:hidden">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParticipants.length > 0 ? (
                    filteredParticipants.map((participant) => (
                      <TableRow
                        key={participant.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800 group"
                      >
                        <TableCell className="text-center font-bold text-xs py-3 text-slate-600 dark:text-slate-400">
                          {participant.participantNumber}
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs py-3 text-slate-900 dark:text-white font-arabic">
                          {participant.participantName}
                        </TableCell>
                        <TableCell className="text-right text-xs py-3 font-semibold text-slate-700 dark:text-slate-300 font-arabic">
                          <span className="inline-block bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                            {participant.entityName}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-xs py-3 font-bold text-primary font-arabic">
                          {participant.trainer}
                        </TableCell>
                        <TableCell className="text-right text-xs py-3 text-slate-700 dark:text-slate-300 font-medium font-arabic max-w-xs">
                          {participant.topic}
                        </TableCell>
                        <TableCell className="text-center text-xs py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                          <Badge variant="secondary" className="font-mono text-[11px] rounded-lg">
                            {participant.sessionDate}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center py-3 print:hidden">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenParticipantModal(participant)}
                              className="h-7 w-7 rounded-lg text-slate-600 hover:text-primary hover:bg-primary/10"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteParticipantId(participant.id)}
                              className="h-7 w-7 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-44 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            <FileSpreadsheet className="h-6 w-6" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                              Aucun participant enregistré pour cette année
                            </p>
                            <p className="text-xs text-muted-foreground max-w-sm">
                              Le tableau est structuré et prêt pour la saisie de l'exercice en cours.
                            </p>
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={() => handleOpenParticipantModal()}
                              className="rounded-xl text-xs font-bold"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Ajouter un premier participant
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={loadSampleReferenceData}
                              className="rounded-xl text-xs font-bold"
                            >
                              <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" />
                              Charger exemple de référence
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ───────────────────────────────────────────────────────────────────── */}
        {/* TAB 2: BILAN PROGRAMME VS REALISATIONS (مقارنة البرنامج بالإنجازات) */}
        {/* ───────────────────────────────────────────────────────────────────── */}
        <TabsContent value="program_evaluation" className="space-y-6 m-0">
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                    Bilan Officiel de Conformité
                  </span>
                </div>
                <CardTitle className="text-2xl font-black">
                  مقارنة البرنامج بالإنجازات (Exercice {selectedYear})
                </CardTitle>
                <CardDescription className="text-xs">
                  Tableau d'évaluation réglementaire officiel pour le Conseil d'Administration et l'autorité de contrôle
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                {editEvalMode ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditEvalMode(false)}
                      className="rounded-xl text-xs font-semibold"
                    >
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEvaluation}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Enregistrer le Bilan
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditEvalMode(true)}
                    className="rounded-xl text-xs font-bold border-slate-300"
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1" />
                    Modifier les Remarques & Statut
                  </Button>
                )}
              </div>
            </div>

            <CardContent className="p-6">
              {/* Le Tableau officiel à 3 colonnes comme dans la capture Word */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                      <TableHead className="font-extrabold text-slate-900 dark:text-white text-right w-1/3 text-sm py-4">
                        برنامج السنة المنقضية المصادق عليه<br />
                        <span className="text-xs text-muted-foreground font-normal">Programme validé & Modules</span>
                      </TableHead>
                      <TableHead className="font-extrabold text-slate-900 dark:text-white text-center w-1/5 text-sm py-4">
                        درجة الإنجاز (أنجز / لم ينجز / أنجز جزئيا)<br />
                        <span className="text-xs text-muted-foreground font-normal">Degré de réalisation</span>
                      </TableHead>
                      <TableHead className="font-extrabold text-slate-900 dark:text-white text-right w-1/2 text-sm py-4">
                        ملاحظات مسؤول الامتثال<br />
                        <span className="text-xs text-muted-foreground font-normal">Observations du Responsable Conformité</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="align-top hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      {/* Colonne 1 : Programme & Modules */}
                      <TableCell className="p-6 border-r border-slate-200 dark:border-slate-800 text-right font-arabic" dir="rtl">
                        <div className="space-y-4">
                          <p className="font-bold text-slate-900 dark:text-white text-sm">
                            {evalProgram}
                          </p>
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 space-y-2">
                            <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block font-sans">
                              Axes Pédagogiques du Programme :
                            </span>
                            <ul className="text-xs space-y-1.5 text-slate-700 dark:text-slate-300 font-medium font-sans">
                              {DEFAULT_PROGRAM_MODULES.map((mod, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                  <span>{mod}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </TableCell>

                      {/* Colonne 2 : Degré de réalisation */}
                      <TableCell className="p-6 border-r border-slate-200 dark:border-slate-800 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3 pt-2">
                          {editEvalMode ? (
                            <Select value={evalDegree} onValueChange={(val: RealizationDegree) => setEvalDegree(val)}>
                              <SelectTrigger className="w-36 h-11 font-bold text-xs rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="أنجز" className="font-bold text-emerald-600">أنجز (Réalisé)</SelectItem>
                                <SelectItem value="أنجز جزئيا" className="font-bold text-amber-600">أنجز جزئيا (Partiel)</SelectItem>
                                <SelectItem value="لم ينجز" className="font-bold text-rose-600">لم ينجز (Non réalisé)</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="space-y-2">
                              <Badge
                                className={`text-base font-black px-4 py-2 rounded-xl shadow-sm ${
                                  evalDegree === "أنجز"
                                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                    : evalDegree === "أنجز جزئيا"
                                    ? "bg-amber-500 text-white"
                                    : "bg-rose-500 text-white"
                                }`}
                              >
                                {evalDegree}
                              </Badge>
                              <p className="text-[11px] font-bold text-emerald-600">100% de réalisation</p>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Colonne 3 : Remarques de conformité */}
                      <TableCell className="p-6 text-right font-arabic" dir="rtl">
                        {editEvalMode ? (
                          <Textarea
                            value={evalNotes}
                            onChange={(e) => setEvalNotes(e.target.value)}
                            rows={8}
                            className="rounded-xl text-xs leading-relaxed font-arabic bg-white dark:bg-slate-900 border-2 border-primary/30"
                          />
                        ) : (
                          <div className="space-y-3 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                            <p className="whitespace-pre-line font-medium">{evalNotes}</p>
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2 font-sans">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              <span>Évaluation QCM finalisée avec succès par les collaborateurs.</span>
                            </div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───────────────────────────────────────────────────────────────────── */}
        {/* TAB 3: CATALOGUE & GESTION CONTINUE DES FORMATIONS */}
        {/* ───────────────────────────────────────────────────────────────────── */}
        <TabsContent value="continuous_catalog" className="space-y-6 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Planning des prochaines sessions */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-black flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Sessions Planifiées & En cours
                  </CardTitle>
                  <CardDescription className="text-xs">Calendrier d'intervention pédagogique</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setLegacyDialog({ type: "session", mode: "add" })}
                  className="rounded-xl text-xs font-bold"
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1" />
                  Ajouter Session
                </Button>
              </div>

              <div className="space-y-3">
                {upcomingSessions.length > 0 ? (
                  upcomingSessions.map((sess) => (
                    <Card key={sess.id} className="p-4 rounded-2xl border bg-slate-50/50 dark:bg-slate-800/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{sess.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            Date : {sess.date} | Département : {sess.department}
                          </p>
                        </div>
                        <Badge variant={sess.type === "Obligatoire" ? "destructive" : "secondary"} className="text-[10px] font-bold">
                          {sess.type}
                        </Badge>
                      </div>
                      {sess.progress !== undefined && (
                        <div className="mt-3">
                          <div className="flex justify-between text-[11px] font-semibold text-muted-foreground mb-1">
                            <span>Préparation logistique</span>
                            <span>{sess.progress}%</span>
                          </div>
                          <Progress value={sess.progress} className="h-1.5" />
                        </div>
                      )}
                    </Card>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-6">Aucune session en attente.</p>
                )}
              </div>
            </Card>

            {/* Campagnes de Sensibilisation */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-black flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-amber-500" />
                    Opérations de Sensibilisation
                  </CardTitle>
                  <CardDescription className="text-xs">Campagnes thématiques ciblées</CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLegacyDialog({ type: "campaign", mode: "add" })}
                  className="rounded-xl text-xs font-bold"
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1" />
                  Nouvelle Campagne
                </Button>
              </div>

              <div className="space-y-3">
                {sensitizationCampaigns.length > 0 ? (
                  sensitizationCampaigns.map((camp) => (
                    <Card key={camp.id} className="p-4 rounded-2xl border bg-slate-50/50 dark:bg-slate-800/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{camp.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            Cible : {camp.target} | Lancée le : {camp.launchDate}
                          </p>
                        </div>
                        <Badge className="text-[10px] font-bold bg-amber-500 text-white">
                          {camp.status}
                        </Badge>
                      </div>
                      {camp.progress !== undefined && (
                        <div className="mt-3">
                          <div className="flex justify-between text-[11px] font-semibold text-muted-foreground mb-1">
                            <span>Avancement</span>
                            <span>{camp.progress}%</span>
                          </div>
                          <Progress value={camp.progress} className="h-1.5" />
                        </div>
                      )}
                    </Card>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-6">Aucune campagne en cours.</p>
                )}
              </div>
            </Card>
          </div>

          {/* Registre des modules disponibles */}
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Catalogue des Formations Réglementaires (LBA-FT & Déontologie)
                </CardTitle>
                <CardDescription className="text-xs">
                  Référentiel des modules permanents et critères de validation
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setLegacyDialog({ type: "registry", mode: "add" })}
                className="rounded-xl text-xs font-bold"
              >
                <PlusCircle className="h-3.5 w-3.5 mr-1" />
                Ajouter au Catalogue
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {trainingRegistryItems.map((item) => (
                <Card key={item.id} className="p-5 rounded-2xl border hover:shadow-md transition-all bg-white dark:bg-slate-900">
                  <div className="space-y-2">
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {item.duration}
                    </Badge>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.objective}</p>
                    <div className="pt-2">
                      <div className="flex justify-between text-[11px] font-semibold text-muted-foreground mb-1">
                        <span>Validation</span>
                        <span>{item.progress || 0}%</span>
                      </div>
                      <Progress value={item.progress || 0} className="h-1.5" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL : AJOUT / MODIFICATION PARTICIPANT */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Dialog open={participantModalOpen} onOpenChange={setParticipantModalOpen}>
        <DialogContent className="rounded-3xl max-w-xl p-0 overflow-hidden shadow-2xl bg-white dark:bg-slate-950 border-none">
          <div className="bg-slate-900 text-white p-6 border-b border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                {editingParticipant ? "Modifier le Participant" : "Ajouter un Participant au Rapport"}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Saisie conforme à la structure officielle du rapport annuel LAB-FT
              </DialogDescription>
            </DialogHeader>
          </div>

          <Form {...participantForm}>
            <form onSubmit={participantForm.handleSubmit(handleSaveParticipant)} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={participantForm.control}
                  name="participantNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold">عدد المشاركين (#)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" className="h-10 rounded-xl font-bold" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-2">
                  <FormField
                    control={participantForm.control}
                    name="participantName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold">المشاركين (Nom & Prénom)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: دريدي صابر" className="h-10 rounded-xl font-bold font-arabic" dir="rtl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={participantForm.control}
                name="entityName"
                render={({ field }) => {
                  const [search, setSearch] = React.useState("");
                  const filtered = search.trim()
                    ? AGENCY_OPTIONS.filter((opt) =>
                        opt.name.toLowerCase().includes(search.toLowerCase()) ||
                        opt.type.toLowerCase().includes(search.toLowerCase())
                      )
                    : AGENCY_OPTIONS;

                  return (
                    <FormItem>
                      <FormLabel className="text-xs font-bold">الإدارة المعنية / الفرع / النيابة</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          setSearch("");
                        }}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 rounded-xl font-semibold">
                            <SelectValue placeholder="— Sélectionner une entité —" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-72">
                          {/* Zone de recherche */}
                          <div className="sticky top-0 bg-white dark:bg-slate-950 px-2 pb-1 pt-1 z-10">
                            <input
                              type="text"
                              placeholder="Rechercher une agence..."
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 outline-none bg-slate-50 dark:bg-slate-900 focus:ring-1 focus:ring-primary"
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                          {filtered.length === 0 && (
                            <div className="text-xs text-muted-foreground text-center py-3">Aucun résultat</div>
                          )}
                          {/* Groupement par type */}
                          {["Siège", "Succursale", "Agence", "Courtier", "Agent Stagiaire"].map((type) => {
                            const group = filtered.filter((o) => o.type === type);
                            if (group.length === 0) return null;
                            return (
                              <React.Fragment key={type}>
                                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground bg-slate-100 dark:bg-slate-800">
                                  {type}
                                </div>
                                {group.map((opt) => (
                                  <SelectItem key={opt.code} value={opt.name} className="text-xs">
                                    {opt.name}
                                  </SelectItem>
                                ))}
                              </React.Fragment>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={participantForm.control}
                  name="trainer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold">المكون (Formateur)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: أسامة مرغني" className="h-10 rounded-xl font-semibold font-arabic" dir="rtl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={participantForm.control}
                  name="sessionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold">تاريخ الدورة (Date Session)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: 28/10/2025" className="h-10 rounded-xl font-mono font-semibold" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={participantForm.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold">موضوع الدورة / المحاور</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="مكافحة غسل الأموال وتمويل الإرهاب" className="h-10 rounded-xl font-semibold font-arabic" dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4 flex justify-end gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="ghost" className="rounded-xl text-xs font-bold">
                    Annuler
                  </Button>
                </DialogClose>
                <Button type="submit" className="rounded-xl bg-primary text-white font-bold text-xs px-6">
                  {editingParticipant ? "Mettre à jour" : "Ajouter la ligne"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL : SAISIE / IMPORTATION PAR LOT */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Dialog open={bulkImportModalOpen} onOpenChange={setBulkImportModalOpen}>
        <DialogContent className="rounded-3xl max-w-xl p-0 overflow-hidden shadow-2xl bg-white dark:bg-slate-950 border-none">
          <div className="bg-slate-900 text-white p-6 border-b border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Saisie Rapide & Importation par Lot
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Collez une liste de participants pour créer instantanément plusieurs lignes du rapport.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border text-xs space-y-1">
              <p className="font-bold text-slate-700 dark:text-slate-300">Format accepté par ligne :</p>
              <p className="text-muted-foreground font-mono text-[11px]">
                Nom | Entité | Formateur | Thème | Date
              </p>
              <p className="text-muted-foreground text-[11px] italic">
                Exemple : دريدي صابر | الإدارة الجهوية بتونس الجنوبية | أسامة مرغني | مكافحة غسل الأموال | 28/10/2025
              </p>
            </div>

            <Textarea
              value={bulkInputText}
              onChange={(e) => setBulkInputText(e.target.value)}
              rows={8}
              placeholder="Collez vos lignes ici..."
              className="rounded-2xl text-xs font-arabic leading-relaxed bg-slate-50/50"
              dir="rtl"
            />

            <DialogFooter className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="ghost" className="rounded-xl text-xs font-bold">
                  Annuler
                </Button>
              </DialogClose>
              <Button
                onClick={handleBulkImport}
                disabled={!bulkInputText.trim()}
                className="rounded-xl bg-primary text-white font-bold text-xs px-6"
              >
                Importer dans le tableau
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* ALERT DIALOG : SUPPRESSION PARTICIPANT */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteParticipantId} onOpenChange={(open) => !open && setDeleteParticipantId(null)}>
        <AlertDialogContent className="rounded-3xl shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold text-lg">Supprimer cette ligne du tableau ?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Cette action supprimera le participant et réajustera automatiquement les numéros des autres participants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs font-bold">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteParticipant}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
