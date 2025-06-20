
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Image from "next/image";
import { Users, BarChart2, CalendarDays, BookOpen, AlertTriangle, CheckCircle, Percent, ListChecks, Megaphone, Send } from "lucide-react";

const kpiData = [
  { title: "Taux de couverture (obligatoire)", value: 85, target: 95, unit: "%", icon: Percent },
  { title: "Nombre de sessions réalisées (Année)", value: 42, unit: "sessions", icon: CalendarDays },
  { title: "Taux de participation moyen", value: 78, unit: "%", icon: Users },
  { title: "Taux de réussite aux évaluations", value: 92, unit: "%", icon: CheckCircle },
];

const specificSensitizationData = [
    { name: "LAB-FT", rate: 90, icon: ShieldAlert},
    { name: "RGPD", rate: 88, icon: FileText},
    { name: "Déontologie", rate: 95, icon: GavelIcon},
    { name: "Cybersécurité", rate: 82, icon: ShieldCheckIcon}
];

const upcomingSessions = [
  { id: "sess001", title: "Formation LAB-FT (Recyclage)", date: "2024-09-15", type: "Obligatoire", department: "Tous" },
  { id: "sess002", title: "Nouveautés RGPD et Impact Opérationnel", date: "2024-10-05", type: "Recommandée", department: "Marketing, IT" },
  { id: "sess003", title: "Sensibilisation à la Déontologie Financière", date: "2024-11-20", type: "Obligatoire", department: "Finance, Vente" },
];

const trainingRegistryMock = [
  { id: "reg001", title: "Principes Fondamentaux de la LAB-FT", objective: "Comprendre les mécanismes de LCB-FT et les obligations réglementaires.", duration: "2h", support: "Présentation PPT, Quiz", lastUpdated: "2024-06-01" },
  { id: "reg002", title: "Application du RGPD en Entreprise", objective: "Maîtriser les règles de protection des données personnelles.", duration: "3h", support: "Vidéo, Études de cas", lastUpdated: "2024-05-15" },
  { id: "reg003", title: "Code de Conduite et Éthique Professionnelle", objective: "Adopter les bons comportements et respecter les règles déontologiques.", duration: "1.5h", support: "Manuel, Scénarios", lastUpdated: "2024-07-01" },
];

const campaignsMock = [
    { id: "camp001", name: "Campagne Phishing - Q3", status: "En cours", launchDate: "2024-07-10", target: "Tous les employés", icon: AlertTriangle },
    { id: "camp002", name: "Rappel bonnes pratiques mots de passe", status: "Planifiée", launchDate: "2024-08-01", target: "Tous les employés", icon: KeyRoundIcon },
    { id: "camp003", name: "Journée de la Protection des Données", status: "Terminée", launchDate: "2024-01-28", target: "Tous les employés", icon: CheckCircle }
];


export default function TrainingPage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center">
            <Users className="mr-3 h-8 w-8 text-primary" />
            Formations et Sensibilisation
          </CardTitle>
          <CardDescription className="text-lg">
            Suivez, planifiez et gérez toutes les initiatives de formation et de sensibilisation à la conformité.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Section 1: Indicateurs de Suivi */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <BarChart2 className="mr-2 h-6 w-6 text-primary" />
            Indicateurs de Suivi (KPIs)
          </CardTitle>
          <CardDescription>Aperçu de la performance des programmes de formation et de sensibilisation.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {kpiData.map((kpi) => (
            <Card key={kpi.title} className="flex flex-col justify-between">
              <CardHeader className="pb-2">
                 <div className="flex items-center justify-between">
                    <CardDescription className="text-sm">{kpi.title}</CardDescription>
                    <kpi.icon className="h-5 w-5 text-muted-foreground" />
                 </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-headline">{kpi.value}{kpi.unit}</div>
                {kpi.target && <p className="text-xs text-muted-foreground pt-1">Objectif: {kpi.target}{kpi.unit}</p>}
                <Progress value={kpi.target ? (kpi.value / kpi.target) * 100 : kpi.value} className="mt-2 h-2" />
              </CardContent>
            </Card>
          ))}
        </CardContent>
        <CardContent>
            <h3 className="text-md font-semibold mb-3 text-muted-foreground">Taux de sensibilisation par thématique :</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {specificSensitizationData.map(item => (
                    <Card key={item.name} className="bg-muted/30">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{item.name}</CardTitle>
                            <item.icon className="h-4 w-4 text-muted-foreground"/>
                        </CardHeader>
                        <CardContent>
                             <div className="text-2xl font-bold">{item.rate}%</div>
                             <Progress value={item.rate} className="mt-1 h-1.5" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </CardContent>
      </Card>

      {/* Section 2: Planning et Campagnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
              <CalendarDays className="mr-2 h-6 w-6 text-primary" />
              Planning des Formations
            </CardTitle>
            <CardDescription>Calendrier des sessions à venir et options de gestion.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 border rounded-md bg-blue-50 dark:bg-blue-900/20">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    <span className="font-semibold">Fonctionnalité à venir :</span> Un calendrier interactif sera bientôt disponible ici pour une gestion visuelle des sessions.
                </p>
            </div>
            <h4 className="font-semibold mb-2 text-muted-foreground">Prochaines Sessions :</h4>
            <div className="space-y-3 max-h-60 overflow-y-auto">
                {upcomingSessions.map(session => (
                    <div key={session.id} className="p-3 border rounded-md hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-start">
                            <h5 className="font-medium">{session.title}</h5>
                            <Badge variant={session.type === "Obligatoire" ? "destructive" : "secondary" } className="text-xs">{session.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Date: {session.date} | Département(s): {session.department}</p>
                    </div>
                ))}
            </div>
            <Button variant="outline" className="mt-4 w-full">Voir tout le planning</Button>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
              <Megaphone className="mr-2 h-6 w-6 text-primary" />
              Campagnes de Sensibilisation
            </CardTitle>
            <CardDescription>Suivi des campagnes en cours et planifiées.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                {campaignsMock.map(campaign => (
                    <Card key={campaign.id} className="shadow-sm">
                        <CardHeader className="p-3 flex flex-row items-start justify-between">
                             <div>
                                <h4 className="font-semibold text-sm">{campaign.name}</h4>
                                <p className="text-xs text-muted-foreground">Lancée le: {campaign.launchDate} | Cible: {campaign.target}</p>
                             </div>
                             <Badge variant={campaign.status === "En cours" ? "default" : campaign.status === "Planifiée" ? "outline" : "secondary"} className={`capitalize text-xs ${campaign.status === "En cours" ? "bg-yellow-500 text-white" : ""}`}>
                                <campaign.icon className="h-3 w-3 mr-1.5"/>
                                {campaign.status}
                             </Badge>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                             {campaign.status === "En cours" && <Button size="sm" variant="outline" className="w-full"><Send className="h-4 w-4 mr-2"/>Envoyer un rappel</Button>}
                             {campaign.status === "Planifiée" && <Button size="sm" variant="ghost" className="w-full text-primary">Configurer la campagne</Button>}
                             {campaign.status === "Terminée" && <Button size="sm" variant="link" className="w-full">Voir les résultats</Button>}
                        </CardContent>
                    </Card>
                ))}
             </div>
             <Button className="mt-4 w-full bg-primary hover:bg-primary/90">
                <PlusCircleIcon className="mr-2 h-5 w-5" /> Lancer une nouvelle campagne
             </Button>
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Registre des Formations */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <BookOpen className="mr-2 h-6 w-6 text-primary" />
            Registre des Formations
          </CardTitle>
          <CardDescription>Catalogue des formations disponibles, traçabilité et gestion des contenus.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="mb-4 flex justify-end">
                <Button><ListChecks className="mr-2 h-4 w-4"/>Gérer le Registre</Button>
            </div>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[300px]">Titre de la Formation</TableHead>
                  <TableHead>Objectif</TableHead>
                  <TableHead className="text-center">Durée</TableHead>
                  <TableHead>Support</TableHead>
                  <TableHead className="text-right">Dernière MàJ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainingRegistryMock.slice(0,3).map((training) => (
                  <TableRow key={training.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{training.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{training.objective}</TableCell>
                    <TableCell className="text-center text-xs">{training.duration}</TableCell>
                    <TableCell className="text-xs">{training.support}</TableCell>
                    <TableCell className="text-right text-xs">{training.lastUpdated}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
           <div className="mt-4 text-sm text-muted-foreground">
                <p><span className="font-semibold">Traçabilité :</span> Le système assure un suivi complet de qui a suivi quelle formation, quand, et avec quels résultats (consultable dans la section de gestion du registre).</p>
                <p><span className="font-semibold">Mise à jour des contenus :</span> Les contenus de formation sont revus et mis à jour annuellement ou dès qu'une évolution réglementaire majeure l'exige.</p>
            </div>
        </CardContent>
      </Card>

        <Card className="shadow-md overflow-hidden">
            <div className="md:flex">
                <div className="md:w-1/2 p-6 flex flex-col justify-center">
                    <CardHeader className="p-0 pb-4">
                        <CardTitle className="font-headline text-2xl">Culture de Conformité Robuste</CardTitle>
                        <CardDescription>Investir dans la formation, c'est investir dans la sécurité et la pérennité de votre entreprise.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                    <p className="text-muted-foreground mb-6">
                        Des employés bien formés sont la première ligne de défense contre les risques de non-conformité.
                    </p>
                    </CardContent>
                </div>
                <div className="md:w-1/2">
                    <Image
                        src="https://placehold.co/600x300.png"
                        alt="Compliance Training Illustration"
                        width={600}
                        height={300}
                        className="object-cover w-full h-full max-h-[250px] md:max-h-none"
                        data-ai-hint="compliance training"
                    />
                </div>
            </div>
      </Card>
    </div>
  );
}

// Helper components for icons used in mock data, if not directly available or for specific styling
const ShieldAlert = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
);
const GavelIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9"/><path d="m15 13 6-6"/><path d="m11 9 6-6"/><path d="m8 8 3-3"/><path d="m16 11 3-3"/></svg>
);
const ShieldCheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
);
const KeyRoundIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/><circle cx="16.5" cy="7.5" r=".5"/></svg>
);
const PlusCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
);
const FileText = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
);

