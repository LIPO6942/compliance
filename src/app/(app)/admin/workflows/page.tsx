'use client';

import React, { useEffect, useState } from 'react';
import { usePlanData } from '@/contexts/PlanDataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as LucideIcons from 'lucide-react';
import Link from 'next/link';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MermaidWorkflow } from '@/types/compliance';

export default function AdminWorkflowsPage() {
    const [workflows, setWorkflows] = useState<MermaidWorkflow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWorkflows = async () => {
            try {
                const q = query(collection(db, 'workflows'), orderBy('updatedAt', 'desc'));
                const querySnapshot = await getDocs(q);
                const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MermaidWorkflow));
                setWorkflows(docs);
            } catch (error) {
                console.error('Error fetching workflows:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchWorkflows();
    }, []);

    const defaultWorkflows = [
        { id: 'processus-eer', name: 'Entrée en Relation', workflowId: 'processus-eer' },
        { id: 'processus-gel', name: 'Gel des Avoirs', workflowId: 'processus-gel' },
        { id: 'processus-monitoring', name: 'Monitoring', workflowId: 'processus-monitoring' },
    ];

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestion des Workflows</h1>
                    <p className="text-muted-foreground">Configurez les processus métier via Mermaid.js</p>
                </div>
                <Button disabled>
                    <LucideIcons.Plus className="mr-2 h-4 w-4" /> Nouveau Workflow
                </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {defaultWorkflows.map((w) => {
                    const activeW = workflows.find(wf => wf.workflowId === w.workflowId);
                    return (
                        <Card key={w.id} className="group hover:shadow-md transition-all">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-xl">{w.name}</CardTitle>
                                    {activeW ? (
                                        <Badge variant="secondary">V{activeW.currentVersion}</Badge>
                                    ) : (
                                        <Badge variant="outline" className="opacity-50">Non configuré</Badge>
                                    )}
                                </div>
                                <CardDescription>ID: {w.workflowId}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Link href={`/admin/workflows/${w.workflowId}/edit`}>
                                    <Button className="w-full" variant={activeW ? "outline" : "default"}>
                                        <LucideIcons.Edit2 className="mr-2 h-4 w-4" />
                                        {activeW ? "Modifier" : "Configurer"}
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Card className="bg-blue-50/50 border-blue-100">
                <CardContent className="pt-6 flex gap-4">
                    <LucideIcons.Info className="h-5 w-5 text-blue-500 shrink-0" />
                    <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Comment ça marche ?</p>
                        <p>Sélectionnez un processus pour accéder à l'éditeur Mermaid. Vous pourrez définir les étapes, les branchements et l'interactivité. Chaque publication crée une nouvelle version archivée.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
