'use client';

import React, { useState } from 'react';
import { useEcosystem } from '@/contexts/EcosystemContext';
import { EcosystemUpload } from '@/components/ecosystem/EcosystemUpload';
import { EcosystemEditorWrapper } from '@/components/ecosystem/EcosystemEditor';
import { EcosystemMap } from '@/types/compliance';
import { Loader2, Share2, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EcosystemPage() {
    const { ecosystemMap, loading, saveEcosystemMap } = useEcosystem();
    const [draftMap, setDraftMap] = useState<Omit<EcosystemMap, 'id' | 'createdAt' | 'updatedAt'> | null>(null);

    if (loading) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const handleAISuccess = (map: Omit<EcosystemMap, 'id' | 'createdAt' | 'updatedAt'>) => {
        setDraftMap(map);
    };

    const handleSaveMap = async (nodes: any[], edges: any[]) => {
        const mapToSave: EcosystemMap = {
            id: ecosystemMap?.id || 'main',
            name: ecosystemMap?.name || draftMap?.name || 'Ma Cartographie',
            section: ecosystemMap?.section || draftMap?.section || 'general',
            nodes,
            edges,
            createdAt: ecosystemMap?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        await saveEcosystemMap(mapToSave);
        setDraftMap(null); // Clear draft once saved
    };

    const currentMap = ecosystemMap || draftMap;

    return (
        <div className="container py-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div className="space-y-1">
                    <p className="text-sm font-bold text-primary uppercase tracking-widest">Gouvernance</p>
                    <h1 className="text-4xl font-black">Cartographie des Acteurs</h1>
                    <p className="text-slate-500 max-w-2xl">
                        Visualisez et gérez les interactions entre les autorités de tutelle, les entités judiciaires et votre organisation.
                    </p>
                </div>

                {ecosystemMap && (
                    <div className="flex gap-2">
                        <Button variant="outline" className="rounded-xl gap-2 font-bold">
                            <Plus className="h-4 w-4" />
                            Nouveau Nœud
                        </Button>
                        <Button variant="outline" className="rounded-xl gap-2 font-bold">
                            <Share2 className="h-4 w-4" />
                            Exporter
                        </Button>
                    </div>
                )}
            </div>

            {!currentMap ? (
                <EcosystemUpload onValidated={handleAISuccess} />
            ) : (
                <div className="space-y-4">
                    {draftMap && !ecosystemMap && (
                        <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
                                <p className="text-sm font-medium text-amber-800">
                                    L'IA a généré une structure. Vous pouvez la modifier avant de l'enregistrer.
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDraftMap(null)}
                                className="text-amber-800 hover:bg-amber-100"
                            >
                                Annuler
                            </Button>
                        </div>
                    )}

                    <EcosystemEditorWrapper
                        initialNodes={currentMap.nodes}
                        initialEdges={currentMap.edges}
                        onSave={handleSaveMap}
                    />
                </div>
            )}
        </div>
    );
}
