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
import { useDocuments } from "@/contexts/DocumentsContext";
import { ArrowUp, ArrowDown, History, PlusCircle, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const alertTypes = [
  "Alerte Fraude Documentaire",
  "Alerte Non-Conformité",
  "Alerte Expiration",
  "Alerte Signature",
  "Alerte Données"
];

export function ComplianceGuide() {
  const { requirements, updateDocument, addDocumentItem, reorderDocumentItem } = useRequirements();
  const { logs, logAction } = useActivityLog();
  const { documents } = useDocuments();
  const [activeCategory, setActiveCategory] = useState<string>("physique");
  const [isEditingMode, setIsEditingMode] = useState<boolean>(false);

  // Filter logs for this specific module
  const recentLogs = logs.filter(l => l.module === "Coffre Documentaire").slice(0, 3);

  const handleToggleEditMode = () => {
    try {
      if (isEditingMode) {
        // Safe call using as any to bypass TS complaints about missing email if not strictly enforced here
        (logAction as any)({
          action: "SETTINGS_UPDATE",
          label: "Mise à jour du Guide des Obligations",
          detail: currentCategory ? `Modification de la catégorie : ${currentCategory.type}` : "Modification générale des exigences",
          module: "Coffre Documentaire",
          userEmail: "admin@compliance.tn",
          userName: "Administrateur"
        });
      }
    } catch (e) {
      console.warn("Could not log action:", e);
    } finally {
      setIsEditingMode(!isEditingMode);
    }
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
                      <div className="h-12 w-12 shrink-0 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center font-black text-sm text-slate-400 shadow-sm group-data-[state=open]:border-primary/50 group-data-[state=open]:text-primary transition-all duration-300">
                        {index + 1 < 10 ? `0${index + 1}` : index + 1}
                      </div>

                      {/* Move Up / Move Down Controls */}
                      {isEditingMode && (
                        <div className="flex flex-col gap-1 items-center justify-center -ml-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            disabled={index === 0}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); reorderDocumentItem(currentCategory.id, doc.id, 'up'); }}
                            className="p-1 rounded-md text-slate-400 hover:text-primary hover:bg-primary/10 disabled:opacity-30 transition-colors"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            disabled={index === currentCategory.documents.length - 1}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); reorderDocumentItem(currentCategory.id, doc.id, 'down'); }}
                            className="p-1 rounded-md text-slate-400 hover:text-primary hover:bg-primary/10 disabled:opacity-30 transition-colors"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        </div>
                      )}

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
                             {isEditingMode ? (
                               <Textarea
                                 value={doc.technicalNote || ""}
                                 placeholder="La certification doit être datée..."
                                 onChange={(e) => handleUpdateDocument(doc.id, { technicalNote: e.target.value })}
                                 className="text-xs font-bold bg-white/50 dark:bg-slate-900 border-none shadow-none resize-none min-h-[60px]"
                                 onClick={(e) => e.stopPropagation()}
                               />
                             ) : (
                               <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                  {doc.technicalNote || "La certification doit être datée. Toute rature ou surcharge entraîne le rejet automatique de la pièce lors de l'examen AML."}
                               </p>
                             )}
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
                                   <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 h-10 rounded-xl font-bold text-xs shadow-sm" onClick={(e) => e.stopPropagation()}>
                                     <SelectValue placeholder="Choisir une alerte" />
                                   </SelectTrigger>
                                   <SelectContent className="rounded-xl shadow-2xl border-none">
                                     {alertTypes.map(at => (
                                       <SelectItem key={at} value={at} className="font-bold text-xs">{at}</SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>

                                 <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-4 mb-2 block">Liaison Coffre-Fort</label>
                                 <Select 
                                   value={doc.vaultDocumentId || "none"} 
                                   onValueChange={(val) => handleUpdateDocument(doc.id, { vaultDocumentId: val === "none" ? "" : val })}
                                 >
                                   <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 h-10 rounded-xl font-bold text-xs shadow-sm truncate" onClick={(e) => e.stopPropagation()}>
                                     <SelectValue placeholder="Lier un document" />
                                   </SelectTrigger>
                                   <SelectContent className="rounded-xl shadow-2xl border-none max-h-[200px]">
                                     <SelectItem value="none" className="font-bold text-xs italic text-slate-400">Aucun lien</SelectItem>
                                     {documents.map(vDoc => (
                                       <SelectItem key={vDoc.id} value={vDoc.id} className="font-bold text-xs">{vDoc.name}</SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>
                               </div>
                             ) : (
                               <div className="flex flex-col gap-2 mt-2">
                                 {doc.alertType && (
                                   <div className="flex items-center justify-center gap-2 px-3 py-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 text-center">
                                      <Icons.AlertTriangle className="h-4 w-4 animate-bounce shrink-0" />
                                      <span className="text-[9px] font-black uppercase tracking-widest leading-snug">{doc.alertType}</span>
                                   </div>
                                 )}
                                 {doc.vaultDocumentId && documents.find(d => d.id === doc.vaultDocumentId) && (
                                   <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm">
                                      <div className="flex items-center gap-2 overflow-hidden">
                                         <LinkIcon className="h-3 w-3 text-indigo-500 shrink-0" />
                                         <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 truncate">
                                            {documents.find(d => d.id === doc.vaultDocumentId)?.name}
                                         </span>
                                      </div>
                                      <Badge variant="outline" className="text-[8px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-none shrink-0 ml-2">
                                         LIÉ
                                      </Badge>
                                   </div>
                                 )}
                               </div>
                             )}
                          </div>
                       </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            
            {/* Add Document Button */}
            {isEditingMode && (
              <div className="mt-8 flex justify-center">
                <Button
                  onClick={() => addDocumentItem(currentCategory.id)}
                  variant="outline"
                  className="w-full max-w-sm h-14 border-dashed border-2 hover:border-primary hover:bg-primary/5 text-slate-500 hover:text-primary font-bold rounded-2xl shadow-sm transition-all"
                >
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Créer une Nouvelle Étape
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Activity Log Banner (Option 2) */}
      <Card className="rounded-[3rem] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden group">
        <div className="flex flex-col lg:flex-row items-stretch">
          <div className="bg-primary/5 dark:bg-primary/10 p-10 flex flex-col items-center justify-center lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800">
            <div className="h-16 w-16 rounded-3xl bg-primary/20 flex items-center justify-center text-primary mb-4 ring-8 ring-white dark:ring-slate-900 group-hover:scale-110 transition-transform duration-500">
              <History className="h-8 w-8" />
            </div>
            <h4 className="text-sm font-black uppercase text-center tracking-widest text-slate-800 dark:text-slate-100">Journal d'Activité</h4>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-2 tracking-widest text-center">Historique Collaboratif</p>
          </div>
          <div className="flex-1 p-8">
            {recentLogs.length > 0 ? (
              <div className="space-y-4">
                {recentLogs.map((log, i) => (
                  <div key={i} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-600 dark:text-slate-400 uppercase">
                      {log.userName ? log.userName.substring(0, 2) : "AD"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{log.userName || "Administrateur"}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary px-2 py-0.5 rounded-full bg-primary/10">
                          {log.action.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-500 mt-1">{log.detail || log.label}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {log.timestamp ? format(new Date(log.timestamp), "d MMM yyyy", { locale: fr }) : "À l'instant"}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500">
                        {log.timestamp ? format(new Date(log.timestamp), "HH:mm") : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                <ShieldCheck className="h-12 w-12 opacity-20" />
                <p className="text-sm font-bold">Aucune activité récente sur ce module.</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
