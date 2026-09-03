'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Play, Tag, X, Plus, ShieldAlert, BookOpen } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { MermaidWorkflow } from '@/types/compliance';

// Catégories obligatoires
const WORKFLOW_CATEGORIES = ['LAB/FT', 'Veille Réglementaire'] as const;
type WorkflowCategory = typeof WORKFLOW_CATEGORIES[number];

const CATEGORY_CONFIG: Record<WorkflowCategory, { icon: any; color: string; bg: string; border: string; desc: string }> = {
    'LAB/FT': { icon: ShieldAlert, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-300', desc: 'Lutte Anti-Blanchiment et Financement du Terrorisme' },
    'Veille Réglementaire': { icon: BookOpen, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-300', desc: 'Suivi et mise en conformité des nouvelles exigences' },
};

// Palette de couleurs cyclique pour les tags (même logique que la page liste)
const TAG_COLORS = [
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-violet-100 text-violet-700 border-violet-200',
    'bg-sky-100 text-sky-700 border-sky-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-rose-100 text-rose-700 border-rose-200',
    'bg-teal-100 text-teal-700 border-teal-200',
    'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
];

const getTagColor = (tag: string) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) & 0xffffffff;
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

function NewWorkflowForm() {
    const router = useRouter();
    const { toast } = useToast();

    const [name, setName] = useState('');
    const [customId, setCustomId] = useState('');
    const [category, setCategory] = useState<WorkflowCategory | ''>('');
    const [loading, setLoading] = useState(false);

    // ── Tags ──────────────────────────────────────────────────────────────────
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [existingTags, setExistingTags] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const tagInputRef = useRef<HTMLInputElement>(null);

    // Charger tous les tags existants depuis Firestore au montage
    useEffect(() => {
        const loadExistingTags = async () => {
            if (!db) return;
            try {
                const snap = await getDocs(collection(db, 'workflows'));
                const tagSet = new Set<string>();
                snap.docs.forEach(d => {
                    const data = d.data() as MermaidWorkflow;
                    (data.tags || []).forEach(t => tagSet.add(t));
                });
                setExistingTags(Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'fr')));
            } catch (e) {
                // Silently ignore
            }
        };
        loadExistingTags();
    }, []);

    const filteredSuggestions = existingTags.filter(
        t => !tags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase().trim())
    );

    const addTag = (tag: string) => {
        const clean = tag.trim();
        if (!clean || tags.includes(clean)) return;
        setTags(prev => [...prev, clean]);
        setTagInput('');
        setShowSuggestions(false);
        tagInputRef.current?.focus();
    };

    const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(tagInput);
        } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast({ title: "Nom requis", description: "Veuillez donner un nom au workflow.", variant: "destructive" });
            return;
        }

        if (!category) {
            toast({ title: "Catégorie obligatoire", description: "Veuillez choisir LAB/FT ou Veille Réglementaire.", variant: "destructive" });
            return;
        }

        setLoading(true);

        try {
            let finalId = customId.trim();

            if (finalId) {
                finalId = finalId.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
            } else {
                finalId = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
            }

            if (!finalId) {
                toast({ title: "ID Invalide", description: "Impossible de générer un ID valide.", variant: "destructive" });
                setLoading(false);
                return;
            }

            if (db) {
                const docRef = doc(db, 'workflows', finalId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    toast({ title: "ID déjà existant", description: "Un workflow avec cet ID existe déjà. Veuillez en choisir un autre.", variant: "destructive" });
                    setLoading(false);
                    return;
                }

                const now = new Date().toISOString();
                const newWorkflow: MermaidWorkflow = {
                    id: finalId,
                    workflowId: finalId,
                    name: name.trim(),
                    mermaidCode: 'graph TD\n  A["Début"] --> B["Fin"]',
                    currentVersion: 0,
                    createdAt: now,
                    updatedAt: now,
                    // La catégorie obligatoire est toujours le premier tag
                    tags: [category as WorkflowCategory, ...tags.filter(t => t !== category)],
                };

                await setDoc(docRef, newWorkflow);
                toast({ title: "Workflow créé", description: "Redirection vers l'éditeur..." });
                router.push(`/admin/workflows/${finalId}/edit`);
            } else {
                toast({ title: "Erreur", description: "Base de données non disponible.", variant: "destructive" });
                setLoading(false);
            }
        } catch (error) {
            console.error('Error creating workflow:', error);
            toast({ title: "Erreur", description: "Impossible de créer le workflow.", variant: "destructive" });
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-start min-h-[calc(100vh-10rem)] p-4 pt-12">
            <Card className="w-full max-w-lg shadow-xl">
                <CardHeader>
                    <CardTitle className="text-2xl">Nouveau Workflow</CardTitle>
                    <CardDescription>Configurez les informations de base pour commencer.</CardDescription>
                </CardHeader>
                <form onSubmit={handleCreate}>
                    <CardContent className="space-y-6">
                    {/* Catégorie obligatoire */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 font-bold">
                                Catégorie <span className="text-rose-500">*</span>
                            </Label>
                            <div className="grid grid-cols-2 gap-3">
                                {WORKFLOW_CATEGORIES.map(cat => {
                                    const cfg = CATEGORY_CONFIG[cat];
                                    const CatIcon = cfg.icon;
                                    const isSelected = category === cat;
                                    return (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setCategory(cat)}
                                            className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-2 ${
                                                isSelected
                                                    ? `${cfg.bg} ${cfg.border} shadow-md`
                                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <CatIcon className={`h-4 w-4 ${isSelected ? cfg.color : 'text-slate-400'}`} />
                                                <span className={`text-xs font-black ${isSelected ? cfg.color : 'text-slate-600'}`}>{cat}</span>
                                                {isSelected && <span className="ml-auto text-xs">✓</span>}
                                            </div>
                                            <p className={`text-[10px] leading-relaxed ${isSelected ? cfg.color : 'text-slate-400'}`}>{cfg.desc}</p>
                                        </button>
                                    );
                                })}
                            </div>
                            {!category && <p className="text-[10px] text-rose-500 font-semibold">⚠ Choisissez une catégorie obligatoire</p>}
                        </div>

                        {/* Nom */}
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

                        {/* ID */}
                        <div className="space-y-2">
                            <Label htmlFor="customId" className="flex justify-between">
                                Identifiant (Optionnel)
                                <span className="text-xs text-muted-foreground font-normal">Sera généré automatiquement si vide</span>
                            </Label>
                            <Input
                                id="customId"
                                placeholder="ex: notes-frais-v1"
                                value={customId}
                                onChange={(e) => setCustomId(e.target.value)}
                                className="font-mono text-sm"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Uniques, minuscules, sans espaces ou caractères spéciaux (sauf - et _).
                            </p>
                        </div>

                        {/* ── Tags ─────────────────────────────────────────────── */}
                        <div className="space-y-2">
                            <Label htmlFor="tags" className="flex items-center gap-1.5">
                                <Tag className="h-3.5 w-3.5" />
                                Tags
                                <span className="text-[10px] text-muted-foreground font-normal ml-1">(Entrée ou virgule pour ajouter)</span>
                            </Label>

                            {/* Champs + badges */}
                            <div
                                className="min-h-[42px] flex flex-wrap gap-1.5 items-center px-3 py-2 rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-text"
                                onClick={() => tagInputRef.current?.focus()}
                            >
                                {tags.map(tag => (
                                    <span
                                        key={tag}
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getTagColor(tag)}`}
                                    >
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                                            className="hover:opacity-70 transition-opacity"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    ref={tagInputRef}
                                    id="tags"
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => { setTagInput(e.target.value); setShowSuggestions(true); }}
                                    onKeyDown={handleTagKeyDown}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                    placeholder={tags.length === 0 ? "KYC, LAB-FT, Conformité..." : ''}
                                    className="flex-1 min-w-[120px] outline-none bg-transparent text-sm placeholder:text-muted-foreground"
                                />
                            </div>

                            {/* Suggestions dropdown */}
                            {showSuggestions && (tagInput.trim() || filteredSuggestions.length > 0) && (
                                <div className="border rounded-xl shadow-lg bg-white dark:bg-slate-900 py-1 z-10 max-h-40 overflow-y-auto">
                                    {tagInput.trim() && !existingTags.includes(tagInput.trim()) && (
                                        <button
                                            type="button"
                                            onMouseDown={() => addTag(tagInput)}
                                            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 font-bold text-indigo-600"
                                        >
                                            <Plus className="h-3 w-3" />
                                            Créer le tag "{tagInput.trim()}"
                                        </button>
                                    )}
                                    {filteredSuggestions.length > 0 && (
                                        <>
                                            {tagInput.trim() && !existingTags.includes(tagInput.trim()) && (
                                                <div className="border-t mx-2 my-1" />
                                            )}
                                            <p className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Tags existants</p>
                                            {filteredSuggestions.map(t => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onMouseDown={() => addTag(t)}
                                                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                                >
                                                    <span className={`px-2 py-0.5 rounded-full font-bold border ${getTagColor(t)}`}>{t}</span>
                                                </button>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Tags rapides depuis suggestions */}
                            {existingTags.filter(t => !tags.includes(t)).length > 0 && tags.length === 0 && !tagInput && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    <span className="text-[10px] text-muted-foreground self-center">Réutiliser :</span>
                                    {existingTags.filter(t => !tags.includes(t)).slice(0, 6).map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => addTag(t)}
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border hover:opacity-80 transition-opacity ${getTagColor(t)}`}
                                        >
                                            + {t}
                                        </button>
                                    ))}
                                </div>
                            )}
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
