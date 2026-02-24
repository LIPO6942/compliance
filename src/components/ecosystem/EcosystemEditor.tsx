'use client';

import React, { useCallback, useMemo, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    Panel,
    ReactFlowProvider,
    Handle,
    Position,
    BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { EcosystemNode, EcosystemEdge, EcosystemNodeType } from '@/types/compliance';
import {
    Building2,
    ShieldCheck,
    Building,
    Search,
    ShieldAlert,
    Gavel,
    Users,
    TrendingUp,
    Save,
    History,
    Info,
    Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Icons mapping
const iconMap: Record<string, any> = {
    Building2,
    ShieldCheck,
    Building,
    Search,
    ShieldAlert,
    Gavel,
    Users,
    TrendingUp,
};

const nodeStyles: Record<EcosystemNodeType, string> = {
    authority: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    entity: 'bg-rose-50 border-rose-200 text-rose-700',
    judicial: 'bg-amber-50 border-amber-200 text-amber-700',
    service: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    other: 'bg-slate-50 border-slate-200 text-slate-700',
};

// Custom Node Component
function EcosystemNodeComponent({ data, id }: { data: EcosystemNode & { onUpdateLabel?: (id: string, label: string) => void }, id: string }) {
    const Icon = iconMap[data.icon || 'Building'] || Building;
    const styleClass = nodeStyles[data.type] || nodeStyles.other;

    return (
        <div className={cn(
            "px-4 py-3 rounded-2xl border-2 shadow-lg min-w-[200px] transition-all group",
            "hover:scale-105 hover:shadow-xl bg-white",
            styleClass
        )}>
            <Handle type="target" position={Position.Top} className="!bg-slate-300" />
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/50">
                    <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider opacity-60 pointer-events-none">{data.type}</p>
                    <input
                        className="text-sm font-bold leading-tight bg-transparent border-none p-0 focus:ring-0 w-full outline-none block"
                        value={data.label}
                        onChange={(e) => data.onUpdateLabel?.(id, e.target.value)}
                        placeholder="Nom de l'acteur/entité..."
                    />
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} className="!bg-slate-300" />
        </div>
    );
}

// Custom Edge Component for labels
function EcosystemEdgeComponent({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    label,
    data,
}: any) {
    const [isEditing, setIsEditing] = useState(false);
    const [edgeLabel, setEdgeLabel] = useState(label || '');

    const onLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEdgeLabel(e.target.value);
        if (data?.onUpdateEdgeLabel) {
            data.onUpdateEdgeLabel(id, e.target.value);
        }
    };

    const edgePath = `M ${sourceX} ${sourceY} C ${sourceX} ${(sourceY + targetY) / 2} ${targetX} ${(sourceY + targetY) / 2} ${targetX} ${targetY}`;

    return (
        <>
            <path
                id={id}
                className="react-flow__edge-path"
                d={edgePath}
                style={{ strokeWidth: 2, stroke: '#94a3b8' }}
            />
            <foreignObject
                width={120}
                height={40}
                x={(sourceX + targetX) / 2 - 60}
                y={(sourceY + targetY) / 2 - 20}
                className="overflow-visible"
            >
                <div className="flex items-center justify-center h-full w-full">
                    <input
                        className={cn(
                            "text-[10px] font-medium bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg px-2 py-1 text-center outline-none transition-all",
                            "hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200",
                            !edgeLabel && "opacity-50 italic"
                        )}
                        value={edgeLabel}
                        onChange={onLabelChange}
                        placeholder="Ajouter une mention..."
                    />
                </div>
            </foreignObject>
        </>
    );
}

const nodeTypes = {
    ecosystemNode: EcosystemNodeComponent,
};

const edgeTypes = {
    ecosystemEdge: EcosystemEdgeComponent,
};

export interface EcosystemEditorRef {
    addNode: () => void;
}

interface EcosystemEditorProps {
    initialNodes: EcosystemNode[];
    initialEdges: EcosystemEdge[];
    onSave: (nodes: EcosystemNode[], edges: EcosystemEdge[]) => void;
}

const EcosystemEditor = forwardRef<EcosystemEditorRef, EcosystemEditorProps>(({ initialNodes, initialEdges, onSave }, ref) => {
    const [showInstructions, setShowInstructions] = useState(true);

    const handleUpdateLabel = useCallback((id: string, label: string) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            label: label,
                        },
                    };
                }
                return node;
            })
        );
    }, []);

    const handleUpdateEdgeLabel = useCallback((id: string, label: string) => {
        setEdges((eds) =>
            eds.map((edge) => {
                if (edge.id === id) {
                    return {
                        ...edge,
                        label: label,
                    };
                }
                return edge;
            })
        );
    }, []);

    const [nodes, setNodes, onNodesChange] = useNodesState(
        initialNodes.map(n => ({
            ...n,
            type: 'ecosystemNode',
            data: { ...n, onUpdateLabel: handleUpdateLabel },
        }))
    );

    const [edges, setEdges, onEdgesChange] = useEdgesState(
        initialEdges.map(e => ({
            ...e,
            type: 'ecosystemEdge',
            animated: true,
            data: { onUpdateEdgeLabel: handleUpdateEdgeLabel },
            style: { strokeWidth: 2, stroke: '#94a3b8' },
        }))
    );

    // Sync state when initial props change
    useEffect(() => {
        setNodes(initialNodes.map(n => ({
            ...n,
            type: 'ecosystemNode',
            data: { ...n, onUpdateLabel: handleUpdateLabel },
        })));
        setEdges(initialEdges.map(e => ({
            ...e,
            type: 'ecosystemEdge',
            animated: true,
            data: { onUpdateEdgeLabel: handleUpdateEdgeLabel },
            style: { strokeWidth: 2, stroke: '#94a3b8' },
        })));
    }, [initialNodes, initialEdges, handleUpdateLabel, handleUpdateEdgeLabel, setNodes, setEdges]);

    useImperativeHandle(ref, () => ({
        addNode: () => {
            const id = `node_${Date.now()}`;
            const newNode: Node = {
                id,
                type: 'ecosystemNode',
                position: { x: Math.random() * 400, y: Math.random() * 400 },
                data: {
                    id,
                    label: 'Nouvel Acteur',
                    type: 'other' as EcosystemNodeType,
                    onUpdateLabel: handleUpdateLabel,
                },
            };
            setNodes((nds) => nds.concat(newNode));
        }
    }), [handleUpdateLabel, setNodes]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({
            ...params,
            type: 'ecosystemEdge',
            animated: true,
            data: { onUpdateEdgeLabel: handleUpdateEdgeLabel },
            style: { strokeWidth: 2, stroke: '#94a3b8' }
        }, eds)),
        [setEdges, handleUpdateEdgeLabel]
    );

    const handleSave = () => {
        const rawNodes: EcosystemNode[] = nodes.map(n => {
            const { onUpdateLabel, ...dataWithoutFn } = n.data;
            return {
                ...dataWithoutFn,
                position: n.position,
            };
        }) as EcosystemNode[];

        const rawEdges: EcosystemEdge[] = edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label?.toString(),
            type: e.type,
        })) as EcosystemEdge[];

        onSave(rawNodes, rawEdges);
    };

    return (
        <div className="w-full h-[700px] border-2 border-slate-100 rounded-3xl overflow-hidden bg-slate-50 relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
            >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
                <Controls />

                <Panel position="top-right" className="flex flex-col gap-2">
                    <Button onClick={handleSave} className="rounded-xl shadow-lg gap-2">
                        <Save className="h-4 w-4" />
                        Enregistrer les modifications
                    </Button>
                </Panel>

                {showInstructions && (
                    <Panel position="bottom-left" className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl border shadow-sm max-w-xs animate-in slide-in-from-left-4 duration-300">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                                <Info className="h-4 w-4 text-blue-500" />
                                <p className="text-xs font-bold">Mode Édition</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 rounded-full hover:bg-slate-100"
                                onClick={() => setShowInstructions(false)}
                            >
                                <Plus className="h-3 w-3 rotate-45" />
                            </Button>
                        </div>
                        <p className="text-[10px] text-slate-500">
                            Déplacez les bulles pour organiser votre écosystème. Cliquez sur le nom d'une bulle pour le modifier.
                            Tracez de nouveaux liens en glissant depuis les points gris. Cliquez sur un lien pour ajouter une mention.
                        </p>
                    </Panel>
                )}
            </ReactFlow>
        </div>
    );
});

EcosystemEditor.displayName = 'EcosystemEditor';

export const EcosystemEditorWrapper = forwardRef<EcosystemEditorRef, EcosystemEditorProps>((props, ref) => {
    return (
        <ReactFlowProvider>
            <EcosystemEditor {...props} ref={ref} />
        </ReactFlowProvider>
    );
});

EcosystemEditorWrapper.displayName = 'EcosystemEditorWrapper';
