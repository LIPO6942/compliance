'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePlanData } from '@/contexts/PlanDataContext';

// Declaration pour TypeScript
declare global {
    interface Window {
        mermaid: any;
    }
}

interface MermaidRendererProps {
    chart: string;
    onNodeClick?: (id: string) => void;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart, onNodeClick }) => {
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const { workflowTasks } = usePlanData();

    useEffect(() => {
        if (typeof window !== 'undefined' && window.mermaid) {
            window.mermaid.initialize({
                startOnLoad: false,
                theme: 'base',
                themeVariables: {
                    primaryColor: '#f8fafc',
                    primaryTextColor: '#1e293b',
                    primaryBorderColor: '#e2e8f0',
                    lineColor: '#94a3b8',
                    secondaryColor: '#f1f5f9',
                    tertiaryColor: '#ffffff',
                    fontFamily: 'Inter, system-ui, sans-serif'
                },
                securityLevel: 'loose',
                fontFamily: 'var(--font-inter)',
                flowchart: {
                    htmlLabels: true,
                    curve: 'basis',
                    useMaxWidth: true,
                    padding: 15
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

                workflowTasks.forEach(task => {
                    const escapedId = task.nodeId.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
                    // On cherche le noeud avec ses crochets/parenthèses
                    const nodeRegex = new RegExp(`(${escapedId})\\s*(\\[|{|\\(|\\(\\(|>|\\[\\/|\\\\|\\[\\[)(.*?)(\\]|} |\\)|\\)\\)|\\s*\\]|\\s*\\]\\/|\\\\|\\s*\\]\\])`, 'g');

                    if (nodeRegex.test(annotatedChart)) {
                        const sName = sanitize(task.responsibleUserName);
                        const sRole = sanitize(task.roleRequired).toUpperCase();

                        // Design ultra-moderne pour l'injection
                        const infoString = `<div style='margin-top:10px; border-top:1px solid rgba(0,0,0,0.08); padding-top:8px; text-align:center;'>` +
                            `<div style='font-weight:700; color:#475569; font-size:11px; margin-bottom:2px;'>👤 ${sName}</div>` +
                            `<div style='font-size:9px; background:#f1f5f9; color:#64748b; display:inline-block; padding:1px 8px; border-radius:12px; font-weight:800; border:1px solid #e2e8f0;'>${sRole}</div>` +
                            `</div>`;

                        annotatedChart = annotatedChart.replace(nodeRegex, (match, id, open, label, close) => {
                            // On extrait le label d'origine au cas où il y aurait déjà du HTML (sécurité)
                            const cleanLabel = label.split('<br/')[0].split('<div')[0].replace(/^"+|"+$/g, '').trim();
                            // On utilise des guillemets pour protéger le HTML Mermaid
                            return `${id}${open}"<div style='font-weight:700; font-size:13px; color:#1e293b; margin-bottom:2px;'>${cleanLabel}</div>${infoString}"${close}`;
                        });

                        const statusClass = task.status === 'Terminé' ? 'node-done' : task.status === 'En cours' ? 'node-progress' : 'node-pending';
                        annotatedChart += `\nclass ${task.nodeId} ${statusClass};`;
                    }
                });

                // Styles de classes plus "modernes" (ombres portées via SVG filter si possible, sinon couleurs douces)
                annotatedChart += `\nclassDef node-done fill:#f0fdf4,stroke:#22c55e,stroke-width:2px,color:#166534;`;
                annotatedChart += `\nclassDef node-progress fill:#fff7ed,stroke:#f97316,stroke-width:2px,color:#9a3412;`;
                annotatedChart += `\nclassDef node-pending fill:#ffffff,stroke:#cbd5e1,stroke-width:1.5px,color:#1e293b;`;

                const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;
                const { svg: generatedSvg } = await window.mermaid.render(id, annotatedChart);
                setSvg(generatedSvg);
            } catch (err) {
                console.error('Mermaid render error:', err);
                setError('Erreur de rendu visuel. Vérifiez la syntaxe Mermaid.');
            }
        };

        const checkAndRender = () => {
            if (window.mermaid) {
                renderChart();
            } else {
                setTimeout(checkAndRender, 100);
            }
        };

        // Petit délai pour laisser le temps au DOM de se stabiliser
        const timeoutId = setTimeout(checkAndRender, 50);
        return () => clearTimeout(timeoutId);
    }, [chart, workflowTasks]);

    if (error) {
        return (
            <div className="p-6 border-2 border-dashed border-rose-200 bg-rose-50 rounded-[2rem] text-rose-800 text-sm flex flex-col items-center text-center gap-3">
                <div className="h-10 w-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                </div>
                <div>
                    <p className="font-bold mb-1">Erreur de rendu Mermaid</p>
                    <p className="opacity-70 text-xs italic">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full relative group">
            <style dangerouslySetInnerHTML={{
                __html: `
                .mermaid svg {
                    max-width: 100% !important;
                    height: auto !important;
                }
                .mermaid .node rect, .mermaid .node circle, .mermaid .node polygon, .mermaid .node path {
                    transition: all 0.3s ease-in-out !important;
                    stroke-width: 2px !important;
                    fill-opacity: 1 !important;
                }
                .mermaid .node:hover rect, .mermaid .node:hover circle, .mermaid .node:hover polygon, .mermaid .node:hover path {
                    stroke-width: 3px !important;
                    filter: drop-shadow(0 8px 16px rgba(0,0,0,0.1)) !important;
                }
                .mermaid .edgePath path {
                    stroke: #94a3b8 !important;
                    stroke-width: 2px !important;
                    transition: stroke 0.3s ease !important;
                }
                .mermaid .edgePath:hover path {
                    stroke: #6366f1 !important;
                    stroke-width: 3px !important;
                }
                .mermaid .marker {
                    fill: #94a3b8 !important;
                    stroke: none !important;
                }
                .mermaid .label {
                    font-family: var(--font-inter), sans-serif !important;
                }
            `}} />

            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/10 via-white to-slate-50/10 rounded-[2.5rem] -m-4 blur-3xl opacity-30" />

            <div
                className="w-full overflow-x-auto flex justify-center py-16 px-8 bg-white/40 backdrop-blur-sm dark:bg-slate-900/40 rounded-[3rem] border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] relative z-10 min-h-[600px] transition-all duration-700"
                dangerouslySetInnerHTML={{ __html: svg }}
            />

            {/* Micro-décorations pour le look premium */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-slate-100/50 rounded-full blur-3xl -z-10" />
        </div>
    );
};
