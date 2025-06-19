
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BellRing, Eye, Archive, CheckCircle, Tag, Info, FileText, AlertTriangle } from "lucide-react";
import { useIdentifiedRegulations } from "@/contexts/IdentifiedRegulationsContext";
import type { IdentifiedRegulation, IdentifiedRegulationStatus } from "@/types/compliance";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const statusColors: Record<IdentifiedRegulationStatus, string> = {
  "Nouvelle": "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-800/30 dark:text-blue-300 dark:border-blue-700",
  "Revue": "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-800/30 dark:text-yellow-300 dark:border-yellow-700",
  "Archivée": "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/30 dark:text-gray-400 dark:border-gray-600",
};

const statusIcons: Record<IdentifiedRegulationStatus, React.ElementType> = {
  "Nouvelle": BellRing,
  "Revue": Eye,
  "Archivée": Archive,
};

export default function AlertsPage() {
  const { identifiedRegulations, updateRegulationStatus } = useIdentifiedRegulations();
  const { toast } = useToast();
  const [activeAccordionItem, setActiveAccordionItem] = React.useState<string | undefined>(undefined);


  const handleUpdateStatus = (id: string, newStatus: IdentifiedRegulationStatus) => {
    updateRegulationStatus(id, newStatus);
    toast({
      title: "Statut de l'alerte modifié",
      description: `L'alerte a été marquée comme "${newStatus}".`,
    });
  };

  const newAlerts = identifiedRegulations.filter(alert => alert.status === 'Nouvelle');
  const reviewedAlerts = identifiedRegulations.filter(alert => alert.status === 'Revue');
  const archivedAlerts = identifiedRegulations.filter(alert => alert.status === 'Archivée');

  const AlertCard = ({ alert }: { alert: IdentifiedRegulation }) => {
    const StatusIcon = statusIcons[alert.status] || AlertTriangle;
    return (
       <AccordionItem value={alert.id} className="border-b-0">
        <Card className="shadow-md mb-4 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-muted/30 [&[data-state=open]>svg]:text-primary">
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                    <StatusIcon className={`mr-3 h-6 w-6 text-${alert.status === 'Nouvelle' ? 'primary' : alert.status === 'Revue' ? 'yellow-500' : 'gray-500'}`} />
                    <div className="text-left">
                        <CardTitle className="text-lg font-headline">
                            Réglementation Identifiée: {new Date(alert.timestamp).toLocaleDateString('fr-FR')}
                        </CardTitle>
                        <CardDescription className="text-xs">
                           {alert.regulationTextSummary}
                        </CardDescription>
                    </div>
                </div>
                <Badge variant="outline" className={`ml-auto mr-2 text-xs px-2.5 py-1 ${statusColors[alert.status]}`}>
                    {alert.status}
                </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-0">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-1 flex items-center"><Info className="w-4 h-4 mr-2 text-muted-foreground"/>Raison de l'inclusion :</h4>
                <p className="text-sm text-muted-foreground pl-6">{alert.inclusionDecision.reason}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1 flex items-center"><FileText className="w-4 h-4 mr-2 text-muted-foreground"/>Mots-clés utilisés :</h4>
                <p className="text-sm text-muted-foreground pl-6">{alert.keywordsUsed}</p>
              </div>
              {alert.categorizationSuggestions && (
                <div>
                  <h4 className="font-semibold text-sm mb-1 flex items-center"><Tag className="w-4 h-4 mr-2 text-muted-foreground"/>Suggestions de Catégorisation IA :</h4>
                  {alert.categorizationSuggestions.suggestedCategories.length > 0 && (
                    <div className="pl-6 mb-2">
                      <p className="text-xs font-medium text-muted-foreground">Catégories :</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {alert.categorizationSuggestions.suggestedCategories.map((cat, idx) => (
                          <Badge key={`cat-${idx}`} variant="secondary" className="text-xs">{cat}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {alert.categorizationSuggestions.suggestedSubCategories.length > 0 && (
                     <div className="pl-6">
                      <p className="text-xs font-medium text-muted-foreground">Sous-catégories :</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {alert.categorizationSuggestions.suggestedSubCategories.map((subcat, idx) => (
                          <Badge key={`subcat-${idx}`} variant="outline" className="text-xs">{subcat}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {(alert.categorizationSuggestions.suggestedCategories.length === 0 && alert.categorizationSuggestions.suggestedSubCategories.length === 0) && (
                    <p className="text-sm text-muted-foreground pl-6">Aucune suggestion de catégorie par l'IA.</p>
                  )}
                </div>
              )}
            </div>
          </AccordionContent>
          <CardFooter className="bg-muted/30 py-3 px-6 flex justify-end gap-2 border-t">
            {alert.status === 'Nouvelle' && (
              <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(alert.id, 'Revue')}>
                <Eye className="mr-2 h-4 w-4" /> Marquer comme Revue
              </Button>
            )}
            {alert.status === 'Revue' && (
              <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(alert.id, 'Nouvelle')}>
                <BellRing className="mr-2 h-4 w-4" /> Marquer comme Nouvelle
              </Button>
            )}
            {alert.status !== 'Archivée' && (
              <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(alert.id, 'Archivée')} className="text-muted-foreground hover:text-accent-foreground">
                <Archive className="mr-2 h-4 w-4" /> Archiver
              </Button>
            )}
             {alert.status === 'Archivée' && (
              <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(alert.id, 'Nouvelle')} className="text-muted-foreground hover:text-accent-foreground">
                <BellRing className="mr-2 h-4 w-4" /> Réactiver (Nouvelle)
              </Button>
            )}
          </CardFooter>
        </Card>
      </AccordionItem>
    );
  };


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center">
            <BellRing className="mr-3 h-8 w-8 text-primary" />
            Centre d'Alertes Réglementaires
          </CardTitle>
          <CardDescription className="text-lg">
            Consultez et gérez les nouvelles réglementations identifiées par l'IA.
          </CardDescription>
        </CardHeader>
      </Card>

      {identifiedRegulations.length === 0 ? (
         <Card className="shadow-md">
            <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-8">
                    Aucune alerte réglementaire pour le moment.
                </p>
            </CardContent>
        </Card>
      ) : (
        <Accordion 
            type="single" 
            collapsible 
            className="w-full space-y-0"
            value={activeAccordionItem}
            onValueChange={setActiveAccordionItem}
        >
          {newAlerts.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-primary flex items-center"><BellRing className="h-5 w-5 mr-2"/>Nouvelles Alertes ({newAlerts.length})</h2>
              {newAlerts.map(alert => <AlertCard key={alert.id} alert={alert} />)}
            </div>
          )}

          {reviewedAlerts.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-yellow-600 flex items-center"><Eye className="h-5 w-5 mr-2"/>Alertes Revues ({reviewedAlerts.length})</h2>
              {reviewedAlerts.map(alert => <AlertCard key={alert.id} alert={alert} />)}
            </div>
          )}

          {archivedAlerts.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3 text-gray-600 flex items-center"><Archive className="h-5 w-5 mr-2"/>Alertes Archivées ({archivedAlerts.length})</h2>
              {archivedAlerts.map(alert => <AlertCard key={alert.id} alert={alert} />)}
            </div>
          )}
        </Accordion>
      )}
    </div>
  );
}
