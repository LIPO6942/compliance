"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Zap, ArrowLeft, History, X } from "lucide-react";
import { quickResponseFiches } from "@/data/quickResponseData";
import { QuickResponseFiche } from "@/types/quick-response";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription 
} from "@/components/ui/sheet";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/contexts/UserContext";

export default function QuickResponsePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFicheId, setSelectedFicheId] = useState<string | null>(null);

  const selectedFiche = useMemo(() => 
    quickResponseFiches.find(f => f.id === selectedFicheId),
    [selectedFicheId]
  );
  const filteredFiches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const queryStr = searchQuery.toLowerCase();
    return quickResponseFiches.filter(f => 
      f.title.toLowerCase().includes(queryStr) || 
      f.verdict.toLowerCase().includes(queryStr) ||
      f.steps.some(s => s.toLowerCase().includes(queryStr))
    );
  }, [searchQuery]);

  const frequentFiches = useMemo(() => 
    quickResponseFiches.filter(f => f.isFrequent),
    []
  );

  const handleSelectFiche = (id: string) => {
    setSelectedFicheId(id);
    setSearchQuery("");
  };
  const handleReset = () => {
    setSelectedFicheId(null);
    setSearchQuery("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Search */}
      {!selectedFiche && (
        <div className="text-center space-y-6 pt-12">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tighter text-slate-900 dark:text-white sm:text-5xl">
              Que se passe-t-il ?
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Obtenez une réponse conformité en moins de 30 secondes.
            </p>
          </div>

          <div className="relative max-w-2xl mx-auto group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
            <Input
              className="pl-12 h-16 text-lg rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl focus:border-primary focus:ring-primary/20 transition-all placeholder:text-slate-400"
              placeholder="Ex : CIN expirée, client listé, PPE, document non certifié..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Shortcuts - Only visible when not searching or no results */}
          {(!searchQuery || filteredFiches.length === 0) && (
            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Accès Rapide
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {frequentFiches.map((fiche) => (
                  <Button
                    key={fiche.id}
                    variant="outline"
                    onClick={() => handleSelectFiche(fiche.id)}
                    className="h-auto py-3 px-6 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-primary/50 hover:text-primary transition-all font-bold group"
                  >
                    <Zap className="h-4 w-4 mr-2 text-slate-400 group-hover:text-primary transition-colors" />
                    {fiche.title}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchQuery && filteredFiches.length > 0 && (
            <div className="max-w-2xl mx-auto text-left space-y-2 pt-4">
              {filteredFiches.map((fiche) => (
                <button
                  key={fiche.id}
                  onClick={() => handleSelectFiche(fiche.id)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      fiche.color === 'red' ? "bg-red-500" : fiche.color === 'orange' ? "bg-orange-500" : "bg-green-500"
                    )} />
                    <span className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                      {fiche.title}
                    </span>
                  </div>
                  <Badge variant="secondary" className="font-black text-[10px] uppercase tracking-tighter">
                    {fiche.verdict}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fiche Detail View */}
      {selectedFiche && (
        <div className="space-y-6 animate-in zoom-in-95 fade-in duration-300">
          <div className="flex items-center justify-between h-14">
            <Button 
              variant="ghost" 
              onClick={handleReset}
              className="text-slate-500 dark:text-slate-400 hover:text-primary font-bold px-0 hover:bg-transparent"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Retour à la recherche
            </Button>
            
            <DecisionHistorySheet ficheId={selectedFiche.id} ficheTitle={selectedFiche.title} />
          </div>

          <Card className="overflow-hidden border-0 shadow-2xl bg-white dark:bg-slate-950 rounded-3xl">
            {/* Verdict Banner */}
            <div className={cn(
              "px-8 py-10 text-center space-y-2",
              selectedFiche.color === 'red' ? "bg-red-600 text-white" : 
              selectedFiche.color === 'orange' ? "bg-orange-500 text-white" : 
              "bg-green-600 text-white"
            )}>
              <p className="text-xs font-black uppercase tracking-[0.3em] opacity-80">Verdict Immédiat</p>
              <h2 className="text-4xl font-black tracking-tight">{selectedFiche.verdict}</h2>
              {selectedFiche.verdict.includes('SUSPENDRE') && (
                <p className="text-sm font-bold bg-white/20 px-4 py-1 rounded-full inline-block backdrop-blur-sm">
                  Alerter le responsable conformité
                </p>
              )}
            </div>

            <div className="p-8 space-y-8">
              {/* Steps */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Étapes à suivre</h3>
                <div className="space-y-3">
                  {selectedFiche.steps.map((step, index) => (
                    <div key={index} className="flex gap-4 items-start p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm",
                        selectedFiche.color === 'red' ? "bg-red-100 text-red-600" : 
                        selectedFiche.color === 'orange' ? "bg-orange-100 text-orange-600" : 
                        "bg-green-100 text-green-600"
                      )}>
                        {index + 1}
                      </span>
                      <p className="font-bold text-slate-700 dark:text-slate-300 pt-1 leading-tight">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Note / Exception */}
              {(selectedFiche.note || selectedFiche.exception) && (
                <div className="p-6 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/20 transition-colors" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-3 relative z-10">Point d'Attention / Précision</h4>
                  <div className="font-bold leading-relaxed whitespace-pre-line text-sm relative z-10">
                    {selectedFiche.note || selectedFiche.exception}
                  </div>
                </div>
              )}

              {/* Legal Base Accordion */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="legal" className="border-b-0">
                  <AccordionTrigger className="hover:no-underline py-4 px-6 rounded-2xl border border-slate-200 dark:border-slate-800 font-bold text-slate-500 hover:text-primary transition-all">
                    Voir la base légale
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pt-4 pb-0">
                    <div className="space-y-4 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-black text-[10px] uppercase">{selectedFiche.legalBase.article}</Badge>
                      </div>
                      <p className="text-sm italic leading-relaxed border-l-4 border-slate-200 dark:border-slate-800 pl-4 py-1">
                        "{selectedFiche.legalBase.text}"
                      </p>
                      {selectedFiche.legalBase.link && (
                        <div className="flex justify-end mt-4">
                          <Button variant="link" className="font-black uppercase text-[10px] tracking-widest text-primary h-auto p-0">
                            Page du manuel PDF
                          </Button>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Golden Rule */}
              <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 shadow-sm">
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 flex-shrink-0 animate-pulse">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500">Règle d'Or de la Compagnie</h5>
                      <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200 leading-snug">
                        1. Ne pas agir seul • 2. Appliquer la vigilance supérieure • 3. En référer au responsable conformité • 4. Des indices suffisent pour la DS (n'attendez pas de preuve).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function DecisionHistorySheet({ ficheId, ficheTitle }: { ficheId: string, ficheTitle: string }) {
  const { user } = useUser();
  const [historyEntries, setHistoryEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newDecision, setNewDecision] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, "quickResponseHistory"),
      where("ficheId", "==", ficheId),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate()?.toLocaleDateString('fr-FR') || 'Date inconnue'
      }));
      setHistoryEntries(entries);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching history:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [ficheId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDecision.trim() || !db) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "quickResponseHistory"), {
        ficheId,
        decision: newDecision,
        notes: newNotes,
        validatedBy: user?.name || "Utilisateur",
        date: serverTimestamp()
      });
      setNewDecision("");
      setNewNotes("");
    } catch (error) {
      console.error("Error adding decision:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full font-black text-[10px] uppercase tracking-widest px-4 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 group">
          <History className="h-3.5 w-3.5 mr-2 text-slate-400 group-hover:text-primary transition-colors" />
          Cas déjà traités
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] border-l-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
        <SheetHeader className="pb-6 border-b border-slate-100 dark:border-slate-800">
          <SheetTitle className="text-2xl font-black tracking-tight">Mémoire des décisions</SheetTitle>
          <SheetDescription className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">
            {ficheTitle}
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-8 space-y-8 h-full flex flex-col">
          <div className="flex-1 overflow-y-auto pr-4 -mr-4 space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse" />)}
              </div>
            ) : historyEntries.length > 0 ? (
              historyEntries.map((entry) => (
                <div key={entry.id} className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400">{entry.date}</span>
                    <Badge variant="outline" className="text-[9px] font-bold py-0">{entry.validatedBy}</Badge>
                  </div>
                  <p className="font-bold text-slate-700 dark:text-slate-300 leading-tight">
                    {entry.decision}
                  </p>
                  {entry.notes && (
                    <p className="text-xs text-slate-500 italic mt-2">"{entry.notes}"</p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mx-auto">
                  <History className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-400">Aucun historique pour ce cas.</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 text-center">Ajouter un retour d'expérience</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Décision prise</label>
                <textarea 
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none h-24"
                  placeholder="Décrivez brièvement la décision..."
                  value={newDecision}
                  onChange={(e) => setNewDecision(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Notes complémentaires</label>
                <input 
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 h-12 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Points de vigilance, contexte..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </div>
              <Button 
                type="submit" 
                disabled={isSubmitting || !newDecision.trim()}
                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all"
              >
                {isSubmitting ? "Enregistrement..." : "Enregistrer le cas"}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

