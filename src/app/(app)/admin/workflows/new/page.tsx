'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Play } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { WorkflowDomain, MermaidWorkflow } from '@/types/compliance';

function NewWorkflowForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    // Initial domain from URL or default
    const initialDomain = (searchParams.get('domain') as WorkflowDomain) || 'Conformité';

    const [name, setName] = useState('');
    const [domain, setDomain] = useState<WorkflowDomain>(initialDomain);
    const [loading, setLoading] = useState(false);

    const domains: WorkflowDomain[] = ['Conformité', 'Commercial', 'Sinistre', 'Technique'];

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast({
                title: "Nom requis",
                description: "Veuillez donner un nom au workflow.",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);

        try {
            // Generate ID manually since we are client-side
            const newId = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
            const now = new Date().toISOString();

            const newWorkflow: MermaidWorkflow = {
                id: newId,
                workflowId: newId,
                name: name.trim(),
                domain: domain,
                currentVersion: 0,
                createdAt: now,
                updatedAt: now,
                // activeVersionId is undefined initially
            };

            if (db) {
                await setDoc(doc(db, 'workflows', newId), newWorkflow);
                toast({
                    title: "Workflow créé",
                    description: "Redirection vers l'éditeur...",
                });
                router.push(`/admin/workflows/${newId}/edit`);
            } else {
                toast({
                    title: "Erreur",
                    description: "Base de données non disponible.",
                    variant: "destructive"
                });
                setLoading(false);
            }

        } catch (error) {
            console.error('Error creating workflow:', error);
            toast({
                title: "Erreur",
                description: "Impossible de créer le workflow.",
                variant: "destructive"
            });
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)] p-4">
            <Card className="w-full max-w-lg shadow-xl">
                <CardHeader>
                    <CardTitle className="text-2xl">Nouveau Workflow</CardTitle>
                    <CardDescription>Configurez les informations de base pour commencer.</CardDescription>
                </CardHeader>
                <form onSubmit={handleCreate}>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nom du processus</Label>
                            <Input
                                id="name"
                                placeholder="ex: Validation Notes de Frais"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="domain">Domaine</Label>
                            <Select value={domain} onValueChange={(val) => setDomain(val as WorkflowDomain)}>
                                <SelectTrigger id="domain">
                                    <SelectValue placeholder="Sélectionnez un domaine" />
                                </SelectTrigger>
                                <SelectContent>
                                    {domains.map(d => (
                                        <SelectItem key={d} value={d}>{d}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t pt-6 bg-slate-50/50 dark:bg-slate-900/20">
                        <Button type="button" variant="ghost" onClick={() => router.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Annuler
                        </Button>
                        <Button type="submit" disabled={loading} className="min-w-[120px]">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                            Créer
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

export default function NewWorkflowPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-8 items-center h-[calc(100vh-10rem)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <NewWorkflowForm />
        </Suspense>
    );
}
