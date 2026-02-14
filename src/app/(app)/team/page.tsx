"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, Mail, Phone, ExternalLink, Award, Zap, Users, Globe, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TeamMember {
    id: string;
    name: string;
    role: string;
    specialty: string;
    status: "Online" | "Away" | "Offline";
    expertise: string[];
    avatarUrl?: string;
}

const teamMembers: TeamMember[] = [
    {
        id: "1",
        name: "Moslem G.",
        role: "Direction Compliance & GRC",
        specialty: "Stratégie Réglementaire",
        status: "Online",
        expertise: ["Audit", "Anti-Corruption", "Risk Management"],
    },
    {
        id: "2",
        name: "Sarah L.",
        role: "Legal Counsel",
        specialty: "Protection des Données",
        status: "Online",
        expertise: ["RGPD", "Privacy by Design", "DPO"],
    },
    {
        id: "3",
        name: "Compliance AI",
        role: "Assistant Intelligent",
        specialty: "Analyse Sémantique",
        status: "Online",
        expertise: ["Veille 24/7", "Matching de Preuves", "Scoring"],
        avatarUrl: "/ai-avatar.png"
    },
    {
        id: "4",
        name: "Karim B.",
        role: "Risk Officer",
        specialty: "Lutte Anti-Blanchiment",
        status: "Away",
        expertise: ["LCB-FT", "Due Diligence", "Sanctions"],
    }
];

export default function TeamPage() {
    return (
        <div className="space-y-10 pb-20 overflow-hidden">
            {/* Dynamic Header */}
            <div className="relative">
                <div className="absolute -left-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                <div className="relative z-10">
                    <h1 className="text-5xl font-black font-headline tracking-tighter text-slate-900 dark:text-white uppercase italic">
                        Governance <span className="text-primary">Network</span>
                    </h1>
                    <p className="text-muted-foreground text-xl max-w-2xl mt-2">
                        L'excellence de la conformité repose sur la synergie entre <span className="text-slate-900 dark:text-white font-bold">experts métier</span> et <span className="text-primary font-bold">Intelligence Artificielle</span>.
                    </p>
                </div>
            </div>

            {/* Team Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {teamMembers.map((member) => (
                    <div key={member.id} className="group relative">
                        {/* Holographic Card Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-indigo-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <Card className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-100 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden hover:-translate-y-2 transition-transform duration-500">
                            {/* Status Indicator */}
                            <div className="absolute top-4 right-4 flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${member.status === 'Online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">{member.status}</span>
                            </div>

                            <CardHeader className="pt-8 pb-4 text-center">
                                <div className="relative mx-auto mb-4">
                                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg group-hover:blur-xl transition-all" />
                                    <Avatar className="h-24 w-24 border-4 border-white dark:border-slate-800 shadow-2xl mx-auto relative z-10">
                                        <AvatarImage src={member.avatarUrl} />
                                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-primary text-white text-2xl font-black">
                                            {member.name.split(' ').map(n => n[0]).join('')}
                                        </AvatarFallback>
                                    </Avatar>
                                    {member.name.includes('AI') && (
                                        <div className="absolute -bottom-2 -right-2 bg-slate-900 text-white p-1.5 rounded-lg shadow-lg border border-white/20">
                                            <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                                        </div>
                                    )}
                                </div>
                                <CardTitle className="text-xl font-black tracking-tight">{member.name}</CardTitle>
                                <CardDescription className="font-bold text-primary uppercase text-[11px] tracking-[0.1em]">{member.role}</CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-2 flex items-center gap-2">
                                        <Shield className="h-3 w-3 text-primary" /> Spécialité Maîtresse
                                    </p>
                                    <p className="text-sm font-bold">{member.specialty}</p>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground px-1 tracking-widest">Compétences GRC</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {member.expertise.map((exp, i) => (
                                            <Badge key={i} variant="secondary" className="bg-white dark:bg-slate-800 text-[10px] font-bold py-0.5 border-none shadow-sm capitalize">
                                                {exp}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button variant="outline" size="icon" className="flex-1 h-10 rounded-xl border-slate-100 dark:border-slate-800 hover:bg-primary hover:text-white transition-all">
                                        <Mail className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" className="flex-1 h-10 rounded-xl border-slate-100 dark:border-slate-800 hover:bg-primary hover:text-white transition-all">
                                        <Phone className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>

            {/* Collaboration Board */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-none bg-slate-900 text-white rounded-[2rem] shadow-2xl overflow-hidden relative min-h-[300px]">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Users className="h-48 w-48" />
                    </div>
                    <CardHeader className="p-10">
                        <CardTitle className="text-3xl font-black font-headline italic tracking-tighter">Espace de Collaboration</CardTitle>
                        <CardDescription className="text-slate-400 text-lg">Suivez la charge de travail réglementaire de l'équipe en temps réel.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-10 pb-10">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <StatBox label="Audit" value="84%" sub="Completion" />
                            <StatBox label="Veille" value="24/7" sub="Active" />
                            <StatBox label="Risques" value="12" sub="Monitorés" />
                            <StatBox label="Alertes" value="03" sub="Urgences" />
                        </div>
                        <Button className="mt-8 bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8 rounded-xl shadow-lg shadow-primary/20">
                            Lancer une Session GRC <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-slate-200 shadow-xl p-8 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl w-fit">
                            <Award className="h-8 w-8" />
                        </div>
                        <h3 className="text-2xl font-black tracking-tight">Certification Team</h3>
                        <p className="text-muted-foreground text-sm">Votre équipe est certifiée <strong>Compliance Expert 2026</strong>. Toutes les formations obligatoires sont à jour.</p>
                    </div>
                    <div className="space-y-3 mt-8">
                        <div className="flex items-center gap-3 text-sm font-bold">
                            <Globe className="h-4 w-4 text-primary" /> ISO 37301 Certified
                        </div>
                        <div className="flex items-center gap-3 text-sm font-bold">
                            <Briefcase className="h-4 w-4 text-primary" /> SOC2 Compliance
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

function StatBox({ label, value, sub }: { label: string, value: string, sub: string }) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-black uppercase text-primary tracking-widest">{label}</p>
            <p className="text-4xl font-black">{value}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase">{sub}</p>
        </div>
    );
}
