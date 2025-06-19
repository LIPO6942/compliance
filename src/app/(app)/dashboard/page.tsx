"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Bell, CheckCircle, FileText, ShieldAlert, Users, Target, Lightbulb, Activity, HelpCircle } from "lucide-react";
import Image from "next/image";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"

const complianceStatusData = [
  { status: "Conforme", value: 85, fill: "hsl(var(--chart-1))" },
  { status: "En Cours", value: 10, fill: "hsl(var(--chart-4))" },
  { status: "Non Conforme", value: 5, fill: "hsl(var(--destructive))" },
];

const chartConfig = {
  value: {
    label: "Pourcentage",
  },
  conforme: {
    label: "Conforme",
    color: "hsl(var(--chart-1))",
  },
  enCours: {
    label: "En Cours",
    color: "hsl(var(--chart-4))",
  },
  nonConforme: {
    label: "Non Conforme",
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig

const taskProgressData = [
  { name: 'LAB-FT', completed: 30, pending: 10, overdue: 2 },
  { name: 'Veille Reg.', completed: 45, pending: 5, overdue: 1 },
  { name: 'Contrôles', completed: 20, pending: 15, overdue: 3 },
  { name: 'Formation', completed: 50, pending: 2, overdue: 0 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tâches Actives</CardTitle>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-headline">12</div>
            <p className="text-xs text-muted-foreground pt-1">Dont 3 en retard</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertes Récentes</CardTitle>
            <Bell className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-headline">5</div>
            <p className="text-xs text-muted-foreground pt-1">Nouvelles réglementations identifiées</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Niveau de Conformité Global</CardTitle>
            <Target className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-headline text-green-600">92%</div>
            <p className="text-xs text-muted-foreground pt-1">Basé sur les derniers contrôles</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Statut de Conformité</CardTitle>
            <CardDescription>Répartition des éléments de conformité par statut.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="status" />} />
                <Pie data={complianceStatusData} dataKey="value" nameKey="status" innerRadius={60} outerRadius={80} cy="50%">
                   {complianceStatusData.map((entry) => (
                    <Cell key={`cell-${entry.status}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="status" />} className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center" />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Progression des Tâches par Domaine</CardTitle>
            <CardDescription>Suivi des tâches complétées, en attente et en retard.</CardDescription>
          </CardHeader>
          <CardContent className="h-[340px]">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskProgressData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="name" tick={{fontSize: 12}}/>
                <YAxis tick={{fontSize: 12}} />
                <Tooltip contentStyle={{backgroundColor: 'hsl(var(--background))', borderRadius: 'var(--radius)', borderColor: 'hsl(var(--border))'}} labelStyle={{color: 'hsl(var(--foreground))', fontWeight: 'bold'}}/>
                <Legend wrapperStyle={{fontSize: 12}}/>
                <Bar dataKey="completed" stackId="a" fill="hsl(var(--chart-1))" name="Complétées" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" stackId="a" fill="hsl(var(--chart-4))" name="En Attente" />
                <Bar dataKey="overdue" stackId="a" fill="hsl(var(--destructive))" name="En Retard" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
                src="https://placehold.co/600x400.png"
                alt="Organizational Plan Illustration"
                width={600}
                height={400}
                className="object-cover w-full h-full max-h-[300px] md:max-h-none"
                data-ai-hint="compliance organization"
              />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <QuickAccessCard
          icon={ShieldAlert}
          title="Veille Réglementaire IA"
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
          icon={Users}
          title="Formations et Sensibilisation"
          description="Suivez les programmes de formation et les actions de sensibilisation."
          href="/plan" // Assuming formation is part of plan page for now
          actionText="Voir les Formations"
        />
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <Lightbulb className="mr-2 h-6 w-6 text-primary" />
            Astuce du Jour
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Pensez à revoir votre cartographie des risques au moins une fois par an, et après chaque changement réglementaire majeur.
          </p>
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
