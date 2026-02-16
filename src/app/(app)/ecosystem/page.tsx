'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useEcosystem } from '@/contexts/EcosystemContext';
import { EcosystemUpload } from '@/components/ecosystem/EcosystemUpload';
import { EcosystemEditorWrapper, EcosystemEditorRef } from '@/components/ecosystem/EcosystemEditor';
import { EcosystemMap } from '@/types/compliance';
import { Loader2, Plus, Download, Edit2, Check, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toPng } from 'html-to-image';
import { cn } from '@/lib/utils';

export default function EcosystemPage() {
    const {
        ecosystems,
        currentMap,
        currentMapId,
        loading,
        setCurrentMapId,
        saveEcosystemMap,
        renameEcosystemMap
    } = useEcosystem();

    const [draftMap, setDraftMap] = useState<Omit<EcosystemMap, 'id' | 'createdAt' | 'updatedAt'> | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');

    const editorRef = useRef<EcosystemEditorRef>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (currentMap) {
            setTempName(currentMap.name);
        }
    }, [currentMap]);

    if (loading) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const handleAISuccess = (map: Omit<EcosystemMap, 'id' | 'createdAt' | 'updatedAt'>) => {
        setDraftMap(map);
        setIsCreating(false);
    };

    const handleSaveMap = async (nodes: any[], edges: any[]) => {
        const isNew = !currentMapId && draftMap;
        const mapToSave: EcosystemMap = {
            id: currentMapId || '',
            name: (isNew ? draftMap?.name : currentMap?.name) || 'Ma Cartographie',
            section: (isNew ? draftMap?.section : currentMap?.section) || 'general',
            nodes,
            edges,
            createdAt: (isNew ? undefined : currentMap?.createdAt) || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        await saveEcosystemMap(mapToSave);
        setDraftMap(null);
    };

    const handleAddNode = () => {
        editorRef.current?.addNode();
    };

    const handleExport = async () => {
        if (containerRef.current === null) return;

        try {
            const dataUrl = await toPng(containerRef.current, {
                backgroundColor: '#f8fafc',
                cacheBust: true,
                style: {
                    borderRadius: '0',
                }
            });
            const link = document.createElement('a');
            link.download = `ecosystem-${new Date().toISOString().split('T')[0]}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Export failed:', err);
        }
    };

    const handleRename = async () => {
        if (currentMapId && tempName.trim() && tempName !== currentMap?.name) {
            await renameEcosystemMap(currentMapId, tempName.trim());
        }
        setIsEditingName(false);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Êtes-vous sûr de vouloir supprimer cette cartographie ?')) {
            await deleteEcosystemMap(id);
        }
    };

    const activeMap = draftMap || currentMap;

    return (
        <div className="container py-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-start gap-4">
                <div className="space-y-1 flex-1">
                    <p className="text-sm font-bold text-primary uppercase tracking-widest">Gouvernance</p>
                    <div className="flex items-center gap-3">
                        {isEditingName && currentMap ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    className="text-4xl font-black h-14 bg-white border-2 border-primary/20 rounded-xl"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleRename();
                                        if (e.key === 'Escape') setIsEditingName(false);
                                    }}
                                />
                                <Button size="icon" onClick={handleRename} className="h-14 w-14 rounded-xl">
                                    <Check className="h-6 w-6" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => setIsEditingName(false)} className="h-14 w-14 rounded-xl">
                                    <X className="h-6 w-6 text-slate-400" />
                                </Button>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-4xl font-black">
                                    {activeMap?.name || "Cartographie des Acteurs"}
                                </h1>
                                {currentMap && !draftMap && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsEditingName(true)}
                                        className="h-10 w-10 text-slate-400 hover:text-primary"
                                    >
                                        <Edit2 className="h-5 w-5" />
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                    <p className="text-slate-500 max-w-2xl">
                        Visualisez et gérez les interactions entre les autorités de tutelle, les entités judiciaires et votre organisation.
                    </p>
                </div>

                <div className="flex gap-2">
                    {activeMap && (
                        <>
                            <Button
                                variant="outline"
                                className="rounded-xl gap-2 font-bold"
                                onClick={handleAddNode}
                            >
                                <Plus className="h-4 w-4" />
                                Nouveau Nœud
                            </Button>
                            <Button
                                variant="outline"
                                className="rounded-xl gap-2 font-bold"
                                onClick={handleExport}
                            >
                                <Download className="h-4 w-4" />
                                Exporter
                            </Button>
                        </>
                    )}
                    <Button
                        className="rounded-xl gap-2 font-bold shadow-lg shadow-primary/20 px-6"
                        onClick={() => {
                            setDraftMap(null);
                            setIsCreating(true);
                            setCurrentMapId(null);
                        }}
                    >
                        <Plus className="h-4 w-4" />
                        Nouvelle Cartographie
                    </Button>
                </div>
            </div>

            {/* Selection UI */}
            {!isCreating && !draftMap && ecosystems.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-2">
                    {ecosystems.map((map) => (
                        <div key={map.id} className="relative group/item">
                            <button
                                onClick={() => setCurrentMapId(map.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold border-2 pr-10",
                                    currentMapId === map.id
                                        ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                                        : "bg-white text-slate-600 border-slate-100 hover:border-primary/30 hover:bg-slate-50"
                                )}
                            >
                                <FileText className={cn("h-4 w-4", currentMapId === map.id ? "text-white" : "text-primary")} />
                                {map.name}
                            </button>
                            <button
                                onClick={(e) => handleDelete(e, map.id)}
                                className={cn(
                                    "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all",
                                    currentMapId === map.id
                                        ? "hover:bg-white/20 text-white"
                                        : "hover:bg-rose-50 text-rose-500"
                                )}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {isCreating || (!activeMap && ecosystems.length === 0) ? (
                <div className="space-y-4">
                    {isCreating && ecosystems.length > 0 && (
                        <Button variant="ghost" className="gap-2" onClick={() => setIsCreating(false)}>
                            <X className="h-4 w-4" /> Annuler
                        </Button>
                    )}
                    <EcosystemUpload onValidated={handleAISuccess} />
                </div>
            ) : (
                <div className="space-y-4">
                    {draftMap && (
                        <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
                                <p className="text-sm font-medium text-amber-800">
                                    L'IA a généré une structure pour "{draftMap.name}". Vous pouvez la modifier avant de l'enregistrer.
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDraftMap(null)}
                                className="text-amber-800 hover:bg-amber-100 font-bold"
                            >
                                <X className="h-4 w-4 mr-1" />
                                Annuler
                            </Button>
                        </div>
                    )}

                    <div ref={containerRef} className="rounded-3xl overflow-hidden border-2 border-slate-100 shadow-xl bg-white min-h-[600px]">
                        {activeMap && (
                            <EcosystemEditorWrapper
                                ref={editorRef}
                                initialNodes={activeMap.nodes}
                                initialEdges={activeMap.edges}
                                onSave={handleSaveMap}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
