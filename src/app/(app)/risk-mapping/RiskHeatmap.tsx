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

const likelihoodLevels = ["Très élevée", "Élevée", "Modérée", "Faible"];
const impactLevels = ["Faible", "Modéré", "Élevé", "Très élevé"];

const getCellColor = (probIndex: number, impactIndex: number) => {
    // probIndex: 0(Très élevée) -> 4, 1 -> 3, 2 -> 2, 3(Faible) -> 1
    // impactIndex: 0(Faible) -> 1, ... 3(Très élevé) -> 4

    const probScore = 4 - probIndex;
    const impactScore = impactIndex + 1;
    const score = probScore * impactScore;

    if (score <= 4) return "bg-emerald-50 hover:bg-emerald-100 border-emerald-200";
    if (score <= 8) return "bg-yellow-50 hover:bg-yellow-100 border-yellow-200";
    if (score <= 12) return "bg-orange-50 hover:bg-orange-100 border-orange-200";
    return "bg-rose-50 hover:bg-rose-100 border-rose-200";
};

const getScoreColor = (score: number) => {
    if (score <= 4) return "text-emerald-600";
    if (score <= 8) return "text-yellow-600";
    if (score <= 12) return "text-orange-600";
    return "text-rose-600";
};

export const RiskHeatmap: React.FC<RiskHeatmapProps> = ({ risks, onEditRisk }) => {

    // Group risks by cell coordinates
    const getRisksForCell = (likelihood: string, impact: string) => {
        return risks.filter(r => r.likelihood === likelihood && r.impact === impact);
    };

    return (
        <Card className="shadow-md border-0 bg-white/50 backdrop-blur-sm">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-800">Matrice des Risques (Heatmap)</CardTitle>
                        <CardDescription>Visualisation stratégique par Gravité (Impact x Probabilité)</CardDescription>
                    </div>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger><Info className="h-5 w-5 text-slate-400" /></TooltipTrigger>
                            <TooltipContent>
                                <p>Cliquez sur un groupe de risques pour voir les détails.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center">
                    <div className="relative p-4">
                        {/* Y-Axis Label */}
                        <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                            Probabilité
                        </div>

                        {/* Grid Container */}
                        <div className="grid grid-cols-[auto_1fr] gap-2">
                            {/* Y-Axis Scales */}
                            <div className="flex flex-col justify-around h-full pr-2 py-4">
                                {likelihoodLevels.map((l) => (
                                    <span key={l} className="text-xs text-slate-500 font-medium text-right h-24 flex items-center justify-end">{l}</span>
                                ))}
                            </div>

                            {/* Matrix Grid */}
                            <div className="grid grid-cols-4 grid-rows-4 gap-2 border-l-2 border-b-2 border-slate-300">
                                {likelihoodLevels.map((likelihood, lIndex) => (
                                    <React.Fragment key={likelihood}>
                                        {impactLevels.map((impact, iIndex) => {
                                            const cellRisks = getRisksForCell(likelihood, impact);
                                            const cellColor = getCellColor(lIndex, iIndex);

                                            // Calculate cell score range for tooltip or info
                                            const probScore = 4 - lIndex;
                                            const impactScore = iIndex + 1;
                                            const score = probScore * impactScore;

                                            return (
                                                <div
                                                    key={`${likelihood}-${impact}`}
                                                    className={`h-24 w-full min-w-[100px] border rounded-lg p-2 transition-all duration-200 cursor-pointer ${cellColor} flex flex-col items-start justify-start gap-1 overflow-hidden relative group`}
                                                    onClick={() => cellRisks.length > 0 && onEditRisk(cellRisks[0])} // For now just open first, ideally show list
                                                >
                                                    <div className="absolute top-1 right-2 text-[10px] font-bold opacity-30 group-hover:opacity-60">{score}</div>

                                                    {cellRisks.length > 0 ? (
                                                        <div className="w-full space-y-1 mt-1 z-10">
                                                            {cellRisks.slice(0, 3).map(risk => (
                                                                <div
                                                                    key={risk.id}
                                                                    onClick={(e) => { e.stopPropagation(); onEditRisk(risk); }}
                                                                    className="text-[9px] bg-white/60 hover:bg-white border hover:border-blue-400 rounded px-1.5 py-0.5 truncate shadow-sm transition-colors"
                                                                    title={risk.riskDescription}
                                                                >
                                                                    {risk.riskDescription}
                                                                </div>
                                                            ))}
                                                            {cellRisks.length > 3 && (
                                                                <div className="text-[9px] text-center font-bold text-slate-500 mt-1">
                                                                    + {cellRisks.length - 3} autres
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center opacity-10 font-black text-2xl text-slate-400 select-none">

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
                        <div className="mt-2 ml-10 flex flex-col items-center">
                            <div className="grid grid-cols-4 w-full gap-2 pl-[42px]"> {/* Align with grid */}
                                {impactLevels.map((i) => (
                                    <span key={i} className="text-xs text-slate-500 font-medium text-center">{i}</span>
                                ))}
                            </div>
                            <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">
                                Impact
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
