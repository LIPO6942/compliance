"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, Mail, Phone, ExternalLink, Award, Zap, Users, Globe, Briefcase, ArrowRight, Edit, Plus, Trash2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeam, TeamMember } from "@/contexts/TeamContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const memberSchema = z.object({
    name: z.string().min(1, "Le nom est requis."),
    role: z.string().min(1, "Le rôle est requis."),
    specialty: z.string().min(1, "La spécialité est requise."),
    status: z.enum(["Online", "Away", "Offline"]),
    expertise: z.string().min(1, "Au moins une compétence est requise."),
    avatarUrl: z.string().optional(),
    email: z.string().email("Veuillez entrer une adresse email valide.").optional().or(z.literal('')),
    phone: z.string().optional(),
});

type MemberFormValues = z.infer<typeof memberSchema>;

export default function TeamPage() {
    const { teamMembers, updateMember, addMember, removeMember } = useTeam();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingMember, setEditingMember] = React.useState<TeamMember | null>(null);

    const form = useForm<MemberFormValues>({
        resolver: zodResolver(memberSchema),
        defaultValues: {
            name: "",
            role: "",
            specialty: "",
            status: "Online",
            expertise: "",
            avatarUrl: "",
            email: "",
            phone: "",
        }
    });

    const [certYear, setCertYear] = React.useState("2026");
    const [certDesc, setCertDesc] = React.useState("Votre organisation est classée Compliance Expert Gold. 100% des modules critiques sont validés.");

    const openDialog = (member?: TeamMember) => {
        if (member) {
            setEditingMember(member);
            form.reset({
                ...member,
                expertise: member.expertise.join(", "),
                email: member.email || "",
                phone: member.phone || "",
            });
        } else {
            setEditingMember(null);
            form.reset({
                name: "",
                role: "",
                specialty: "",
                status: "Online",
                expertise: "",
                avatarUrl: "",
                email: "",
                phone: "",
            });
        }
        setIsDialogOpen(true);
    };

    const handleFormSubmit = (values: MemberFormValues) => {
        const memberData = {
            ...values,
            expertise: values.expertise.split(",").map(e => e.trim()).filter(Boolean),
        };

        if (editingMember) {
            updateMember(editingMember.id, memberData);
            toast({ title: "Membre mis à jour", description: `${values.name} a été modifié avec succès.` });
        } else {
            addMember(memberData);
            toast({ title: "Membre ajouté", description: `${values.name} a rejoint l'équipe.` });
        }
        setIsDialogOpen(false);
    };

    return (
        <div className="space-y-10 pb-20 overflow-hidden">
            {/* Header & Vision */}
            <div className="relative mb-2">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Human Capital & Governance</span>
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Governance <span className="text-primary">Network</span>
                        </h1>
                        <p className="text-slate-500 text-sm max-w-2xl">
                            Synergie d'experts métier et d'outils d'intelligence décisionnelle.
                        </p>
                    </div>
                    <Button onClick={() => openDialog()} className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-slate-900/40 relative z-10">
                        <Plus className="mr-3 h-5 w-5" /> Inviter un Expert
                    </Button>
                </div>
            </div>

            {/* Team Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {teamMembers.map((member) => (
                    <div key={member.id} className="group relative">
                        {/* Holographic Card Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-indigo-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <Card className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-100 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden hover:-translate-y-2 transition-transform duration-500">
                            {/* Actions Overlay */}
                            <div className="absolute top-4 left-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <Button variant="secondary" size="icon" onClick={() => openDialog(member)} className="h-8 w-8 rounded-lg bg-white/90 dark:bg-slate-800/90 shadow-sm border-none">
                                    <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="destructive" size="icon" onClick={() => removeMember(member.id)} className="h-8 w-8 rounded-lg shadow-sm border-none">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>

                            {/* Status Indicator */}
                            <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20">
                                <div className={`w-2 h-2 rounded-full ${member.status === 'Online' ? 'bg-emerald-500 animate-pulse' : member.status === 'Away' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">{member.status}</span>
                            </div>

                            <CardHeader className="pt-12 pb-4 text-center">
                                <div className="relative mx-auto mb-4">
                                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg group-hover:blur-xl transition-all" />
                                    <Avatar className="h-24 w-24 border-4 border-white dark:border-slate-800 shadow-2xl mx-auto relative z-10">
                                        <AvatarImage src={member.avatarUrl} />
                                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-primary text-white text-2xl font-black">
                                            {member.name.split(' ').map(n => n[0]).join('')}
                                        </AvatarFallback>
                                    </Avatar>
                                    {member.name.toLowerCase().includes('ai') && (
                                        <div className="absolute -bottom-2 -right-2 bg-slate-900 text-white p-1.5 rounded-lg shadow-lg border border-white/20 z-20">
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
                                            <Badge key={i} variant="secondary" className="bg-white dark:bg-slate-800 text-[9px] font-bold py-0.5 px-2 border-none shadow-sm capitalize">
                                                {exp}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    {member.email && (
                                        <Button asChild variant="outline" size="icon" className="flex-1 h-10 rounded-xl border-slate-100 dark:border-slate-800 hover:bg-primary hover:text-white transition-all">
                                            <a href={`mailto:${member.email}`}>
                                                <Mail className="h-4 w-4" />
                                            </a>
                                        </Button>
                                    )}
                                    {member.phone && (
                                        <Button asChild variant="outline" size="icon" className="flex-1 h-10 rounded-xl border-slate-100 dark:border-slate-800 hover:bg-primary hover:text-white transition-all">
                                            <a href={`tel:${member.phone}`}>
                                                <Phone className="h-4 w-4" />
                                            </a>
                                        </Button>
                                    )}
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
                        <Button className="mt-8 bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest h-14 px-10 rounded-2xl shadow-lg shadow-primary/20">
                            Lancer une Session GRC <ArrowRight className="ml-3 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

                <Card className="rounded-[2.5rem] border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-2xl p-10 flex flex-col justify-between group/cert relative">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="absolute top-6 right-6 h-10 w-10 rounded-xl opacity-0 group-hover/cert:opacity-100 transition-opacity bg-slate-50 dark:bg-slate-800">
                                <Edit className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-[2rem] p-10 max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black">Modifier Certification</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Titre de Certification</Label>
                                    <Input
                                        value={certYear}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCertYear(e.target.value)}
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Description</Label>
                                    <Textarea
                                        value={certDesc}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCertDesc(e.target.value)}
                                        className="rounded-xl min-h-[100px]"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button className="rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest text-[10px]">Valider</Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <div className="space-y-6">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-[2rem] w-fit shadow-inner">
                            <Award className="h-10 w-10" />
                        </div>
                        <h3 className="text-3xl font-black tracking-tighter italic uppercase">Certification <span className="text-emerald-500">{certYear}</span></h3>
                        <p className="text-muted-foreground text-sm font-medium leading-relaxed">{certDesc}</p>
                    </div>
                    <div className="space-y-3 mt-10">
                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ISO 37301 Enterprise
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> SOC2 Global Compliance
                        </div>
                    </div>
                </Card>
            </div>

            {/* Member Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="rounded-[2.5rem] p-0 max-w-2xl border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] overflow-hidden bg-white dark:bg-slate-950">
                    <div className="bg-slate-50/50 dark:bg-slate-900/50 p-10 border-b border-slate-100 dark:border-slate-800">
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                {editingMember ? "Ajuster le" : "Nouveau"} <span className="text-primary italic">Profil Expert</span>
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 font-medium italic">
                                {editingMember ? "Mise à jour des habilitations et compétences de l'expert GRC." : "Enregistrement d'un nouvel intervenant dans la gouvernance."}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
                            <div className="p-10 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {/* Section: Identité */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-1 bg-primary rounded-full" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Identité & Rôle</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="name" render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nom Complet</FormLabel>
                                                <FormControl><Input {...field} className="h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="role" render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fonction officielle</FormLabel>
                                                <FormControl><Input {...field} className="h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                </div>

                                <Separator className="bg-slate-100 dark:bg-slate-800" />

                                {/* Section: Expertise */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-1 bg-amber-500 rounded-full" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Expertise Métier</h3>
                                    </div>

                                    <div className="bg-slate-50/50 dark:bg-slate-900/30 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/50 space-y-6">
                                        <FormField control={form.control} name="specialty" render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Spécialité Maîtresse</FormLabel>
                                                <FormControl><Input {...field} placeholder="ex: AML/CFT, RGPD, Audit..." className="h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="expertise" render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Compétences GRC (virgules)</FormLabel>
                                                <FormControl><Input {...field} placeholder="Audit, LCB-FT, KYC..." className="h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                </div>

                                <Separator className="bg-slate-100 dark:bg-slate-800" />

                                {/* Section: Paramètres */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-1 bg-emerald-500 rounded-full" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Disponibilité & Image</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="status" render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Statut actuel</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold"><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent className="rounded-xl border-none shadow-2xl">
                                                        <SelectItem value="Online" className="font-bold">EN LIGNE</SelectItem>
                                                        <SelectItem value="Away" className="font-bold">ABSENT</SelectItem>
                                                        <SelectItem value="Offline" className="font-bold">HORS LIGNE</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="avatarUrl" render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">URL Avatar</FormLabel>
                                                <FormControl><Input {...field} placeholder="https://..." className="h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="email" render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email professionnel</FormLabel>
                                                <FormControl><Input {...field} placeholder="prenom.nom@mae.tn" className="h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="phone" render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Téléphone</FormLabel>
                                                <FormControl><Input {...field} placeholder="55 555 555" className="h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                                <DialogClose asChild>
                                    <Button type="button" variant="ghost" className="h-12 px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest text-slate-500">Annuler</Button>
                                </DialogClose>
                                <Button type="submit" className="h-12 px-10 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl transition-all active:scale-95">
                                    {editingMember ? "Réactualiser le Profil" : "Inscrire dans l'Annuaire"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StatBox({ label, value, sub }: { label: string, value: string, sub: string }) {
    return (
        <div className="space-y-1">
            <p className="text-[9px] font-black uppercase text-primary tracking-widest mb-1">{label}</p>
            <p className="text-4xl font-black tracking-tighter">{value}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{sub}</p>
        </div>
    );
}
