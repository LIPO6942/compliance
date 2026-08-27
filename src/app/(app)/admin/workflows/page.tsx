'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { usePlanData } from '@/contexts/PlanDataContext';
import { useRiskMapping } from '@/contexts/RiskMappingContext';
import { useUser } from '@/contexts/UserContext';
import { useActivityLog } from '@/contexts/ActivityLogContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as LucideIcons from 'lucide-react';
import Link from 'next/link';
import { collection, query, getDocs, orderBy, limit, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MermaidWorkflow } from '@/types/compliance';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { printWorkflow } from '@/lib/workflowPrint';
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

// ── Catégories obligatoires ───────────────────────────────────────────────────
const WORKFLOW_CATEGORIES = ['LAB/FT', 'Veille Réglementaire'] as const;
type WorkflowCategory = typeof WORKFLOW_CATEGORIES[number];
const DEFAULT_CATEGORY: WorkflowCategory = 'LAB/FT'; // fallback pour les anciens workflows

const CATEGORY_CONFIG: Record<WorkflowCategory, {
    icon: any; color: string; bg: string; border: string; badge: string; gradientFrom: string; description: string;
}> = {
    'LAB/FT': {
        icon: LucideIcons.ShieldAlert,
        color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200',
        badge: 'bg-rose-100 text-rose-700 border-rose-200',
        gradientFrom: 'from-rose-500',
        description: 'Lutte Anti-Blanchiment et Financement du Terrorisme',
    },
    'Veille Réglementaire': {
        icon: LucideIcons.BookOpen,
        color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200',
        badge: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        gradientFrom: 'from-indigo-500',
        description: 'Suivi et mise en conformité des nouvelles exigences réglementaires',
    },
};

// ── Tag color helper ──────────────────────────────────────────────────────────
const TAG_COLORS = [
    'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200',
    'bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200',
    'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200',
    'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200',
    'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200',
    'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-200',
];
const getTagColor = (tag: string) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) & 0xffffffff;
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

/** Retourne la catégorie d'un workflow. Fallback = LAB/FT pour les anciens. */
const getWorkflowCategory = (w: MermaidWorkflow): WorkflowCategory => {
    const found = (w.tags || []).find(t => WORKFLOW_CATEGORIES.includes(t as WorkflowCategory));
    return (found as WorkflowCategory) || DEFAULT_CATEGORY;
};

// ── Risk helpers ──────────────────────────────────────────────────────────────
const riskLevelToNumber = (l: string) => ({ 'Faible': 1, 'Modéré': 2, 'Élevé': 3, 'Très élevé': 4 }[l] || 0);
const riskBadgeConfig: Record<string, { bg: string; text: string; border: string; icon: any }> = {
    'Faible':     { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: LucideIcons.ShieldCheck },
    'Modéré':     { bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200',  icon: LucideIcons.ShieldAlert },
    'Élevé':      { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  icon: LucideIcons.AlertTriangle },
    'Très élevé': { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    icon: LucideIcons.Flame },
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminWorkflowsPage() {
    const [workflows, setWorkflows] = useState<MermaidWorkflow[]>([]);
    const [loading, setLoading] = useState(true);
    const [printingId, setPrintingId] = useState<string | null>(null);
    const [resettingV1, setResettingV1] = useState(false);
    const [activeCategory, setActiveCategory] = useState<WorkflowCategory>('LAB/FT');
    const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
    const { planData, workflowTasks, availableUsers } = usePlanData();
    const { risks: allRisks } = useRiskMapping();
    const { user } = useUser();
    const { isAdmin } = useActivityLog();
    const router = useRouter();
    const { toast } = useToast();

    const userIsAdmin = user ? isAdmin(user.authEmail || user.email || '') : false;

    // ── Fetch ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            if (!db) { setLoading(false); return; }
            try {
                const snap = await getDocs(query(collection(db, 'workflows'), orderBy('updatedAt', 'desc')));
                setWorkflows(snap.docs.map(d => ({ id: d.id, ...d.data() } as MermaidWorkflow)));
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        load();
    }, []);

    // ── Category counts (with fallback) ───────────────────────────────────────
    const catCounts = useMemo(() => {
        const counts: Record<WorkflowCategory, number> = { 'LAB/FT': 0, 'Veille Réglementaire': 0 };
        workflows.forEach(w => { counts[getWorkflowCategory(w)]++; });
        return counts;
    }, [workflows]);

    // ── Extra tags (non-category) ─────────────────────────────────────────────
    const extraTags = useMemo(() => {
        const s = new Set<string>();
        workflows
            .filter(w => getWorkflowCategory(w) === activeCategory)
            .forEach(w => (w.tags || []).forEach(t => {
                if (!WORKFLOW_CATEGORIES.includes(t as WorkflowCategory)) s.add(t);
            }));
        return Array.from(s).sort((a, b) => a.localeCompare(b, 'fr'));
    }, [workflows, activeCategory]);

    // ── Filtered list for active category ────────────────────────────────────
    const displayedWorkflows = useMemo(() => {
        return workflows.filter(w => {
            const wCat = getWorkflowCategory(w);
            if (wCat !== activeCategory) return false;
            if (activeTagFilter && !(w.tags || []).includes(activeTagFilter)) return false;
            return true;
        });
    }, [workflows, activeCategory, activeTagFilter]);

    // ── Risk info ─────────────────────────────────────────────────────────────
    const getWorkflowRiskInfo = (workflowId: string) => {
        const collect = (tasks: any[]): any[] => {
            let f: any[] = [];
            tasks.forEach(t => {
                if (t.grcWorkflowId === workflowId && t.risks?.length > 0) f.push(t);
                if (t.branches) t.branches.forEach((b: any) => { f = [...f, ...collect(b.tasks)]; });
            });
            return f;
        };
        const linked = planData.flatMap((cat: any) => cat.subCategories.flatMap((sub: any) => collect(sub.tasks)));
        if (!linked.length) return null;
        const ids = [...new Set(linked.flatMap((t: any) => t.risks || []))];
        const risks = allRisks.filter(r => ids.includes(r.id));
        if (!risks.length) return null;
        let maxLvl = 0; let maxLabel = '';
        risks.forEach(r => { const l = riskLevelToNumber(r.riskLevel); if (l > maxLvl) { maxLvl = l; maxLabel = r.riskLevel; } });
        return { maxLevel: maxLabel, count: risks.length, config: riskBadgeConfig[maxLabel] };
    };

    // ── Print ─────────────────────────────────────────────────────────────────
    const handlePrintWorkflow = async (w: MermaidWorkflow) => {
        const wfId = w.workflowId || w.id;
        try {
            setPrintingId(wfId);
            let code = `graph TD\n  A["${w.name}"] --> B["Fin"]`;
            if (db && w.id) {
                const vs = await getDocs(query(collection(db, 'workflows', w.id, 'versions'), orderBy('version', 'desc'), limit(1)));
                if (!vs.empty) code = (vs.docs[0].data() as any).mermaidCode;
            }
            const ri = getWorkflowRiskInfo(w.workflowId);
            await printWorkflow({ name: w.name, workflowId: wfId, domain: w.domain || 'Conformité', version: w.currentVersion || 1, code, riskInfo: ri ? { totalRisks: ri.count, maxLevel: ri.maxLevel, avgScore: undefined } : null, planData, workflowTasks, availableUsers, allRisks });
        } catch { toast({ title: "Erreur d'impression", variant: "destructive" }); } finally { setPrintingId(null); }
    };

    // ── Reset V1 ──────────────────────────────────────────────────────────────
    const handleResetAllToV1 = async () => {
        if (!db || !userIsAdmin) return;
        setResettingV1(true);
        try {
            const batch = writeBatch(db);
            const now = new Date().toISOString();
            for (const w of workflows) {
                let code = `graph TD\n  A["Début"] --> B["Fin"]`;
                const vs = await getDocs(query(collection(db, 'workflows', w.id, 'versions'), orderBy('version', 'desc'), limit(1)));
                if (!vs.empty) code = (vs.docs[0].data() as any).mermaidCode || code;
                const vId = `v1-baseline-${Date.now()}-${w.id.slice(0, 6)}`;
                batch.set(doc(db, 'workflows', w.id, 'versions', vId), { id: vId, mermaidCode: code, version: 1, status: 'published', createdAt: now, updatedAt: now });
                batch.update(doc(db, 'workflows', w.id), { currentVersion: 1, activeVersionId: vId, updatedAt: now });
            }
            await batch.commit();
            setWorkflows(prev => prev.map(w => ({ ...w, currentVersion: 1 })));
            toast({ title: '✅ Réinitialisés en V1', description: `${workflows.length} workflow(s) remis en version de base.` });
        } catch (e) { console.error(e); toast({ title: 'Erreur', variant: 'destructive' }); } finally { setResettingV1(false); }
    };

    const handleDeleteAll = async () => {
        if (!db) return;
        try {
            setLoading(true);
            const batch = writeBatch(db);
            workflows.forEach(w => batch.delete(doc(db, 'workflows', w.id)));
            await batch.commit();
            setWorkflows([]);
            toast({ title: "Tous les workflows supprimés." });
            router.refresh();
        } catch { toast({ title: "Erreur suppression", variant: "destructive" }); } finally { setLoading(false); }
    };

    const handleDelete = async (id: string) => {
        if (!db) return;
        try {
            await deleteDoc(doc(db, 'workflows', id));
            setWorkflows(prev => prev.filter(w => w.id !== id));
            toast({ title: "Workflow supprimé" });
        } catch { toast({ title: "Erreur suppression", variant: "destructive" }); }
    };

    if (loading) return (
        <div className="p-6 max-w-6xl mx-auto space-y-6 animate-pulse">
            <div className="h-10 w-64 bg-slate-200 rounded-xl" />
            <div className="grid sm:grid-cols-2 gap-4">{[0,1].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl" />)}</div>
            <div className="grid md:grid-cols-3 gap-4">{[0,1,2].map(i => <div key={i} className="h-48 bg-slate-100 rounded-2xl" />)}</div>
        </div>
    );

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestion des Workflows</h1>
                    <p className="text-muted-foreground text-sm">Processus métier organisés par catégorie réglementaire</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {userIsAdmin && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 font-bold gap-2" disabled={!workflows.length || resettingV1}>
                                    {resettingV1 ? <LucideIcons.Loader2 className="h-4 w-4 animate-spin" /> : <LucideIcons.RefreshCcw className="h-4 w-4" />}
                                    Réinitialiser en V1
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2rem] border-2">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
                                        <LucideIcons.RefreshCcw className="h-5 w-5 text-amber-500" /> Réinitialiser tous les workflows en V1 ?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-sm leading-relaxed">
                                        Fige l'état actuel de chaque workflow comme <strong>version de base (V1)</strong>. Les versions précédentes restent archivées.
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
                            <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-white" disabled={!workflows.length}>
                                <LucideIcons.Trash2 className="mr-2 h-4 w-4" /> Tout supprimer
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2rem] border-2">
                            <AlertDialogHeader><AlertDialogTitle className="font-bold">Tout supprimer ?</AlertDialogTitle><AlertDialogDescription>Action irréversible.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel className="rounded-xl font-bold">Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-white rounded-xl font-bold">Confirmer</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Link href="/admin/workflows/new">
                        <Button><LucideIcons.Plus className="mr-2 h-4 w-4" /> Nouveau Workflow</Button>
                    </Link>
                </div>
            </div>

            {/* ── Category selector ─────────────────────────────────────────── */}
            <div className="grid sm:grid-cols-2 gap-4">
                {WORKFLOW_CATEGORIES.map(cat => {
                    const cfg = CATEGORY_CONFIG[cat];
                    const CatIcon = cfg.icon;
                    const isActive = activeCategory === cat;
                    return (
                        <button
                            key={cat}
                            onClick={() => { setActiveCategory(cat); setActiveTagFilter(null); }}
                            className={`text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 ${
                                isActive
                                    ? `${cfg.bg} ${cfg.border} shadow-lg ring-1 ring-offset-2 ${cfg.border}`
                                    : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                            }`}
                        >
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border ${isActive ? `${cfg.bg} ${cfg.border}` : 'bg-slate-50 border-slate-100'}`}>
                                <CatIcon className={`h-6 w-6 ${isActive ? cfg.color : 'text-slate-400'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
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

            {/* ── Extra tag filter bar ──────────────────────────────────────── */}
            {extraTags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                    <LucideIcons.Tag className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-xs font-bold uppercase text-slate-400 tracking-widest mr-1">Tags</span>
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

            {/* ── Workflow cards grid ───────────────────────────────────────── */}
            {displayedWorkflows.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedWorkflows.map(w => {
                        const riskInfo = getWorkflowRiskInfo(w.workflowId || w.id);
                        const RiskIcon = riskInfo?.config?.icon || LucideIcons.Shield;
                        const extraWTags = (w.tags || []).filter(t => !WORKFLOW_CATEGORIES.includes(t as WorkflowCategory));
                        const cat = getWorkflowCategory(w);
                        const cfg = CATEGORY_CONFIG[cat];

                        return (
                            <Card key={w.id} className="group hover:shadow-md transition-all flex flex-col">
                                <CardHeader>
                                    {/* Top row */}
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.badge}`}>
                                            <cfg.icon className="h-3 w-3" />
                                            {cat}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {w.currentVersion ? (
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px]">V{w.currentVersion}</Badge>
                                            ) : (
                                                <Badge variant="outline" className="opacity-50 text-[10px]">Inactif</Badge>
                                            )}
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg">
                                                        <LucideIcons.Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="rounded-[2rem] border-2">
                                                    <AlertDialogHeader><AlertDialogTitle className="font-bold">Supprimer "{w.name}" ?</AlertDialogTitle><AlertDialogDescription>Toutes ses versions seront supprimées.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel className="rounded-xl font-bold">Annuler</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(w.id)} className="bg-destructive text-white rounded-xl font-bold">Supprimer</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>

                                    <CardTitle className="text-lg leading-tight">{w.name}</CardTitle>
                                    <p className="text-[10px] text-slate-400 font-mono">ID: {w.workflowId || w.id}</p>

                                    {/* Extra tags */}
                                    {extraWTags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {extraWTags.map(tag => (
                                                <button key={tag} onClick={() => setActiveTagFilter(tag === activeTagFilter ? null : tag)}
                                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer transition-all ${getTagColor(tag)} ${activeTagFilter === tag ? 'ring-1 ring-offset-1 ring-current' : ''}`}>
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Risk */}
                                    {riskInfo ? (
                                        <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border ${riskInfo.config.bg} ${riskInfo.config.border}`}>
                                            <RiskIcon className={`h-4 w-4 ${riskInfo.config.text}`} />
                                            <div>
                                                <span className={`text-[10px] font-bold uppercase tracking-wide block ${riskInfo.config.text}`}>Risque {riskInfo.maxLevel}</span>
                                                <span className={`text-[10px] opacity-80 ${riskInfo.config.text}`}>{riskInfo.count} risque{riskInfo.count > 1 ? 's' : ''} détecté{riskInfo.count > 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-3 px-3 py-2 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center gap-2 text-slate-400">
                                            <LucideIcons.ShieldCheck className="h-4 w-4" />
                                            <span className="text-xs font-medium">Aucun risque associé</span>
                                        </div>
                                    )}
                                </CardHeader>

                                <CardContent className="mt-auto pt-0 flex items-center gap-2">
                                    <Button variant="outline" size="icon" onClick={() => handlePrintWorkflow(w)} disabled={printingId === (w.workflowId || w.id)}
                                        className="h-10 w-10 shrink-0 rounded-xl border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 transition-all" title="Imprimer">
                                        {printingId === (w.workflowId || w.id) ? <LucideIcons.Loader2 className="h-4 w-4 animate-spin" /> : <LucideIcons.Printer className="h-4 w-4" />}
                                    </Button>
                                    <Link href={`/admin/workflows/${w.workflowId || w.id}/edit`} className="flex-1">
                                        <Button className="w-full rounded-xl" variant={w.currentVersion ? "outline" : "default"}>
                                            <LucideIcons.Edit2 className="mr-2 h-4 w-4" />
                                            {w.currentVersion ? "Modifier" : "Configurer"}
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="py-20 text-center bg-slate-50 rounded-2xl border border-dashed">
                    <LucideIcons.FolderOpen className="h-14 w-14 mx-auto mb-4 opacity-15" />
                    <p className="text-muted-foreground font-medium text-lg">
                        Aucun workflow <span className="font-bold text-foreground">{activeCategory}</span>
                        {activeTagFilter && <> avec le tag <span className="font-bold text-foreground">"{activeTagFilter}"</span></>}
                    </p>
                    <div className="flex gap-3 justify-center mt-5">
                        {activeTagFilter && (
                            <Button variant="ghost" size="sm" onClick={() => setActiveTagFilter(null)}>
                                <LucideIcons.X className="mr-1 h-3 w-3" /> Supprimer le filtre
                            </Button>
                        )}
                        <Link href="/admin/workflows/new">
                            <Button variant="outline" size="sm">
                                <LucideIcons.Plus className="mr-2 h-3 w-3" /> Créer un workflow {activeCategory}
                            </Button>
                        </Link>
                    </div>
                </div>
            )}

            {/* ── Info ──────────────────────────────────────────────────────── */}
            <Card className="bg-blue-50/50 border-blue-100">
                <CardContent className="pt-5 flex gap-4">
                    <LucideIcons.Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800 space-y-1">
                        <p className="font-semibold">Organisation des workflows</p>
                        <p>Chaque workflow appartient à <strong>LAB/FT</strong> ou <strong>Veille Réglementaire</strong>. Les workflows sans catégorie explicite sont rattachés à <strong>LAB/FT</strong> par défaut.</p>
                        {userIsAdmin && <p className="font-semibold text-amber-700 pt-1">⚡ Admin : "Réinitialiser en V1" fige l'état courant de tous les workflows comme version de référence.</p>}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
