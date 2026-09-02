'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { usePlanData } from '@/contexts/PlanDataContext';
import { useRiskMapping } from '@/contexts/RiskMappingContext';
import { AlertTriangle } from 'lucide-react';
import { ensureMermaidLoaded, annotateMermaidCode } from '@/lib/workflowPrint';

declare global {
    interface Window {
        mermaid: any;
    }
}

interface MermaidRendererProps {
    chart: string;
    workflowId?: string;
    onNodeClick?: (id: string) => void;
    onEditTask?: (task: any) => void;
    zoom?: number;
    fitMode?: boolean;
}

const riskLevelToNumber = (level: string): number => {
    switch (level) {
        case 'Faible': return 1;
        case 'Modéré': return 2;
        case 'Élevé': return 3;
        case 'Très élevé': return 4;
        default: return 0;
    }
};

const riskLevelConfig: Record<string, { emoji: string; bg: string; border: string; text: string; label: string }> = {
    'Faible': { emoji: '🟢', bg: '#ecfdf5', border: '#86efac', text: '#166534', label: 'Risque Faible' },
    'Modéré': { emoji: '🟡', bg: '#fefce8', border: '#fde047', text: '#854d0e', label: 'Risque Modéré' },
    'Élevé': { emoji: '🟠', bg: '#fff7ed', border: '#fdba74', text: '#9a3412', label: 'Risque Élevé' },
    'Très élevé': { emoji: '🔴', bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', label: 'Risque Très élevé' },
};

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart, workflowId, onEditTask, zoom = 1, fitMode = false }) => {
    const uniqueId = useMemo(() => Math.random().toString(36).substring(7), []);
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [retryCount, setRetryCount] = useState<number>(0);
    const { workflowTasks, planData, availableUsers } = usePlanData();
    const { risks: allRisks } = useRiskMapping();

    // Calcul du score de risque global pour ce workflow
    const workflowRiskInfo = useMemo(() => {
        const chartId = workflowId || '';
        if (!chartId) return null;

        const collectLinkedTasks = (tasks: any[]): any[] => {
            let found: any[] = [];
            tasks.forEach(t => {
                if (t.grcWorkflowId === chartId && t.risks && t.risks.length > 0) {
                    found.push(t);
                }
                if (t.branches) {
                    t.branches.forEach((b: any) => {
                        found = [...found, ...collectLinkedTasks(b.tasks)];
                    });
                }
            });
            return found;
        };

        const linkedTasks = planData.flatMap((cat: any) =>
            cat.subCategories.flatMap((sub: any) => collectLinkedTasks(sub.tasks))
        );

        if (linkedTasks.length === 0) return null;

        const allRiskIds = [...new Set(linkedTasks.flatMap((t: any) => t.risks || []))];
        const linkedRisks = allRisks.filter(r => allRiskIds.includes(r.id));

        if (linkedRisks.length === 0) return null;

        let maxLevel = 0;
        let maxLevelLabel = '';
        linkedRisks.forEach(r => {
            const lvl = riskLevelToNumber(r.riskLevel);
            if (lvl > maxLevel) {
                maxLevel = lvl;
                maxLevelLabel = r.riskLevel;
            }
        });

        const avgScore = linkedRisks.reduce((sum, r) => sum + riskLevelToNumber(r.riskLevel), 0) / linkedRisks.length;

        return {
            totalRisks: linkedRisks.length,
            maxLevel: maxLevelLabel,
            avgScore: Math.round(avgScore * 10) / 10,
            config: riskLevelConfig[maxLevelLabel] || riskLevelConfig['Faible'],
        };
    }, [workflowId, planData, allRisks]);

    useEffect(() => {
        let isMounted = true;

        const renderChart = async () => {
            if (!chart || typeof window === 'undefined') {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const mermaid = await ensureMermaidLoaded();
                if (!isMounted) return;

                if (!mermaid) {
                    throw new Error("Le moteur Mermaid n'a pas pu être initialisé.");
                }

                const annotatedChart = annotateMermaidCode(chart, {
                    workflowId,
                    planData,
                    workflowTasks,
                    availableUsers,
                    allRisks,
                    uniqueId
                });

                // Callback global pour le clic sur les nœuds
                const callbackName = `mermaidClick_${uniqueId}`;
                (window as any)[callbackName] = (nodeId: string) => {
                    const task = workflowTasks.find(t => t.nodeId === nodeId && t.workflowId === workflowId);
                    if (task && onEditTask) {
                        onEditTask(task);
                    }
                };

                const domId = `mermaid_svg_${uniqueId}_${Date.now()}`;

                try {
                    const { svg: generatedSvg } = await mermaid.render(domId, annotatedChart);
                    if (isMounted) {
                        setSvg(generatedSvg);
                        setError(null);
                    }
                } catch (renderError: any) {
                    console.warn('Erreur de rendu Mermaid annoté, tentative avec le code brut:', renderError);
                    try {
                        const simpleId = `mermaid_simple_${uniqueId}_${Date.now()}`;
                        const { svg: simpleSvg } = await mermaid.render(simpleId, chart);
                        if (isMounted) {
                            setSvg(simpleSvg);
                            setError(null);
                        }
                    } catch (fallbackError: any) {
                        console.warn('Échec du rendu Mermaid:', fallbackError);
                        if (isMounted) {
                            const cleanMsg = (fallbackError?.message || renderError?.message || 'Erreur de syntaxe Mermaid')
                                .replace(/<[^>]*>?/gm, '');
                            setError(`Syntaxe du diagramme en cours d'édition ou non reconnue : ${cleanMsg}`);
                        }
                    }
                }
            } catch (err: any) {
                console.error('Erreur chargement/transformation Mermaid:', err);
                if (isMounted) {
                    setError(err?.message || "Impossible de charger le moteur Mermaid. Vérifiez votre connexion Internet.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        const timeout = setTimeout(renderChart, 50);

        return () => {
            isMounted = false;
            clearTimeout(timeout);
            const callbackName = `mermaidClick_${uniqueId}`;
            delete (window as any)[callbackName];
        };
    }, [chart, workflowTasks, workflowId, planData, availableUsers, allRisks, onEditTask, uniqueId, retryCount]);

    if (error && !svg) {
        return (
            <div className="w-full h-full flex items-center justify-center p-6">
                <div className="max-w-lg w-full bg-rose-50/90 backdrop-blur-md border border-rose-200 rounded-3xl p-6 flex flex-col items-center text-center gap-4 shadow-xl">
                    <div className="h-12 w-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shadow-inner">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div className="space-y-1 w-full">
                        <h3 className="text-base font-black text-rose-900">Affichage du diagramme</h3>
                        <p className="text-xs text-rose-700/80">Le flux n&apos;a pas pu être généré automatiquement.</p>
                        <div className="text-[11px] text-rose-800 font-mono bg-white/80 p-3 rounded-xl border border-rose-200/60 text-left overflow-auto max-h-[100px] mt-2 select-all">
                            {error}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setRetryCount(r => r + 1)}
                        className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"
                    >
                        <span>🔄</span> Réessayer le chargement
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full relative group p-1 flex flex-col overflow-visible">
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;800&display=swap');
                
                /* Layout global Mermaid */
                .mermaid svg { 
                    ${fitMode ? `
                        max-width: 100% !important;
                        max-height: 100% !important;
                        width: 100% !important;
                        height: auto !important;
                    ` : `
                        min-width: ${zoom * 1000}px;
                        width: 100% !important; 
                        height: auto !important;
                    `}
                    filter: drop-shadow(0 15px 30px rgba(0,0,0,0.05)); 
                    margin: 0 auto !important; 
                    display: block !important;
                }
                
                /* Styles des noeuds HTML injectés */
                .node-label-main { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 13px; color: #1e293b; margin-bottom: 4px; }
                .assignee-info-box { margin-top: 8px; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 6px; text-align: center; width: 100%; }
                .assignee-row { display: flex; flex-direction: column; align-items: center; gap: 2px; margin-bottom: 6px; }
                .assignee-row:last-child { margin-bottom: 0; }
                
                /* Masquer les erreurs brutes injectées par Mermaid en bas de page */
                body > div[id^="dmermaid"] { visibility: hidden !important; position: absolute !important; left: -10000px !important; top: 0 !important; }
                body > div[id^="mermaid-error"] { display: none !important; }
                
                .grc-row { border-top: 1px dashed rgba(0,0,0,0.1); margin-top: 4px; padding-top: 4px; }

                .assignee-name { font-family: 'Outfit', sans-serif; font-weight: 600; color: #475569; font-size: 10px; margin-bottom: 1px; white-space: nowrap; }
                .assignee-role-badge { 
                    font-family: 'Outfit', sans-serif; font-size: 8px; background: #ffffff; color: #64748b; 
                    display: inline-block; padding: 1px 8px; border-radius: 10px; font-weight: 800; 
                    border: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.05em;
                }
                .grc-row .assignee-role-badge { background: #f0f9ff; color: #0369a1; border-color: #bae6fd; }

                .linked-task-name { font-size: 8px; color: #64748b; font-style: italic; margin-bottom: 2px; text-decoration: underline; text-decoration-color: #cbd5e1; }
                .assignee-group { display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; }
                .icon { font-size: 8px; margin-right: 1px; }

                .approver-row { background: #ecfdf5; border-radius: 4px; padding: 2px 6px; margin-top: 3px; font-size: 9px; display: flex; align-items: center; gap: 4px; border: 1px solid #a7f3d0; width: 90%; justify-content: center; }
                .approver-label { color: #059669; font-weight: 700; font-size: 7px; text-transform: uppercase; }
                .approver-name { color: #047857; font-weight: 600; }

                /* === RISK BADGE STYLES === */
                .risk-badge-node {
                    display: flex; align-items: center; justify-content: center; gap: 4px;
                    margin-top: 6px; padding: 3px 10px; border-radius: 12px;
                    font-family: 'Outfit', sans-serif; font-size: 9px; font-weight: 700;
                    animation: riskPulse 2s ease-in-out infinite;
                }
                .risk-badge-emoji { font-size: 10px; }
                .risk-badge-label { text-transform: uppercase; letter-spacing: 0.03em; }
                .risk-badge-count { opacity: 0.7; font-weight: 500; font-size: 8px; }

                @keyframes riskPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.85; }
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                /* Animations & Interactivité */
                .mermaid .node rect, .mermaid .node circle, .mermaid .node polygon { transition: all 0.3s ease !important; }
                .mermaid .node:hover rect, .mermaid .node:hover circle, .mermaid .node:hover polygon { filter: brightness(0.98); transform: translateY(-3px); }
                .mermaid .node.clickable { cursor: pointer !important; }
                .mermaid .edgePath path { stroke: #94a3b8 !important; stroke-width: 2px !important; }
                .mermaid .edgePath:hover path { stroke: #6366f1 !important; stroke-width: 3px !important; }
            ` }} />

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-gradient-to-tr from-indigo-500/5 to-emerald-500/5 blur-[100px] opacity-30 pointer-events-none -z-10" />

            {/* === BANNIÈRE DE SCORE DE RISQUE GLOBAL DU PROCESSUS === */}
            {workflowRiskInfo && (
                <div
                    className="mb-4 flex items-center justify-between gap-4 px-6 py-3 rounded-2xl border-2 shadow-sm transition-all duration-500 animate-[fadeIn_0.5s_ease-out_forwards]"
                    style={{
                        background: workflowRiskInfo.config.bg,
                        borderColor: workflowRiskInfo.config.border,
                    }}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{workflowRiskInfo.config.emoji}</span>
                        <div>
                            <div className="text-xs font-black uppercase tracking-wider" style={{ color: workflowRiskInfo.config.text }}>
                                Indice de Risque Global
                            </div>
                            <div className="text-[10px] font-medium opacity-70" style={{ color: workflowRiskInfo.config.text }}>
                                Niveau max: {workflowRiskInfo.maxLevel} • Score moyen: {workflowRiskInfo.avgScore}/4
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div
                            className="flex flex-col items-center px-4 py-1.5 rounded-xl border"
                            style={{
                                background: 'rgba(255,255,255,0.6)',
                                borderColor: workflowRiskInfo.config.border
                            }}
                        >
                            <span className="text-lg font-black" style={{ color: workflowRiskInfo.config.text }}>
                                {workflowRiskInfo.totalRisks}
                            </span>
                            <span className="text-[8px] font-bold uppercase tracking-widest opacity-60" style={{ color: workflowRiskInfo.config.text }}>
                                Risque{workflowRiskInfo.totalRisks > 1 ? 's' : ''}
                            </span>
                        </div>
                        <div
                            className="flex flex-col items-center px-4 py-1.5 rounded-xl border"
                            style={{
                                background: 'rgba(255,255,255,0.6)',
                                borderColor: workflowRiskInfo.config.border
                            }}
                        >
                            <span className="text-lg font-black" style={{ color: workflowRiskInfo.config.text }}>
                                {workflowRiskInfo.avgScore}
                            </span>
                            <span className="text-[8px] font-bold uppercase tracking-widest opacity-60" style={{ color: workflowRiskInfo.config.text }}>
                                Score /4
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className={`relative flex-1 w-full bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[2rem] p-4 shadow-2xl ${fitMode ? 'overflow-hidden min-h-0' : 'overflow-visible'} flex items-center justify-center transition-all duration-500 group-hover:shadow-indigo-500/10`}>
                <div
                    className="mermaid w-full h-full flex items-center justify-center opacity-0 animate-[fadeIn_0.8s_ease-out_forwards]"
                    dangerouslySetInnerHTML={{ __html: svg }}
                />

                {!svg && !error && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
                        <div className="bg-indigo-50/50 px-4 py-1.5 rounded-full text-[10px] font-bold text-indigo-400 uppercase tracking-widest animate-pulse">
                            Génération du flux...
                        </div>
                    </div>
                )}
                {svg && (
                    <div className="absolute top-8 right-8">
                        <div className="bg-white/80 backdrop-blur-md border border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 py-2 px-4 rounded-full shadow-sm flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Vue GRC Active
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`;
    document.head.appendChild(style);
}
