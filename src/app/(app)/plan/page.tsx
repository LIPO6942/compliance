
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { usePlanData } from "@/contexts/PlanDataContext";
import { useToast } from "@/hooks/use-toast";
import type { ComplianceTask, ComplianceCategory, ComplianceSubCategory, Document } from "@/types/compliance";
import type { DialogState } from "@/components/plan/types";
import { PlanHeader } from "@/components/plan/PlanHeader";
import { PlanDialogs } from "@/components/plan/PlanDialogs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, Edit2, Trash2, MoreVertical, Clock, Link as LinkIcon, FileText, ArrowDown } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Logo } from "@/components/icons/Logo";
import { useDocuments } from "@/contexts/DocumentsContext";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const categorySchema = z.object({ name: z.string().min(1, "Le nom de la catégorie est requis."), icon: z.string().min(1, "L'icône de la catégorie est requise.") });
const subCategorySchema = z.object({ name: z.string().min(1, "Le nom de la sous-catégorie est requis."), icon: z.string().optional() });
const taskSchema = z.object({
  name: z.string().min(1, "Le nom de la tâche est requis."),
  description: z.string().optional(),
  deadline: z.string().optional(),
  documentIds: z.array(z.string()).optional(),
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

const flowTypeStyles: Record<string, string> = {
  start: 'bg-[#e8f5e9] border-[#2e7d32] text-[#1b5e20] dark:bg-green-900/40 dark:border-green-500 dark:text-green-100',
  end: 'bg-[#e8f5e9] border-[#2e7d32] text-[#1b5e20] dark:bg-green-900/40 dark:border-green-500 dark:text-green-100',
  process: 'bg-[#e1f5fe] border-[#0277bd] text-[#01579b] dark:bg-blue-900/40 dark:border-blue-500 dark:text-blue-100',
  decision: 'bg-[#fff9c4] border-[#fbc02d] text-[#856404] dark:bg-yellow-900/40 dark:border-yellow-600 dark:text-yellow-100',
  action: 'bg-[#fff3e0] border-[#ef6c00] text-[#e65100] dark:bg-orange-900/40 dark:border-orange-500 dark:text-orange-100',
  alert: 'bg-[#ffcdd2] border-[#c62828] text-[#721c24] dark:bg-red-900/40 dark:border-red-500 dark:text-red-100',
  urgent: 'bg-[#ffebee] border-[#b71c1c] text-[#721c24] font-bold border-3 animate-pulse dark:bg-red-800/40 dark:border-red-500 dark:text-red-100',
};

const FlowStep = ({ task, onToggle }: { task: ComplianceTask; onToggle: () => void; }) => {
  const styleClass = flowTypeStyles[task.flow_type || 'process'];
  const isDecision = task.flow_type === 'decision';
  const isUrgent = task.flow_type === 'urgent';
  const isStartEnd = task.flow_type === 'start' || task.flow_type === 'end';

  if (isDecision) {
    return (
      <div className="relative flex items-center justify-center py-4" style={{ height: '140px', width: '140px' }}>
        <div
          className={cn(
            "absolute w-28 h-28 border-2 cursor-pointer transition-all duration-300",
            "shadow-md hover:shadow-xl hover:scale-110",
            "flex items-center justify-center",
            styleClass,
            task.completed && "opacity-60"
          )}
          style={{ transform: 'rotate(45deg)' }}
          onClick={onToggle}
        >
          <div className="absolute top-0 left-0 p-1" style={{ transform: 'rotate(-45deg)' }}>
            <Checkbox checked={task.completed} className="h-3 w-3 border-current text-current" />
          </div>
          <span
            className={cn(
              "text-[10px] sm:text-[11px] font-bold text-center px-3 leading-tight",
              task.completed && "line-through"
            )}
            style={{ transform: 'rotate(-45deg)', maxWidth: '95px' }}
          >
            {task.name}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-[180px] sm:w-[220px] min-h-[45px] p-2 text-[11px] sm:text-xs font-bold text-center border-2 cursor-pointer transition-all duration-300 flex items-center justify-center",
        "shadow-md hover:shadow-xl hover:scale-[1.03]",
        isStartEnd ? "rounded-full" : "rounded-md",
        styleClass,
        task.completed && "opacity-60"
      )}
      onClick={onToggle}
    >
      <div className="absolute top-1 left-1">
        <Checkbox checked={task.completed} className="h-3 w-3 border-current text-current" />
      </div>
      <span className={cn("px-4", task.completed && "line-through")}>{task.name}</span>
    </div>
  );
};


const FlowRenderer = ({ tasks, onToggleTask, categoryId, subCategoryId, isBranch = false }: { tasks: ComplianceTask[], onToggleTask: (catId: string, subCatId: string, taskId: string, completed: boolean) => void, categoryId: string, subCategoryId: string, isBranch?: boolean }) => {
  if (!tasks || tasks.length === 0) return null;

  return (
    <div className={cn("flex flex-col items-center w-full", isBranch ? "mt-4" : "")}>
      {tasks.map((task, index) => {
        const nextTask = tasks[index + 1];
        const hasBranches = task.branches && task.branches.length > 0;
        const handleToggle = () => onToggleTask(categoryId, subCategoryId, task.id, !task.completed);

        if (!hasBranches) {
          return (
            <React.Fragment key={task.id}>
              <FlowStep task={task} onToggle={handleToggle} />
              {nextTask && (
                <div className="flex flex-col items-center py-2">
                  <svg width="20" height="40" viewBox="0 0 20 40" className="text-[#8B7355]/40 fill-none stroke-current stroke-2">
                    <path d="M10 0 L10 30 M5 25 L10 35 L15 25" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </React.Fragment>
          );
        }

        // Decision Step with Branching
        return (
          <div key={task.id} className="w-full flex flex-col items-center">
            <FlowStep task={task} onToggle={handleToggle} />

            <div className="w-full flex justify-center mt-4">
              <div className="flex w-full items-start justify-center gap-x-8 lg:gap-x-16">
                {task.branches?.map((branch, branchIndex) => {
                  const isFirst = branchIndex === 0;
                  const isLast = branchIndex === (task.branches?.length || 0) - 1;
                  const label = branch.label;

                  return (
                    <div key={branch.label} className="relative flex flex-col items-center">
                      {/* Branch Label & Connections */}
                      <div className="h-12 w-32 relative flex items-center justify-center">
                        {/* SVG Connection from decision to branch */}
                        <svg className="absolute inset-0 w-full h-full overflow-visible text-[#8B7355]/40 fill-none stroke-current stroke-2">
                          {/* Horizontal connection line if multiple branches */}
                          {task.branches!.length > 1 && (
                            <path d={isFirst ? "M50% 0 L50% 10 M50% 10 L100% 10" : isLast ? "M50% 0 L50% 10 M50% 10 L0 10" : "M50% 0 L50% 10 M0 10 L100% 10"} strokeLinecap="round" />
                          )}
                          {/* Vertical drop and arrowhead */}
                          <path d="M50% 10 L50% 35 M45% 30 L50% 40 L55% 30" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>

                        <Badge
                          variant="secondary"
                          className={cn(
                            "z-10 text-[10px] font-bold px-2 py-0 h-5 border shadow-sm",
                            label === "Oui" ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200",
                            "absolute top-0 transform translate-y-2"
                          )}
                        >
                          {label}
                        </Badge>
                      </div>

                      {/* Branch Content */}
                      <div className="flex flex-col items-center">
                        <FlowRenderer
                          tasks={branch.tasks}
                          onToggleTask={onToggleTask}
                          categoryId={categoryId}
                          subCategoryId={subCategoryId}
                          isBranch={true}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {nextTask && (
              <div className="flex flex-col items-center py-4">
                <svg width="20" height="40" viewBox="0 0 20 40" className="text-[#8B7355]/40 fill-none stroke-current stroke-2">
                  <path d="M10 0 L10 30 M5 25 L10 35 L15 25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};


export default function PlanPage() {
  const {
    planData,
    loading,
    updateTaskCompletion,
    addCategory,
    editCategory: editCategoryContext,
    removeCategory: removeCategoryContext,
    addSubCategory: addSubCategoryContext,
    editSubCategory: editSubCategoryContext,
    removeSubCategory: removeSubCategoryContext,
    addTask: addTaskContext,
    editTask: editTaskContext,
    removeTask: removeTaskContext,
  } = usePlanData();
  const { documents, loading: docsLoading } = useDocuments();

  const { toast } = useToast();

  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);


  const [dialogState, setDialogState] = React.useState<DialogState>({ type: null, mode: null });

  const openDialog = (type: "category" | "subCategory" | "task", mode: "add" | "edit", data?: any, parentId?: string, grandParentId?: string) => {
    setDialogState({ type, mode, data, parentId, grandParentId });
  };

  const closeDialog = () => setDialogState({ type: null, mode: null });

  const handleAddCategory = async (values: CategoryFormValues) => {
    await addCategory(values);
    toast({ title: "Catégorie ajoutée", description: `La catégorie "${values.name}" a été ajoutée.` });
    closeDialog();
  };

  const handleEditCategory = async (values: CategoryFormValues) => {
    if (dialogState.data?.id) {
      await editCategoryContext(dialogState.data.id, values);
      toast({ title: "Catégorie modifiée", description: `La catégorie "${values.name}" a été modifiée.` });
    }
    closeDialog();
  };

  const onSubmitCategory = (values: CategoryFormValues) => {
    if (dialogState.mode === 'add') {
      handleAddCategory(values);
    } else {
      handleEditCategory(values);
    }
  };

  const handleRemoveCategory = async (categoryId: string) => {
    await removeCategoryContext(categoryId);
    toast({ title: "Catégorie supprimée", description: `La catégorie a été supprimée.` });
  };

  const handleAddSubCategory = async (values: SubCategoryFormValues) => {
    if (dialogState.parentId) {
      await addSubCategoryContext(dialogState.parentId, values);
      toast({ title: "Sous-catégorie ajoutée", description: `La sous-catégorie "${values.name}" a été ajoutée.` });
    }
    closeDialog();
  };

  const handleEditSubCategory = async (values: SubCategoryFormValues) => {
    if (dialogState.grandParentId && dialogState.data?.id) {
      await editSubCategoryContext(dialogState.grandParentId, dialogState.data.id, values);
      toast({ title: "Sous-catégorie modifiée", description: `La sous-catégorie "${values.name}" a été modifiée.` });
    }
    closeDialog();
  };

  const onSubmitSubCategory = (values: SubCategoryFormValues) => {
    if (dialogState.mode === 'add') {
      handleAddSubCategory(values);
    } else {
      handleEditSubCategory(values);
    }
  };

  const handleRemoveSubCategory = async (categoryId: string, subCategoryId: string) => {
    await removeSubCategoryContext(categoryId, subCategoryId);
    toast({ title: "Sous-catégorie supprimée", description: `La sous-catégorie a été supprimée.` });
  };

  const handleAddTask = async (values: TaskFormValues) => {
    if (dialogState.grandParentId && dialogState.parentId) {
      const taskData = { ...values, deadline: values.deadline ? new Date(values.deadline).toISOString() : undefined };
      await addTaskContext(dialogState.grandParentId, dialogState.parentId, taskData);
      toast({ title: "Tâche ajoutée", description: `La tâche "${values.name}" a été ajoutée.` });
    }
    closeDialog();
  };

  const handleEditTask = async (values: TaskFormValues) => {
    if (dialogState.grandParentId && dialogState.parentId && dialogState.data?.id) {
      const taskData = { ...values, deadline: values.deadline ? new Date(values.deadline).toISOString() : undefined };
      await editTaskContext(dialogState.grandParentId, dialogState.parentId, dialogState.data.id, taskData);
      toast({ title: "Tâche modifiée", description: `La tâche "${values.name}" a été modifiée.` });
    }
    closeDialog();
  };

  const onSubmitTask = (values: TaskFormValues) => {
    if (dialogState.mode === 'add') {
      handleAddTask(values);
    } else {
      handleEditTask(values);
    }
  };

  const handleRemoveTask = async (categoryId: string, subCategoryId: string, taskId: string) => {
    await removeTaskContext(categoryId, subCategoryId, taskId);
    toast({ title: "Tâche supprimée", description: `La tâche a été supprimée.` });
  };

  const handleToggleTaskCompletion = async (categoryId: string, subCategoryId: string, taskId: string, completed: boolean) => {
    await updateTaskCompletion(categoryId, subCategoryId, taskId, completed);
    toast({
      title: "Statut de la tâche modifié",
    });
  };

  const getLinkedDocuments = (task: ComplianceTask): Document[] => {
    if (!task.documentIds || task.documentIds.length === 0) return [];
    return documents.filter(doc => task.documentIds!.includes(doc.id));
  };


  if (loading || docsLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Logo className="h-12 w-12 animate-spin" />
        <p className="ml-4 text-lg text-muted-foreground">Chargement du plan de conformité...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PlanHeader onAddCategory={() => openDialog("category", "add")} />

      <div className="space-y-6">
        {planData.length > 0 ? planData.map((category: ComplianceCategory) => {
          const Icon = getIconComponent(category.icon);
          const isProcessCategory = category.name === "Processus Métiers Clés";
          return (
            <Card key={category.id} id={category.id} className="shadow-md overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-muted/30 group">
                <div className="flex items-center space-x-3">
                  <Icon className="h-6 w-6 text-primary" />
                  <span className="text-xl font-headline font-medium">{category.name}</span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <AlertDialog>
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
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette catégorie ?</AlertDialogTitle>
                        <AlertDialogDescription>Cette action est irréversible et supprimera "{category.name}" et toutes ses sous-catégories et tâches.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRemoveCategory(category.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {category.subCategories.map((subCategory: ComplianceSubCategory) => {
                    const SubIcon = getIconComponent(subCategory.icon);
                    if (isProcessCategory) {
                      return (
                        <Card key={subCategory.id} className="bg-background/50 shadow-sm overflow-hidden group hover:shadow-lg transition-all duration-300">
                          <CardContent className="p-6">
                            <div className="bg-gradient-to-br from-[#FFF9E6] to-[#FFF4D6] dark:from-[#2D2618] dark:to-[#3D3520] border-2 border-[#D4B896] dark:border-[#8B7355] rounded-xl p-6 shadow-inner space-y-6">
                              {/* Titre du processus */}
                              <div className="text-center border-b-2 border-[#D4B896]/50 dark:border-[#8B7355]/50 pb-3">
                                <div className="flex items-center justify-center gap-2">
                                  <SubIcon className="h-6 w-6 text-[#8B6914] dark:text-[#D4B896]" />
                                  <h3 className="text-xl font-semibold font-headline text-[#5D4E37] dark:text-[#D4B896]">{subCategory.name}</h3>
                                </div>
                              </div>
                              {/* Diagramme de flux */}
                              <FlowRenderer
                                tasks={subCategory.tasks}
                                onToggleTask={handleToggleTaskCompletion}
                                categoryId={category.id}
                                subCategoryId={subCategory.id}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      )
                    }
                    return (
                      <Card key={subCategory.id} className="bg-background/50 shadow-sm group">
                        <CardHeader className="pb-3 pt-4 px-4 flex flex-row justify-between items-center">
                          <div className="flex items-center">
                            <SubIcon className="h-5 w-5 mr-2 text-accent" />
                            <CardTitle className="text-lg font-medium font-headline">{subCategory.name}</CardTitle>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <AlertDialog>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openDialog("subCategory", "edit", subCategory, category.id, category.id)}><Edit2 className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                                  <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem></AlertDialogTrigger>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette sous-catégorie ?</AlertDialogTitle>
                                  <AlertDialogDescription>Cette action est irréversible et supprimera "{subCategory.name}" et toutes ses tâches.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRemoveSubCategory(category.id, subCategory.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                          <ul className="space-y-3 list-inside">
                            {subCategory.tasks.map((task: ComplianceTask) => {
                              const linkedDocs = getLinkedDocuments(task);
                              return (
                                <li key={task.id} className="flex items-start text-sm text-muted-foreground group/task relative pr-10">
                                  <Checkbox id={`task-${task.id}`} checked={task.completed} onCheckedChange={() => handleToggleTaskCompletion(category.id, subCategory.id, task.id, !task.completed)} className="mr-2.5 mt-1 flex-shrink-0 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" aria-labelledby={`task-label-${task.id}`} />
                                  <label htmlFor={`task-${task.id}`} id={`task-label-${task.id}`} className="cursor-pointer flex-grow">
                                    <div>
                                      <span className={`${task.completed ? 'line-through text-muted-foreground/70' : ''} ${isClient && isTaskOverdue(task) ? "text-destructive font-medium" : "text-foreground"}`}>{task.name}</span>
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
                                    <AlertDialog>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" side="left">
                                          <DropdownMenuItem onClick={() => openDialog("task", "edit", task, subCategory.id, category.id)}><Edit2 className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                                          <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem></AlertDialogTrigger>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                      <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette tâche ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible et supprimera la tâche "{task.name}".</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveTask(category.id, subCategory.id, task.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
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
                  })}
                  <Button variant="default" className="mt-4" onClick={() => openDialog("subCategory", "add", undefined, category.id, category.id)}>
                    <PlusCircle className="mr-2 h-5 w-5" /> Ajouter une sous-catégorie
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
          : (
            <Card className="text-center p-8 border-dashed shadow-none">
              <CardHeader className="p-0">
                <CardTitle className="text-xl font-medium">Aucun plan de conformité défini</CardTitle>
                <CardDescription className="mt-2">Commencez par ajouter votre première catégorie pour construire votre plan.</CardDescription>
              </CardHeader>
            </Card>
          )}
      </div>

      <PlanDialogs
        dialogState={dialogState}
        closeDialog={closeDialog}
        onSubmitCategory={onSubmitCategory}
        onSubmitSubCategory={onSubmitSubCategory}
        onSubmitTask={onSubmitTask}
      />
    </div>
  );
}
