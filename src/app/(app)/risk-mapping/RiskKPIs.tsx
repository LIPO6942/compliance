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
            <Card className="border-none shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-md overflow-hidden relative group transition-all hover:scale-[1.02]">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <ShieldCheck className="h-16 w-16" />
                </div>
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shadow-inner">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Risques</p>
                            <p className="text-3xl font-black font-headline tracking-tighter text-slate-900 dark:text-white">{totalRisks}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-md overflow-hidden relative group transition-all hover:scale-[1.02]">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <AlertTriangle className="h-16 w-16" />
                </div>
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 shadow-inner">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Risques Critiques</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-black font-headline tracking-tighter text-rose-600">{criticalPercentage}%</p>
                                <span className="text-xs font-bold text-slate-400">({criticalRisks})</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-md overflow-hidden relative group transition-all hover:scale-[1.02]">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingUp className="h-16 w-16" />
                </div>
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-inner">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Score Moyen</p>
                            <p className="text-3xl font-black font-headline tracking-tighter text-amber-600">{avgScore}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-md overflow-hidden relative group transition-all hover:scale-[1.02]">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <AlertCircle className="h-16 w-16" />
                </div>
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-slate-500/10 flex items-center justify-center text-slate-500 shadow-inner">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Sans Document</p>
                            <p className="text-3xl font-black font-headline tracking-tighter text-slate-900 dark:text-white">{risksWithoutDocs}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
