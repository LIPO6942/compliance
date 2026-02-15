import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { RiskMappingItem } from '@/types/compliance';
import { AlertCircle, ShieldCheck, TrendingUp, AlertTriangle } from 'lucide-react';

interface RiskKPIsProps {
    risks: RiskMappingItem[];
}

export const RiskKPIs: React.FC<RiskKPIsProps> = ({ risks }) => {
    const totalRisks = risks.length;

    const criticalRisks = risks.filter(r => r.riskLevel === 'Élevé' || r.riskLevel === 'Très élevé').length;
    const criticalPercentage = totalRisks > 0 ? Math.round((criticalRisks / totalRisks) * 100) : 0;

    const risksWithoutDocs = risks.filter(r => !r.documentIds || r.documentIds.length === 0).length;

    // Calcul du score moyen
    const likelihoodMap: Record<string, number> = { "Faible": 1, "Modérée": 2, "Élevée": 3, "Très élevée": 4 };
    const impactMap: Record<string, number> = { "Faible": 1, "Modéré": 2, "Élevé": 3, "Très élevé": 4 };

    const totalScore = risks.reduce((acc, r) => {
        const score = (likelihoodMap[r.likelihood] || 0) * (impactMap[r.impact] || 0);
        return acc + score;
    }, 0);
    const avgScore = totalRisks > 0 ? (totalScore / totalRisks).toFixed(1) : "0.0";

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            {/* Total Risques - Indigo Theme */}
            <Card className="border-none shadow-[0_20px_50px_-12px_rgba(79,70,229,0.1)] bg-white dark:bg-slate-900 overflow-hidden relative group transition-all hover:-translate-y-1 rounded-[2rem]">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all" />
                <CardContent className="p-8 relative z-10">
                    <div className="flex flex-col gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-900/50">
                            <ShieldCheck className="h-7 w-7" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Risques</p>
                            <p className="text-4xl font-black font-headline tracking-tighter text-slate-900 dark:text-white">{totalRisks}</p>
                        </div>
                    </div>
                    <div className="absolute right-8 bottom-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <ShieldCheck className="h-20 w-20" />
                    </div>
                </CardContent>
            </Card>

            {/* Risques Critiques - Rose Theme */}
            <Card className="border-none shadow-[0_20px_50px_-12px_rgba(225,29,72,0.1)] bg-white dark:bg-slate-900 overflow-hidden relative group transition-all hover:-translate-y-1 rounded-[2rem]">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all" />
                <CardContent className="p-8 relative z-10">
                    <div className="flex flex-col gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm border border-rose-100/50 dark:border-rose-900/50">
                            <AlertTriangle className="h-7 w-7" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Risques Critiques</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-black font-headline tracking-tighter text-rose-600">{criticalPercentage}%</p>
                                <span className="text-xs font-bold text-slate-400">({criticalRisks})</span>
                            </div>
                        </div>
                    </div>
                    <div className="absolute right-8 bottom-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <AlertTriangle className="h-20 w-20 rotate-12" />
                    </div>
                </CardContent>
            </Card>

            {/* Score Moyen - Amber Theme */}
            <Card className="border-none shadow-[0_20px_50px_-12px_rgba(245,158,11,0.1)] bg-white dark:bg-slate-900 overflow-hidden relative group transition-all hover:-translate-y-1 rounded-[2rem]">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all" />
                <CardContent className="p-8 relative z-10">
                    <div className="flex flex-col gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm border border-amber-100/50 dark:border-amber-900/50">
                            <TrendingUp className="h-7 w-7" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Score Moyen</p>
                            <p className="text-4xl font-black font-headline tracking-tighter text-amber-600">{avgScore}</p>
                        </div>
                    </div>
                    <div className="absolute right-8 bottom-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <TrendingUp className="h-20 w-20 -rotate-12" />
                    </div>
                </CardContent>
            </Card>

            {/* Sans Document - Slate Theme */}
            <Card className="border-none shadow-[0_20px_50px_-12px_rgba(71,85,105,0.1)] bg-white dark:bg-slate-900 overflow-hidden relative group transition-all hover:-translate-y-1 rounded-[2rem]">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-slate-500/5 rounded-full blur-2xl group-hover:bg-slate-500/10 transition-all" />
                <CardContent className="p-8 relative z-10">
                    <div className="flex flex-col gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 shadow-sm border border-slate-200 dark:border-slate-700">
                            <AlertCircle className="h-7 w-7" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sans Document</p>
                            <p className="text-4xl font-black font-headline tracking-tighter text-slate-900 dark:text-white">{risksWithoutDocs}</p>
                        </div>
                    </div>
                    <div className="absolute right-8 bottom-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <AlertCircle className="h-20 w-20" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
