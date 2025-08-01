
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import * as LucideIcons from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DialogState } from "./types";

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
  Clock: LucideIcons.Clock,
};

const availableIcons = Object.keys(iconMap);
const getIconComponent = (iconName?: string): LucideIcons.LucideIcon => (iconName && iconMap[iconName]) || LucideIcons.ListTodo;

const categorySchema = z.object({ name: z.string().min(1, "Le nom de la catégorie est requis."), icon: z.string().min(1, "L'icône de la catégorie est requise.") });
const subCategorySchema = z.object({ name: z.string().min(1, "Le nom de la sous-catégorie est requis."), icon: z.string().optional() });
const taskSchema = z.object({ name: z.string().min(1, "Le nom de la tâche est requis."), description: z.string().optional(), deadline: z.string().optional() });

type CategoryFormValues = z.infer<typeof categorySchema>;
type SubCategoryFormValues = z.infer<typeof subCategorySchema>;
type TaskFormValues = z.infer<typeof taskSchema>;

interface PlanDialogsProps {
  dialogState: DialogState;
  closeDialog: () => void;
  onSubmitCategory: (values: CategoryFormValues) => void;
  onSubmitSubCategory: (values: SubCategoryFormValues) => void;
  onSubmitTask: (values: TaskFormValues) => void;
}

export function PlanDialogs({ dialogState, closeDialog, onSubmitCategory, onSubmitSubCategory, onSubmitTask }: PlanDialogsProps) {
  const categoryForm = useForm<CategoryFormValues>({ resolver: zodResolver(categorySchema) });
  const subCategoryForm = useForm<SubCategoryFormValues>({ resolver: zodResolver(subCategorySchema) });
  const taskForm = useForm<TaskFormValues>({ resolver: zodResolver(taskSchema) });

  React.useEffect(() => {
    if (dialogState.mode === 'edit' && dialogState.data) {
        if (dialogState.type === 'category') categoryForm.reset(dialogState.data);
        if (dialogState.type === 'subCategory') subCategoryForm.reset(dialogState.data);
        if (dialogState.type === 'task') taskForm.reset({
            name: dialogState.data.name,
            description: dialogState.data.description,
            deadline: dialogState.data.deadline ? new Date(dialogState.data.deadline).toISOString().split('T')[0] : "",
        });
    } else {
        if (dialogState.type === 'category') categoryForm.reset({ name: "", icon: availableIcons[0] });
        if (dialogState.type === 'subCategory') subCategoryForm.reset({ name: "", icon: availableIcons[0] });
        if (dialogState.type === 'task') taskForm.reset({ name: "", description: "", deadline: "" });
    }
  }, [dialogState, categoryForm, subCategoryForm, taskForm]);

  return (
    <Dialog open={!!dialogState.type} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {dialogState.mode === "add" ? "Ajouter" : "Modifier"} {dialogState.type === "category" ? "une catégorie" : dialogState.type === "subCategory" ? "une sous-catégorie" : "une tâche"}
          </DialogTitle>
          <DialogDescription>Remplissez les informations ci-dessous.</DialogDescription>
        </DialogHeader>
        
        {dialogState.type === "category" && (
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit(onSubmitCategory)} className="space-y-4">
              <FormField control={categoryForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom de la catégorie</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={categoryForm.control} name="icon" render={({ field }) => (<FormItem><FormLabel>Icône</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir une icône" /></SelectTrigger></FormControl><SelectContent>{availableIcons.map(iconKey => { const IconComponent = getIconComponent(iconKey); return <SelectItem key={iconKey} value={iconKey}><div className="flex items-center"><IconComponent className="mr-2 h-4 w-4"/> {iconKey}</div></SelectItem>})}</SelectContent></Select><FormMessage /></FormItem>)} />
              <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose><Button type="submit">{dialogState.mode === "add" ? "Ajouter" : "Enregistrer"}</Button></DialogFooter>
            </form>
          </Form>
        )}

        {dialogState.type === "subCategory" && (
          <Form {...subCategoryForm}>
            <form onSubmit={subCategoryForm.handleSubmit(onSubmitSubCategory)} className="space-y-4">
              <FormField control={subCategoryForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom de la sous-catégorie</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
               <FormField control={subCategoryForm.control} name="icon" render={({ field }) => (<FormItem><FormLabel>Icône (Optionnel)</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir une icône" /></SelectTrigger></FormControl><SelectContent>{availableIcons.map(iconKey => { const IconComponent = getIconComponent(iconKey); return <SelectItem key={iconKey} value={iconKey}><div className="flex items-center"><IconComponent className="mr-2 h-4 w-4"/> {iconKey}</div></SelectItem>})}</SelectContent></Select><FormMessage /></FormItem>)} />
              <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose><Button type="submit">{dialogState.mode === "add" ? "Ajouter" : "Enregistrer"}</Button></DialogFooter>
            </form>
          </Form>
        )}

        {dialogState.type === "task" && (
           <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(onSubmitTask)} className="space-y-4">
              <FormField control={taskForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom de la tâche</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={taskForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (Optionnel)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={taskForm.control} name="deadline" render={({ field }) => (<FormItem><FormLabel>Échéance (Optionnel)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose><Button type="submit">{dialogState.mode === "add" ? "Ajouter" : "Enregistrer"}</Button></DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
