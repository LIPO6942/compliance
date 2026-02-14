
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { PlusCircle, Edit2, Trash2, MoreVertical, Clock, Link as LinkIcon, FileText, ArrowDown, ArrowUp, ShieldAlert } from "lucide-react";
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

const flowTypeStyles: Record<string, string> = {
  start: 'bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-400 dark:text-emerald-50 shadow-[0_4px_12px_rgba(16,185,129,0.15)]',
  end: 'bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-400 dark:text-emerald-50 shadow-[0_4px_12px_rgba(16,185,129,0.15)]',
  process: 'bg-blue-50 border-blue-400 text-blue-800 dark:bg-blue-900/40 dark:border-blue-400 dark:text-blue-50 shadow-[0_4px_12px_rgba(59,130,246,0.15)]',
  decision: 'bg-[#FFFBEB] border-[#F59E0B] text-[#92400E] dark:bg-amber-900/40 dark:border-amber-500 dark:text-amber-50 shadow-[0_4px_12px_rgba(245,158,11,0.12)]',
  action: 'bg-orange-50 border-orange-400 text-orange-800 dark:bg-orange-900/40 dark:border-orange-400 dark:text-orange-50 shadow-[0_4px_12px_rgba(249,115,22,0.15)]',
  alert: 'bg-rose-50 border-rose-400 text-rose-800 dark:bg-rose-900/40 dark:border-rose-400 dark:text-rose-50 shadow-[0_4px_12px_rgba(244,63,94,0.15)]',
  urgent: 'bg-red-50 border-red-500 text-red-800 font-bold border-2 animate-pulse dark:bg-red-900/50 dark:border-red-400 dark:text-red-50 shadow-[0_0_20px_rgba(239,68,68,0.3)]',
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
            "w-[120px] h-[120px] border-2 cursor-pointer transition-all duration-300 relative",
            "group-hover:shadow-lg group-hover:scale-[1.05] group-active:scale-95",
            styleClass,
            task.completed && "opacity-50 grayscale-[0.3]"
          )}
          style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
          onClick={onToggle}
          onDoubleClick={() => onEdit && onEdit(task)}
        >
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <span
              className={cn(
                "text-[10px] sm:text-[12px] font-bold text-center leading-tight tracking-tight",
                task.completed && "line-through"
              )}
            >
              {task.name}
            </span>
          </div>
        </div>
        <div className="absolute top-1 right-1 p-1.5 bg-white dark:bg-slate-800 rounded-full border shadow-md z-30 transform group-hover:scale-110 transition-transform">
          <Checkbox checked={task.completed} className="h-4 w-4 border-primary text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-[180px] sm:w-[220px] min-h-[56px] p-4 text-xs sm:text-sm font-bold text-center border-2 cursor-pointer transition-all duration-300 flex items-center justify-center group/card",
        "shadow-sm hover:shadow-lg hover:scale-[1.02] active:scale-95",
        isStartEnd ? "rounded-full px-8" : "rounded-2xl",
        styleClass,
        task.completed && "opacity-50 grayscale-[0.3]"
      )}
      onClick={onToggle}
      onDoubleClick={() => onEdit && onEdit(task)}
    >
      <div className="absolute -top-2 -right-2 p-1.5 bg-white dark:bg-slate-800 rounded-full border shadow-md z-30 opacity-0 group-hover/card:opacity-100 transition-all duration-300 transform group-hover/card:scale-110">
        <Checkbox checked={task.completed} className="h-4 w-4 border-primary text-primary" />
      </div>
      {task.completed && (
        <div className="absolute -top-1 -left-1">
          <LucideIcons.CheckCircle2 className="h-6 w-6 text-emerald-500 fill-white dark:fill-slate-900" />
        </div>
      )}
      <span className={cn("px-2 leading-tight", task.completed && "line-through opacity-70")}>{task.name}</span>
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
  const colorClass = active ? "stroke-primary" : "stroke-slate-400 dark:stroke-slate-500";
  const arrowClass = active ? "fill-primary" : "fill-slate-400 dark:fill-slate-500";
  const badgeClass = label === 'Oui' || label === 'Normal' ? "bg-emerald-500 text-white border-none shadow-sm" :
    label === 'Non' || label === 'Inhabituel' ? "bg-rose-500 text-white border-none shadow-sm" :
      "bg-primary text-white border-none shadow-sm";

  if (variant === 'side-right') {
    return (
      <div className="relative absolute left-1/2 top-1/2 -translate-y-1/2 flex items-center" style={{ width: '120px' }}>
        <svg width="80" height="24" className="overflow-visible">
          <defs>
            <marker id="arrowhead-right" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orientation="auto">
              <polygon points="0 0, 10 3.5, 0 7" className={arrowClass} />
            </marker>
          </defs>
          <path d="M 0 12 L 70 12" className={cn(colorClass, "stroke-2")} fill="none" markerEnd="url(#arrowhead-right)" />
        </svg>
        {label && (
          <Badge className={cn("absolute left-4 -top-3 scale-90 px-2 py-0.5 font-bold rounded-md", badgeClass)} variant="default">
            {label}
          </Badge>
        )}
        <div className="absolute right-[-40px] top-[-10px] hidden group-hover/connector:flex gap-1 z-40 bg-white/80 dark:bg-slate-800/80 p-1 rounded-lg backdrop-blur-sm border shadow-sm">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onAddBranch && onAddBranch()} title="Ajouter une branche"><PlusCircle className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onAddTask && onAddTask()} title="Ajouter tâche cible"><Edit2 className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onRename && onRename()} title="Renommer la branche"><ArrowDown className="h-4 w-4" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-5 relative min-h-[50px] group/connector">
      <svg width="24" height="50" className="overflow-visible">
        <defs>
          <marker id="arrowhead-down" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orientation="90">
            <polygon points="0 0, 10 3.5, 0 7" className={arrowClass} />
          </marker>
        </defs>
        <path d="M 12 0 L 12 40" className={cn(colorClass, "stroke-2")} fill="none" markerEnd="url(#arrowhead-down)" />
      </svg>
      {label && (
        <Badge className={cn("absolute top-1/2 -translate-y-1/2 z-10 scale-90 px-2 py-0.5 font-bold rounded-md", badgeClass)} variant="default">
          {label}
        </Badge>
      )}
      <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 hidden group-hover/connector:flex gap-1 z-40 bg-white/80 dark:bg-slate-800/80 p-1 rounded-lg backdrop-blur-sm border shadow-sm">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onAddBranch && onAddBranch()} title="Ajouter une branche"><PlusCircle className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onAddTask && onAddTask()} title="Ajouter tâche cible"><Edit2 className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onRename && onRename()} title="Renommer la branche"><ArrowDown className="h-4 w-4" /></Button>
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
    editCategory,
    removeCategory,
    addSubCategory,
    editSubCategory,
    removeSubCategory,
    addTask,
    editTask,
    removeTask,
    addBranch,
    removeBranch,
    renameBranch,
    addTaskToBranch,
    activeWorkflows,
    deleteWorkflow,
    updateWorkflowOrder
  } = usePlanData();
  const router = useRouter();
  const { documents, loading: docsLoading } = useDocuments();
  const { risks: allRisks } = useRiskMapping();

  // Helper: get highest risk level for a task
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

  const handleMoveWorkflow = async (id: string, direction: number) => {
    const sortedWorkflows = Object.entries(activeWorkflows).sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0));
    const index = sortedWorkflows.findIndex(([wfId]) => wfId === id);
    if (index === -1) return;

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sortedWorkflows.length) return;

    // Swap orders
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

  const handleAddCategory = async (values: CategoryFormValues) => {
    await addCategory(values);
    toast({ title: "Catégorie ajoutée", description: `La catégorie "${values.name}" a été ajoutée.` });
    closeDialog();
  };

  const handleEditCategory = async (values: CategoryFormValues) => {
    if (dialogState.data?.id) {
      await editCategory(dialogState.data.id, values);
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
    await removeCategory(categoryId);
    toast({ title: "Catégorie supprimée", description: `La catégorie a été supprimée.` });
  };

  const handleAddSubCategory = async (values: SubCategoryFormValues) => {
    if (dialogState.parentId) {
      await addSubCategory(dialogState.parentId, values);
      toast({ title: "Sous-catégorie ajoutée", description: `La sous-catégorie "${values.name}" a été ajoutée.` });
    }
    closeDialog();
  };

  const handleEditSubCategory = async (values: SubCategoryFormValues) => {
    if (dialogState.grandParentId && dialogState.data?.id) {
      await editSubCategory(dialogState.grandParentId, dialogState.data.id, values);
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
    await removeSubCategory(categoryId, subCategoryId);
    toast({ title: "Sous-catégorie supprimée", description: `La sous-catégorie a été supprimée.` });
  };

  const handleAddTask = async (values: TaskFormValues) => {
    if (dialogState.grandParentId && dialogState.parentId) {
      const branchObjs = (values.branches || []).map(label => ({ label, tasks: [] }));
      const taskData = {
        ...values,
        deadline: values.deadline ? new Date(values.deadline).toISOString() : undefined,
        branches: branchObjs,
        kpi: values.kpi?.name ? {
          name: values.kpi.name,
          target: values.kpi.target || '',
          unit: values.kpi.unit || '',
          thresholdAlert: values.kpi.thresholdAlert
        } : undefined
      };
      await addTask(dialogState.grandParentId, dialogState.parentId, taskData);
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
      const taskData = {
        ...values,
        deadline: values.deadline ? new Date(values.deadline).toISOString() : undefined,
        branches: branchObjs,
        kpi: values.kpi?.name ? {
          name: values.kpi.name,
          target: values.kpi.target || '',
          unit: values.kpi.unit || '',
          thresholdAlert: values.kpi.thresholdAlert
        } : undefined
      };
      await editTask(dialogState.grandParentId, dialogState.parentId, dialogState.data.id, taskData);
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
    await removeTask(categoryId, subCategoryId, taskId);
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


  // Fusionner les workflows actifs dans les données du plan pour l'affichage
  const displayPlanData = React.useMemo(() => {
    if (!planData) return [];
    // Copie profonde pour éviter de muter l'état
    const newPlan = JSON.parse(JSON.stringify(planData));

    const activeIds = Object.keys(activeWorkflows);
    if (activeIds.length > 0) {
      let processCat = newPlan.find((c: any) => c.name === "Processus Métiers Clés" || c.name === "Processus Métiers");

      if (!processCat) {
        processCat = {
          id: 'processus-metiers',
          name: 'Processus Métiers Clés',
          icon: 'Workflow',
          subCategories: []
        };
        newPlan.push(processCat);
      }

      const existingSubIds = processCat.subCategories.map((s: any) => s.id);
      activeIds.forEach(id => {
        if (!existingSubIds.includes(id)) {
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

  return (
    <div className="space-y-6">
      <PlanHeader onAddCategory={() => openDialog("category", "add")} />

      <div className="space-y-6">
        {displayPlanData.length > 0 ? displayPlanData.map((category: ComplianceCategory) => {
          const Icon = getIconComponent(category.icon);
          const isProcessCategory = category.name === "Processus Métiers Clés";
          return (
            <Card key={category.id} id={category.id} className="shadow-md overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-muted/30 group">
                <div className="flex items-center space-x-3">
                  <Icon className="h-6 w-6 text-primary" />
                  <span className="text-xl font-headline font-medium">{category.name}</span>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isProcessCategory && (
                    <Button variant="ghost" size="icon" onClick={() => router.push('/admin/workflows/new')} title="Créer un processus" className="h-8 w-8 hover:bg-emerald-50">
                      <PlusCircle className="h-5 w-5 text-emerald-600" />
                    </Button>
                  )}
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
                  {(() => {
                    const isProcessCategory = category.name === "Processus Métiers Clés" || category.name === "Processus Métiers";

                    // Fusionner les sous-catégories existantes avec les workflows dynamiques
                    let subCategoriesToRender = [...category.subCategories];

                    if (isProcessCategory) {
                      const existingIds = subCategoriesToRender.map(s => s.id);
                      const missingWorkflowIds = Object.keys(activeWorkflows).filter(id => !existingIds.includes(id));

                      missingWorkflowIds.forEach(wfId => {
                        subCategoriesToRender.push({
                          id: wfId,
                          name: activeWorkflows[wfId].name || wfId,
                          tasks: [],
                          icon: 'Workflow'
                        });
                      });

                      // Tri des sous-catégories/workflows selon l'ordre défini
                      subCategoriesToRender.sort((a, b) => {
                        const orderA = activeWorkflows[a.id]?.order ?? 999;
                        const orderB = activeWorkflows[b.id]?.order ?? 999;
                        return orderA - orderB;
                      });
                    }

                    return subCategoriesToRender.map((subCategory: ComplianceSubCategory) => {
                      const SubIcon = getIconComponent(subCategory.icon);
                      const activeWorkflow = activeWorkflows[subCategory.id];

                      if (isProcessCategory) {
                        return (
                          <Card key={subCategory.id} id={subCategory.id} className="bg-background/50 shadow-sm overflow-hidden group hover:shadow-lg transition-all duration-300 relative">
                            <CardContent className="p-6">
                              <div className="bg-gradient-to-br from-[#FFF9E6] to-[#FFF4D6] dark:from-[#2D2618] dark:to-[#3D3520] border-2 border-[#D4B896] dark:border-[#8B7355] rounded-xl p-6 shadow-inner space-y-6 relative">

                                {/* Menu Actions (Absolute top-right) */}
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

                                {/* Titre du processus */}
                                <div className="text-center border-b-2 border-[#D4B896]/50 dark:border-[#8B7355]/50 pb-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <SubIcon className="h-6 w-6 text-[#8B6914] dark:text-[#D4B896]" />
                                    <h3 className="text-xl font-semibold font-headline text-[#5D4E37] dark:text-[#D4B896]">{subCategory.name}</h3>
                                  </div>
                                </div>
                                {/* Diagramme de flux */}
                                {activeWorkflow ? (
                                  <div className="py-4">
                                    <MermaidRenderer
                                      chart={activeWorkflow.code}
                                      workflowId={subCategory.id}
                                      onEditTask={(task: any) => openDialog("task", "edit", task, task.subCategoryId || subCategory.id, task.categoryId || category.id)}
                                    />
                                  </div>
                                ) : (
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
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      }
                      return (
                        <Card key={subCategory.id} id={subCategory.id} className="bg-background/50 shadow-sm group">
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
                                const taskRiskLevel = getTaskRiskLevel(task);
                                const riskStyle = taskRiskLevel ? riskBadgeStyles[taskRiskLevel] : null;
                                return (
                                  <li key={task.id} className="flex items-start text-sm text-muted-foreground group/task relative pr-10">
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
                    })
                  })()}
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
