/**
 * Utilitaires d'export et d'impression des Workflows / Processus Métiers (Mermaid)
 * Garantit un rendu vectoriel haute définition calibré sur EXACTEMENT 1 SEULE PAGE (A4 Paysage ou Portrait auto).
 */

import { recordActivity } from '@/contexts/ActivityLogContext';

export interface WorkflowPrintRiskInfo {
    totalRisks?: number;
    maxLevel?: string;
    avgScore?: number;
}

export interface WorkflowPrintOptions {
    name: string;
    workflowId?: string;
    domain?: string;
    version?: number | string;
    code?: string;
    svgHtml?: string;
    riskInfo?: WorkflowPrintRiskInfo | null;
    planData?: any[];
    workflowTasks?: any[];
    availableUsers?: any[];
    allRisks?: any[];
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

/**
 * Nettoie une chaîne de texte pour insertion sécurisée dans Mermaid
 */
export const cleanForMermaid = (str: string): string => {
    if (!str) return '';
    return str.replace(/[()[\]{}]/g, ' ').replace(/["]/g, '&quot;').replace(/[']/g, '&apos;').trim();
};

/**
 * Charge et initialise Mermaid de façon asynchrone et résiliente
 */
let mermaidPromise: Promise<any> | null = null;

export function ensureMermaidLoaded(): Promise<any> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Window is undefined'));
    }

    const initMermaidInstance = (rawMermaid: any) => {
        const m = rawMermaid?.default || rawMermaid;
        if (!m) return null;

        try {
            if (!m.__isInitialized) {
                m.initialize({
                    startOnLoad: false,
                    theme: 'base',
                    themeVariables: {
                        primaryColor: '#ffffff',
                        primaryTextColor: '#1e293b',
                        primaryBorderColor: '#e2e8f0',
                        lineColor: '#94a3b8',
                        secondaryColor: '#f8fafc',
                        fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                    },
                    securityLevel: 'loose',
                    flowchart: {
                        htmlLabels: true,
                        curve: 'basis',
                        useMaxWidth: false,
                        padding: 12
                    }
                });
                if (typeof m.parseError === 'function') {
                    m.parseError = (err: any) => {
                        console.warn('Mermaid Parse Warning:', err);
                    };
                }
                m.__isInitialized = true;
            }
        } catch (initErr) {
            console.warn('Mermaid initialization warning:', initErr);
        }

        // Standardize render API wrapper across Mermaid 9 and 10+
        const standardized = {
            ...m,
            raw: m,
            render: async (id: string, text: string): Promise<{ svg: string }> => {
                // Mermaid 10+ standard async render
                if (typeof m.render === 'function') {
                    try {
                        const result = await m.render(id, text);
                        return typeof result === 'string' ? { svg: result } : result;
                    } catch (renderErr: any) {
                        if (typeof document !== 'undefined') {
                            const errDivs = document.querySelectorAll(`[id^="d${id}"], [id^="mermaid-error"]`);
                            errDivs.forEach(el => el.remove());
                        }

                        // Fallback de calcul de courbe : si erreur de positionnement, bascule sur curve: 'linear'
                        try {
                            m.initialize({
                                startOnLoad: false,
                                theme: 'base',
                                securityLevel: 'loose',
                                flowchart: {
                                    htmlLabels: true,
                                    curve: 'linear',
                                    useMaxWidth: false,
                                    padding: 12
                                }
                            });
                            const retryResult = await m.render(`${id}_linear`, text);
                            return typeof retryResult === 'string' ? { svg: retryResult } : retryResult;
                        } catch {
                            if (typeof document !== 'undefined') {
                                const errDivs = document.querySelectorAll(`[id^="d${id}"], [id^="mermaid-error"]`);
                                errDivs.forEach(el => el.remove());
                            }
                            throw renderErr;
                        }
                    }
                }
                // Mermaid 9 fallback API
                if (m.mermaidAPI && typeof m.mermaidAPI.render === 'function') {
                    return new Promise<{ svg: string }>((res, rej) => {
                        try {
                            m.mermaidAPI.render(id, text, (svgCode: string) => {
                                res({ svg: svgCode });
                            });
                        } catch (e) {
                            rej(e);
                        }
                    });
                }
                throw new Error('Fonction de rendu Mermaid non disponible');
            }
        };

        (window as any).mermaid = standardized;
        return standardized;
    };

    if ((window as any).mermaid && ((window as any).mermaid.render || (window as any).mermaid.mermaidAPI)) {
        return Promise.resolve(initMermaidInstance((window as any).mermaid));
    }

    if (mermaidPromise) {
        return mermaidPromise;
    }

    mermaidPromise = new Promise(async (resolve, reject) => {
        let isDone = false;

        const timeoutTimer = setTimeout(() => {
            if (!isDone) {
                isDone = true;
                mermaidPromise = null;
                reject(new Error("Délai d'attente dépassé lors du chargement de Mermaid (timeout 8s)."));
            }
        }, 8000);

        const succeed = (instance: any) => {
            if (!isDone) {
                isDone = true;
                clearTimeout(timeoutTimer);
                resolve(instance);
            }
        };

        // Stratégie 1: Import dynamique ESM (recommandé pour Mermaid 10+)
        const esmUrls = [
            'https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.esm.min.mjs',
            'https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.0/mermaid.esm.min.mjs',
            'https://esm.sh/mermaid@10.9.0',
            'https://unpkg.com/mermaid@10.9.0/dist/mermaid.esm.min.mjs'
        ];

        for (const url of esmUrls) {
            try {
                // Utilisation de new Function pour éviter l'analyse statique du bundler
                const dynamicImport = new Function('modulePath', 'return import(modulePath)');
                const module = await dynamicImport(url);
                const inst = initMermaidInstance(module);
                if (inst) {
                    succeed(inst);
                    return;
                }
            } catch {
                // Essai du CDN suivant
            }
        }

        // Stratégie 2: Injection script UMD classique (fallback résilient)
        const umdUrls = [
            'https://cdnjs.cloudflare.com/ajax/libs/mermaid/9.4.3/mermaid.min.js',
            'https://cdn.jsdelivr.net/npm/mermaid@9.4.3/dist/mermaid.min.js',
            'https://unpkg.com/mermaid@9.4.3/dist/mermaid.min.js'
        ];

        let umdIndex = 0;
        const tryNextUmd = () => {
            if (isDone) return;
            if (umdIndex >= umdUrls.length) {
                mermaidPromise = null;
                if (!isDone) {
                    isDone = true;
                    clearTimeout(timeoutTimer);
                    reject(new Error('Impossible de charger le moteur Mermaid depuis les réseaux CDN.'));
                }
                return;
            }

            const scriptUrl = umdUrls[umdIndex++];
            const script = document.createElement('script');
            script.src = scriptUrl;
            script.async = true;
            script.setAttribute('data-mermaid-script', 'true');

            script.onload = () => {
                if ((window as any).mermaid) {
                    const inst = initMermaidInstance((window as any).mermaid);
                    if (inst) {
                        succeed(inst);
                        return;
                    }
                }
                tryNextUmd();
            };

            script.onerror = () => {
                script.remove();
                tryNextUmd();
            };

            document.head.appendChild(script);
        };

        tryNextUmd();
    });

    return mermaidPromise;
}

const getShapeBrackets = (rawOpen: string): { open: string; close: string } => {
    if (rawOpen.startsWith('[(')) return { open: '[("', close: '")]' };
    if (rawOpen.startsWith('[[')) return { open: '[["', close: '"]]' };
    if (rawOpen.startsWith('{{')) return { open: '{{"', close: '"}}' };
    if (rawOpen.startsWith('((')) return { open: '(("', close: '"))' };
    if (rawOpen.startsWith('[')) return { open: '["', close: '"]' };
    if (rawOpen.startsWith('{')) return { open: '{"', close: '"}' };
    if (rawOpen.startsWith('(')) return { open: '("', close: '")' };
    if (rawOpen.startsWith('>')) return { open: '>"', close: '"]' };
    return { open: '["', close: '"]' };
};

/**
 * Enrichit le code Mermaid avec les métadonnées RACI, contrôles GRC et badges de risques
 */
export function annotateMermaidCode(
    chart: string,
    options: {
        workflowId?: string;
        planData?: any[];
        workflowTasks?: any[];
        availableUsers?: any[];
        allRisks?: any[];
        uniqueId?: string;
        stepEntities?: Record<string, string>;
    }
): string {
    const { workflowId, planData = [], workflowTasks = [], availableUsers = [], allRisks = [], uniqueId = 'print', stepEntities = {} } = options;
    let annotatedChart = chart;
    const chartId = workflowId || chart.match(/(?:graph|flowchart)\s+(?:TD|LR|TB|BT|RL);?\s+%%ID:(\w+)/)?.[1] || '';

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
                        availableUsers.find((u: any) => u.id === t.raci.responsible)?.name || 'Anonyme' : 'Non assigné',
                    approverUserName: t.raci?.accountable ?
                        availableUsers.find((u: any) => u.id === t.raci.accountable)?.name || 'Anonyme' : null,
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
            return tasks.map((t: any) => ({ ...t, categoryId: cat.id, subCategoryId: sub.id }));
        })
    );

    const allTasksRaw = [...workflowTasks.filter((t: any) => t.workflowId === chartId), ...planGrcTasks];
    const uniqueTasksMap = new Map();
    allTasksRaw.forEach((t: any) => {
        const uniqueKey = t.taskId ? `${t.taskId}-${t.nodeId}` : `${t.limitId || Math.random()}-${t.nodeId}`;
        if (!uniqueTasksMap.has(uniqueKey)) {
            uniqueTasksMap.set(uniqueKey, t);
        }
    });
    const allTasksToDisplay = Array.from(uniqueTasksMap.values());

    const tasksByNode: Record<string, any[]> = {};
    allTasksToDisplay.forEach((t: any) => {
        if (!tasksByNode[t.nodeId]) tasksByNode[t.nodeId] = [];
        tasksByNode[t.nodeId].push(t);
    });

    const targetNodeIds = new Set<string>([
        ...Object.keys(tasksByNode),
        ...Object.keys(stepEntities || {})
    ]);

    targetNodeIds.forEach(nodeId => {
        const tasks = tasksByNode[nodeId] || [];
        const entityFromMap = stepEntities?.[nodeId];
        const escapedId = nodeId.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

        let infoHtml = '';
        if (tasks.length > 0) {
            const nodeRiskIds = [...new Set(tasks.flatMap((t: any) => t.riskIds || []))];
            const nodeRisks = allRisks.filter((r: any) => nodeRiskIds.includes(r.id));
            let nodeMaxRiskLevel = '';
            let nodeMaxRiskNum = 0;
            nodeRisks.forEach((r: any) => {
                const lvl = riskLevelToNumber(r.riskLevel);
                if (lvl > nodeMaxRiskNum) {
                    nodeMaxRiskNum = lvl;
                    nodeMaxRiskLevel = r.riskLevel;
                }
            });
            const nodeRiskConfig = nodeMaxRiskLevel ? riskLevelConfig[nodeMaxRiskLevel] : null;

            infoHtml = `<div class='assignee-info-box'>`;
            const uniqueAssignees = new Map();
            tasks.forEach(task => {
                const sName = cleanForMermaid(task.responsibleUserName);
                const sApprover = task.approverUserName ? cleanForMermaid(task.approverUserName) : null;
                const sTaskName = cleanForMermaid(task.taskName);
                const sRole = cleanForMermaid(task.roleRequired).toUpperCase();
                const isGrc = task.isGrcControl;
                const key = `${sName}-${sApprover}-${sRole}-${isGrc}-${sTaskName}`;

                if (!uniqueAssignees.has(key)) {
                    uniqueAssignees.set(key, { sName, sApprover, sRole, isGrc, sTaskName });
                }
            });

            Array.from(uniqueAssignees.values()).forEach(({ sName, sApprover, sRole, isGrc, sTaskName }) => {
                infoHtml += `<div class='assignee-row ${isGrc ? 'grc-row' : ''}'>`;
                if (isGrc && sTaskName) {
                    infoHtml += `<div class='linked-task-name'>Task: ${sTaskName}</div>`;
                }
                infoHtml += `<div class='assignee-group'>` +
                    `<span class='icon'>${isGrc ? '🛡️' : '👤'}</span>` +
                    `<span class='assignee-name'>${sName}</span>` +
                    `<span class='assignee-role-badge'>${sRole}</span>` +
                    `</div>`;
                if (sApprover) {
                    infoHtml += `<div class='approver-row'>` +
                        `<span class='icon'>✅</span>` +
                        `<span class='approver-label'>Approbateur:</span>` +
                        `<span class='approver-name'>${sApprover}</span>` +
                        `</div>`;
                }
                infoHtml += `</div>`;
            });

            if (nodeRiskConfig && nodeMaxRiskLevel) {
                infoHtml += `<div class='risk-badge-node' style='background:${nodeRiskConfig.bg};border:1.5px solid ${nodeRiskConfig.border};color:${nodeRiskConfig.text};'>` +
                    `<span class='risk-badge-emoji'>${nodeRiskConfig.emoji}</span>` +
                    `<span class='risk-badge-label'>${nodeRiskConfig.label}</span>` +
                    `<span class='risk-badge-count'>${nodeRisks.length} risque${nodeRisks.length > 1 ? 's' : ''}</span>` +
                    `</div>`;
            }
            infoHtml += `</div>`;
        }

        // Remplacement sécurisé ligne par ligne (anti-boucle infinie & anti-backtracking)
        const lines = annotatedChart.split('\n');
        let matched = false;

        const newLines = lines.map(line => {
            if (matched) return line;
            const t = line.trim();
            // Match du noeud dans une déclaration simple: nodeId[...] ou nodeId(...) ou nodeId{...}
            const re = new RegExp(`^(\\s*\\b${escapedId}\\s*)([\\(\\[\\{\\/]{1,2})("?)(.*?)\\3([\\)\\]\\}\\/]{1,2})(\\s*:::?\\w+)?$`);
            const m = t.match(re);
            if (m) {
                matched = true;
                const prefix = m[1];
                const rawOpen = m[2];
                const rawLabel = m[4];
                const colorCls = m[6] || '';
                const { open, close } = getShapeBrackets(rawOpen);

                // Extraction entité : priorité au map stepEntities, sinon fallback contenu existant
                const entMatch = rawLabel.match(/<(?:small|span)[^>]*class=['"][^'"]*node-entity[^'"]*['"][^>]*>\s*\(?([^<)]+)\)?\s*<\/(?:small|span)>/i)
                    || rawLabel.match(/\((?:Entité\s*:\s*|Entite\s*:\s*)([^)]+)\)/i);
                const effectiveEntity = entityFromMap || (entMatch ? entMatch[1].trim() : '');

                const cleanLabel = cleanForMermaid(
                    rawLabel
                        .replace(/<[^>]+>/g, '')
                        .replace(/["'\)]+$/g, '')
                        .trim()
                );

                const entityHtml = effectiveEntity.trim()
                    ? ` <span class='node-entity-badge' style='font-size:9.5px;font-weight:700;color:#4f46e5;margin-left:4px;'>(${cleanForMermaid(effectiveEntity.trim().replace(/^[\(\[]|[\)\]]$/g, ''))})</span>`
                    : '';

                return `  ${prefix.trim()}${open}<div class='node-label-main'>${cleanLabel || nodeId}${entityHtml}</div>${infoHtml}${close}${colorCls}`;
            }
            return line;
        });

        if (matched) {
            annotatedChart = newLines.join('\n');
            if (tasks.length > 0) {
                const hasAlert = tasks.some((t: any) => t.status === 'Alerte');
                const allDone = tasks.every((t: any) => t.status === 'Terminé');
                const anyProgress = tasks.some((t: any) => t.status === 'En cours');
                const statusClass = hasAlert ? 'node-alert' : allDone ? 'node-done' : anyProgress ? 'node-progress' : 'node-pending';
                annotatedChart += `\nclass ${nodeId} ${statusClass};`;
                annotatedChart += `\nclick ${nodeId} call mermaidClick_${uniqueId}("${nodeId}") "Modifier cette étape"`;
            }
        }
    });

    annotatedChart += `\nclassDef node-done fill:#ecfdf5,stroke:#10b981,stroke-width:2px,rx:12,ry:12;`;
    annotatedChart += `\nclassDef node-progress fill:#fff7ed,stroke:#f97316,stroke-width:2px,rx:12,ry:12;`;
    annotatedChart += `\nclassDef node-pending fill:#f8fafc,stroke:#cbd5e1,stroke-width:1.5px,rx:12,ry:12;`;
    annotatedChart += `\nclassDef node-alert fill:#fff1f2,stroke:#f43f5e,stroke-width:2px,rx:12,ry:12;`;

    return annotatedChart;
}

/**
 * Normalise le code SVG pour l'impression sur 1 seule page
 */
export function sanitizeSvgForPrint(rawSvg: string): { svg: string; orientation: 'landscape' | 'portrait' } {
    let clean = rawSvg.trim();

    let orientation: 'landscape' | 'portrait' = 'landscape';
    const viewBoxMatch = clean.match(/viewBox=["']\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s*["']/i);

    if (viewBoxMatch) {
        const width = parseFloat(viewBoxMatch[3]);
        const height = parseFloat(viewBoxMatch[4]);
        if (height > width * 1.25) {
            orientation = 'portrait';
        }
    } else {
        const widthMatch = clean.match(/width=["']([0-9.]+)(?:px)?["']/i);
        const heightMatch = clean.match(/height=["']([0-9.]+)(?:px)?["']/i);
        if (widthMatch && heightMatch) {
            const width = parseFloat(widthMatch[1]);
            const height = parseFloat(heightMatch[1]);
            clean = clean.replace(/<svg\b([^>]*)>/i, `<svg$1 viewBox="0 0 ${width} ${height}">`);
            if (height > width * 1.25) {
                orientation = 'portrait';
            }
        }
    }

    clean = clean.replace(/<svg\b([^>]*)>/i, (match, attrs) => {
        let newAttrs = attrs
            .replace(/\bwidth=["'][^"']*["']/gi, '')
            .replace(/\bheight=["'][^"']*["']/gi, '')
            .replace(/\bstyle=["'][^"']*["']/gi, '')
            .replace(/\bpreserveAspectRatio=["'][^"']*["']/gi, '');

        return `<svg${newAttrs} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="max-width:100%;max-height:100%;width:100%;height:100%;display:block;margin:auto;">`;
    });

    return { svg: clean, orientation };
}

/**
 * Construit le document HTML complet et autonome prêt pour impression sur une seule page
 */
export function buildWorkflowPrintHTML(options: WorkflowPrintOptions, cleanSvg: string, orientation: 'landscape' | 'portrait'): string {
    const { name, domain = 'Conformité', version = '1.0', riskInfo } = options;
    const now = new Date();
    const formattedDate = now.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const riskConfig = riskInfo?.maxLevel ? riskLevelConfig[riskInfo.maxLevel] || riskLevelConfig['Faible'] : null;

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Workflow - ${name} | ComplianceNav</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 ${orientation};
      margin: 5mm 7mm;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: 100% !important;
      max-width: 100vw !important;
      max-height: 100vh !important;
      overflow: hidden !important;
      background: #ffffff !important;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }

    .page-root {
      width: 100%;
      height: 100vh;
      max-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      padding: 2px;
      page-break-inside: avoid !important;
      page-break-before: avoid !important;
      page-break-after: avoid !important;
      overflow: hidden !important;
    }

    .header-bar {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      margin-bottom: 6px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-title-block {
      display: flex;
      flex-direction: column;
    }

    .header-category {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
    }

    .header-title {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
      margin: 0;
      line-height: 1.2;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 9px;
      font-weight: 700;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #475569;
    }

    .chip-domain {
      background: #eef2ff;
      border-color: #c7d2fe;
      color: #4338ca;
      font-weight: 800;
      text-transform: uppercase;
    }

    .chip-version {
      background: #f1f5f9;
      border-color: #cbd5e1;
      color: #334155;
      font-family: monospace;
    }

    .chip-risk {
      font-weight: 800;
      text-transform: uppercase;
    }

    .diagram-card {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 8px;
      overflow: hidden;
      position: relative;
    }

    .diagram-container {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .diagram-container svg {
      width: 100% !important;
      height: 100% !important;
      max-width: 100% !important;
      max-height: 100% !important;
      object-fit: contain !important;
      display: block !important;
      margin: auto !important;
    }

    .node-label-main {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 12px;
      color: #0f172a;
      margin-bottom: 2px;
      text-align: center;
    }

    .node-entity, .node-entity-badge {
      font-family: 'Outfit', sans-serif;
      font-size: 9.5px !important;
      font-weight: 700 !important;
      color: #4f46e5 !important;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      padding: 0.5px 5px;
      border-radius: 4px;
      margin-left: 4px !important;
      display: inline-block !important;
      vertical-align: middle !important;
    }

    .assignee-info-box {
      margin-top: 4px;
      border-top: 1px solid rgba(0,0,0,0.08);
      padding-top: 4px;
      text-align: center;
      width: 100%;
    }

    .assignee-row {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      margin-bottom: 3px;
    }

    .assignee-row:last-child {
      margin-bottom: 0;
    }

    .grc-row {
      border-top: 1px dashed rgba(0,0,0,0.12);
      margin-top: 3px;
      padding-top: 3px;
    }

    .assignee-name {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      color: #334155;
      font-size: 9px;
      margin-bottom: 1px;
      white-space: nowrap;
    }

    .assignee-role-badge {
      font-family: 'Outfit', sans-serif;
      font-size: 7.5px;
      background: #ffffff;
      color: #475569;
      display: inline-block;
      padding: 1px 6px;
      border-radius: 6px;
      font-weight: 800;
      border: 1px solid #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .grc-row .assignee-role-badge {
      background: #f0f9ff;
      color: #0369a1;
      border-color: #bae6fd;
    }

    .linked-task-name {
      font-size: 7.5px;
      color: #64748b;
      font-style: italic;
      margin-bottom: 1px;
      text-decoration: underline;
    }

    .assignee-group {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      width: 100%;
    }

    .icon {
      font-size: 8px;
    }

    .approver-row {
      background: #ecfdf5;
      border-radius: 4px;
      padding: 1.5px 5px;
      margin-top: 2px;
      font-size: 7.5px;
      display: flex;
      align-items: center;
      gap: 3px;
      border: 1px solid #a7f3d0;
      width: 92%;
      justify-content: center;
    }

    .approver-label {
      color: #059669;
      font-weight: 700;
      font-size: 6.5px;
      text-transform: uppercase;
    }

    .approver-name {
      color: #047857;
      font-weight: 600;
    }

    .risk-badge-node {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      margin-top: 3px;
      padding: 2px 6px;
      border-radius: 8px;
      font-family: 'Outfit', sans-serif;
      font-size: 7.5px;
      font-weight: 700;
    }

    .risk-badge-emoji { font-size: 8px; }
    .risk-badge-label { text-transform: uppercase; letter-spacing: 0.02em; }
    .risk-badge-count { opacity: 0.75; font-weight: 500; font-size: 6.5px; }

    .node rect, .node circle, .node polygon {
      stroke-width: 1.5px !important;
    }

    .edgePath path {
      stroke: #64748b !important;
      stroke-width: 1.8px !important;
    }

    .marker {
      fill: #64748b !important;
      stroke: #64748b !important;
    }

    .footer-bar {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 3px 6px;
      margin-top: 3px;
      font-size: 8.5px;
      color: #64748b;
    }

    .footer-page-only {
      font-weight: 700;
      color: #64748b;
      font-family: 'Outfit', sans-serif;
      letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  <div class="page-root">
    <!-- EN-TÊTE -->
    <header class="header-bar">
      <div class="header-left">
        <div class="header-title-block">
          <span class="header-category">Cartographie des Processus Métiers & Plan d'Organisation</span>
          <h1 class="header-title">${name}</h1>
        </div>
      </div>
      <div class="header-right">
        <span class="chip chip-domain">${domain}</span>
        <span class="chip chip-version">Version ${version}</span>
        ${riskConfig && riskInfo ? `
          <span class="chip chip-risk" style="background:${riskConfig.bg};border-color:${riskConfig.border};color:${riskConfig.text};">
            ${riskConfig.emoji} ${riskConfig.label} (Score: ${riskInfo.avgScore || '-'}/4)
          </span>
        ` : ''}
        <span class="chip">📅 ${formattedDate} à ${formattedTime}</span>
      </div>
    </header>

    <!-- ZONE DU DIAGRAMME VECTORIEL -->
    <main class="diagram-card">
      <div class="diagram-container">
        ${cleanSvg}
      </div>
    </main>

    <!-- PIED DE PAGE -->
    <footer class="footer-bar">
      <div class="footer-page-only">
        Page 1 / 1
      </div>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Lance l'impression d'un workflow sur une seule page via un iframe invisible
 */
export async function printWorkflow(options: WorkflowPrintOptions): Promise<void> {
    try {
        let svgContent = options.svgHtml || '';

        // Si nous n'avons pas le SVG mais que nous avons le code Mermaid, on effectue le rendu
        if (!svgContent && options.code) {
            try {
                const mermaid = await ensureMermaidLoaded();
                const annotatedCode = annotateMermaidCode(options.code, {
                    workflowId: options.workflowId,
                    planData: options.planData || [],
                    workflowTasks: options.workflowTasks || [],
                    availableUsers: options.availableUsers || [],
                    allRisks: options.allRisks || [],
                    uniqueId: 'print'
                });

                const tempId = `print_svg_${Math.random().toString(36).substring(2, 9)}`;
                try {
                    const { svg: generatedSvg } = await mermaid.render(tempId, annotatedCode);
                    svgContent = generatedSvg;
                } catch (renderError) {
                    console.warn("Échec du rendu annoté pour l'impression, repli sur le code brut:", renderError);
                    const simpleId = `print_svg_simple_${Math.random().toString(36).substring(2, 9)}`;
                    const { svg: simpleSvg } = await mermaid.render(simpleId, options.code);
                    svgContent = simpleSvg;
                }
            } catch (loadErr) {
                console.error("Erreur lors de la compilation Mermaid pour impression:", loadErr);
            }
        }

        if (!svgContent) {
            throw new Error("Aucun contenu de diagramme à imprimer");
        }

        const { svg: sanitizedSvg, orientation } = sanitizeSvgForPrint(svgContent);
        const fullHtml = buildWorkflowPrintHTML(options, sanitizedSvg, orientation);

        // Méthode Blob URL + Iframe off-screen pour une compatibilité navigateur maximale
        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        iframe.style.width = '1200px';
        iframe.style.height = '900px';
        iframe.style.opacity = '0';
        iframe.style.border = '0';
        iframe.style.pointerEvents = 'none';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);

        // Traçabilité Audit & Journal d'activités
        recordActivity({
            action: 'PRINT_WORKFLOW',
            label: `Impression Workflow : ${options.name}`,
            detail: `Domaine: ${options.domain || 'Conformité'} • Version: ${options.version || 1} • 1 page A4`,
            module: 'Processus Métiers'
        });

        iframe.onload = () => {
            setTimeout(() => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } catch (printErr) {
                    console.warn("Échec de l'impression via iframe, ouverture de la fenêtre dédiée:", printErr);
                    const printWin = window.open(blobUrl, '_blank');
                    if (printWin) {
                        printWin.onload = () => {
                            printWin.focus();
                            printWin.print();
                        };
                    }
                } finally {
                    setTimeout(() => {
                        try {
                            document.body.removeChild(iframe);
                            URL.revokeObjectURL(blobUrl);
                        } catch (_) {}
                    }, 60000);
                }
            }, 300);
        };
    } catch (error) {
        console.error("Erreur lors de l'impression du workflow:", error);
        throw error;
    }
}
