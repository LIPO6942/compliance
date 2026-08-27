'use client';

import React from 'react';
import { BookX, Construction, ArrowRight, ShieldAlert, FileWarning, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NonConformitePage() {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 max-w-4xl mx-auto space-y-8">
            {/* Hero */}
            <div className="text-center space-y-4">
                <div className="relative inline-flex">
                    <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-rose-500/30">
                        <BookX className="h-12 w-12 text-white" />
                    </div>
                    <span className="absolute -top-2 -right-2 h-8 w-8 bg-amber-400 rounded-full flex items-center justify-center shadow-lg">
                        <Construction className="h-4 w-4 text-white" />
                    </span>
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Cartographie de Non-Conformité Réglementaire
                    </h1>
                    <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm leading-relaxed">
                        Ce module sera dédié à l'identification, la classification et le suivi des non-conformités
                        réglementaires détectées dans le cadre des activités LAB/FT et de la veille réglementaire.
                    </p>
                    <Badge className="mt-3 bg-amber-100 text-amber-800 border-amber-200 font-bold text-xs px-3 py-1">
                        <Construction className="h-3 w-3 mr-1.5" />
                        Module en cours de développement
                    </Badge>
                </div>
            </div>

            {/* Fonctionnalités prévues */}
            <div className="grid sm:grid-cols-3 gap-4 w-full">
                {[
                    {
                        icon: ShieldAlert,
                        color: 'text-rose-600',
                        bg: 'bg-rose-50 border-rose-100',
                        title: 'Non-conformités LAB/FT',
                        desc: 'Recensement et suivi des manquements aux obligations LAB/FT (KYC, DDC, déclarations CTAF…)',
                    },
                    {
                        icon: FileWarning,
                        color: 'text-orange-600',
                        bg: 'bg-orange-50 border-orange-100',
                        title: 'Veille Réglementaire',
                        desc: 'Écarts entre exigences réglementaires nouvelles et pratiques actuelles, avec plan de mise en conformité.',
                    },
                    {
                        icon: Scale,
                        color: 'text-indigo-600',
                        bg: 'bg-indigo-50 border-indigo-100',
                        title: 'Scoring & Priorisation',
                        desc: 'Évaluation du niveau de risque de chaque non-conformité et priorisation des actions correctives.',
                    },
                ].map(({ icon: Icon, color, bg, title, desc }) => (
                    <Card key={title} className={`border ${bg} rounded-2xl`}>
                        <CardHeader className="pb-2">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${bg}`}>
                                <Icon className={`h-5 w-5 ${color}`} />
                            </div>
                            <CardTitle className="text-sm font-black text-slate-800 mt-2">{title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription className="text-xs leading-relaxed">{desc}</CardDescription>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 items-center">
                <Link href="/risk-mapping">
                    <Button variant="outline" className="rounded-xl gap-2 font-bold text-sm border-slate-200 hover:border-slate-400">
                        Voir la Cartographie des Risques
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </Link>
                <Link href="/controle-suivi">
                    <Button variant="outline" className="rounded-xl gap-2 font-bold text-sm border-slate-200 hover:border-slate-400">
                        Contrôle et Suivi
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </Link>
            </div>

            {/* Info footer */}
            <p className="text-[11px] text-slate-400 text-center max-w-md">
                Ce module sera alimenté progressivement à partir des données issues du Plan de Conformité,
                de la veille réglementaire et des contrôles internes.
            </p>
        </div>
    );
}
