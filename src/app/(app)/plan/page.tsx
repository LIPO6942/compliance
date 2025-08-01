"use client";

import * as React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger as ShadcnAccordionTrigger } from "@/components/ui/accordion";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import type { ComplianceCategory, ComplianceSubCategory, ComplianceTask } from "@/types/compliance";
import { usePlanData } from "@/contexts/PlanDataContext";
import { ListTodo, PlusCircle, Edit2, Trash2, MoreVertical, ChevronDown, Clock } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useUser } from "@/contexts/UserContext";

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

const getIconComponent = (iconName?: string): LucideIcons.LucideIcon => {
  if (iconName && iconMap[iconName]) {
    return iconMap[iconName];
  }
  return LucideIcons.ListTodo;
};

const categorySchema = z.object({
  name: z.string().min(1, "Le nom de la catégorie est requis."),
  icon: z.string().min(1, "L'icône de la catégorie est requise."),
});
type CategoryFormValues = z.infer<typeof categorySchema>;

const subCategorySchema = z.object({
  name: z.string().min(1, "Le nom de la sous-catégorie est requis."),
  icon: z.string().optional(),
});
type SubCategoryFormValues = z.infer<typeof subCategorySchema>;

const taskSchema = z.object({
  name: z.string().min(1, "Le nom de la tâche est requis."),
  description: z.string().optional(),
  deadline: z.string().optional(),
});
type TaskFormValues = z.infer<typeof taskSchema>;

const isTaskOverdue = (task: ComplianceTask) => {
  return task.deadline && !task.completed && new Date(task.deadline) < new Date();
};

export default function PlanPage() {
  const { 
    planData, 
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
  const [activeAccordionItems, setActiveAccordionItems] = React.useState<string[]>([]);
  const { toast } = useToast();
  
  const { isLoaded } = useUser();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (planData.length > 0) {
      setActiveAccordionItems(planData.map(cat => cat.id));
    }
  }, [planData]);

  const [dialogState, setDialogState] = React.useState<{
    type: "category" | "subCategory" | "task" | null;
    mode: "add" | "edit" | null;
    data?: any;
    parentId?: string;
    grandParentId?: string;
  }>({ type: null, mode: null });

  const categoryForm = useForm<CategoryFormValues>({ resolver: zodResolver(categorySchema) });
  const subCategoryForm = useForm<SubCategoryFormValues>({ resolver: zodResolver(subCategorySchema) });
  const taskForm = useForm<TaskFormValues>({ resolver: zodResolver(taskSchema) });

  const openDialog = (type: "category" | "subCategory" | "task", mode: "add" | "edit", data?: any, parentId?: string, grandParentId?: string) => {
    setDialogState({ type, mode, data, parentId, grandParentId });
    if (mode === "edit") {
      if (type === "category") categoryForm.reset(data);
      else if (type === "subCategory") subCategoryForm.reset(data);
      else if (type === "task") taskForm.reset({
        name: data.name,
        description: data.description,
        deadline: data.deadline ? new Date(data.deadline).toISOString().split('T')[0] : "",
      });
    } else {
      if (type === "category") categoryForm.reset({ name: "", icon: availableIcons[0] });
      else if (type === "subCategory") subCategoryForm.reset({ name: "", icon: availableIcons[0] });
      else if (type === "task") taskForm.reset({ name: "", description: "", deadline: "" });
    }
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

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <CardTitle className="font-headline text-3xl">Plan d'Organisation de la Conformité</CardTitle>
                    <CardDescription className="text-lg mt-1">
                    Structure complète des tâches et responsabilités.
                    </CardDescription>
                </div>
                <Button onClick={() => openDialog("category", "add")} className="whitespace-nowrap">
                    <PlusCircle className="mr-2 h-5 w-5" /> Catégorie
                </Button>
            </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Ce plan sert de référence pour l'organisation des activités de conformité. Vous pouvez ajouter, modifier ou supprimer des éléments.
          </p>
        </CardContent>
      </Card>

      <Accordion 
        type="multiple" 
        className="w-full space-y-4" 
        value={activeAccordionItems}
        onValueChange={setActiveAccordionItems}
      >
        {planData.length > 0 ? planData.map((category: ComplianceCategory) => {
            const Icon = getIconComponent(category.icon);
            return (
            <AccordionItem key={category.id} value={category.id} id={category.id} className="bg-card border rounded-lg shadow-md overflow-hidden">
               <AccordionPrimitive.Header className="flex items-center px-6 py-4 hover:bg-muted/50 transition-colors group">
                <ShadcnAccordionTrigger className="p-0 hover:no-underline flex-1 [&>svg]:ml-auto">
                  <div className="flex items-center space-x-3">
                    <Icon className="h-6 w-6 text-primary" />
                    <span className="text-xl font-headline font-medium">{category.name}</span>
                  </div>
                </ShadcnAccordionTrigger>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity pl-3">
                  <AlertDialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDialog("category", "edit", category); }}>
                          <Edit2 className="mr-2 h-4 w-4" /> Modifier
                        </DropdownMenuItem>
                        <AlertDialogTrigger asChild>
                           <DropdownMenuItem 
                            onSelect={(e) => e.preventDefault()} 
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette catégorie ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible et supprimera "{category.name}" et toutes ses sous-catégories et tâches.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleRemoveCategory(category.id); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </AccordionPrimitive.Header>
              <AccordionContent className="px-6 pt-0 pb-6">
                <div className="space-y-4 mt-4">
                  {category.subCategories.map((subCategory: ComplianceSubCategory) => {
                     const SubIcon = getIconComponent(subCategory.icon);
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
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDialog("subCategory", "edit", subCategory, category.id, category.id);}}>
                                <Edit2 className="mr-2 h-4 w-4" /> Modifier
                              </DropdownMenuItem>
                               <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>
                           <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette sous-catégorie ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible et supprimera "{subCategory.name}" et toutes ses tâches.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleRemoveSubCategory(category.id, subCategory.id);}} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <ul className="space-y-3 list-inside">
                          {subCategory.tasks.map((task: ComplianceTask) => (
                            <li key={task.id} className="flex items-start text-sm text-muted-foreground group/task relative pr-10">
                               <Checkbox
                                id={`task-${task.id}`}
                                checked={task.completed}
                                onCheckedChange={() => handleToggleTaskCompletion(category.id, subCategory.id, task.id)}
                                className="mr-2.5 mt-1 flex-shrink-0 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                aria-labelledby={`task-label-${task.id}`}
                              />
                              <label htmlFor={`task-${task.id}`} id={`task-label-${task.id}`} className="cursor-pointer flex-grow">
                                <div>
                                  <span className={`${task.completed ? 'line-through text-muted-foreground/70' : ''} ${isClient && isTaskOverdue(task) ? "text-destructive font-medium" : "text-foreground"}`}>
                                    {task.name}
                                  </span>
                                  {task.description && <span className="text-xs text-muted-foreground italic"> - {task.description}</span>}
                                </div>
                                {task.deadline && (
                                  isClient ? (
                                    <div className={`text-xs mt-0.5 flex items-center ${isTaskOverdue(task) ? 'text-destructive' : 'text-muted-foreground'}`}>
                                      <Clock className="h-3 w-3 mr-1" />
                                      <span>Échéance: {format(parseISO(task.deadline), 'dd/MM/yyyy', { locale: fr })}</span>
                                    </div>
                                  ) : (
                                    <div className="text-xs mt-0.5 flex items-center text-muted-foreground">
                                      <Clock className="h-3 w-3 mr-1" />
                                      <span>Échéance: ...</span>
                                    </div>
                                  )
                                )}
                              </label>
                               <div className="absolute right-0 top-0 opacity-0 group-hover/task:opacity-100 transition-opacity">
                                 <AlertDialog>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" side="left">
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDialog("task", "edit", task, subCategory.id, category.id);}}>
                                        <Edit2 className="mr-2 h-4 w-4" /> Modifier
                                      </DropdownMenuItem>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem 
                                          onSelect={(e) => e.preventDefault()} 
                                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                        </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette tâche ?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Cette action est irréversible et supprimera la tâche "{task.name}".
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Annuler</AlertDialogCancel>
                                      <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleRemoveTask(category.id, subCategory.id, task.id);}} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Supprimer
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </li>
                          ))}
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
              </AccordionContent>
            </AccordionItem>
          )})
        ) : (
             <Card className="text-center p-8 border-dashed shadow-none">
                <CardTitle className="text-xl font-medium">Aucun plan de conformité défini</CardTitle>
                <CardDescription className="mt-2">Commencez par ajouter votre première catégorie pour construire votre plan.</CardDescription>
            </Card>
          )}
      </Accordion>

      <Dialog open={!!dialogState.type} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState.mode === "add" ? "Ajouter" : "Modifier"} {dialogState.type === "category" ? "une catégorie" : dialogState.type === "subCategory" ? "une sous-catégorie" : "une tâche"}
            </DialogTitle>
            <DialogDescription>
              Remplissez les informations ci-dessous.
            </DialogDescription>
          </DialogHeader>
          
          {dialogState.type === "category" && (
            <Form {...categoryForm}>
              <form onSubmit={categoryForm.handleSubmit(dialogState.mode === "add" ? handleAddCategory : handleEditCategory)} className="space-y-4">
                <FormField control={categoryForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de la catégorie</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={categoryForm.control} name="icon" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icône</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Choisir une icône" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {availableIcons.map(iconKey => {
                           const IconComponent = getIconComponent(iconKey);
                           return <SelectItem key={iconKey} value={iconKey}><div className="flex items-center"><IconComponent className="mr-2 h-4 w-4"/> {iconKey}</div></SelectItem>
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose>
                  <Button type="submit">{dialogState.mode === "add" ? "Ajouter" : "Enregistrer"}</Button>
                </DialogFooter>
              </form>
            </Form>
          )}

          {dialogState.type === "subCategory" && (
            <Form {...subCategoryForm}>
              <form onSubmit={subCategoryForm.handleSubmit(dialogState.mode === "add" ? handleAddSubCategory : handleEditSubCategory)} className="space-y-4">
                <FormField control={subCategoryForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de la sous-catégorie</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={subCategoryForm.control} name="icon" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icône (Optionnel)</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Choisir une icône" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {availableIcons.map(iconKey => {
                           const IconComponent = getIconComponent(iconKey);
                           return <SelectItem key={iconKey} value={iconKey}><div className="flex items-center"><IconComponent className="mr-2 h-4 w-4"/> {iconKey}</div></SelectItem>
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose>
                  <Button type="submit">{dialogState.mode === "add" ? "Ajouter" : "Enregistrer"}</Button>
                </DialogFooter>
              </form>
            </Form>
          )}

          {dialogState.type === "task" && (
             <Form {...taskForm}>
              <form onSubmit={taskForm.handleSubmit(dialogState.mode === "add" ? handleAddTask : handleEditTask)} className="space-y-4">
                <FormField control={taskForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de la tâche</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={taskForm.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optionnel)</FormLabel>
                    <FormControl><Textarea {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={taskForm.control} name="deadline" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Échéance (Optionnel)</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose>
                  <Button type="submit">{dialogState.mode === "add" ? "Ajouter" : "Enregistrer"}</Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
