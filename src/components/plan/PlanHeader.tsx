
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, RefreshCw } from "lucide-react";
import { usePlanData } from "@/contexts/PlanDataContext";
import { useToast } from "@/hooks/use-toast";

interface PlanHeaderProps {
  onAddCategory: () => void;
}

export function PlanHeader({ onAddCategory }: PlanHeaderProps) {
  const { resetToInitialData } = usePlanData();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await resetToInitialData();
      toast({
        title: "Données synchronisées",
        description: "Le plan de conformité a été remis à jour avec les derniers standards.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur de synchronisation",
        description: "Une erreur est survenue lors de la mise à jour des données.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="font-headline text-3xl">Plan d'Organisation de la Conformité</CardTitle>
            <CardDescription className="text-lg mt-1">
              Structure complète des tâches et responsabilités.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSync} disabled={isSyncing} className="whitespace-nowrap">
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Synchronisation..." : "Synchroniser"}
            </Button>
            <Button onClick={onAddCategory} className="whitespace-nowrap">
              <PlusCircle className="mr-2 h-5 w-5" /> Catégorie
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Ce plan sert de référence pour l'organisation des activités de conformité. Vous pouvez ajouter, modifier ou supprimer des éléments.
        </p>
      </CardContent>
    </Card>
  );
}
