import React from 'react';
import { RiskMappingItem } from '@/types/compliance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from 'lucide-react';

interface RiskHeatmapProps {
    risks: RiskMappingItem[];
    onEditRisk: (risk: RiskMappingItem) => void;
}

const probabiliteLevels = [4, 3, 2, 1]; // top to bottom (highest first)
const impactLevels = [1, 2, 3, 4]; // left to right
const probabiliteLabels: Record<number, string> = { 1: "Faible", 2: "Modérée", 3: "Élevée", 4: "Très élevée" };
const impactLabels: Record<number, string> = { 1: "Faible", 2: "Modéré", 3: "Élevé", 4: "Très élevé" };

const getCellColor = (probValue: number, impactValue: number) => {
    const score = probValue * impactValue;
    if (score <= 4) return "bg-emerald-50 hover:bg-emerald-100 border-emerald-200";
    if (score <= 8) return "bg-yellow-50 hover:bg-yellow-100 border-yellow-200";
    if (score <= 12) return "bg-orange-50 hover:bg-orange-100 border-orange-200";
    return "bg-rose-50 hover:bg-rose-100 border-rose-200";
};

export const RiskHeatmap: React.FC<RiskHeatmapProps> = ({ risks, onEditRisk }) => {

    const getRisksForCell = (probValue: number, impactValue: number) => {
        return risks.filter(r => r.probabilite === probValue && r.impact === impactValue);
    };

    const groupRisksByCategory = (cellRisks: RiskMappingItem[]) => {
        const grouped: Record<string, RiskMappingItem[]> = {};
        cellRisks.forEach(risk => {
            if (!grouped[risk.category]) grouped[risk.category] = [];
            grouped[risk.category].push(risk);
        });
        return grouped;
    };

    return (
        <Card className="shadow-md border-0 bg-white/50 backdrop-blur-sm">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-800">Matrice des Risques (Heatmap)</CardTitle>
                        <CardDescription>Visualisation stratégique par Gravité (Impact x Probabilité) - Groupée par Catégorie</CardDescription>
                    </div>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger><Info className="h-5 w-5 text-slate-400" /></TooltipTrigger>
                            <TooltipContent>
                                <p>Cliquez sur un risque pour voir les détails. Les risques sont groupés par catégorie.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center">
                    <div className="relative p-4 w-full">
                        {/* Y-Axis Label */}
                        <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap">
                            Probabilité
                        </div>

                        {/* Grid Container */}
                        <div className="grid grid-cols-[auto_1fr] gap-4">
                            {/* Y-Axis Scales */}
                            <div className="flex flex-col justify-around h-full pr-2 py-4">
                                {probabiliteLevels.map((p) => (
                                    <span key={p} className="text-[10px] text-slate-500 font-bold text-right h-32 flex items-center justify-end uppercase tracking-tighter">
                                        {p} — {probabiliteLabels[p]}
                                    </span>
                                ))}
                            </div>

                            {/* Matrix Grid */}
                            <div className="grid grid-cols-4 grid-rows-4 gap-3 border-l-2 border-b-2 border-slate-200 dark:border-slate-800">
                                {probabiliteLevels.map((probValue) => (
                                    <React.Fragment key={probValue}>
                                        {impactLevels.map((impactValue) => {
                                            const cellRisks = getRisksForCell(probValue, impactValue);
                                            const cellColor = getCellColor(probValue, impactValue);
                                            const score = probValue * impactValue;
                                            const groupedRisks = groupRisksByCategory(cellRisks);

                                            return (
                                                <div
                                                    key={`${probValue}-${impactValue}`}
                                                    className={`h-32 w-full min-w-[150px] border rounded-xl p-2.5 transition-all duration-200 ${cellColor} flex flex-col items-start justify-start gap-1 overflow-y-auto custom-scrollbar relative group shadow-sm`}
                                                >
                                                    <div className="absolute top-1.5 right-2 text-[10px] font-black opacity-20 group-hover:opacity-40">{score}</div>

                                                    {cellRisks.length > 0 ? (
                                                        <div className="w-full space-y-3 mt-1">
                                                            {Object.entries(groupedRisks).map(([category, categoryRisks]) => (
                                                                <div key={category} className="space-y-1">
                                                                    <div className="flex items-center gap-1.5 mb-1">
                                                                        <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 leading-none">{category}</span>
                                                                    </div>
                                                                    <div className="flex flex-col gap-1 pl-2 border-l border-slate-200/50">
                                                                        {categoryRisks.map(risk => (
                                                                            <button
                                                                                key={risk.id}
                                                                                onClick={() => onEditRisk(risk)}
                                                                                className="text-[9px] text-left font-semibold text-slate-700 hover:text-primary hover:underline transition-colors line-clamp-1"
                                                                                title={risk.riskDescription}
                                                                            >
                                                                                • {risk.riskDescription}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center opacity-[0.03] font-black text-4xl text-slate-400 select-none">
                                                            {score}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        {/* X-Axis Label */}
                        <div className="mt-4 ml-20 flex flex-col items-center">
                            <div className="grid grid-cols-4 w-full gap-3 pl-[30px]">
                                {impactLevels.map((i) => (
                                    <span key={i} className="text-[10px] text-slate-500 font-bold text-center uppercase tracking-tighter">{i} — {impactLabels[i]}</span>
                                ))}
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-4">
                                Impact
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
