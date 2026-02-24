'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { usePlanData } from '@/contexts/PlanDataContext';
import { useRiskMapping } from '@/contexts/RiskMappingContext';
import { AlertTriangle } from 'lucide-react';
import type { RiskLevel } from '@/types/compliance';

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
}

// Utilitaire: niveau de risque numérique pour comparaison
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

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart, workflowId, onEditTask }) => {
    const uniqueId = useMemo(() => Math.random().toString(36).substring(7), []);
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const { workflowTasks, planData, availableUsers } = usePlanData();
    const { risks: allRisks } = useRiskMapping();

    // Calcul du score de risque global pour ce workflow
    const workflowRiskInfo = useMemo(() => {
        const chartId = workflowId || '';
        if (!chartId) return null;

        // Collecte récursive de toutes les tâches GRC liées à ce workflow
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

        // Collecter tous les IDs de risques uniques
        const allRiskIds = [...new Set(linkedTasks.flatMap((t: any) => t.risks || []))];
        const linkedRisks = allRisks.filter(r => allRiskIds.includes(r.id));

        if (linkedRisks.length === 0) return null;

        // Calcul du niveau max
        let maxLevel = 0;
        let maxLevelLabel = '';
        linkedRisks.forEach(r => {
            const lvl = riskLevelToNumber(r.riskLevel);
            if (lvl > maxLevel) {
                maxLevel = lvl;
                maxLevelLabel = r.riskLevel;
            }
        });

        // Score moyen (sur 4)
        const avgScore = linkedRisks.reduce((sum, r) => sum + riskLevelToNumber(r.riskLevel), 0) / linkedRisks.length;

        return {
            totalRisks: linkedRisks.length,
            maxLevel: maxLevelLabel,
            avgScore: Math.round(avgScore * 10) / 10,
            config: riskLevelConfig[maxLevelLabel] || riskLevelConfig['Faible'],
        };
    }, [workflowId, planData, allRisks]);

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
                    curve: 'stepAfter',
                    useMaxWidth: true,
                    padding: 20
                },
            });
            // Surcharge de la gestion d'erreur pour éviter l'affichage "Syntax error" en bas de page
            window.mermaid.parseError = (err: any) => {
                console.error('Mermaid Parse Error (Suppressed from UI):', err);
            };
        }
    }, []);

    useEffect(() => {
        const renderChart = async () => {
            if (!chart || typeof window === 'undefined' || !window.mermaid) return;

            try {
                setError(null);
                let annotatedChart = chart;

                // Fonction de nettoyage ultra-stricte pour Mermaid
                const cleanForMermaid = (str: string) => {
                    if (!str) return '';
                    return str.replace(/[()[\]{}]/g, ' ').replace(/["]/g, '&quot;').replace(/[']/g, '&apos;').trim();
                };

                const chartId = workflowId || chart.match(/(?:graph|flowchart)\s+(?:TD|LR|TB|BT|RL);?\s+%%ID:(\w+)/)?.[1] || '';

                // Récupération de toutes les tâches GRC liées dans le plan (récursif)
                const getGrcTasks = (tasks: any[]): any[] => {
                    let found: any[] = [];
                    tasks.forEach(t => {
                        if (t.grcWorkflowId === chartId && t.grcNodeId) {
                            found.push({
                                taskId: t.id,
                                nodeId: t.grcNodeId,
                                taskName: t.name,
                                riskIds: t.risks || [],
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
                    cat.subCategories.flatMap((sub: any) => {
                        const tasks = getGrcTasks(sub.tasks);
                        return tasks.map(t => ({ ...t, categoryId: cat.id, subCategoryId: sub.id }));
                    })
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
                    const nodeRegex = new RegExp(`(${escapedId})\\s*([\\[\\(\\{\\>\\\\\/]{1,2})(.*?)([\\]\\)\\}]{1,2})`, 'g');

                    // === RISQUES : Déterminer le niveau de risque le plus élevé pour ce nœud ===
                    const nodeRiskIds = [...new Set(tasks.flatMap((t: any) => t.riskIds || []))];
                    const nodeRisks = allRisks.filter(r => nodeRiskIds.includes(r.id));
                    let nodeMaxRiskLevel = '';
                    let nodeMaxRiskNum = 0;
                    nodeRisks.forEach(r => {
                        const lvl = riskLevelToNumber(r.riskLevel);
                        if (lvl > nodeMaxRiskNum) {
                            nodeMaxRiskNum = lvl;
                            nodeMaxRiskLevel = r.riskLevel;
                        }
                    });
                    const nodeRiskConfig = nodeMaxRiskLevel ? riskLevelConfig[nodeMaxRiskLevel] : null;

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

                    // === BADGE DE RISQUE sur le noeud ===
                    if (nodeRiskConfig && nodeMaxRiskLevel) {
                        infoHtml += `<div class='risk-badge-node' style='background:${nodeRiskConfig.bg};border:1.5px solid ${nodeRiskConfig.border};color:${nodeRiskConfig.text};'>` +
                            `<span class='risk-badge-emoji'>${nodeRiskConfig.emoji}</span>` +
                            `<span class='risk-badge-label'>${nodeRiskConfig.label}</span>` +
                            `<span class='risk-badge-count'>${nodeRisks.length} risque${nodeRisks.length > 1 ? 's' : ''}</span>` +
                            `</div>`;
                    }

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

                    // Interaction: Clic pour éditer
                    // On rend le noeud cliquable s'il a des tâches associées
                    if (tasks.length > 0) {
                        annotatedChart += `\nclick ${nodeId} call mermaidClick_${uniqueId}("${nodeId}") "Modifier cette étape"`;
                    }
                });

                // Définition de la fonction globale de callback pour ce diagramme spécifique
                const callbackName = `mermaidClick_${uniqueId}`;
                (window as any)[callbackName] = (nodeId: string) => {
                    const tasks = tasksByNode[nodeId];
                    if (tasks && tasks.length > 0 && onEditTask) {
                        // On édite la première tâche trouvée pour ce noeud
                        // Idéalement on pourrait afficher une liste si plusieurs, mais ici on simplifie
                        onEditTask(tasks[0]);
                    }
                };

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
                    console.error('Mermaid core render error, attempting fallback:', renderError);
                    try {
                        const simpleId = `mermaid-simple-${Math.random().toString(36).substring(2, 9)}`;
                        // On force un layout 'base' plus robuste avec linear et SANS htmlLabels pour éviter tout conflit
                        const simpleChart = `%%{init: {"flowchart": {"curve": "linear", "htmlLabels": false}} }%%\n${chart}`;
                        console.warn("Utilisation du rendu simplifié (fallback) pour", simpleId);
                        const { svg: simpleSvg } = await window.mermaid.render(simpleId, simpleChart);
                        setSvg(simpleSvg);
                    } catch (fallbackError: any) {
                        console.error("Échec du fallback Mermaid:", fallbackError);
                        setError(`Erreur de rendu Mermaid: ${renderError.message}. Le code est peut-être invalide.`);
                    }
                }
            } catch (err: any) {
                console.error('Mermaid transformation error:', err);
                setError(err.message || 'Erreur de rendu');
            }
        };

        const timeoutId = setTimeout(() => {
            if (window.mermaid) renderChart();
        }, 500);
        return () => {
            clearTimeout(timeoutId);
            // Cleanup global callback
            const callbackName = `mermaidClick_${uniqueId}`;
            delete (window as any)[callbackName];
        };
    }, [chart, workflowTasks, workflowId, planData, availableUsers, allRisks, onEditTask, uniqueId]);

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
        <div className="w-full h-full relative group p-4 flex flex-col overflow-hidden">
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;800&display=swap');
                
                /* Layout global Mermaid */
                .mermaid svg { 
                    max-width: 100% !important; 
                    max-height: 100% !important; 
                    width: 100% !important; 
                    height: 100% !important; 
                    object-fit: contain !important;
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
                /* Positionnement hors écran au lieu de display:none pour ne pas casser les calculs de taille lors du rendu */
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

            <div className="relative flex-1 w-full bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden flex items-center justify-center transition-all duration-500 group-hover:shadow-indigo-500/10">
                <div
                    className="mermaid w-full h-full flex flex-col items-center justify-center opacity-0 animate-[fadeIn_0.8s_ease-out_forwards]"
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

// Animation CSS Additionnelle
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = `@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`;
    document.head.appendChild(style);
}
