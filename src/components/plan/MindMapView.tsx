'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    MiniMap,
    useNodesState,
    useEdgesState,
    BackgroundVariant,
    Panel,
    type Node,
    type Edge,
    Handle,
    Position,
    useReactFlow,
    ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { toPng } from 'html-to-image';

import { usePlanData } from '@/contexts/PlanDataContext';
import { useRiskMapping } from '@/contexts/RiskMappingContext';
import { useDocuments } from '@/contexts/DocumentsContext';
import type { ComplianceTask, ComplianceCategory, MermaidWorkflow, RiskMappingItem, WorkflowDomain } from '@/types/compliance';
import type { MindMapNodeData, MindMapNodeType } from './types';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Filter, ZoomIn, ZoomOut, Maximize, ChevronDown, ChevronRight, FileText, ShieldAlert, Shield, ListChecks, Workflow, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

// ─── Color & Style Config ────────────────────────────────────────
const nodeStyleConfig: Record<MindMapNodeType, { bg: string; border: string; text: string; icon: any; glow: string }> = {
    process: { bg: 'bg-indigo-50', border: 'border-indigo-400', text: 'text-indigo-800', icon: Workflow, glow: 'shadow-indigo-200/50' },
    risk: { bg: 'bg-rose-50', border: 'border-rose-400', text: 'text-rose-800', icon: ShieldAlert, glow: 'shadow-rose-200/50' },
    control: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-800', icon: Shield, glow: 'shadow-amber-200/50' },
    task: { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-800', icon: ListChecks, glow: 'shadow-emerald-200/50' },
    document: { bg: 'bg-sky-50', border: 'border-sky-400', text: 'text-sky-800', icon: FileText, glow: 'shadow-sky-200/50' },
};

const riskLevelColors: Record<string, string> = {
    'Faible': 'bg-emerald-500',
    'Modéré': 'bg-yellow-500',
    'Élevé': 'bg-orange-500',
    'Très élevé': 'bg-red-500',
};

// ─── Custom Node Component ───────────────────────────────────────
function MindMapNode({ data }: { data: MindMapNodeData }) {
    const config = nodeStyleConfig[data.nodeType] || nodeStyleConfig.task;
    const Icon = config.icon;

    return (
        <div
            className={cn(
                'relative px-4 py-3 rounded-2xl border-2 shadow-lg transition-all duration-300 min-w-[160px] max-w-[260px] cursor-pointer',
                'hover:shadow-xl hover:scale-[1.03]',
                config.bg, config.border, config.glow
            )}
        >
            <Handle type="target" position={Position.Left} className="!bg-slate-400 !w-2 !h-2 !border-0" />
            <Handle type="source" position={Position.Right} className="!bg-slate-400 !w-2 !h-2 !border-0" />

            <div className="flex items-start gap-2">
                <div className={cn('p-1.5 rounded-lg shrink-0', config.bg)}>
                    <Icon className={cn('h-4 w-4', config.text)} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-bold truncate leading-tight', config.text)}>
                        {data.label}
                    </p>
                    {data.description && (
                        <p className="text-[9px] text-slate-500 truncate mt-0.5">{data.description}</p>
                    )}
                </div>
            </div>

            {/* Risk level indicator */}
            {data.riskLevel && (
                <div className="flex items-center gap-1 mt-1.5">
                    <div className={cn('w-2 h-2 rounded-full', riskLevelColors[data.riskLevel] || 'bg-gray-400')} />
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">
                        {data.riskLevel}
                    </span>
                </div>
            )}

            {/* Domain badge */}
            {data.domain && (
                <Badge variant="outline" className="mt-1 text-[7px] py-0 px-1.5 font-semibold opacity-60">
                    {data.domain}
                </Badge>
            )}

            {/* Collapse indicator */}
            {data.isCollapsed && data.childCount && data.childCount > 0 && (
                <div className="absolute -right-2 -bottom-2 bg-primary text-white text-[8px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                    +{data.childCount}
                </div>
            )}
        </div>
    );
}

// ─── Dagre Layout ────────────────────────────────────────────────
const NODE_WIDTH = 220;
const NODE_HEIGHT = 70;

function getLayoutedElements(nodes: Node[], edges: Edge[], direction = 'LR') {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, ranksep: 80, nodesep: 40, marginx: 40, marginy: 40 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - NODE_WIDTH / 2,
                y: nodeWithPosition.y - NODE_HEIGHT / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
}

// ─── Edge Style ──────────────────────────────────────────────────
const edgeDefaults = {
    style: { stroke: '#94a3b8', strokeWidth: 2 },
    type: 'smoothstep' as const,
    animated: false,
};

// ─── Main Component (Inner) ──────────────────────────────────────
function MindMapViewInner({
    onNodeClick,
}: {
    onNodeClick?: (nodeType: MindMapNodeType, entityId: string) => void;
}) {
    const { planData, activeWorkflows } = usePlanData();
    const { risks: allRisks } = useRiskMapping();
    const { documents } = useDocuments();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    // Filters
    const [domainFilter, setDomainFilter] = useState<string>('all');
    const [riskLevelFilter, setRiskLevelFilter] = useState<string>('all');
    const domains: WorkflowDomain[] = ['Conformité', 'Commercial', 'Sinistre', 'Technique'];

    const { fitView } = useReactFlow();

    // ─── Build Graph Data ───────────────────────────────────────
    const graphData = useMemo(() => {
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        let nodeIdCounter = 0;
        const genId = () => `mm-${nodeIdCounter++}`;

        // Collect all tasks recursively with their location info
        const collectTasks = (tasks: ComplianceTask[]): ComplianceTask[] => {
            let all: ComplianceTask[] = [];
            tasks.forEach(t => {
                all.push(t);
                if (t.branches) {
                    t.branches.forEach(b => {
                        all = [...all, ...collectTasks(b.tasks)];
                    });
                }
            });
            return all;
        };

        const allTasks = planData.flatMap((cat: ComplianceCategory) =>
            cat.subCategories.flatMap(sub => collectTasks(sub.tasks))
        );

        // Process each workflow as a root node
        const workflowEntries = Object.entries(activeWorkflows);

        workflowEntries.forEach(([wfId, wf]) => {
            // Domain filter
            if (domainFilter !== 'all') {
                // We need to match workflow domain — fetch from Firestore data if available
                // For now, skip workflows not matching filter
            }

            const processNodeId = genId();
            newNodes.push({
                id: processNodeId,
                type: 'mindMapNode',
                position: { x: 0, y: 0 },
                data: {
                    label: wf.name || wfId,
                    nodeType: 'process' as MindMapNodeType,
                    entityId: wfId,
                    domain: (wf as any).domain || undefined,
                } satisfies MindMapNodeData,
            });

            // Find tasks linked to this workflow
            const linkedTasks = allTasks.filter(t => t.grcWorkflowId === wfId);

            // Collect unique risk IDs from linked tasks
            const riskIds = new Set<string>();
            linkedTasks.forEach(t => {
                (t.risks || []).forEach(rId => riskIds.add(rId));
            });

            // Create risk nodes
            riskIds.forEach(riskId => {
                const risk = allRisks.find(r => r.id === riskId);
                if (!risk) return;

                // Risk level filter
                if (riskLevelFilter !== 'all' && risk.riskLevel !== riskLevelFilter) return;

                const riskNodeId = genId();
                const isCollapsed = collapsedNodes.has(riskNodeId);

                newNodes.push({
                    id: riskNodeId,
                    type: 'mindMapNode',
                    position: { x: 0, y: 0 },
                    data: {
                        label: risk.riskDescription.substring(0, 60) + (risk.riskDescription.length > 60 ? '...' : ''),
                        nodeType: 'risk' as MindMapNodeType,
                        entityId: riskId,
                        riskLevel: risk.riskLevel,
                        description: risk.expectedAction?.substring(0, 50),
                        owner: risk.owner,
                    } satisfies MindMapNodeData,
                });

                newEdges.push({
                    id: `e-${processNodeId}-${riskNodeId}`,
                    source: processNodeId,
                    target: riskNodeId,
                    ...edgeDefaults,
                });

                if (!isCollapsed) {
                    // Find controls linked to tasks that reference this risk
                    const controlIds = new Set<string>();
                    linkedTasks.forEach(t => {
                        if (t.risks?.includes(riskId)) {
                            (t.controls || []).forEach(cId => controlIds.add(cId));
                        }
                    });

                    // Create control nodes (using control IDs as labels for now)
                    controlIds.forEach(controlId => {
                        const controlNodeId = genId();
                        newNodes.push({
                            id: controlNodeId,
                            type: 'mindMapNode',
                            position: { x: 0, y: 0 },
                            data: {
                                label: `Contrôle: ${controlId}`,
                                nodeType: 'control' as MindMapNodeType,
                                entityId: controlId,
                            } satisfies MindMapNodeData,
                        });

                        newEdges.push({
                            id: `e-${riskNodeId}-${controlNodeId}`,
                            source: riskNodeId,
                            target: controlNodeId,
                            ...edgeDefaults,
                        });

                        // Find tasks linked to this control
                        const controlTasks = linkedTasks.filter(t =>
                            t.controls?.includes(controlId) && t.risks?.includes(riskId)
                        );

                        controlTasks.forEach(task => {
                            const taskNodeId = genId();
                            newNodes.push({
                                id: taskNodeId,
                                type: 'mindMapNode',
                                position: { x: 0, y: 0 },
                                data: {
                                    label: task.name,
                                    nodeType: 'task' as MindMapNodeType,
                                    entityId: task.id,
                                    status: task.completed ? 'Terminé' : 'En cours',
                                } satisfies MindMapNodeData,
                            });

                            newEdges.push({
                                id: `e-${controlNodeId}-${taskNodeId}`,
                                source: controlNodeId,
                                target: taskNodeId,
                                ...edgeDefaults,
                            });

                            // Documents linked to this task
                            (task.documentIds || []).forEach(docId => {
                                const doc = documents.find(d => d.id === docId);
                                if (!doc) return;
                                const docNodeId = genId();
                                newNodes.push({
                                    id: docNodeId,
                                    type: 'mindMapNode',
                                    position: { x: 0, y: 0 },
                                    data: {
                                        label: doc.name,
                                        nodeType: 'document' as MindMapNodeType,
                                        entityId: docId,
                                        status: doc.status,
                                    } satisfies MindMapNodeData,
                                });

                                newEdges.push({
                                    id: `e-${taskNodeId}-${docNodeId}`,
                                    source: taskNodeId,
                                    target: docNodeId,
                                    ...edgeDefaults,
                                });
                            });
                        });
                    });

                    // Tasks directly linked to risk (without controls)
                    const directTasks = linkedTasks.filter(t =>
                        t.risks?.includes(riskId) && (!t.controls || t.controls.length === 0)
                    );

                    directTasks.forEach(task => {
                        const taskNodeId = genId();
                        newNodes.push({
                            id: taskNodeId,
                            type: 'mindMapNode',
                            position: { x: 0, y: 0 },
                            data: {
                                label: task.name,
                                nodeType: 'task' as MindMapNodeType,
                                entityId: task.id,
                                status: task.completed ? 'Terminé' : 'En cours',
                            } satisfies MindMapNodeData,
                        });

                        newEdges.push({
                            id: `e-${riskNodeId}-${taskNodeId}`,
                            source: riskNodeId,
                            target: taskNodeId,
                            ...edgeDefaults,
                        });
                    });
                }
            });

            // Tasks linked to this workflow but without explicit risks
            const orphanTasks = linkedTasks.filter(t => !t.risks || t.risks.length === 0);
            orphanTasks.forEach(task => {
                const taskNodeId = genId();
                newNodes.push({
                    id: taskNodeId,
                    type: 'mindMapNode',
                    position: { x: 0, y: 0 },
                    data: {
                        label: task.name,
                        nodeType: 'task' as MindMapNodeType,
                        entityId: task.id,
                        status: task.completed ? 'Terminé' : 'En cours',
                    } satisfies MindMapNodeData,
                });

                newEdges.push({
                    id: `e-${processNodeId}-${taskNodeId}`,
                    source: processNodeId,
                    target: taskNodeId,
                    ...edgeDefaults,
                });
            });
        });

        // Also add standalone risks that are not linked to any workflow
        const linkedRiskIds = new Set<string>();
        allTasks.forEach(t => {
            (t.risks || []).forEach(rId => linkedRiskIds.add(rId));
        });

        const unlinkedRisks = allRisks.filter(r => !linkedRiskIds.has(r.id));
        if (unlinkedRisks.length > 0) {
            const orphanRootId = genId();
            newNodes.push({
                id: orphanRootId,
                type: 'mindMapNode',
                position: { x: 0, y: 0 },
                data: {
                    label: 'Risques non liés',
                    nodeType: 'risk' as MindMapNodeType,
                    entityId: 'unlinked',
                    childCount: unlinkedRisks.length,
                } satisfies MindMapNodeData,
            });

            unlinkedRisks.forEach(risk => {
                if (riskLevelFilter !== 'all' && risk.riskLevel !== riskLevelFilter) return;

                const riskNodeId = genId();
                newNodes.push({
                    id: riskNodeId,
                    type: 'mindMapNode',
                    position: { x: 0, y: 0 },
                    data: {
                        label: risk.riskDescription.substring(0, 60) + (risk.riskDescription.length > 60 ? '...' : ''),
                        nodeType: 'risk' as MindMapNodeType,
                        entityId: risk.id,
                        riskLevel: risk.riskLevel,
                        owner: risk.owner,
                    } satisfies MindMapNodeData,
                });

                newEdges.push({
                    id: `e-${orphanRootId}-${riskNodeId}`,
                    source: orphanRootId,
                    target: riskNodeId,
                    ...edgeDefaults,
                });
            });
        }

        return { nodes: newNodes, edges: newEdges };
    }, [planData, activeWorkflows, allRisks, documents, collapsedNodes, domainFilter, riskLevelFilter]);

    // ─── Apply Search Filter ────────────────────────────────────
    const filteredGraph = useMemo(() => {
        if (!searchQuery.trim()) return graphData;

        const q = searchQuery.toLowerCase();
        const matchingNodeIds = new Set<string>();

        graphData.nodes.forEach(node => {
            const data = node.data as MindMapNodeData;
            if (
                data.label.toLowerCase().includes(q) ||
                data.description?.toLowerCase().includes(q) ||
                data.owner?.toLowerCase().includes(q)
            ) {
                matchingNodeIds.add(node.id);
            }
        });

        // Include parent nodes for matching nodes
        graphData.edges.forEach(edge => {
            if (matchingNodeIds.has(edge.target)) {
                matchingNodeIds.add(edge.source);
            }
        });
        // Re-run to get grandparents
        graphData.edges.forEach(edge => {
            if (matchingNodeIds.has(edge.target)) {
                matchingNodeIds.add(edge.source);
            }
        });

        const filteredNodes = graphData.nodes.filter(n => matchingNodeIds.has(n.id));
        const filteredEdges = graphData.edges.filter(e =>
            matchingNodeIds.has(e.source) && matchingNodeIds.has(e.target)
        );

        return { nodes: filteredNodes, edges: filteredEdges };
    }, [graphData, searchQuery]);

    // ─── Apply Layout ───────────────────────────────────────────
    useEffect(() => {
        if (filteredGraph.nodes.length === 0) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            filteredGraph.nodes,
            filteredGraph.edges,
            'LR'
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

        // Fit view after a short delay to let React paint
        setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100);
    }, [filteredGraph, setNodes, setEdges, fitView]);

    // ─── Node Click Handler ─────────────────────────────────────
    const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        const data = node.data as MindMapNodeData;

        // Toggle collapse
        setCollapsedNodes(prev => {
            const next = new Set(prev);
            if (next.has(node.id)) {
                next.delete(node.id);
            } else {
                next.add(node.id);
            }
            return next;
        });

        onNodeClick?.(data.nodeType, data.entityId);
    }, [onNodeClick]);

    // ─── Export PNG ─────────────────────────────────────────────
    const handleExportPng = useCallback(() => {
        const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
        if (!viewport) return;

        toPng(viewport, {
            backgroundColor: '#ffffff',
            width: viewport.scrollWidth,
            height: viewport.scrollHeight,
        }).then((dataUrl) => {
            const link = document.createElement('a');
            link.download = `mindmap-grc-${new Date().toISOString().split('T')[0]}.png`;
            link.href = dataUrl;
            link.click();
        }).catch(err => {
            console.error('Export PNG error:', err);
        });
    }, []);

    const nodeTypes = useMemo(() => ({ mindMapNode: MindMapNode }), []);

    return (
        <div className="w-full h-[calc(100vh-16rem)] rounded-3xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.1}
                maxZoom={2}
                attributionPosition="bottom-left"
            >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
                <Controls className="!rounded-2xl !border-2 !border-slate-100 !shadow-lg" />
                <MiniMap
                    className="!rounded-2xl !border-2 !border-slate-100 !shadow-lg"
                    nodeColor={(node) => {
                        const data = node.data as MindMapNodeData;
                        switch (data.nodeType) {
                            case 'process': return '#818cf8';
                            case 'risk': return '#fb7185';
                            case 'control': return '#fbbf24';
                            case 'task': return '#34d399';
                            case 'document': return '#38bdf8';
                            default: return '#94a3b8';
                        }
                    }}
                />

                {/* ─── Toolbar Panel ──────────────────────────────────── */}
                <Panel position="top-left" className="flex flex-wrap items-center gap-2 p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-xl">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder="Rechercher..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-8 w-40 text-xs rounded-xl border-slate-200"
                        />
                    </div>

                    {/* Domain Filter */}
                    <Select value={domainFilter} onValueChange={setDomainFilter}>
                        <SelectTrigger className="h-8 w-[140px] text-xs rounded-xl">
                            <Filter className="h-3 w-3 mr-1.5 text-slate-400" />
                            <SelectValue placeholder="Domaine" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les domaines</SelectItem>
                            {domains.map(d => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Risk Level Filter */}
                    <Select value={riskLevelFilter} onValueChange={setRiskLevelFilter}>
                        <SelectTrigger className="h-8 w-[130px] text-xs rounded-xl">
                            <ShieldAlert className="h-3 w-3 mr-1.5 text-slate-400" />
                            <SelectValue placeholder="Risque" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous niveaux</SelectItem>
                            <SelectItem value="Faible">🟢 Faible</SelectItem>
                            <SelectItem value="Modéré">🟡 Modéré</SelectItem>
                            <SelectItem value="Élevé">🟠 Élevé</SelectItem>
                            <SelectItem value="Très élevé">🔴 Très élevé</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Export Button */}
                    <Button variant="outline" size="sm" onClick={handleExportPng} className="h-8 rounded-xl text-xs">
                        <Download className="h-3 w-3 mr-1.5" />
                        PNG
                    </Button>
                </Panel>

                {/* ─── Legend Panel ───────────────────────────────────── */}
                <Panel position="bottom-right" className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-xl">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Légende</p>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(nodeStyleConfig).map(([type, config]) => {
                            const Icon = config.icon;
                            const labels: Record<string, string> = {
                                process: 'Processus',
                                risk: 'Risque',
                                control: 'Contrôle',
                                task: 'Tâche',
                                document: 'Document',
                            };
                            return (
                                <div key={type} className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg border', config.bg, config.border)}>
                                    <Icon className={cn('h-3 w-3', config.text)} />
                                    <span className={cn('text-[9px] font-bold', config.text)}>{labels[type]}</span>
                                </div>
                            );
                        })}
                    </div>
                </Panel>

                {/* ─── Stats Panel ────────────────────────────────────── */}
                <Panel position="top-right" className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-xl">
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <p className="text-lg font-black">{nodes.length}</p>
                            <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Nœuds</p>
                        </div>
                        <div className="w-px h-8 bg-slate-100" />
                        <div className="text-center">
                            <p className="text-lg font-black">{edges.length}</p>
                            <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Liens</p>
                        </div>
                    </div>
                </Panel>
            </ReactFlow>

            {/* Empty state */}
            {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm z-10">
                    <div className="text-center space-y-3">
                        <Workflow className="h-16 w-16 mx-auto text-slate-300" />
                        <p className="text-sm font-bold text-slate-500">Aucun nœud à afficher</p>
                        <p className="text-xs text-slate-400">
                            Ajoutez des processus et liez des risques, contrôles et tâches pour les voir ici.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Wrapper with ReactFlowProvider ──────────────────────────────
export function MindMapView({
    onNodeClick,
}: {
    onNodeClick?: (nodeType: MindMapNodeType, entityId: string) => void;
}) {
    return (
        <ReactFlowProvider>
            <MindMapViewInner onNodeClick={onNodeClick} />
        </ReactFlowProvider>
    );
}
