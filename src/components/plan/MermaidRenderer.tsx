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
                theme: 'neutral',
                securityLevel: 'loose',
                fontFamily: 'var(--font-inter)',
                flowchart: {
                    htmlLabels: true,
                    curve: 'basis',
                    useMaxWidth: true,
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
                        .replace(/[<>]/g, '') // Supprimer les chevrons pour éviter de casser le HTML
                        .replace(/[()[\]{}]/g, ' ') // Remplacer les parenthèses/crochets par des espaces
                        .replace(/[";]/g, ''); // Supprimer quotes et points-virgules
                };

                workflowTasks.forEach(task => {
                    const escapedId = task.nodeId.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
                    const nodeRegex = new RegExp(`(${escapedId})\\s*(\\[|{|\\(|\\(\\(|>|\\[\\/|\\\\|\\[\\[)(.*?)(\\]|} |\\)|\\)\\)|\\s*\\]|\\s*\\]\\/|\\\\|\\s*\\]\\])`, 'g');

                    if (nodeRegex.test(annotatedChart)) {
                        const sName = sanitize(task.responsibleUserName);
                        const sRole = sanitize(task.roleRequired).toUpperCase();

                        // Utilisation de guillemets simples pour les styles et <br/> pour Mermaid compatible HTML
                        const infoString = `<br/><div style='margin-top:8px; border-top:1px solid rgba(0,0,0,0.1); padding-top:4px; font-family:var(--font-inter);'><div style='font-weight:700; color:#1e293b; font-size:11px;'>👤 ${sName}</div><div style='font-size:9px; background:rgba(0,0,0,0.05); display:inline-block; padding:1px 6px; border-radius:10px; margin-top:2px; color:#64748b; font-weight:600;'>${sRole}</div></div>`;

                        annotatedChart = annotatedChart.replace(nodeRegex, (match, id, open, label, close) => {
                            // Si le label contient déjà notre injection, on ne l'ajoute pas deux fois
                            if (label.includes('margin-top:8px')) return match;
                            // On entoure le nouveau label de guillemets doubles pour protéger le HTML
                            return `${id}${open}"${label}${infoString}"${close}`;
                        });

                        const statusClass = task.status === 'Terminé' ? 'node-done' : task.status === 'En cours' ? 'node-progress' : 'node-pending';
                        annotatedChart += `\nclass ${task.nodeId} ${statusClass};`;
                    }
                });

                annotatedChart += `\nclassDef node-done fill:#ecfdf5,stroke:#10b981,stroke-width:2px,color:#064e3b;`;
                annotatedChart += `\nclassDef node-progress fill:#fffbeb,stroke:#f59e0b,stroke-width:2px,color:#78350f;`;
                annotatedChart += `\nclassDef node-pending fill:#ffffff,stroke:#e2e8f0,stroke-width:1.5px,color:#475569;`;

                const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;
                const { svg: generatedSvg } = await window.mermaid.render(id, annotatedChart);
                setSvg(generatedSvg);
            } catch (err) {
                console.error('Mermaid render error:', err);
                setError('Syntaxe Mermaid invalide ou erreur de rendu.');
            }
        };

        const checkAndRender = () => {
            if (window.mermaid) {
                renderChart();
            } else {
                setTimeout(checkAndRender, 100);
            }
        };

        checkAndRender();
    }, [chart, workflowTasks]);

    if (error) {
        return (
            <div className="p-4 border-2 border-dashed border-rose-200 bg-rose-50 rounded-xl text-rose-800 text-sm">
                <p className="font-bold mb-1">Erreur de rendu Mermaid</p>
                <p className="opacity-80">{error}</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full relative group">
            {/* Décoration d'arrière-plan moderne */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/20 via-white to-slate-50/20 rounded-[2.5rem] -m-4 blur-3xl opacity-50" />

            <div
                className="w-full overflow-x-auto flex justify-center py-12 px-6 bg-white/80 backdrop-blur-xl dark:bg-slate-900/80 rounded-[2.5rem] border border-white/50 shadow-[0_8px_32px_rgba(31,38,135,0.07)] relative z-10 min-h-[600px] transition-all duration-500 hover:shadow-[0_12px_48px_rgba(31,38,135,0.1)]"
                dangerouslySetInnerHTML={{ __html: svg }}
            />

            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-100/30 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-100/30 rounded-full blur-3xl -z-10" />
        </div>
    );
};
