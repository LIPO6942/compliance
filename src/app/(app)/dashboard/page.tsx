"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Bell, FileText, ShieldAlert, Users, Target, Lightbulb, Activity, HelpCircle, Map, Newspaper, RefreshCw, History, PlusCircle, Workflow, TrendingUp, ShieldCheck, BrainCircuit } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { usePlanData } from "@/contexts/PlanDataContext";
import { useDocuments } from "@/contexts/DocumentsContext";
import { useIdentifiedRegulations } from "@/contexts/IdentifiedRegulationsContext";
import type { RiskMappingItem, ActivityItem } from "@/types/compliance";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/icons/Logo";
import { useNews } from "@/contexts/NewsContext";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useRiskMapping } from "@/contexts/RiskMappingContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTimeline } from "@/contexts/TimelineContext";

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
  const { risks } = useRiskMapping();
  const { news, loading: newsLoading, refetchNews } = useNews();
  const { events: timelineEvents } = useTimeline();
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();

  const [activeTasksCount, setActiveTasksCount] = React.useState(0);
  const [overdueTasksCount, setOverdueTasksCount] = React.useState(0);
  const [overallCompliancePercentage, setOverallCompliancePercentage] = React.useState(0);
  const [complianceStatusData, setComplianceStatusData] = React.useState<any[]>([]);
  const [taskProgressData, setTaskProgressData] = React.useState<any[]>([]);
  const [newAlertsCount, setNewAlertsCount] = React.useState(0);
  const [lastActions, setLastActions] = React.useState<any[]>([]);
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (planData && documents && identifiedRegulations && risks) {
      const allTasks = planData
        .filter(category => category.name !== "Processus Métiers Clés")
        .flatMap(category => category.subCategories.flatMap(subCategory => subCategory.tasks));
      const now = new Date();

      setOverdueTasksCount(allTasks.filter(task => !task.completed && task.deadline && new Date(task.deadline) < now).length);
      setActiveTasksCount(allTasks.filter(task => !task.completed).length);

      const validatedDocuments = documents.filter(doc => doc.status === "Validé").length;
      const totalDocuments = documents.length;
      setOverallCompliancePercentage(totalDocuments > 0 ? Math.round((validatedDocuments / totalDocuments) * 100) : 0);

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
          const completed = categoryTasks.filter(task => task.completed).length;
          const overdue = categoryTasks.filter(task => !task.completed && task.deadline && new Date(task.deadline) < now).length;
          const total = categoryTasks.length;
          return {
            id: category.id,
            name: category.name.substring(0, 15),
            progress: total > 0 ? Math.round((completed / total) * 100) : 0,
            overdue
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
              Dashboard <span className="text-primary font-black">Conformité MAE</span>
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

        {/* Regulatory Timeline - Connected to State */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {timelineEvents.map((event, i) => (
            <div key={i} className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 shadow-lg hover:shadow-xl transition-all">
              <div className={cn("absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-[4rem]", event.color)} />
              <div className="flex items-center gap-4 relative z-10">
                <div className={cn("flex flex-col items-center justify-center min-w-[60px] h-[60px] rounded-2xl text-white font-black", event.color)}>
                  <span className="text-[10px] opacity-70 leading-none">{event.date.split(' ')[1]}</span>
                  <span className="text-lg">{event.date.split(' ')[0]}</span>
                </div>
                <div className="space-y-0.5">
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest py-0 border-slate-200">{event.category}</Badge>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase italic truncate">{event.title}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Échéance critique</p>
                </div>
              </div>
            </div>
          ))}
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
                <Card className="rounded-[2.5rem] border-none bg-indigo-600 text-white p-6 overflow-hidden relative group">
                  <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
                    <BrainCircuit className="h-28 w-28" />
                  </div>
                  <CardHeader className="p-0 pb-4">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="h-5 w-5 text-indigo-200" />
                      <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Culture GRC</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    <div className="flex items-baseline justify-between">
                      <p className="text-4xl font-black italic tracking-tighter">A-</p>
                      <Badge className="bg-emerald-500 text-[8px] font-black uppercase">Excellence</Badge>
                    </div>
                    <p className="text-[10px] font-medium leading-relaxed opacity-80 uppercase italic">Niveau d'engagement des collaborateurs : <strong>Très élevé</strong>. 88% des formations terminées.</p>
                    <div className="pt-2">
                      <div className="flex justify-between text-[8px] font-black uppercase mb-1 opacity-60">
                        <span>Score de Sensibilisation</span>
                        <span>88%</span>
                      </div>
                      <div className="h-1 bg-white/20 rounded-full">
                        <div className="h-full bg-white w-[88%] shadow-[0_0_8px_white]" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-bold mb-1">Indice de Culture Conformité</p>
                <p className="text-xs">Mesure l'adhésion et la formation du capital humain.</p>
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
                    <div>
                      <CardTitle className="text-lg font-black font-headline tracking-tight">Répartition GRC Documentaire</CardTitle>
                      <p className="text-xs text-muted-foreground">Volume de preuves par état de validation</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 text-xs font-bold border-primary/20 hover:bg-primary/5 pointer-events-none">
                      Explorer les archives <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-[200px]">
                      {isClient && (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={complianceStatusData} layout="vertical" margin={{ left: -20, right: 40 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="status" type="category" width={120} tick={{ fontSize: 10, fontWeight: 900, fill: 'currentColor' }} />
                            <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                              {complianceStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {complianceStatusData.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.fill }} />
                          <span className="text-[10px] font-black uppercase opacity-60 truncate">{s.status}:</span>
                          <span className="text-xs font-black">{s.value}</span>
                        </div>
                      ))}
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
                  className="shadow-xl overflow-hidden border-none bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 cursor-pointer hover:shadow-primary/10 transition-all"
                  onClick={() => handleCardClick('/regulatory-watch')}
                >
                  <CardHeader className="pb-3 border-b border-primary/5">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-500">
                        <Newspaper className="h-3 w-3" />
                        Intelligence Flux
                      </CardTitle>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={(e) => { e.stopPropagation(); refetchNews(); }}>
                        <RefreshCw className={`h-3 w-3 ${newsLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {news.slice(0, 3).map((item, i) => (
                      <div
                        key={i}
                        onClick={(e) => { e.stopPropagation(); window.open(item.url, '_blank'); }}
                        className="block p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 shadow-sm border border-transparent hover:border-slate-200 transition-all group cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <Badge className="text-[8px] h-4 font-black uppercase bg-primary/10 text-primary border-none shadow-none">{item.source}</Badge>
                          <span className="text-[8px] font-bold opacity-30">{format(parseISO(item.date), 'dd/MM', { locale: fr })}</span>
                        </div>
                        <p className="text-[12px] font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">{item.title}</p>
                      </div>
                    ))}
                    <div
                      onClick={() => router.push('/regulatory-watch')}
                      className="flex items-center text-[10px] font-black uppercase p-0 h-auto tracking-widest text-primary/70 group cursor-pointer hover:text-primary transition-colors"
                    >
                      Flux complet <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
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
