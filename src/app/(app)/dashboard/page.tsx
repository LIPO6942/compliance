"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Bell, FileText, ShieldAlert, Users, Target, Lightbulb, Activity, HelpCircle, Map, Newspaper, RefreshCw, History, PlusCircle, Workflow, TrendingUp, ShieldCheck, BrainCircuit, CheckCircle2, AlertCircle, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { usePlanData } from "@/contexts/PlanDataContext";
import { useDocuments } from "@/contexts/DocumentsContext";
import { useIdentifiedRegulations } from "@/contexts/IdentifiedRegulationsContext";
import type { RiskMappingItem, ActivityItem, ComplianceTask, ActionItem } from "@/types/compliance";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/icons/Logo";
import { useNews } from "@/contexts/NewsContext";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, differenceInDays, isBefore, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useRiskMapping } from "@/contexts/RiskMappingContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTimeline } from "@/contexts/TimelineContext";
import { summarizeNewsAction } from "./actions";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";

const complianceStatusBaseColors = {
  conforme: "#10b981", // emerald-500
  enCours: "#f59e0b",  // amber-500
  nonConforme: "#ef4444", // rose-500
  aucuneDonnee: "#94a3b8", // slate-400
};

export default function DashboardPage() {
  const { planData, activeWorkflows } = usePlanData();
  const { documents } = useDocuments();
  const { identifiedRegulations } = useIdentifiedRegulations();
  const { risks, editRisk } = useRiskMapping();

  // Utilités pour le cycle des points d'action (idempotent avec risk-mapping/page)
  const cycleActionStatus = (s: number): 0 | 33 | 66 | 100 => {
    if (s === 0) return 33;
    if (s === 33) return 66;
    if (s === 66) return 100;
    return 0;
  };

  const actionStatusConfig: Record<number, { label: string; short: string; color: string; bg: string; border: string }> = {
    0:   { label: 'Non initié', short: '0%',   color: 'text-slate-500',   bg: 'bg-slate-100 dark:bg-slate-800',        border: 'border-slate-200 dark:border-slate-700' },
    33:  { label: 'Initié',     short: '33%',  color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/30',        border: 'border-blue-200 dark:border-blue-800' },
    66:  { label: 'En cours',   short: '66%',  color: 'text-orange-600',  bg: 'bg-orange-50 dark:bg-orange-900/30',    border: 'border-orange-200 dark:border-orange-800' },
    100: { label: 'Réalisé',    short: '100%', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30',  border: 'border-emerald-200 dark:border-emerald-800' },
  };
  const { news, loading: newsLoading, refetchNews, dismissNewsItem } = useNews();
  const { events: timelineEvents, toggleValidation } = useTimeline();
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();

  const [activeTasksCount, setActiveTasksCount] = React.useState(0);
  const [overdueTasksCount, setOverdueTasksCount] = React.useState(0);
  const [overallCompliancePercentage, setOverallCompliancePercentage] = React.useState(0);
  const [complianceStatusData, setComplianceStatusData] = React.useState<any[]>([]);
  const [taskProgressData, setTaskProgressData] = React.useState<any[]>([]);
  const [newAlertsCount, setNewAlertsCount] = React.useState(0);
  const [lastActions, setLastActions] = React.useState<any[]>([]);
  const [newsSummary, setNewsSummary] = React.useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = React.useState(false);
  const [isBriefingExpanded, setIsBriefingExpanded] = React.useState(true);
  const { toast } = useToast();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (planData && documents && identifiedRegulations && risks) {
      const now = new Date();

      // Helper recursif pour compter toutes les tâches (y compris dans les branches)
      const getTaskStats = (tasks: ComplianceTask[]) => {
        let total = 0;
        let completed = 0;
        let overdue = 0;

        const recurse = (taskList: ComplianceTask[]) => {
          taskList.forEach(task => {
            total++;
            if (task.completed) completed++;
            else if (task.deadline && new Date(task.deadline) < now) overdue++;

            if (task.branches) {
              task.branches.forEach((branch) => {
                recurse(branch.tasks);
              });
            }
          });
        };

        recurse(tasks);
        return { total, completed, overdue };
      };

      const allTasksUnderlying = planData
        .filter(category => category.name !== "Processus Métiers Clés")
        .flatMap(category => category.subCategories.flatMap(subCategory => subCategory.tasks));

      const globalStats = getTaskStats(allTasksUnderlying);

      setOverdueTasksCount(globalStats.overdue);
      setActiveTasksCount(globalStats.total - globalStats.completed);

      // Conformité Globale = tâches complétées / total tâches
      setOverallCompliancePercentage(globalStats.total > 0 ? Math.round((globalStats.completed / globalStats.total) * 100) : 0);

      const conformeCount = documents.filter(d => d.status === "Validé").length;
      const enCoursCount = documents.filter(d => d.status === "En Révision").length;
      const nonConformeCount = documents.filter(d => d.status === "Obsolète").length;
      const totalRelevantDocsForPie = conformeCount + enCoursCount + nonConformeCount;

      let newComplianceStatusData: any[] = [];
      if (totalRelevantDocsForPie > 0) {
        newComplianceStatusData = [
          { status: "Conforme", value: conformeCount, fill: complianceStatusBaseColors.conforme },
          { status: "En Cours", value: enCoursCount, fill: complianceStatusBaseColors.enCours },
          { status: "Non Conforme", value: nonConformeCount, fill: complianceStatusBaseColors.nonConforme },
        ].filter(item => item.value > 0);
      }
      setComplianceStatusData(newComplianceStatusData);

      // Task Progress
      const newTaskProgressData = planData
        .filter(category => category.name !== "Processus Métiers Clés")
        .map(category => {
          const categoryTasks = category.subCategories.flatMap(sub => sub.tasks);
          const stats = getTaskStats(categoryTasks);
          return {
            id: category.id,
            name: category.name.substring(0, 15),
            progress: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
            overdue: stats.overdue
          };
        }).filter(c => c.progress > 0 || c.overdue > 0).slice(0, 4);
      setTaskProgressData(newTaskProgressData);

      setNewAlertsCount(identifiedRegulations.filter(reg => reg.status === 'Nouveau').length);

      // Recent Actions
      const documentActions = documents.slice(0, 5).map(doc => ({
        id: `doc-${doc.id}`,
        description: `Mise à jour : ${doc.name}`,
        date: parseISO(doc.lastUpdated),
        Icon: FileText,
      }));

      const alertActions = identifiedRegulations.slice(0, 5).map(alert => ({
        id: `alert-${alert.id}`,
        description: `Nouvelle alerte : ${alert.summary.substring(0, 30)}...`,
        date: parseISO(alert.publicationDate),
        Icon: Bell,
      }));

      const allActions = [...documentActions, ...alertActions].sort((a, b) => b.date.getTime() - a.date.getTime());
      setLastActions(allActions.slice(0, 5));

      setIsLoading(false);
    }
  }, [planData, documents, identifiedRegulations, risks]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Logo className="h-12 w-12 animate-spin" />
        <p className="ml-4 text-lg text-muted-foreground">Intelligence Dashboard...</p>
      </div>
    );
  }

  const handleCardClick = (path: string) => {
    router.push(path);
  };

  const handleSummarizeNews = async () => {
    // Si un briefing existe déjà, on le plie/déplie
    if (newsSummary) {
      setIsBriefingExpanded(prev => !prev);
      return;
    }

    if (news.length === 0) return;
    setIsSummarizing(true);
    setIsBriefingExpanded(true);
    setNewsSummary(null);
    try {
      const result = await summarizeNewsAction(news.slice(0, 10));
      if (result.summary) {
        setNewsSummary(result.summary);
      } else if (result.error) {
        toast({
          title: "Erreur IA",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Échec de la connexion au service IA.",
        variant: "destructive",
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-8 pb-10">
        {/* Header Space */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">SaaS Compliance Monitor</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase italic">
              Dashboard <span className="text-primary font-black">Conformité</span> <span className="text-emerald-700 dark:text-emerald-500 font-black">MAE</span>
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-slate-500 text-xs flex items-center gap-2 font-medium">
                <Activity className="h-3.5 w-3.5 text-primary" /> Analyse GRC • <span className="font-bold text-slate-700 dark:text-slate-300">{format(new Date(), 'dd MMMM yyyy', { locale: fr })}</span>
              </p>
              <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Système Live</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/regulatory-watch')} className="shadow-sm border-primary/20 hover:bg-primary/5">
              <Lightbulb className="mr-2 h-4 w-4 text-amber-500" /> Assistant IA
            </Button>
            <Button size="sm" onClick={() => router.push('/plan')} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
              <PlusCircle className="mr-2 h-4 w-4" /> Gérer le Plan
            </Button>
          </div>
        </div>

        {/* Regulatory Timeline - Interactive with Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {timelineEvents
            .filter(event => {
              const eventDate = parseISO(event.date);
              return !isBefore(eventDate, startOfDay(new Date()));
            })
            .map((event, i) => {
              const eventDate = parseISO(event.date);
              const daysLeft = differenceInDays(eventDate, startOfDay(new Date()));
              const isUrgent = daysLeft <= 3 && !event.validated;

              return (
                <div
                  key={event.id}
                  className={cn(
                    "group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 shadow-lg transition-all",
                    isUrgent ? "animate-blink-urgent shadow-rose-500/10" : "hover:shadow-xl hover:-translate-y-1"
                  )}
                >
                  <div className={cn("absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-[4rem]", event.color)} />

                  <div className="flex items-center gap-4 relative z-10">
                    <div className={cn(
                      "flex flex-col items-center justify-center min-w-[60px] h-[60px] rounded-2xl text-white font-black transition-transform group-hover:scale-105",
                      event.validated ? "bg-emerald-500 shadow-emerald-500/20" : event.color
                    )}>
                      {event.validated ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <>
                          <span className="text-[10px] opacity-70 leading-none uppercase">{format(eventDate, "MMM", { locale: fr })}</span>
                          <span className="text-lg">{format(eventDate, "dd")}</span>
                        </>
                      )}
                    </div>
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={cn(
                          "text-[8px] font-black uppercase tracking-widest py-0",
                          isUrgent ? "bg-rose-50 text-rose-600 border-rose-200" : "border-slate-200"
                        )}>
                          {event.category}
                        </Badge>
                        <button
                          onClick={() => toggleValidation(event.id)}
                          className={cn(
                            "p-1.5 rounded-full transition-all",
                            event.validated
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                          )}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <h4 className={cn(
                        "text-sm font-black uppercase italic truncate",
                        event.validated ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100"
                      )}>{event.title}</h4>
                      <div className="flex items-center gap-1">
                        {isUrgent && <AlertCircle className="h-3 w-3 text-rose-500 animate-pulse" />}
                        <p className={cn(
                          "text-[10px] font-bold uppercase tracking-tighter",
                          isUrgent ? "text-rose-500" : "text-slate-400"
                        )}>
                          {event.validated ? "Complété" : (isUrgent ? "Urgence : < 3 jours" : "Échéance critique")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Left Column: Health Gauge */}
          <div className="lg:col-span-1 space-y-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Card
                  className="border-none shadow-2xl bg-slate-900 text-white overflow-hidden relative min-h-[320px] flex flex-col justify-center cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                  onClick={() => handleCardClick('/documents')}
                >
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                  <CardHeader className="pb-2 text-center">
                    <CardTitle className="text-[10px] uppercase tracking-[0.3em] font-black opacity-50">Conformité Globale</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <div className="relative flex items-center justify-center w-full">
                      {isClient && (
                        <ResponsiveContainer width="100%" height={120}>
                          <PieChart>
                            <Pie
                              data={[
                                { value: overallCompliancePercentage, fill: 'hsl(var(--primary))' },
                                { value: 100 - overallCompliancePercentage, fill: 'rgba(255,255,255,0.05)' }
                              ]}
                              cx="50%" cy="100%"
                              startAngle={180} endAngle={0}
                              innerRadius={70} outerRadius={95}
                              paddingAngle={0} dataKey="value" stroke="none"
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                      <div className="absolute bottom-0 text-center">
                        <div className="text-6xl font-black tracking-tighter leading-none mb-1">{overallCompliancePercentage}%</div>
                        <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-400 bg-emerald-500/10">SANTÉ OPTIMALE</Badge>
                      </div>
                    </div>
                    <div className="mt-10 grid grid-cols-2 gap-8 w-full border-t border-white/5 pt-6">
                      <div className="text-center">
                        <p className="text-2xl font-black">{activeTasksCount}</p>
                        <p className="text-[9px] uppercase font-bold opacity-40">Tâches Actives</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-black text-rose-500">{overdueTasksCount}</p>
                        <p className="text-[9px] uppercase font-bold opacity-40">Retards</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px]">
                <p className="font-bold mb-1">Score de Conformité</p>
                <p className="text-xs">Vue d'ensemble de la santé réglementaire basée sur vos documents et tâches.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card
                  className="shadow-xl border-primary/5 bg-white/50 backdrop-blur-md cursor-pointer hover:bg-white transition-all"
                  onClick={() => handleCardClick('/plan')}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      Performance Domaines
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    {taskProgressData.map((item, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                          <span className="truncate max-w-[140px] text-slate-600 dark:text-slate-400">{item.name}</span>
                          <span className={item.overdue > 0 ? "text-rose-500" : "text-primary"}>{item.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-1000 ${item.overdue > 0 ? 'bg-rose-500' : 'bg-primary'}`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-bold mb-1">Progrès par Catégorie</p>
                <p className="text-xs">Avancement des tâches dans chaque pôle de conformité.</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="shadow-xl bg-white dark:bg-slate-900 border-none relative overflow-hidden group hover:shadow-primary/5 transition-all">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] pointer-events-none" />
                  <CardHeader className="pb-3 border-b border-slate-50 dark:border-slate-800">
                    <CardTitle className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-800 dark:text-slate-200 flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        Pilote d'Actions
                      </span>
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-[9px] cursor-pointer" onClick={() => handleCardClick('/risk-mapping?tab=plan-actions')}>
                        VOIR TOUT
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Global average header */}
                    {(() => {
                      const risksWithActions = risks.filter(r => {
                        const items = r.actionItems && r.actionItems.length > 0 ? r.actionItems : (r.actionCorrective ? r.actionCorrective.split(/[\n\+;•]+/).map(s => s.trim()).filter(s => s.length > 0) : []);
                        return items.length > 0;
                      });
                      if (risksWithActions.length === 0) return null;
                      const globalAvg = Math.round(risksWithActions.reduce((sum, r) => {
                        const items: ActionItem[] = r.actionItems && r.actionItems.length > 0 ? r.actionItems : (r.actionCorrective ? r.actionCorrective.split(/[\n\+;•]+/).map((s, i) => ({ id: `d-${i}`, text: s.trim(), status: 0 as 0|33|66|100 })).filter(it => it.text.length > 0) : []);
                        if (items.length === 0) return sum;
                        return sum + Math.round(items.reduce((a, it) => a + it.status, 0) / items.length);
                      }, 0) / risksWithActions.length);
                      const barColor = globalAvg >= 80 ? 'bg-emerald-500' : globalAvg >= 50 ? 'bg-orange-500' : globalAvg >= 20 ? 'bg-blue-500' : 'bg-slate-400';
                      const textColor = globalAvg >= 80 ? 'text-emerald-600' : globalAvg >= 50 ? 'text-orange-600' : globalAvg >= 20 ? 'text-blue-600' : 'text-slate-500';
                      return (
                        <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Activity className="h-3.5 w-3.5 text-primary" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Avancement Global</span>
                            </div>
                            <span className={cn("text-lg font-black", textColor)}>{globalAvg}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                            <div className={cn("h-full rounded-full transition-all duration-700", barColor)} style={{ width: `${globalAvg}%` }} />
                          </div>
                        </div>
                      );
                    })()}
                    <div className="divide-y divide-slate-50 dark:divide-slate-800 relative z-10">
                      {risks
                        .filter(r => {
                          const items = r.actionItems && r.actionItems.length > 0 ? r.actionItems : (r.actionCorrective ? r.actionCorrective.split(/[\n\+;•]+/).map(s => s.trim()).filter(s => s.length > 0) : []);
                          return items.length > 0;
                        })
                        .filter(r => {
                          const items: ActionItem[] = r.actionItems && r.actionItems.length > 0 ? r.actionItems : [];
                          const avg = items.length > 0 ? Math.round(items.reduce((a, it) => a + it.status, 0) / items.length) : (r.completionLevel || 0);
                          return avg < 100;
                        })
                        .slice(0, 5)
                        .map(risk => {
                          const items: ActionItem[] = risk.actionItems && risk.actionItems.length > 0 ? risk.actionItems : (risk.actionCorrective ? risk.actionCorrective.split(/[\n\+;•]+/).map((s, i) => ({ id: `d-${i}`, text: s.trim(), status: 0 as 0|33|66|100 })).filter(it => it.text.length > 0) : []);
                          const avg = items.length > 0 ? Math.round(items.reduce((a, it) => a + it.status, 0) / items.length) : 0;
                          const completedCount = items.filter(it => it.status === 100).length;
                          const avgColor = avg >= 80 ? 'text-emerald-600' : avg >= 50 ? 'text-orange-600' : avg >= 20 ? 'text-blue-600' : 'text-slate-500';
                          const barColor = avg >= 80 ? 'bg-emerald-500' : avg >= 50 ? 'bg-orange-500' : avg >= 20 ? 'bg-blue-500' : 'bg-slate-400';

                          // Deadline indicator — 🔴 overdue, 🟠 <7d, 🟡 <30d, 🟢 future
                          let deadlineIndicator: React.ReactNode = null;
                          if (risk.deadline) {
                            const now = startOfDay(new Date());
                            const dlDate = parseISO(risk.deadline);
                            const daysLeft = differenceInDays(dlDate, now);
                            let dlColor = 'bg-emerald-500'; // > 30 days
                            let dlText = 'text-emerald-600';
                            let dlLabel = format(dlDate, 'dd/MM/yy');
                            if (daysLeft < 0) { dlColor = 'bg-rose-500'; dlText = 'text-rose-600'; dlLabel = 'Dépassée'; }
                            else if (daysLeft <= 7) { dlColor = 'bg-orange-500'; dlText = 'text-orange-600'; dlLabel = `${daysLeft}j`; }
                            else if (daysLeft <= 30) { dlColor = 'bg-yellow-500'; dlText = 'text-yellow-600'; dlLabel = `${daysLeft}j`; }
                            deadlineIndicator = (
                              <div className="flex items-center gap-1">
                                <div className={cn("h-1.5 w-1.5 rounded-full", dlColor)} />
                                <span className={cn("text-[8px] font-black uppercase", dlText)}>{dlLabel}</span>
                              </div>
                            );
                          }

                          return (
                            <div key={risk.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group/item">
                              <div className="flex justify-between items-start gap-3 mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-bold leading-tight text-slate-700 dark:text-slate-300 line-clamp-1">{risk.riskDescription}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[8px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{completedCount}/{items.length} points</span>
                                    {deadlineIndicator}
                                  </div>
                                </div>
                                <span className={cn("text-sm font-black whitespace-nowrap", avgColor)}>{avg}%</span>
                              </div>

                              {/* Points d'actions interactifs */}
                              <div className="space-y-1 mt-2 mb-3">
                                {items.slice(0, 2).map((item, idx) => {
                                  const cfg = actionStatusConfig[item.status] || actionStatusConfig[0];
                                  return (
                                    <div key={item.id || idx} className="flex items-start gap-1.5 group/point">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newStatus = cycleActionStatus(item.status);
                                          const updatedItems = items.map((it, i) => i === idx ? { ...it, status: newStatus } : it);
                                          const newAvg = Math.round(updatedItems.reduce((s, it) => s + it.status, 0) / updatedItems.length);
                                          editRisk(risk.id, {
                                            actionItems: updatedItems,
                                            completionLevel: newAvg,
                                            actionCorrective: updatedItems.map(it => it.text).join('\n'),
                                          } as any);
                                          toast({ 
                                            title: "Mise à jour rapide", 
                                            description: `${item.text.substring(0, 30)}... → ${actionStatusConfig[newStatus].label}`
                                          });
                                          if (user) logAction({ userEmail: user.email, userName: user.name, action: 'PLAN_UPDATE', label: `Mise à jour via Dashboard: ${risk.riskDescription}`, detail: `Status: ${newStatus}%`, module: 'Tableau de bord' });
                                        }}
                                        className={cn(
                                          "flex-shrink-0 text-[7px] font-black px-1 py-0.5 rounded border transition-all hover:scale-110",
                                          cfg.bg, cfg.color, cfg.border
                                        )}
                                      >
                                        {cfg.short}
                                      </button>
                                      <span className={cn(
                                        "text-[9px] leading-tight line-clamp-1", 
                                        item.status === 100 ? "line-through text-slate-400" : "text-slate-600 dark:text-slate-400"
                                      )}>
                                        {item.text}
                                      </span>
                                    </div>
                                  );
                                })}
                                {items.length > 2 && (
                                  <p className="text-[8px] text-slate-400 italic pl-1">+ {items.length - 2} autres actions...</p>
                                )}
                              </div>

                              <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${avg}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      {risks.filter(r => (r.actionItems && r.actionItems.length > 0) || r.actionCorrective).length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-xs italic font-medium">
                          Aucune action corrective en attente.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-bold mb-1">Actions Correctives</p>
                <p className="text-xs">Avancement par risque avec indicateur d'échéance. 🔴 Dépassée 🟠 {'<'}7j 🟡 {'<'}30j 🟢 OK</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Middle Column: 360 View */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card
                    className="shadow-xl border-none bg-gradient-to-br from-rose-50 via-white to-white dark:from-rose-950/20 dark:to-slate-900 group overflow-hidden border-l-4 border-l-rose-500 cursor-pointer hover:scale-[1.02] transition-all"
                    onClick={() => handleCardClick('/alerts')}
                  >
                    <CardHeader className="pb-0">
                      <CardTitle className="text-xs font-black uppercase tracking-widest text-rose-600 flex justify-between">
                        Urgence
                        <Badge variant="destructive" className="h-4 text-[9px] animate-pulse">ACTION REQUIS</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 flex items-center gap-5">
                      <div className="p-4 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-500/30 group-hover:rotate-6 transition-transform">
                        <ShieldAlert className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">{newAlertsCount}</p>
                        <p className="text-[10px] text-rose-600 font-bold uppercase">Nouvelles Alertes GRC</p>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-bold mb-1">Réglementations à traiter</p>
                  <p className="text-xs">Alertes de veille nécessitant une analyse ou une action immédiate.</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Card
                    className="shadow-xl border-none bg-gradient-to-br from-indigo-50 via-white to-white dark:from-indigo-950/20 dark:to-slate-900 group overflow-hidden border-l-4 border-l-indigo-500 cursor-pointer hover:scale-[1.02] transition-all"
                    onClick={() => handleCardClick('/plan')}
                  >
                    <CardHeader className="pb-0">
                      <CardTitle className="text-xs font-black uppercase tracking-widest text-indigo-600">Structure</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 flex items-center gap-5">
                      <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30 group-hover:-rotate-6 transition-transform">
                        <Workflow className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">{Object.keys(activeWorkflows).length}</p>
                        <p className="text-[10px] text-indigo-600 font-bold uppercase">Workflows Métiers</p>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-bold mb-1">Processus Opérationnels</p>
                  <p className="text-xs">Nombre de diagrammes de flux actifs liant les tâches au métier.</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card
                  className="shadow-2xl border-none cursor-pointer hover:shadow-primary/5 transition-all"
                  onClick={() => handleCardClick('/documents')}
                >
                  <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-black font-headline tracking-tight">Répartition GRC Documentaire</CardTitle>
                      <p className="text-xs text-muted-foreground italic font-medium">Analyse du volume de preuves par état de validation</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[8px] font-black uppercase mb-1">Audit OK</Badge>
                      <span className="text-[10px] font-bold text-slate-400">Total: {documents.length} docs</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="h-[200px]">
                      {isClient && (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={complianceStatusData} layout="vertical" margin={{ left: -20, right: 40 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="status" type="category" width={120} tick={{ fontSize: 10, fontWeight: 900, fill: 'currentColor' }} />
                            <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24}>
                              {complianceStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {complianceStatusData.map((s, i) => (
                        <div key={i} className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 transition-hover hover:bg-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.fill }} />
                            <span className="text-[9px] font-black uppercase opacity-60 truncate">{s.status}</span>
                          </div>
                          <span className="text-lg font-black">{s.value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Taux d'Efficacité</p>
                          <p className="text-sm font-bold">Traitement des preuves</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-primary">84%</p>
                          <p className="text-[8px] font-bold text-emerald-500 flex items-center gap-0.5 justify-end"><TrendingUp className="h-2 w-2" /> +4.2%</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-[9px] font-black uppercase">
                          <span className="text-slate-500">Intégrité des Données</span>
                          <span className="text-primary">Stabilité Haute</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-primary w-[92%] rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/50">
                        <FileText className="h-4 w-4 text-indigo-500" />
                        <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 leading-tight">
                          <span className="font-black uppercase">Insight :</span> 12 nouveaux documents attendent une révision complexe.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-bold mb-1">Moteur Documentaire</p>
                <p className="text-xs">Visualisation de la validité de vos documents de preuve GRC.</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Right Column: Timeline & News */}
          <div className="lg:col-span-1 space-y-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Card
                  className="shadow-xl border-none border-t-4 border-t-primary cursor-pointer hover:bg-slate-50/50 transition-all"
                  onClick={() => handleCardClick('/history')}
                >
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
                      <History className="h-4 w-4" />
                      Derniers Signaux
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[280px]">
                      <div className="p-5 space-y-7">
                        {lastActions.map((action, i) => (
                          <div key={i} className="flex gap-4 items-start relative pb-7 border-l-2 border-slate-100 dark:border-slate-800 ml-2 pl-5 last:border-0 last:pb-0">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-slate-950 border-4 border-primary shadow-sm" />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <action.Icon className="h-3 w-3 text-muted-foreground" />
                                <p className="text-[10px] font-black uppercase text-muted-foreground">
                                  {format(action.date, 'HH:mm • dd MMM', { locale: fr })}
                                </p>
                              </div>
                              <p className="text-[13px] font-bold leading-tight text-slate-800 dark:text-slate-200">
                                {action.description}
                              </p>
                            </div>
                          </div>
                        ))}
                        {lastActions.length === 0 && (
                          <div className="text-center py-10 opacity-30 italic text-sm">Aucun signal récent</div>
                        )}
                      </div>
                    </ScrollArea>
                    <div className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/50 pointer-events-none">
                      <Button variant="ghost" className="w-full text-xs font-bold gap-2 text-muted-foreground hover:text-primary">
                        Voir l'historique complet <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="font-bold mb-1">Journal d'Audit</p>
                <p className="text-xs">Flux d'activité récent sur les documents, alertes et risques.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card
                  className="shadow-2xl overflow-hidden border-none bg-white dark:bg-slate-900 cursor-pointer hover:shadow-primary/20 transition-all group/card relative"
                  onClick={() => handleCardClick('/regulatory-watch')}
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  <CardHeader className="pb-4 pt-6 px-6 border-b border-slate-50 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Newspaper className="h-4 w-4 text-primary" />
                        </div>
                        <CardTitle className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-800 dark:text-slate-200">
                          Intelligence Flux
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-7 px-2 text-[9px] font-black uppercase gap-1.5 transition-all active:scale-95",
                            newsSummary && isBriefingExpanded ? "bg-primary/20 text-primary border border-primary/20" : "hover:bg-primary/10 text-primary/70 hover:text-primary"
                          )}
                          onClick={(e) => { e.stopPropagation(); handleSummarizeNews(); }}
                          disabled={isSummarizing || news.length === 0}
                        >
                          <Sparkles className={cn("h-3 w-3", isSummarizing && "animate-pulse")} />
                          {isSummarizing ? "Analyse..." : newsSummary ? (isBriefingExpanded ? "Masquer Briefing" : "Voir Briefing") : "Briefing IA"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-primary/10 text-primary transition-all active:scale-95"
                          onClick={(e) => { e.stopPropagation(); refetchNews(); }}
                        >
                          <RefreshCw className={`h-4 w-4 ${newsLoading ? 'animate-spin' : 'group-hover/card:rotate-180 transition-transform duration-500'}`} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {newsSummary && isBriefingExpanded && (
                      <div className="px-6 py-4 bg-primary/5 border-b border-primary/10 animate-in fade-in slide-in-from-top-2 duration-500 relative">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <BrainCircuit className="h-3 w-3 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-primary">Synthèse Cognitive</span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setIsBriefingExpanded(false); }}
                            className="text-slate-400 hover:text-primary transition-colors p-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-line font-medium italic">
                          {newsSummary}
                        </div>
                      </div>
                    )}
                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                      {news.slice(0, 4).map((item) => (
                        <div
                          key={item.id}
                          className="group/item relative p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all flex flex-col gap-3"
                          onClick={(e) => { e.stopPropagation(); window.open(item.url, '_blank'); }}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Badge className={cn(
                                "text-[9px] font-black uppercase px-2 py-0.5 border-none",
                                item.source === 'FATF' ? "bg-amber-500/10 text-amber-600" :
                                  item.source === 'KPMG' ? "bg-blue-500/10 text-blue-600" :
                                    item.source === 'Juridoc.tn' ? "bg-teal-500/10 text-teal-600" :
                                      "bg-primary/10 text-primary"
                              )}>
                                {item.source}
                              </Badge>
                              <span className="text-[9px] font-bold text-slate-400">
                                {format(parseISO(item.date), 'dd MMM', { locale: fr })}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover/item:opacity-100 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                dismissNewsItem(item.id);
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <p className="text-[13px] font-bold leading-tight line-clamp-2 text-slate-700 dark:text-slate-300 group-hover/item:text-primary transition-colors">
                            {item.title}
                          </p>
                        </div>
                      ))}
                    </div>
                    {news.length === 0 && (
                      <div className="p-10 text-center space-y-2">
                        <Activity className="h-8 w-8 text-slate-200 mx-auto" />
                        <p className="text-xs font-bold text-slate-400 uppercase italic">Aucun nouveau signal</p>
                      </div>
                    )}
                    <div
                      onClick={(e) => { e.stopPropagation(); router.push('/regulatory-watch'); }}
                      className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors group/more"
                    >
                      Explorer le flux complet
                      <ArrowRight className="ml-2 h-3.5 w-3.5 group-hover/more:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="font-bold mb-1">Veille Réglementaire</p>
                <p className="text-xs">Flux d'actualités mondiales sur la conformité et la finance.</p>
              </TooltipContent>
            </Tooltip>
          </div>

        </div>

        {/* Action shortcuts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ModernActionCard icon={ShieldCheck} title="Alertes GRC" href="/alerts" color="bg-rose-500" />
          <ModernActionCard icon={Map} title="Risques" href="/risk-mapping" color="bg-amber-500" />
          <ModernActionCard icon={FileText} title="Documents" href="/documents" color="bg-indigo-500" />
          <ModernActionCard icon={Users} title="Équipe" href="/team" color="bg-emerald-500" />
        </div>

      </div>
    </TooltipProvider>
  );
}

function ModernActionCard({ icon: Icon, title, href, color }: { icon: any, title: string, href: string, color: string }) {
  return (
    <Link href={href}>
      <Card className="group hover:shadow-2xl transition-all duration-300 border-none bg-white dark:bg-slate-900 shadow-lg hover:-translate-y-1 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="p-5 flex items-center gap-4 relative z-10">
          <div className={`${color} p-3 rounded-2xl text-white shadow-lg shadow-current/20 group-hover:scale-110 group-hover:rotate-6 transition-all`}>
            <Icon className="h-6 w-6" />
          </div>
          <span className="font-black font-headline text-lg tracking-tighter text-slate-800 dark:text-slate-100">{title}</span>
          <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground opacity-20 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all text-primary" />
        </CardContent>
      </Card>
    </Link>
  );
}
