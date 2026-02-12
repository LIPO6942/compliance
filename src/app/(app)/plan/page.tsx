
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
  start: 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/50 dark:border-green-700 dark:text-green-300',
  end: 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/50 dark:border-green-700 dark:text-green-300',
  process: 'bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-300',
  decision: 'bg-yellow-100 border-yellow-500 text-yellow-800 dark:bg-yellow-900/50 dark:border-yellow-600 dark:text-yellow-300',
  action: 'bg-orange-100 border-orange-500 text-orange-800 dark:bg-orange-900/50 dark:border-orange-600 dark:text-orange-300',
  alert: 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900/50 dark:border-red-700 dark:text-red-300',
  urgent: 'bg-red-200 border-red-700 text-red-900 font-bold dark:bg-red-800/60 dark:border-red-500 dark:text-red-200',
};

const FlowStep = ({ task, onToggle, categoryId, subCategoryId }: { task: ComplianceTask; onToggle: () => void; categoryId: string; subCategoryId: string; }) => {
  const styleClass = flowTypeStyles[task.flow_type || 'process'];
  const isDecision = task.flow_type === 'decision';

  return (
    <div className="w-full flex justify-center group/flow">
      <div
        className={cn(
          "relative w-full max-w-md p-3 text-sm font-medium text-center border-2 rounded-lg shadow-sm cursor-pointer transition-transform hover:scale-105",
          styleClass,
          isDecision && "rounded-xl",
          task.completed && "opacity-60"
        )}
        onClick={onToggle}
      >
        <div className="absolute top-2 left-2">
            <Checkbox checked={task.completed} className="border-current text-current" />
        </div>
        <span className={cn(task.completed && "line-through")}>{task.name}</span>
      </div>
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
    if(dialogState.data?.id) {
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
    if(dialogState.parentId) {
      await addSubCategoryContext(dialogState.parentId, values);
      toast({ title: "Sous-catégorie ajoutée", description: `La sous-catégorie "${values.name}" a été ajoutée.` });
    }
    closeDialog();
  };

  const handleEditSubCategory = async (values: SubCategoryFormValues) => {
    if(dialogState.grandParentId && dialogState.data?.id) {
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
    if(dialogState.grandParentId && dialogState.parentId) {
      const taskData = { ...values, deadline: values.deadline ? new Date(values.deadline).toISOString() : undefined };
      await addTaskContext(dialogState.grandParentId, dialogState.parentId, taskData);
      toast({ title: "Tâche ajoutée", description: `La tâche "${values.name}" a été ajoutée.` });
    }
    closeDialog();
  };
  
  const handleEditTask = async (values: TaskFormValues) => {
     if(dialogState.grandParentId && dialogState.parentId && dialogState.data?.id) {
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

  const handleToggleTaskCompletion = async (categoryId: string, subCategoryId: string, taskId: string) => {
    const task = planData.find(c => c.id === categoryId)?.subCategories.find(sc => sc.id === subCategoryId)?.tasks.find(t => t.id === taskId);
    if (task) {
        await updateTaskCompletion(categoryId, subCategoryId, taskId, !task.completed);
        toast({
            title: "Statut de la tâche modifié",
            description: `La tâche "${task.name}" est maintenant ${!task.completed ? "complétée" : "non complétée"}.`,
        });
    }
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
                                        <Card key={subCategory.id} className="bg-background/50 shadow-sm group">
                                            <CardHeader className="pb-3 pt-4 px-4 flex flex-row justify-between items-center">
                                                <div className="flex items-center">
                                                    <SubIcon className="h-5 w-5 mr-2 text-accent" />
                                                    <CardTitle className="text-lg font-medium font-headline">{subCategory.name}</CardTitle>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="px-4 pb-4">
                                                <div className="flex flex-col items-center w-full space-y-2">
                                                    {subCategory.tasks.map((task, index) => (
                                                        <React.Fragment key={task.id}>
                                                            <FlowStep task={task} onToggle={() => handleToggleTaskCompletion(category.id, subCategory.id, task.id)} categoryId={category.id} subCategoryId={subCategory.id} />
                                                            {index < subCategory.tasks.length - 1 && (
                                                                <ArrowDown className="h-6 w-6 text-muted-foreground" />
                                                            )}
                                                        </React.Fragment>
                                                    ))}
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
                                                <Checkbox id={`task-${task.id}`} checked={task.completed} onCheckedChange={() => handleToggleTaskCompletion(category.id, subCategory.id, task.id)} className="mr-2.5 mt-1 flex-shrink-0 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" aria-labelledby={`task-label-${task.id}`}/>
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
                                                              {doc.name} <LinkIcon className="h-3 w-3 ml-1.5"/>
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
