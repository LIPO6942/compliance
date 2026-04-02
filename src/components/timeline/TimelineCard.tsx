"use client";

import * as React from "react";
import { format, parseISO, differenceInDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  RefreshCw, Check, Clock, AlertCircle, ShieldAlert, 
  FileText, Plus, Search, Link as LinkIcon, ExternalLink,
  ChevronRight, Paperclip, Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useDocuments } from "@/contexts/DocumentsContext";
import type { TimelineEvent } from "@/contexts/TimelineContext";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimelineCardProps {
  event: TimelineEvent;
  isOverdue?: boolean;
  onValidate: (eventId: string, evidenceIds: string[]) => void;
  onProlong: (id: string, newDate: string, reason?: string) => void;
}

export function TimelineCard({ event, isOverdue, onValidate, onProlong }: TimelineCardProps) {
  const { documents, addDocument } = useDocuments();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDocIds, setSelectedDocIds] = React.useState<string[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [newDocData, setNewDocData] = React.useState({ name: "", url: "" });
  const [indexInDocs, setIndexInDocs] = React.useState(true);
  const [delayReason, setDelayReason] = React.useState("");

  const eventDate = parseISO(event.date);
  const daysLeft = differenceInDays(eventDate, startOfDay(new Date()));
  const daysOverdue = differenceInDays(startOfDay(new Date()), eventDate);
  const isUrgent = !isOverdue && daysLeft <= 3;

  const filteredDocs = documents.filter((doc: any) => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleDoc = (docId: string) => {
    setSelectedDocIds((prev: string[]) => 
      prev.includes(docId) ? prev.filter((id: string) => id !== docId) : [...prev, docId]
    );
  };

  const handleQuickUpload = async () => {
    if (!newDocData.name || !newDocData.url) return;
    
    setIsUploading(true);
    try {
      // Simulate real file upload/metadata creation
      const newDocId = `doc-${Date.now()}`;
      
      // If indexInDocs is true, we add it to the main repository
      if (indexInDocs) {
        addDocument({
          name: newDocData.name,
          category: event.category,
          status: "Validé",
          url: newDocData.url,
          lastUpdated: new Date().toISOString()
        });
      }

      // Add to selected evidences
      setSelectedDocIds((prev: string[]) => [...prev, newDocId]);
      setNewDocData({ name: "", url: "" });
      setIsUploading(false);
    } catch (error) {
      console.error("Upload failed", error);
      setIsUploading(false);
    }
  };

  const handleConfirmValidation = () => {
    onValidate(event.id, selectedDocIds);
    setIsDialogOpen(false);
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border transition-all p-5 shadow-lg",
        isOverdue 
          ? "border-rose-200 dark:border-rose-900/50 shadow-rose-500/5 hover:-translate-y-1" 
          : isUrgent 
            ? "animate-blink-urgent shadow-rose-500/10 border-rose-100/50" 
            : "border-slate-100 dark:border-slate-800 hover:shadow-xl hover:-translate-y-1"
      )}
    >
      {/* Background Decor */}
      <div className={cn(
        "absolute top-0 right-0 w-20 h-20 opacity-10 rounded-bl-full pointer-events-none",
        isOverdue ? "bg-rose-500" : event.color
      )} />

      <div className="flex items-center gap-4 relative z-10">
        {/* Date Badge */}
        <div className={cn(
          "flex flex-col items-center justify-center min-w-[60px] h-[60px] rounded-2xl text-white font-black shadow-lg",
          isOverdue ? "bg-rose-600 shadow-rose-600/20" : event.color
        )}>
          <span className="text-[10px] opacity-70 leading-none uppercase">{format(eventDate, "MMM", { locale: fr })}</span>
          <span className="text-lg">{format(eventDate, "dd")}</span>
        </div>

        {/* Content */}
        <div className="space-y-0.5 flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <Badge 
              variant={isOverdue ? "destructive" : "outline"}
              className={cn(
                "text-[8px] font-black uppercase tracking-widest py-0",
                !isOverdue && isUrgent && "bg-rose-50 text-rose-600 border-rose-200"
              )}
            >
              {isOverdue ? `${daysOverdue} Jours de retard` : event.category}
            </Badge>

            <div className="flex gap-1">
              {/* Prolongation Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <button 
                    className={cn(
                      "p-1.5 rounded-full transition-all",
                      isOverdue 
                        ? "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white" 
                        : "bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                    )}
                    title="Reporter"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 rounded-2xl shadow-2xl border-none overflow-hidden" align="end">
                  <div className={cn("p-4 text-white", isOverdue ? "bg-rose-600" : "bg-primary")}>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-80">Cycle de Vie</p>
                    <h3 className="text-sm font-black italic">Reporter l'échéance</h3>
                  </div>
                  <div className="p-4 space-y-4 bg-white dark:bg-slate-950">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Justification (Optionnel)</Label>
                      <Input 
                        placeholder="Ex: Attente de retour tiers..." 
                        className="text-xs rounded-xl"
                        value={delayReason}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDelayReason(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nouvelle date cible</Label>
                      <Calendar
                        mode="single"
                        onSelect={(date: Date | undefined) => {
                          if (date) {
                            onProlong(event.id, date.toISOString(), delayReason);
                            setDelayReason("");
                          }
                        }}
                        className="border rounded-xl"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Validation Dialog (Coffre Documentaire) */}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <button 
                    className={cn(
                      "p-1.5 rounded-full transition-all",
                      isOverdue 
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white"
                        : "bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                    )}
                    title="Valider avec preuve"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl">
                  <div className="bg-slate-900 p-8 text-white relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <ShieldAlert className="h-24 w-24" />
                    </div>
                    <div className="relative z-10">
                      <Badge className="bg-emerald-500 mb-4 font-black uppercase tracking-widest">Coffre Documentaire</Badge>
                      <DialogTitle className="text-3xl font-black italic uppercase tracking-tight">Validation de Conformité</DialogTitle>
                      <DialogDescription className="text-slate-400 mt-2 font-medium">
                        Veuillez joindre les preuves documentaires pour l'événement : <span className="text-white font-bold">{event.title}</span>
                      </DialogDescription>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    {/* Left side: Existing Docs */}
                    <div className="p-6 border-r border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 mb-4">
                        <Search className="h-4 w-4 text-primary" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Documents Existants</h4>
                      </div>
                      <Input 
                        placeholder="Rechercher une preuve..." 
                        className="mb-4 text-xs rounded-xl bg-slate-50 border-none h-9 mt-2" 
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                      />
                      <ScrollArea className="h-[250px] pr-4">
                        <div className="space-y-2">
                          {filteredDocs.map((doc: any) => (
                            <div 
                              key={doc.id}
                              onClick={() => handleToggleDoc(doc.id)}
                              className={cn(
                                "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
                                selectedDocIds.includes(doc.id) 
                                  ? "bg-primary/5 border-primary shadow-sm" 
                                  : "bg-white border-slate-100 hover:border-primary/30"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "p-2 rounded-lg transition-colors",
                                  selectedDocIds.includes(doc.id) ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
                                )}>
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate leading-tight">{doc.name}</p>
                                  <p className="text-[9px] text-slate-400 uppercase font-black">{doc.category}</p>
                                </div>
                              </div>
                              {selectedDocIds.includes(doc.id) && <Check className="h-4 w-4 text-primary" />}
                            </div>
                          ))}
                          {filteredDocs.length === 0 && (
                            <div className="text-center py-10 opacity-20 italic text-xs">Aucun document trouvé</div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Right side: New Upload / Summary */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50">
                      <div className="space-y-6">
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <Plus className="h-4 w-4 text-emerald-500" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nouvelle Preuve Directe</h4>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
                            <div className="space-y-1.5">
                              <Label className="text-[9px] font-black uppercase opacity-60 ml-1">Nom du fichier</Label>
                              <Input 
                                placeholder="Rapport de contrôle..." 
                                className="text-xs rounded-xl h-9"
                                value={newDocData.name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDocData((prev: any) => ({ ...prev, name: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[9px] font-black uppercase opacity-60 ml-1">Lien / URL Source</Label>
                              <Input 
                                placeholder="https://cloud.mae.info/proofs/..." 
                                className="text-xs rounded-xl h-9"
                                value={newDocData.url}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDocData((prev: any) => ({ ...prev, url: e.target.value }))}
                              />
                            </div>
                            <div className="flex items-center space-x-2 pt-1">
                              <Checkbox 
                                id="indexInDocs" 
                                checked={indexInDocs} 
                                onCheckedChange={(checked: boolean) => setIndexInDocs(checked)}
                              />
                              <label htmlFor="indexInDocs" className="text-[10px] font-bold text-slate-500 cursor-pointer">
                                Indexer dans la gestion documentaire
                              </label>
                            </div>
                            <Button 
                              variant="secondary" 
                              className="w-full text-[10px] font-black uppercase tracking-widest h-9"
                              onClick={handleQuickUpload}
                              disabled={!newDocData.name || !newDocData.url || isUploading}
                            >
                              {isUploading ? "Traitement..." : "Ajouter cette preuve"}
                            </Button>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Résumé de la validation</h4>
                          <div className="flex items-center justify-between bg-primary/5 p-3 rounded-2xl border border-primary/20">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                <Paperclip className="h-4 w-4" />
                              </div>
                              <p className="text-xs font-black uppercase italic">{selectedDocIds.length} preuve(s) liée(s)</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-xl border border-amber-100 dark:border-amber-900/50">
                      <Info className="h-3 w-3" />
                      <span className="text-[9px] font-bold uppercase">Audit trail activé</span>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl text-xs font-bold">Annuler</Button>
                      <Button 
                        onClick={handleConfirmValidation} 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest px-8 shadow-lg shadow-emerald-600/20"
                      >
                        Finaliser la validation
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <h4 className={cn(
            "text-sm font-black uppercase italic truncate",
            isOverdue ? "text-rose-700 dark:text-rose-400" : "text-slate-800 dark:text-slate-100"
          )}>
            {event.title}
          </h4>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {isOverdue ? (
                <>
                  <ShieldAlert className="h-3 w-3 text-rose-600" />
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-tighter">Action Corrective Requise</p>
                </>
              ) : (
                <>
                  <Clock className={cn("h-3 w-3", isUrgent ? "text-rose-500" : "text-slate-400")} />
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-tighter",
                    isUrgent ? "text-rose-500" : "text-slate-400"
                  )}>
                    {isUrgent ? "Urgence : < 3 jours" : "Échéance critique"}
                  </p>
                </>
              )}
            </div>
            
            {event.evidenceIds && event.evidenceIds.length > 0 && (
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[8px] font-black py-0">
                📎 {event.evidenceIds.length} PREUVE
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
