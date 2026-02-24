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

// Parse existing Mermaid code → VisualGraph
function mermaidToGraph(code: string): VisualGraph {
    const dir = code.match(/(?:graph|flowchart)\s+(TD|LR|BT|RL)/)?.[1] as VisualGraph['direction'] || 'TD';
    const nodes: VisualNode[] = [];
    const edges: VisualEdge[] = [];

    const RESERVED = new Set(['graph', 'TD', 'LR', 'BT', 'RL', 'subgraph', 'end', 'classDef', 'class', 'style', 'linkStyle', 'click']);

    const cleanLabel = (raw: string) =>
        raw.replace(/<br\s*\/?>/gi, ' ').replace(/\\n/g, ' ').replace(/<[^>]+>/g, '').replace(/^["']|["']$/g, '').trim();

    const addNode = (id: string, label: string, shape: NodeShape) => {
        if (RESERVED.has(id) || nodes.find(n => n.id === id)) return;
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

function genId(graph: VisualGraph): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let idx = graph.nodes.length;
    let id = '';
    do { id = idx < 26 ? letters[idx] : `N${idx}`; idx++; } while (graph.nodes.find(n => n.id === id));
    return id;
}

export default function WorkflowEditorPage() {
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
    const [nodeForm, setNodeForm] = useState<{ id: string; label: string; shape: NodeShape }>({ id: '', label: '', shape: 'rectangle' });
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [nodeDialogOpen, setNodeDialogOpen] = useState(false);
    const [edgeForm, setEdgeForm] = useState<{ from: string; to: string; label: string }>({ from: '', to: '', label: '' });
    const [edgeDialogOpen, setEdgeDialogOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [processAssignees, setProcessAssignees] = useState<{ userId: string; userName: string; role: string }[]>([]);
    const [addingAssignee, setAddingAssignee] = useState(false);
    const [newAssigneeForm, setNewAssigneeForm] = useState<{ userId: string; userName: string; role: string }>({ userId: '', userName: '', role: '' });

    const { auditLogs, availableUsers, availableRoles, addAvailableUser, removeAvailableUser, addAvailableRole, removeAvailableRole } = usePlanData();

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

    const surgicalEditNode = (src: string, nodeId: string, label: string, shape: NodeShape): string => {
        const escId = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const s = label.replace(/"/g, "'");
        const def = shape === 'rounded' ? `${nodeId}("${s}")` : shape === 'diamond' ? `${nodeId}{"${s}"}` : shape === 'circle' ? `${nodeId}(("${s}"))` : shape === 'parallelogram' ? `${nodeId}[/"${s}"/]` : `${nodeId}["${s}"]`;
        const re = new RegExp(`\\b${escId}(:::?\\w+)?\\s*(?:\\(\\([^)]*\\)\\)|\\{[^}]*\\}|\\[\\/[^\\]]*\\/\\]|\\([^)]+\\)|\\[[^\\]]+\\])`, 'g');
        return src.replace(re, (_, cls) => def + (cls || ''));
    };

    const surgicalDeleteNode = (src: string, nodeId: string): string => {
        const escId = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return src.split('\n').filter(line => {
            const t = line.trim();
            if (new RegExp(`^${escId}(?::{2,3}\\w+)?\\s*[\\[({]`).test(t)) return false;
            if (new RegExp(`(?:^|-->\\s*(?:\\|[^|]*\\|)?\\s*)${escId}(?:[\\s\\[({\\n]|$)`).test(t) || new RegExp(`^${escId}(?:[\\s\\[({]|$).*-->`).test(t)) return false;
            return true;
        }).join('\n');
    };

    const surgicalAddNode = (src: string, id: string, label: string, shape: NodeShape): string => {
        const s = label.replace(/"/g, "'");
        const def = shape === 'rounded' ? `${id}("${s}")` : shape === 'diamond' ? `${id}{"${s}"}` : shape === 'circle' ? `${id}(("${s}"))` : shape === 'parallelogram' ? `${id}[/"${s}"/]` : `${id}["${s}"]`;
        const classIdx = src.search(/\n[ \t]*(classDef|class |style |linkStyle )/);
        return classIdx > -1 ? src.slice(0, classIdx) + `\n  ${def}` + src.slice(classIdx) : src + `\n  ${def}`;
    };

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
            // Dispose of editor when switching away from editor tab
            // to allow re-initialization on a new DOM container
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
                    const vSnap = await getDocs(query(collection(db, 'workflows', id, 'versions'), orderBy('version', 'desc'), limit(1)));
                    if (!vSnap.empty) applyCode((vSnap.docs[0].data() as WorkflowVersion).mermaidCode);
                } else {
                    setName(id === 'eer' ? 'Entrée en Relation' : id === 'gel' ? 'Gel des Avoirs' : 'Monitoring');
                    setGraph(mermaidToGraph(code));
                }
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        load();
    }, [id]);

    const handleSave = async (status: 'draft' | 'published') => {
        if (!id || !db) return;
        setSaving(true);
        try {
            const nextV = (activeWorkflow?.currentVersion || 0) + 1;
            const now = new Date().toISOString();
            const vId = `v${nextV}-${Date.now()}`;
            await setDoc(doc(db, 'workflows', id, 'versions', vId), { id: vId, mermaidCode: code, version: nextV, status, createdAt: now, updatedAt: now });
            const data: Partial<MermaidWorkflow> = { workflowId: id, name, domain, currentVersion: nextV, updatedAt: now, processAssignees, ...(status === 'published' ? { activeVersionId: vId } : {}) };
            if (!activeWorkflow) data.createdAt = now;
            await setDoc(doc(db, 'workflows', id), data, { merge: true });
            toast({ title: status === 'published' ? '✅ Workflow publié !' : '💾 Sauvegardé' });
            setActiveWorkflow(prev => prev ? { ...prev, ...data } as MermaidWorkflow : { ...data, id } as MermaidWorkflow);
        } catch (e) { toast({ title: 'Erreur', variant: 'destructive' }); } finally { setSaving(false); }
    };

    if (loading) return <div className="p-20 text-center font-bold text-slate-500 animate-pulse">Chargement...</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
            <div className="border-b bg-white px-6 py-3 flex justify-between items-center shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <Link href="/admin/workflows"><Button variant="ghost" size="icon" className="rounded-full"><LucideIcons.ArrowLeft className="h-5 w-5" /></Button></Link>
                    <div>
                        <Input value={name} onChange={e => setName(e.target.value)} className="h-7 font-bold border-none px-0 focus-visible:ring-0 text-xl w-[280px] bg-transparent" />
                        <p className="text-[10px] text-slate-400 font-mono">ID: {id} {activeWorkflow?.activeVersionId && <span className="text-emerald-500 ml-2">● PUBLIÉ V{activeWorkflow.currentVersion}</span>}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleSave('draft')} disabled={saving} className="rounded-xl">{saving ? <LucideIcons.Loader2 className="animate-spin h-4 w-4" /> : <LucideIcons.Save className="h-4 w-4 mr-2" />} Brouillon</Button>
                    <Button size="sm" onClick={() => handleSave('published')} disabled={saving} className="bg-indigo-600 text-white rounded-xl shadow-lg">{saving ? <LucideIcons.Loader2 className="animate-spin h-4 w-4" /> : <LucideIcons.CloudUpload className="h-4 w-4 mr-2" />} Publier</Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-[50%] border-r flex flex-col bg-white">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                        <div className="shrink-0 bg-slate-50 border-b px-4 flex items-center h-12">
                            <TabsList className="bg-slate-200/50"><TabsTrigger value="builder" className="text-xs">Constructeur</TabsTrigger><TabsTrigger value="editor" className="text-xs">Monaco Editor</TabsTrigger><TabsTrigger value="assignments" className="text-xs">Responsables</TabsTrigger><TabsTrigger value="audit" className="text-xs">Audit</TabsTrigger></TabsList>
                        </div>

                        <TabsContent value="builder" className="flex-1 m-0 overflow-auto bg-slate-50/50 p-6 space-y-6">
                            <div className="flex items-center gap-3 bg-white rounded-2xl border p-4 shadow-sm">
                                <LucideIcons.Move className="h-4 w-4 text-indigo-500" />
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Orientation :</span>
                                <div className="flex gap-2 ml-auto">
                                    {(['TD', 'LR', 'BT', 'RL'] as const).map(d => (
                                        <Button
                                            key={d}
                                            size="sm"
                                            variant={graph.direction === d ? 'default' : 'outline'}
                                            onClick={() => {
                                                const currentCode = codeRef.current;
                                                // Support global replace for direction to ensure it works every time
                                                const re = /^(graph|flowchart)\s+(TD|LR|BT|RL)/im;
                                                let newCode;
                                                if (re.test(currentCode)) {
                                                    newCode = currentCode.replace(re, `$1 ${d}`);
                                                } else {
                                                    const baseRe = /^(graph|flowchart)/im;
                                                    if (baseRe.test(currentCode)) {
                                                        newCode = currentCode.replace(baseRe, `$1 ${d}`);
                                                    } else {
                                                        newCode = `graph ${d}\n${currentCode}`;
                                                    }
                                                }
                                                applyCode(newCode);
                                            }}
                                            className={cn("h-8 w-10 font-mono font-black", graph.direction === d && "bg-indigo-600 shadow-md transform scale-110")}
                                        >
                                            {d}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between"><h3 className="font-black text-sm text-slate-700 uppercase tracking-widest">Nœuds du Flux ({graph.nodes.length})</h3><Button size="sm" onClick={() => { setNodeForm({ id: genId(graph), label: '', shape: 'rectangle' }); setEditingNodeId(null); setNodeDialogOpen(true); }} className="bg-indigo-600 text-white rounded-xl px-4 font-bold shadow-md"><LucideIcons.Plus className="h-4 w-4 mr-2" /> Ajouter</Button></div>
                                <div className="grid gap-3">
                                    {graph.nodes.map(node => (
                                        <div key={node.id} className={cn("flex items-center gap-4 p-4 rounded-2xl border transition-all hover:shadow-md group relative overflow-hidden", NODE_COLORS[node.shape])}>
                                            <div className="h-10 w-10 rounded-xl bg-white/80 border flex items-center justify-center shrink-0 shadow-sm">{SHAPE_ICONS[node.shape]}</div>
                                            <div className="flex-1 min-w-0"><p className="text-sm font-black text-slate-800 truncate">{node.label}</p><p className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">{node.id} • {SHAPE_LABELS[node.shape].split(' ')[1]}</p></div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all"><Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-white" onClick={() => { setNodeForm({ id: node.id, label: node.label, shape: node.shape }); setEditingNodeId(node.id); setNodeDialogOpen(true); }}><LucideIcons.Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-red-50 text-red-500" onClick={() => applyCode(surgicalDeleteNode(codeRef.current, node.id))}><LucideIcons.Trash2 className="h-4 w-4" /></Button></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between"><h3 className="font-black text-sm text-slate-700 uppercase tracking-widest">Liens Logiques ({graph.edges.length})</h3>{graph.nodes.length >= 2 && <Button size="sm" onClick={() => setEdgeDialogOpen(true)} className="bg-violet-600 text-white rounded-xl px-4 font-bold shadow-md"><LucideIcons.Link className="h-4 w-4 mr-2" /> Connecter</Button>}</div>
                                <div className="grid gap-2">
                                    {graph.edges.map((edge, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-violet-100 bg-violet-50/30 group hover:shadow-sm">
                                            <div className="flex-1 flex items-center gap-2 text-xs font-bold text-slate-600 truncate">
                                                <span>{graph.nodes.find(n => n.id === edge.from)?.label || edge.from}</span>
                                                <LucideIcons.ArrowRight className="h-3.5 w-3.5 text-violet-400" />
                                                <span>{graph.nodes.find(n => n.id === edge.to)?.label || edge.to}</span>
                                                {edge.label && <span className="px-2 py-0.5 rounded-full bg-white border text-[9px] uppercase tracking-widest text-violet-600">{edge.label}</span>}
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 opacity-0 group-hover:opacity-100" onClick={() => { const e = graph.edges[idx]; if (e) applyCode(codeRef.current.split('\n').filter(l => !l.includes(`${e.from} -->`) || (e.label && !l.includes(e.label))).join('\n')); }}><LucideIcons.X className="h-3.5 w-3.5" /></Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="editor" className="flex-1 m-0 p-0 overflow-hidden bg-[#1e1e1e]">
                            <div className="h-full flex flex-col">
                                <div className="bg-[#252526] px-4 py-2 text-[10px] uppercase font-bold text-emerald-400 border-b border-black flex justify-between"><span>Monaco (Mermaid Synced)</span><span>● Édition Directe</span></div>
                                <div className="flex-1 min-h-0" ref={monacoContainerRef} />
                            </div>
                        </TabsContent>

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

                <div className="flex-1 flex flex-col bg-slate-50 relative group overflow-hidden">
                    <div className="bg-white px-6 py-3 border-b flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <LucideIcons.Eye className="h-4 w-4 text-emerald-500" />
                            <span className="text-[10px] font-black uppercase text-slate-500">Live Visualizer</span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsFullscreen(true)} className="h-8 rounded-full gap-2 text-[10px] font-black uppercase">
                                <LucideIcons.Maximize2 className="h-3 w-3" /> Fullscreen
                            </Button>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] h-6 px-3">● Sync Active</Badge>
                        </div>
                    </div>

                    {/* Optimized wrapper for a larger display */}
                    <div className="flex-1 relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] p-2 overflow-hidden">
                        <div className="absolute inset-2 bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border flex flex-col items-center justify-center transition-all duration-500 hover:scale-[1.002] overflow-hidden">
                            <div className="w-full h-full p-2">
                                <MermaidRenderer chart={code} workflowId={id} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FULLSCREEN PREVIEW DIALOG */}
            <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
                <DialogContent className="max-w-[95vw] h-[90vh] rounded-[4rem] p-0 overflow-hidden flex flex-col border-none shadow-2xl">
                    <div className="bg-white/90 backdrop-blur-md px-10 py-6 border-b flex justify-between items-center">
                        <div className="flex items-center gap-4"><div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center"><LucideIcons.Workflow className="h-6 w-6 text-white" /></div><div><h2 className="text-xl font-black text-slate-800">{name}</h2><p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Aperçu Haute Résolution • ID: {id}</p></div></div>
                        <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(false)} className="h-12 w-12 rounded-full hover:bg-slate-100"><LucideIcons.X className="h-6 w-6" /></Button>
                    </div>
                    <div className="flex-1 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] overflow-hidden p-6 flex items-center justify-center">
                        <div className="w-full h-full max-w-[95%] max-h-[95%] bg-white rounded-[3rem] shadow-2xl border border-slate-100 flex items-center justify-center p-4">
                            <MermaidRenderer chart={code} workflowId={id} />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* NODE DIALOG */}
            <Dialog open={nodeDialogOpen} onOpenChange={setNodeDialogOpen}>
                <DialogContent className="rounded-[3rem] max-w-md p-8 shadow-2xl">
                    <DialogHeader className="mb-6"><DialogTitle className="text-2xl font-black flex items-center gap-3">{editingNodeId ? '✏️ Modifier l\'Étape' : '➕ Nouvelle Étape'}</DialogTitle><DialogDescription className="text-xs font-medium text-slate-500">Configurez les propriétés visuelles et textuelles du nœud.</DialogDescription></DialogHeader>
                    <div className="space-y-6">
                        <div className="space-y-2"><Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Libellé Affiché *</Label><Input value={nodeForm.label} onChange={e => setNodeForm(f => ({ ...f, label: e.target.value }))} className="rounded-2xl h-12 text-lg font-bold border-2 focus:border-indigo-500 transition-all shadow-sm" placeholder="Ex: Analyse de conformité..." autoFocus /></div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Forme Logique</Label>
                            <div className="grid grid-cols-1 gap-2">{(Object.keys(SHAPE_LABELS) as NodeShape[]).map(s => <button key={s} onClick={() => setNodeForm(f => ({ ...f, shape: s }))} className={cn("flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all", nodeForm.shape === s ? "border-indigo-600 bg-indigo-50 shadow-md transform scale-[1.02]" : "bg-white hover:border-slate-300 hover:bg-slate-50")}>{SHAPE_ICONS[s]} <div><p className={cn("text-sm font-black", nodeForm.shape === s ? "text-indigo-700" : "text-slate-800")}>{SHAPE_LABELS[s].split(' ')[1]}</p><p className="text-[10px] text-slate-400 font-medium">{s === 'diamond' ? 'Utilisé pour les questions/alternatives' : 'Utilisé pour les actions standards'}</p></div> {nodeForm.shape === s && <LucideIcons.Check className="ml-auto h-5 w-5 text-indigo-600" />}</button>)}</div>
                        </div>
                    </div>
                    <DialogFooter className="mt-8 flex gap-3"><Button variant="outline" onClick={() => setNodeDialogOpen(false)} className="flex-1 rounded-2xl h-12 font-bold">Annuler</Button><Button onClick={() => { if (!nodeForm.label) return; applyCode(editingNodeId ? surgicalEditNode(codeRef.current, editingNodeId, nodeForm.label, nodeForm.shape) : surgicalAddNode(codeRef.current, nodeForm.id, nodeForm.label, nodeForm.shape)); setNodeDialogOpen(false); }} className="flex-1 bg-indigo-600 text-white rounded-2xl h-12 font-black shadow-lg">Enregistrer</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* EDGE DIALOG */}
            <Dialog open={edgeDialogOpen} onOpenChange={setEdgeDialogOpen}>
                <DialogContent className="rounded-[3rem] max-w-sm p-8 shadow-2xl">
                    <DialogHeader className="mb-6"><DialogTitle className="text-2xl font-black flex items-center gap-3">🔗 Lien Logique</DialogTitle><DialogDescription className="text-xs font-medium text-slate-500">Créez une relation directionnelle entre deux nœuds.</DialogDescription></DialogHeader>
                    <div className="space-y-5">
                        <div className="space-y-2"><Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nœud Source</Label><Select value={edgeForm.from} onValueChange={v => setEdgeForm(f => ({ ...f, from: v }))}><SelectTrigger className="rounded-2xl h-12 font-bold"><SelectValue placeholder="Départ..." /></SelectTrigger><SelectContent>{graph.nodes.map(n => <SelectItem key={n.id} value={n.id} className="font-bold">{n.label}</SelectItem>)}</SelectContent></Select></div>
                        <div className="flex justify-center"><LucideIcons.ArrowDownCircle className="h-8 w-8 text-slate-200" /></div>
                        <div className="space-y-2"><Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nœud Destination</Label><Select value={edgeForm.to} onValueChange={v => setEdgeForm(f => ({ ...f, to: v }))}><SelectTrigger className="rounded-2xl h-12 font-bold"><SelectValue placeholder="Arrivée..." /></SelectTrigger><SelectContent>{graph.nodes.filter(n => n.id !== edgeForm.from).map(n => <SelectItem key={n.id} value={n.id} className="font-bold">{n.label}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2 pt-2"><Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Action / Condition</Label><Input placeholder="Ex: Si accepté, Oui, Non..." value={edgeForm.label} onChange={e => setEdgeForm(f => ({ ...f, label: e.target.value }))} className="rounded-2xl h-10 font-bold" /></div>
                    </div>
                    <DialogFooter className="mt-8"><Button onClick={() => { if (!edgeForm.from || !edgeForm.to) return; const l = edgeForm.label ? ` -->|"${edgeForm.label}"| ` : ' --> '; const edgeLine = `  ${edgeForm.from}${l}${edgeForm.to}`; const classIdx = codeRef.current.search(/\n[ \t]*(classDef|class |style |linkStyle )/); applyCode(classIdx > -1 ? codeRef.current.slice(0, classIdx) + `\n${edgeLine}` + codeRef.current.slice(classIdx) : codeRef.current + `\n${edgeLine}`); setEdgeDialogOpen(false); setEdgeForm({ from: '', to: '', label: '' }); }} className="w-full bg-violet-600 text-white rounded-2xl h-14 font-black shadow-xl text-lg">Créer le Lien</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
