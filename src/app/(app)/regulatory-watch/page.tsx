
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
import { AlertCircle, CheckCircle, Sparkles, FileText, Tag, ListChecks, X, ThumbsUp, Trash2, PlusCircle } from "lucide-react";
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
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center">
            <Sparkles className="mr-2 h-7 w-7 text-primary" />
            Assistance Conformité IA
          </CardTitle>
          <CardDescription className="text-lg">
            Utilisez l'intelligence artificielle pour analyser rapidement les nouvelles réglementations, en se basant sur des mots-clés spécifiques.
          </CardDescription>
        </CardHeader>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center">
                <FileText className="mr-2 h-5 w-5 text-muted-foreground" />
                Soumettre une Réglementation pour Analyse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="regulationText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="regulationText" className="text-base">Texte de la Réglementation</FormLabel>
                    <FormControl>
                      <Textarea
                        id="regulationText"
                        placeholder="Collez ici l'intégralité du texte réglementaire..."
                        className="min-h-[200px] text-sm"
                        {...field}
                        aria-describedby="regulationText-description"
                      />
                    </FormControl>
                    <FormDescription id="regulationText-description">
                      Fournissez le contenu complet de la nouvelle réglementation à analyser.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => {
                  const allKeywordsSelected = keywordOptions.length > 0 && field.value?.length === keywordOptions.length;
                  return (
                    <FormItem>
                      <div className="mb-4 flex justify-between items-center">
                        <div>
                          <FormLabel className="text-base">Mots-Clés pour l'Analyse</FormLabel>
                          <FormDescription>
                            Sélectionnez les angles sous lesquels l'IA doit analyser le texte.
                          </FormDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                              id="select-all"
                              checked={allKeywordsSelected}
                              onCheckedChange={(checked) => {
                                  field.onChange(checked ? keywordOptions.map((item) => item.id) : []);
                              }}
                              disabled={keywordsLoading}
                          />
                          <Label htmlFor="select-all" className="text-sm font-normal cursor-pointer">
                              Tout cocher
                          </Label>
                        </div>
                      </div>
                      {keywordsLoading ? (
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {[...Array(6)].map((_, i) => <div key={i} className="h-12 w-full bg-muted rounded-md animate-pulse"></div>)}
                         </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {keywordOptions.map((item) => (
                            <div key={item.id} className="group relative flex items-center space-x-3 rounded-md border p-3 shadow-sm">
                                <Checkbox
                                    id={`keyword-${item.id}`}
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                        const currentSelection = field.value || [];
                                        const newSelection = checked
                                            ? [...currentSelection, item.id]
                                            : currentSelection.filter((value) => value !== item.id);
                                        field.onChange(newSelection);
                                    }}
                                />
                                <Label htmlFor={`keyword-${item.id}`} className="text-sm font-normal cursor-pointer flex-1">
                                    {item.label}
                                </Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleRemoveKeyword(item.id)}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                            ))}
                        </div>
                      )}
                      <FormMessage className="pt-2" />
                    </FormItem>
                  );
                }}
              />
               <div className="pt-2">
                  <FormLabel>Ajouter un mot-clé personnalisé</FormLabel>
                  <div className="flex items-center gap-2 mt-2">
                      <Input
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value)}
                          onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddKeyword();
                              }
                          }}
                          placeholder="Ex: Conformité Fiscale"
                      />
                      <Button type="button" onClick={handleAddKeyword}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Ajouter
                      </Button>
                  </div>
                  <FormDescription className="mt-1">
                      Ajoutez un nouveau mot-clé s'il ne figure pas dans la liste ci-dessus.
                  </FormDescription>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {isLoading ? (
                  <>
                    <Logo className="mr-2 h-5 w-5 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Analyser avec l'IA
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      {analysisResult && (
        <Card className="shadow-lg mt-8 animate-fadeIn">
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center">
              <ListChecks className="mr-2 h-6 w-6 text-primary" />
              Résultats de l'Analyse IA
            </CardTitle>
            <CardDescription>
              Vérifiez l'analyse générée par l'IA pour chaque mot-clé et décidez de l'intégrer ou non.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.keys(analysisResult).length > 0 ? (
                Object.entries(analysisResult).map(([keyword, analysisPoints]) => (
                    <Card key={keyword} className="shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-medium font-headline flex items-center">
                               <Tag className="mr-2 h-5 w-5 text-muted-foreground" />
                               Analyse pour : <Badge variant="secondary" className="ml-2">{keyword}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                           <ul className="list-disc pl-5 space-y-2 text-sm">
                                {analysisPoints.map((point, index) => (
                                    <li key={index} className="text-muted-foreground">{point}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                ))
            ) : (
                <div className="text-center py-8">
                    <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">Aucune analyse générée</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        L'IA n'a pas pu générer d'analyse. Le texte est peut-être trop court ou non pertinent.
                    </p>
                </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t">
              <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleRejectSuggestions}
              >
                  <X className="mr-2 h-5 w-5" /> Rejeter et Réinitialiser
              </Button>
              <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleConfirmAndIntegrate}
                  disabled={Object.keys(analysisResult).length === 0}
              >
                  <ThumbsUp className="mr-2 h-5 w-5" /> Confirmer et Intégrer aux Alertes
              </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

    