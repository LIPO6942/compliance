'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MermaidRenderer } from '@/components/plan/MermaidRenderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import * as LucideIcons from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, getDocs, orderBy, limit, writeBatch } from 'firebase/firestore';
import { MermaidWorkflow, WorkflowVersion, WorkflowDomain } from '@/types/compliance';
import { usePlanData } from '@/contexts/PlanDataContext';
import { useRiskMapping } from '@/contexts/RiskMappingContext';
import { printWorkflow } from '@/lib/workflowPrint';
import { recordActivity } from '@/contexts/ActivityLogContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ── Catégories réglementaires obligatoires ────────────────────────────────────────
const WORKFLOW_CATEGORIES = ['LAB/FT', 'Veille Réglementaire'] as const;
type WorkflowCategory = typeof WORKFLOW_CATEGORIES[number];

const CATEGORY_CONFIG_EDIT: Record<WorkflowCategory, { color: string; bg: string; border: string; activeBg: string }> = {
    'LAB/FT': { color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-300', activeBg: 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/30 shadow-sm' },
    'Veille Réglementaire': { color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-300', activeBg: 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-400/30 shadow-sm' },
};

declare global {
    interface Window { require: any; monaco: any; }
}

// ── Types for Visual Model ──────────────────────────────────────────────────
type NodeShape = 'rectangle' | 'rounded' | 'diamond' | 'circle' | 'parallelogram';
type NodeColor = 'blue' | 'green' | 'orange' | 'purple' | 'rose' | 'amber';

interface VisualNode {
    id: string;
    label: string;
    shape: NodeShape;
    colorClass?: string;
}

interface VisualEdge {
    from: string;
    to: string;
    label?: string;
}

const COLOR_CLASSES: Record<NodeColor, { class: string; name: string; bg: string; border: string; text: string; dot: string }> = {
    blue:   { class: 'blueNode',   name: 'Bleu (Action)',      bg: 'bg-sky-50',     border: 'border-sky-300',     text: 'text-sky-700',     dot: 'bg-sky-500' },
    green:  { class: 'greenNode',  name: 'Vert (Début/Fin)',   bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    orange: { class: 'orangeNode', name: 'Orange (Décision)',  bg: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-700',   dot: 'bg-amber-500' },
    purple: { class: 'purpleNode', name: 'Violet (Procédure)', bg: 'bg-purple-50',  border: 'border-purple-300',  text: 'text-purple-700',  dot: 'bg-purple-500' },
    rose:   { class: 'roseNode',   name: 'Rouge (Alerte)',     bg: 'bg-rose-50',    border: 'border-rose-300',    text: 'text-rose-700',    dot: 'bg-rose-500' },
    amber:  { class: 'amberNode',  name: 'Jaune (I/O)',        bg: 'bg-yellow-50',  border: 'border-yellow-300',  text: 'text-yellow-700',  dot: 'bg-yellow-500' },
};

function normalizeColorClass(cls?: string): string {
    if (!cls) return 'blueNode';
    const lower = cls.toLowerCase();
    if (lower.includes('startend') || lower.includes('green') || lower.includes('success')) return 'greenNode';
    if (lower.includes('decision') || lower.includes('orange') || lower.includes('warning')) return 'orangeNode';
    if (lower.includes('action') || lower.includes('blue') || lower.includes('info')) return 'blueNode';
    if (lower.includes('process') || lower.includes('purple')) return 'purpleNode';
    if (lower.includes('alert') || lower.includes('rose') || lower.includes('red') || lower.includes('danger')) return 'roseNode';
    return cls;
}

// Generate clean short sequential node IDs (N1, N2, N3...)
function getNextSimpleNodeId(code: string): string {
    let num = 1;
    while (new RegExp(`\\bN${num}\\b`).test(code)) {
        num++;
    }
    return `N${num}`;
}

// Ensure default styling classDefs are embedded in the Mermaid code
function ensureThemeClassDefs(rawCode: string): string {
    let code = rawCode;
    const defs = [
        `classDef greenNode fill:#e6f4ea,stroke:#0d9488,stroke-width:2px,rx:10,ry:10,color:#0f766e;`,
        `classDef blueNode fill:#f0f7ff,stroke:#0284c7,stroke-width:2px,rx:10,ry:10,color:#0369a1;`,
        `classDef orangeNode fill:#fff7ed,stroke:#ea580c,stroke-width:2px,rx:6,ry:6,color:#c2410c;`,
        `classDef purpleNode fill:#faf5ff,stroke:#9333ea,stroke-width:2px,rx:10,ry:10,color:#7e22ce;`,
        `classDef roseNode fill:#fff1f2,stroke:#e11d48,stroke-width:2px,rx:10,ry:10,color:#be123c;`,
        `classDef amberNode fill:#fefce8,stroke:#ca8a04,stroke-width:2px,rx:10,ry:10,color:#a16207;`,
        `classDef startend fill:#e6f4ea,stroke:#0d9488,stroke-width:2px,rx:10,ry:10,color:#0f766e;`,
        `classDef action fill:#f0f7ff,stroke:#0284c7,stroke-width:2px,rx:10,ry:10,color:#0369a1;`,
        `classDef decision fill:#fff7ed,stroke:#ea580c,stroke-width:2px,rx:6,ry:6,color:#c2410c;`,
        `classDef process fill:#faf5ff,stroke:#9333ea,stroke-width:2px,rx:10,ry:10,color:#7e22ce;`,
    ];

    defs.forEach(def => {
        const clsName = def.split(' ')[1];
        if (!code.includes(`classDef ${clsName} `)) {
            code += `\n  ${def}`;
        }
    });

    return code;
}

// ── Node Definition Parser for an individual part ──────────────────────────
function parseNodeDefinition(part: string): { id: string; label: string; shape: NodeShape; colorClass?: string } | null {
    const trimmed = part.trim();
    if (!trimmed) return null;

    let classCleaned = trimmed;
    let colorClass: string | undefined;
    const classMatch = classCleaned.match(/(?:::|:::)([a-zA-Z0-9_\-]+)$/);
    if (classMatch) {
        colorClass = normalizeColorClass(classMatch[1]);
        classCleaned = classCleaned.slice(0, classMatch.index).trim();
    }

    const idMatch = classCleaned.match(/^([a-zA-Z0-9_\-\.]+)/);
    if (!idMatch) return null;
    const id = idMatch[1];

    const RESERVED_WORDS = new Set([
        'graph', 'flowchart', 'subgraph', 'end', 'direction', 'classDef', 'class',
        'style', 'linkStyle', 'click', 'TB', 'TD', 'LR', 'RL', 'BT', '--', '==', '..',
        'Oui', 'Non', 'OUI', 'NON', 'yes', 'no', 'true', 'false', 'ou'
    ]);
    if (RESERVED_WORDS.has(id)) return null;

    const rest = classCleaned.slice(id.length).trim();
    if (!rest) {
        return { id, label: id, shape: 'rectangle', colorClass };
    }

    let shape: NodeShape = 'rectangle';
    let rawLabel = rest;

    if (rest.startsWith('((') && rest.endsWith('))')) {
        shape = 'circle';
        rawLabel = rest.slice(2, -2);
    } else if (rest.startsWith('{') && rest.endsWith('}')) {
        shape = 'diamond';
        rawLabel = rest.slice(1, -1);
    } else if (rest.startsWith('[/') && rest.endsWith('/]')) {
        shape = 'parallelogram';
        rawLabel = rest.slice(2, -2);
    } else if (rest.startsWith('(') && rest.endsWith(')')) {
        shape = 'rounded';
        rawLabel = rest.slice(1, -1);
    } else if (rest.startsWith('[') && rest.endsWith(']')) {
        shape = 'rectangle';
        rawLabel = rest.slice(1, -1);
    }

    const cleanLabel = rawLabel
        .replace(/^["']+|["']+$/g, '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/\\n/g, ' ')
        .replace(/<[^>]+>/g, '')
        .trim();

    return {
        id,
        label: cleanLabel || id,
        shape,
        colorClass
    };
}

// ── Parse Mermaid Code with Zero Phantom Nodes and Flow Ordering ──────────
function parseMermaid(code: string): { nodes: VisualNode[]; edges: VisualEdge[] } {
    const rawNodesMap = new Map<string, VisualNode>();
    const edges: VisualEdge[] = [];

    const addOrUpdateNode = (n: { id: string; label: string; shape: NodeShape; colorClass?: string }) => {
        if (!n.id || n.id === 'title') return;
        const existing = rawNodesMap.get(n.id);
        if (existing) {
            if (n.label && n.label !== n.id) existing.label = n.label;
            if (n.shape && n.shape !== 'rectangle') existing.shape = n.shape;
            if (n.colorClass) existing.colorClass = n.colorClass;
        } else {
            rawNodesMap.set(n.id, {
                id: n.id,
                label: n.label || n.id,
                shape: n.shape || 'rectangle',
                colorClass: n.colorClass || (n.shape === 'diamond' ? 'orangeNode' : n.shape === 'rounded' ? 'greenNode' : 'blueNode')
            });
        }
    };

    const edgePattern = /(?:-->\|([^|\n]+)\||--\s+([^\->\n]+?)\s+-->|-->|-\.->|==>)/;

    const lines = code.split('\n');
    lines.forEach(rawLine => {
        const line = rawLine.trim();
        if (!line || line.startsWith('%%') || line.startsWith('subgraph') || line === 'end' ||
            line.startsWith('direction') || line.startsWith('classDef') || line.startsWith('style') ||
            line.startsWith('linkStyle') || line.startsWith('click')) {
            return;
        }

        if (line.startsWith('class ')) {
            const m = line.match(/^class\s+([A-Za-z0-9_\-\.,\s]+)\s+([A-Za-z0-9_\-]+)/);
            if (m) {
                const targets = m[1].split(',').map(s => s.trim());
                const cls = normalizeColorClass(m[2]);
                targets.forEach(tId => {
                    const node = rawNodesMap.get(tId);
                    if (node) node.colorClass = cls;
                });
            }
            return;
        }

        const edgeMatch = line.match(edgePattern);
        if (edgeMatch && edgeMatch.index !== undefined) {
            const edgeIndex = edgeMatch.index;
            const edgeLength = edgeMatch[0].length;
            const leftStr = line.slice(0, edgeIndex).trim();
            const rightStr = line.slice(edgeIndex + edgeLength).trim();

            let edgeLabel: string | undefined = undefined;
            if (edgeMatch[1]) edgeLabel = edgeMatch[1].trim();
            else if (edgeMatch[2]) edgeLabel = edgeMatch[2].trim();

            const fromNode = parseNodeDefinition(leftStr);
            const toNode = parseNodeDefinition(rightStr);

            if (fromNode) addOrUpdateNode(fromNode);
            if (toNode) addOrUpdateNode(toNode);

            if (fromNode && toNode) {
                if (!edges.some(e => e.from === fromNode.id && e.to === toNode.id)) {
                    edges.push({ from: fromNode.id, to: toNode.id, label: edgeLabel });
                }
            }
        } else {
            const node = parseNodeDefinition(line);
            if (node) addOrUpdateNode(node);
        }
    });

    const allNodes = Array.from(rawNodesMap.values());

    // Topological / Flow-ordered sorting so cards appear top-to-bottom as in diagram
    const inDegree = new Map<string, number>();
    allNodes.forEach(n => inDegree.set(n.id, 0));
    edges.forEach(e => {
        inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
    });

    const roots = allNodes.filter(n => (inDegree.get(n.id) || 0) === 0);
    const visited = new Set<string>();
    const sortedNodes: VisualNode[] = [];

    const queue = [...roots];
    while (queue.length > 0) {
        const curr = queue.shift()!;
        if (!visited.has(curr.id)) {
            visited.add(curr.id);
            sortedNodes.push(curr);
            edges.filter(e => e.from === curr.id).forEach(e => {
                const targetNode = rawNodesMap.get(e.to);
                if (targetNode && !visited.has(targetNode.id)) {
                    queue.push(targetNode);
                }
            });
        }
    }

    allNodes.forEach(n => {
        if (!visited.has(n.id)) sortedNodes.push(n);
    });

    return { nodes: sortedNodes, edges };
}

// ── Surgical Mermaid Editors (Preserve ALL Node Definitions and Formatting) ─

function surgicalEditLabel(code: string, nodeId: string, newLabel: string): string {
    const escId = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safeLabel = newLabel.replace(/"/g, "'").replace(/\n/g, '<br/>');

    const nodeDefRe = new RegExp(
        `(\\b${escId}\\s*)(\\[\\/|\\(\\(|[\\[\\(\\{])\\s*"?([^\\]\\)\\n\\r]*?)"?\\s*(\\/\\]|\\)\\)|[\\]\\)\\}])(\\s*:::?\\w+)?`,
        'g'
    );

    if (nodeDefRe.test(code)) {
        return code.replace(nodeDefRe, (match, prefix, open, oldLabel, close, cls) => {
            const classPart = cls || '';
            return `${nodeId}${open}"${safeLabel}"${close}${classPart}`;
        });
    }

    return code;
}

function surgicalEditShapeAndColor(code: string, nodeId: string, newShape: NodeShape, colorKey: NodeColor): string {
    const escId = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const colorCls = COLOR_CLASSES[colorKey]?.class || 'blueNode';

    let openB = '[';
    let closeB = ']';
    if (newShape === 'diamond') { openB = '{'; closeB = '}'; }
    else if (newShape === 'rounded') { openB = '('; closeB = ')'; }
    else if (newShape === 'circle') { openB = '(('; closeB = '))'; }
    else if (newShape === 'parallelogram') { openB = '[/'; closeB = '/]'; }

    const nodeDefRe = new RegExp(
        `(\\b${escId}\\s*)(?:\\[\\/|\\(\\(|[\\[\\(\\{])\\s*"?([^\\]\\)\\n\\r]*?)"?\\s*(?:\\/\\]|\\)\\)|[\\]\\)\\}])(?:\\s*:::?\\w+)?`,
        'g'
    );

    let replaced = false;
    let updated = code.replace(nodeDefRe, (match, prefix, innerLabel) => {
        replaced = true;
        const cleanTxt = innerLabel.replace(/^["']+|["']+$/g, '').trim();
        return `${nodeId}${openB}"${cleanTxt}"${closeB}:::${colorCls}`;
    });

    if (!replaced) {
        const classLineRe = new RegExp(`^\\s*class\\s+.*\\b${escId}\\b.*$`, 'gm');
        if (classLineRe.test(updated)) {
            updated = updated.replace(classLineRe, `  class ${nodeId} ${colorCls};`);
        } else {
            const classIdx = updated.search(/\n[ \t]*(classDef|class |style |linkStyle )/);
            if (classIdx > -1) {
                updated = updated.slice(0, classIdx) + `\n  class ${nodeId} ${colorCls};` + updated.slice(classIdx);
            } else {
                updated = `${updated}\n  class ${nodeId} ${colorCls};`;
            }
        }
    }

    return ensureThemeClassDefs(updated);
}

// 🗑️ Bridges predecessors directly to successors and preserves target definitions!
function surgicalDeleteNode(code: string, nodeId: string): string {
    const escId = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const lines = code.split('\n');

    const incoming: { leftDef: string; arrow: string }[] = [];
    const outgoing: { rightDef: string; arrow: string }[] = [];
    const otherLines: string[] = [];

    lines.forEach(line => {
        const t = line.trim();
        if (!t || t.startsWith('%%') || t.startsWith('classDef') || t.startsWith('style') || t.startsWith('linkStyle')) {
            otherLines.push(line);
            return;
        }

        // Skip direct class assignment for deleted node
        if (new RegExp(`^class\\s+.*\\b${escId}\\b`).test(t)) {
            return;
        }

        // Skip standalone declaration of deleted node
        if (new RegExp(`^${escId}\\s*[\\[\\(\\{]`).test(t)) {
            return;
        }

        // Incoming edge to deleted node: e.g. A1 --> N1
        const inMatch = t.match(new RegExp(`^(.*?)\\s*(-->|==>|-\\.\\->|--\\s+[^\n\\->]+?\\s+-->)\\s*\\b${escId}\\b(?:[\\[\\(\\{][^\n]*?)?(?:\\s*:::?\\w+)?$`));
        if (inMatch) {
            incoming.push({ leftDef: inMatch[1].trim(), arrow: inMatch[2] });
            return;
        }

        // Outgoing edge from deleted node: e.g. N1 --> B1{Applicable ?}:::decision
        const outMatch = t.match(new RegExp(`^\\b${escId}\\b(?:[\\[\\(\\{][^\n]*?)?(?:\\s*:::?\\w+)?\\s*(-->|==>|-\\.\\->|--\\s+[^\n\\->]+?\\s+-->)\\s*(.+)$`));
        if (outMatch) {
            outgoing.push({ arrow: outMatch[1], rightDef: outMatch[2].trim() });
            return;
        }

        if (new RegExp(`\\b${escId}\\b`).test(t)) {
            return;
        }

        otherLines.push(line);
    });

    const bridgedLines: string[] = [];
    if (incoming.length > 0 && outgoing.length > 0) {
        // Bridge each predecessor directly to each successor preserving full definition
        incoming.forEach(inc => {
            outgoing.forEach(out => {
                bridgedLines.push(`  ${inc.leftDef} --> ${out.rightDef}`);
            });
        });
    } else if (outgoing.length > 0) {
        // If deleted node was root, keep successors declarations
        outgoing.forEach(out => {
            if (/[\[\(\{\/]/.test(out.rightDef)) {
                bridgedLines.push(`  ${out.rightDef}`);
            }
        });
    }

    const resultText = otherLines.join('\n');
    if (bridgedLines.length > 0) {
        const classIdx = resultText.search(/\n[ \t]*(classDef|class |style |linkStyle )/);
        if (classIdx > -1) {
            return resultText.slice(0, classIdx) + `\n${bridgedLines.join('\n')}` + resultText.slice(classIdx);
        }
        return resultText + `\n${bridgedLines.join('\n')}`;
    }

    return resultText;
}

// ➕ Inserts a node cleanly between fromNode and toNode WITHOUT deleting toNode's shape or label!
function surgicalInsertBetween(
    code: string,
    fromNodeId: string,
    toNodeId: string | undefined,
    label: string,
    shape: NodeShape = 'rectangle',
    colorKey: NodeColor = 'blue'
): string {
    const nextId = getNextSimpleNodeId(code); // Clean simple ID: N1, N2, N3...
    const safeLabel = (label || `Étape ${nextId}`).replace(/"/g, "'").replace(/\n/g, '<br/>');
    const colorCls = COLOR_CLASSES[colorKey]?.class || (shape === 'diamond' ? 'orangeNode' : shape === 'rounded' ? 'greenNode' : 'blueNode');

    let nodeDef = `${nextId}["${safeLabel}"]:::${colorCls}`;
    if (shape === 'diamond') nodeDef = `${nextId}{"${safeLabel}"}:::${colorCls}`;
    else if (shape === 'rounded') nodeDef = `${nextId}("${safeLabel}"):::${colorCls}`;

    let updatedCode = ensureThemeClassDefs(code);

    if (toNodeId) {
        const escFrom = fromNodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escTo = toNodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const lines = updatedCode.split('\n');
        let edgeReplaced = false;

        const newLines = lines.map(line => {
            if (edgeReplaced) return line;
            const t = line.trim();
            // Matches: fromNodeId ... --> ... toNodeId ...
            const edgeLineRe = new RegExp(`^(\\s*\\b${escFrom}\\b[^\n\\->]*?)\\s*(-->|==>|-\\.\\->)\\s*(\\b${escTo}\\b[^\n]*)$`);
            const m = t.match(edgeLineRe);
            if (m) {
                edgeReplaced = true;
                const leftDef = m[1].trim();
                const arrow = m[2];
                const rightDef = m[3].trim(); // PRESERVES B1{Applicable ?}:::decision IN FULL!
                return `  ${leftDef} ${arrow} ${nodeDef}\n  ${nextId} --> ${rightDef}`;
            }
            return line;
        });

        if (edgeReplaced) {
            return newLines.join('\n');
        }

        // Fallback
        const newEdges = `  ${fromNodeId} --> ${nodeDef}\n  ${nextId} --> ${toNodeId}`;
        const classIdx = updatedCode.search(/\n[ \t]*(classDef|class |style |linkStyle )/);
        if (classIdx > -1) {
            return updatedCode.slice(0, classIdx) + `\n${newEdges}` + updatedCode.slice(classIdx);
        }
        return updatedCode + `\n${newEdges}`;
    } else {
        const newEdge = `  ${fromNodeId} --> ${nodeDef}`;
        const classIdx = updatedCode.search(/\n[ \t]*(classDef|class |style |linkStyle )/);
        if (classIdx > -1) {
            return updatedCode.slice(0, classIdx) + `\n${newEdge}` + updatedCode.slice(classIdx);
        }
        return updatedCode + `\n${newEdge}`;
    }
}

function surgicalConnectNodes(code: string, fromId: string, toId: string, label?: string): string {
    const l = label && label.trim() ? ` -->|"${label.trim()}"| ` : ' --> ';
    const edgeLine = `  ${fromId}${l}${toId}`;
    
    // Check if edge already exists
    const escFrom = fromId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escTo = toId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingRe = new RegExp(`\\b${escFrom}\\b.*-->.*\\b${escTo}\\b`);
    if (existingRe.test(code)) return code;

    const classIdx = code.search(/\n[ \t]*(classDef|class |style |linkStyle )/);
    if (classIdx > -1) {
        return code.slice(0, classIdx) + `\n${edgeLine}` + code.slice(classIdx);
    }
    return code + `\n${edgeLine}`;
}

function surgicalRemoveEdge(code: string, fromId: string, toId: string): string {
    const escFrom = fromId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escTo = toId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const lines = code.split('\n');
    const result: string[] = [];

    lines.forEach(line => {
        const t = line.trim();
        const re = new RegExp(`^(\\s*\\b${escFrom}\\b[^\n\\->]*?)\\s*(-->|==>|-\\.\\->|--\\s+[^\n\\->]+?\\s+-->)\\s*(\\b${escTo}\\b[^\n]*)$`);
        const m = t.match(re);
        if (m) {
            const leftPart = m[1].trim();
            const rightPart = m[3].trim();
            if (/[\[\(\{\/]/.test(rightPart)) {
                result.push(`  ${rightPart}`);
            }
            if (/[\[\(\{\/]/.test(leftPart)) {
                result.push(`  ${leftPart}`);
            }
        } else {
            result.push(line);
        }
    });

    return result.join('\n');
}

// ── Modèles de processus prêts à l'emploi ──────────────────────────────────
const EASY_TEMPLATES = [
    {
        name: 'Veille Réglementaire Complète (Colorée)',
        icon: '📖',
        code: `graph TD
  title["<div style='font-size:16px;font-weight:bold;padding:4px 8px;'>VEILLE REGLEMENTAIRE</div>"]:::titleClass
  S1["Identification Nouvelle Loi<br/>ou Circulaire"]:::greenNode
  A1["Analyse du Texte<br/>et de la Portee"]:::blueNode
  B1{"Applicable?"}:::orangeNode
  C1["Evaluation de l Impact<br/>sur les activites"]:::purpleNode
  D1["Revision du Manuel<br/>de Procedures"]:::purpleNode
  E1["Mise a jour des Formulaires<br/>et Contrats"]:::purpleNode
  F1["Demande d evolution<br/>aux equipes IT"]:::purpleNode
  G1["Planification des Formations"]:::purpleNode
  H1["FIN : Loi integree<br/>dans les operations"]:::greenNode
  J1["FIN : Simple veille<br/>et archivage"]:::greenNode

  title --> S1
  S1 --> A1
  A1 --> B1
  B1 -->|Non| J1
  B1 -->|Oui| C1
  C1 --> D1
  D1 --> E1
  E1 --> F1
  F1 --> G1
  G1 --> H1

  classDef titleClass fill:#ffffff,stroke:none,font-weight:bold;
  classDef greenNode fill:#e6f4ea,stroke:#0d9488,stroke-width:2px,rx:10,ry:10,color:#0f766e;
  classDef blueNode fill:#f0f7ff,stroke:#0284c7,stroke-width:2px,rx:10,ry:10,color:#0369a1;
  classDef orangeNode fill:#fff7ed,stroke:#ea580c,stroke-width:2px,rx:6,ry:6,color:#c2410c;
  classDef purpleNode fill:#faf5ff,stroke:#9333ea,stroke-width:2px,rx:10,ry:10,color:#7e22ce;`
    },
    {
        name: 'Entrée en Relation & KYC (LAB/FT)',
        icon: '🛡️',
        code: `graph TD
  A1("1. Réception dossier d'adhésion"):::greenNode
  B1["2. Collecte des justificatifs KYC"]:::blueNode
  C1["3. Criblage listes sanctions (RegTools)"]:::blueNode
  D1{"4. Risque élevé ou PPE ?"}:::orangeNode
  E1["5. Dossier Vigilance Renforcée & Validation"]:::purpleNode
  F1["6. Entrée en relation standard"]:::blueNode
  G1("7. Validation finale & Monitoring"):::greenNode

  A1 --> B1
  B1 --> C1
  C1 --> D1
  D1 -->|Oui| E1
  D1 -->|Non| F1
  E1 --> G1
  F1 --> G1

  classDef greenNode fill:#e6f4ea,stroke:#0d9488,stroke-width:2px,rx:10,ry:10,color:#0f766e;
  classDef blueNode fill:#f0f7ff,stroke:#0284c7,stroke-width:2px,rx:10,ry:10,color:#0369a1;
  classDef orangeNode fill:#fff7ed,stroke:#ea580c,stroke-width:2px,rx:6,ry:6,color:#c2410c;
  classDef purpleNode fill:#faf5ff,stroke:#9333ea,stroke-width:2px,rx:10,ry:10,color:#7e22ce;`
    }
];

export default function WorkflowEditorPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const { toast } = useToast();
    const editorRef = useRef<any>(null);
    const monacoContainerRef = useRef<HTMLDivElement>(null);

    const [code, setCode] = useState<string>(EASY_TEMPLATES[0].code);
    const [name, setName] = useState<string>('');
    const [domain, setDomain] = useState<WorkflowDomain>('Conformité');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeWorkflow, setActiveWorkflow] = useState<MermaidWorkflow | null>(null);
    const [isMonacoReady, setIsMonacoReady] = useState(false);
    const [activeTab, setActiveTab] = useState('builder');

    // Visual model parsed from current code
    const [visualModel, setVisualModel] = useState<{ nodes: VisualNode[]; edges: VisualEdge[] }>({ nodes: [], edges: [] });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoom, setZoom] = useState(0.3);

    // Tags & Category
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [category, setCategory] = useState<WorkflowCategory | ''>('LAB/FT');

    // Editable ID
    const [editingId, setEditingId] = useState(false);
    const [newId, setNewId] = useState('');

    const skipMonacoSync = useRef(false);
    const codeRef = useRef(code);
    useEffect(() => { codeRef.current = code; }, [code]);

    // Apply Code safely
    const applyCode = useCallback((newCode: string) => {
        const enriched = ensureThemeClassDefs(newCode);
        codeRef.current = enriched;
        setCode(enriched);
        setVisualModel(parseMermaid(enriched));

        if (editorRef.current && editorRef.current.getValue() !== enriched) {
            skipMonacoSync.current = true;
            editorRef.current.setValue(enriched);
        }
    }, []);

    // ── Direct Surgical Modifications ──────────────────────────────────────

    const handleEditNodeText = (nodeId: string, newText: string) => {
        const updated = surgicalEditLabel(codeRef.current, nodeId, newText);
        applyCode(updated);
    };

    const handleEditNodeTypeAndColor = (nodeId: string, shape: NodeShape, color: NodeColor) => {
        const updated = surgicalEditShapeAndColor(codeRef.current, nodeId, shape, color);
        applyCode(updated);
    };

    // 🗑️ Seamless deletion that bridges predecessor to successor
    const handleDeleteNode = (nodeId: string) => {
        const updated = surgicalDeleteNode(codeRef.current, nodeId);
        applyCode(updated);
        toast({ title: 'Étape supprimée et flux raccordé' });
    };

    const handleConnectToStep = (fromId: string, toId: string, label?: string) => {
        const updated = surgicalConnectNodes(codeRef.current, fromId, toId, label);
        applyCode(updated);
        toast({ title: `Liaison créée : ${fromId} ➔ ${toId}` });
    };

    const handleInsertNextStep = (fromNodeId: string, shape: NodeShape = 'rectangle', color: NodeColor = 'blue') => {
        const outgoing = visualModel.edges.filter(e => e.from === fromNodeId);
        const primaryTarget = outgoing.length === 1 ? outgoing[0].to : undefined;
        const defaultLabel = shape === 'diamond' ? 'Condition / Décision ?' : 'Nouvelle étape';
        
        const updated = surgicalInsertBetween(codeRef.current, fromNodeId, primaryTarget, defaultLabel, shape, color);
        applyCode(updated);
        toast({ title: `Étape insérée dans l'alignement vertical` });
    };

    const handleCleanBypassLink = (fromId: string, bypassTargetId: string) => {
        const updated = surgicalRemoveEdge(codeRef.current, fromId, bypassTargetId);
        applyCode(updated);
        toast({ title: 'Flux réaligné verticalement' });
    };

    const handleAddDecisionBranches = (fromNodeId: string) => {
        const idYes = getNextSimpleNodeId(codeRef.current);
        let updated = surgicalConnectNodes(codeRef.current, fromNodeId, `${idYes}["Suite si OUI"]:::blueNode`, 'Oui');
        const idNo = getNextSimpleNodeId(updated);
        updated = surgicalConnectNodes(updated, fromNodeId, `${idNo}["Action si NON"]:::roseNode`, 'Non');
        applyCode(updated);
        toast({ title: 'Branches Oui & Non créées' });
    };

    // ── Load workflow from Firestore ───────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            if (!id || !db) return;
            try {
                setLoading(true);
                const snap = await getDoc(doc(db, 'workflows', id));
                if (snap.exists()) {
                    const data = snap.data() as MermaidWorkflow;
                    setActiveWorkflow({ ...data, id: snap.id });
                    setName(data.name);
                    setDomain(data.domain || 'Conformité');
                    if (data.tags) {
                        setTags(data.tags);
                        const foundCat = data.tags.find(t => WORKFLOW_CATEGORIES.includes(t as WorkflowCategory));
                        if (foundCat) setCategory(foundCat as WorkflowCategory);
                    }
                    const vSnap = await getDocs(query(collection(db, 'workflows', id, 'versions'), orderBy('version', 'desc'), limit(1)));
                    if (!vSnap.empty) {
                        applyCode((vSnap.docs[0].data() as WorkflowVersion).mermaidCode);
                    } else {
                        applyCode(EASY_TEMPLATES[0].code);
                    }
                } else {
                    setName(id === 'vr001' ? 'VEILLE REGLEMENTAIRE' : id === 'eer' ? 'Entrée en Relation' : 'Processus Métier');
                    applyCode(EASY_TEMPLATES[0].code);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, applyCode]);

    // ── Save / Publish ──────────────────────────────────────────────────────
    const handleSave = async (status: 'draft' | 'published') => {
        if (!id || !db) return;
        setSaving(true);
        try {
            const nextV = (activeWorkflow?.currentVersion || 0) + 1;
            const now = new Date().toISOString();
            const vId = `v${nextV}-${Date.now()}`;
            await setDoc(doc(db, 'workflows', id, 'versions', vId), { id: vId, mermaidCode: code, version: nextV, status, createdAt: now, updatedAt: now });
            const data: Partial<MermaidWorkflow> = {
                workflowId: id, name, domain, currentVersion: nextV, updatedAt: now,
                tags: category ? [category, ...tags.filter(t => !WORKFLOW_CATEGORIES.includes(t as WorkflowCategory))] : tags,
                ...(status === 'published' ? { activeVersionId: vId } : {})
            };
            await setDoc(doc(db, 'workflows', id), data, { merge: true });

            recordActivity({
                action: status === 'published' ? 'WORKFLOW_PUBLISH' : 'WORKFLOW_UPDATE',
                label: `${status === 'published' ? 'Publication' : 'Sauvegarde'} Workflow : ${name || id} (V${nextV})`,
                detail: `Statut: ${status} • Catégorie: ${category} • Version: ${nextV}`,
                module: 'Processus Métiers'
            });

            toast({ title: status === 'published' ? '✅ Workflow publié !' : '💾 Sauvegardé' });
            setActiveWorkflow(prev => prev ? { ...prev, ...data } as MermaidWorkflow : { ...data, id } as MermaidWorkflow);
        } catch (e) {
            toast({ title: 'Erreur lors de la sauvegarde', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    // ── Rename ID ───────────────────────────────────────────────────────────
    const handleRenameId = async () => {
        if (!db || !newId.trim() || newId.trim() === id) { setEditingId(false); return; }
        const sanitized = newId.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
        if (!sanitized) { toast({ title: 'ID invalide', variant: 'destructive' }); return; }

        const existing = await getDoc(doc(db, 'workflows', sanitized));
        if (existing.exists()) { toast({ title: 'ID déjà existant', variant: 'destructive' }); return; }

        try {
            setSaving(true);
            const now = new Date().toISOString();
            const currentSnap = await getDoc(doc(db, 'workflows', id));
            const currentData = currentSnap.exists() ? currentSnap.data() : {
                id: sanitized, workflowId: sanitized, name: name || sanitized, domain, currentVersion: 1, createdAt: now, updatedAt: now,
                tags: category ? [category, ...tags.filter(t => !WORKFLOW_CATEGORIES.includes(t as WorkflowCategory))] : tags
            };

            await setDoc(doc(db, 'workflows', sanitized), { ...currentData, id: sanitized, workflowId: sanitized, name: name || sanitized, updatedAt: now });
            const versSnap = await getDocs(collection(db, 'workflows', id, 'versions'));
            for (const vDoc of versSnap.docs) {
                await setDoc(doc(db, 'workflows', sanitized, 'versions', vDoc.id), vDoc.data());
            }
            const delBatch = writeBatch(db);
            versSnap.docs.forEach(vDoc => delBatch.delete(doc(db, 'workflows', id, 'versions', vDoc.id)));
            if (currentSnap.exists()) delBatch.delete(doc(db, 'workflows', id));
            await delBatch.commit();

            toast({ title: '✅ ID modifié', description: `${id} → ${sanitized}` });
            router.push(`/admin/workflows/${sanitized}/edit`);
        } catch (e) {
            toast({ title: 'Erreur lors du renommage', variant: 'destructive' });
        } finally { setSaving(false); setEditingId(false); }
    };

    // Monaco Setup
    const initMonaco = useCallback(() => {
        if (typeof window === 'undefined' || !monacoContainerRef.current || editorRef.current) return;
        const setup = () => {
            if (!monacoContainerRef.current || editorRef.current) return;
            editorRef.current = window.monaco.editor.create(monacoContainerRef.current, {
                value: codeRef.current, language: 'mermaid', theme: 'vs-dark', minimap: { enabled: false }, fontSize: 13, automaticLayout: true, padding: { top: 10 }
            });
            editorRef.current.onDidChangeModelContent(() => {
                if (skipMonacoSync.current) { skipMonacoSync.current = false; return; }
                const newVal = editorRef.current.getValue();
                applyCode(newVal);
            });
            setIsMonacoReady(true);
        };
        if (window.monaco) setup();
        else if (window.require) {
            window.require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
            window.require(['vs/editor/editor.main'], () => setup());
        }
    }, [applyCode]);

    useEffect(() => {
        if (activeTab === 'editor') {
            const timer = setTimeout(initMonaco, 100);
            return () => clearTimeout(timer);
        } else if (editorRef.current) {
            editorRef.current.dispose();
            editorRef.current = null;
            setIsMonacoReady(false);
        }
    }, [activeTab, initMonaco]);

    if (loading) return <div className="p-20 text-center font-bold text-slate-500 animate-pulse">Chargement de l'éditeur...</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-100/50">
            {/* ── Top Header Bar ──────────────────────────────────────────── */}
            <div className="border-b bg-white px-6 py-3 flex justify-between items-center shrink-0 z-20 shadow-xs">
                <div className="flex items-center gap-4">
                    <Link href="/admin/workflows">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                            <LucideIcons.ArrowLeft className="h-5 w-5 text-slate-600" />
                        </Button>
                    </Link>
                    <div>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="h-8 font-black border-none px-0 focus-visible:ring-0 text-xl w-[320px] bg-transparent text-slate-900"
                            placeholder="Nom du processus..."
                        />
                        {editingId ? (
                            <div className="flex items-center gap-1 mt-0.5">
                                <input
                                    autoFocus
                                    value={newId}
                                    onChange={e => setNewId(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleRenameId(); if (e.key === 'Escape') setEditingId(false); }}
                                    className="font-mono text-xs text-slate-700 bg-slate-100 border border-slate-300 rounded px-2 py-0.5 w-44 outline-none"
                                    placeholder={id}
                                />
                                <button onClick={handleRenameId} className="text-emerald-600 p-1"><LucideIcons.Check className="h-4 w-4" /></button>
                                <button onClick={() => setEditingId(false)} className="text-slate-400 p-1"><LucideIcons.X className="h-4 w-4" /></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[11px] text-slate-400 font-mono">
                                    ID: <span className="font-semibold text-slate-600">{id}</span>
                                    {activeWorkflow?.activeVersionId && <span className="text-emerald-600 font-bold ml-2">● V{activeWorkflow.currentVersion} ACTIF</span>}
                                </p>
                                <button onClick={() => { setNewId(id); setEditingId(true); }} className="text-slate-300 hover:text-indigo-600 p-0.5" title="Modifier l'ID">
                                    <LucideIcons.Pencil className="h-3 w-3" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleSave('draft')} disabled={saving} className="rounded-xl font-bold">
                        {saving ? <LucideIcons.Loader2 className="animate-spin h-4 w-4" /> : <LucideIcons.Save className="h-4 w-4 mr-1.5" />}
                        Brouillon
                    </Button>
                    <Button size="sm" onClick={() => handleSave('published')} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md font-bold px-4">
                        {saving ? <LucideIcons.Loader2 className="animate-spin h-4 w-4" /> : <LucideIcons.CloudUpload className="h-4 w-4 mr-1.5" />}
                        Publier
                    </Button>
                </div>
            </div>

            {/* ── Split Layout ────────────────────────────────────────────── */}
            <div className="flex-1 flex overflow-hidden">
                {/* ── Left Controls Area (50%) ─────────────────────────────── */}
                <div className="w-[50%] border-r flex flex-col bg-white">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                        <div className="shrink-0 bg-slate-50 border-b px-4 flex items-center justify-between h-12">
                            <TabsList className="bg-slate-200/70 p-0.5 rounded-xl">
                                <TabsTrigger value="builder" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    🛠️ Constructeur Simple
                                </TabsTrigger>
                                <TabsTrigger value="settings" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    🏷️ Catégorie & Tags
                                </TabsTrigger>
                                <TabsTrigger value="editor" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    💻 Code Mermaid Direct
                                </TabsTrigger>
                            </TabsList>

                            {/* Modèles prêts à l'emploi */}
                            <Select onValueChange={(val) => {
                                const t = EASY_TEMPLATES.find(t => t.name === val);
                                if (t) applyCode(t.code);
                            }}>
                                <SelectTrigger className="h-7 text-[11px] font-bold bg-white border-slate-200 rounded-lg w-44">
                                    <SelectValue placeholder="✨ Modèles complets..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {EASY_TEMPLATES.map(t => (
                                        <SelectItem key={t.name} value={t.name} className="text-xs font-semibold">
                                            <span className="mr-1.5">{t.icon}</span> {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* ══════════════════════════════════════════════════════════
                            TAB 1 : CONSTRUCTEUR DIRECT (CLEAN SHORT IDS & RESILIENT)
                        ══════════════════════════════════════════════════════════ */}
                        <TabsContent value="builder" className="flex-1 m-0 overflow-auto bg-slate-50/40 p-4 space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                                        Étapes du Processus ({visualModel.nodes.length})
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Étapes triées du début à la fin. Modifiez le libellé ou la couleur directement.
                                    </p>
                                </div>
                            </div>

                            {/* Node Cards List */}
                            <div className="space-y-2.5">
                                {visualModel.nodes.map((node, nodeIdx) => {
                                    const isDecision = node.shape === 'diamond';
                                    const outgoing = visualModel.edges.filter(e => e.from === node.id);
                                    const hasBypass = outgoing.length >= 2;

                                    return (
                                        <div
                                            key={node.id}
                                            className={cn(
                                                "p-3.5 rounded-2xl border bg-white shadow-2xs transition-all space-y-2.5",
                                                isDecision ? "border-amber-200 bg-amber-50/10" : "border-slate-200"
                                            )}
                                        >
                                            {/* Row 1: Index, ID, Text Input & Color Picker */}
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-black px-2 py-1 rounded-lg bg-slate-100 text-slate-700 shrink-0 border border-slate-200">
                                                    #{nodeIdx + 1} ({node.id})
                                                </span>

                                                <Input
                                                    value={node.label}
                                                    onChange={e => handleEditNodeText(node.id, e.target.value)}
                                                    className="h-9 text-xs font-bold rounded-xl bg-slate-50/70 border-slate-200 focus:bg-white flex-1 text-slate-800"
                                                    placeholder="Titre de l'étape..."
                                                />

                                                {/* Color Swatch Picker */}
                                                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                                                    {(['blue', 'green', 'orange', 'purple', 'rose'] as NodeColor[]).map(c => {
                                                        const cfg = COLOR_CLASSES[c];
                                                        const isCur = node.colorClass === cfg.class;
                                                        return (
                                                            <button
                                                                key={c}
                                                                type="button"
                                                                onClick={() => handleEditNodeTypeAndColor(node.id, node.shape, c)}
                                                                className={cn(
                                                                    "h-4 w-4 rounded-full transition-transform",
                                                                    cfg.dot,
                                                                    isCur ? "ring-2 ring-offset-1 ring-slate-800 scale-110" : "opacity-60 hover:opacity-100"
                                                                )}
                                                                title={cfg.name}
                                                            />
                                                        );
                                                    })}
                                                </div>

                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteNode(node.id)}
                                                    className="h-8 w-8 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0"
                                                    title="Supprimer cette étape"
                                                >
                                                    <LucideIcons.Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>

                                            {/* Row 2: Connections & Next Steps */}
                                            <div className="pt-2 border-t border-slate-100 space-y-2">
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                                            <LucideIcons.ArrowRight className="h-3 w-3 text-indigo-500" />
                                                            Suite du flux ➜
                                                        </span>

                                                        {outgoing.length > 0 ? (
                                                            outgoing.map(edge => {
                                                                const targetNode = visualModel.nodes.find(n => n.id === edge.to);
                                                                return (
                                                                    <span
                                                                        key={edge.to}
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs"
                                                                    >
                                                                        {edge.label && (
                                                                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase border border-amber-200">
                                                                                {edge.label}
                                                                            </span>
                                                                        )}
                                                                        <span className="truncate max-w-[130px]">
                                                                            {targetNode ? `${edge.to} - ${targetNode.label}` : edge.to}
                                                                        </span>
                                                                        <button
                                                                            onClick={() => applyCode(surgicalRemoveEdge(codeRef.current, node.id, edge.to))}
                                                                            className="text-slate-400 hover:text-red-600 ml-1 font-bold"
                                                                            title="Supprimer cette liaison"
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    </span>
                                                                );
                                                            })
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 italic">Non relié (Fin de branche)</span>
                                                        )}
                                                    </div>

                                                    {/* Actions: Connect to Existing or Insert Aligned Next Step */}
                                                    <div className="flex items-center gap-1.5">
                                                        <Select onValueChange={(targetId) => {
                                                            if (targetId && targetId !== node.id) {
                                                                handleConnectToStep(node.id, targetId);
                                                            }
                                                        }}>
                                                            <SelectTrigger className="h-7 text-[11px] font-bold bg-slate-50 border-slate-200 hover:bg-slate-100 rounded-lg w-44 text-indigo-700">
                                                                <SelectValue placeholder="🔗 Relier vers étape..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {visualModel.nodes.filter(n => n.id !== node.id && !outgoing.some(e => e.to === n.id)).map(n => (
                                                                    <SelectItem key={n.id} value={n.id} className="text-xs font-semibold">
                                                                        <span className="font-mono font-bold text-slate-500 mr-1.5">[{n.id}]</span>
                                                                        {n.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>

                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleInsertNextStep(node.id, 'rectangle', 'blue')}
                                                            className="h-7 text-[10px] bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 rounded-lg font-bold gap-1 shadow-2xs"
                                                            title="Insère une étape dans l'alignement vertical"
                                                        >
                                                            <LucideIcons.Plus className="h-3 w-3" /> + Insérer étape après
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Notice to clean accidental bypass loops */}
                                                {hasBypass && !isDecision && (
                                                    <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs text-amber-800">
                                                        <span>⚠️ Plusieurs liaisons sortantes détectées.</span>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleCleanBypassLink(node.id, outgoing[outgoing.length - 1].to)}
                                                            className="h-6 text-[10px] bg-white border-amber-300 font-bold"
                                                        >
                                                            Aligner en colonne unique
                                                        </Button>
                                                    </div>
                                                )}

                                                {/* If Decision, quick branches button */}
                                                {isDecision && (
                                                    <div className="flex items-center gap-2 pt-1 border-t border-amber-100">
                                                        <span className="text-[10px] font-bold text-amber-700 uppercase">Branches décisionnelles :</span>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleAddDecisionBranches(node.id)}
                                                            className="h-6 text-[10px] bg-amber-500 hover:bg-amber-600 text-white rounded-md font-bold gap-1 shadow-2xs"
                                                        >
                                                            <LucideIcons.GitFork className="h-3 w-3" /> + Générer branches "Oui" & "Non"
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </TabsContent>

                        {/* ══════════════════════════════════════════════════════════
                            TAB 2 : CATÉGORIE & TAGS
                        ══════════════════════════════════════════════════════════ */}
                        <TabsContent value="settings" className="flex-1 m-0 overflow-auto p-6 space-y-5 bg-slate-50/50">
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                                <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <LucideIcons.ShieldAlert className="h-4 w-4 text-rose-500" />
                                    Catégorie Réglementaire Obligatoire
                                </h3>
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    {WORKFLOW_CATEGORIES.map(cat => {
                                        const cfg = CATEGORY_CONFIG_EDIT[cat];
                                        const isSelected = category === cat;
                                        return (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setCategory(cat)}
                                                className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                                                    isSelected ? cfg.activeBg : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                {cat === 'LAB/FT'
                                                    ? <LucideIcons.ShieldAlert className={`h-5 w-5 shrink-0 ${isSelected ? cfg.color : 'text-slate-400'}`} />
                                                    : <LucideIcons.BookOpen className={`h-5 w-5 shrink-0 ${isSelected ? cfg.color : 'text-slate-400'}`} />
                                                }
                                                <span className={`text-xs font-black ${isSelected ? cfg.color : 'text-slate-700'}`}>{cat}</span>
                                                {isSelected && <LucideIcons.CheckCircle2 className={`h-4 w-4 ml-auto ${cfg.color}`} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                                <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <LucideIcons.Tag className="h-4 w-4 text-indigo-500" />
                                    Tags libres
                                </h3>
                                <div className="min-h-[44px] flex flex-wrap gap-1.5 items-center px-3 py-2 rounded-xl border bg-slate-50/50">
                                    {tags.filter(t => !WORKFLOW_CATEGORIES.includes(t as WorkflowCategory)).map(tag => (
                                        <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border bg-indigo-50 text-indigo-700 border-indigo-200">
                                            {tag}
                                            <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))}>
                                                <LucideIcons.X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={e => {
                                            if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                                                e.preventDefault();
                                                const clean = tagInput.trim();
                                                if (!tags.includes(clean)) setTags(prev => [...prev, clean]);
                                                setTagInput('');
                                            }
                                        }}
                                        placeholder="Taper un tag + Entrée..."
                                        className="flex-1 min-w-[120px] outline-none bg-transparent text-xs placeholder:text-slate-400"
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        {/* ══════════════════════════════════════════════════════════
                            TAB 3 : MONACO CODE MERMAID DIRECT
                        ══════════════════════════════════════════════════════════ */}
                        <TabsContent value="editor" className="flex-1 m-0 p-0 overflow-hidden bg-[#1e1e1e]">
                            <div className="h-full flex flex-col">
                                <div className="bg-[#252526] px-4 py-2 text-[10px] uppercase font-bold text-emerald-400 border-b border-black flex justify-between">
                                    <span>Code Mermaid Direct</span>
                                    <span>● Synchronisation Temps Réel</span>
                                </div>
                                <div className="flex-1 min-h-0" ref={monacoContainerRef} />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* ── Right Panel: Live Visualizer (50%) ───────────────────── */}
                <div className="flex-1 flex flex-col bg-slate-100/70 relative group overflow-hidden">
                    <div className="bg-white px-6 py-3 border-b flex justify-between items-center shrink-0 shadow-2xs">
                        <div className="flex items-center gap-2">
                            <LucideIcons.Eye className="h-4 w-4 text-emerald-500" />
                            <span className="text-xs font-black uppercase text-slate-600 tracking-wider">Aperçu Diagramme en Direct</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 bg-slate-100 rounded-full px-2 py-1 border border-slate-200 shadow-inner">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}
                                    className="h-6 w-6 rounded-full hover:bg-white transition-all"
                                >
                                    <LucideIcons.Minus className="h-3 w-3 text-slate-600" />
                                </Button>
                                <span className="text-[10px] font-black w-10 text-center text-slate-600 font-mono">
                                    {Math.round(zoom * 100)}%
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setZoom(z => Math.min(3, z + 0.1))}
                                    className="h-6 w-6 rounded-full hover:bg-white transition-all"
                                >
                                    <LucideIcons.Plus className="h-3 w-3 text-slate-600" />
                                </Button>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setIsFullscreen(true)} className="h-8 rounded-xl gap-1.5 text-xs font-bold">
                                <LucideIcons.Maximize2 className="h-3.5 w-3.5" /> Plein écran
                            </Button>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold h-6 px-2.5">
                                ● Synchronisé
                            </Badge>
                        </div>
                    </div>

                    {/* Mermaid Viewer Canvas */}
                    <div className="flex-1 relative bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] p-4 overflow-hidden">
                        <div className="absolute inset-4 bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200/80 flex flex-col overflow-auto">
                            <div className="min-w-full min-h-full p-8 flex items-center justify-center">
                                <MermaidRenderer chart={code} workflowId={id} zoom={zoom} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FULLSCREEN PREVIEW DIALOG */}
            <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
                <DialogContent className="max-w-[95vw] h-[90vh] rounded-3xl p-0 overflow-hidden flex flex-col border-none shadow-2xl">
                    <div className="bg-white/90 backdrop-blur-md px-8 py-4 border-b flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                                <LucideIcons.Workflow className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800">{name}</h2>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Aperçu Haute Résolution • ID: {id}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(false)} className="h-9 w-9 rounded-full">
                            <LucideIcons.X className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="flex-1 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] overflow-hidden p-6 flex items-center justify-center">
                        <div className="w-full h-full max-w-[95%] max-h-[95%] bg-white rounded-2xl shadow-xl border border-slate-100 flex items-center justify-center p-4">
                            <MermaidRenderer chart={code} workflowId={id} fitMode={true} />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
