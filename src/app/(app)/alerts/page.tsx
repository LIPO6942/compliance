"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BellRing, Search, MoreHorizontal, Edit, Archive, Circle, TriangleAlert, CheckCircle2, Shield, Eye, Info, Zap, Calendar, MapPin, ArrowRight, ShieldAlert, History, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { IdentifiedRegulation, AlertStatus, AlertCriticality, AlertType } from "@/types/compliance";
import { useIdentifiedRegulations } from "@/contexts/IdentifiedRegulationsContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

const alertSchema = z.object({
  status: z.enum(["Nouveau", "En cours d'analyse", "Traité", "Sans impact", "Archivé"]),
  criticality: z.enum(["Haute", "Moyenne", "Basse"]),
  deadline: z.string().optional(),
  affectedDepartments: z.string().optional(),
  requiredActions: z.string().optional(),
  analysisNotes: z.string().optional(),
  source: z.string().min(1, "La source est requise."),
  type: z.enum(["Nouvelle loi", "Modification réglementaire", "Alerte urgente", "Risque Interne", "Autre"]),
});
type AlertFormValues = z.infer<typeof alertSchema>;

const statusConfig: Record<AlertStatus, { label: string; icon: React.ElementType; color: string; border: string }> = {
  "Nouveau": { label: "NOUVEAU", icon: BellRing, color: "text-blue-500 bg-blue-500/10", border: "border-blue-500/20" },
  "En cours d'analyse": { label: "ANALYSE", icon: Edit, color: "text-amber-600 bg-amber-500/10", border: "border-amber-500/20" },
  "Traité": { label: "RÉSOLU", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10", border: "border-emerald-500/20" },
  "Sans impact": { label: "NÉANT", icon: Shield, color: "text-slate-500 bg-slate-500/10", border: "border-slate-500/20" },
  "Archivé": { label: "ARCHIVÉ", icon: Archive, color: "text-indigo-600 bg-indigo-500/10", border: "border-indigo-500/20" },
};

const criticalityConfig: Record<AlertCriticality, { label: string; dot: string; bg: string }> = {
  "Haute": { label: "CRITIQUE", dot: "bg-rose-500", bg: "bg-rose-50" },
  "Moyenne": { label: "MODÉRÉ", dot: "bg-amber-500", bg: "bg-amber-50" },
  "Basse": { label: "MINEUR", dot: "bg-emerald-500", bg: "bg-emerald-50" },
};

export default function AlertsPage() {
  const { identifiedRegulations, updateRegulation } = useIdentifiedRegulations();
  const { toast } = useToast();

  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => { setIsClient(true) }, []);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<string>("actives");
  const [filterCriticality, setFilterCriticality] = React.useState<string>("all");

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingAlert, setEditingAlert] = React.useState<IdentifiedRegulation | null>(null);

  const form = useForm<AlertFormValues>();

  const openDialog = (alert: IdentifiedRegulation) => {
    setEditingAlert(alert);
    form.reset({
      ...alert,
      deadline: alert.deadline ? format(parseISO(alert.deadline), 'yyyy-MM-dd') : '',
      affectedDepartments: alert.affectedDepartments?.join(', ') || ''
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setEditingAlert(null);
    setIsDialogOpen(false);
  };

  const handleFormSubmit = (values: AlertFormValues) => {
    if (!editingAlert) return;

    const updateData: Partial<IdentifiedRegulation> = {
      status: values.status,
      criticality: values.criticality,
      source: values.source,
      type: values.type,
    };

    if (values.deadline) {
      updateData.deadline = new Date(values.deadline).toISOString();
    } else {
      updateData.deadline = '';
    }

    if (values.affectedDepartments) {
      updateData.affectedDepartments = values.affectedDepartments.split(',').map(d => d.trim()).filter(Boolean);
    } else {
      updateData.affectedDepartments = [];
    }

    if (values.requiredActions) {
      updateData.requiredActions = values.requiredActions;
    }

    if (values.analysisNotes) {
      updateData.analysisNotes = values.analysisNotes;
    }

    const finalUpdateData = Object.fromEntries(Object.entries(updateData).filter(([_, v]) => v !== undefined && v !== ''));
    updateRegulation(editingAlert.id, finalUpdateData);
    toast({ title: "Alerte mise à jour", description: `L'alerte a été modifiée avec succès.` });
    closeDialog();
  };

  const filteredAlerts = React.useMemo(() => identifiedRegulations.filter(alert => {
    if (filterStatus === "actives") {
      if (alert.status !== "Nouveau" && alert.status !== "En cours d'analyse") return false;
    } else if (filterStatus !== "all" && alert.status !== filterStatus) {
      return false;
    }

    if (filterCriticality !== "all" && alert.criticality !== filterCriticality) return false;

    const searchLower = searchTerm.toLowerCase();
    if (searchLower &&
      !alert.summary.toLowerCase().includes(searchLower) &&
      !alert.source.toLowerCase().includes(searchLower) &&
      !alert.type.toLowerCase().includes(searchLower)) {
      return false;
    }
    return true;
  }), [identifiedRegulations, searchTerm, filterStatus, filterCriticality]);

  const allStatuses = Object.keys(statusConfig) as AlertStatus[];
  const allCriticalities = Object.keys(criticalityConfig) as AlertCriticality[];
  const allTypes: AlertType[] = ["Nouvelle loi", "Modification réglementaire", "Alerte urgente", "Risque Interne", "Autre"];
  const allSources = ["JORT", "CGA", "CTAF", "GAFI", "OFAC", "Veille IA", "Cartographie des Risques", "Autre"];

  return (
    <div className="space-y-10 pb-20">

      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Live Alert Stream</span>
          </div>
          <h1 className="text-5xl font-black font-headline tracking-tighter text-slate-900 dark:text-white uppercase italic">
            Command <span className="text-primary">Center</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Surveillance en temps réel des flux réglementaires et détection d'anomalies.
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <Card className="flex items-center gap-4 px-6 py-3 bg-slate-900 text-white border-none rounded-2xl shadow-xl">
            <ShieldAlert className="h-5 w-5 text-rose-400" />
            <div>
              <p className="text-[8px] font-black uppercase opacity-50 tracking-widest text-white">Alertes Actives</p>
              <p className="text-xl font-black">{identifiedRegulations.filter(r => r.status === "Nouveau").length}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4 px-6 py-3 bg-white dark:bg-slate-800 border-none rounded-2xl shadow-xl">
            <History className="h-5 w-5 text-primary" />
            <div>
              <p className="text-[8px] font-black uppercase opacity-30 tracking-widest">Traitées (30j)</p>
              <p className="text-xl font-black text-slate-800 dark:text-white">{identifiedRegulations.filter(r => r.status === "Traité").length}</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Filter Section */}
      <Card className="shadow-2xl border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] p-8">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Scanner les flux par source, contenu ou type d'alerte..."
              className="pl-12 h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none shadow-inner font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isClient && (
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-12 w-full sm:w-[180px] rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px] font-black uppercase tracking-widest">
                  <SelectValue placeholder="STATUT" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="actives" className="text-[10px] font-black uppercase">🔥 ALERTES ACTIVES</SelectItem>
                  <SelectItem value="all" className="text-[10px] font-black uppercase">TOUS LES FLUX</SelectItem>
                  {allStatuses.map(s => <SelectItem key={s} value={s} className="text-[10px] font-black uppercase">{statusConfig[s].label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCriticality} onValueChange={setFilterCriticality}>
                <SelectTrigger className="h-12 w-full sm:w-[180px] rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px] font-black uppercase tracking-widest">
                  <SelectValue placeholder="CRITICITÉ" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="all" className="text-[10px] font-black uppercase">TOUTES CRITICITÉS</SelectItem>
                  {allCriticalities.map(c => <SelectItem key={c} value={c} className="text-[10px] font-black uppercase">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </Card>

      {/* Main Alerts List */}
      <div className="space-y-4">
        {isClient ? (
          filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert) => {
              const status = statusConfig[alert.status];
              const critical = criticalityConfig[alert.criticality];
              return (
                <Card
                  key={alert.id}
                  className="group relative shadow-xl hover:shadow-2xl border-none bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden transition-all hover:-translate-y-1"
                >
                  <div className={`absolute top-0 left-0 bottom-0 w-2 ${critical.dot}`} />
                  <CardContent className="p-0">
                    <div className="flex flex-col lg:flex-row">
                      {/* Left: Metadata & Status */}
                      <div className="lg:w-[220px] p-8 bg-slate-50 dark:bg-slate-950/50 flex flex-col justify-between items-start gap-4 border-r border-slate-100 dark:border-slate-800">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Source Origine</p>
                          <p className="text-xl font-black italic tracking-tighter text-primary">{alert.source}</p>
                        </div>
                        <Badge className={`rounded-xl px-4 py-2 border-2 ${status.color} ${status.border} text-[9px] font-black uppercase tracking-widest w-full justify-center`}>
                          <status.icon className="h-3 w-3 mr-2" />
                          {status.label}
                        </Badge>
                        <div className="flex flex-col gap-2 w-full">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                            <Calendar className="h-3 w-3" /> {format(parseISO(alert.publicationDate), "dd MMM yyyy", { locale: fr })}
                          </div>
                          {alert.deadline && (
                            <div className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase tracking-tighter">
                              <Zap className="h-3 w-3 fill-rose-500" /> Deadline : {format(parseISO(alert.deadline), "dd/MM")}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Middle: Content */}
                      <div className="flex-1 p-8 space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-30">{alert.type}</p>
                            <h3 className="text-2xl font-black tracking-tight leading-tight">{alert.summary}</h3>
                          </div>
                          <Badge className={`rounded-full px-3 py-1 ${critical.bg} ${critical.dot.replace('bg-', 'text-')} border-none text-[8px] font-black uppercase tracking-widest h-fit shrink-0`}>
                            {critical.label}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {alert.affectedDepartments?.map((dep, i) => (
                            <Badge key={i} variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase p-1.5 border-none">
                              <MapPin className="h-2 w-2 mr-1" /> {dep}
                            </Badge>
                          ))}
                        </div>

                        {alert.requiredActions && (
                          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                            <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1 flex items-center gap-2">
                              <ShieldCheck className="h-3 w-3" /> Actions recommandées
                            </p>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{alert.requiredActions}</p>
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="lg:w-[120px] p-8 flex flex-col justify-center items-center gap-4 lg:border-l border-slate-100 dark:border-slate-800">
                        <Button onClick={() => openDialog(alert)} className="w-12 h-12 rounded-2xl bg-primary text-white hover:scale-110 transition-transform shadow-lg shadow-primary/20">
                          <Eye className="h-5 w-5" />
                        </Button>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-12 h-12 rounded-2xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 transition-transform">
                              <Info className="h-5 w-5 text-indigo-500" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-96 rounded-[2rem] p-6 shadow-2xl border-none">
                            <h4 className="text-xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-2">
                              <Zap className="h-5 w-5 text-primary fill-primary" /> Intelligence <span className="text-primary">Notes</span>
                            </h4>
                            <ScrollArea className="h-[300px]">
                              {alert.aiAnalysis && Object.keys(alert.aiAnalysis).length > 0 ? (
                                <div className="space-y-6">
                                  {Object.entries(alert.aiAnalysis).map(([keyword, points]) => (
                                    <div key={keyword} className="space-y-3">
                                      <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black tracking-widest uppercase">{keyword}</Badge>
                                      <ul className="space-y-3">
                                        {points.map((point, index) => (
                                          <li key={index} className="text-xs font-semibold leading-relaxed text-slate-500 flex gap-2">
                                            <ArrowRight className="h-3 w-3 shrink-0 text-primary mt-0.5" />
                                            {point}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center h-full py-10 opacity-30">
                                  <Shield className="h-10 w-10 mb-2" />
                                  <p className="text-xs font-black uppercase">Aucun log IA</p>
                                </div>
                              )}
                            </ScrollArea>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-slate-950/20 rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-slate-800">
              <BellRing className="h-16 w-16 text-slate-200 mb-6" />
              <h3 className="text-2xl font-black opacity-30 italic">SILENCE RÉGLEMENTAIRE</h3>
              <p className="text-muted-foreground text-sm font-bold mt-2">Aucune alerte critique enregistrée pour cette plage.</p>
            </div>
          )
        ) : (
          <div className="flex justify-center p-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Refined Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[3rem] p-10 border-none shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full" />
          <DialogHeader className="pb-8">
            <DialogTitle className="text-4xl font-black font-headline tracking-tighter uppercase italic">
              Expert <span className="text-primary">Review</span>
            </DialogTitle>
            <DialogDescription className="text-base font-medium">{editingAlert?.summary}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 max-h-[60vh] overflow-y-auto pr-6 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="source" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Canal Source</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent className="rounded-2xl border-none shadow-2xl">{allSources.map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Nature de l'Alerte</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent className="rounded-2xl border-none shadow-2xl">{allTypes.map(t => <SelectItem key={t} value={t} className="font-bold text-xs">{t.toUpperCase()}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Statut de Traitement</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent className="rounded-2xl border-none shadow-2xl">{allStatuses.map(s => <SelectItem key={s} value={s} className="font-bold text-xs">{statusConfig[s].label}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="criticality" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Niveau d'Urgence</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent className="rounded-2xl border-none shadow-2xl">{allCriticalities.map(c => <SelectItem key={c} value={c} className="font-bold">{c.toUpperCase()}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="deadline" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Date Butoir</FormLabel>
                    <FormControl><Input type="date" {...field} className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="affectedDepartments" render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Périmètre d'Impact</FormLabel>
                  <FormControl><Input {...field} placeholder="Juridique, IT, Marketing..." className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold shadow-inner" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="requiredActions" render={({ field }) => (
                <FormItem className="space-y-1"><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Protocole de Remédiation</FormLabel><FormControl><Textarea {...field} className="min-h-[100px] rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold p-4" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="analysisNotes" render={({ field }) => (
                <FormItem className="space-y-1"><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Notes GRC Confidentielles</FormLabel><FormControl><Textarea {...field} className="min-h-[100px] rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold p-4" /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter className="pt-6 gap-3">
                <Button type="button" variant="outline" onClick={closeDialog} className="h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest border-slate-200">Annuler</Button>
                <Button type="submit" className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">Valider l'Analyse</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
