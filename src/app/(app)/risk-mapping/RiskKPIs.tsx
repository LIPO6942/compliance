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

    // Average score using numeric probabilite * impact
    const totalScore = risks.reduce((acc, r) => {
        const score = (r.probabilite || 1) * (r.impact || 1);
        return acc + score;
    }, 0);
    const avgScore = totalRisks > 0 ? (totalScore / totalRisks).toFixed(1) : "0.0";

    // Score le plus élevé
    const maxScore = totalRisks > 0
        ? Math.max(...risks.map(r => (r.probabilite || 1) * (r.impact || 1)))
        : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Total Risques - Indigo Theme */}
            <Card className="border-none shadow-md bg-white dark:bg-slate-900 overflow-hidden relative group transition-all hover:-translate-y-1 rounded-xl">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all" />
                <CardContent className="p-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-900/50">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Risques</p>
                            <p className="text-2xl font-black font-headline tracking-tighter text-slate-900 dark:text-white">{totalRisks}</p>
                        </div>
                    </div>
                    <div className="absolute right-8 bottom-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <ShieldCheck className="h-20 w-20" />
                    </div>
                </CardContent>
            </Card>

            {/* Risques Critiques - Rose Theme */}
            <Card className="border-none shadow-md bg-white dark:bg-slate-900 overflow-hidden relative group transition-all hover:-translate-y-1 rounded-xl">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all" />
                <CardContent className="p-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm border border-rose-100/50 dark:border-rose-900/50">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Risques Critiques</p>
                            <div className="flex items-baseline gap-1">
                                <p className="text-2xl font-black font-headline tracking-tighter text-rose-600">{criticalPercentage}%</p>
                                <span className="text-[10px] font-bold text-slate-400">({criticalRisks})</span>
                            </div>
                        </div>
                    </div>
                    <div className="absolute right-8 bottom-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <AlertTriangle className="h-20 w-20 rotate-12" />
                    </div>
                </CardContent>
            </Card>

            {/* Score Moyen - Amber Theme */}
            <Card className="border-none shadow-md bg-white dark:bg-slate-900 overflow-hidden relative group transition-all hover:-translate-y-1 rounded-xl">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all" />
                <CardContent className="p-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm border border-amber-100/50 dark:border-amber-900/50">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Score Moyen</p>
                            <p className="text-2xl font-black font-headline tracking-tighter text-amber-600">{avgScore}</p>
                        </div>
                    </div>
                    <div className="absolute right-8 bottom-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <TrendingUp className="h-20 w-20 -rotate-12" />
                    </div>
                </CardContent>
            </Card>

            {/* Score Max - Slate Theme */}
            <Card className="border-none shadow-md bg-white dark:bg-slate-900 overflow-hidden relative group transition-all hover:-translate-y-1 rounded-xl">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-slate-500/5 rounded-full blur-2xl group-hover:bg-slate-500/10 transition-all" />
                <CardContent className="p-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 shadow-sm border border-slate-200 dark:border-slate-700">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Score Max</p>
                            <p className="text-2xl font-black font-headline tracking-tighter text-slate-900 dark:text-white">{maxScore}</p>
                        </div>
                    </div>
                    <div className="absolute right-4 bottom-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <AlertCircle className="h-16 w-16" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
