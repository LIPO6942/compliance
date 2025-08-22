
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Bell, CheckCircle, FileText, ShieldAlert, Users, Target, Lightbulb, Activity, HelpCircle, Map, Newspaper, RefreshCw } from "lucide-react";
import Image from "next/image";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { usePlanData } from "@/contexts/PlanDataContext";
import { useDocuments } from "@/contexts/DocumentsContext";
import { useIdentifiedRegulations } from "@/contexts/IdentifiedRegulationsContext";
import type { ComplianceCategory, ComplianceTask, Document, DocumentStatus, NewsItem } from "@/types/compliance";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/icons/Logo";
import { useNews } from "@/contexts/NewsContext";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";


const complianceStatusBaseColors = {
  conforme: "hsl(var(--chart-1))",
  enCours: "hsl(var(--chart-4))",
  nonConforme: "hsl(var(--destructive))",
  aucuneDonnee: "hsl(var(--muted))",
};

const initialChartConfig: ChartConfig = {
  value: {
    label: "Pourcentage",
  },
  conforme: {
    label: "Conforme",
    color: complianceStatusBaseColors.conforme,
  },
  enCours: {
    label: "En Cours",
    color: complianceStatusBaseColors.enCours,
  },
  nonConforme: {
    label: "Non Conforme",
    color: complianceStatusBaseColors.nonConforme,
  },
  aucuneDonnee: {
    label: "Aucune Donnée",
    color: complianceStatusBaseColors.aucuneDonnee,
  }
} satisfies ChartConfig


export default function DashboardPage() {
  const { planData } = usePlanData();
  const { documents } = useDocuments();
  const { identifiedRegulations } = useIdentifiedRegulations();
  const { news, loading: newsLoading, refetchNews } = useNews();
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();

  const [activeTasksCount, setActiveTasksCount] = React.useState(0);
  const [overdueTasksCount, setOverdueTasksCount] = React.useState(0);
  const [overallCompliancePercentage, setOverallCompliancePercentage] = React.useState(0);
  const [complianceStatusData, setComplianceStatusData] = React.useState<Array<{status: string; value: number; fill: string, id: DocumentStatus | "none"}>>([]);
  const [taskProgressData, setTaskProgressData] = React.useState<Array<{id: string; name: string; completed: number; pending: number; overdue: number}>>([]);
  const [newAlertsCount, setNewAlertsCount] = React.useState(0);
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);


  React.useEffect(() => {
    if (planData && documents && identifiedRegulations) {
      const allTasks = planData.flatMap(category => category.subCategories.flatMap(subCategory => subCategory.tasks));
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

      let newComplianceStatusData: Array<{status: string; value: number; fill: string, id: DocumentStatus | "none"}> = [];
      if (totalRelevantDocsForPie > 0) {
        newComplianceStatusData = [
          { status: "Conforme", value: Math.round((conformeCount / totalRelevantDocsForPie) * 100), fill: complianceStatusBaseColors.conforme, id: "Validé" },
          { status: "En Cours", value: Math.round((enCoursCount / totalRelevantDocsForPie) * 100), fill: complianceStatusBaseColors.enCours, id: "En Révision" },
          { status: "Non Conforme", value: Math.round((nonConformeCount / totalRelevantDocsForPie) * 100), fill: complianceStatusBaseColors.nonConforme, id: "Obsolète" },
        ].filter(item => item.value > 0);
      }
      
      if (newComplianceStatusData.length === 0) {
        newComplianceStatusData.push(
            { status: "Aucune Donnée", value: 100, fill: complianceStatusBaseColors.aucuneDonnee, id: "none" }
        );
      }
      setComplianceStatusData(newComplianceStatusData);

      const newTaskProgressData = planData.map(category => {
        const categoryTasks = category.subCategories.flatMap(sub => sub.tasks);
        const completed = categoryTasks.filter(task => task.completed).length;
        const overdue = categoryTasks.filter(task => !task.completed && task.deadline && new Date(task.deadline) < now).length;
        const pending = categoryTasks.filter(task => !task.completed).length - overdue;
        
        return {
          id: category.id,
          name: category.name.length > 25 ? category.name.substring(0, 22) + "..." : category.name,
          completed,
          pending,
          overdue,
        };
      });
      setTaskProgressData(newTaskProgressData);

      setNewAlertsCount(identifiedRegulations.filter(reg => reg.status === 'Nouveau').length);
      
      setIsLoading(false);
    }
  }, [planData, documents, identifiedRegulations]);

  const handlePieClick = (data: any) => {
    if (data && data.id && data.id !== 'none') {
        router.push(`/documents?status=${data.id}`);
    }
  };

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const categoryId = data.activePayload[0].payload.id;
      if (categoryId) {
        router.push(`/plan#${categoryId}`);
      }
    }
  };

  const newsSourceColors: Record<NewsItem['source'], string> = {
    CGA: 'bg-blue-600 hover:bg-blue-700',
    JORT: 'bg-green-600 hover:bg-green-700',
    GAFI: 'bg-gray-700 hover:bg-gray-800',
    OFAC: 'bg-red-600 hover:bg-red-700',
    UE: 'bg-indigo-600 hover:bg-indigo-700',
    NewsAPI: 'bg-sky-600 hover:bg-sky-700',
    GNews: 'bg-emerald-600 hover:bg-emerald-700',
    MarketAux: 'bg-orange-600 hover:bg-orange-700',
    Autre: 'bg-gray-500 hover:bg-gray-600',
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Logo className="h-12 w-12 animate-spin" />
        <p className="ml-4 text-lg text-muted-foreground">Chargement du tableau de bord...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/plan" className="block">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tâches Actives</CardTitle>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">{activeTasksCount}</div>
              <p className="text-xs text-muted-foreground pt-1">
                {overdueTasksCount > 0 ? <span className="text-destructive font-medium">Dont {overdueTasksCount} en retard</span> : "Aucune tâche en retard"}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/alerts" className="block">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 hover:ring-2 hover:ring-primary cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertes Récentes</CardTitle>
              <Bell className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">{newAlertsCount}</div>
              <p className="text-xs text-muted-foreground pt-1">Nouvelle{newAlertsCount === 1 ? "" : "s"} alerte{newAlertsCount === 1 ? "" : "s"} à analyser</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/documents?status=Validé" className="block">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Niveau de Conformité Global</CardTitle>
              <Target className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold font-headline ${overallCompliancePercentage >= 80 ? 'text-green-600' : overallCompliancePercentage >=50 ? 'text-yellow-500' : 'text-red-600'}`}>
                  {overallCompliancePercentage}%
              </div>
              <p className="text-xs text-muted-foreground pt-1">Basé sur les documents validés</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Statut de Conformité Documentaire</CardTitle>
            <CardDescription>Répartition des documents par statut. Cliquez sur une section pour filtrer.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] w-full">
            {isClient ? (
              <ChartContainer config={initialChartConfig} className="mx-auto aspect-square max-h-[250px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="status" />} />
                  <Pie data={complianceStatusData} dataKey="value" nameKey="status" innerRadius={50} outerRadius={70} cy="50%" onClick={handlePieClick} className="cursor-pointer">
                     {complianceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}-${entry.status}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="status" />} className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center" />
                </PieChart>
              </ChartContainer>
            ) : (
               <div className="mx-auto flex h-full items-center justify-center">
                  <Logo className="h-10 w-10 animate-spin" />
               </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Progression des Tâches par Domaine</CardTitle>
            <CardDescription>Suivi des tâches complétées, en attente et en retard. Cliquez sur une barre pour voir les détails.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
             {isClient ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taskProgressData} margin={{ top: 5, right: 20, left: 0, bottom: 70 }} onClick={handleBarClick} className="cursor-pointer">
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="name" tick={{fontSize: 12}} angle={-45} textAnchor="end" interval={0} height={80} />
                    <YAxis tick={{fontSize: 12}} allowDecimals={false} />
                    <Tooltip contentStyle={{backgroundColor: 'hsl(var(--background))', borderRadius: 'var(--radius)', borderColor: 'hsl(var(--border))'}} labelStyle={{color: 'hsl(var(--foreground))', fontWeight: 'bold'}}/>
                    <Legend wrapperStyle={{fontSize: 12, paddingTop: 20}}/>
                    <Bar dataKey="completed" stackId="a" fill="hsl(var(--chart-1))" name="Complétées" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending" stackId="a" fill="hsl(var(--chart-4))" name="En Attente" />
                    <Bar dataKey="overdue" stackId="a" fill="hsl(var(--destructive))" name="En Retard" />
                  </BarChart>
                </ResponsiveContainer>
             ) : (
                <div className="flex h-full items-center justify-center">
                    <Logo className="h-10 w-10 animate-spin" />
                </div>
             )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/2 p-6 flex flex-col justify-center">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="font-headline text-2xl">Plan d'Organisation Détaillé</CardTitle>
              <CardDescription>Accédez à la structure complète des tâches et responsabilités de votre département conformité.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-muted-foreground mb-6">
                Visualisez les catégories fonctionnelles, les sous-catégories détaillées et les exemples de tâches concrètes pour une meilleure organisation et un suivi efficace.
              </p>
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/plan">
                  Consulter le Plan <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </CardContent>
          </div>
          <div className="md:w-1/2 bg-muted/40">
             <Image
                src="https://images.unsplash.com/photo-1544654262-e295983be0f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyMHx8b3JnYW5pc2F0aW9ufGVufDB8fHx8MTc1MDM2NzQ1NXww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Organizational Plan Illustration"
                width={600}
                height={400}
                className="object-cover w-full h-full max-h-[300px] md:max-h-none"
                data-ai-hint="compliance plan"
              />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <QuickAccessCard
          icon={ShieldAlert}
          title="Assistance Conformité IA"
          description="Analysez les nouvelles réglementations avec l'IA et gérez leur intégration."
          href="/regulatory-watch"
          actionText="Analyser une Réglementation"
        />
        <QuickAccessCard
          icon={FileText}
          title="Gestion Documentaire"
          description="Centralisez et gérez tous vos documents de conformité."
          href="/documents"
          actionText="Accéder aux Documents"
        />
        <QuickAccessCard
          icon={Map}
          title="Cartographie des Risques"
          description="Identifiez, évaluez et suivez les risques de non-conformité au sein de votre organisation."
          href="/risk-mapping"
          actionText="Consulter la Cartographie"
        />
      </div>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="font-headline flex items-center">
            <Newspaper className="mr-2 h-6 w-6 text-primary" />
            Fil d'Actualité Conformité
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={refetchNews} disabled={newsLoading}>
             <RefreshCw className={`h-5 w-5 ${newsLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
           {newsLoading ? (
            <p className="text-muted-foreground">Chargement des actualités...</p>
          ) : (
            <ul className="space-y-4">
              {news.slice(0, 5).map((item: NewsItem) => (
                <li key={item.id} className="flex items-start gap-4 group">
                  <div className="flex-shrink-0 pt-1">
                    <Badge className={`w-[80px] justify-center text-white ${newsSourceColors[item.source]}`}>{item.source}</Badge>
                  </div>
                  <div>
                    <a href={item.url || '#'} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm leading-tight group-hover:underline">{item.title}</a>
                    <p className="text-xs text-muted-foreground mt-0.5">{format(parseISO(item.date), "d MMMM yyyy", { locale: fr })}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <HelpCircle className="mr-2 h-6 w-6 text-accent" />
            Besoin d'Aide ?
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <p className="text-muted-foreground flex-1">
            Consultez notre base de connaissance ou contactez le support pour toute question relative à Compliance Navigator.
          </p>
          <Button variant="outline" className="border-accent text-accent hover:bg-accent/10 hover:text-accent">
            Contacter le Support
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}

interface QuickAccessCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  actionText: string;
}

function QuickAccessCard({ icon: Icon, title, description, href, actionText }: QuickAccessCardProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <Icon className="h-8 w-8 text-primary" />
          <CardTitle className="font-headline text-xl">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      </CardContent>
      <CardContent className="pt-0">
        <Button asChild variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
          <Link href={href}>
            {actionText} <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
