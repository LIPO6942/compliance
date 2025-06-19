"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { compliancePlanData } from "@/data/compliancePlan";
import type { ComplianceCategory, ComplianceSubCategory, ComplianceTask } from "@/types/compliance";
import { CheckSquare, ListTodo } from "lucide-react";

export default function PlanPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Plan d'Organisation de la Conformité</CardTitle>
          <CardDescription className="text-lg">
            Structure détaillée des tâches du département conformité, organisée par catégories fonctionnelles et sous-catégories.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-muted-foreground">
            Ce plan sert de référence pour l'organisation des activités de conformité et peut être utilisé pour élaborer un tableau de bord de suivi. Chaque section détaille les responsabilités et les actions concrètes à mener.
          </p>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="w-full space-y-4">
        {compliancePlanData.map((category: ComplianceCategory) => (
          <AccordionItem key={category.id} value={category.id} className="bg-card border border-border rounded-lg shadow-md overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-3">
                <category.icon className="h-6 w-6 text-primary" />
                <span className="text-xl font-headline font-medium">{category.name}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pt-0 pb-6">
              <div className="space-y-4 mt-4">
                {category.subCategories.map((subCategory: ComplianceSubCategory) => (
                  <Card key={subCategory.id} className="bg-background/50 shadow-sm">
                    <CardHeader className="pb-3 pt-4 px-4">
                      <CardTitle className="text-lg font-medium font-headline flex items-center">
                        {subCategory.icon ? <subCategory.icon className="h-5 w-5 mr-2 text-accent" /> : <ListTodo className="h-5 w-5 mr-2 text-accent" />}
                        {subCategory.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <ul className="space-y-2 list-inside">
                        {subCategory.tasks.map((task: ComplianceTask) => (
                          <li key={task.id} className="flex items-start text-sm text-muted-foreground">
                            <CheckSquare className="h-4 w-4 mr-2 mt-0.5 text-primary flex-shrink-0" />
                            <span>{task.name} {task.description && `- ${task.description}`}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
