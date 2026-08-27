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
import { collection, query, getDocs, orderBy, limit, doc, deleteDoc, writeBatch, setDoc } from 'firebase/firestore';
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

// ── Catégories principales obligatoires ──────────────────────────────────────
export const WORKFLOW_CATEGORIES = ['LAB/FT', 'Veille Réglementaire'] as const;
export type WorkflowCategory = typeof WORKFLOW_CATEGORIES[number];

const CATEGORY_CONFIG: Record<WorkflowCategory, {
    icon: any;
    color: string;
    bg: string;
    border: string;
    badge: string;
    description: string;
}> = {
    'LAB/FT': {
        icon: LucideIcons.ShieldAlert,
        color: 'text-rose-700',
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        badge: 'bg-rose-100 text-rose-700 border-rose-200',
        description: 'Processus de Lutte Anti-Blanchiment et contre le Financement du Terrorisme',
    },
    'Veille Réglementaire': {
        icon: LucideIcons.BookOpen,
        color: 'text-indigo-700',
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        badge: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        description: 'Processus liés au suivi et à la mise en conformité des nouvelles exigences réglementaires',
    },
};

// ── Helpers de couleur tags ───────────────────────────────────────────────────
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
    if (tag === 'LAB/FT') return 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200';
    if (tag === 'Veille Réglementaire') return 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200';
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) & 0xffffffff;
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

// ── Risk helpers ──────────────────────────────────────────────────────────────
const riskLevelToNumber = (level: string): number => {
    switch (level) {
        case 'Faible': return 1; case 'Modéré': return 2; case 'Élevé': return 3; case 'Très élevé': return 4; default: return 0;
    }
};

const riskBadgeConfig: Record<string, { bg: string; text: string; border: string; icon: any }> = {
    'Faible': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: LucideIcons.ShieldCheck },
    'Modéré': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: LucideIcons.ShieldAlert },
    'Élevé': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: LucideIcons.AlertTriangle },
    'Très élevé': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: LucideIcons.Flame },
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminWorkflowsPage() {
    const [workflows, setWorkflows] = useState<MermaidWorkflow[]>([]);
    const [loading, setLoading] = useState(true);
    const [printingId, setPrintingId] = useState<string | null>(null);
    const [resettingV1, setResettingV1] = useState(false);
    const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<WorkflowCategory>('LAB/FT');
    const { planData, workflowTasks, availableUsers } = usePlanData();
    const { risks: allRisks } = useRiskMapping();
    const { user } = useUser();
    const { isAdmin } = useActivityLog();
    const router = useRouter();
    const { toast } = useToast();

    const userIsAdmin = user ? isAdmin(user.authEmail || user.email || '') : false;

    // ── All non-category tags ─────────────────────────────────────────────────
    const extraTags = useMemo(() => {
        const tagSet = new Set<string>();
        workflows.forEach(w => (w.tags || []).forEach(t => {
            if (!WORKFLOW_CATEGORIES.includes(t as WorkflowCategory)) tagSet.add(t);
        }));
        return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'fr'));
    }, [workflows]);

    // ── Group by active category, then optional extra tag filter ─────────────
    const filteredWorkflows = useMemo(() => {
        return workflows.filter(w => {
            const wTags = w.tags || [];
            const hasCategory = wTags.includes(activeCategory);
            const hasExtraTag = activeTagFilter ? wTags.includes(activeTagFilter) : true;
            return hasCategory && hasExtraTag;
        });
    }, [workflows, activeCategory, activeTagFilter]);

    // ── By domain within the filtered set ────────────────────────────────────
    const domains: WorkflowDomain[] = ['Conformité', 'Commercial', 'Sinistre', 'Technique'];
    const [activeDomain, setActiveDomain] = useState<WorkflowDomain>('Conformité');

    const groupedByDomain = useMemo(() => {
        const sensitiveDomains: WorkflowDomain[] = ['Conformité', 'Commercial', 'Sinistre', 'Technique'];
        const grouped: Record<string, MermaidWorkflow[]> = {
            'Conformité': [], 'Commercial': [], 'Sinistre': [], 'Technique': []
        };
        filteredWorkflows.forEach(w => {
            const domain = w.domain && sensitiveDomains.includes(w.domain) ? w.domain : 'Conformité';
            grouped[domain].push(w);
        });
        return grouped;
    }, [filteredWorkflows]);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        const fetch = async () => {
            if (!db) { setLoading(false); return; }
            try {
                const q = query(collection(db, 'workflows'), orderBy('updatedAt', 'desc'));
                const snap = await getDocs(q);
                setWorkflows(snap.docs.map(d => ({ id: d.id, ...d.data() } as MermaidWorkflow)));
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        fetch();
    }, []);

    // ── Risk info ─────────────────────────────────────────────────────────────
    const getWorkflowRiskInfo = (workflowId: string) => {
        const collect = (tasks: any[]): any[] => {
            let found: any[] = [];
            tasks.forEach(t => {
                if (t.grcWorkflowId === workflowId && t.risks?.length > 0) found.push(t);
                if (t.branches) t.branches.forEach((b: any) => { found = [...found, ...collect(b.tasks)]; });
            });
            return found;
        };
        const linkedTasks = planData.flatMap((cat: any) => cat.subCategories.flatMap((sub: any) => collect(sub.tasks)));
        if (linkedTasks.length === 0) return null;
        const allRiskIds = [...new Set(linkedTasks.flatMap((t: any) => t.risks || []))];
        const linkedRisks = allRisks.filter(r => allRiskIds.includes(r.id));
        if (linkedRisks.length === 0) return null;
        let maxLevel = 0; let maxLevelLabel = '';
        linkedRisks.forEach(r => {
            const lvl = riskLevelToNumber(r.riskLevel);
            if (lvl > maxLevel) { maxLevel = lvl; maxLevelLabel = r.riskLevel; }
        });
        return { maxLevel: maxLevelLabel, count: linkedRisks.length, config: riskBadgeConfig[maxLevelLabel] };
    };

    // ── Print ─────────────────────────────────────────────────────────────────
    const handlePrintWorkflow = async (workflow: MermaidWorkflow) => {
        const wfId = workflow.workflowId || workflow.id;
        try {
            setPrintingId(wfId);
            let mermaidCode = `graph TD\n  Start["Démarrage: ${workflow.name}"] --> End["Validation"]`;
            if (db && workflow.id) {
                const vSnap = await getDocs(query(collection(db, 'workflows', workflow.id, 'versions'), orderBy('version', 'desc'), limit(1)));
                if (!vSnap.empty) mermaidCode = (vSnap.docs[0].data() as any).mermaidCode;
            }
            const riskInfo = getWorkflowRiskInfo(workflow.workflowId);
            await printWorkflow({ name: workflow.name, workflowId: wfId, domain: workflow.domain || 'Conformité', version: workflow.currentVersion || 1, code: mermaidCode, riskInfo: riskInfo ? { totalRisks: riskInfo.count, maxLevel: riskInfo.maxLevel, avgScore: undefined } : null, planData, workflowTasks, availableUsers, allRisks });
        } catch (e) { toast({ title: "Erreur d'impression", variant: "destructive" }); } finally { setPrintingId(null); }
    };

    // ── Reset V1 ──────────────────────────────────────────────────────────────
    const handleResetAllToV1 = async () => {
        if (!db || !userIsAdmin) return;
        setResettingV1(true);
        try {
            const batch = writeBatch(db);
            const now = new Date().toISOString();
            for (const w of workflows) {
                let latestCode = `graph TD\n  A["Début"] --> B["Fin"]`;
                const vSnap = await getDocs(query(collection(db, 'workflows', w.id, 'versions'), orderBy('version', 'desc'), limit(1)));
                if (!vSnap.empty) latestCode = (vSnap.docs[0].data() as any).mermaidCode || latestCode;
                const vId = `v1-baseline-${Date.now()}-${w.id.slice(0, 6)}`;
                batch.set(doc(db, 'workflows', w.id, 'versions', vId), { id: vId, mermaidCode: latestCode, version: 1, status: 'published', createdAt: now, updatedAt: now, note: 'Baseline V1 — réinitialisé par administrateur' });
                batch.update(doc(db, 'workflows', w.id), { currentVersion: 1, activeVersionId: vId, updatedAt: now });
            }
            await batch.commit();
            setWorkflows(prev => prev.map(w => ({ ...w, currentVersion: 1 })));
            toast({ title: '✅ Workflows réinitialisés en V1', description: `${workflows.length} workflow(s) remis en version de base.` });
        } catch (e) { console.error(e); toast({ title: 'Erreur lors de la réinitialisation', variant: 'destructive' }); } finally { setResettingV1(false); }
    };

    const handleDeleteAll = async () => {
        if (!db) return;
        try {
            setLoading(true);
            const batch = writeBatch(db);
            workflows.forEach(w => batch.delete(doc(db, 'workflows', w.id)));
            await batch.commit();
            setWorkflows([]);
            toast({ title: "Tous les workflows ont été supprimés." });
            router.refresh();
        } catch (e) { toast({ title: "Erreur lors de la suppression.", variant: "destructive" }); } finally { setLoading(false); }
    };

    const handleDelete = async (id: string) => {
        if (!db) return;
        try {
            await deleteDoc(doc(db, 'workflows', id));
            setWorkflows(prev => prev.filter(w => w.id !== id));
            toast({ title: "Workflow supprimé" });
        } catch (e) { toast({ title: "Erreur lors de la suppression", variant: "destructive" }); }
    };

    const catCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        WORKFLOW_CATEGORIES.forEach(c => {
            counts[c] = workflows.filter(w => (w.tags || []).includes(c)).length;
        });
        return counts;
    }, [workflows]);

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestion des Workflows</h1>
                    <p className="text-muted-foreground text-sm">Processus métier organisés par catégorie réglementaire</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {userIsAdmin && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 font-bold gap-2" disabled={workflows.length === 0 || resettingV1}>
                                    {resettingV1 ? <LucideIcons.Loader2 className="h-4 w-4 animate-spin" /> : <LucideIcons.RefreshCcw className="h-4 w-4" />}
                                    Réinitialiser en V1
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2rem] border-2">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-2xl font-bold flex items-center gap-2">
                                        <LucideIcons.RefreshCcw className="h-6 w-6 text-amber-500" /> Réinitialiser tous les workflows en V1 ?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-sm leading-relaxed">
                                        Cette action va <strong>figer l'état actuel de chaque workflow comme version de base (V1)</strong>. Les versions précédentes restent archivées.
                                        <br /><br /><span className="font-semibold text-amber-700">Réservé à l'administrateur.</span>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl font-bold">Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleResetAllToV1} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold">Confirmer</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-white" disabled={workflows.length === 0}>
                                <LucideIcons.Trash2 className="mr-2 h-4 w-4" /> Tout supprimer
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2rem] border-2">
                            <AlertDialogHeader><AlertDialogTitle className="text-2xl font-bold">Tout supprimer ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel className="rounded-xl font-bold">Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-white rounded-xl font-bold">Confirmer</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Link href={`/admin/workflows/new?domain=Conformité`}>
                        <Button><LucideIcons.Plus className="mr-2 h-4 w-4" /> Nouveau Workflow</Button>
                    </Link>
                </div>
            </div>

            {/* ── Category selector (top-level) ────────────────────────── */}
            <div className="grid sm:grid-cols-2 gap-4">
                {WORKFLOW_CATEGORIES.map(cat => {
                    const cfg = CATEGORY_CONFIG[cat];
                    const CatIcon = cfg.icon;
                    const isActive = activeCategory === cat;
                    return (
                        <button
                            key={cat}
                            onClick={() => { setActiveCategory(cat); setActiveTagFilter(null); }}
                            className={`text-left p-5 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                                isActive
                                    ? `${cfg.bg} ${cfg.border} shadow-lg scale-[1.01]`
                                    : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                            }`}
                        >
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${isActive ? cfg.bg : 'bg-slate-50'} border ${isActive ? cfg.border : 'border-slate-100'}`}>
                                <CatIcon className={`h-6 w-6 ${isActive ? cfg.color : 'text-slate-400'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className={`font-black text-sm ${isActive ? cfg.color : 'text-slate-700'}`}>{cat}</p>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isActive ? cfg.badge : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                        {catCounts[cat]} workflow{catCounts[cat] !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{cfg.description}</p>
                            </div>
                            {isActive && <LucideIcons.CheckCircle2 className={`h-5 w-5 shrink-0 ${cfg.color}`} />}
                        </button>
                    );
                })}
            </div>

            {/* ── Extra tag filter bar ─────────────────────────────────── */}
            {extraTags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                    <LucideIcons.Tag className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-xs font-bold uppercase text-slate-400 tracking-widest mr-1">Filtrer par tag</span>
                    <button onClick={() => setActiveTagFilter(null)} className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${activeTagFilter === null ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                        Tous
                    </button>
                    {extraTags.map(tag => (
                        <button key={tag} onClick={() => setActiveTagFilter(tag === activeTagFilter ? null : tag)} className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${activeTagFilter === tag ? 'ring-2 ring-offset-1 ring-indigo-400 ' : ''} ${getTagColor(tag)}`}>
                            {tag}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Domain sub-tabs ──────────────────────────────────────── */}
            <Tabs value={activeDomain} onValueChange={(val) => setActiveDomain(val as WorkflowDomain)} className="w-full">
                <TabsList className="mb-4">
                    {domains.map(domain => (
                        <TabsTrigger key={domain} value={domain} className="px-4">
                            {domain}
                            <Badge variant="secondary" className="ml-2 text-[10px] h-5 px-1.5 min-w-[1.25rem]">
                                {groupedByDomain[domain]?.length || 0}
                            </Badge>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {domains.map(domain => (
                    <TabsContent key={domain} value={domain} className="space-y-4">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groupedByDomain[domain]?.length > 0 ? groupedByDomain[domain].map((w) => {
                                const activeW = workflows.find(wf => wf.workflowId === w.workflowId) || (w.id ? w : null);
                                const riskInfo = getWorkflowRiskInfo(w.workflowId);
                                const RiskIcon = riskInfo?.config?.icon || LucideIcons.Shield;
                                const wTags = (w.tags || []).filter(t => !WORKFLOW_CATEGORIES.includes(t as WorkflowCategory));

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
                                                        <AlertDialogHeader><AlertDialogTitle className="font-bold">Supprimer "{w.name}" ?</AlertDialogTitle><AlertDialogDescription>Toutes les versions associées seront supprimées.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter><AlertDialogCancel className="rounded-xl font-bold">Annuler</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(w.id)} className="bg-destructive text-white rounded-xl font-bold">Supprimer</AlertDialogAction></AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>

                                            <CardTitle className="text-xl">{w.name}</CardTitle>

                                            {/* Extra tags (not category tags) */}
                                            {wTags.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                    {wTags.map(tag => (
                                                        <button key={tag} onClick={() => setActiveTagFilter(tag === activeTagFilter ? null : tag)} className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${getTagColor(tag)} ${activeTagFilter === tag ? 'ring-1 ring-offset-1 ring-current' : ''}`}>
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
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${riskInfo.config.text}`}>Risque {riskInfo.maxLevel}</span>
                                                        <span className={`text-[10px] opacity-80 ${riskInfo.config.text}`}>{riskInfo.count} risque{riskInfo.count > 1 ? 's' : ''} détecté{riskInfo.count > 1 ? 's' : ''}</span>
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
                                            <Button variant="outline" size="icon" onClick={() => handlePrintWorkflow(w)} disabled={printingId === (w.workflowId || w.id)} className="h-10 w-10 shrink-0 rounded-xl border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 transition-all shadow-sm" title="Imprimer">
                                                {printingId === (w.workflowId || w.id) ? <LucideIcons.Loader2 className="h-4 w-4 animate-spin" /> : <LucideIcons.Printer className="h-4 w-4" />}
                                            </Button>
                                            <Link href={`/admin/workflows/${w.workflowId}/edit`} className="flex-1">
                                                <Button className="w-full rounded-xl" variant={activeW?.currentVersion ? "outline" : "default"}>
                                                    <LucideIcons.Edit2 className="mr-2 h-4 w-4" />
                                                    {activeW?.currentVersion ? "Modifier" : "Configurer"}
                                                </Button>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                );
                            }) : (
                                <div className="col-span-full py-16 text-center text-muted-foreground bg-slate-50 rounded-2xl border border-dashed">
                                    <LucideIcons.FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p className="font-medium">
                                        Aucun workflow <span className="text-foreground font-bold">{activeCategory}</span> dans <span className="text-foreground font-bold">{domain}</span>.
                                    </p>
                                    {activeTagFilter && (
                                        <Button variant="ghost" size="sm" className="mt-3" onClick={() => setActiveTagFilter(null)}>
                                            <LucideIcons.X className="mr-1 h-3 w-3" /> Supprimer le filtre tag
                                        </Button>
                                    )}
                                    <div className="mt-4">
                                        <Link href={`/admin/workflows/new?domain=${domain}`}>
                                            <Button variant="outline" size="sm">
                                                <LucideIcons.Plus className="mr-2 h-3 w-3" /> Créer un workflow {activeCategory}
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>

            {/* ── Info ────────────────────────────────────────────────── */}
            <Card className="bg-blue-50/50 border-blue-100">
                <CardContent className="pt-6 flex gap-4">
                    <LucideIcons.Info className="h-5 w-5 text-blue-500 shrink-0" />
                    <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Organisation des workflows</p>
                        <p>Chaque workflow doit appartenir à <strong>LAB/FT</strong> ou <strong>Veille Réglementaire</strong> (tag obligatoire). Des tags supplémentaires libres peuvent être ajoutés pour affiner la classification.</p>
                        {userIsAdmin && <p className="mt-2 font-semibold text-amber-700">⚡ Admin : "Réinitialiser en V1" fige l'état courant de tous les workflows comme baseline.</p>}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
