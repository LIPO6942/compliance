"use client";

import React, { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityRequirement, DocumentItem } from "@/data/requirements";
import * as Icons from "lucide-react";
import { ShieldCheck, Info, CheckCircle2, FileText, Settings, Plus, Trash2 } from "lucide-react";
import { useRequirements } from "@/contexts/RequirementsContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActivityLog } from "@/contexts/ActivityLogContext";

const alertTypes = [
  "Alerte Fraude Documentaire",
  "Alerte Non-Conformité",
  "Alerte Expiration",
  "Alerte Signature",
  "Alerte Données"
];

export function ComplianceGuide() {
  const { requirements, updateDocument } = useRequirements();
  const { logAction } = useActivityLog();
  const [activeCategory, setActiveCategory] = useState<string>("physique");
  const [isEditingMode, setIsEditingMode] = useState<boolean>(false);

  // We should track if a change actually occurred if we wanted, but simply logging the session on exit is fine.
  const handleToggleEditMode = () => {
    if (isEditingMode) {
      logAction({
        action: "SETTINGS_UPDATE",
        label: "Mise à jour du Guide des Obligations",
        detail: currentCategory ? `Modification de la catégorie : ${currentCategory.type}` : "Modification générale des exigences",
        module: "Coffre Documentaire"
      });
    }
    setIsEditingMode(!isEditingMode);
  };

  const currentCategory = requirements.find(cat => cat.id === activeCategory) || requirements[0];

  const handleUpdateDocument = (docId: string, data: Partial<DocumentItem>) => {
    if (currentCategory) {
      updateDocument(currentCategory.id, docId, data);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      {/* Editing Mode Toggle */}
      <div className="flex justify-end">
        <Button
          variant={isEditingMode ? "default" : "outline"}
          onClick={handleToggleEditMode}
          className={`rounded-xl font-bold h-12 px-6 transition-all ${isEditingMode ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' : 'text-slate-500 hover:text-primary hover:border-primary/30 border-2 border-slate-200 dark:border-slate-800'}`}
        >
          <Settings className={`w-5 h-5 mr-3 ${isEditingMode ? 'animate-spin-slow' : ''}`} />
          {isEditingMode ? "Quitter le mode édition" : "Options & Paramètres"}
        </Button>
      </div>

      {/* Category Selection Icons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {requirements.map((category: EntityRequirement) => {
          // Dynamic icon resolution with fallback
          const LucideIcon = (Icons as any)[category.icon] || Info;
          const isActive = activeCategory === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-start gap-5 p-6 rounded-[2.5rem] transition-all text-left border-2 group ${
                isActive 
                  ? "bg-primary/5 border-primary shadow-2xl shadow-primary/10 ring-4 ring-primary/5" 
                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-primary/30 hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
              }`}
            >
              <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 ${isActive ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                <LucideIcon className="h-6 w-6" />
              </div>
              <div className="space-y-1.5 pt-1">
                <h3 className={`text-xs font-black uppercase tracking-widest ${isActive ? "text-primary" : "text-slate-900 dark:text-white"}`}>
                  {category.type}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed line-clamp-2 italic">
                  {category.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Category Content */}
      {currentCategory && (
        <Card className="shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] border-none bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden">
          <CardHeader className="p-12 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                   <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                   <Badge variant="outline" className="text-[8px] font-black uppercase tracking-[0.2em] border-emerald-500/20 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1">Standard Tunisie Compliance</Badge>
                </div>
                <CardTitle className="text-4xl font-black tracking-tight uppercase italic decoration-primary/30 underline decoration-4 underline-offset-8">
                  {currentCategory.type}
                </CardTitle>
                 <CardDescription className="text-base font-medium text-slate-500 dark:text-slate-400 max-w-xl">
                  Protocole d'examen des pièces justificatives requis avant toute entrée en relation.
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-1 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-inner border border-slate-100 dark:border-slate-700 min-w-[200px]">
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Total Points de Contrôle</span>
                 <div className="flex items-baseline gap-2">
                   <span className="text-5xl font-black text-primary leading-none">{currentCategory.documents.length}</span>
                   <span className="text-sm font-bold text-slate-300">Docs</span>
                 </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 md:p-12">
            <Accordion type="single" collapsible className="space-y-6">
              {currentCategory.documents.map((doc: DocumentItem, index: number) => (
                <AccordionItem 
                  key={doc.id} 
                  value={doc.id}
                  className="border border-slate-100 dark:border-slate-800 rounded-[2rem] px-8 overflow-hidden data-[state=open]:bg-slate-50/70 dark:data-[state=open]:bg-slate-800/30 data-[state=open]:border-primary/30 transition-all group"
                >
                  <AccordionTrigger className="hover:no-underline py-8">
                    <div className="flex items-center gap-6 text-left w-full pr-4">
                      <div className="h-12 w-12 shrink-0 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center font-black text-sm text-slate-400 shadow-sm group-data-[state=open]:border-primary/50 group-data-[state=open]:text-primary group-data-[state=open]:rotate-6 transition-all duration-300">
                        {index + 1 < 10 ? `0${index + 1}` : index + 1}
                      </div>
                      <div className="space-y-2 pt-1 flex-1">
                        {isEditingMode ? (
                          <Input 
                            value={doc.name} 
                            onChange={(e) => handleUpdateDocument(doc.id, { name: e.target.value })}
                            className="text-xl font-black text-slate-800 dark:text-slate-100 leading-tight uppercase italic tracking-tight bg-white dark:bg-slate-950 border-primary/30 focus-visible:ring-primary/50"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="text-xl font-black text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors leading-tight uppercase italic tracking-tight">
                            {doc.name}
                          </div>
                        )}
                        
                        {isEditingMode ? (
                          <Input 
                            value={doc.description || ""}
                            placeholder="Description facultative..."
                            onChange={(e) => handleUpdateDocument(doc.id, { description: e.target.value })}
                            className="text-[11px] font-bold text-slate-500 uppercase tracking-widest bg-white dark:bg-slate-950 border-slate-200"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          doc.description && (
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{doc.description}</p>
                          )
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-10 pt-2 px-2">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                       {/* Criteria list */}
                       <div className="lg:col-span-8 space-y-6 bg-white dark:bg-slate-950 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                          <div className="flex items-center gap-3 mb-4">
                            <Icons.ListChecks className="h-5 w-5 text-primary" />
                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Exigence de données</h4>
                          </div>
                          
                          {isEditingMode ? (
                            <div className="space-y-4">
                              {doc.requirements.map((req, i) => (
                                <div key={i} className="flex items-start gap-3 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                  <div className="mt-2 text-primary">
                                    <CheckCircle2 className="h-4 w-4" />
                                  </div>
                                  <Textarea
                                    value={req}
                                    onChange={(e) => {
                                      const newReqs = [...doc.requirements];
                                      newReqs[i] = e.target.value;
                                      handleUpdateDocument(doc.id, { requirements: newReqs });
                                    }}
                                    className="text-[14px] font-bold min-h-[60px] bg-white dark:bg-slate-950 border-none shadow-none resize-none"
                                  />
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="mt-1 shrink-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                    onClick={() => {
                                      const newReqs = doc.requirements.filter((_, idx) => idx !== i);
                                      handleUpdateDocument(doc.id, { requirements: newReqs });
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                variant="outline"
                                onClick={() => {
                                  handleUpdateDocument(doc.id, { requirements: [...doc.requirements, "Nouvelle exigence de données..."] });
                                }}
                                className="w-full border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 text-slate-500 hover:text-primary font-bold h-12 rounded-xl"
                              >
                                <Plus className="w-4 h-4 mr-2" /> Ajouter une exigence
                              </Button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                              {doc.requirements.map((req, i) => (
                                <div key={i} className="flex items-start gap-4">
                                  <div className="mt-1 h-6 w-6 shrink-0 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/10">
                                    <CheckCircle2 className="h-4 w-4" />
                                  </div>
                                  <p className="text-[14px] font-bold text-slate-700 dark:text-slate-300 leading-snug">
                                    {req}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                       </div>

                       {/* Sidebar Info */}
                       <div className="lg:col-span-4 space-y-4">
                          <div className="p-6 bg-indigo-50 dark:bg-indigo-950/20 rounded-[2rem] border border-indigo-100/50 dark:border-indigo-900/30">
                             <div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400">
                                <Info className="h-4 w-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Note Technique</span>
                             </div>
                             <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                La certification doit être datée. Toute rature ou surcharge entraîne le rejet automatique de la pièce lors de l'examen AML.
                             </p>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                             <Badge className="w-full justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-black border-none py-3 rounded-xl tracking-widest">
                                RÉTENTION : 10 ANS
                             </Badge>
                             
                             {isEditingMode ? (
                               <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                 <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Configurer l'Alerte</label>
                                 <Select 
                                   value={doc.alertType || alertTypes[0]} 
                                   onValueChange={(val) => handleUpdateDocument(doc.id, { alertType: val })}
                                 >
                                   <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 h-10 rounded-xl font-bold text-xs shadow-sm">
                                     <SelectValue placeholder="Choisir une alerte" />
                                   </SelectTrigger>
                                   <SelectContent className="rounded-xl shadow-2xl border-none">
                                     {alertTypes.map(at => (
                                       <SelectItem key={at} value={at} className="font-bold text-xs">{at}</SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>
                               </div>
                             ) : (
                               doc.alertType && (
                                 <div className="flex items-center justify-center gap-2 px-3 py-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 text-center">
                                    <Icons.AlertTriangle className="h-4 w-4 animate-bounce shrink-0" />
                                    <span className="text-[9px] font-black uppercase tracking-widest leading-snug">{doc.alertType}</span>
                                 </div>
                               )
                             )}
                          </div>
                       </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Pro-tip section */}
      <Card className="rounded-[3rem] bg-slate-900 dark:bg-black text-white p-10 overflow-hidden relative group border-none shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
        <div className="absolute -right-20 -top-20 h-64 w-64 bg-primary/20 blur-[100px] rounded-full animate-pulse pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10">
           <div className="h-20 w-20 shrink-0 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:rotate-12 transition-transform duration-500">
              <FileText className="h-10 w-10 text-primary drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
           </div>
           <div className="text-center lg:text-left space-y-2">
              <h4 className="text-2xl font-black uppercase italic tracking-tighter leading-none">Veille Réglementaire <span className="text-primary italic">Intelligence</span></h4>
              <p className="text-slate-400 text-sm font-medium leading-relaxed uppercase tracking-tighter opacity-80 max-w-2xl">
                 Selon les dernières directives du <span className="text-white font-black underline decoration-primary decoration-4 underline-offset-4">Conseil National de la Conformité</span>, l'automatisation de la vérification de ces critères réduit le risque opérationnel de <span className="text-primary font-black uppercase text-base">40%</span>.
              </p>
           </div>
           <button className="lg:ml-auto h-16 px-10 rounded-2xl bg-primary text-white font-black uppercase text-xs tracking-[0.2em] hover:bg-white hover:text-slate-900 transition-all shadow-[0_20px_50px_rgba(99,102,241,0.3)] active:scale-95 whitespace-nowrap">
              Accéder au Flux
           </button>
        </div>
      </Card>
    </div>
  );
}
