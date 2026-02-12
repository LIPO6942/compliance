
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
import ConnectorDialog from "@/components/plan/ConnectorDialog";
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
  start: 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-400 dark:text-emerald-100 shadow-emerald-100',
  end: 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-400 dark:text-emerald-100 shadow-emerald-100',
  process: 'bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-100 shadow-blue-100',
  decision: 'bg-amber-50 border-amber-400 text-amber-800 dark:bg-amber-900/30 dark:border-amber-400 dark:text-amber-100 shadow-amber-100',
  action: 'bg-orange-50 border-orange-400 text-orange-700 dark:bg-orange-900/30 dark:border-orange-400 dark:text-orange-100 shadow-orange-100',
  alert: 'bg-rose-50 border-rose-400 text-rose-700 dark:bg-rose-900/30 dark:border-rose-400 dark:text-rose-100 shadow-rose-100',
  urgent: 'bg-red-50 border-red-500 text-red-700 font-bold border-2 animate-pulse dark:bg-red-900/40 dark:border-red-400 dark:text-red-100 shadow-red-200',
};

const FlowStep = ({ task, onToggle, onEdit }: { task: ComplianceTask; onToggle: () => void; onEdit?: (task: ComplianceTask) => void; }) => {
  const styleClass = flowTypeStyles[task.flow_type || 'process'];
  const isDecision = task.flow_type === 'decision';
  const isStartEnd = task.flow_type === 'start' || task.flow_type === 'end';

  if (isDecision) {
    return (
      <div className="relative flex items-center justify-center p-4 group">
          <div
          className={cn(
            "w-[110px] h-[110px] border-2 cursor-pointer transition-all duration-300 relative",
            "shadow-sm group-hover:shadow-md group-hover:scale-[1.03]",
            styleClass,
            task.completed && "opacity-60 grayscale-[0.2]"
          )}
          style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
          onClick={onToggle}
          onDoubleClick={() => onEdit && onEdit(task)}
        >
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <span
              className={cn(
                "text-[10px] sm:text-[11px] font-bold text-center leading-tight",
                task.completed && "line-through"
              )}
            >
              {task.name}
            </span>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-1 bg-white dark:bg-background rounded-full border shadow-sm z-10">
          <Checkbox checked={task.completed} className="h-3.5 w-3.5 border-primary text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-[180px] sm:w-[220px] min-h-[50px] p-3 text-[11px] sm:text-xs font-bold text-center border-2 cursor-pointer transition-all duration-300 flex items-center justify-center group/card",
        "shadow-sm hover:shadow-md hover:scale-[1.01]",
        isStartEnd ? "rounded-full px-6" : "rounded-xl",
        styleClass,
        task.completed && "opacity-60 grayscale-[0.2]"
      )}
      onClick={onToggle}
      onDoubleClick={() => onEdit && onEdit(task)}
    >
      <div className="absolute top-[-8px] right-2 p-1 bg-white dark:bg-background rounded-full border shadow-sm z-10 opacity-0 group-hover/card:opacity-100 transition-opacity">
        <Checkbox checked={task.completed} className="h-3.5 w-3.5 border-primary text-primary" />
      </div>
      {task.completed && (
        <div className="absolute top-1 right-1">
          <LucideIcons.CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-50" />
        </div>
      )}
      <span className={cn("px-2", task.completed && "line-through opacity-70")}>{task.name}</span>
    </div>
  );
};

const FlowConnector = ({
  label,
  variant = 'vertical',
  active = false
  ,
  onAddBranch,
  onRename,
  onAddTask
}: {
  label?: string;
  variant?: 'vertical' | 'side-right' | 'side-left';
  active?: boolean,
  onAddBranch?: () => void,
  onRename?: () => void,
  onAddTask?: () => void,
}) => {
  const colorClass = active ? "stroke-primary" : "stroke-slate-300 dark:stroke-slate-600";
  const arrowClass = active ? "fill-primary" : "fill-slate-300 dark:fill-slate-600";
  const badgeClass = label === 'Oui' || label === 'Normal' ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
    label === 'Non' || label === 'Inhabituel' ? "bg-rose-100 text-rose-700 border-rose-200" :
      "bg-blue-100 text-blue-700 border-blue-200";

  if (variant === 'side-right') {
    return (
      <div className="relative absolute left-1/2 top-1/2 -translate-y-1/2 flex items-center" style={{ width: '160px' }}>
        <svg width="100" height="20" className="overflow-visible">
          <path d="M 0 10 L 80 10" className={cn(colorClass, "stroke-2")} fill="none" />
          <path d="M 80 5 L 90 10 L 80 15 Z" className={arrowClass} />
        </svg>
        {label && (
          <Badge className={cn("absolute left-4 -top-3 scale-75 whitespace-nowrap", badgeClass)} variant="outline">
            {label}
          </Badge>
        )}
        <div className="absolute right-[-150px] top-[-6px] flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => onAddBranch && onAddBranch()} title="Ajouter une branche"><PlusCircle className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => onAddTask && onAddTask()} title="Ajouter tâche cible"><Edit2 className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => onRename && onRename()} title="Renommer la branche"><ArrowDown className="h-4 w-4" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-4 relative min-h-[40px] group/connector">
      <svg width="20" height="40" className="overflow-visible">
        <path d="M 10 0 L 10 30" className={cn(colorClass, "stroke-2")} fill="none" />
        <path d="M 5 30 L 10 40 L 15 30 Z" className={arrowClass} />
      </svg>
      {label && (
        <Badge className={cn("absolute top-1/2 -translate-y-1/2 z-10 scale-75", badgeClass)} variant="outline">
          {label}
        </Badge>
      )}
      <div className="absolute left-1/2 -translate-x-1/2 top-0 mt-1 hidden group-hover/connector:flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => onAddBranch && onAddBranch()} title="Ajouter une branche"><PlusCircle className="h-4 w-4" /></Button>
        <Button size="sm" variant="ghost" onClick={() => onAddTask && onAddTask()} title="Ajouter tâche cible"><Edit2 className="h-4 w-4" /></Button>
        <Button size="sm" variant="ghost" onClick={() => onRename && onRename()} title="Renommer la branche"><ArrowDown className="h-4 w-4" /></Button>
      </div>
    </div>
  );
};

const FlowRenderer = ({
  tasks,
  onToggleTask,
  onEditTask,
  onAddBranch,
  onRenameBranch,
  onAddTaskToBranch,
  categoryId,
  subCategoryId
}: {
  tasks: ComplianceTask[],
  onToggleTask: (catId: string, subCatId: string, taskId: string, completed: boolean) => void,
  onEditTask?: (task: ComplianceTask) => void,
  onAddBranch?: (taskId: string) => void,
  onRenameBranch?: (taskId: string, branchLabel?: string) => void,
  onAddTaskToBranch?: (taskId: string, branchLabel?: string) => void,
  categoryId: string,
  subCategoryId: string
}) => {
  if (!tasks || tasks.length === 0) return null;

  return (
    <div className="flex flex-col items-center w-full">
      {tasks.map((task, index) => {
        const nextTask = tasks[index + 1];
        const yesBranch = task.branches?.find(b => b.label === 'Oui' || b.label === 'Normal');
        const noBranch = task.branches?.find(b => b.label === 'Non' || b.label === 'Inhabituel');
        const otherBranches = task.branches?.filter(b => !['Oui', 'Non', 'Normal', 'Inhabituel'].includes(b.label || ''));

        const handleToggle = () => onToggleTask(categoryId, subCategoryId, task.id, !task.completed);

        return (
          <React.Fragment key={task.id}>
            <div className="relative flex flex-col items-center w-full">
              <div className="relative z-20">
                <FlowStep task={task} onToggle={handleToggle} onEdit={onEditTask} />
              </div>

              {(yesBranch || noBranch || otherBranches?.length) ? (
                <div className="flex w-full justify-center">
                  {/* MAIN DOWNWARD PATH */}
                  <div className="flex flex-col items-center min-w-[240px]">
                    {noBranch ? (
                      <>
                          <FlowConnector label={noBranch.label} active={task.completed} onAddBranch={() => onAddBranch && onAddBranch(task.id)} onAddTask={() => onAddTaskToBranch && onAddTaskToBranch(task.id, noBranch.label)} onRename={() => onRenameBranch && onRenameBranch(task.id, noBranch.label)} />
                          <FlowRenderer tasks={noBranch.tasks} onToggleTask={onToggleTask} onEditTask={onEditTask} onAddBranch={onAddBranch} onRenameBranch={onRenameBranch} onAddTaskToBranch={onAddTaskToBranch} categoryId={categoryId} subCategoryId={subCategoryId} />
                      </>
                    ) : nextTask ? (
                      <FlowConnector active={task.completed} />
                    ) : null}
                  </div>

                  {/* SIDE PATHS (Right) */}
                  {(yesBranch || (otherBranches && otherBranches.length > 0)) && (
                    <div className="absolute left-[calc(50%+60px)] top-[20px] pt-[20px] flex flex-col gap-8">
                      {yesBranch && (
                        <div className="relative flex items-center">
                          <FlowConnector variant="side-right" label={yesBranch.label} active={task.completed} onAddBranch={() => onAddBranch && onAddBranch(task.id)} onAddTask={() => onAddTaskToBranch && onAddTaskToBranch(task.id, yesBranch.label)} onRename={() => onRenameBranch && onRenameBranch(task.id, yesBranch.label)} />
                          <div className="ml-24">
                            <FlowRenderer tasks={yesBranch.tasks} onToggleTask={onToggleTask} onEditTask={onEditTask} onAddBranch={onAddBranch} onRenameBranch={onRenameBranch} onAddTaskToBranch={onAddTaskToBranch} categoryId={categoryId} subCategoryId={subCategoryId} />
                          </div>
                        </div>
                      )}
                      {otherBranches?.map(branch => (
                        <div key={branch.label} className="relative flex items-center">
                          <FlowConnector variant="side-right" label={branch.label} active={task.completed} onAddBranch={() => onAddBranch && onAddBranch(task.id)} onAddTask={() => onAddTaskToBranch && onAddTaskToBranch(task.id, branch.label)} onRename={() => onRenameBranch && onRenameBranch(task.id, branch.label)} />
                          <div className="ml-24">
                            <FlowRenderer tasks={branch.tasks} onToggleTask={onToggleTask} onEditTask={onEditTask} onAddBranch={onAddBranch} onRenameBranch={onRenameBranch} onAddTaskToBranch={onAddTaskToBranch} categoryId={categoryId} subCategoryId={subCategoryId} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                nextTask && <FlowConnector active={task.completed} />
              )}
            </div>
          </React.Fragment>
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
    addBranch,
    removeBranch,
    renameBranch,
    addTaskToBranch,
  } = usePlanData();
  const { documents, loading: docsLoading } = useDocuments();

  const { toast } = useToast();

  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);


  const [dialogState, setDialogState] = React.useState<DialogState>({ type: null, mode: null });

  const [connectorDialog, setConnectorDialog] = React.useState<{
    open: boolean;
    mode: 'addBranch' | 'renameBranch' | 'addTask' | null;
    categoryId?: string;
    subCategoryId?: string;
    taskId?: string;
    branchLabel?: string;
    value?: string; // for label or new label
    taskName?: string;
  }>({ open: false, mode: null });

  const openConnectorDialog = (mode: 'addBranch' | 'renameBranch' | 'addTask', categoryId: string, subCategoryId: string, taskId: string, branchLabel?: string) => {
    setConnectorDialog({ open: true, mode, categoryId, subCategoryId, taskId, branchLabel, value: branchLabel || '', taskName: '' });
  };

  const closeConnectorDialog = () => setConnectorDialog({ open: false, mode: null });

  const handleConnectorSubmit = async (values: { value: string; taskName?: string }) => {
    try {
      if (!connectorDialog.mode || !connectorDialog.categoryId || !connectorDialog.subCategoryId || !connectorDialog.taskId) return closeConnectorDialog();
      if (connectorDialog.mode === 'addBranch') {
        const label = (values.value || '').trim();
        if (!label) return;
        await addBranch(connectorDialog.categoryId, connectorDialog.subCategoryId, connectorDialog.taskId, label);
        toast({ title: 'Branche ajoutée', description: `Branche "${label}" ajoutée.` });
      }
      if (connectorDialog.mode === 'renameBranch') {
        const oldLabel = connectorDialog.branchLabel;
        const newLabel = (values.value || '').trim();
        if (!oldLabel || !newLabel) return;
        await renameBranch(connectorDialog.categoryId, connectorDialog.subCategoryId, connectorDialog.taskId, oldLabel, newLabel);
        toast({ title: 'Branche renommée', description: `"${oldLabel}" → "${newLabel}"` });
      }
      if (connectorDialog.mode === 'addTask') {
        const label = (connectorDialog.branchLabel || values.value || '').trim();
        const name = (values.taskName || '').trim();
        if (!label || !name) return;
        await addTaskToBranch(connectorDialog.categoryId, connectorDialog.subCategoryId, connectorDialog.taskId, label, { name });
        toast({ title: 'Tâche cible ajoutée', description: `"${name}" ajoutée à la branche ${label}.` });
      }
    } catch (e) {
      console.error(e);
    } finally {
      closeConnectorDialog();
    }
  };

  

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
      const branchObjs = (values.branches || []).map(label => ({ label, tasks: [] }));
      const taskData = { ...values, deadline: values.deadline ? new Date(values.deadline).toISOString() : undefined, branches: branchObjs };
      await addTaskContext(dialogState.grandParentId, dialogState.parentId, taskData);
      toast({ title: "Tâche ajoutée", description: `La tâche "${values.name}" a été ajoutée.` });
    }
    closeDialog();
  };

  const handleEditTask = async (values: TaskFormValues) => {
    if (dialogState.grandParentId && dialogState.parentId && dialogState.data?.id) {
      const existingBranches = dialogState.data?.branches || [];
      const branchObjs = (values.branches || []).map(label => {
        const found = existingBranches.find((b: any) => b.label === label);
        return found ? found : { label, tasks: [] };
      });
      const taskData = { ...values, deadline: values.deadline ? new Date(values.deadline).toISOString() : undefined, branches: branchObjs };
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
                                onEditTask={(task) => openDialog("task", "edit", task, subCategory.id, category.id)}
                                onAddBranch={(taskId: string) => openConnectorDialog('addBranch', category.id, subCategory.id, taskId)}
                                onRenameBranch={(taskId: string, branchLabel?: string) => openConnectorDialog('renameBranch', category.id, subCategory.id, taskId, branchLabel)}
                                onAddTaskToBranch={(taskId: string, branchLabel?: string) => openConnectorDialog('addTask', category.id, subCategory.id, taskId, branchLabel)}
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
      <ConnectorDialog
        open={connectorDialog.open}
        onOpenChange={(isOpen) => !isOpen && closeConnectorDialog()}
        mode={connectorDialog.mode}
        initialValue={connectorDialog.value}
        initialTaskName={connectorDialog.taskName}
        branchLabel={connectorDialog.branchLabel}
        onCancel={closeConnectorDialog}
        onSubmit={handleConnectorSubmit}
      />
    </div>
  );
}
