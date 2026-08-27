'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { usePlanData } from '@/contexts/PlanDataContext';
import { useRiskMapping } from '@/contexts/RiskMappingContext';
import { useUser } from '@/contexts/UserContext';
import { useActivityLog } from '@/contexts/ActivityLogContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as LucideIcons from 'lucide-react';
import Link from 'next/link';
import { collection, query, getDocs, where, orderBy, limit, doc, deleteDoc, writeBatch, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MermaidWorkflow } from '@/types/compliance';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { printWorkflow } from '@/lib/workflowPrint';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkflowDomain } from '@/types/compliance';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

// Palette de couleurs pour les tags (cyclique)
const TAG_COLORS = [
    'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200',
    'bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200',
    'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200',
    'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200',
    'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200',
    'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200',
    'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-200',
];

const getTagColor = (tag: string) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) & 0xffffffff;
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

export default function AdminWorkflowsPage() {
    const [workflows, setWorkflows] = useState<MermaidWorkflow[]>([]);
    const [loading, setLoading] = useState(true);
    const [printingId, setPrintingId] = useState<string | null>(null);
    const [resettingV1, setResettingV1] = useState(false);
    const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
    const { planData, workflowTasks, availableUsers } = usePlanData();
    const { risks: allRisks } = useRiskMapping();
    const { user } = useUser();
    const { isAdmin } = useActivityLog();
    const router = useRouter();
    const { toast } = useToast();

    const userIsAdmin = user ? isAdmin(user.authEmail || user.email || '') : false;

    // ── Computed: all unique tags across all workflows ────────────────────────
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        workflows.forEach(w => (w.tags || []).forEach(t => tagSet.add(t)));
        return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'fr'));
    }, [workflows]);

    const handlePrintWorkflow = async (workflow: MermaidWorkflow) => {
        const wfId = workflow.workflowId || workflow.id;
        try {
            setPrintingId(wfId);
            toast({
                title: "Préparation de l'impression",
                description: `Formatage haute résolution 1 page pour "${workflow.name}"...`
            });

            let mermaidCode = '';

            if (db && workflow.id) {
                const vSnap = await getDocs(query(collection(db, 'workflows', workflow.id, 'versions'), orderBy('version', 'desc'), limit(1)));
                if (!vSnap.empty) {
                    mermaidCode = (vSnap.docs[0].data() as any).mermaidCode;
                }
            }

            if (!mermaidCode) {
                mermaidCode = `graph TD\n  Start["Démarrage: ${workflow.name}"] --> Step1["Analyse & Contrôle"]\n  Step1 --> EndNode["Validation"]`;
            }

            const riskInfo = getWorkflowRiskInfo(workflow.workflowId);

            await printWorkflow({
                name: workflow.name,
                workflowId: workflow.workflowId || workflow.id,
                domain: workflow.domain || 'Conformité',
                version: workflow.currentVersion || 1,
                code: mermaidCode,
                riskInfo: riskInfo ? {
                    totalRisks: riskInfo.count,
                    maxLevel: riskInfo.maxLevel,
                    avgScore: undefined
                } : null,
                planData,
                workflowTasks,
                availableUsers,
                allRisks
            });
        } catch (error) {
            console.error("Erreur impression:", error);
            toast({
                title: "Erreur d'impression",
                description: "Impossible d'imprimer ce workflow.",
                variant: "destructive"
            });
        } finally {
            setPrintingId(null);
        }
    };

    // ── Reset all workflows to V1 ─────────────────────────────────────────────
    const handleResetAllToV1 = async () => {
        if (!db || !userIsAdmin) return;
        setResettingV1(true);
        try {
            const batch = writeBatch(db);
            const now = new Date().toISOString();

            for (const w of workflows) {
                // Récupérer le code de la version la plus récente
                let latestCode = `graph TD\n  A["Début"] --> B["Fin"]`;
                const vSnap = await getDocs(
                    query(collection(db, 'workflows', w.id, 'versions'), orderBy('version', 'desc'), limit(1))
                );
                if (!vSnap.empty) {
                    latestCode = (vSnap.docs[0].data() as any).mermaidCode || latestCode;
                }

                // Créer une nouvelle version v1 (état de base)
                const vId = `v1-baseline-${Date.now()}-${w.id.slice(0, 6)}`;
                const vRef = doc(db, 'workflows', w.id, 'versions', vId);
                batch.set(vRef, {
                    id: vId,
                    mermaidCode: latestCode,
                    version: 1,
                    status: 'published',
                    createdAt: now,
                    updatedAt: now,
                    note: 'Baseline V1 — réinitialisé par administrateur',
                });

                // Mettre à jour le workflow parent
                const wRef = doc(db, 'workflows', w.id);
                batch.update(wRef, {
                    currentVersion: 1,
                    activeVersionId: vId,
                    updatedAt: now,
                });
            }

            await batch.commit();

            // Mettre à jour l'état local
            setWorkflows(prev => prev.map(w => ({ ...w, currentVersion: 1 })));

            toast({
                title: '✅ Workflows réinitialisés en V1',
                description: `${workflows.length} workflow(s) remis en version de base.`,
            });
        } catch (error) {
            console.error('Error resetting workflows to V1:', error);
            toast({
                title: 'Erreur lors de la réinitialisation',
                variant: 'destructive',
            });
        } finally {
            setResettingV1(false);
        }
    };

    const handleDeleteAll = async () => {
        if (!db) return;
        try {
            setLoading(true);
            const batch = writeBatch(db);
            workflows.forEach(w => {
                batch.delete(doc(db, 'workflows', w.id));
            });
            await batch.commit();
            setWorkflows([]);
            toast({
                title: "Tous les workflows ont été supprimés.",
                description: "La base de données a été mise à jour.",
            });
            router.refresh();
        } catch (error) {
            console.error('Error deleting all workflows:', error);
            toast({
                title: "Erreur lors de la suppression.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!db) return;
        try {
            await deleteDoc(doc(db, 'workflows', id));
            setWorkflows(prev => prev.filter(w => w.id !== id));
            toast({ title: "Workflow supprimé" });
        } catch (error) {
            console.error('Error deleting workflow:', error);
            toast({ title: "Erreur lors de la suppression", variant: "destructive" });
        }
    };

    useEffect(() => {
        const fetchWorkflows = async () => {
            if (!db) { setLoading(false); return; }
            try {
                const q = query(collection(db, 'workflows'), orderBy('updatedAt', 'desc'));
                const querySnapshot = await getDocs(q);
                const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as MermaidWorkflow));
                setWorkflows(docs);
            } catch (error) {
                console.error('Error fetching workflows:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchWorkflows();
    }, []);

    const getWorkflowRiskInfo = (workflowId: string) => {
        const collectLinkedTasks = (tasks: any[]): any[] => {
            let found: any[] = [];
            tasks.forEach(t => {
                if (t.grcWorkflowId === workflowId && t.risks && t.risks.length > 0) found.push(t);
                if (t.branches) t.branches.forEach((b: any) => { found = [...found, ...collectLinkedTasks(b.tasks)]; });
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
            if (lvl > maxLevel) { maxLevel = lvl; maxLevelLabel = r.riskLevel; }
        });

        return { maxLevel: maxLevelLabel, count: linkedRisks.length, config: riskBadgeConfig[maxLevelLabel] };
    };

    const domains: WorkflowDomain[] = ['Conformité', 'Commercial', 'Sinistre', 'Technique'];
    const [activeTab, setActiveTab] = useState<WorkflowDomain>('Conformité');

    const groupedWorkflows = useMemo(() => {
        const sensitiveDomains: WorkflowDomain[] = ['Conformité', 'Commercial', 'Sinistre', 'Technique'];
        const grouped: Record<string, MermaidWorkflow[]> = {
            'Conformité': [], 'Commercial': [], 'Sinistre': [], 'Technique': []
        };

        // Appliquer le filtre par tag avant le groupement
        const filtered = activeTagFilter
            ? workflows.filter(w => (w.tags || []).includes(activeTagFilter))
            : workflows;

        filtered.forEach(w => {
            const domain = w.domain && sensitiveDomains.includes(w.domain) ? w.domain : 'Conformité';
            if (grouped[domain]) grouped[domain].push(w);
            else grouped['Conformité'].push(w);
        });

        return grouped;
    }, [workflows, activeTagFilter]);

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestion des Workflows</h1>
                    <p className="text-muted-foreground">Configurez les processus métier via Mermaid</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                    {/* ── Admin : Reset V1 ──────────────────────────────── */}
                    {userIsAdmin && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 font-bold gap-2"
                                    disabled={workflows.length === 0 || resettingV1}
                                >
                                    {resettingV1
                                        ? <LucideIcons.Loader2 className="h-4 w-4 animate-spin" />
                                        : <LucideIcons.RefreshCcw className="h-4 w-4" />
                                    }
                                    Réinitialiser en V1
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2rem] border-2">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-2xl font-bold flex items-center gap-2">
                                        <LucideIcons.RefreshCcw className="h-6 w-6 text-amber-500" />
                                        Réinitialiser tous les workflows en V1 ?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-sm leading-relaxed">
                                        Cette action va <strong>figer l'état actuel de chaque workflow comme version de base (V1)</strong>.
                                        Les versions précédentes restent archivées. Le numéro de version sera remis à 1 pour tous les workflows.
                                        <br /><br />
                                        <span className="font-semibold text-amber-700">Cette action est réservée à l'administrateur.</span>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl font-bold">Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleResetAllToV1}
                                        className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold"
                                    >
                                        Confirmer la réinitialisation
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}

                    {/* ── Supprimer tout ───────────────────────────────── */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" disabled={workflows.length === 0}>
                                <LucideIcons.Trash2 className="mr-2 h-4 w-4" /> Tout supprimer
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2rem] border-2">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-2xl font-bold">Tout supprimer ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Cette action est irréversible. Tous les workflows de la base de données seront définitivement supprimés.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl font-bold">Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive hover:bg-destructive/90 text-white rounded-xl font-bold">
                                    Confirmer la suppression
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <Link href={`/admin/workflows/new?domain=${activeTab}`}>
                        <Button>
                            <LucideIcons.Plus className="mr-2 h-4 w-4" /> Nouveau Workflow
                        </Button>
                    </Link>
                </div>
            </div>

            {/* ── Tag filter bar ──────────────────────────────────────────── */}
            {allTags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                    <LucideIcons.Tag className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-xs font-bold uppercase text-slate-400 tracking-widest mr-1">Filtrer par tag</span>
                    <button
                        onClick={() => setActiveTagFilter(null)}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                            activeTagFilter === null
                                ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                        }`}
                    >
                        Tous ({workflows.length})
                    </button>
                    {allTags.map(tag => {
                        const count = workflows.filter(w => (w.tags || []).includes(tag)).length;
                        return (
                            <button
                                key={tag}
                                onClick={() => setActiveTagFilter(tag === activeTagFilter ? null : tag)}
                                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                                    activeTagFilter === tag
                                        ? 'ring-2 ring-offset-1 ring-indigo-400 shadow-sm ' + getTagColor(tag)
                                        : getTagColor(tag)
                                }`}
                            >
                                {tag}
                                <span className="ml-1.5 opacity-60">·{count}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Tabs by domain ──────────────────────────────────────────── */}
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
                                const wTags = w.tags || [];

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
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10">
                                                            <LucideIcons.Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="rounded-[2rem] border-2">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="font-bold">Supprimer ce workflow ?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Voulez-vous vraiment supprimer "{w.name}" ? Cela supprimera également toutes ses versions associées.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="rounded-xl font-bold">Annuler</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(w.id)} className="bg-destructive hover:bg-destructive/90 text-white rounded-xl font-bold">
                                                                Supprimer
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>

                                            <CardTitle className="text-xl">{w.name}</CardTitle>

                                            {/* Tags */}
                                            {wTags.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {wTags.map(tag => (
                                                        <button
                                                            key={tag}
                                                            onClick={() => setActiveTagFilter(tag === activeTagFilter ? null : tag)}
                                                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${getTagColor(tag)} ${activeTagFilter === tag ? 'ring-1 ring-offset-1 ring-current' : ''}`}
                                                        >
                                                            {tag}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Risk info */}
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

                                        <CardContent className="mt-auto pt-2 flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handlePrintWorkflow(w)}
                                                disabled={printingId === (w.workflowId || w.id)}
                                                className="h-10 w-10 shrink-0 rounded-xl border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 transition-all shadow-sm"
                                                title="Imprimer le workflow (1 page A4)"
                                            >
                                                {printingId === (w.workflowId || w.id) ? (
                                                    <LucideIcons.Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                                ) : (
                                                    <LucideIcons.Printer className="h-4 w-4 text-slate-600 hover:text-indigo-600" />
                                                )}
                                            </Button>
                                            <Link href={`/admin/workflows/${w.workflowId}/edit`} className="flex-1">
                                                <Button className="w-full rounded-xl group-hover:bg-primary/90 transition-colors" variant={activeW?.currentVersion ? "outline" : "default"}>
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
                                    {activeTagFilter ? (
                                        <>
                                            <p>Aucun workflow avec le tag <span className="font-medium text-foreground">"{activeTagFilter}"</span> dans <span className="font-medium text-foreground">{domain}</span>.</p>
                                            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setActiveTagFilter(null)}>
                                                <LucideIcons.X className="mr-1 h-3 w-3" /> Supprimer le filtre
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <p>Aucun workflow dans la catégorie <span className="font-medium text-foreground">{domain}</span>.</p>
                                            <Link href={`/admin/workflows/new?domain=${domain}`} className="mt-4 inline-block">
                                                <Button variant="outline" size="sm">
                                                    <LucideIcons.Plus className="mr-2 h-3 w-3" /> Créer un workflow
                                                </Button>
                                            </Link>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>

            {/* ── Info card ───────────────────────────────────────────────── */}
            <Card className="bg-blue-50/50 border-blue-100">
                <CardContent className="pt-6 flex gap-4">
                    <LucideIcons.Info className="h-5 w-5 text-blue-500 shrink-0" />
                    <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Comment ça marche ?</p>
                        <p>Sélectionnez un processus pour accéder à l'éditeur Mermaid. Les tags permettent de classer et filtrer vos workflows. Le score de risque est calculé automatiquement en fonction des risques associés aux tâches liées à ce workflow dans le Plan de Conformité.</p>
                        {userIsAdmin && (
                            <p className="mt-2 font-semibold text-amber-700">
                                ⚡ Administrateur : le bouton "Réinitialiser en V1" fige l'état actuel de tous les workflows comme nouvelle version de référence (V1).
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
