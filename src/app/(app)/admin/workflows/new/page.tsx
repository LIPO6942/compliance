
'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkflowDomain } from '@/types/compliance';

export default function NewWorkflowPage() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [workflowId, setWorkflowId] = useState('');

    const domains: WorkflowDomain[] = ['Conformité', 'Commercial', 'Sinistre', 'Technique'];

    // Lire le domaine depuis l'URL s'il existe
    const domainFromUrl = searchParams.get('domain') as WorkflowDomain;
    const initialDomain = (domainFromUrl && domains.includes(domainFromUrl)) ? domainFromUrl : 'Conformité';

    const [domain, setDomain] = useState<WorkflowDomain>(initialDomain);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !name || !workflowId) return;

        setLoading(true);
        try {
            const cleanId = workflowId.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

            // 1. Initialiser le workflow principal
            const workflowRef = doc(db, 'workflows', cleanId);

            // 2. Créer une version initiale (v1)
            const initialVersion = {
                versionId: 'v1',
                mermaidCode: `graph TD
    Start(Début) --> Action1[Première Étape]
    Action1 --> End(Fin)`,
                createdAt: new Date().toISOString(),
                published: true,
                changeLog: 'Version initiale'
            };

            const versionsCol = collection(db, 'workflows', cleanId, 'versions');
            const vDoc = await addDoc(versionsCol, initialVersion);

            // 3. Mettre à jour le workflow avec l'activeVersionId
            await setDoc(workflowRef, {
                workflowId: cleanId,
                name: name,
                domain: domain,
                currentVersion: 1,
                activeVersionId: vDoc.id,
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
                order: 0
            });

            router.push(`/admin/workflows/${cleanId}/edit`);
        } catch (error) {
            console.error('Error creating workflow:', error);
            alert('Erreur lors de la création du workflow.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-6">
            <Link href="/admin/workflows" className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à la liste
            </Link>

            <Card className="border-2">
                <form onSubmit={handleSubmit}>
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold">Nouveau Processus</CardTitle>
                        <CardDescription>
                            Configurez les informations de base de votre nouveau processus métier.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nom du processus</Label>
                            <Input
                                id="name"
                                placeholder="ex: Validation des Documents"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="domain">Domaine métier</Label>
                            <Select value={domain} onValueChange={(val) => setDomain(val as WorkflowDomain)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un domaine" />
                                </SelectTrigger>
                                <SelectContent>
                                    {domains.map((d) => (
                                        <SelectItem key={d} value={d}>
                                            {d}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="workflowId">Identifiant (ID)</Label>
                            <Input
                                id="workflowId"
                                placeholder="ex: validation-docs"
                                value={workflowId}
                                onChange={(e) => setWorkflowId(e.target.value)}
                                required
                            />
                            <p className="text-[10px] text-muted-foreground">
                                L'identifiant doit être unique et comporter uniquement des lettres minuscules, chiffres et tirets.
                            </p>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-3 pt-6">
                        <Button type="button" variant="outline" onClick={() => router.back()}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création...</>
                            ) : (
                                <><Save className="mr-2 h-4 w-4" /> Créer et Continuer</>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
