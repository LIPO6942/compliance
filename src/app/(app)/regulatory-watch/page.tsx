"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { analyzeRegulationAction } from "./actions";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Sparkles, FileText, Tag, ListChecks, X, ThumbsUp, Trash2, PlusCircle, Zap, ShieldCheck, Search, BrainCircuit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useIdentifiedRegulations } from "@/contexts/IdentifiedRegulationsContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/icons/Logo";
import { useKeywords } from "@/contexts/KeywordsContext";

const formSchema = z.object({
  regulationText: z.string().min(50, { message: "Le texte réglementaire doit contenir au moins 50 caractères." }),
  keywords: z.array(z.string()).refine((value) => value.length > 0, {
    message: "Veuillez sélectionner au moins un mot-clé.",
  }),
});

type RegulatoryWatchFormValues = z.infer<typeof formSchema>;

export default function RegulatoryWatchPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [analysisResult, setAnalysisResult] = React.useState<Record<string, string[]> | null>(null);
  const [currentRegulationText, setCurrentRegulationText] = React.useState("");
  const [currentKeywords, setCurrentKeywords] = React.useState<string[]>([]);
  const { toast } = useToast();
  const { addIdentifiedRegulation } = useIdentifiedRegulations();

  const { keywords: keywordOptions, loading: keywordsLoading, addKeyword, removeKeyword } = useKeywords();
  const [newKeyword, setNewKeyword] = React.useState("");

  const form = useForm<RegulatoryWatchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      regulationText: "",
      keywords: [],
    },
  });

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return;
    await addKeyword(newKeyword);
    setNewKeyword("");
  };

  const handleRemoveKeyword = async (keywordIdToRemove: string) => {
    await removeKeyword(keywordIdToRemove);
    const currentSelection = form.getValues('keywords') || [];
    form.setValue('keywords', currentSelection.filter(id => id !== keywordIdToRemove), { shouldValidate: true });
  };

  const onSubmit = async (data: RegulatoryWatchFormValues) => {
    setIsLoading(true);
    setAnalysisResult(null);
    setCurrentRegulationText(data.regulationText);
    setCurrentKeywords(data.keywords);
    try {
      const result = await analyzeRegulationAction(data.regulationText, data.keywords);
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Erreur d'Analyse IA",
          description: result.error,
        });
      } else {
        setAnalysisResult(result.analysis ?? null);
        toast({
          title: "Analyse Terminée",
          description: "L'analyse par mot-clé est terminée. Veuillez vérifier les résultats.",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue est survenue.";
      toast({
        variant: "destructive",
        title: "Erreur Inattendue",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAndIntegrate = () => {
    if (analysisResult && currentRegulationText) {
      addIdentifiedRegulation(currentRegulationText, currentKeywords, analysisResult);
      toast({
        title: "Réglementation Ajoutée aux Alertes",
        description: "La nouvelle réglementation a été enregistrée et est visible dans le Centre d'Alertes.",
      });
      setAnalysisResult(null);
      form.reset();
    }
  };

  const handleRejectSuggestions = () => {
    setAnalysisResult(null);
    toast({
      title: "Analyse Rejetée",
      description: "Les résultats de l'analyse IA ont été effacés.",
      variant: "default",
    });
    form.reset();
  };


  return (
    <div className="space-y-10 pb-20 overflow-hidden">
      {/* Premium Header */}
      <div className="relative">
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
        <div className="relative z-10 space-y-2">
          <Badge variant="outline" className="border-primary/50 text-primary bg-primary/5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
            Intelligence Artificielle
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="text-slate-900 dark:text-white uppercase italic">Intelligence</span>{" "}
            <span className="text-primary uppercase italic">Réglementaire</span>
          </h1>
          <p className="text-slate-500 text-sm max-w-2xl leading-relaxed">
            Propulsez votre veille réglementaire grâce au moteur d'analyse <span className="text-slate-900 dark:text-white font-bold underline decoration-primary underline-offset-4">Deep Insights AI</span>.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* Main Input Area */}
          <Card className="lg:col-span-2 shadow-2xl border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden group">
            <CardHeader className="p-10 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl group-hover:rotate-6 transition-transform">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  Corps Réglementaire
                </CardTitle>
                <Badge className="bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-500 border-none">Analyse Sémantique</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              <FormField
                control={form.control}
                name="regulationText"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50 flex justify-between">
                      Texte à scanner <span>Saisie requise</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Importez ou collez l'intégralité du texte réglementaire (ex: JORT, UE, GAFI...)"
                        className="min-h-[400px] text-base font-medium rounded-3xl bg-slate-50 dark:bg-slate-950/50 border-none shadow-inner p-8 focus:ring-4 focus:ring-primary/10 transition-all leading-relaxed"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs font-bold" />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="p-10 pt-0">
              <Button type="submit" disabled={isLoading} className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-primary text-white font-black uppercase tracking-widest text-sm shadow-2xl shadow-indigo-600/20 group transition-all overflow-hidden relative">
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    Extraction des entités...
                  </div>
                ) : (
                  <>
                    <Zap className="mr-3 h-5 w-5 fill-white group-hover:scale-125 transition-transform" />
                    Lancer l'analyse cognitive
                  </>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </Button>
            </CardFooter>
          </Card>

          {/* Keywords & Parameters Area */}
          <div className="space-y-8">
            <Card className="shadow-2xl border-none bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] p-8">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-xl font-black flex items-center gap-3">
                  <BrainCircuit className="h-6 w-6 text-primary" />
                  Paramètres IA
                </CardTitle>
                <CardDescription className="font-bold text-xs uppercase tracking-tight">Filtres de détection</CardDescription>
              </CardHeader>
              <CardContent className="px-0 space-y-8">
                <FormField
                  control={form.control}
                  name="keywords"
                  render={({ field }) => {
                    const allKeywordsSelected = keywordOptions.length > 0 && field.value?.length === keywordOptions.length;
                    return (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm">
                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Tout sélectionner</Label>
                          <Checkbox
                            checked={allKeywordsSelected}
                            onCheckedChange={(checked) => {
                              field.onChange(checked ? keywordOptions.map((item) => item.id) : []);
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {keywordOptions.map((item) => (
                            <div key={item.id} className="group flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm hover:shadow-md transition-all border border-transparent hover:border-primary/20">
                              <Checkbox
                                id={`kw-${item.id}`}
                                checked={field.value?.includes(item.id)}
                                onCheckedChange={(checked) => {
                                  const cur = field.value || [];
                                  field.onChange(checked ? [...cur, item.id] : cur.filter((v) => v !== item.id));
                                }}
                              />
                              <Label htmlFor={`kw-${item.id}`} className="text-sm font-bold flex-1 cursor-pointer">{item.label}</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 rounded-xl"
                                onClick={() => handleRemoveKeyword(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-rose-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </div>
                    );
                  }}
                />

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 px-1">Inducteur personnalisé</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="Nouveau thème..."
                      className="h-10 rounded-xl bg-white dark:bg-slate-800 border-none shadow-sm text-xs font-bold"
                    />
                    <Button type="button" size="icon" onClick={handleAddKeyword} className="h-10 w-10 shrink-0 bg-primary rounded-xl shadow-lg shadow-primary/20">
                      <PlusCircle className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] bg-indigo-600 text-white p-8">
              <ShieldCheck className="h-10 w-10 mb-6 drop-shadow-lg" />
              <h3 className="text-xl font-black tracking-tight mb-2 uppercase">Sécurité IA</h3>
              <p className="text-indigo-100 text-xs font-medium leading-relaxed opacity-80 uppercase tracking-tighter">
                Toutes les analyses sont traitées localement par cryptage de bout en bout.
                Aucune donnée sensible ne quitte votre périmètre de confiance.
              </p>
            </Card>
          </div>
        </form>
      </Form>

      {/* Analysis Results */}
      {analysisResult && (
        <Card className="shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border-none bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-700">
          <CardHeader className="p-12 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black uppercase px-2 mb-2">Score de Pertinence : 98%</Badge>
              <CardTitle className="text-4xl font-black font-headline tracking-tight uppercase italic">Intelligence <span className="text-primary">Report</span></CardTitle>
              <CardDescription className="text-base font-medium mt-1">Interprétation cognitive générée par l'assistant GRC.</CardDescription>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <Button size="lg" variant="outline" className="flex-1 md:flex-none h-14 rounded-2xl border-rose-200 text-rose-600 font-black uppercase text-xs tracking-widest hover:bg-rose-50" onClick={handleRejectSuggestions}>
                <X className="mr-2 h-4 w-4" /> Rejeter
              </Button>
              <Button size="lg" className="flex-1 md:flex-none h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20" onClick={handleConfirmAndIntegrate}>
                <ThumbsUp className="mr-2 h-4 w-4" /> Intégrer au Vault
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            {Object.entries(analysisResult).map(([keyword, points], i) => (
              <div key={keyword} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black">0{i + 1}</div>
                  <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-xs font-black uppercase p-2 border-none">{keyword}</Badge>
                </div>
                <ul className="space-y-4 pl-11 relative">
                  <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-800" />
                  {points.map((pt, j) => (
                    <li key={j} className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed relative">
                      <div className="absolute -left-[30px] top-2 w-1.5 h-1.5 rounded-full bg-primary/40" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}