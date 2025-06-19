
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BellRing } from "lucide-react";

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center">
            <BellRing className="mr-3 h-8 w-8 text-primary" />
            Centre d'Alertes
          </CardTitle>
          <CardDescription className="text-lg">
            Consultez ici toutes les alertes et notifications importantes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aucune nouvelle alerte pour le moment.
          </p>
          {/* TODO: Placeholder for future alert list and management */}
        </CardContent>
      </Card>
    </div>
  );
}
