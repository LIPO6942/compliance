"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FilePieChart, Download, Settings2, CalendarDays, BarChart3, Filter, Mail, Share2, CheckCircle as CheckCircleIcon, ShieldAlert, Users, MessageSquareWarning, ArrowRight, Zap, Target, FileSearch, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/icons/Logo";
import { cn } from "@/lib/utils";

const ReportTemplateCard = ({ title, description, icon: Icon, onSelect, active }: { title: string, description: string, icon: React.ElementType, onSelect: () => void, active?: boolean }) => (
  <Card
    className={cn(
      "group relative overflow-hidden transition-all duration-500 cursor-pointer border-none shadow-xl hover:-translate-y-2",
      active ? "bg-slate-900 text-white scale-[1.02] ring-4 ring-primary/20" : "bg-white dark:bg-slate-900 hover:shadow-2xl"
    )}
    onClick={onSelect}
  >
    <div className={cn("absolute top-0 right-0 w-32 h-32 opacity-5 rounded-bl-[5rem] group-hover:scale-110 transition-transform", active ? "bg-white" : "bg-primary")} />
    <CardHeader className="p-8 pb-4">
      <div className={cn("inline-flex p-4 rounded-2xl shadow-lg mb-6 group-hover:rotate-12 transition-transform", active ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-primary")}>
        <Icon className="h-6 w-6" />
      </div>
      <CardTitle className="text-xl font-black font-headline tracking-tighter uppercase italic">{title}</CardTitle>
      <CardDescription className={cn("text-xs font-bold mt-2 uppercase tracking-tighter", active ? "text-slate-400" : "text-muted-foreground")}>
        {description}
      </CardDescription>
    </CardHeader>
    <CardContent className="px-8 pb-8 pt-4">
      <Button variant={active ? "default" : "outline"} className={cn("w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all", active ? "bg-primary text-white border-none" : "border-slate-200 dark:border-slate-800")}>
        {active ? "Configuration en cours..." : "Explorer ce modèle"}
        <ArrowRight className="ml-2 h-3 w-3" />
      </Button>
    </CardContent>
  </Card>
);


export default function ReportsPage() {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState<string | null>(null);
  const [reportGenerated, setReportGenerated] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const handleGenerateReport = () => {
    if (!selectedReport) return;

    setIsGenerating(true);
    setReportGenerated(false);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          setReportGenerated(true);
          return 100;
        }
        return prev + 2;
      });
    }, 50);
  };

  const reportTemplates = [
    { id: "compliance_summary", title: "Monthly Pulse", description: "Audit synthétique des flux de conformité.", icon: BarChart3 },
    { id: "lab_ft_activity", title: "LAB-FT Vector", description: "Vigilance accrue sur les circuits financiers.", icon: ShieldAlert },
    { id: "training_status", title: "Skill Matrix", description: "Cartographie du niveau d'expertise réglo-métier.", icon: Users },
    { id: "incident_report", title: "Crisis Analytica", description: "Détection et remédiation des ruptures de conformité.", icon: MessageSquareWarning },
  ];


  return (
    <div className="space-y-12 pb-20 overflow-hidden">

      {/* Header Section */}
      <div className="relative">
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="relative z-10 space-y-3">
          <Badge variant="outline" className="border-primary/50 text-primary bg-primary/5 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            Data Export Engine
          </Badge>
          <h1 className="text-5xl font-black font-headline tracking-tighter text-slate-900 dark:text-white uppercase italic leading-none">
            Intelligence <span className="text-primary">Reports</span>
          </h1>
          <p className="text-muted-foreground text-xl max-w-2xl leading-relaxed">
            Consolidez et exportez vos données GRC au format <span className="text-slate-900 dark:text-white font-bold underline decoration-primary underline-offset-4 italic px-1">Prêt pour Audit</span>.
          </p>
        </div>
      </div>

      {/* Model Selection */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">01. Choix du vecteur d'analyse</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reportTemplates.map(template => (
            <ReportTemplateCard
              key={template.id}
              title={template.title}
              description={template.description}
              icon={template.icon}
              active={selectedReport === template.id}
              onSelect={() => {
                setSelectedReport(template.id);
                setReportGenerated(false);
              }}
            />
          ))}
        </div>
      </div>

      {/* Configuration Section */}
      {selectedReport && !isGenerating && !reportGenerated && (
        <Card className="shadow-2xl border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
          <CardHeader className="p-10 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <Settings2 className="h-5 w-5 text-indigo-500" />
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">02. Paramétrage des Variables</h2>
              </div>
              <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3 mt-2">
                Configuration: <span className="text-primary italic uppercase">{reportTemplates.find(rt => rt.id === selectedReport)?.title}</span>
              </CardTitle>
            </div>
            <Button variant="outline" onClick={() => setSelectedReport(null)} className="rounded-xl font-bold h-10 border-slate-200 dark:border-slate-800 italic uppercase text-[10px] tracking-widest px-4">
              Retour aux modèles
            </Button>
          </CardHeader>
          <CardContent className="p-10 space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 flex items-center gap-2 px-1">
                  <CalendarDays className="h-3 w-3" /> Période d'Extraction
                </Label>
                <DatePickerWithRange />
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 flex items-center gap-2 px-1">
                  <FileSearch className="h-3 w-3" /> Format de Sortie
                </Label>
                <Select defaultValue="pdf">
                  <SelectTrigger className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold">
                    <SelectValue placeholder="Choisir un format" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem value="pdf" className="font-bold">ADOBE PDF (.pdf)</SelectItem>
                    <SelectItem value="xlsx" className="font-bold">EXCEL DATA (.xlsx)</SelectItem>
                    <SelectItem value="csv" className="font-bold">RAW COMMA (.csv)</SelectItem>
                    <SelectItem value="docx" className="font-bold">WORD DOC (.docx)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 flex items-center gap-2 px-1">
                  <Filter className="h-3 w-3" /> Entité / Segment
                </Label>
                <Select defaultValue="all">
                  <SelectTrigger className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none font-bold"><SelectValue placeholder="Département..." /></SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem value="all" className="font-bold">GLOBAL (Toutes directions)</SelectItem>
                    <SelectItem value="juridiques" className="font-bold">JURIDIQUES</SelectItem>
                    <SelectItem value="finances" className="font-bold">FINANCES</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-950/20 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                  <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-black">Résumé Exécutif IA</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Générer automatiquement une synthèse décisionnelle</p>
                </div>
              </div>
              <input type="checkbox" defaultChecked className="w-6 h-6 rounded-lg text-primary bg-white dark:bg-slate-800 border-none shadow-inner" />
            </div>
          </CardContent>
          <CardFooter className="p-10 pt-0 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <p className="text-[10px] font-black uppercase tracking-widest">Génération certifiée ISO/IEC 27001</p>
            </div>
            <Button onClick={handleGenerateReport} disabled={isGenerating} size="lg" className="h-16 px-10 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-slate-900/20 w-full sm:w-auto overflow-hidden group">
              <Download className="mr-3 h-5 w-5" />
              Compiler et Exporter
              <div className="absolute inset-x-0 bottom-0 h-1 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Generation Pulse */}
      {isGenerating && (
        <Card className="shadow-2xl border-none bg-slate-900 text-white rounded-[2.5rem] p-12 text-center space-y-8 animate-pulse">
          <div className="mx-auto w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center relative">
            <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping" />
            <Logo className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-4 max-w-sm mx-auto">
            <p className="text-xs font-black uppercase tracking-[0.4em] opacity-40">Traitement en cours</p>
            <h3 className="text-3xl font-black font-headline tracking-tighter uppercase italic">Compilation de <span className="text-primary italic underline decoration-white/20 underline-offset-8">votre Rapport</span></h3>
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <Progress value={progress} className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.4)]" style={{ width: `${progress}%` }} />
            </Progress>
            <p className="text-[9px] font-black uppercase tracking-widest text-primary">{progress}% - Extraction du bloc sémantique...</p>
          </div>
        </Card>
      )}

      {/* Success View */}
      {reportGenerated && (
        <Card className="shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border-none bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden animate-in zoom-in-95 duration-700">
          <CardHeader className="p-12 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black uppercase px-2 mb-2 tracking-widest">Prêt pour téléchargement</Badge>
              <CardTitle className="text-4xl font-black font-headline tracking-tighter uppercase italic flex items-center gap-4">
                Exportation <span className="text-emerald-500">Réussie</span>
                <CheckCircleIcon className="h-8 w-8 text-emerald-500" />
              </CardTitle>
            </div>
            <Button variant="outline" onClick={() => setReportGenerated(false)} className="rounded-xl font-bold h-10 border-slate-200 dark:border-slate-800 italic uppercase text-[10px] tracking-widest px-4">
              Générer un autre document
            </Button>
          </CardHeader>
          <CardContent className="px-12 pb-12 space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-[2rem] blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative bg-slate-100 dark:bg-slate-950 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 aspect-video flex flex-col items-center justify-center text-center">
                  <FilePieChart className="h-20 w-20 text-slate-300 mb-6" />
                  <p className="text-xl font-black italic uppercase tracking-tighter opacity-30">Audit Data Visualization</p>
                  <p className="text-xs font-bold text-muted-foreground uppercase mt-2">Aperçu dynamique généré</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Détails du fichier</h4>
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed italic">
                    Le rapport <span className="text-slate-900 dark:text-white">"{reportTemplates.find(rt => rt.id === selectedReport)?.title}"</span> a été encrypté et validé par le checksum GRC-2026.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Button size="lg" className="h-16 rounded-2xl bg-indigo-600 hover:bg-primary text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-indigo-500/20 group">
                    <Download className="mr-3 h-5 w-5" /> Télécharger mon archive PDF
                    <ArrowRight className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                  </Button>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 h-14 rounded-2xl border-slate-200 dark:border-slate-800 font-bold uppercase text-[10px] tracking-widest">
                      <Mail className="mr-2 h-4 w-4 text-primary" /> Par Email
                    </Button>
                    <Button variant="outline" className="flex-1 h-14 rounded-2xl border-slate-200 dark:border-slate-800 font-bold uppercase text-[10px] tracking-widest">
                      <Share2 className="mr-2 h-4 w-4 text-primary" /> Copier le lien
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                  <p className="text-[10px] font-black uppercase text-emerald-600 tracking-tighter">Bonus: Résumé IA inclus dans l'archive</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
