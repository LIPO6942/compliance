"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTimeline, type TimelineEvent } from "@/contexts/TimelineContext";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, History as HistoryIcon, Search, Filter, Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
    const { events } = useTimeline();
    const [searchTerm, setSearchTerm] = React.useState("");
    
    const archivedEvents = events
        .filter(e => e.validated)
        .sort((a, b) => {
            const dateA = a.validatedAt ? parseISO(a.validatedAt).getTime() : 0;
            const dateB = b.validatedAt ? parseISO(b.validatedAt).getTime() : 0;
            return dateB - dateA;
        });

    const filteredEvents = archivedEvents.filter(e => 
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <Link href="/dashboard" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-primary transition-colors mb-2">
                        <ArrowLeft className="h-3 w-3" /> Retour au Dashboard
                    </Link>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">
                        Archive & <span className="text-primary">Audit</span> Timeline
                    </h1>
                    <p className="text-slate-500 text-xs font-medium flex items-center gap-2">
                        <HistoryIcon className="h-3.5 w-3.5 text-primary" /> Historique complet des échéances réglementaires traitées.
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Rechercher une archive..." 
                            className="pl-10 w-64 rounded-xl border-slate-200 bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="rounded-xl border-slate-200 gap-2 font-bold text-xs">
                        <Filter className="h-4 w-4" /> Filtres
                    </Button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="rounded-[2rem] border-none shadow-lg bg-emerald-50 dark:bg-emerald-950/20">
                    <CardContent className="pt-6">
                        <div className="text-2xl font-black text-emerald-600">{archivedEvents.length}</div>
                        <div className="text-[10px] font-black uppercase text-emerald-600/60 tracking-widest">Échéances Validées</div>
                    </CardContent>
                </Card>
                <Card className="rounded-[2rem] border-none shadow-lg bg-slate-50 dark:bg-slate-900">
                    <CardContent className="pt-6">
                        <div className="text-2xl font-black text-slate-600">
                            {archivedEvents.filter(e => !e.delayReason).length}
                        </div>
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Validations à temps</div>
                    </CardContent>
                </Card>
                <Card className="rounded-[2rem] border-none shadow-lg bg-rose-50 dark:bg-rose-950/10">
                    <CardContent className="pt-6">
                        <div className="text-2xl font-black text-rose-600">
                            {archivedEvents.filter(e => e.delayReason).length}
                        </div>
                        <div className="text-[10px] font-black uppercase text-rose-400 tracking-widest">Retards justifiés</div>
                    </CardContent>
                </Card>
            </div>

            {/* Archive List */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Registre d'Audit Documentaire</h3>
                    <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black">ISO 27001 / RGPD COMPLIANT</Badge>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Événement</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Catégorie</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date Prévue</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date Réelle</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Validé par</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Statut / Justification</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {filteredEvents.map((event) => (
                                <tr key={event.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-2 h-2 rounded-full", event.color)} />
                                            <span className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase italic truncate max-w-[200px]">
                                                {event.title}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="outline" className="text-[9px] font-bold uppercase border-slate-200">
                                            {event.category}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold text-slate-400 tracking-tighter">
                                            {format(parseISO(event.date), 'dd/MM/yyyy')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-black text-emerald-600 tracking-tighter">
                                            {event.validatedAt ? format(parseISO(event.validatedAt), 'dd/MM/yyyy HH:mm') : '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary uppercase">
                                                {event.validatedBy?.substring(0, 2) || '??'}
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                                {event.validatedBy || 'Sylius Admin'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {event.delayReason ? (
                                            <div className="flex flex-col gap-1">
                                                <Badge className="bg-rose-100 text-rose-600 border-none text-[8px] font-black w-fit">RETARD JUSTIFIÉ</Badge>
                                                <p className="text-[10px] italic text-slate-400 line-clamp-1 group-hover:line-clamp-none transition-all">
                                                    "{event.delayReason}"
                                                </p>
                                            </div>
                                        ) : (
                                            <Badge className="bg-emerald-100 text-emerald-600 border-none text-[8px] font-black">PONCTUEL</Badge>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredEvents.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <HistoryIcon className="h-10 w-10 text-slate-200 mx-auto mb-4" />
                                        <p className="text-sm font-bold text-slate-300 uppercase italic">Aucune archive trouvée</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
