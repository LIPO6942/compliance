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

                workflowTasks.forEach(task => {
                    const escapedId = task.nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const nodeRegex = new RegExp(`(${escapedId})\\s*(\\[|{|\\(|\\(\\(|>|\\[\\/|\\\\|\\[\\[)(.*?)(\\]|} |\\)|\\)\\)|\\s*\\]|\\s*\\]\\/|\\\\|\\s*\\]\\])`, 'g');

                    if (nodeRegex.test(annotatedChart)) {
                        const infoString = `\\n<hr/><b>${task.responsibleUserName}</b>\\n<small>${task.roleRequired}</small>`;
                        annotatedChart = annotatedChart.replace(nodeRegex, (match, id, open, label, close) => {
                            return `${id}${open}${label}${infoString}${close}`;
                        });

                        const statusClass = task.status === 'Terminé' ? 'node-done' : task.status === 'En cours' ? 'node-progress' : 'node-pending';
                        annotatedChart += `\nclass ${task.nodeId} ${statusClass};`;
                    }
                });

                annotatedChart += `\nclassDef node-done fill:#dcfce7,stroke:#16a34a,stroke-width:2px;`;
                annotatedChart += `\nclassDef node-progress fill:#fef9c3,stroke:#ca8a04,stroke-width:2px;`;
                annotatedChart += `\nclassDef node-pending fill:#f1f5f9,stroke:#64748b,stroke-width:1px;`;

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
        <div
            className="w-full overflow-x-auto flex justify-center py-8 bg-white/50 dark:bg-slate-900/50 rounded-3xl border shadow-inner"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
};
