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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Risques</p>
                        <p className="text-2xl font-bold text-slate-700">{totalRisks}</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Risques Critiques</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-rose-700">{criticalPercentage}%</p>
                            <span className="text-xs text-slate-400">({criticalRisks})</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                        <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Score Moyen</p>
                        <p className="text-2xl font-bold text-amber-700">{avgScore}</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Sans Document</p>
                        <p className="text-2xl font-bold text-slate-700">{risksWithoutDocs}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
