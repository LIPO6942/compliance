
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { usePlanData } from "@/contexts/PlanDataContext";
import { useToast } from "@/hooks/use-toast";
import type { ComplianceTask, ComplianceCategory, ComplianceSubCategory, Document } from "@/types/compliance";
import type { DialogState, ViewMode } from "@/components/plan/types";
import { PlanHeader } from "@/components/plan/PlanHeader";
import { PlanDialogs } from "@/components/plan/PlanDialogs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { PlusCircle, Edit2, Trash2, MoreVertical, Clock, Link as LinkIcon, FileText, ArrowDown, ArrowUp, ShieldAlert, Maximize2, X } from "lucide-react";
import { useRiskMapping } from "@/contexts/RiskMappingContext";
import * as LucideIcons from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Logo } from "@/components/icons/Logo";
import { useDocuments } from "@/contexts/DocumentsContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import ConnectorDialog from "@/components/plan/ConnectorDialog";
import { MermaidRenderer } from "@/components/plan/MermaidRenderer";
import { MindMapView } from "@/components/plan/MindMapView";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
// react-hook-form and zod already imported at top
import { cn } from "@/lib/utils";

const categorySchema = z.object({ name: z.string().min(1, "Le nom de la catégorie est requis."), icon: z.string().min(1, "L'icône de la catégorie est requise.") });
const subCategorySchema = z.object({ name: z.string().min(1, "Le nom de la sous-catégorie est requis."), icon: z.string().optional() });
const taskSchema = z.object({
  name: z.string().min(1, "Le nom de la tâche est requis."),
  description: z.string().optional(),
  deadline: z.string().optional(),
  documentIds: z.array(z.string()).optional(),
  branches: z.array(z.string()).optional(),

  // GRC Fields
  processes: z.array(z.string()).optional(),
  risks: z.array(z.string()).optional(),
  controls: z.array(z.string()).optional(),
  raci: z.object({
    responsible: z.string().optional(),
    accountable: z.string().optional(),
    consulted: z.array(z.string()).optional(),
    informed: z.array(z.string()).optional(),
  }).optional(),
  frequency: z.enum(['monthly', 'quarterly', 'annual', 'one_time', 'custom']).optional(),
  kpi: z.object({
    name: z.string().optional(),
    target: z.string().optional(),
    unit: z.string().optional(),
    thresholdAlert: z.number().optional(),
  }).optional(),
  lastReviewDate: z.string().optional(),
  nextReviewDate: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;
type SubCategoryFormValues = z.infer<typeof subCategorySchema>;
type TaskFormValues = z.infer<typeof taskSchema>;

const iconMap: Record<string, LucideIcons.LucideIcon> = {
  Gavel: LucideIcons.Gavel, ShieldAlert: LucideIcons.ShieldAlert, SearchCheck: LucideIcons.SearchCheck, ClipboardCheck: LucideIcons.ClipboardCheck,
  Users: LucideIcons.Users, MessageSquareWarning: LucideIcons.MessageSquareWarning, FolderKanban: LucideIcons.FolderKanban, ListTodo: LucideIcons.ListTodo,
  CheckSquare: LucideIcons.CheckSquare, Activity: LucideIcons.Activity, Archive: LucideIcons.Archive, Award: LucideIcons.Award, BarChart3: LucideIcons.BarChart3,
  Bell: LucideIcons.Bell, BookOpen: LucideIcons.BookOpen, Briefcase: LucideIcons.Briefcase, Building: LucideIcons.Building, CalendarDays: LucideIcons.CalendarDays,
  Edit3: LucideIcons.Edit3, FileDigit: LucideIcons.FileDigit, Filter: LucideIcons.Filter, Flag: LucideIcons.Flag, FolderOpen: LucideIcons.FolderOpen,
  Globe2: LucideIcons.Globe2, Grid: LucideIcons.Grid, HardDrive: LucideIcons.HardDrive, HelpCircle: LucideIcons.HelpCircle, Home: LucideIcons.Home,
  Info: LucideIcons.Info, KeyRound: LucideIcons.KeyRound, Layers2: LucideIcons.Layers2, LayoutGrid: LucideIcons.LayoutGrid, LifeBuoy: LucideIcons.LifeBuoy,
  Link2: LucideIcons.Link2, ListChecks: LucideIcons.ListChecks, Lock: LucideIcons.Lock, Mail: LucideIcons.Mail, Map: LucideIcons.Map, Menu: LucideIcons.Menu,
  MessageCircleQuestion: LucideIcons.MessageCircleQuestion, PenLine: LucideIcons.PenLine, PieChart: LucideIcons.PieChart, PlayCircle: LucideIcons.PlayCircle,
  PlusCircle: LucideIcons.PlusCircle, Printer: LucideIcons.Printer, RadioTower: LucideIcons.RadioTower, Save: LucideIcons.Save, Search: LucideIcons.Search,
  Settings2: LucideIcons.Settings2, Share2: LucideIcons.Share2, Sheet: LucideIcons.Sheet, SlidersHorizontal: LucideIcons.SlidersHorizontal, Star: LucideIcons.Star,
  Table: LucideIcons.Table, Tag: LucideIcons.Tag, Target: LucideIcons.Target, TerminalSquare: LucideIcons.TerminalSquare, ThumbsUp: LucideIcons.ThumbsUp,
  Trash: LucideIcons.Trash, UserCog: LucideIcons.UserCog, Video: LucideIcons.Video, WalletCards: LucideIcons.WalletCards, Zap: LucideIcons.Zap,
  Eye: LucideIcons.Eye, FileSearch: LucideIcons.FileSearch, PackageCheck: LucideIcons.PackageCheck, Megaphone: LucideIcons.Megaphone, MailWarning: LucideIcons.MailWarning,
  Siren: LucideIcons.Siren, Projector: LucideIcons.Projector, Wrench: LucideIcons.Wrench, MoreVertical: LucideIcons.MoreVertical, ChevronDown: LucideIcons.ChevronDown,
  Clock: LucideIcons.Clock, Workflow: LucideIcons.Workflow, UserPlus: LucideIcons.UserPlus, Monitor: LucideIcons.Monitor,
};

const getIconComponent = (iconName?: string): LucideIcons.LucideIcon => (iconName && iconMap[iconName]) || LucideIcons.ListTodo;

const isTaskOverdue = (task: ComplianceTask) => {
  return task.deadline && !task.completed && new Date(task.deadline) < new Date();
};

// Utilitaires risques
const riskLevelToNumber = (level: string): number => {
  switch (level) {
    case 'Faible': return 1;
    case 'Modéré': return 2;
    case 'Élevé': return 3;
    case 'Très élevé': return 4;
    default: return 0;
  }
};

const riskBadgeStyles: Record<string, { bg: string; text: string; border: string; emoji: string }> = {
  'Faible': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', emoji: '🟢' },
  'Modéré': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', emoji: '🟡' },
  'Élevé': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', emoji: '🟠' },
  'Très élevé': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', emoji: '🔴' },
};






export default function PlanPage() {
  const {
    planData,
    loading,
    updateTaskCompletion,
    addCategory,
    editCategory,
    removeCategory,
    addSubCategory,
    editSubCategory,
    removeSubCategory,
    addTask,
    editTask,
    removeTask,
    activeWorkflows,
    deleteWorkflow,
    updateWorkflowOrder
  } = usePlanData();
  const router = useRouter();
  const { documents, loading: docsLoading } = useDocuments();
  const { risks: allRisks } = useRiskMapping();
  const { toast } = useToast();

  const [isClient, setIsClient] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>('list');
  const [dialogState, setDialogState] = React.useState<DialogState>({ type: null, mode: null });
  const [deleteDialog, setDeleteDialog] = React.useState<{
    type: 'category' | 'subCategory' | 'task' | null;
    categoryId?: string;
    subCategoryId?: string;
    taskId?: string;
    name?: string;
  }>({ type: null });

  // Fullscreen diagram state
  const [fullscreenDiagram, setFullscreenDiagram] = React.useState<{
    code: string;
    workflowId: string;
    name: string;
  } | null>(null);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const openDialog = (type: "category" | "subCategory" | "task", mode: "add" | "edit", data?: any, parentId?: string, grandParentId?: string) => {
    setDialogState({ type, mode, data, parentId, grandParentId });
  };

  const closeDialog = () => setDialogState({ type: null, mode: null });
  const closeDeleteDialog = () => setDeleteDialog({ type: null });

  const getTaskRiskLevel = (task: ComplianceTask): string | null => {
    if (!task.risks || task.risks.length === 0) return null;
    const linkedRisks = allRisks.filter(r => task.risks!.includes(r.id));
    if (linkedRisks.length === 0) return null;
    let maxLevel = 0;
    let maxLabel = '';
    linkedRisks.forEach(r => {
      const lvl = riskLevelToNumber(r.riskLevel);
      if (lvl > maxLevel) { maxLevel = lvl; maxLabel = r.riskLevel; }
    });
    return maxLabel;
  };

  const handleMoveWorkflow = async (id: string, direction: number) => {
    const sortedWorkflows = Object.entries(activeWorkflows).sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0));
    const index = sortedWorkflows.findIndex(([wfId]) => wfId === id);
    if (index === -1) return;

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sortedWorkflows.length) return;

    const currentWf = sortedWorkflows[index];
    const targetWf = sortedWorkflows[newIndex];

    const currentOrder = currentWf[1].order ?? index;
    const targetOrder = targetWf[1].order ?? newIndex;

    await updateWorkflowOrder(currentWf[0], targetOrder);
    await updateWorkflowOrder(targetWf[0], currentOrder);
    toast({ title: "Ordre mis à jour" });
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce workflow ?')) return;
    try {
      await deleteWorkflow(id);
      toast({ title: "Workflow supprimé" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur lors de la suppression" });
    }
  };

  const onSubmitCategory = async (values: CategoryFormValues) => {
    if (dialogState.mode === 'add') {
      await addCategory(values);
      toast({ title: "Catégorie ajoutée" });
    } else if (dialogState.data?.id) {
      await editCategory(dialogState.data.id, values);
      toast({ title: "Catégorie modifiée" });
    }
    closeDialog();
  };

  const handleRemoveCategory = async (categoryId: string) => {
    await removeCategory(categoryId);
    toast({ title: "Catégorie supprimée" });
    closeDeleteDialog();
  };

  const onSubmitSubCategory = async (values: SubCategoryFormValues) => {
    if (dialogState.mode === 'add' && dialogState.parentId) {
      await addSubCategory(dialogState.parentId, values);
      toast({ title: "Sous-catégorie ajoutée" });
    } else if (dialogState.mode === 'edit' && dialogState.grandParentId && dialogState.data?.id) {
      await editSubCategory(dialogState.grandParentId, dialogState.data.id, values);
      toast({ title: "Sous-catégorie modifiée" });
    }
    closeDialog();
  };

  const handleRemoveSubCategory = async (categoryId: string, subCategoryId: string) => {
    await removeSubCategory(categoryId, subCategoryId);
    toast({ title: "Sous-catégorie supprimée" });
    closeDeleteDialog();
  };

  const onSubmitTask = async (values: TaskFormValues) => {
    if (dialogState.grandParentId && dialogState.parentId) {
      const taskData: any = {
        ...values,
        deadline: values.deadline ? new Date(values.deadline).toISOString() : undefined,
      };

      // Nettoyage KPI pour éviter les erreurs de type/données partielles
      if (taskData.kpi) {
        if (!taskData.kpi.name && !taskData.kpi.target && !taskData.kpi.unit) {
          delete taskData.kpi;
        } else {
          taskData.kpi.name = taskData.kpi.name || "";
          taskData.kpi.target = taskData.kpi.target || "";
          taskData.kpi.unit = taskData.kpi.unit || "";
        }
      }

      if (dialogState.mode === 'add') {
        await addTask(dialogState.grandParentId, dialogState.parentId, taskData);
        toast({ title: "Tâche ajoutée" });
      } else if (dialogState.data?.id) {
        await editTask(dialogState.grandParentId, dialogState.parentId, dialogState.data.id, taskData);
        toast({ title: "Tâche modifiée" });
      }
    }
    closeDialog();
  };

  const handleRemoveTask = async (categoryId: string, subCategoryId: string, taskId: string) => {
    await removeTask(categoryId, subCategoryId, taskId);
    toast({ title: "Tâche supprimée" });
    closeDeleteDialog();
  };

  const handleToggleTaskCompletion = async (categoryId: string, subCategoryId: string, taskId: string, completed: boolean) => {
    await updateTaskCompletion(categoryId, subCategoryId, taskId, completed);
    toast({ title: "Statut de la tâche modifié" });
  };

  const getLinkedDocuments = (task: ComplianceTask): Document[] => {
    if (!task.documentIds || task.documentIds.length === 0) return [];
    return documents.filter(doc => task.documentIds!.includes(doc.id));
  };

  const displayPlanData = React.useMemo(() => {
    if (!planData) return [];
    const newPlan = JSON.parse(JSON.stringify(planData));
    const activeIds = Object.keys(activeWorkflows);
    if (activeIds.length > 0) {
      let processCat = newPlan.find((c: any) => c.id === 'processus-metiers' || c.name.toLowerCase().includes("processus métiers"));
      if (!processCat) {
        processCat = { id: 'processus-metiers', name: 'Processus Métiers Clés', icon: 'Workflow', subCategories: [] };
        newPlan.push(processCat);
      }
      const existingSubIds = processCat.subCategories.map((s: any) => s.id);

      // Filter out subcategories that are not in activeWorkflows for this specific category
      processCat.subCategories = processCat.subCategories.filter((s: any) => activeIds.includes(s.id));

      activeIds.forEach(id => {
        if (!processCat.subCategories.find((s: any) => s.id === id)) {
          processCat.subCategories.push({
            id,
            name: activeWorkflows[id].name || id,
            tasks: [],
            icon: 'Workflow'
          });
        }
      });
    }
    return newPlan;
  }, [planData, activeWorkflows]);

  if (loading || docsLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Logo className="h-12 w-12 animate-spin" />
        <p className="ml-4 text-lg text-muted-foreground">Chargement du plan de conformité...</p>
      </div>
    );
  }

  const filteredPlanData = viewMode === 'diagram'
    ? displayPlanData.filter((c: any) => c.name === "Processus Métiers Clés" || c.name === "Processus Métiers")
    : displayPlanData;

  return (
    <div className="space-y-10 bg-slate-50/50 dark:bg-slate-950/20 -m-8 p-8 min-h-screen">
      <PlanHeader onAddCategory={() => openDialog("category", "add")} viewMode={viewMode} onViewModeChange={setViewMode} />

      {viewMode === 'mindmap' ? (
        <MindMapView onNodeClick={(nodeType, entityId) => {
          if (nodeType === 'process') {
            const el = document.getElementById(entityId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else if (nodeType === 'risk') {
            router.push(`/risk-mapping?riskId=${entityId}`);
          } else if (nodeType === 'document') {
            router.push(`/documents?docId=${entityId}`);
          }
        }} />
      ) : (
        <div className="space-y-12">
          {filteredPlanData.length > 0 ? filteredPlanData.map((category: ComplianceCategory) => {
            const Icon = getIconComponent(category.icon);
            const isProcessCategory = category.id === 'processus-metiers' || category.name.toLowerCase().includes("processus métiers");
            return (
              <Card key={category.id} id={category.id} className="shadow-2xl border-none overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900">
                <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 px-8 py-6 group border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-2xl font-black font-headline uppercase tracking-tight">{category.name}</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isProcessCategory && (
                      <Button variant="ghost" size="icon" onClick={() => router.push('/admin/workflows/new')} title="Créer un processus" className="h-8 w-8 hover:bg-emerald-50">
                        <PlusCircle className="h-5 w-5 text-emerald-600" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDialog("category", "edit", category)}>
                          <Edit2 className="mr-2 h-4 w-4" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          onClick={() => setDeleteDialog({ type: 'category', categoryId: category.id, name: category.name })}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {(() => {
                      let subCategoriesToRender = isProcessCategory
                        ? category.subCategories.filter(s => activeWorkflows[s.id])
                        : [...category.subCategories];
                      if (isProcessCategory) {
                        const existingIds = subCategoriesToRender.map(s => s.id);
                        Object.keys(activeWorkflows).forEach(id => {
                          if (!existingIds.includes(id)) {
                            subCategoriesToRender.push({
                              id,
                              name: activeWorkflows[id].name || id,
                              tasks: [],
                              icon: 'Workflow'
                            });
                          }
                        });
                        subCategoriesToRender.sort((a, b) => (activeWorkflows[a.id]?.order ?? 999) - (activeWorkflows[b.id]?.order ?? 999));
                      }

                      return subCategoriesToRender.map((subCategory: ComplianceSubCategory) => {
                        const SubIcon = getIconComponent(subCategory.icon);
                        const activeWorkflow = activeWorkflows[subCategory.id];
                        if (isProcessCategory) {
                          return (
                            <Card key={subCategory.id} id={subCategory.id} className="bg-slate-50 border-none shadow-none overflow-hidden group transition-all duration-300 relative rounded-[2rem]">
                              <CardContent className="p-4">
                                <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[1.8rem] p-8 shadow-sm space-y-8 relative">
                                  {activeWorkflow && (
                                    <div className="absolute right-4 top-4 z-10">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8B6914] dark:text-[#D4B896] hover:bg-[#8B6914]/10 rounded-full">
                                            <MoreVertical className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => router.push(`/admin/workflows/${subCategory.id}/edit`)}>
                                            <Edit2 className="mr-2 h-4 w-4" /> Modifier le diagramme
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleMoveWorkflow(subCategory.id, -1)}>
                                            <ArrowUp className="mr-2 h-4 w-4" /> Monter
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleMoveWorkflow(subCategory.id, 1)}>
                                            <ArrowDown className="mr-2 h-4 w-4" /> Descendre
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteWorkflow(subCategory.id)}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  )}
                                  <div className="text-center border-b-2 border-[#D4B896]/50 dark:border-[#8B7355]/50 pb-3">
                                    <div className="flex items-center justify-center gap-2">
                                      <SubIcon className="h-6 w-6 text-[#8B6914] dark:text-[#D4B896]" />
                                      <h3 className="text-xl font-semibold font-headline text-[#5D4E37] dark:text-[#D4B896]">{subCategory.name}</h3>
                                    </div>
                                  </div>
                                  {activeWorkflow && (
                                    <div className="py-4 relative group/diagram">
                                      {/* Fullscreen expand button */}
                                      <button
                                        onClick={() => setFullscreenDiagram({ code: activeWorkflow.code, workflowId: subCategory.id, name: subCategory.name })}
                                        className="absolute top-6 right-6 z-10 opacity-0 group-hover/diagram:opacity-100 transition-all duration-200 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl h-9 w-9 flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-200 hover:scale-110"
                                        title="Agrandir le diagramme"
                                      >
                                        <Maximize2 className="h-4 w-4 text-slate-500 hover:text-indigo-600" />
                                      </button>
                                      {/* Clickable wrapper to open fullscreen */}
                                      <div
                                        className="cursor-zoom-in"
                                        onClick={() => setFullscreenDiagram({ code: activeWorkflow.code, workflowId: subCategory.id, name: subCategory.name })}
                                      >
                                        <MermaidRenderer
                                          chart={activeWorkflow.code}
                                          workflowId={subCategory.id}
                                          fitMode={true}
                                          onEditTask={(task: any) => openDialog("task", "edit", task, task.subCategoryId || subCategory.id, task.categoryId || category.id)}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        }
                        return (
                          <Card key={subCategory.id} id={subCategory.id} className="bg-slate-50 dark:bg-slate-800/20 border-none shadow-none group rounded-[1.8rem]">
                            <CardHeader className="pb-4 pt-6 px-6 flex flex-row justify-between items-center">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                                  <SubIcon className="h-5 w-5 text-primary" />
                                </div>
                                <CardTitle className="text-lg font-black uppercase tracking-tight font-headline">{subCategory.name}</CardTitle>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openDialog("subCategory", "edit", subCategory, category.id, category.id)}><Edit2 className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                      onClick={() => setDeleteDialog({ type: 'subCategory', categoryId: category.id, subCategoryId: subCategory.id, name: subCategory.name })}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>
                            <CardContent className="px-6 pb-6 pt-2">
                              <ul className="space-y-4">
                                {subCategory.tasks.map((task: ComplianceTask) => {
                                  const linkedDocs = getLinkedDocuments(task);
                                  const taskRiskLevel = getTaskRiskLevel(task);
                                  const riskStyle = taskRiskLevel ? riskBadgeStyles[taskRiskLevel] : null;
                                  return (
                                    <li key={task.id} className="flex items-start bg-white dark:bg-slate-900/50 p-4 rounded-2xl border-2 border-slate-50 dark:border-slate-800/50 hover:border-primary/20 hover:shadow-xl hover:shadow-slate-200/20 transition-all group/task relative pr-12">
                                      <Checkbox id={`task-${task.id}`} checked={task.completed} onCheckedChange={() => handleToggleTaskCompletion(category.id, subCategory.id, task.id, !task.completed)} className="mr-2.5 mt-1 flex-shrink-0 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" aria-labelledby={`task-label-${task.id}`} />
                                      <label htmlFor={`task-${task.id}`} id={`task-label-${task.id}`} className="cursor-pointer flex-grow">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className={`${task.completed ? 'line-through text-muted-foreground/70' : ''} ${isClient && isTaskOverdue(task) ? "text-destructive font-medium" : "text-foreground"}`}>{task.name}</span>
                                          {riskStyle && (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${riskStyle.bg} ${riskStyle.text} ${riskStyle.border}`}>
                                              <span>{riskStyle.emoji}</span>
                                              <ShieldAlert className="h-3 w-3" />
                                              <span>{taskRiskLevel}</span>
                                            </span>
                                          )}
                                          {task.description && <span className="text-xs text-muted-foreground italic"> - {task.description}</span>}
                                        </div>
                                        {task.deadline && (isClient ? (<div className={`text-xs mt-0.5 flex items-center ${isTaskOverdue(task) ? 'text-destructive' : 'text-muted-foreground'}`}><Clock className="h-3 w-3 mr-1" /><span>Échéance: {format(parseISO(task.deadline), 'dd/MM/yyyy', { locale: fr })}</span></div>) : (<div className="text-xs mt-0.5 flex items-center text-muted-foreground"><Clock className="h-3 w-3 mr-1" /><span>Échéance: ...</span></div>))}
                                        {linkedDocs.length > 0 && (
                                          <div className="mt-2 flex flex-wrap gap-2">
                                            {linkedDocs.map(doc => (
                                              <Badge key={doc.id} variant="secondary" className="font-normal text-xs">
                                                <FileText className="h-3 w-3 mr-1.5" />
                                                {doc.url ? (
                                                  <Link href={doc.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center">
                                                    {doc.name} <LinkIcon className="h-3 w-3 ml-1.5" />
                                                  </Link>
                                                ) : (
                                                  doc.name
                                                )}
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                      </label>
                                      <div className="absolute right-0 top-0 opacity-0 group-hover/task:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" side="left">
                                            <DropdownMenuItem onClick={() => openDialog("task", "edit", task, subCategory.id, category.id)}><Edit2 className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                                            <DropdownMenuItem
                                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                              onClick={() => setDeleteDialog({ type: 'task', categoryId: category.id, subCategoryId: subCategory.id, taskId: task.id, name: task.name })}
                                            >
                                              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                              <Button variant="outline" size="sm" className="mt-4" onClick={() => openDialog("task", "add", undefined, subCategory.id, category.id)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une tâche
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      });
                    })()}
                    <Button variant="default" className="mt-4" onClick={() => openDialog("subCategory", "add", undefined, category.id, category.id)}>
                      <PlusCircle className="mr-2 h-5 w-5" /> Ajouter une sous-catégorie
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          }) : (
            <Card className="text-center p-8 border-dashed shadow-none">
              <CardHeader className="p-0">
                <CardTitle className="text-xl font-medium">Aucun plan de conformité défini</CardTitle>
                <CardDescription className="mt-2">Commencez par ajouter votre première catégorie pour construire votre plan.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      )}

      {/* Controlled delete confirmation dialogs */}
      <AlertDialog open={deleteDialog.type === 'category'} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette catégorie ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible et supprimera &quot;{deleteDialog.name}&quot; et toutes ses sous-catégories et tâches.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDialog.categoryId && handleRemoveCategory(deleteDialog.categoryId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialog.type === 'subCategory'} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette sous-catégorie ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible et supprimera &quot;{deleteDialog.name}&quot; et toutes ses tâches.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDialog.categoryId && deleteDialog.subCategoryId && handleRemoveSubCategory(deleteDialog.categoryId, deleteDialog.subCategoryId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialog.type === 'task'} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette tâche ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible et supprimera la tâche &quot;{deleteDialog.name}&quot;.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDialog.categoryId && deleteDialog.subCategoryId && deleteDialog.taskId && handleRemoveTask(deleteDialog.categoryId, deleteDialog.subCategoryId, deleteDialog.taskId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PlanDialogs
        dialogState={dialogState}
        closeDialog={closeDialog}
        onSubmitCategory={onSubmitCategory}
        onSubmitSubCategory={onSubmitSubCategory}
        onSubmitTask={onSubmitTask}
      />

      {/* ── Fullscreen Diagram Overlay ── */}
      {fullscreenDiagram && (
        <div
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setFullscreenDiagram(null)}
        >
          <div
            className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
            style={{ width: 'calc(100vw - 2rem)', height: 'calc(100vh - 2rem)', maxWidth: '1600px' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <LucideIcons.GitBranch className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="font-black text-slate-700 text-sm">{fullscreenDiagram.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{fullscreenDiagram.workflowId}</p>
                </div>
              </div>
              <button
                onClick={() => setFullscreenDiagram(null)}
                className="h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            {/* Diagram — fills remaining space, SVG scales to fit */}
            <div className="absolute inset-0 pt-[64px] overflow-hidden flex items-center justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]">
              <div className="w-full h-full overflow-auto p-6">
                <div className="min-h-full flex items-center justify-center">
                  <style dangerouslySetInnerHTML={{ __html: `.fullscreen-mermaid svg { width: 100% !important; height: auto !important; max-height: calc(100vh - 140px) !important; }` }} />
                  <div className="fullscreen-mermaid w-full">
                    <MermaidRenderer
                      chart={fullscreenDiagram.code}
                      workflowId={fullscreenDiagram.workflowId}
                      fitMode={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
