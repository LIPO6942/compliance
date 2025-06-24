
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FilePieChart, Download, Settings2, CalendarDays, BarChart3, Filter, Mail, Share2, CheckCircle as CheckCircleIcon, ShieldAlert, Users, MessageSquareWarning } from "lucide-react"; // Renamed to avoid conflict
import { Label } from "@/components/ui/label";
import { DatePickerWithRange } from "@/components/ui/date-range-picker"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";

// Placeholder for DatePickerWithRange if not already available
// You would typically have this in your ui components folder
const DatePickerWithRangePlaceholder = () => (
  <div className="p-2 border rounded-md text-sm text-muted-foreground">
    Sélectionner une plage de dates
  </div>
);

const ReportTemplateCard = ({ title, description, icon: Icon, onSelect }: { title: string, description: string, icon: React.ElementType, onSelect: () => void }) => (
  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col" onClick={onSelect}>
    <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
        <div className="flex-shrink-0 bg-primary/10 p-3 rounded-lg">
            <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
            <CardTitle className="font-headline text-lg">{title}</CardTitle>
            <CardDescription className="text-xs mt-1">{description}</CardDescription>
        </div>
    </CardHeader>
    <CardContent className="flex-grow"/>
    <CardContent className="pt-0">
        <Button variant="outline" className="w-full text-primary border-primary hover:bg-primary/10">
            Sélectionner ce modèle
        </Button>
    </CardContent>
  </Card>
);


export default function ReportsPage() {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState<string | null>(null);
  const [reportGenerated, setReportGenerated] = React.useState(false);

  const handleGenerateReport = () => {
    if (!selectedReport) {
        // Add toast notification here if available: "Veuillez sélectionner un modèle de rapport."
        console.warn("Please select a report template.");
        return;
    }
    setIsGenerating(true);
    setReportGenerated(false);
    // Simulate report generation
    setTimeout(() => {
      setIsGenerating(false);
      setReportGenerated(true);
      // Add toast notification: "Rapport généré avec succès !"
    }, 2500);
  };

  const reportTemplates = [
    { id: "compliance_summary", title: "Résumé de Conformité Mensuel", description: "Vue d'ensemble des activités et statuts de conformité.", icon: BarChart3 },
    { id: "lab_ft_activity", title: "Rapport d'Activité LAB-FT", description: "Détail des vigilances, alertes et déclarations LAB-FT.", icon: ShieldAlert },
    { id: "training_status", title: "Suivi des Formations", description: "Statut des formations de conformité par employé et département.", icon: Users },
    { id: "incident_report", title: "Analyse des Incidents", description: "Rapport sur les incidents de non-conformité et actions correctives.", icon: MessageSquareWarning },
  ];


  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center">
            <FilePieChart className="mr-3 h-8 w-8 text-primary" />
            Génération de Rapports Automatisés
          </CardTitle>
          <CardDescription className="text-lg">
            Créez, personnalisez et exportez des rapports de conformité pour répondre à vos besoins de reporting internes et externes.
          </CardDescription>
        </CardHeader>
      </Card>

    {!selectedReport && (
         <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="font-headline text-xl">Choisir un Modèle de Rapport</CardTitle>
                <CardDescription>Sélectionnez un modèle pour commencer à configurer votre rapport.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportTemplates.map(template => (
                    <ReportTemplateCard 
                        key={template.id}
                        title={template.title}
                        description={template.description}
                        icon={template.icon}
                        onSelect={() => setSelectedReport(template.id)}
                    />
                ))}
            </CardContent>
        </Card>
    )}


    {selectedReport && (
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline text-xl">Configurer le Rapport: {reportTemplates.find(rt => rt.id === selectedReport)?.title}</CardTitle>
                <CardDescription>Personnalisez les options avant de générer votre rapport.</CardDescription>
            </div>
            <Button variant="link" onClick={() => {setSelectedReport(null); setReportGenerated(false);}} className="text-sm p-0 h-auto">Changer de modèle</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="report-range" className="text-base font-medium mb-2 block">Période du Rapport</Label>
              <DatePickerWithRange /> 
            </div>
            <div>
              <Label htmlFor="report-format" className="text-base font-medium mb-2 block">Format d'Exportation</Label>
              <Select defaultValue="pdf">
                <SelectTrigger id="report-format">
                  <SelectValue placeholder="Choisir un format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="docx">Word (DOCX)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label className="text-base font-medium mb-2 block">Filtres Spécifiques (Optionnel)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md bg-muted/30">
                <Select>
                    <SelectTrigger><SelectValue placeholder="Filtrer par département..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="juridiques">Juridiques</SelectItem>
                        <SelectItem value="finances">Finances</SelectItem>
                        <SelectItem value="comptabilite">Comptabilité</SelectItem>
                        <SelectItem value="sinistres_materiels">Sinistres matériels</SelectItem>
                        <SelectItem value="sinistre_corporel">Sinistre corporel</SelectItem>
                        <SelectItem value="equipements">Equipements</SelectItem>
                        <SelectItem value="rh">RH</SelectItem>
                        <SelectItem value="dsi">DSI</SelectItem>
                        <SelectItem value="audit">Audit</SelectItem>
                        <SelectItem value="organisation">Organisation</SelectItem>
                        <SelectItem value="qualite_vie">Qualité Vie</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="recouvrement">Recouvrement</SelectItem>
                        <SelectItem value="inspection">Inspection</SelectItem>
                    </SelectContent>
                </Select>
                <Select>
                    <SelectTrigger><SelectValue placeholder="Filtrer par type de risque..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="lab_ft">LAB FT</SelectItem>
                        <SelectItem value="protection_donnees">Risque protection de données</SelectItem>
                        <SelectItem value="politique_conformite">Risques politique de conformité</SelectItem>
                        <SelectItem value="non_conformite_commercial">Risque non conformité commercial</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input type="checkbox" id="include-summary" className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
            <Label htmlFor="include-summary" className="text-sm font-normal">Inclure un résumé exécutif</Label>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
           <p className="text-sm text-muted-foreground">
             Le rapport sera basé sur les données jusqu'à la date actuelle.
           </p>
          <Button onClick={handleGenerateReport} disabled={isGenerating} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
            {isGenerating ? (
              <>
                <Settings2 className="mr-2 h-5 w-5 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Download className="mr-2 h-5 w-5" />
                Générer le Rapport
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    )}

      {reportGenerated && (
        <Card className="shadow-lg animate-fadeIn">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center text-green-600">
              <CheckCircleIcon className="mr-2 h-6 w-6" /> {/* Use renamed CheckCircleIcon */}
              Rapport Généré avec Succès !
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Votre rapport "{reportTemplates.find(rt => rt.id === selectedReport)?.title}" est prêt. Vous pouvez le télécharger ou le partager.
            </p>
            <div className="bg-muted/50 p-6 rounded-lg flex flex-col items-center text-center">
                <Image src="https://placehold.co/300x200.png" alt="Report Preview" width={300} height={200} className="rounded-md mb-4 shadow-md" data-ai-hint="compliance" />
                <p className="font-semibold text-lg mb-1">Aperçu du Rapport</p>
                <p className="text-sm text-muted-foreground mb-4">Simulation d'un aperçu. Le document réel sera généré.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button variant="outline" className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10">
                <Download className="mr-2 h-5 w-5" /> Télécharger (PDF)
              </Button>
              <Button variant="outline" className="w-full sm:w-auto">
                <Mail className="mr-2 h-5 w-5" /> Envoyer par Email
              </Button>
               <Button variant="outline" className="w-full sm:w-auto">
                <Share2 className="mr-2 h-5 w-5" /> Partager
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Minimal placeholder for DatePickerWithRange component if it's not part of shadcn/ui by default.
// In a real scenario, you'd install or create a proper date range picker.
// For this task, this placeholder suffices.
// Ensure you create `src/components/ui/date-range-picker.tsx` if you need a functional one.
