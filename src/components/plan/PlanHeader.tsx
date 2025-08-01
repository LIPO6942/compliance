
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface PlanHeaderProps {
  onAddCategory: () => void;
}

export function PlanHeader({ onAddCategory }: PlanHeaderProps) {
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
              <Button onClick={onAddCategory} className="whitespace-nowrap">
                  <PlusCircle className="mr-2 h-5 w-5" /> Catégorie
              </Button>
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
