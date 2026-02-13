'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePlanData } from '@/contexts/PlanDataContext';
import { AlertTriangle, Info, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Declaration pour TypeScript
declare global {
    interface Window {
        mermaid: any;
    }
}

interface MermaidRendererProps {
    chart: string;
    workflowId?: string;
    onNodeClick?: (id: string) => void;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart, workflowId, onNodeClick }) => {
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const { workflowTasks } = usePlanData();

    useEffect(() => {
        if (typeof window !== 'undefined' && window.mermaid) {
            window.mermaid.initialize({
                startOnLoad: false,
                theme: 'base',
                themeVariables: {
                    primaryColor: '#ffffff',
                    primaryTextColor: '#1e293b',
                    primaryBorderColor: '#e2e8f0',
                    lineColor: '#94a3b8',
                    secondaryColor: '#f8fafc',
                    tertiaryColor: '#ffffff',
                    fontFamily: "'Outfit', sans-serif"
                },
                securityLevel: 'loose',
                flowchart: {
                    htmlLabels: true,
                    curve: 'basis',
                    useMaxWidth: true,
                    padding: 20
                },
            });
        }
    }, []);

    useEffect(() => {
        const renderChart = async () => {
            if (!chart || typeof window === 'undefined' || !window.mermaid) return;

            try {
                setError(null);

                // --- Injection des annotations dynamiques ---
                let annotatedChart = chart;

                // Fonction pour désinfecter les chaînes pour Mermaid
                const sanitize = (str: string) => {
                    if (!str) return '';
                    return str
                        .replace(/[<>]/g, '')
                        .replace(/[()[\]{}]/g, ' ')
                        .replace(/[";]/g, '');
                };

                // On utilise workflowId passé en prop, sinon on tente de l'extraire du commentaire
                const chartId = workflowId || chart.match(/graph\s+(?:TD|LR|TB|BT);?\s+%%ID:(\w+)/)?.[1] || '';

                workflowTasks.forEach(task => {
                    if (task.workflowId === chartId) {
                        const escapedId = task.nodeId.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
                        const nodeRegex = new RegExp(`(${escapedId})\\s*(\\[|{|\\(|\\(\\(|>|\\[\\/|\\\\|\\[\\[)(.*?)(\\]|} |\\)|\\)\\)|\\s*\\]|\\s*\\]\\/|\\\\|\\s*\\]\\])`, 'g');

                        const sName = sanitize(task.responsibleUserName);
                        const sRole = sanitize(task.roleRequired).toUpperCase();

                        const infoString = `<div class='assignee-info' style='margin-top:10px; border-top:1px solid rgba(0,0,0,0.06); padding-top:8px; text-align:center;'>` +
                            `<div style='font-weight:700; color:#475569; font-size:11px; margin-bottom:2px;'>👤 ${sName}</div>` +
                            `<div class='role-badge' style='font-size:9px; background:#f1f5f9; color:#64748b; display:inline-block; padding:2px 10px; border-radius:12px; font-weight:800; border:1px solid #e2e8f0;'>${sRole}</div>` +
                            `</div>`;

                        if (nodeRegex.test(annotatedChart)) {
                            annotatedChart = annotatedChart.replace(nodeRegex, (match, id, open, label, close) => {
                                const cleanLabel = label.split('<br/')[0].split('<div')[0].replace(/^"+|"+$/g, '').trim();
                                return `${id}${open}"<div class='node-label' style='font-weight:800; font-size:13px; color:#1e293b; margin-bottom:2px;'>${cleanLabel}</div>${infoString}"${close}`;
                            });
                        } else {
                            // Support des noeuds implicites : on ajoute une définition explicite à la fin
                            if (/^[a-zA-Z0-9_\-\.]+$/.test(task.nodeId)) {
                                annotatedChart += `\n${task.nodeId}["<div class='node-label' style='font-weight:800; font-size:13px; color:#1e293b; margin-bottom:2px;'>${task.nodeId}</div>${infoString}"]`;
                            }
                        }

                        const statusClass = task.status === 'Terminé' ? 'node-done' : task.status === 'En cours' ? 'node-progress' : task.status === 'Alerte' ? 'node-alert' : 'node-pending';
                        annotatedChart += `\nclass ${task.nodeId} ${statusClass};`;
                    }
                });

                // Styles de classes Premium
                annotatedChart += `\nclassDef node-done fill:#ecfdf5,stroke:#10b981,stroke-width:2px,color:#064e3b,rx:12,ry:12;`;
                annotatedChart += `\nclassDef node-progress fill:#fff7ed,stroke:#f97316,stroke-width:2px,color:#7c2d12,rx:12,ry:12;`;
                annotatedChart += `\nclassDef node-pending fill:#f8fafc,stroke:#cbd5e1,stroke-width:1.5px,color:#1e293b,rx:12,ry:12;`;
                annotatedChart += `\nclassDef node-alert fill:#fff1f2,stroke:#f43f5e,stroke-width:2px,color:#881337,rx:12,ry:12;`;
                annotatedChart += `\nclassDef node-start fill:#eef2ff,stroke:#6366f1,stroke-width:2px,color:#1e1b4b,rx:20,ry:20;`;

                const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;
                const { svg: generatedSvg } = await window.mermaid.render(id, annotatedChart);
                setSvg(generatedSvg);
            } catch (err) {
                console.error('Mermaid render error:', err);
                setError('Erreur de rendu. Vérifiez la syntaxe.');
            }
        };

        const checkAndRender = () => {
            if (window.mermaid) {
                renderChart();
            } else {
                setTimeout(checkAndRender, 100);
            }
        };

        const timeoutId = setTimeout(checkAndRender, 50);
        return () => clearTimeout(timeoutId);
    }, [chart, workflowTasks]);

    if (error) {
        return (
            <div className="w-full flex items-center justify-center p-12">
                <div className="max-w-md w-full bg-rose-50 border border-rose-100 rounded-[3rem] p-10 flex flex-col items-center text-center gap-6 shadow-xl">
                    <div className="h-16 w-16 bg-rose-100 rounded-full flex items-center justify-center text-rose-500 shadow-inner">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-xl font-extrabold text-rose-900">Erreur de diagramme</h3>
                        <p className="text-xs text-rose-700 font-mono bg-white/60 p-5 rounded-3xl border border-rose-200/50 text-left overflow-auto max-h-[150px] leading-relaxed">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full relative group p-4">
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;800&display=swap');
                
                .mermaid svg {
                    max-width: 100% !important;
                    height: auto !important;
                    filter: drop-shadow(0 20px 25px -5px rgba(0, 0, 0, 0.05));
                }
                .mermaid .node rect, .mermaid .node circle, .mermaid .node polygon, .mermaid .node path {
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    fill-opacity: 1 !important;
                    stroke-dasharray: 0 !important;
                }
                .mermaid .node:hover rect, .mermaid .node:hover circle, .mermaid .node:hover polygon, .mermaid .node:hover path {
                    filter: brightness(0.99) contrast(1.02);
                    transform: translateY(-4px);
                }
                .mermaid .edgePath path {
                    stroke: #94a3b8 !important;
                    stroke-width: 2.5px !important;
                    transition: all 0.3s ease;
                }
                .mermaid .edgePath:hover path {
                    stroke: #6366f1 !important;
                    stroke-width: 4px !important;
                }
                .mermaid .marker {
                    fill: #94a3b8 !important;
                }
                .mermaid .label {
                    font-family: 'Outfit', 'Inter', system-ui, sans-serif !important;
                    letter-spacing: -0.02em;
                }
                .node-label { padding: 4px 8px; }
                .role-badge { 
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); 
                    transition: all 0.2s ease;
                }
                .mermaid .node:hover .role-badge {
                    transform: scale(1.05);
                    background: #fff !important;
                    border-color: #cbd5e1 !important;
                }
            ` }} />

            {/* Décorations d'arrière-plan complexes */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-indigo-500/5 via-violet-500/2 to-emerald-500/5 blur-[120px] opacity-40 pointer-events-none -z-10" />

            <div className="relative bg-white/60 dark:bg-slate-900/40 backdrop-blur-3xl border border-white/80 dark:border-slate-800/50 rounded-[3.5rem] p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] overflow-hidden min-h-[500px] flex items-center justify-center transition-all duration-700 group-hover:shadow-[0_48px_80px_-20px_rgba(99,102,241,0.12)] border-slate-200/50">
                <div
                    id="mermaid-container"
                    className="mermaid w-full opacity-0 transition-all duration-1000 ease-out py-10 scale-[1.02] hover:scale-100"
                    dangerouslySetInnerHTML={{ __html: svg }}
                />

                {!svg && !error && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                        <div className="h-4 w-40 bg-slate-100 rounded-full animate-pulse" />
                    </div>
                )}
            </div>

            {svg && (
                <div className="absolute top-12 right-12 flex items-center gap-3">
                    <div className="bg-white/90 backdrop-blur-md border border-slate-100 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 py-2 px-4 rounded-full shadow-lg flex items-center gap-3">
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-[pulse_1.5s_infinite]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-[pulse_1.5s_infinite_0.3s]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-[pulse_1.5s_infinite_0.6s]" />
                        </div>
                        Diagramme Interactif
                    </div>
                </div>
            )}
        </div>
    );
};
