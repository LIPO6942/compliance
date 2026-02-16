'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { usePlanData } from '@/contexts/PlanDataContext';
import { useRiskMapping } from '@/contexts/RiskMappingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as LucideIcons from 'lucide-react';
import Link from 'next/link';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MermaidWorkflow } from '@/types/compliance';
import { doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

// Utilitaire pour le niveau de risque
const riskLevelToNumber = (level: string): number => {
    switch (level) {
        case 'Faible': return 1;
        case 'Modéré': return 2;
        case 'Élevé': return 3;
        case 'Très élevé': return 4;
        default: return 0;
    }
};

const riskBadgeConfig: Record<string, { bg: string; text: string; border: string; icon: any }> = {
    'Faible': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: LucideIcons.ShieldCheck },
    'Modéré': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: LucideIcons.ShieldAlert },
    'Élevé': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: LucideIcons.AlertTriangle },
    'Très élevé': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: LucideIcons.Flame },
};

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkflowDomain } from '@/types/compliance';

// ... (imports remain the same)

export default function AdminWorkflowsPage() {
    const [workflows, setWorkflows] = useState<MermaidWorkflow[]>([]);
    const [loading, setLoading] = useState(true);
    const { planData } = usePlanData();
    const { risks: allRisks } = useRiskMapping();
    const router = useRouter();

    const handleDeleteAll = async () => {
        if (!db) return;
        if (!confirm('Êtes-vous sûr de vouloir supprimer TOUS les workflows ? Cette action est irréversible.')) return;

        try {
            setLoading(true);
            const batch = writeBatch(db);
            workflows.forEach(w => {
                batch.delete(doc(db, 'workflows', w.id));
            });
            await batch.commit();
            setWorkflows([]);
            alert('Tous les workflows ont été supprimés.');
            router.refresh();
        } catch (error) {
            console.error('Error deleting all workflows:', error);
            alert('Erreur lors de la suppression.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!db) return;
        if (!confirm('Supprimer ce workflow ?')) return;
        try {
            await deleteDoc(doc(db, 'workflows', id));
            setWorkflows(prev => prev.filter(w => w.id !== id));
        } catch (error) {
            console.error('Error deleting workflow:', error);
        }
    };

    useEffect(() => {
        const fetchWorkflows = async () => {
            if (!db) {
                setLoading(false);
                return;
            }
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

    const defaultWorkflows: any[] = [];

    const getWorkflowRiskInfo = (workflowId: string) => {
        // Collecter toutes les tâches liées à ce workflow
        const collectLinkedTasks = (tasks: any[]): any[] => {
            let found: any[] = [];
            tasks.forEach(t => {
                if (t.grcWorkflowId === workflowId && t.risks && t.risks.length > 0) {
                    found.push(t);
                }
                if (t.branches) {
                    t.branches.forEach((b: any) => {
                        found = [...found, ...collectLinkedTasks(b.tasks)];
                    });
                }
            });
            return found;
        };

        const linkedTasks = planData.flatMap((cat: any) =>
            cat.subCategories.flatMap((sub: any) => collectLinkedTasks(sub.tasks))
        );

        if (linkedTasks.length === 0) return null;

        const allRiskIds = [...new Set(linkedTasks.flatMap((t: any) => t.risks || []))];
        const linkedRisks = allRisks.filter(r => allRiskIds.includes(r.id));

        if (linkedRisks.length === 0) return null;

        let maxLevel = 0;
        let maxLevelLabel = '';

        linkedRisks.forEach(r => {
            const lvl = riskLevelToNumber(r.riskLevel);
            if (lvl > maxLevel) {
                maxLevel = lvl;
                maxLevelLabel = r.riskLevel;
            }
        });

        return {
            maxLevel: maxLevelLabel,
            count: linkedRisks.length,
            config: riskBadgeConfig[maxLevelLabel]
        };
    };

    const groupedWorkflows = useMemo(() => {
        const sensitiveDomains: WorkflowDomain[] = ['Conformité', 'Commercial', 'Sinistre', 'Technique'];
        const grouped: Record<string, MermaidWorkflow[]> = {
            'Conformité': [],
            'Commercial': [],
            'Sinistre': [],
            'Technique': []
        };

        (workflows.length > 0 ? workflows : defaultWorkflows).forEach(w => {
            // Si le domaine est valide, on l'utilise. Sinon, on met dans "Conformité" par défaut.
            // On considère aussi 'Autre' comme devant aller dans 'Conformité' maintenant.
            const domain = w.domain && sensitiveDomains.includes(w.domain) ? w.domain : 'Conformité';

            if (grouped[domain]) {
                grouped[domain].push(w);
            } else {
                // Should not happen based on logic above, but fallback
                grouped['Conformité'].push(w);
            }
        });

        return grouped;
    }, [workflows]);

    const domains: WorkflowDomain[] = ['Conformité', 'Commercial', 'Sinistre', 'Technique'];

    const [activeTab, setActiveTab] = useState<WorkflowDomain>('Conformité');

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestion des Workflows</h1>
                    <p className="text-muted-foreground">Configurez les processus métier via Mermaid</p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={handleDeleteAll} disabled={workflows.length === 0}>
                        <LucideIcons.Trash2 className="mr-2 h-4 w-4" /> Tout supprimer
                    </Button>
                    <Link href={`/admin/workflows/new?domain=${activeTab}`}>
                        <Button>
                            <LucideIcons.Plus className="mr-2 h-4 w-4" /> Nouveau Workflow
                        </Button>
                    </Link>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as WorkflowDomain)} className="w-full">
                <TabsList className="mb-4">
                    {domains.map(domain => (
                        <TabsTrigger key={domain} value={domain} className="px-4">
                            {domain}
                            <Badge variant="secondary" className="ml-2 text-[10px] h-5 px-1.5 min-w-[1.25rem]">
                                {groupedWorkflows[domain]?.length || 0}
                            </Badge>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {domains.map(domain => (
                    <TabsContent key={domain} value={domain} className="space-y-4">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groupedWorkflows[domain]?.length > 0 ? groupedWorkflows[domain].map((w) => {
                                const activeW = workflows.find(wf => wf.workflowId === w.workflowId) || (w.id ? w : null);
                                const riskInfo = getWorkflowRiskInfo(w.workflowId);
                                const RiskIcon = riskInfo?.config?.icon || LucideIcons.Shield;

                                return (
                                    <Card key={w.id || w.workflowId} className="group hover:shadow-md transition-all flex flex-col">
                                        <CardHeader>
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="outline" className="opacity-50 text-[10px]">ID: {w.workflowId}</Badge>
                                                {activeW?.currentVersion ? (
                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600">V{activeW.currentVersion}</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="opacity-50">Inactif</Badge>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(w.id)}>
                                                    <LucideIcons.Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <CardTitle className="text-xl flex items-center justify-between">
                                                {w.name}
                                            </CardTitle>
                                            {riskInfo ? (
                                                <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border ${riskInfo.config.bg} ${riskInfo.config.border}`}>
                                                    <RiskIcon className={`h-4 w-4 ${riskInfo.config.text}`} />
                                                    <div className="flex flex-col">
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${riskInfo.config.text}`}>
                                                            Risque {riskInfo.maxLevel}
                                                        </span>
                                                        <span className={`text-[10px] opacity-80 ${riskInfo.config.text}`}>
                                                            {riskInfo.count} risque{riskInfo.count > 1 ? 's' : ''} détecté{riskInfo.count > 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-3 px-3 py-2 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center gap-2 text-slate-400">
                                                    <LucideIcons.ShieldCheck className="h-4 w-4" />
                                                    <span className="text-xs font-medium">Aucun risque détecté</span>
                                                </div>
                                            )}
                                        </CardHeader>
                                        <CardContent className="mt-auto">
                                            <Link href={`/admin/workflows/${w.workflowId}/edit`}>
                                                <Button className="w-full group-hover:bg-primary/90 transition-colors" variant={activeW?.currentVersion ? "outline" : "default"}>
                                                    <LucideIcons.Edit2 className="mr-2 h-4 w-4" />
                                                    {activeW?.currentVersion ? "Modifier le workflow" : "Configurer"}
                                                </Button>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                );
                            }) : (
                                <div className="col-span-full py-12 text-center text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
                                    <LucideIcons.FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p>Aucun workflow dans la catégorie <span className="font-medium text-foreground">{domain}</span>.</p>
                                    <Link href={`/admin/workflows/new?domain=${domain}`} className="mt-4 inline-block">
                                        <Button variant="outline" size="sm">
                                            <LucideIcons.Plus className="mr-2 h-3 w-3" /> Créer un workflow
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>

            <Card className="bg-blue-50/50 border-blue-100">
                <CardContent className="pt-6 flex gap-4">
                    <LucideIcons.Info className="h-5 w-5 text-blue-500 shrink-0" />
                    <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Comment ça marche ?</p>
                        <p>Sélectionnez un processus pour accéder à l'éditeur Mermaid. Le score de risque est calculé automatiquement en fonction des risques associés aux tâches liées à ce workflow dans le Plan de Conformité.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
