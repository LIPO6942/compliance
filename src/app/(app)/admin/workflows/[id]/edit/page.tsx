'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MermaidRenderer } from '@/components/plan/MermaidRenderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import * as LucideIcons from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, getDocs, orderBy, limit, writeBatch } from 'firebase/firestore';
import { MermaidWorkflow, WorkflowVersion, WorkflowTask, AuditLog, WorkflowDomain } from '@/types/compliance';
import { usePlanData } from '@/contexts/PlanDataContext';
import { useRiskMapping } from '@/contexts/RiskMappingContext';
import { printWorkflow } from '@/lib/workflowPrint';
import { recordActivity } from '@/contexts/ActivityLogContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ── Tag helpers ──────────────────────────────────────────────────────────────
const TAG_COLORS_EDITOR = [
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-violet-100 text-violet-700 border-violet-200',
    'bg-sky-100 text-sky-700 border-sky-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-rose-100 text-rose-700 border-rose-200',
    'bg-teal-100 text-teal-700 border-teal-200',
    'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
];
const getTagColorEditor = (tag: string) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) & 0xffffffff;
    return TAG_COLORS_EDITOR[Math.abs(hash) % TAG_COLORS_EDITOR.length];
};

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

// ─── Types for visual builder ───────────────────────────────────────────────
type NodeShape = 'rectangle' | 'rounded' | 'diamond' | 'circle' | 'parallelogram';
interface VisualNode { id: string; label: string; shape: NodeShape; }
interface VisualEdge { from: string; to: string; label?: string; }
interface VisualGraph { direction: 'TD' | 'LR' | 'BT' | 'RL'; nodes: VisualNode[]; edges: VisualEdge[]; }

const SHAPE_CONFIG: Record<NodeShape, { label: string; short: string; color: string; bg: string; border: string; icon: string }> = {
    rectangle: { label: 'Action standard', short: 'Action', color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-300', icon: '▭' },
    diamond: { label: 'Décision / Question', short: 'Décision', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-300', icon: '◇' },
    rounded: { label: 'Début ou Fin', short: 'Début/Fin', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300', icon: '◯' },
    circle: { label: 'Événement', short: 'Événement', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300', icon: '●' },
    parallelogram: { label: 'Document / Donnée I/O', short: 'Document', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300', icon: '◸' },
};

// ── Convert VisualGraph -> Mermaid Code ─────────────────────────────────────
function graphToMermaid(graph: VisualGraph, originalCode?: string): string {
    const dir = graph.direction || 'TD';
    const lines: string[] = [`graph ${dir}`];

    const formatNodeDecl = (n: VisualNode) => {
        const s = (n.label || n.id).replace(/"/g, "'");
        if (n.shape === 'rounded') return `${n.id}("${s}")`;
        if (n.shape === 'diamond') return `${n.id}{"${s}"}`;
        if (n.shape === 'circle') return `${n.id}(("${s}"))`;
        if (n.shape === 'parallelogram') return `${n.id}[/"${s}"/]`;
        return `${n.id}["${s}"]`;
    };

    const renderedInEdge = new Set<string>();

    // 1. Edges
    graph.edges.forEach(e => {
        const fromNode = graph.nodes.find(n => n.id === e.from);
        const toNode = graph.nodes.find(n => n.id === e.to);

        const fromStr = fromNode ? formatNodeDecl(fromNode) : e.from;
        const toStr = toNode ? formatNodeDecl(toNode) : e.to;

        renderedInEdge.add(e.from);
        renderedInEdge.add(e.to);

        if (e.label && e.label.trim()) {
            lines.push(`  ${fromStr} -->|"${e.label.trim()}"| ${toStr}`);
        } else {
            lines.push(`  ${fromStr} --> ${toStr}`);
        }
    });

    // 2. Standalone nodes
    graph.nodes.forEach(n => {
        if (!renderedInEdge.has(n.id)) {
            lines.push(`  ${formatNodeDecl(n)}`);
        }
    });

    // 3. Preserve styling if any
    if (originalCode) {
        const styleLines = originalCode
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.startsWith('classDef ') || l.startsWith('class ') || l.startsWith('style ') || l.startsWith('linkStyle '));
        if (styleLines.length > 0) {
            lines.push('');
            styleLines.forEach(sl => lines.push(`  ${sl}`));
        }
    }

    return lines.join('\n');
}

// ── Convert Mermaid Code -> VisualGraph ─────────────────────────────────────
function mermaidToGraph(code: string): VisualGraph {
    const dir = code.match(/(?:graph|flowchart)\s+(TD|LR|BT|RL)/)?.[1] as VisualGraph['direction'] || 'TD';
    const nodes: VisualNode[] = [];
    const edges: VisualEdge[] = [];

    const RESERVED = new Set(['graph', 'flowchart', 'TD', 'LR', 'BT', 'RL', 'subgraph', 'end', 'classDef', 'class', 'style', 'linkStyle', 'click']);

    const cleanLabel = (raw: string) =>
        raw.replace(/<br\s*\/?>/gi, ' ').replace(/\\n/g, ' ').replace(/<[^>]+>/g, '').replace(/^["']|["']$/g, '').trim();

    const addNode = (id: string, label: string, shape: NodeShape) => {
        if (RESERVED.has(id)) return;
        const existing = nodes.find(n => n.id === id);
        if (existing) {
            if (label && label !== id) existing.label = cleanLabel(label);
            existing.shape = shape;
            return;
        }
        nodes.push({ id, label: cleanLabel(label) || id, shape });
    };

    const patterns: { re: RegExp; shape: NodeShape }[] = [
        { re: /\b([A-Za-z0-9_\-\.]+)\(\(\s*"((?:[^"\\]|\\.)*)"\s*\)\)/g, shape: 'circle' },
        { re: /\b([A-Za-z0-9_\-\.]+)\(\(\s*([^)]+)\s*\)\)/g, shape: 'circle' },
        { re: /\b([A-Za-z0-9_\-\.]+)\{\s*"((?:[^"\\]|\\.)*)"\s*\}/g, shape: 'diamond' },
        { re: /\b([A-Za-z0-9_\-\.]+)\{\s*([^}]+)\s*\}/g, shape: 'diamond' },
        { re: /\b([A-Za-z0-9_\-\.]+)\[\/\s*"((?:[^"\\]|\\.)*?)"\s*\/\]/g, shape: 'parallelogram' },
        { re: /\b([A-Za-z0-9_\-\.]+)\(\s*"((?:[^"\\]|\\.)*)"\s*\)/g, shape: 'rounded' },
        { re: /\b([A-Za-z0-9_\-\.]+)\(\s*([^)]+)\s*\)/g, shape: 'rounded' },
        { re: /\b([A-Za-z0-9_\-\.]+)\[\s*"((?:[^"\\]|\\.)*)"\s*\]/g, shape: 'rectangle' },
        { re: /\b([A-Za-z0-9_\-\.]+)\[\s*([^\]]+)\s*\]/g, shape: 'rectangle' },
    ];

    patterns.forEach(({ re, shape }) => {
        const clone = new RegExp(re.source, re.flags);
        let m: RegExpExecArray | null;
        while ((m = clone.exec(code)) !== null) { addNode(m[1], m[2] ?? m[1], shape); }
    });

    const nodePart = String.raw`([A-Za-z0-9_\-\.]+)(?:\s*(?:\[\/?[^\]]*\]|\{[^}]*\}|\([^)]*\)))?`;
    const edgeRe = new RegExp(`${nodePart}\\s*--?>+\\s*(?:\\|([^|\\n]*)\\|)?\\s*${nodePart}`, 'g');
    let em: RegExpExecArray | null;
    while ((em = edgeRe.exec(code)) !== null) {
        const from = em[1];
        const label = em[2]?.replace(/"/g, '').trim() || undefined;
        const to = em[3];
        if (RESERVED.has(from) || RESERVED.has(to)) continue;
        if (!edges.find(e => e.from === from && e.to === to)) { edges.push({ from, to, label }); }
        addNode(from, from, 'rectangle');
        addNode(to, to, 'rectangle');
    }
    return { direction: dir, nodes, edges: edges.filter((e, i, arr) => arr.findIndex(x => x.from === e.from && x.to === e.to && x.label === e.label) === i) };
}

function genNextId(graph: VisualGraph): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let idx = graph.nodes.length;
    let id = '';
    do { id = idx < 26 ? letters[idx] : `N${idx + 1}`; idx++; } while (graph.nodes.find(n => n.id === id));
    return id;
}

// ── Modèles de processus prêts à l'emploi ──────────────────────────────────
const WORKFLOW_TEMPLATES = [
    {
        name: 'Flux Séquentiel (3 étapes)',
        icon: '➡️',
        description: 'Début ➔ Traitement ➔ Validation finale',
        code: `graph TD\n  A("1. Réception de la demande") --> B["2. Analyse & Traitement du dossier"]\n  B --> C("3. Validation & Clôture")`
    },
    {
        name: 'Flux avec Décision (Oui / Non)',
        icon: '🔀',
        description: 'Question avec branches Oui (accord) et Non (rejet)',
        code: `graph TD\n  A("Réception demande") --> B{"Critères conformes ?"}\n  B -->|"Oui"| C["Validation & Exécution"]\n  B -->|"Non"| D["Notification de rejet"]\n  C --> E("Fin du processus")\n  D --> E`
    },
    {
        name: 'Vérification KYC & Sanctions (LAB/FT)',
        icon: '🛡️',
        description: 'Collecte, criblage listes et vigilance renforcée',
        code: `graph TD\n  A("Collecte pièces KYC") --> B["Criblage listes sanctions & PPE"]\n  B --> C{"Client à risque élevé ?"}\n  C -->|"Oui"| D["Dossier Vigilance Renforcée & Avis Délégué"]\n  C -->|"Non"| E["Entrée en relation standard"]\n  D --> F("Archivage & Monitoring continu")\n  E --> F`
    },
    {
        name: 'Veille & Mise en Conformité',
        icon: '📖',
        description: 'Analyse nouvelle circulaire et mise à jour procédures',
        code: `graph TD\n  A("Publication texte réglementaire") --> B["Analyse d'impact opérationnel"]\n  B --> C{"Impact sur procédures internes ?"}\n  C -->|"Oui"| D["Mise à jour procédures & Formation réseau"]\n  C -->|"Non"| E["Archivage de veille réglementaire"]\n  D --> F("Rapport semestriel Direction")\n  E --> F`
    }
];

export default function WorkflowEditorPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const { toast } = useToast();
    const editorRef = useRef<any>(null);
    const monacoContainerRef = useRef<HTMLDivElement>(null);

    const [code, setCode] = useState<string>('graph TD\n  A["Début"] --> B{"Décision"}\n  B -->|"Oui"| C["Fin"]\n  B -->|"Non"| D["Action"]');
    const [name, setName] = useState<string>('');
    const [domain, setDomain] = useState<WorkflowDomain>('Conformité');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeWorkflow, setActiveWorkflow] = useState<MermaidWorkflow | null>(null);
    const [isMonacoReady, setIsMonacoReady] = useState(false);
    const [activeTab, setActiveTab] = useState('builder');

    const [graph, setGraph] = useState<VisualGraph>({ direction: 'TD', nodes: [], edges: [] });
    const [searchQuery, setSearchQuery] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoom, setZoom] = useState(0.3);

    // New link inline helper state
    const [linkingFromId, setLinkingFromId] = useState<string | null>(null);
    const [linkingTargetId, setLinkingTargetId] = useState<string>('');
    const [linkingLabel, setLinkingLabel] = useState<string>('');

    const [processAssignees, setProcessAssignees] = useState<{ userId: string; userName: string; role: string }[]>([]);
    const [addingAssignee, setAddingAssignee] = useState(false);
    const [newAssigneeForm, setNewAssigneeForm] = useState<{ userId: string; userName: string; role: string }>({ userId: '', userName: '', role: '' });

    // ── Tags state ───────────────────────────────────────────────────────────
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [existingTags, setExistingTags] = useState<string[]>([]);
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);
    const tagInputRef = useRef<HTMLInputElement>(null);
    // Catégorie obligatoire
    const [category, setCategory] = useState<WorkflowCategory | ''>('LAB/FT');

    // ── Editable ID state ──────────────────────────────────────────────────
    const [editingId, setEditingId] = useState(false);
    const [newId, setNewId] = useState('');

    const { auditLogs, availableUsers, availableRoles, planData, workflowTasks } = usePlanData();
    const { risks: allRisks } = useRiskMapping();

    const skipMonacoSync = useRef(false);
    const codeRef = useRef(code);
    useEffect(() => { codeRef.current = code; }, [code]);

    const applyCode = useCallback((newCode: string) => {
        codeRef.current = newCode;
        setCode(newCode);
        setGraph(mermaidToGraph(newCode));
        if (editorRef.current && editorRef.current.getValue() !== newCode) {
            skipMonacoSync.current = true;
            editorRef.current.setValue(newCode);
        }
    }, []);

    // ── Simple Visual Builder Operations ───────────────────────────────────

    // Update node label directly
    const handleUpdateNodeLabel = (nodeId: string, newLabel: string) => {
        setGraph(prev => {
            const updatedNodes = prev.nodes.map(n => n.id === nodeId ? { ...n, label: newLabel } : n);
            const newG = { ...prev, nodes: updatedNodes };
            applyCode(graphToMermaid(newG, codeRef.current));
            return newG;
        });
    };

    // Update node shape directly
    const handleUpdateNodeShape = (nodeId: string, newShape: NodeShape) => {
        setGraph(prev => {
            const updatedNodes = prev.nodes.map(n => n.id === nodeId ? { ...n, shape: newShape } : n);
            const newG = { ...prev, nodes: updatedNodes };
            applyCode(graphToMermaid(newG, codeRef.current));
            return newG;
        });
    };

    // Add a quick new standalone step
    const handleAddStandaloneStep = (shape: NodeShape = 'rectangle', defaultLabel?: string) => {
        const nextId = genNextId(graph);
        const label = defaultLabel || (shape === 'diamond' ? 'Condition / Critère ?' : shape === 'rounded' ? 'Étape' : 'Nouvelle action');
        const newNode: VisualNode = { id: nextId, label, shape };
        const newG: VisualGraph = { ...graph, nodes: [...graph.nodes, newNode] };
        applyCode(graphToMermaid(newG, codeRef.current));
        toast({ title: `Étape ${nextId} ajoutée` });
    };

    // ➕ 1-Click: Add connected next step from a node
    const handleAddNextStep = (fromNodeId: string, defaultLabel = 'Étape suivante', edgeLabel?: string, shape: NodeShape = 'rectangle') => {
        const nextId = genNextId(graph);
        const newNode: VisualNode = { id: nextId, label: defaultLabel, shape };
        const newEdge: VisualEdge = { from: fromNodeId, to: nextId, label: edgeLabel };
        const newG: VisualGraph = {
            ...graph,
            nodes: [...graph.nodes, newNode],
            edges: [...graph.edges, newEdge]
        };
        applyCode(graphToMermaid(newG, codeRef.current));
        toast({ title: `Étape ${nextId} créée et connectée` });
    };

    // ➕ 1-Click for Decisions: Add both "Oui" and "Non" branches
    const handleAddDecisionBranches = (fromNodeId: string) => {
        const idYes = genNextId(graph);
        const dummyGraph1: VisualGraph = { ...graph, nodes: [...graph.nodes, { id: idYes, label: '', shape: 'rectangle' }] };
        const idNo = genNextId(dummyGraph1);

        const nodeYes: VisualNode = { id: idYes, label: 'Action si OUI / Validé', shape: 'rectangle' };
        const nodeNo: VisualNode = { id: idNo, label: 'Action si NON / Rejeté', shape: 'rectangle' };
        const edgeYes: VisualEdge = { from: fromNodeId, to: idYes, label: 'Oui' };
        const edgeNo: VisualEdge = { from: fromNodeId, to: idNo, label: 'Non' };

        const newG: VisualGraph = {
            ...graph,
            nodes: [...graph.nodes, nodeYes, nodeNo],
            edges: [...graph.edges, edgeYes, edgeNo]
        };
        applyCode(graphToMermaid(newG, codeRef.current));
        toast({ title: `2 branches (Oui & Non) créées pour ${fromNodeId}` });
    };

    // Connect node to existing node
    const handleConnectToExisting = (fromId: string, toId: string, label?: string) => {
        if (!fromId || !toId || fromId === toId) return;
        const exists = graph.edges.some(e => e.from === fromId && e.to === toId);
        if (exists) {
            toast({ title: 'Ce lien existe déjà', variant: 'destructive' });
            return;
        }
        const newEdge: VisualEdge = { from: fromId, to: toId, label: label?.trim() || undefined };
        const newG: VisualGraph = { ...graph, edges: [...graph.edges, newEdge] };
        applyCode(graphToMermaid(newG, codeRef.current));
        setLinkingFromId(null);
        setLinkingTargetId('');
        setLinkingLabel('');
        toast({ title: 'Lien créé' });
    };

    // Remove an edge
    const handleRemoveEdge = (fromId: string, toId: string) => {
        const newEdges = graph.edges.filter(e => !(e.from === fromId && e.to === toId));
        const newG: VisualGraph = { ...graph, edges: newEdges };
        applyCode(graphToMermaid(newG, codeRef.current));
        toast({ title: 'Lien supprimé' });
    };

    // Delete a node and all connected edges
    const handleDeleteNode = (nodeId: string) => {
        const newNodes = graph.nodes.filter(n => n.id !== nodeId);
        const newEdges = graph.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
        const newG: VisualGraph = { ...graph, nodes: newNodes, edges: newEdges };
        applyCode(graphToMermaid(newG, codeRef.current));
        toast({ title: `Étape ${nodeId} supprimée` });
    };

    // Change orientation (TD vs LR)
    const handleToggleDirection = (dir: 'TD' | 'LR') => {
        const newG: VisualGraph = { ...graph, direction: dir };
        applyCode(graphToMermaid(newG, codeRef.current));
        toast({ title: `Orientation : ${dir === 'TD' ? 'Verticale' : 'Horizontale'}` });
    };

    // Apply a pre-made template
    const handleApplyTemplate = (templateCode: string, templateName: string) => {
        applyCode(templateCode);
        toast({ title: `Modèle appliqué : ${templateName}` });
    };

    // ── Tag helpers ────────────────────────────────────────────────────────
    const filteredTagSuggestions = existingTags.filter(
        t => !tags.includes(t) && !WORKFLOW_CATEGORIES.includes(t as WorkflowCategory) && t.toLowerCase().includes(tagInput.toLowerCase().trim())
    );

    const addTag = (tag: string) => {
        const clean = tag.trim();
        if (!clean || tags.includes(clean)) return;
        setTags(prev => [...prev, clean]);
        setTagInput('');
        setShowTagSuggestions(false);
        tagInputRef.current?.focus();
    };

    const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(tagInput);
        } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        } else if (e.key === 'Escape') {
            setShowTagSuggestions(false);
        }
    };

    // ── Monaco initialization ──────────────────────────────────────────────
    const initMonaco = useCallback(() => {
        if (typeof window === 'undefined' || !monacoContainerRef.current || editorRef.current) return;

        const setup = () => {
            if (!monacoContainerRef.current || editorRef.current) return;

            try {
                if (!window.monaco.languages.getLanguages().some((l: any) => l.id === 'mermaid')) {
                    window.monaco.languages.register({ id: 'mermaid' });
                }
            } catch (e) { console.error('Error registering mermaid language', e); }

            editorRef.current = window.monaco.editor.create(monacoContainerRef.current, {
                value: codeRef.current,
                language: 'mermaid',
                theme: 'vs-dark',
                minimap: { enabled: false },
                fontSize: 14,
                automaticLayout: true,
                padding: { top: 10 }
            });

            editorRef.current.onDidChangeModelContent(() => {
                if (skipMonacoSync.current) {
                    skipMonacoSync.current = false;
                    return;
                }
                const newVal = editorRef.current.getValue();
                setCode(newVal);
                setGraph(mermaidToGraph(newVal));
            });
            setIsMonacoReady(true);
        };

        if (window.monaco) {
            setup();
        } else if (window.require) {
            window.require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
            window.require(['vs/editor/editor.main'], () => {
                setup();
            });
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'editor') {
            const timer = setTimeout(initMonaco, 100);
            return () => clearTimeout(timer);
        } else {
            if (editorRef.current) {
                editorRef.current.dispose();
                editorRef.current = null;
                setIsMonacoReady(false);
            }
        }
    }, [activeTab, initMonaco]);

    useEffect(() => {
        return () => {
            if (editorRef.current) {
                editorRef.current.dispose();
                editorRef.current = null;
            }
        };
    }, []);

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
                    if (data.processAssignees) setProcessAssignees(data.processAssignees);
                    if (data.tags) {
                        setTags(data.tags);
                        const foundCat = data.tags.find(t => WORKFLOW_CATEGORIES.includes(t as WorkflowCategory));
                        if (foundCat) setCategory(foundCat as WorkflowCategory);
                    }
                    const vSnap = await getDocs(query(collection(db, 'workflows', id, 'versions'), orderBy('version', 'desc'), limit(1)));
                    if (!vSnap.empty) applyCode((vSnap.docs[0].data() as WorkflowVersion).mermaidCode);
                } else {
                    setName(id === 'eer' ? 'Entrée en Relation' : id === 'gel' ? 'Gel des Avoirs' : 'Processus Métier');
                    applyCode(code);
                }

                // Charger suggestions de tags
                const allSnap = await getDocs(collection(db, 'workflows'));
                const tagSet = new Set<string>();
                allSnap.docs.forEach(d => { const dt = d.data() as MermaidWorkflow; (dt.tags || []).forEach(t => tagSet.add(t)); });
                setExistingTags(Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'fr')));
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        load();
    }, [id]);

    // ── Save / Publish Workflow ────────────────────────────────────────────
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
                processAssignees,
                tags: category
                    ? [category, ...tags.filter(t => !WORKFLOW_CATEGORIES.includes(t as WorkflowCategory))]
                    : tags.length > 0 ? tags : [],
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
        } catch (e) { toast({ title: 'Erreur', variant: 'destructive' }); } finally { setSaving(false); }
    };

    // ── Rename / migrate workflow ID ───────────────────────────────────────
    const handleRenameId = async () => {
        if (!db || !newId.trim() || newId.trim() === id) { setEditingId(false); return; }
        const sanitized = newId.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
        if (!sanitized) { toast({ title: 'ID invalide', variant: 'destructive' }); return; }

        const existing = await getDoc(doc(db, 'workflows', sanitized));
        if (existing.exists()) { toast({ title: 'ID déjà existant', description: 'Choisissez un autre identifiant.', variant: 'destructive' }); return; }

        try {
            setSaving(true);
            const now = new Date().toISOString();
            const currentSnap = await getDoc(doc(db, 'workflows', id));
            const currentData = currentSnap.exists() ? currentSnap.data() : {
                id: sanitized,
                workflowId: sanitized,
                name: name || sanitized,
                domain: domain || 'Conformité',
                currentVersion: activeWorkflow?.currentVersion || 1,
                createdAt: now,
                updatedAt: now,
                tags: category ? [category, ...tags.filter(t => !WORKFLOW_CATEGORIES.includes(t as WorkflowCategory))] : tags,
                processAssignees
            };

            await setDoc(doc(db, 'workflows', sanitized), {
                ...currentData,
                id: sanitized,
                workflowId: sanitized,
                name: name || currentData.name || sanitized,
                updatedAt: now
            });

            const versSnap = await getDocs(collection(db, 'workflows', id, 'versions'));
            if (!versSnap.empty) {
                for (const vDoc of versSnap.docs) {
                    await setDoc(doc(db, 'workflows', sanitized, 'versions', vDoc.id), vDoc.data());
                }
            } else {
                const vId = `v1-${Date.now()}`;
                await setDoc(doc(db, 'workflows', sanitized, 'versions', vId), {
                    id: vId,
                    mermaidCode: code,
                    version: activeWorkflow?.currentVersion || 1,
                    status: 'published',
                    createdAt: now,
                    updatedAt: now
                });
            }

            const delBatch = writeBatch(db);
            if (!versSnap.empty) {
                versSnap.docs.forEach(vDoc => delBatch.delete(doc(db, 'workflows', id, 'versions', vDoc.id)));
            }
            if (currentSnap.exists()) {
                delBatch.delete(doc(db, 'workflows', id));
            }
            await delBatch.commit();

            recordActivity({
                action: 'WORKFLOW_UPDATE',
                label: `Renommage ID Workflow : ${id} → ${sanitized}`,
                detail: `Ancien ID: ${id} • Nouvel ID: ${sanitized} • Nom: ${name || sanitized}`,
                module: 'Processus Métiers'
            });

            toast({ title: '✅ ID modifié avec succès', description: `${id} → ${sanitized}` });
            router.push(`/admin/workflows/${sanitized}/edit`);
        } catch (e) {
            console.error('Erreur rename workflow:', e);
            toast({ title: 'Erreur lors du renommage', description: String(e), variant: 'destructive' });
        } finally { setSaving(false); setEditingId(false); }
    };

    const handlePrint = async () => {
        try {
            toast({ title: "Impression du diagramme", description: `Mise en page optimisée 1 page...` });
            const svgEl = document.querySelector('.mermaid svg');
            const svgHtml = svgEl ? svgEl.outerHTML : undefined;
            await printWorkflow({
                name: name || id,
                workflowId: id,
                domain,
                version: activeWorkflow?.currentVersion || 1,
                code,
                svgHtml,
                planData,
                workflowTasks,
                availableUsers,
                allRisks
            });
        } catch (e) {
            toast({ title: "Erreur d'impression", variant: "destructive" });
        }
    };

    // Filtered nodes for search
    const filteredNodes = useMemo(() => {
        if (!searchQuery.trim()) return graph.nodes;
        const q = searchQuery.toLowerCase();
        return graph.nodes.filter(n => n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q));
    }, [graph.nodes, searchQuery]);

    if (loading) return <div className="p-20 text-center font-bold text-slate-500 animate-pulse">Chargement de l'éditeur...</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-100/50">
            {/* ── Top App Bar ────────────────────────────────────────────── */}
            <div className="border-b bg-white px-6 py-3 flex justify-between items-center shrink-0 z-20 shadow-sm">
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
                            className="h-8 font-extrabold border-none px-0 focus-visible:ring-0 text-xl w-[320px] bg-transparent text-slate-900"
                            placeholder="Nom du workflow..."
                        />
                        {/* Editable ID */}
                        {editingId ? (
                            <div className="flex items-center gap-1 mt-0.5">
                                <input
                                    autoFocus
                                    value={newId}
                                    onChange={e => setNewId(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleRenameId(); if (e.key === 'Escape') setEditingId(false); }}
                                    className="font-mono text-xs text-slate-700 bg-slate-100 border border-slate-300 rounded-md px-2 py-0.5 w-48 outline-none focus:border-indigo-500"
                                    placeholder={id}
                                />
                                <button onClick={handleRenameId} className="text-emerald-600 hover:text-emerald-700 p-1" title="Confirmer">
                                    <LucideIcons.Check className="h-4 w-4" />
                                </button>
                                <button onClick={() => setEditingId(false)} className="text-slate-400 hover:text-slate-600 p-1" title="Annuler">
                                    <LucideIcons.X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[11px] text-slate-400 font-mono">
                                    ID: <span className="font-semibold text-slate-600">{id}</span>
                                    {activeWorkflow?.activeVersionId && (
                                        <span className="text-emerald-600 font-bold ml-2">● V{activeWorkflow.currentVersion} ACTIF</span>
                                    )}
                                </p>
                                <button onClick={() => { setNewId(id); setEditingId(true); }} className="text-slate-300 hover:text-indigo-600 transition-colors p-0.5" title="Modifier l'ID">
                                    <LucideIcons.Pencil className="h-3 w-3" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-xl font-bold border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100">
                        <LucideIcons.Printer className="h-4 w-4 mr-1.5" /> Imprimer (1 page)
                    </Button>
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

            {/* ── Main Split View ────────────────────────────────────────── */}
            <div className="flex-1 flex overflow-hidden">
                {/* ── Left Control Panel (50%) ─────────────────────────────── */}
                <div className="w-[52%] border-r flex flex-col bg-white">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                        <div className="shrink-0 bg-slate-50 border-b px-4 flex items-center justify-between h-12">
                            <TabsList className="bg-slate-200/60 p-0.5 rounded-xl">
                                <TabsTrigger value="builder" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    🛠️ Constructeur Simple
                                </TabsTrigger>
                                <TabsTrigger value="editor" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    💻 Code Mermaid
                                </TabsTrigger>
                                <TabsTrigger value="settings" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    🏷️ Catégorie & Tags
                                </TabsTrigger>
                                <TabsTrigger value="assignments" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    👥 Responsables
                                </TabsTrigger>
                                <TabsTrigger value="audit" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    📜 Audit
                                </TabsTrigger>
                            </TabsList>

                            {activeTab === 'builder' && (
                                <div className="flex items-center gap-1 text-xs">
                                    <span className="text-slate-400 text-[10px] uppercase font-bold mr-1">Sens :</span>
                                    <Button
                                        size="sm"
                                        variant={graph.direction === 'TD' ? 'default' : 'ghost'}
                                        onClick={() => handleToggleDirection('TD')}
                                        className="h-7 px-2 text-[10px] font-bold rounded-md"
                                    >
                                        ⬇ Vertical
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={graph.direction === 'LR' ? 'default' : 'ghost'}
                                        onClick={() => handleToggleDirection('LR')}
                                        className="h-7 px-2 text-[10px] font-bold rounded-md"
                                    >
                                        ➡ Horizontal
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* ══════════════════════════════════════════════════════════
                            TAB 1 : NOUVEAU CONSTRUCTEUR ULTRA-SIMPLE
                        ══════════════════════════════════════════════════════════ */}
                        <TabsContent value="builder" className="flex-1 m-0 overflow-auto bg-slate-50/50 p-4 space-y-4">
                            
                            {/* ── Quick Add Bar ──────────────────────────────── */}
                            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                        <LucideIcons.PlusCircle className="h-3.5 w-3.5 text-indigo-500" />
                                        Ajouter une nouvelle étape au flux :
                                    </span>

                                    {/* Modèles de démarrage */}
                                    <Select onValueChange={(val) => {
                                        const t = WORKFLOW_TEMPLATES.find(t => t.name === val);
                                        if (t) handleApplyTemplate(t.code, t.name);
                                    }}>
                                        <SelectTrigger className="h-7 text-[11px] font-bold bg-slate-50 border-slate-200 rounded-lg w-44">
                                            <SelectValue placeholder="✨ Modèles de flux..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {WORKFLOW_TEMPLATES.map(t => (
                                                <SelectItem key={t.name} value={t.name} className="text-xs font-semibold">
                                                    <span className="mr-1.5">{t.icon}</span> {t.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                    <Button
                                        onClick={() => handleAddStandaloneStep('rectangle')}
                                        className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl h-10 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                        <span className="text-sm">▭</span> + Action
                                    </Button>
                                    <Button
                                        onClick={() => handleAddStandaloneStep('diamond')}
                                        className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-10 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                        <span className="text-sm">◇</span> + Décision
                                    </Button>
                                    <Button
                                        onClick={() => handleAddStandaloneStep('rounded')}
                                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                        <span className="text-sm">◯</span> + Début/Fin
                                    </Button>
                                    <Button
                                        onClick={() => handleAddStandaloneStep('parallelogram')}
                                        className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-10 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                        <span className="text-sm">◸</span> + Document
                                    </Button>
                                </div>
                            </div>

                            {/* ── Search & Counter ──────────────────────────── */}
                            <div className="flex items-center justify-between gap-3 px-1">
                                <div className="relative flex-1">
                                    <LucideIcons.Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                    <Input
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Filtrer les étapes..."
                                        className="h-8 pl-8 text-xs rounded-xl bg-white border-slate-200"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600">
                                            <LucideIcons.X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                                <span className="text-[11px] font-bold text-slate-500 shrink-0 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                                    {graph.nodes.length} étape{graph.nodes.length > 1 ? 's' : ''} • {graph.edges.length} lien{graph.edges.length > 1 ? 's' : ''}
                                </span>
                            </div>

                            {/* ── Interactive Process Step Cards ────────────── */}
                            <div className="space-y-3">
                                {filteredNodes.map((node, index) => {
                                    const shapeCfg = SHAPE_CONFIG[node.shape] || SHAPE_CONFIG.rectangle;
                                    const outgoingEdges = graph.edges.filter(e => e.from === node.id);
                                    const isLinking = linkingFromId === node.id;

                                    return (
                                        <div
                                            key={node.id}
                                            className={cn(
                                                "p-4 rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md space-y-3 relative group",
                                                node.shape === 'diamond' ? 'border-violet-200' : 'border-slate-200'
                                            )}
                                        >
                                            {/* Card Top Row: Step Identifier, Shape Selector & Delete */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border">
                                                        #{index + 1} ({node.id})
                                                    </span>

                                                    {/* Quick Shape Switcher */}
                                                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border">
                                                        {(Object.keys(SHAPE_CONFIG) as NodeShape[]).map(s => {
                                                            const isCur = node.shape === s;
                                                            const cfg = SHAPE_CONFIG[s];
                                                            return (
                                                                <button
                                                                    key={s}
                                                                    onClick={() => handleUpdateNodeShape(node.id, s)}
                                                                    className={cn(
                                                                        "px-2 py-0.5 text-[10px] font-bold rounded-md transition-all flex items-center gap-1",
                                                                        isCur ? "bg-white shadow-sm font-black " + cfg.color : "text-slate-400 hover:text-slate-600"
                                                                    )}
                                                                    title={cfg.label}
                                                                >
                                                                    <span>{cfg.icon}</span>
                                                                    <span className="hidden sm:inline">{cfg.short}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteNode(node.id)}
                                                    className="h-7 w-7 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Supprimer cette étape"
                                                >
                                                    <LucideIcons.Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>

                                            {/* Inline Label Editing */}
                                            <div>
                                                <Label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                                    Texte de l'étape :
                                                </Label>
                                                <Input
                                                    value={node.label}
                                                    onChange={e => handleUpdateNodeLabel(node.id, e.target.value)}
                                                    className="h-10 text-sm font-bold bg-slate-50/70 border-slate-200 focus:bg-white rounded-xl transition-all"
                                                    placeholder="Ex: Analyse du dossier par l'officier..."
                                                />
                                            </div>

                                            {/* ── Outgoing Links Section ────────────────── */}
                                            <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                                                        <LucideIcons.ArrowRight className="h-3 w-3 text-indigo-400" />
                                                        Vers quelle étape suivante ?
                                                    </span>

                                                    {!isLinking && (
                                                        <button
                                                            onClick={() => { setLinkingFromId(node.id); setLinkingTargetId(''); setLinkingLabel(''); }}
                                                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                                                        >
                                                            <LucideIcons.Plus className="h-3 w-3" /> Lier à existant...
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Existing Outgoing Links List */}
                                                {outgoingEdges.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {outgoingEdges.map(edge => {
                                                            const targetNode = graph.nodes.find(n => n.id === edge.to);
                                                            return (
                                                                <span
                                                                    key={edge.to}
                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-indigo-100 shadow-2xs text-slate-700"
                                                                >
                                                                    <LucideIcons.CornerDownRight className="h-3 w-3 text-indigo-500 shrink-0" />
                                                                    <span className="truncate max-w-[140px]">
                                                                        {targetNode ? targetNode.label : edge.to}
                                                                    </span>
                                                                    {edge.label && (
                                                                        <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase border border-indigo-200">
                                                                            {edge.label}
                                                                        </span>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleRemoveEdge(node.id, edge.to)}
                                                                        className="text-slate-300 hover:text-red-500 ml-0.5"
                                                                        title="Supprimer ce lien"
                                                                    >
                                                                        <LucideIcons.X className="h-3 w-3" />
                                                                    </button>
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] text-slate-400 italic">Aucune étape suivante connectée.</p>
                                                )}

                                                {/* Inline Linking Tool (when opened) */}
                                                {isLinking && (
                                                    <div className="p-2.5 bg-white border border-indigo-200 rounded-xl space-y-2 mt-1 shadow-xs">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <Label className="text-[9px] font-black uppercase text-slate-400">Étape Cible *</Label>
                                                                <Select value={linkingTargetId} onValueChange={setLinkingTargetId}>
                                                                    <SelectTrigger className="h-8 text-xs font-bold rounded-lg">
                                                                        <SelectValue placeholder="Choisir..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {graph.nodes.filter(n => n.id !== node.id && !outgoingEdges.some(e => e.to === n.id)).map(n => (
                                                                            <SelectItem key={n.id} value={n.id} className="text-xs font-semibold">
                                                                                {n.id} - {n.label}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div>
                                                                <Label className="text-[9px] font-black uppercase text-slate-400">Condition (Optionnel)</Label>
                                                                <Input
                                                                    placeholder="Ex: Si validé, Oui..."
                                                                    value={linkingLabel}
                                                                    onChange={e => setLinkingLabel(e.target.value)}
                                                                    className="h-8 text-xs rounded-lg"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end gap-1.5 pt-1">
                                                            <Button size="sm" variant="ghost" onClick={() => setLinkingFromId(null)} className="h-7 text-xs rounded-lg">
                                                                Annuler
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                disabled={!linkingTargetId}
                                                                onClick={() => handleConnectToExisting(node.id, linkingTargetId, linkingLabel)}
                                                                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                                                            >
                                                                Confirmer le lien
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ── 1-Click Quick Creation Actions ─────────── */}
                                            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 flex-wrap">
                                                {node.shape === 'diamond' ? (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleAddNextStep(node.id, 'Action si OUI', 'Oui', 'rectangle')}
                                                            className="h-8 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl font-bold gap-1"
                                                        >
                                                            <LucideIcons.Plus className="h-3 w-3" /> Branche "Oui"
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleAddNextStep(node.id, 'Action si NON', 'Non', 'rectangle')}
                                                            className="h-8 text-xs bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl font-bold gap-1"
                                                        >
                                                            <LucideIcons.Plus className="h-3 w-3" /> Branche "Non"
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleAddNextStep(node.id, 'Nouvelle étape', undefined, 'rectangle')}
                                                        className="h-8 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-xl font-bold gap-1 shadow-2xs"
                                                    >
                                                        <LucideIcons.Plus className="h-3.5 w-3.5" /> ➕ Étape suivante
                                                    </Button>
                                                )}

                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleAddNextStep(node.id, 'Question / Décision ?', undefined, 'diamond')}
                                                    className="h-8 text-xs text-violet-600 hover:bg-violet-50 rounded-xl font-semibold gap-1 ml-auto"
                                                >
                                                    <LucideIcons.HelpCircle className="h-3 w-3" /> + Décision
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleAddNextStep(node.id, 'Fin du processus', undefined, 'rounded')}
                                                    className="h-8 text-xs text-blue-600 hover:bg-blue-50 rounded-xl font-semibold gap-1"
                                                >
                                                    <LucideIcons.CheckCircle className="h-3 w-3" /> + Fin
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {filteredNodes.length === 0 && (
                                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed text-slate-400 space-y-3">
                                        <LucideIcons.Workflow className="h-10 w-10 mx-auto opacity-30 text-indigo-500" />
                                        <p className="font-semibold text-sm">Aucune étape trouvée.</p>
                                        <Button
                                            onClick={() => handleAddStandaloneStep('rounded', 'Début du processus')}
                                            className="bg-indigo-600 text-white rounded-xl text-xs font-bold"
                                        >
                                            + Créer la première étape
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        {/* ══════════════════════════════════════════════════════════
                            TAB 2 : ÉDITEUR MONACO (POUR EXPERTS)
                        ══════════════════════════════════════════════════════════ */}
                        <TabsContent value="editor" className="flex-1 m-0 p-0 overflow-hidden bg-[#1e1e1e]">
                            <div className="h-full flex flex-col">
                                <div className="bg-[#252526] px-4 py-2 text-[10px] uppercase font-bold text-emerald-400 border-b border-black flex justify-between">
                                    <span>Monaco Editor (Mermaid Direct)</span>
                                    <span>● Synchronisation Bidirectionnelle</span>
                                </div>
                                <div className="flex-1 min-h-0" ref={monacoContainerRef} />
                            </div>
                        </TabsContent>

                        {/* ══════════════════════════════════════════════════════════
                            TAB 3 : CATÉGORIE OBLIGATOIRE & TAGS
                        ══════════════════════════════════════════════════════════ */}
                        <TabsContent value="settings" className="flex-1 m-0 overflow-auto p-6 space-y-6 bg-slate-50/50">
                            {/* Catégorie obligatoire */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                                <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <LucideIcons.ShieldAlert className="h-4 w-4 text-rose-500" />
                                    Catégorie Réglementaire <span className="text-rose-500 text-xs font-bold normal-case">*</span>
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Chaque processus doit appartenir à <strong>LAB/FT</strong> ou <strong>Veille Réglementaire</strong>.
                                </p>
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

                            {/* Tags supplémentaires */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                                <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <LucideIcons.Tag className="h-4 w-4 text-indigo-500" />
                                    Tags libres ({tags.filter(t => !WORKFLOW_CATEGORIES.includes(t as WorkflowCategory)).length})
                                </h3>

                                <div
                                    className="min-h-[44px] flex flex-wrap gap-1.5 items-center px-3 py-2 rounded-xl border bg-slate-50/50 shadow-inner focus-within:ring-2 focus-within:ring-indigo-300 cursor-text"
                                    onClick={() => tagInputRef.current?.focus()}
                                >
                                    {tags.filter(t => !WORKFLOW_CATEGORIES.includes(t as WorkflowCategory)).map(tag => (
                                        <span key={tag} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getTagColorEditor(tag)}`}>
                                            {tag}
                                            <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(tag); }} className="hover:opacity-70">
                                                <LucideIcons.X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        ref={tagInputRef}
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
                                        onKeyDown={handleTagKeyDown}
                                        onFocus={() => setShowTagSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
                                        placeholder={tags.length <= 1 ? 'Ajouter un tag libre (KYC, DDC...)' : ''}
                                        className="flex-1 min-w-[120px] outline-none bg-transparent text-xs placeholder:text-slate-400"
                                    />
                                </div>

                                {showTagSuggestions && (tagInput.trim() || filteredTagSuggestions.length > 0) && (
                                    <div className="border rounded-xl shadow-lg bg-white py-1 z-10 max-h-36 overflow-y-auto">
                                        {tagInput.trim() && !existingTags.includes(tagInput.trim()) && (
                                            <button type="button" onMouseDown={() => addTag(tagInput)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 font-bold text-indigo-600">
                                                <LucideIcons.Plus className="h-3 w-3" /> Créer "{tagInput.trim()}"
                                            </button>
                                        )}
                                        {filteredTagSuggestions.map(t => (
                                            <button key={t} type="button" onMouseDown={() => addTag(t)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-full font-bold border ${getTagColorEditor(t)}`}>{t}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {existingTags.filter(t => !tags.includes(t) && !WORKFLOW_CATEGORIES.includes(t as WorkflowCategory)).length > 0 && !tagInput && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        <span className="text-[10px] text-slate-400 self-center">Réutiliser :</span>
                                        {existingTags.filter(t => !tags.includes(t) && !WORKFLOW_CATEGORIES.includes(t as WorkflowCategory)).slice(0, 6).map(t => (
                                            <button key={t} type="button" onClick={() => addTag(t)} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border hover:opacity-80 ${getTagColorEditor(t)}`}>+ {t}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        {/* ══════════════════════════════════════════════════════════
                            TAB 4 : RESPONSABLES DU PROCESSUS
                        ══════════════════════════════════════════════════════════ */}
                        <TabsContent value="assignments" className="flex-1 m-0 overflow-auto p-6 space-y-6">
                            <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                                <LucideIcons.Users className="h-20 w-20 absolute -right-4 -bottom-4 opacity-10" />
                                <h3 className="font-black text-lg mb-1">Responsables du Processus</h3>
                                <p className="text-xs text-indigo-100 font-medium">Assignez les garants de l&apos;exécution de ce workflow complet.</p>
                            </div>
                            <div className="space-y-4">
                                {processAssignees.map((a, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-5 bg-white border rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                                        <div className="h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-700 font-black text-lg flex items-center justify-center shrink-0">{a.userName[0]}</div>
                                        <div className="flex-1">
                                            <p className="font-black text-slate-800">{a.userName}</p>
                                            <span className="inline-block mt-1 px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-xl uppercase tracking-widest">{a.role}</span>
                                        </div>
                                        <Button size="icon" variant="ghost" className="h-10 w-10 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl" onClick={() => setProcessAssignees(prev => prev.filter((_, i) => i !== idx))}><LucideIcons.Trash2 className="h-5 w-5" /></Button>
                                    </div>
                                ))}
                                {addingAssignee ? (
                                    <div className="p-6 bg-slate-100 border-2 border-dashed border-indigo-200 rounded-3xl space-y-4">
                                        <div className="grid gap-4">
                                            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-500">Choisir une personne</Label><Select onValueChange={v => { const u = availableUsers.find(u => u.id === v); if (u) setNewAssigneeForm(f => ({ ...f, userId: v, userName: u.name })); }}><SelectTrigger className="rounded-2xl h-11"><SelectValue placeholder="Sélectionner..." /></SelectTrigger><SelectContent>{availableUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
                                            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-500">Rôle (Libre)</Label><Input value={newAssigneeForm.role} onChange={e => setNewAssigneeForm(f => ({ ...f, role: e.target.value }))} className="rounded-2xl h-11" placeholder="Ex: Compliance Officer" /></div>
                                        </div>
                                        <div className="flex gap-2 pt-2"><Button className="flex-1 bg-indigo-600 text-white rounded-2xl h-11 font-black" onClick={() => { if (!newAssigneeForm.userId) return; setProcessAssignees(prev => [...prev, { userId: newAssigneeForm.userId, userName: newAssigneeForm.userName, role: newAssigneeForm.role || 'Responsable' }]); setAddingAssignee(false); setNewAssigneeForm({ userId: '', userName: '', role: '' }); }}>Confirmer</Button><Button variant="outline" className="rounded-2xl h-11" onClick={() => setAddingAssignee(false)}>Annuler</Button></div>
                                    </div>
                                ) : (
                                    <Button onClick={() => setAddingAssignee(true)} className="w-full h-16 rounded-3xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold flex gap-3"><LucideIcons.UserPlus className="h-5 w-5" /> Ajouter un responsable</Button>
                                )}
                            </div>
                        </TabsContent>

                        {/* ══════════════════════════════════════════════════════════
                            TAB 5 : AUDIT LOGS
                        ══════════════════════════════════════════════════════════ */}
                        <TabsContent value="audit" className="flex-1 m-0 p-6 overflow-auto">
                            <h3 className="font-black text-slate-700 uppercase tracking-widest mb-6 border-b pb-2">Historique d&apos;Audit</h3>
                            <div className="space-y-6 pl-4 border-l-2 border-slate-100 relative">
                                {auditLogs.filter(l => l.workflowId === id).map(log => (
                                    <div key={log.id} className="relative pl-6"><div className="absolute -left-[35px] top-1 h-3 w-3 rounded-full border-2 border-white bg-indigo-500 shadow-sm" /><p className="text-[10px] text-slate-400 font-mono mb-1">{new Date(log.timestamp).toLocaleString()}</p><p className="text-sm font-black text-slate-800">{log.action}</p><p className="text-xs text-slate-500 mt-1">{log.details}</p></div>
                                ))}
                                {auditLogs.filter(l => l.workflowId === id).length === 0 && <div className="text-center py-10 text-slate-300 font-medium italic">Aucun log enregistré</div>}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* ── Right Panel: Live Visualizer (48%) ───────────────────── */}
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
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 rounded-xl gap-1.5 font-bold text-xs border-indigo-200 bg-indigo-50 text-indigo-700">
                                <LucideIcons.Printer className="h-3.5 w-3.5" /> Imprimer
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(false)} className="h-9 w-9 rounded-full">
                                <LucideIcons.X className="h-5 w-5" />
                            </Button>
                        </div>
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
