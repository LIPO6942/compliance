'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePlanData } from '@/contexts/PlanDataContext';
import { AlertTriangle } from 'lucide-react';

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

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart, workflowId }) => {
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const { workflowTasks, planData, availableUsers } = usePlanData();

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
                let annotatedChart = chart;
                // usePlanData hook call removed from here

                // Fonction de nettoyage ultra-stricte pour Mermaid
                const cleanForMermaid = (str: string) => {
                    if (!str) return '';
                    return str.replace(/[()\[\]{}]/g, ' ').replace(/["]/g, '&quot;').replace(/[']/g, '&apos;').trim();
                };

                const chartId = workflowId || chart.match(/graph\s+(?:TD|LR|TB|BT);?\s+%%ID:(\w+)/)?.[1] || '';

                // Récupération de toutes les tâches GRC liées dans le plan (récursif)
                const getGrcTasks = (tasks: any[]): any[] => {
                    let found: any[] = [];
                    tasks.forEach(t => {
                        if (t.grcWorkflowId === chartId && t.grcNodeId) {
                            found.push({
                                taskId: t.id,
                                nodeId: t.grcNodeId,
                                taskName: t.name,
                                responsibleUserName: t.raci?.responsible ?
                                    availableUsers.find(u => u.id === t.raci.responsible)?.name || 'Anonyme' : 'Non assigné',
                                approverUserName: t.raci?.accountable ?
                                    availableUsers.find(u => u.id === t.raci.accountable)?.name || 'Anonyme' : null,
                                roleRequired: 'CONTROLE GRC',
                                status: t.completed ? 'Terminé' : 'En cours',
                                isGrcControl: true
                            });
                        }
                        if (t.branches) {
                            t.branches.forEach((b: any) => {
                                found = [...found, ...getGrcTasks(b.tasks)];
                            });
                        }
                    });
                    return found;
                };

                const planGrcTasks = planData.flatMap((cat: any) =>
                    cat.subCategories.flatMap((sub: any) => getGrcTasks(sub.tasks))
                );

                // Fusion des tâches d'assignation et des tâches de contrôle GRC avec déduplication stricte par ID
                const allTasksRaw = [...workflowTasks.filter(t => t.workflowId === chartId), ...planGrcTasks];
                const uniqueTasksMap = new Map();
                allTasksRaw.forEach(t => {
                    const uniqueKey = t.taskId ? `${t.taskId}-${t.nodeId}` : `${t.limitId || Math.random()}-${t.nodeId}`;
                    if (!uniqueTasksMap.has(uniqueKey)) {
                        uniqueTasksMap.set(uniqueKey, t);
                    }
                });
                const allTasksToDisplay = Array.from(uniqueTasksMap.values());

                // On regroupe par nodeId pour ne pas dupliquer les boîtes mais cumuler les infos
                const tasksByNode: Record<string, any[]> = {};
                allTasksToDisplay.forEach(t => {
                    if (!tasksByNode[t.nodeId]) tasksByNode[t.nodeId] = [];
                    tasksByNode[t.nodeId].push(t);
                });

                Object.entries(tasksByNode).forEach(([nodeId, tasks]) => {
                    const escapedId = nodeId.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
                    const nodeRegex = new RegExp(`(${escapedId})\\s*([\\[\\(\\{\\>\\\\/]{1,2})(.*?)([\\]\\)\\}]{1,2})`, 'g');

                    // Construction du bloc HTML d'infos (cumulé si plusieurs tâches sur le même noeud)
                    let infoHtml = `<div class='assignee-info-box'>`;

                    // DÉDUPLICATION VISUELLE : On ne montre chaque responsable/approbateur qu'une seule fois par noeud
                    const uniqueAssignees = new Map();
                    tasks.forEach(task => {
                        const sName = cleanForMermaid(task.responsibleUserName);
                        const sApprover = task.approverUserName ? cleanForMermaid(task.approverUserName) : null;
                        const sTaskName = cleanForMermaid(task.taskName);
                        const sRole = cleanForMermaid(task.roleRequired).toUpperCase();
                        const isGrc = task.isGrcControl;

                        // Clé unique pour dédupliquer l'affichage sur ce noeud
                        const key = `${sName}-${sApprover}-${sRole}-${isGrc}-${sTaskName}`;

                        if (!uniqueAssignees.has(key)) {
                            uniqueAssignees.set(key, { sName, sApprover, sRole, isGrc, sTaskName });
                        }
                    });

                    // On itère sur les responsables uniques pour construire le HTML
                    Array.from(uniqueAssignees.values()).forEach(({ sName, sApprover, sRole, isGrc, sTaskName }) => {
                        infoHtml += `<div class='assignee-row ${isGrc ? 'grc-row' : ''}'>`;

                        // Nom de la tâche liée (si GRC)
                        if (isGrc && sTaskName) {
                            infoHtml += `<div class='linked-task-name'>Task: ${sTaskName}</div>`;
                        }

                        // Responsable
                        infoHtml += `<div class='assignee-group'>` +
                            `<span class='icon'>${isGrc ? '🛡️' : '👤'}</span>` +
                            `<span class='assignee-name'>${sName}</span>` +
                            `<span class='assignee-role-badge'>${sRole}</span>` +
                            `</div>`;

                        // Approbateur (si présent)
                        if (sApprover) {
                            infoHtml += `<div class='approver-row'>` +
                                `<span class='icon'>✅</span>` +
                                `<span class='approver-label'>Approbateur:</span>` +
                                `<span class='approver-name'>${sApprover}</span>` +
                                `</div>`;
                        }

                        infoHtml += `</div>`;
                    });
                    infoHtml += `</div>`;

                    if (nodeRegex.test(annotatedChart)) {
                        annotatedChart = annotatedChart.replace(nodeRegex, (match, id, open, label) => {
                            const cleanLabel = label.split('<br')[0].split('<div')[0].replace(/^"+|"+$/g, '').trim();
                            return `${id}${open}"<div class='node-label-main'>${cleanLabel}</div>${infoHtml}"${match.slice(-open.length)}`;
                        });
                    } else {
                        if (/^[a-zA-Z0-9_\-\.]+$/.test(nodeId)) {
                            annotatedChart += `\n${nodeId}["<div class='node-label-main'>${nodeId}</div>${infoHtml}"]`;
                        }
                    }

                    // Statut visuel (Priorité à l'alerte, puis en cours, puis terminé)
                    const hasAlert = tasks.some(t => t.status === 'Alerte');
                    const allDone = tasks.every(t => t.status === 'Terminé');
                    const anyProgress = tasks.some(t => t.status === 'En cours');

                    const statusClass = hasAlert ? 'node-alert' : allDone ? 'node-done' : anyProgress ? 'node-progress' : 'node-pending';
                    annotatedChart += `\nclass ${nodeId} ${statusClass};`;
                });

                // Définitions de classes Mermaid
                annotatedChart += `\nclassDef node-done fill:#ecfdf5,stroke:#10b981,stroke-width:2px,rx:12,ry:12;`;
                annotatedChart += `\nclassDef node-progress fill:#fff7ed,stroke:#f97316,stroke-width:2px,rx:12,ry:12;`;
                annotatedChart += `\nclassDef node-pending fill:#f8fafc,stroke:#cbd5e1,stroke-width:1.5px,rx:12,ry:12;`;
                annotatedChart += `\nclassDef node-alert fill:#fff1f2,stroke:#f43f5e,stroke-width:2px,rx:12,ry:12;`;

                const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;

                try {
                    const { svg: generatedSvg } = await window.mermaid.render(id, annotatedChart);
                    setSvg(generatedSvg);
                } catch (renderError: any) {
                    console.error('Mermaid core render error:', renderError);
                    throw new Error(renderError.message || 'Erreur de syntaxe Mermaid');
                }
            } catch (err: any) {
                console.error('Mermaid transformation error:', err);
                setError(err.message || 'Erreur de rendu');
            }
        };

        const timeoutId = setTimeout(() => {
            if (window.mermaid) renderChart();
        }, 100);
        return () => clearTimeout(timeoutId);
    }, [chart, workflowTasks, workflowId, planData, availableUsers]);

    if (error) {
        return (
            <div className="w-full flex items-center justify-center p-8">
                <div className="max-w-md w-full bg-rose-50 border border-rose-100 rounded-[2.5rem] p-8 flex flex-col items-center text-center gap-4 shadow-xl">
                    <div className="h-12 w-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-500">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold text-rose-900">Erreur de diagramme</h3>
                        <p className="text-[10px] text-rose-700 font-mono bg-white/60 p-4 rounded-2xl border border-rose-200/50 text-left overflow-auto max-h-[120px]">{error}</p>
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
                
                /* Layout global Mermaid */
                .mermaid svg { max-width: 100% !important; height: auto !important; filter: drop-shadow(0 15px 30px rgba(0,0,0,0.05)); }
                
                /* Styles des noeuds HTML injectés */
                .node-label-main { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 13px; color: #1e293b; margin-bottom: 4px; }
                .assignee-info-box { margin-top: 8px; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 6px; text-align: center; width: 100%; }
                .assignee-row { display: flex; flex-direction: column; align-items: center; gap: 2px; margin-bottom: 6px; }
                .assignee-row:last-child { margin-bottom: 0; }
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

                /* Animations & Interactivité */
                .mermaid .node rect, .mermaid .node circle, .mermaid .node polygon { transition: all 0.3s ease !important; }
                .mermaid .node:hover rect, .mermaid .node:hover circle, .mermaid .node:hover polygon { filter: brightness(0.98); transform: translateY(-3px); }
                .mermaid .edgePath path { stroke: #94a3b8 !important; stroke-width: 2px !important; }
                .mermaid .edgePath:hover path { stroke: #6366f1 !important; stroke-width: 3px !important; }
            ` }} />

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-gradient-to-tr from-indigo-500/5 to-emerald-500/5 blur-[100px] opacity-30 pointer-events-none -z-10" />

            <div className="relative bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[3rem] p-8 shadow-2xl overflow-hidden min-h-[400px] flex items-center justify-center transition-all duration-500 group-hover:shadow-indigo-500/10">
                <div
                    id="mermaid-container"
                    className="mermaid w-full opacity-0 translate-y-4 animate-[fadeIn_0.8s_ease-out_forwards]"
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
            </div>

            {svg && (
                <div className="absolute top-10 right-10">
                    <div className="bg-white/80 backdrop-blur-md border border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 py-2 px-4 rounded-full shadow-sm flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Vue GRC Active
                    </div>
                </div>
            )}
        </div>
    );
};

// Animation CSS Additionnelle
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = `@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`;
    document.head.appendChild(style);
}
