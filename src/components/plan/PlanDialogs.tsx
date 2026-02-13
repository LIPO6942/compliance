
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import * as LucideIcons from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DialogState } from "./types";
import { useDocuments } from "@/contexts/DocumentsContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronsUpDown, X, User, Shield, Zap, FileText, Activity, Workflow, CheckCircle2 } from "lucide-react";
import { usePlanData } from "@/contexts/PlanDataContext";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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

const availableIcons = Object.keys(iconMap);
const getIconComponent = (iconName?: string): LucideIcons.LucideIcon => (iconName && iconMap[iconName]) || LucideIcons.ListTodo;

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
  grcWorkflowId: z.string().optional(),
  grcNodeId: z.string().optional(),
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
  const { availableUsers } = usePlanData();
  const { documents } = useDocuments();
  const [branchInput, setBranchInput] = React.useState("");

  React.useEffect(() => {
    if (dialogState.mode === 'edit' && dialogState.data) {
      if (dialogState.type === 'category') categoryForm.reset(dialogState.data);
      if (dialogState.type === 'subCategory') subCategoryForm.reset(dialogState.data);
      if (dialogState.type === 'task') taskForm.reset({
        ...dialogState.data,
        deadline: dialogState.data.deadline ? new Date(dialogState.data.deadline).toISOString().split('T')[0] : "",
        lastReviewDate: dialogState.data.lastReviewDate ? new Date(dialogState.data.lastReviewDate).toISOString().split('T')[0] : "",
        nextReviewDate: dialogState.data.nextReviewDate ? new Date(dialogState.data.nextReviewDate).toISOString().split('T')[0] : "",
        documentIds: dialogState.data.documentIds || [],
        branches: dialogState.data.branches ? dialogState.data.branches.map((b: any) => b.label) : [],
        raci: dialogState.data.raci || { responsible: "", accountable: "", consulted: [], informed: [] },
        processes: dialogState.data.processes || [],
        risks: dialogState.data.risks || [],
        controls: dialogState.data.controls || [],
        grcWorkflowId: dialogState.data.grcWorkflowId || "",
        grcNodeId: dialogState.data.grcNodeId || "",
        frequency: dialogState.data.frequency || "one_time",
        kpi: dialogState.data.kpi || { name: "", target: "", unit: "", thresholdAlert: 0 },
      });
    } else {
      if (dialogState.type === 'category') categoryForm.reset({ name: "", icon: availableIcons[0] });
      if (dialogState.type === 'subCategory') subCategoryForm.reset({ name: "", icon: availableIcons[0] });
      if (dialogState.type === 'task') taskForm.reset({
        name: "",
        description: "",
        deadline: "",
        documentIds: [],
        branches: [],
        raci: { responsible: "", accountable: "", consulted: [], informed: [] },
        processes: [],
        risks: [],
        controls: [],
        grcWorkflowId: "",
        grcNodeId: "",
        frequency: "one_time",
        kpi: { name: "", target: "", unit: "", thresholdAlert: 0 },
      });
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
              <FormField control={categoryForm.control} name="icon" render={({ field }) => (<FormItem><FormLabel>Icône</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir une icône" /></SelectTrigger></FormControl><SelectContent>{availableIcons.map(iconKey => { const IconComponent = getIconComponent(iconKey); return <SelectItem key={iconKey} value={iconKey}><div className="flex items-center"><IconComponent className="mr-2 h-4 w-4" /> {iconKey}</div></SelectItem> })}</SelectContent></Select><FormMessage /></FormItem>)} />
              <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose><Button type="submit">{dialogState.mode === "add" ? "Ajouter" : "Enregistrer"}</Button></DialogFooter>
            </form>
          </Form>
        )}

        {dialogState.type === "subCategory" && (
          <Form {...subCategoryForm}>
            <form onSubmit={subCategoryForm.handleSubmit(onSubmitSubCategory)} className="space-y-4">
              <FormField control={subCategoryForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom de la sous-catégorie</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={subCategoryForm.control} name="icon" render={({ field }) => (<FormItem><FormLabel>Icône (Optionnel)</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir une icône" /></SelectTrigger></FormControl><SelectContent>{availableIcons.map(iconKey => { const IconComponent = getIconComponent(iconKey); return <SelectItem key={iconKey} value={iconKey}><div className="flex items-center"><IconComponent className="mr-2 h-4 w-4" /> {iconKey}</div></SelectItem> })}</SelectContent></Select><FormMessage /></FormItem>)} />
              <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose><Button type="submit">{dialogState.mode === "add" ? "Ajouter" : "Enregistrer"}</Button></DialogFooter>
            </form>
          </Form>
        )}

        {dialogState.type === "task" && (
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(onSubmitTask)} className="space-y-4">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="general">Général</TabsTrigger>
                  <TabsTrigger value="raci">RACI</TabsTrigger>
                  <TabsTrigger value="links">Liens</TabsTrigger>
                  <TabsTrigger value="kpi">Suivi/KPI</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4 pt-4">
                  <FormField control={taskForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom de la tâche</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={taskForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (Optionnel)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={taskForm.control} name="deadline" render={({ field }) => (<FormItem><FormLabel>Échéance (Optionnel)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />

                  <FormField
                    control={taskForm.control}
                    name="documentIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Documents Liés (Optionnel)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between h-auto min-h-10",
                                  !field.value?.length && "text-muted-foreground"
                                )}
                              >
                                <div className="flex gap-1 flex-wrap">
                                  {field.value && field.value.length > 0
                                    ? documents
                                      .filter((doc) => field.value?.includes(doc.id))
                                      .map((doc) => <Badge key={doc.id} variant="secondary">{doc.name}</Badge>)
                                    : "Sélectionner des documents"}
                                </div>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <ScrollArea className="h-48">
                              <div className="p-2 space-y-1">
                                {documents.map((doc) => {
                                  const isSelected = field.value?.includes(doc.id) ?? false;
                                  return (
                                    <div
                                      key={doc.id}
                                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                                      onClick={() => {
                                        const selectedDocs = field.value || [];
                                        const newSelectedDocs = isSelected
                                          ? selectedDocs.filter((id: string) => id !== doc.id)
                                          : [...selectedDocs, doc.id];
                                        field.onChange(newSelectedDocs);
                                      }}
                                    >
                                      <Checkbox
                                        id={`doc-${doc.id}`}
                                        checked={isSelected}
                                      />
                                      <label htmlFor={`doc-${doc.id}`} className="text-sm font-medium leading-none cursor-pointer">
                                        {doc.name}
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          Liez des preuves documentaires à cette tâche.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="branches"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branches / Liaisons (labels)</FormLabel>
                        <div className="flex gap-2 items-center">
                          <Input placeholder="Ex: Oui, Non" value={branchInput} onChange={(e) => setBranchInput(e.target.value)} />
                          <Button type="button" variant="outline" onClick={() => {
                            const current = field.value || [];
                            const trimmed = (branchInput || '').trim();
                            if (trimmed && !current.includes(trimmed)) {
                              field.onChange([...current, trimmed]);
                              setBranchInput("");
                            }
                          }}>Ajouter</Button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(field.value || []).map((label: string, idx: number) => (
                            <Badge key={label + idx} variant="outline" className="flex items-center gap-1 pl-2 pr-1 text-[10px]">
                              {label}
                              <Button type="button" size="icon" variant="ghost" className="h-4 w-4 rounded-full" onClick={() => {
                                const newVals = (field.value || []).filter((l: string) => l !== label);
                                field.onChange(newVals);
                              }}>
                                <LucideIcons.X className="h-2 w-2" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="raci" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={taskForm.control} name="raci.responsible" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-bold"><User className="h-4 w-4 text-primary" /> Responsable (R)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                          <SelectContent>{availableUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={taskForm.control} name="raci.accountable" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-bold"><Shield className="h-4 w-4 text-emerald-500" /> Approbateur (A)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                          <SelectContent>{availableUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                  <FormDescription className="text-[10px] mt-2 italic">R: Exécute la tâche | A: Valide et porte la responsabilité.</FormDescription>
                </TabsContent>

                <TabsContent value="links" className="space-y-4 pt-4">
                  <FormField control={taskForm.control} name="documentIds" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-bold"><FileText className="h-4 w-4 text-blue-500" /> Documents de Référence</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className="w-full justify-between h-auto min-h-10 text-xs text-left">
                              <div className="flex gap-1 flex-wrap">
                                {field.value && field.value.length > 0
                                  ? documents.filter(d => field.value?.includes(d.id)).map(doc => <Badge key={doc.id} variant="secondary" className="text-[10px]">{doc.name}</Badge>)
                                  : "Lier des documents"}
                              </div>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <ScrollArea className="h-48">
                            <div className="p-2 space-y-1">
                              {documents.map(doc => {
                                const isSelected = field.value?.includes(doc.id) ?? false;
                                return (
                                  <div key={doc.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer" onClick={() => {
                                    const current = field.value || [];
                                    field.onChange(isSelected ? current.filter((id: string) => id !== doc.id) : [...current, doc.id]);
                                  }}>
                                    <Checkbox checked={isSelected} />
                                    <label className="text-xs font-medium cursor-pointer">{doc.name}</label>
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )} />

                  <FormField control={taskForm.control} name="risks" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-bold"><Zap className="h-4 w-4 text-amber-500" /> Risques Associés</FormLabel>
                      <FormControl><Input placeholder="IDs des risques (ex: R1, R2)" className="text-xs" {...field} value={(field.value || []).join(', ')} onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} /></FormControl>
                      <FormDescription className="text-[10px]">Séparez les IDs par des virgules.</FormDescription>
                    </FormItem>
                  )} />

                  <FormField control={taskForm.control} name="processes" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-bold"><Workflow className="h-4 w-4 text-purple-500" /> Processus Liés</FormLabel>
                      <FormControl><Input placeholder="IDs des processus (ex: P1, P2)" className="text-xs" {...field} value={(field.value || []).join(', ')} onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} /></FormControl>
                    </FormItem>
                  )} />

                  <FormField control={taskForm.control} name="controls" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Contrôles de Référence</FormLabel>
                      <FormControl><Input placeholder="IDs des contrôles (ex: C1, C2)" className="text-xs" {...field} value={(field.value || []).join(', ')} onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} /></FormControl>
                    </FormItem>
                  )} />

                  {/* --- LIAISON GRC ASSISTÉE --- */}
                  <div className="p-4 border rounded-2xl bg-purple-50/30 space-y-4">
                    <FormLabel className="flex items-center gap-2 font-bold text-purple-900 border-b pb-2"><Workflow className="h-4 w-4" /> Liaison Processus Métier (Assistance GRC)</FormLabel>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={taskForm.control} name="grcWorkflowId" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] uppercase font-bold text-slate-500">Choix du Processus</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Sélectionner un processus" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {Object.keys(usePlanData().activeWorkflows).map(id => (
                                <SelectItem key={id} value={id}>{id.replace('processus-', '').toUpperCase()}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />

                      <FormField control={taskForm.control} name="grcNodeId" render={({ field }) => {
                        const selectedWorkflowId = taskForm.watch("grcWorkflowId");
                        const mermaidCode = selectedWorkflowId ? usePlanData().activeWorkflows[selectedWorkflowId] : "";

                        // Analyse des noeuds Mermaid on the fly
                        const nodes: { id: string, label: string }[] = [];
                        if (mermaidCode) {
                          const regex = /([a-zA-Z0-9_\-\.]+)\s*([\[\(\{\>\\\/]{1,2})(.*?)([\]\)\\}]{1,2})/g;
                          let match;
                          while ((match = regex.exec(mermaidCode)) !== null) {
                            const label = match[3].replace(/^"+|"+$/g, '').split('<br')[0].trim();
                            if (label && !nodes.find(n => n.id === match[1])) {
                              nodes.push({ id: match[1], label });
                            }
                          }
                        }

                        return (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold text-slate-500">Étape / Nœud</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!selectedWorkflowId}>
                              <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder={selectedWorkflowId ? "Choisir l'étape" : "Sélectionner d'abord le processus"} /></SelectTrigger></FormControl>
                              <SelectContent>
                                {nodes.map(node => (
                                  <SelectItem key={node.id} value={node.id}>{node.label} ({node.id})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        );
                      }} />
                    </div>
                    <FormDescription className="text-[10px]">Lier cette tâche à une étape précise d'un workflow pour l'affichage dynamique (Vue GRC Active).</FormDescription>
                  </div>
                </TabsContent>

                <TabsContent value="kpi" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={taskForm.control} name="frequency" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fréquence</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="one_time">Ponctuelle</SelectItem>
                            <SelectItem value="monthly">Mensuelle</SelectItem>
                            <SelectItem value="quarterly">Trimestrielle</SelectItem>
                            <SelectItem value="annual">Annuelle</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={taskForm.control} name="nextReviewDate" render={({ field }) => (<FormItem><FormLabel>Prochaine Revue</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>)} />
                  </div>

                  <div className="p-4 border rounded-2xl bg-indigo-50/30 space-y-3">
                    <FormLabel className="flex items-center gap-2 font-bold text-indigo-900"><Activity className="h-4 w-4" /> Indicateur (KPI)</FormLabel>
                    <FormField control={taskForm.control} name="kpi.name" render={({ field }) => (<FormItem><FormControl><Input placeholder="Nom du KPI" className="bg-white" {...field} /></FormControl></FormItem>)} />
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={taskForm.control} name="kpi.target" render={({ field }) => (<FormItem><FormControl><Input placeholder="Cible" className="bg-white" {...field} /></FormControl></FormItem>)} />
                      <FormField control={taskForm.control} name="kpi.unit" render={({ field }) => (<FormItem><FormControl><Input placeholder="Unité" className="bg-white" {...field} /></FormControl></FormItem>)} />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="pt-4 border-t">
                <DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose>
                <Button type="submit" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">{dialogState.mode === "add" ? "Ajouter" : "Enregistrer"}</Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
