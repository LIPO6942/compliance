'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { MermaidWorkflow, WorkflowVersion, WorkflowTask, AuditLog } from '@/types/compliance';
import { usePlanData } from '@/contexts/PlanDataContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Declaration pour TypeScript
declare global {
    interface Window {
        require: any;
        monaco: any;
    }
}

export default function WorkflowEditorPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const { toast } = useToast();
    const editorRef = useRef<any>(null);
    const monacoContainerRef = useRef<HTMLDivElement>(null);

    const [code, setCode] = useState<string>('graph TD\n  A[Début] --> B{Décision}\n  B -- Oui --> C[Fin]\n  B -- Non --> D[Action]');
    const [name, setName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeWorkflow, setActiveWorkflow] = useState<MermaidWorkflow | null>(null);
    const [isMonacoReady, setIsMonacoReady] = useState(false);

    const { workflowTasks, assignTask, auditLogs } = usePlanData();
    const [activeTab, setActiveTab] = useState('editor');
    const [detectedNodes, setDetectedNodes] = useState<{ id: string, label: string }[]>([]);

    // Extraction des noeuds Mermaid du code
    useEffect(() => {
        const nodes: { id: string, label: string }[] = [];
        const lines = code.split('\n');
        // Regex pour capturer ID[Label] ou ID{Label} ou ID(Label) ou ID((Label)) ou ID>Label] ou ID[/Label/] etc.
        const nodeRegex = /^(\s*)([a-zA-Z0-9_\-]+)\s*(?:\[|{|\(|\(\(|>|\[\/|\\|\[\[)(.*?)(?:\]|}|\)|\)\)|\]|\]\/|\\|\]\])/;

        lines.forEach(line => {
            const match = line.match(nodeRegex);
            if (match) {
                const nodeId = match[2];
                const nodeLabel = match[3].trim();
                if (!nodes.find(n => n.id === nodeId)) {
                    nodes.push({ id: nodeId, label: nodeLabel });
                }
            }
        });
        setDetectedNodes(nodes);
    }, [code]);

    const getTaskForNode = (nodeId: string) => {
        return workflowTasks.find(t => t.workflowId === id && t.nodeId === nodeId);
    };

    const handleAssign = (nodeId: string, nodeLabel: string, userId: string, userName: string, role: string) => {
        assignTask({
            workflowId: id,
            nodeId: nodeId,
            taskName: nodeLabel,
            responsibleUserId: userId,
            responsibleUserName: userName,
            roleRequired: role,
            status: 'En attente',
        });
        toast({
            title: "Tâche assignée",
            description: `${nodeLabel} assignée à ${userName}`,
        });
    };
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const initMonaco = () => {
            if (window.require && monacoContainerRef.current) {
                window.require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
                window.require(['vs/editor/editor.main'], function () {
                    if (monacoContainerRef.current) {
                        editorRef.current = window.monaco.editor.create(monacoContainerRef.current, {
                            value: code,
                            language: 'mermaid',
                            theme: 'vs-dark',
                            minimap: { enabled: false },
                            fontSize: 14,
                            lineNumbers: 'on',
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            fontFamily: "'Fira Code', 'Courier New', monospace",
                        });

                        editorRef.current.onDidChangeModelContent(() => {
                            setCode(editorRef.current.getValue());
                        });

                        setIsMonacoReady(true);
                    }
                });
            } else {
                setTimeout(initMonaco, 100);
            }
        };

        initMonaco();

        return () => {
            if (editorRef.current) {
                editorRef.current.dispose();
            }
        };
    }, []);

    // Update editor value when code changes from external (e.g. load)
    useEffect(() => {
        if (editorRef.current && code !== editorRef.current.getValue()) {
            editorRef.current.setValue(code);
        }
    }, [isMonacoReady]); // Seulement au premier chargement réussi

    useEffect(() => {
        const loadWorkflow = async () => {
            if (!id) return;

            try {
                setLoading(true);
                const workflowRef = doc(db, 'workflows', id);
                const workflowSnap = await getDoc(workflowRef);

                if (workflowSnap.exists()) {
                    const data = workflowSnap.data() as MermaidWorkflow;
                    setActiveWorkflow({ ...data, id: workflowSnap.id });
                    setName(data.name);

                    const vRef = collection(db, 'workflows', id, 'versions');
                    const q = query(vRef, orderBy('version', 'desc'), limit(1));
                    const vSnap = await getDocs(q);
                    if (!vSnap.empty) {
                        const vData = vSnap.docs[0].data() as WorkflowVersion;
                        setCode(vData.mermaidCode);
                        if (editorRef.current) {
                            editorRef.current.setValue(vData.mermaidCode);
                        }
                    }
                } else {
                    setName(id === 'eer' ? 'Entrée en Relation' : id === 'gel' ? 'Gel des Avoirs' : 'Monitoring');
                }
            } catch (error) {
                console.error('Error loading workflow:', error);
            } finally {
                setLoading(false);
            }
        };

        loadWorkflow();
    }, [id]);

    const handleSave = async (status: 'draft' | 'published') => {
        if (!id) return;
        setSaving(true);

        try {
            const nextVersion = (activeWorkflow?.currentVersion || 0) + 1;
            const now = new Date().toISOString();
            const versionId = `v${nextVersion}-${Date.now()}`;

            const versionData: WorkflowVersion = {
                id: versionId,
                mermaidCode: code,
                version: nextVersion,
                status: status,
                createdAt: now,
                updatedAt: now,
            };

            await setDoc(doc(db, 'workflows', id, 'versions', versionId), versionData);

            const workflowData: Partial<MermaidWorkflow> = {
                workflowId: id,
                name: name,
                currentVersion: nextVersion,
                updatedAt: now,
                ...(status === 'published' ? { activeVersionId: versionId } : {}),
            };

            if (!activeWorkflow) {
                workflowData.createdAt = now;
            }

            await setDoc(doc(db, 'workflows', id), workflowData, { merge: true });

            toast({
                title: status === 'published' ? "Workflow publié !" : "Brouillon sauvegardé",
                description: `Version ${nextVersion} ${status === 'published' ? 'est maintenant active' : 'enregistrée'}.`,
            });

            // Update local state
            setActiveWorkflow(prev => prev ? { ...prev, ...workflowData } as MermaidWorkflow : { ...workflowData, id } as MermaidWorkflow);

        } catch (error) {
            console.error('Save error:', error);
            toast({
                title: "Erreur de sauvegarde",
                description: "Impossible d'enregistrer le workflow.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-bold">Chargement de l'éditeur...</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
            {/* Tool Bar */}
            <div className="border-b bg-white dark:bg-slate-900 px-6 py-3 flex justify-between items-center shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <Link href="/admin/workflows">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <LucideIcons.ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="flex flex-col">
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-7 font-bold border-none px-0 focus-visible:ring-0 text-xl w-[350px] bg-transparent"
                            placeholder="Nom du workflow"
                        />
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] h-4 font-mono">ID: {id}</Badge>
                            {activeWorkflow?.activeVersionId && (
                                <Badge className="text-[10px] h-4 bg-emerald-500 text-white border-none">Publié: V{activeWorkflow.currentVersion}</Badge>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleSave('draft')} disabled={saving} className="border-slate-200">
                        <LucideIcons.Save className="mr-2 h-4 w-4" /> Brouillon
                    </Button>
                    <Button size="sm" onClick={() => handleSave('published')} disabled={saving} className="bg-primary hover:bg-primary/90">
                        <LucideIcons.CloudUpload className="mr-2 h-4 w-4" /> Publier
                    </Button>
                </div>
            </div>

            {/* Editor & Preview */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Pane (Code or Tasks) */}
                <div className="w-1/2 border-r flex flex-col bg-white">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                        <div className="shrink-0 bg-slate-50 border-b px-6 flex items-center justify-between h-12">
                            <TabsList className="bg-slate-200">
                                <TabsTrigger value="editor">
                                    <LucideIcons.Code2 className="mr-2 h-4 w-4" /> Code
                                </TabsTrigger>
                                <TabsTrigger value="assignments">
                                    <LucideIcons.Users className="mr-2 h-4 w-4" /> Assignations
                                </TabsTrigger>
                                <TabsTrigger value="audit">
                                    <LucideIcons.ListChecks className="mr-2 h-4 w-4" /> Audit
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="editor" className="flex-1 m-0 p-0 overflow-hidden bg-[#1e1e1e]">
                            <div className="h-full flex flex-col">
                                <div className="bg-[#252526] px-4 py-2 text-[10px] uppercase font-bold tracking-widest text-slate-400 flex justify-between border-b border-black">
                                    <span>Editeur Mermaid</span>
                                    <span>Langage: Flowchart</span>
                                </div>
                                <div className="flex-1 min-h-0" ref={monacoContainerRef} />
                            </div>
                        </TabsContent>

                        <TabsContent value="assignments" className="flex-1 m-0 p-6 overflow-auto">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold">Attribution des Responsabilités</h3>
                                    <p className="text-sm text-muted-foreground">Définissez qui est responsable de chaque étape détectée dans le diagramme.</p>
                                </div>

                                <div className="grid gap-4">
                                    {detectedNodes.map(node => {
                                        const task = getTaskForNode(node.id);
                                        return (
                                            <Card key={node.id} className="border-slate-200">
                                                <CardContent className="pt-4 space-y-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-xs font-bold px-1 bg-slate-100 rounded">ID: {node.id}</span>
                                                                <span className="font-semibold">{node.label}</span>
                                                            </div>
                                                            {task && (
                                                                <Badge variant="secondary" className="mt-1">
                                                                    {task.status}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <LucideIcons.Settings2 className="h-4 w-4 text-slate-300" />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold uppercase text-slate-500">Responsable</label>
                                                            <Select
                                                                defaultValue={task?.responsibleUserId}
                                                                onValueChange={(val) => {
                                                                    const names: Record<string, string> = {
                                                                        'user-1': 'Jean Dupont',
                                                                        'user-2': 'Claire Martin',
                                                                        'user-3': 'Marc Lefebvre'
                                                                    };
                                                                    handleAssign(node.id, node.label, val, names[val] || 'Inconnu', task?.roleRequired || 'Standard');
                                                                }}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Choisir..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="user-1">Jean Dupont (Compliance)</SelectItem>
                                                                    <SelectItem value="user-2">Claire Martin (Manager)</SelectItem>
                                                                    <SelectItem value="user-3">Marc Lefebvre (Risk)</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold uppercase text-slate-500">Rôle Requis</label>
                                                            <Select
                                                                defaultValue={task?.roleRequired}
                                                                onValueChange={(val) => {
                                                                    if (task) {
                                                                        handleAssign(node.id, node.label, task.responsibleUserId, task.responsibleUserName || '', val);
                                                                    }
                                                                }}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Rôle..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="Compliance Officer">Compliance Officer</SelectItem>
                                                                    <SelectItem value="Manager">Manager</SelectItem>
                                                                    <SelectItem value="Risk Analyst">Risk Analyst</SelectItem>
                                                                    <SelectItem value="Admin">Admin</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                    {detectedNodes.length === 0 && (
                                        <div className="p-10 text-center border-2 border-dashed rounded-xl">
                                            <LucideIcons.AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                                            <p className="text-slate-500">Aucun noeud détecté dans le code Mermaid.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="audit" className="flex-1 m-0 p-6 overflow-auto">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold">Historique d'Audit</h3>
                                    <p className="text-sm text-muted-foreground">Traciabilité des modifications sur ce workflow.</p>
                                </div>

                                <div className="relative space-y-4">
                                    <div className="absolute left-4 top-2 bottom-0 w-0.5 bg-slate-100" />
                                    {auditLogs
                                        .filter(log => log.workflowId === id)
                                        .map(log => (
                                            <div key={log.id} className="relative pl-10">
                                                <div className="absolute left-2.5 top-1 h-3 w-3 rounded-full bg-white border-2 border-slate-300" />
                                                <div className="text-xs text-slate-400 font-mono mb-1">{new Date(log.timestamp).toLocaleString('fr-FR')}</div>
                                                <div className="text-sm font-semibold text-slate-700">{log.action}</div>
                                                <div className="text-sm text-slate-600">{log.details}</div>
                                                <div className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-wider">Par: {log.performedByUserName}</div>
                                            </div>
                                        ))}
                                    {auditLogs.filter(log => log.workflowId === id).length === 0 && (
                                        <p className="text-center text-slate-400 py-10 italic">Aucun log enregistré.</p>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Preview Pane */}
                <div className="w-1/2 flex flex-col bg-slate-50 dark:bg-slate-950">
                    <div className="bg-white dark:bg-slate-900 px-4 py-2 text-[10px] uppercase font-bold tracking-widest text-slate-500 border-b flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <LucideIcons.Eye className="h-3 w-3" />
                            <span>Aperçu en direct</span>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="outline" className="text-[9px] px-1 h-3.5">Auto-refresh</Badge>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)]">
                        <div className="p-8 min-h-full flex items-center justify-center">
                            <div className="w-full max-w-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800">
                                <MermaidRenderer chart={code} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
