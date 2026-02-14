
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, RefreshCw, Workflow, LayoutGrid, Layers, ShieldCheck, Zap } from "lucide-react";
import { usePlanData } from "@/contexts/PlanDataContext";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlanHeaderProps {
  onAddCategory: () => void;
}

export function PlanHeader({ onAddCategory }: PlanHeaderProps) {
  const { resetToInitialData, activeWorkflows } = usePlanData();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await resetToInitialData();
      toast({
        title: "Données synchronisées",
        description: "Le plan de conformité a été remis à jour avec les derniers standards.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur de synchronisation",
        description: "Une erreur est survenue lors de la mise à jour des données.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Premium Gradient Header */}
      <div className="relative">
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
          <div className="space-y-3">
            <Badge variant="outline" className="border-indigo-500/50 text-indigo-500 bg-indigo-500/5 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              Gouvernance Opérationnelle
            </Badge>
            <h1 className="text-5xl font-black font-headline tracking-tighter text-slate-900 dark:text-white uppercase italic leading-none">
              Compliance <span className="text-primary">Architecture</span>
            </h1>
            <p className="text-muted-foreground text-xl max-w-2xl leading-relaxed">
              Plan d'organisation holistique des <span className="text-slate-900 dark:text-white font-bold">processus prioritaires</span> et des responsabilités GRC.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <Link href="/admin/workflows">
              <Button variant="outline" className="h-14 px-6 rounded-2xl border-slate-200 dark:border-slate-800 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all shadow-xl shadow-slate-200/20">
                <Workflow className="mr-2 h-4 w-4 text-indigo-500" />
                Admin Logic
              </Button>
            </Link>
            <Button variant="outline" onClick={handleSync} disabled={isSyncing} className="h-14 px-6 rounded-2xl border-slate-200 dark:border-slate-800 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all shadow-xl shadow-slate-200/20">
              <RefreshCw className={cn("mr-2 h-4 w-4 text-emerald-500", isSyncing && "animate-spin")} />
              Sync Standards
            </Button>
            <Button onClick={onAddCategory} className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-slate-900/40">
              <PlusCircle className="mr-3 h-5 w-5" /> Nouvelle Catégorie
            </Button>
          </div>
        </div>
      </div>

      {/* Raccourcis & Quick Access */}
      <Card className="shadow-2xl border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden group">
        <CardContent className="p-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl text-primary transform group-hover:rotate-6 transition-transform">
                <LayoutGrid className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-black italic uppercase tracking-tighter">Plan de Référence GRC</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">Éléments de contrôle actifs dans le système</p>
              </div>
            </div>

            <div className="flex items-center gap-4 border-l border-slate-100 dark:border-slate-800 pl-6 h-12">
              <div className="text-center">
                <p className="text-[8px] font-black uppercase opacity-30">Workflows</p>
                <p className="text-xl font-black">{Object.keys(activeWorkflows).length}</p>
              </div>
              <div className="w-px h-8 bg-slate-100 dark:bg-slate-800 mx-2" />
              <div className="text-center">
                <p className="text-[8px] font-black uppercase opacity-30">Standards</p>
                <p className="text-xl font-black">2026+</p>
              </div>
            </div>
          </div>

          {Object.keys(activeWorkflows).length > 0 && (
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 items-center">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mr-4 flex items-center gap-2">
                <Zap className="h-3 w-3 text-primary fill-primary" /> Raccourcis Processus :
              </p>
              {Object.entries(activeWorkflows)
                .sort(([, a], [, b]) => (a.order ?? 999) - (b.order ?? 999))
                .map(([id, wf]) => (
                  <Button
                    key={id}
                    variant="ghost"
                    size="sm"
                    className="h-10 px-5 text-[10px] font-black rounded-xl bg-slate-50 dark:bg-slate-950/50 hover:bg-primary hover:text-white transition-all hover:scale-105 border border-transparent hover:border-primary/20 uppercase tracking-widest"
                    onClick={() => {
                      const el = document.getElementById(id);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    {wf.name || id}
                  </Button>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
