'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { doc, getDoc, setDoc, collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { MermaidWorkflow, WorkflowVersion, WorkflowTask, AuditLog, WorkflowDomain } from '@/types/compliance';
import { usePlanData } from '@/contexts/PlanDataContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

declare global {
    interface Window { require: any; monaco: any; }
}

// ─── Types for visual builder ───────────────────────────────────────────────
type NodeShape = 'rectangle' | 'rounded' | 'diamond' | 'circle' | 'parallelogram';
interface VisualNode { id: string; label: string; shape: NodeShape; }
interface VisualEdge { from: string; to: string; label?: string; }
interface VisualGraph { direction: 'TD' | 'LR' | 'BT' | 'RL'; nodes: VisualNode[]; edges: VisualEdge[]; }

const SHAPE_LABELS: Record<NodeShape, string> = {
    rectangle: '⬜ Rectangle (Action)',
    rounded: '🔵 Arrondi (Début/Fin)',
    diamond: '🔷 Losange (Décision)',
    circle: '🔘 Cercle (Événement)',
    parallelogram: '📐 Parallélogramme (I/O)',
};

const SHAPE_ICONS: Record<NodeShape, React.ReactNode> = {
    rectangle: <span className="text-slate-600 font-bold text-xs px-1.5 py-0.5 border border-slate-300 rounded">▭</span>,
    rounded: <span className="text-blue-600 font-bold text-xs px-1.5 py-0.5 border border-blue-300 rounded-full">◯</span>,
    diamond: <span className="text-violet-600 font-bold text-xs px-1.5 py-0.5 border border-violet-300 rounded">◇</span>,
    circle: <span className="text-emerald-600 font-bold text-xs px-1.5 py-0.5 border border-emerald-300 rounded-full">●</span>,
    parallelogram: <span className="text-amber-600 font-bold text-xs px-1.5 py-0.5 border border-amber-300 rounded">◸</span>,
};

const NODE_COLORS: Record<NodeShape, string> = {
    rectangle: 'bg-slate-50 border-slate-200',
    rounded: 'bg-blue-50 border-blue-200',
    diamond: 'bg-violet-50 border-violet-200',
    circle: 'bg-emerald-50 border-emerald-200',
    parallelogram: 'bg-amber-50 border-amber-200',
};

// Convert VisualGraph → Mermaid code
function graphToMermaid(graph: VisualGraph): string {
    const lines: string[] = [`graph ${graph.direction}`];
    graph.nodes.forEach(n => {
        const sanitized = n.label.replace(/"/g, "'");
        switch (n.shape) {
            case 'rectangle': lines.push(`  ${n.id}["${sanitized}"]`); break;
            case 'rounded': lines.push(`  ${n.id}("${sanitized}")`); break;
            case 'diamond': lines.push(`  ${n.id}{"${sanitized}"}`); break;
            case 'circle': lines.push(`  ${n.id}(("${sanitized}"))`); break;
            case 'parallelogram': lines.push(`  ${n.id}[/"${sanitized}"/]`); break;
        }
    });
    if (graph.nodes.length > 0 && graph.edges.length === 0) {
        // No edges yet — still show isolated nodes
    }
    graph.edges.forEach(e => {
        if (e.label) lines.push(`  ${e.from} -->|"${e.label}"| ${e.to}`);
        else lines.push(`  ${e.from} --> ${e.to}`);
    });
    return lines.join('\n');
}

// Parse existing Mermaid code → VisualGraph (robust multi-pass parser)
function mermaidToGraph(code: string): VisualGraph {
    const dir = code.match(/graph\s+(TD|LR|BT|RL)/)?.[1] as VisualGraph['direction'] || 'TD';
    const nodes: VisualNode[] = [];
    const edges: VisualEdge[] = [];

    const RESERVED = new Set(['graph', 'TD', 'LR', 'BT', 'RL', 'subgraph', 'end', 'classDef', 'class', 'style', 'linkStyle', 'click']);

    // Helper: sanitize a raw label (strip HTML tags, br, backslash-n)
    const cleanLabel = (raw: string) =>
        raw
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/\\n/g, ' ')
            .replace(/<[^>]+>/g, '')
            .replace(/^["']|["']$/g, '')
            .trim();

    // Helper: register a node if not already known
    const addNode = (id: string, label: string, shape: NodeShape) => {
        if (RESERVED.has(id) || nodes.find(n => n.id === id)) return;
        nodes.push({ id, label: cleanLabel(label) || id, shape });
    };

    // ── PASS 1: scan entire code with global regexes for node definitions ────
    // Order matters: circle before rounded (both use parentheses)
    const patterns: { re: RegExp; shape: NodeShape }[] = [
        // Circle: ID(("label"))
        { re: /\b([A-Za-z0-9_\-\.]+)\(\(\s*"((?:[^"\\]|\\.)*)"\s*\)\)/g, shape: 'circle' },
        { re: /\b([A-Za-z0-9_\-\.]+)\(\(\s*([^)]+)\s*\)\)/g, shape: 'circle' },
        // Diamond: ID{"label"}
        { re: /\b([A-Za-z0-9_\-\.]+)\{\s*"((?:[^"\\]|\\.)*)"\s*\}/g, shape: 'diamond' },
        { re: /\b([A-Za-z0-9_\-\.]+)\{\s*([^}]+)\s*\}/g, shape: 'diamond' },
        // Parallelogram: ID[/"label"/]
        { re: /\b([A-Za-z0-9_\-\.]+)\[\/\s*"((?:[^"\\]|\\.)*?)"\s*\/\]/g, shape: 'parallelogram' },
        // Rounded: ID("label")
        { re: /\b([A-Za-z0-9_\-\.]+)\(\s*"((?:[^"\\]|\\.)*)"\s*\)/g, shape: 'rounded' },
        { re: /\b([A-Za-z0-9_\-\.]+)\(\s*([^)]+)\s*\)/g, shape: 'rounded' },
        // Rectangle: ID["label"]
        { re: /\b([A-Za-z0-9_\-\.]+)\[\s*"((?:[^"\\]|\\.)*)"\s*\]/g, shape: 'rectangle' },
        { re: /\b([A-Za-z0-9_\-\.]+)\[\s*([^\]]+)\s*\]/g, shape: 'rectangle' },
    ];

    patterns.forEach(({ re, shape }) => {
        const clone = new RegExp(re.source, re.flags);
        let m: RegExpExecArray | null;
        while ((m = clone.exec(code)) !== null) {
            addNode(m[1], m[2] ?? m[1], shape);
        }
    });

    // ── PASS 2: extract edges ────────────────────────────────────────────────
    // Matches: ID[optional_def] --> [|label|] ID[optional_def]
    // The [optional_def] parts are skipped via a balanced-bracket approximation
    const nodePart = String.raw`([A-Za-z0-9_\-\.]+)(?:\s*(?:\[\/?[^\]]*\]|\{[^}]*\}|\([^)]*\)))?`;
    const edgeRe = new RegExp(
        `${nodePart}\\s*--?>+\\s*(?:\\|([^|\\n]*)\\|)?\\s*${nodePart}`,
        'g'
    );
    let em: RegExpExecArray | null;
    while ((em = edgeRe.exec(code)) !== null) {
        const from = em[1];
        const label = em[2]?.replace(/"/g, '').trim() || undefined;
        const to = em[3];
        if (RESERVED.has(from) || RESERVED.has(to)) continue;
        if (!edges.find(e => e.from === from && e.to === to)) {
            edges.push({ from, to, label });
        }
        // Make sure edge endpoints exist as nodes (fallback if pass 1 missed them)
        addNode(from, from, 'rectangle');
        addNode(to, to, 'rectangle');
    }

    // ── PASS 3: deduplicate edges ────────────────────────────────────────────
    const uniqueEdges = edges.filter((e, i, arr) =>
        arr.findIndex(x => x.from === e.from && x.to === e.to && x.label === e.label) === i
    );

    return { direction: dir, nodes, edges: uniqueEdges };
}


// Generate a unique node ID
function genId(graph: VisualGraph): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let idx = graph.nodes.length;
    let id = '';
    do {
        id = idx < 26 ? letters[idx] : `N${idx}`;
        idx++;
    } while (graph.nodes.find(n => n.id === id));
    return id;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WorkflowEditorPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
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

    // ── Visual builder state ─────────────────────────────────────────────────
    const [graph, setGraph] = useState<VisualGraph>({ direction: 'TD', nodes: [], edges: [] });
    const [builderMode, setBuilderMode] = useState<'code' | 'visual'>('visual');

    // Node form
    const [nodeForm, setNodeForm] = useState<{ id: string; label: string; shape: NodeShape }>({ id: '', label: '', shape: 'rectangle' });
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [nodeDialogOpen, setNodeDialogOpen] = useState(false);

    // Edge form
    const [edgeForm, setEdgeForm] = useState<{ from: string; to: string; label: string }>({ from: '', to: '', label: '' });
    const [edgeDialogOpen, setEdgeDialogOpen] = useState(false);

    const domains: WorkflowDomain[] = ['Conformité', 'Commercial', 'Sinistre', 'Technique'];

    const { workflowTasks, assignTask, auditLogs, availableUsers, availableRoles,
        addAvailableUser, removeAvailableUser, addAvailableRole, removeAvailableRole } = usePlanData();

    // ── Sync graph → code (visual mode) ─────────────────────────────────────
    const syncGraphToCode = useCallback((g: VisualGraph) => {
        const newCode = graphToMermaid(g);
        setCode(newCode);
        if (editorRef.current) editorRef.current.setValue(newCode);
    }, []);

    // ── Sync code → graph (when user edits code directly) ───────────────────
    const syncCodeToGraph = useCallback((c: string) => {
        setGraph(mermaidToGraph(c));
    }, []);

    // ── Monaco init ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (typeof window === 'undefined') return;
        let isMounted = true;
        let timeoutId: NodeJS.Timeout;

        const initMonaco = () => {
            if (!isMounted || editorRef.current) return;
            if (window.require && monacoContainerRef.current) {
                if (monacoContainerRef.current.hasAttribute('data-keybinding-context')) return;
                window.require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
                window.require(['vs/editor/editor.main'], function () {
                    if (!isMounted || !monacoContainerRef.current || editorRef.current) return;
                    try {
                        editorRef.current = window.monaco.editor.create(monacoContainerRef.current, {
                            value: code, language: 'mermaid', theme: 'vs-dark',
                            minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on',
                            scrollBeyondLastLine: false, automaticLayout: true,
                            fontFamily: "'Fira Code', 'Courier New', monospace",
                        });
                        editorRef.current.onDidChangeModelContent(() => {
                            if (isMounted) {
                                const val = editorRef.current.getValue();
                                setCode(val);
                                syncCodeToGraph(val);
                            }
                        });
                        setIsMonacoReady(true);
                    } catch (e) { console.error('Monaco init error:', e); }
                });
            } else { timeoutId = setTimeout(initMonaco, 100); }
        };

        initMonaco();
        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            if (editorRef.current) { editorRef.current.dispose(); editorRef.current = null; }
        };
    }, []);

    useEffect(() => {
        if (editorRef.current && code !== editorRef.current.getValue())
            editorRef.current.setValue(code);
    }, [isMonacoReady]);

    // ── Load from Firestore ─────────────────────────────────────────────────
    useEffect(() => {
        const loadWorkflow = async () => {
            if (!id || !db) return;
            try {
                setLoading(true);
                const workflowRef = doc(db, 'workflows', id);
                const workflowSnap = await getDoc(workflowRef);
                if (workflowSnap.exists()) {
                    const data = workflowSnap.data() as MermaidWorkflow;
                    setActiveWorkflow({ ...data, id: workflowSnap.id });
                    setName(data.name);
                    setDomain(data.domain || 'Conformité');
                    const vRef = collection(db, 'workflows', id, 'versions');
                    const q = query(vRef, orderBy('version', 'desc'), limit(1));
                    const vSnap = await getDocs(q);
                    if (!vSnap.empty) {
                        const vData = vSnap.docs[0].data() as WorkflowVersion;
                        setCode(vData.mermaidCode);
                        setGraph(mermaidToGraph(vData.mermaidCode));
                        if (editorRef.current) editorRef.current.setValue(vData.mermaidCode);
                    }
                } else {
                    setName(id === 'eer' ? 'Entrée en Relation' : id === 'gel' ? 'Gel des Avoirs' : 'Monitoring');
                    setGraph(mermaidToGraph(code));
                }
            } catch (error) { console.error('Error loading workflow:', error); }
            finally { setLoading(false); }
        };
        loadWorkflow();
    }, [id]);

    // ── Save ─────────────────────────────────────────────────────────────────
    const handleSave = async (status: 'draft' | 'published') => {
        if (!id || !db) return;
        setSaving(true);
        try {
            const nextVersion = (activeWorkflow?.currentVersion || 0) + 1;
            const now = new Date().toISOString();
            const versionId = `v${nextVersion}-${Date.now()}`;
            await setDoc(doc(db, 'workflows', id, 'versions', versionId), {
                id: versionId, mermaidCode: code, version: nextVersion,
                status, createdAt: now, updatedAt: now,
            });
            const workflowData: Partial<MermaidWorkflow> = {
                workflowId: id, name, domain, currentVersion: nextVersion, updatedAt: now,
                ...(status === 'published' ? { activeVersionId: versionId } : {}),
            };
            if (!activeWorkflow) workflowData.createdAt = now;
            await setDoc(doc(db, 'workflows', id), workflowData, { merge: true });
            toast({ title: status === 'published' ? '✅ Workflow publié !' : '💾 Brouillon sauvegardé', description: `Version ${nextVersion} enregistrée.` });
            setActiveWorkflow(prev => prev ? { ...prev, ...workflowData } as MermaidWorkflow : { ...workflowData, id } as MermaidWorkflow);
        } catch (error) {
            toast({ title: 'Erreur de sauvegarde', variant: 'destructive' });
        } finally { setSaving(false); }
    };

    // ── Visual builder actions ────────────────────────────────────────────────
    const openAddNode = () => {
        const newId = genId(graph);
        setNodeForm({ id: newId, label: '', shape: 'rectangle' });
        setEditingNodeId(null);
        setNodeDialogOpen(true);
    };

    const openEditNode = (node: VisualNode) => {
        setNodeForm({ id: node.id, label: node.label, shape: node.shape });
        setEditingNodeId(node.id);
        setNodeDialogOpen(true);
    };

    const saveNode = () => {
        if (!nodeForm.label.trim()) {
            toast({ title: 'Le libellé est requis.', variant: 'destructive' }); return;
        }
        setGraph(prev => {
            let updated: VisualGraph;
            if (editingNodeId) {
                updated = {
                    ...prev,
                    nodes: prev.nodes.map(n => n.id === editingNodeId
                        ? { ...n, label: nodeForm.label, shape: nodeForm.shape }
                        : n),
                    edges: prev.edges.map(e => ({
                        ...e,
                        from: e.from === editingNodeId ? nodeForm.id : e.from,
                        to: e.to === editingNodeId ? nodeForm.id : e.to,
                    })),
                };
            } else {
                const newNode: VisualNode = { id: nodeForm.id, label: nodeForm.label, shape: nodeForm.shape };
                updated = { ...prev, nodes: [...prev.nodes, newNode] };
            }
            syncGraphToCode(updated);
            return updated;
        });
        setNodeDialogOpen(false);
        toast({ title: editingNodeId ? '✏️ Nœud modifié' : '➕ Nœud ajouté' });
    };

    const deleteNode = (nodeId: string) => {
        setGraph(prev => {
            const updated: VisualGraph = {
                ...prev,
                nodes: prev.nodes.filter(n => n.id !== nodeId),
                edges: prev.edges.filter(e => e.from !== nodeId && e.to !== nodeId),
            };
            syncGraphToCode(updated);
            return updated;
        });
        toast({ title: '🗑️ Nœud supprimé' });
    };

    const saveEdge = () => {
        if (!edgeForm.from || !edgeForm.to) {
            toast({ title: 'Veuillez sélectionner les deux nœuds.', variant: 'destructive' }); return;
        }
        if (edgeForm.from === edgeForm.to) {
            toast({ title: 'Un nœud ne peut pas se connecter à lui-même.', variant: 'destructive' }); return;
        }
        setGraph(prev => {
            const updated: VisualGraph = {
                ...prev,
                edges: [...prev.edges, { from: edgeForm.from, to: edgeForm.to, label: edgeForm.label || undefined }],
            };
            syncGraphToCode(updated);
            return updated;
        });
        setEdgeDialogOpen(false);
        setEdgeForm({ from: '', to: '', label: '' });
        toast({ title: '🔗 Connexion ajoutée' });
    };

    const deleteEdge = (idx: number) => {
        setGraph(prev => {
            const updated: VisualGraph = { ...prev, edges: prev.edges.filter((_, i) => i !== idx) };
            syncGraphToCode(updated);
            return updated;
        });
    };

    const changeDirection = (dir: VisualGraph['direction']) => {
        setGraph(prev => {
            const updated = { ...prev, direction: dir };
            syncGraphToCode(updated);
            return updated;
        });
    };

    const getTaskForNode = (nodeId: string) =>
        workflowTasks.find(t => t.workflowId === id && t.nodeId === nodeId);

    const handleAssign = (nodeId: string, nodeLabel: string, userId: string, userName: string, role: string) => {
        assignTask({ workflowId: id, nodeId, taskName: nodeLabel, responsibleUserId: userId, responsibleUserName: userName, roleRequired: role, status: 'En attente' });
        toast({ title: '✅ Tâche assignée', description: `${nodeLabel} → ${userName}` });
    };

    if (loading) return <div className="p-20 text-center font-bold text-slate-500 animate-pulse">Chargement de l'éditeur...</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
            {/* ── Toolbar ── */}
            <div className="border-b bg-white/80 backdrop-blur-md dark:bg-slate-900/80 px-6 py-3 flex justify-between items-center shrink-0 shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <Link href="/admin/workflows">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                            <LucideIcons.ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <Input value={name} onChange={e => setName(e.target.value)}
                                className="h-7 font-bold border-none px-0 focus-visible:ring-0 text-xl w-[280px] bg-transparent"
                                placeholder="Nom du workflow" />
                            {activeWorkflow?.activeVersionId && (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold px-2 py-0">
                                    PUBLIÉ V{activeWorkflow.currentVersion}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-slate-400 font-mono">ID: {id}</p>
                            <span className="text-slate-200">|</span>
                            <Select value={domain} onValueChange={v => setDomain(v as WorkflowDomain)}>
                                <SelectTrigger className="h-5 w-[120px] text-[10px] border-none bg-transparent shadow-none px-1 focus:ring-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {domains.map(d => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/plan#processus-metiers">
                        <Button variant="outline" size="sm" className="rounded-xl gap-2 h-9 text-slate-600 font-semibold">
                            <LucideIcons.ExternalLink className="h-4 w-4" /> Voir Plan
                        </Button>
                    </Link>
                    <Button variant="outline" size="sm" onClick={() => handleSave('draft')} disabled={saving}
                        className="rounded-xl gap-2 h-9 text-slate-600 font-semibold">
                        {saving ? <LucideIcons.Loader2 className="h-4 w-4 animate-spin" /> : <LucideIcons.Save className="h-4 w-4" />}
                        Brouillon
                    </Button>
                    <Button size="sm" onClick={() => handleSave('published')} disabled={saving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg gap-2 h-9 px-5 font-bold">
                        {saving ? <LucideIcons.Loader2 className="h-4 w-4 animate-spin" /> : <LucideIcons.CloudUpload className="h-4 w-4" />}
                        Publier
                    </Button>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 flex overflow-hidden">
                {/* ── Left Panel ── */}
                <div className="w-[55%] border-r flex flex-col bg-white">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                        <div className="shrink-0 bg-slate-50 border-b px-4 flex items-center h-12 gap-2">
                            <TabsList className="bg-slate-200/70">
                                <TabsTrigger value="builder" className="gap-1.5 text-xs">
                                    <LucideIcons.Shapes className="h-3.5 w-3.5" /> Constructeur
                                </TabsTrigger>
                                <TabsTrigger value="editor" className="gap-1.5 text-xs">
                                    <LucideIcons.Code2 className="h-3.5 w-3.5" /> Code Mermaid
                                </TabsTrigger>
                                <TabsTrigger value="assignments" className="gap-1.5 text-xs">
                                    <LucideIcons.Users className="h-3.5 w-3.5" /> Assignations
                                </TabsTrigger>
                                <TabsTrigger value="audit" className="gap-1.5 text-xs">
                                    <LucideIcons.ListChecks className="h-3.5 w-3.5" /> Historique
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* ══ VISUAL BUILDER TAB ══ */}
                        <TabsContent value="builder" className="flex-1 m-0 overflow-auto bg-slate-50/50">
                            <div className="p-5 space-y-5">
                                {/* Direction */}
                                <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">
                                    <LucideIcons.GitBranch className="h-4 w-4 text-slate-400 shrink-0" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Direction</span>
                                    <div className="flex gap-1 ml-auto">
                                        {(['TD', 'LR', 'BT', 'RL'] as const).map(d => (
                                            <Button key={d} size="sm" variant={graph.direction === d ? 'default' : 'outline'}
                                                onClick={() => changeDirection(d)}
                                                className={cn("h-7 px-3 text-xs rounded-lg font-mono font-bold transition-all",
                                                    graph.direction === d ? "bg-indigo-600 text-white shadow-md" : "text-slate-500")}>
                                                {d}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                {/* Nodes section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-5 w-5 rounded-md bg-indigo-100 flex items-center justify-center">
                                                <LucideIcons.Box className="h-3 w-3 text-indigo-600" />
                                            </div>
                                            <h3 className="font-black text-sm text-slate-700 uppercase tracking-wide">
                                                Nœuds <span className="text-slate-400 font-normal normal-case">({graph.nodes.length})</span>
                                            </h3>
                                        </div>
                                        <Button size="sm" onClick={openAddNode}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-1.5 h-8 px-3 text-xs font-bold shadow-md">
                                            <LucideIcons.Plus className="h-3.5 w-3.5" /> Ajouter un nœud
                                        </Button>
                                    </div>

                                    {graph.nodes.length === 0 ? (
                                        <button onClick={openAddNode}
                                            className="w-full p-8 border-2 border-dashed border-indigo-200 rounded-2xl flex flex-col items-center gap-3 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all group">
                                            <div className="h-12 w-12 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center transition-all">
                                                <LucideIcons.PlusCircle className="h-6 w-6 text-indigo-400" />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-semibold text-sm">Aucun nœud pour l'instant</p>
                                                <p className="text-xs mt-1">Cliquez ici pour ajouter votre premier nœud</p>
                                            </div>
                                        </button>
                                    ) : (
                                        <div className="grid gap-2">
                                            {graph.nodes.map((node, i) => (
                                                <div key={node.id}
                                                    className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm group", NODE_COLORS[node.shape])}>
                                                    <div className="h-8 w-8 rounded-lg bg-white/70 border border-white flex items-center justify-center shrink-0 shadow-sm">
                                                        {SHAPE_ICONS[node.shape]}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-slate-700 truncate">{node.label}</p>
                                                        <p className="text-[10px] font-mono text-slate-400">{node.id} · {SHAPE_LABELS[node.shape].split(' ').slice(1).join(' ')}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button size="icon" variant="ghost"
                                                            className="h-7 w-7 rounded-lg hover:bg-white/80 text-slate-500"
                                                            onClick={() => openEditNode(node)}>
                                                            <LucideIcons.Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost"
                                                            className="h-7 w-7 rounded-lg hover:bg-red-50 text-red-400"
                                                            onClick={() => deleteNode(node.id)}>
                                                            <LucideIcons.Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Connections section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-5 w-5 rounded-md bg-violet-100 flex items-center justify-center">
                                                <LucideIcons.ArrowRight className="h-3 w-3 text-violet-600" />
                                            </div>
                                            <h3 className="font-black text-sm text-slate-700 uppercase tracking-wide">
                                                Connexions <span className="text-slate-400 font-normal normal-case">({graph.edges.length})</span>
                                            </h3>
                                        </div>
                                        {graph.nodes.length >= 2 && (
                                            <Button size="sm" onClick={() => setEdgeDialogOpen(true)}
                                                className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl gap-1.5 h-8 px-3 text-xs font-bold shadow-md">
                                                <LucideIcons.Link className="h-3.5 w-3.5" /> Connecter
                                            </Button>
                                        )}
                                    </div>

                                    {graph.edges.length === 0 ? (
                                        <div className="p-5 border border-dashed border-violet-200 rounded-2xl text-center text-slate-400 bg-violet-50/30">
                                            <LucideIcons.Unlink className="h-6 w-6 mx-auto mb-2 text-violet-300" />
                                            <p className="text-xs">Ajoutez des nœuds, puis connectez-les.</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-2">
                                            {graph.edges.map((edge, idx) => {
                                                const fromNode = graph.nodes.find(n => n.id === edge.from);
                                                const toNode = graph.nodes.find(n => n.id === edge.to);
                                                return (
                                                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl border border-violet-100 bg-violet-50/50 group hover:shadow-sm transition-all">
                                                        <div className="flex-1 flex items-center gap-1.5 text-xs overflow-hidden">
                                                            <span className="font-bold text-slate-600 truncate max-w-[100px]">{fromNode?.label || edge.from}</span>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <div className="h-px w-3 bg-violet-300" />
                                                                {edge.label && (
                                                                    <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-bold border border-violet-200">
                                                                        {edge.label}
                                                                    </span>
                                                                )}
                                                                <LucideIcons.ArrowRight className="h-3 w-3 text-violet-400" />
                                                            </div>
                                                            <span className="font-bold text-slate-600 truncate max-w-[100px]">{toNode?.label || edge.to}</span>
                                                        </div>
                                                        <Button size="icon" variant="ghost"
                                                            className="h-6 w-6 rounded-lg hover:bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                                            onClick={() => deleteEdge(idx)}>
                                                            <LucideIcons.X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        {/* ══ CODE EDITOR TAB ══ */}
                        <TabsContent value="editor" className="flex-1 m-0 p-0 overflow-hidden bg-[#1e1e1e]">
                            <div className="h-full flex flex-col">
                                <div className="bg-[#252526] px-4 py-2 text-[10px] uppercase font-bold tracking-widest text-slate-400 flex justify-between border-b border-black">
                                    <span>Éditeur Mermaid</span>
                                    <span className="text-emerald-400">● Auto-sync avec le constructeur</span>
                                </div>
                                <div className="flex-1 min-h-0" ref={monacoContainerRef} />
                            </div>
                        </TabsContent>

                        {/* ══ ASSIGNMENTS TAB ══ */}
                        <TabsContent value="assignments" className="flex-1 m-0 p-5 overflow-auto">
                            <div className="space-y-5">
                                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border">
                                    <div>
                                        <h3 className="font-bold text-slate-700">Attribution des Responsabilités</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Définissez qui est responsable de chaque étape.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs">
                                                    <LucideIcons.UserPlus className="h-3.5 w-3.5" /> Responsables
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-sm">
                                                <DialogHeader>
                                                    <DialogTitle>Gestion des Responsables</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-3 py-3">
                                                    <div className="flex gap-2">
                                                        <Input id="new-user-name" placeholder="Nom du responsable..." className="flex-1" />
                                                        <Button size="sm" onClick={() => {
                                                            const input = document.getElementById('new-user-name') as HTMLInputElement;
                                                            if (input.value) { addAvailableUser({ name: input.value, role: 'Standard' }); input.value = ''; }
                                                        }}>Ajouter</Button>
                                                    </div>
                                                    <div className="space-y-1.5 max-h-[200px] overflow-auto">
                                                        {availableUsers.map(u => (
                                                            <div key={u.id} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border">
                                                                <span className="text-sm font-medium">{u.name}</span>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeAvailableUser(u.id)}>
                                                                    <LucideIcons.Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                        {availableUsers.length === 0 && <p className="text-xs text-center text-slate-400 py-4 italic">Aucun responsable</p>}
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs">
                                                    <LucideIcons.ShieldCheck className="h-3.5 w-3.5" /> Rôles
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-sm">
                                                <DialogHeader>
                                                    <DialogTitle>Gestion des Rôles</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-3 py-3">
                                                    <div className="flex gap-2">
                                                        <Input id="new-role-name" placeholder="Nom du rôle..." className="flex-1" />
                                                        <Button size="sm" onClick={() => {
                                                            const input = document.getElementById('new-role-name') as HTMLInputElement;
                                                            if (input.value) { addAvailableRole({ name: input.value }); input.value = ''; }
                                                        }}>Ajouter</Button>
                                                    </div>
                                                    <div className="space-y-1.5 max-h-[200px] overflow-auto">
                                                        {availableRoles.map(r => (
                                                            <div key={r.id} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border">
                                                                <span className="text-sm font-medium">{r.name}</span>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeAvailableRole(r.id)}>
                                                                    <LucideIcons.Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                        {availableRoles.length === 0 && <p className="text-xs text-center text-slate-400 py-4 italic">Aucun rôle</p>}
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>

                                <div className="grid gap-3">
                                    {graph.nodes.map(node => {
                                        const task = getTaskForNode(node.id);
                                        return (
                                            <Card key={node.id} className="border-slate-100 shadow-sm overflow-hidden rounded-2xl">
                                                <CardContent className="p-0">
                                                    <div className="p-3 bg-slate-50 border-b flex justify-between items-center">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-[10px] text-slate-400">{node.id}</span>
                                                                <span className="font-bold text-sm text-slate-700">{node.label}</span>
                                                            </div>
                                                            <Badge variant="outline" className={cn("text-[10px] mt-1 h-4 rounded-md px-1.5", task ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "text-slate-400")}>
                                                                {task ? task.status : 'Non assigné'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div className="p-4 grid grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Responsable</Label>
                                                            <Select defaultValue={task?.responsibleUserId}
                                                                onValueChange={val => {
                                                                    const user = availableUsers.find(u => u.id === val);
                                                                    handleAssign(node.id, node.label, val, user?.name || '', task?.roleRequired || '');
                                                                }}>
                                                                <SelectTrigger className="rounded-xl h-9 text-sm">
                                                                    <SelectValue placeholder="Sélectionner..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {availableUsers.map(u => (
                                                                        <SelectItem key={u.id} value={u.id}>
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold flex items-center justify-center">{u.name[0]}</div>
                                                                                {u.name}
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                    {availableUsers.length === 0 && <div className="text-xs text-slate-400 text-center p-2">Aucun responsable</div>}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rôle Requis</Label>
                                                            <Select defaultValue={task?.roleRequired}
                                                                onValueChange={val => {
                                                                    if (task) handleAssign(node.id, node.label, task.responsibleUserId, task.responsibleUserName || '', val);
                                                                    else toast({
                                                                        title: `Sélectionnez d'abord un responsable.`
                                                                    });
                                                                }}>
                                                                <SelectTrigger className="rounded-xl h-9 text-sm">
                                                                    <SelectValue placeholder="Rôle..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {availableRoles.map(r => (
                                                                        <SelectItem key={r.id} value={r.name}>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <LucideIcons.Shield className="h-3.5 w-3.5 text-slate-400" /> {r.name}
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                    {availableRoles.length === 0 && (
                                                                        <>
                                                                            <SelectItem value="Compliance Officer">Compliance Officer</SelectItem>
                                                                            <SelectItem value="Manager">Manager</SelectItem>
                                                                        </>
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                    {graph.nodes.length === 0 && (
                                        <div className="p-10 text-center border-2 border-dashed rounded-2xl text-slate-400">
                                            <LucideIcons.AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                            <p className="text-sm">Aucun nœud dans le workflow.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        {/* ══ AUDIT TAB ══ */}
                        <TabsContent value="audit" className="flex-1 m-0 p-5 overflow-auto">
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-700">Historique d'Audit</h3>
                                <div className="relative space-y-3">
                                    <div className="absolute left-4 top-2 bottom-0 w-px bg-slate-100" />
                                    {auditLogs.filter(l => l.workflowId === id).map(log => (
                                        <div key={log.id} className="relative pl-10">
                                            <div className="absolute left-[13px] top-1.5 h-2.5 w-2.5 rounded-full bg-white border-2 border-slate-300" />
                                            <p className="text-[10px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString('fr-FR')}</p>
                                            <p className="text-sm font-semibold text-slate-700">{log.action}</p>
                                            <p className="text-xs text-slate-500">{log.details}</p>
                                        </div>
                                    ))}
                                    {auditLogs.filter(l => l.workflowId === id).length === 0 && (
                                        <p className="text-center text-slate-400 py-10 text-sm italic">Aucun log enregistré.</p>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* ── Preview Pane ── */}
                <div className="flex-1 flex flex-col bg-slate-50">
                    <div className="bg-white px-4 py-2 text-[10px] uppercase font-bold tracking-widest text-slate-500 border-b flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <LucideIcons.Eye className="h-3 w-3" />
                            <span>Aperçu en direct</span>
                        </div>
                        <Badge variant="outline" className="text-[9px] px-1.5 h-4 border-emerald-200 text-emerald-600">● Live</Badge>
                    </div>
                    <div className="flex-1 overflow-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
                        <div className="p-8 min-h-full flex items-center justify-center">
                            <div className="w-full max-w-2xl bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-slate-200">
                                <MermaidRenderer chart={code} workflowId={id} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══ NODE DIALOG ══ */}
            <Dialog open={nodeDialogOpen} onOpenChange={setNodeDialogOpen}>
                <DialogContent className="max-w-md rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black">
                            {editingNodeId ? '✏️ Modifier le nœud' : '➕ Nouveau nœud'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingNodeId ? 'Modifiez les propriétés du nœud sélectionné.' : 'Définissez un nouveau nœud dans votre diagramme.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Libellé du nœud *</Label>
                            <Input
                                placeholder="Ex: Vérification d'identité..."
                                value={nodeForm.label}
                                onChange={e => setNodeForm(f => ({ ...f, label: e.target.value }))}
                                className="rounded-xl h-10"
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') saveNode(); }}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Forme / Type</Label>
                            <div className="grid grid-cols-1 gap-2">
                                {(Object.keys(SHAPE_LABELS) as NodeShape[]).map(shape => (
                                    <button key={shape}
                                        onClick={() => setNodeForm(f => ({ ...f, shape }))}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                                            nodeForm.shape === shape
                                                ? "border-indigo-500 bg-indigo-50 shadow-md"
                                                : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                                        )}>
                                        <div className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm shrink-0">
                                            {SHAPE_ICONS[shape]}
                                        </div>
                                        <span className={cn("text-sm font-semibold", nodeForm.shape === shape ? "text-indigo-700" : "text-slate-600")}>
                                            {SHAPE_LABELS[shape]}
                                        </span>
                                        {nodeForm.shape === shape && <LucideIcons.CheckCircle2 className="h-4 w-4 text-indigo-500 ml-auto" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {!editingNodeId && (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ID du nœud (auto-généré)</Label>
                                <Input value={nodeForm.id} onChange={e => setNodeForm(f => ({ ...f, id: e.target.value }))}
                                    className="rounded-xl h-9 font-mono text-sm bg-slate-50 text-slate-500" />
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="outline" className="rounded-xl">Annuler</Button>
                        </DialogClose>
                        <Button onClick={saveNode} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2 px-5 font-bold">
                            <LucideIcons.Check className="h-4 w-4" />
                            {editingNodeId ? 'Modifier' : 'Ajouter'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ══ EDGE DIALOG ══ */}
            <Dialog open={edgeDialogOpen} onOpenChange={setEdgeDialogOpen}>
                <DialogContent className="max-w-sm rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black">🔗 Nouvelle Connexion</DialogTitle>
                        <DialogDescription>Reliez deux nœuds avec une flèche directionnelle.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nœud de départ</Label>
                            <Select value={edgeForm.from} onValueChange={v => setEdgeForm(f => ({ ...f, from: v }))}>
                                <SelectTrigger className="rounded-xl h-10">
                                    <SelectValue placeholder="Sélectionner le nœud source..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {graph.nodes.map(n => (
                                        <SelectItem key={n.id} value={n.id}>
                                            <div className="flex items-center gap-2">
                                                {SHAPE_ICONS[n.shape]}
                                                <span>{n.label}</span>
                                                <span className="font-mono text-[10px] text-slate-400">({n.id})</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-slate-200" />
                            <LucideIcons.ArrowDown className="h-4 w-4 text-slate-400 shrink-0" />
                            <div className="flex-1 h-px bg-slate-200" />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nœud de destination</Label>
                            <Select value={edgeForm.to} onValueChange={v => setEdgeForm(f => ({ ...f, to: v }))}>
                                <SelectTrigger className="rounded-xl h-10">
                                    <SelectValue placeholder="Sélectionner le nœud cible..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {graph.nodes.filter(n => n.id !== edgeForm.from).map(n => (
                                        <SelectItem key={n.id} value={n.id}>
                                            <div className="flex items-center gap-2">
                                                {SHAPE_ICONS[n.shape]}
                                                <span>{n.label}</span>
                                                <span className="font-mono text-[10px] text-slate-400">({n.id})</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Libellé de la flèche (optionnel)</Label>
                            <Input placeholder="Ex: Oui, Non, Approuvé..."
                                value={edgeForm.label}
                                onChange={e => setEdgeForm(f => ({ ...f, label: e.target.value }))}
                                className="rounded-xl h-9"
                                onKeyDown={e => { if (e.key === 'Enter') saveEdge(); }}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="outline" className="rounded-xl">Annuler</Button>
                        </DialogClose>
                        <Button onClick={saveEdge} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl gap-2 px-5 font-bold">
                            <LucideIcons.Link className="h-4 w-4" /> Connecter
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
