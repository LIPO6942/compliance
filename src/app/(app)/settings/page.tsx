
"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { useUser } from "@/contexts/UserContext";
import { useTeam } from "@/contexts/TeamContext";
import { useActivityLog } from "@/contexts/ActivityLogContext";
import { useState, useEffect, useMemo } from "react";
import { useTimeline } from "@/contexts/TimelineContext";
import { Trash2, Plus, Calendar, Bookmark, Palette, Settings as SettingsIcon, FileType, ChevronRight, UserCheck, ShieldCheck, Activity } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { UserProfile } from "@/contexts/UserContext";
import { useTheme } from "@/contexts/ThemeContext";

const availableRoles = [
    "Responsable Conformité",
    "Analyste Conformité",
    "Auditeur Interne",
    "Direction Générale",
    "Chef de projet",
    "Equipe Conformité",
];

const availableTimelineColors = [
    { name: "Bleu", class: "bg-blue-500" },
    { name: "Émeraude", class: "bg-emerald-500" },
    { name: "Ambre", class: "bg-amber-500" },
    { name: "Rose", class: "bg-rose-500" },
    { name: "Indigo", class: "bg-indigo-500" },
    { name: "Violet", class: "bg-violet-500" },
    { name: "Ardoise", class: "bg-slate-500" },
    { name: "Orange", class: "bg-orange-500" },
];

export default function SettingsPage() {
    const { toast } = useToast();
    const { user, updateUser, isLoaded } = useUser();
    const { teamMembers } = useTeam();
    const { logAction, isAdmin } = useActivityLog();

    // Filter out human members only (exclude AI)
    const humanMembers = useMemo(
        () => teamMembers
            .filter(m => !m.email?.endsWith('.ai') && !m.role.toLowerCase().includes('intelligent')),
        [teamMembers]
    );

    const [profile, setProfile] = useState<Partial<UserProfile>>({
        name: '',
        email: '',
        role: ''
    });
    const { isDarkMode, toggleDarkMode } = useTheme();
    const { events, updateEvent, addEvent, deleteEvent, persistChanges } = useTimeline();
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isLoaded && user) {
            setProfile(user);
        }
    }, [user, isLoaded]);

    const handleSelectIdentity = (member: { name: string; email: string; role: string }) => {
        const newProfile = {
            name: member.name,
            email: member.email,
            role: member.role
        };

        setProfile(newProfile);

        // Update global user state immediately so sidebar reflects the change
        updateUser(newProfile);

        // Immediate log for identity selection
        logAction({
            userEmail: member.email,
            userName: member.name,
            action: 'LOGIN',
            label: `S'est identifié en tant que ${member.name}`,
            module: 'Paramètres'
        });

        toast({
            title: "Identité sélectionnée",
            description: `Vous naviguez maintenant en tant que ${member.name}.`,
        });
    };

    const getInitials = (name: string): string => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            await updateUser(profile);
            logAction({
                userEmail: profile.email || '',
                userName: profile.name || '',
                action: 'SETTINGS_UPDATE',
                label: `A mis à jour son profil utilisateur`,
                module: 'Paramètres'
            });
            toast({
                title: "Profil mis à jour",
                description: "Vos modifications ont été enregistrées avec succès.",
            });

            // Persistence des modifications de timeline
            const result = await persistChanges();

            if (result.success) {
                toast({
                    title: "✓ Timeline enregistrée",
                    description: "Les modifications de la timeline ont été sauvegardées avec succès.",
                });
            } else {
                toast({
                    title: "⚠ Erreur de sauvegarde",
                    description: result.error || "Les modifications locales ont été conservées.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "✗ Erreur",
                description: error instanceof Error ? error.message : "Une erreur est survenue",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setProfile(prev => ({ ...prev, [id]: value }));
    };

    const handleRoleChange = (value: string) => {
        setProfile(prev => ({ ...prev, role: value }));
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold font-headline flex items-center">
                    <SettingsIcon className="mr-3 h-8 w-8 text-primary" />
                    Paramètres
                </h1>
                <p className="text-muted-foreground md:ml-12">Gérez les paramètres de votre compte, de l'interface et des notifications.</p>
            </div>

            <Separator />

            {/* Section Sélection d'Identité */}
            <Card className="border-2 border-primary/20 shadow-md">
                <CardHeader className="bg-primary/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <UserCheck className="h-5 w-5 text-primary" />
                                Qui êtes-vous ?
                            </CardTitle>
                            <CardDescription>Sélectionnez votre profil parmi les membres de l'équipe pour personnaliser votre expérience.</CardDescription>
                        </div>
                        {isAdmin(profile.email || '') && (
                            <Link href="/settings/admin/activity">
                                <Button variant="outline" size="sm" className="gap-2 font-bold border-primary/30 text-primary hover:bg-primary/5">
                                    <Activity className="h-4 w-4" />
                                    Journal d'Activité Admin
                                </Button>
                            </Link>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {humanMembers.map((member) => {
                            // Match against authEmail or current profile email
                            const loginEmail = user?.authEmail || user?.email;
                            const isEmailMatch = loginEmail === member.email || loginEmail === member.secondaryEmail;
                            const isNameMatch = user?.name === member.name;
                            const isActive = isEmailMatch && isNameMatch;
                            const isSuggested = isEmailMatch && !isNameMatch;

                            return (
                                <button
                                    key={member.id}
                                    onClick={() => handleSelectIdentity({
                                        name: member.name,
                                        email: loginEmail || member.email || '',
                                        role: member.role
                                    })}
                                    className={cn(
                                        "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden",
                                        isActive
                                            ? "border-primary bg-primary/5 ring-4 ring-primary/10 shadow-lg scale-[1.02]"
                                            : isSuggested
                                                ? "border-amber-200 bg-amber-50/50 hover:border-amber-400 animate-pulse-subtle shadow-inner"
                                                : "border-slate-100 hover:border-primary/40 hover:bg-slate-50 shadow-sm"
                                    )}
                                >
                                    <Avatar className={cn("h-12 w-12 border-2", isActive ? "border-primary" : isSuggested ? "border-amber-400" : "border-slate-200")}>
                                        <AvatarFallback className={cn("font-black", isActive ? "bg-primary text-white" : isSuggested ? "bg-amber-500 text-white" : "bg-slate-100")}>
                                            {getInitials(member.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn("font-bold truncate", isActive ? "text-primary" : "text-slate-900")}>
                                            {member.name}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{member.role}</p>
                                        {isActive && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <ShieldCheck className="h-3 w-3 text-primary" />
                                                <span className="text-[9px] font-bold text-primary uppercase">Moi (Actif)</span>
                                            </div>
                                        )}
                                        {isSuggested && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <UserCheck className="h-3 w-3 text-amber-600" />
                                                <span className="text-[9px] font-black text-amber-600 uppercase">C'est vous ? Cliquez ici</span>
                                            </div>
                                        )}
                                    </div>
                                    {isSuggested && (
                                        <div className="absolute top-0 right-0 p-1">
                                            <div className="bg-amber-500 w-2 h-2 rounded-full animate-ping" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Profil Utilisateur</CardTitle>
                    <CardDescription>Modifiez vos informations de profil. Celles-ci seront mises à jour dans toute l'application.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nom</Label>
                        <Input id="name" value={profile.name || ''} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role">Rôle</Label>
                        <Select value={profile.role || ''} onValueChange={handleRoleChange}>
                            <SelectTrigger id="role">
                                <SelectValue placeholder="Choisir un rôle" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableRoles.map(role => (
                                    <SelectItem key={role} value={role}>{role}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={profile.email || ''} onChange={handleInputChange} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Interface</CardTitle>
                    <CardDescription>Personnalisez l'apparence de l'application et les listes de valeurs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <Label htmlFor="dark-mode">Mode Sombre</Label>
                            <p className="text-sm text-muted-foreground">
                                Activez le mode sombre pour une interface plus reposante.
                            </p>
                        </div>
                        <Switch
                            id="dark-mode"
                            aria-label="Toggle dark mode"
                            checked={isDarkMode}
                            onCheckedChange={toggleDarkMode}
                        />
                    </div>
                    <Link href="/settings/document-types" className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <FileType className="h-6 w-6 text-muted-foreground" />
                            <div>
                                <Label>Gestion des Types de Documents</Label>
                                <p className="text-sm text-muted-foreground">
                                    Ajoutez, modifiez ou supprimez les types de documents.
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Horizons Réglementaires
                    </CardTitle>
                    <CardDescription>Gérez les échéances critiques affichées sur votre tableau de bord.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4">
                        {events.map((event) => (
                            <div key={event.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-900/50 relative group">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase opacity-50">Échéance</Label>
                                    <Input
                                        type="date"
                                        value={event.date}
                                        onChange={(e) => updateEvent({ ...event, date: e.target.value })}
                                        className="h-9 text-xs font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase opacity-50">Titre</Label>
                                    <Input
                                        value={event.title}
                                        onChange={(e) => updateEvent({ ...event, title: e.target.value })}
                                        className="h-9 text-xs font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase opacity-50">Catégorie</Label>
                                    <Input
                                        value={event.category}
                                        onChange={(e) => updateEvent({ ...event, category: e.target.value })}
                                        className="h-9 text-xs font-bold"
                                    />
                                </div>
                                <div className="space-y-2 flex-1">
                                    <Label className="text-[10px] font-black uppercase opacity-50">Couleur d'identification</Label>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {availableTimelineColors.map((color) => (
                                            <button
                                                key={color.class}
                                                onClick={() => updateEvent({ ...event, color: color.class })}
                                                className={cn(
                                                    "w-8 h-8 rounded-full border-2 transition-all",
                                                    event.color === color.class
                                                        ? "border-slate-900 dark:border-white scale-110 shadow-md"
                                                        : "border-transparent hover:scale-105",
                                                    color.class
                                                )}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-end pb-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteEvent(event.id)}
                                        className="h-9 w-9 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addEvent({ date: "NOUVELLE DATE", title: "NOUVEAU TITRE", category: "AUTRE", color: "bg-slate-500" })}
                        className="w-full border-dashed rounded-xl h-12 text-xs font-black uppercase tracking-widest gap-2"
                    >
                        <Plus className="h-4 w-4" /> Ajouter une échéance
                    </Button>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="gap-2"
                >
                    {isSaving ? (
                        <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Enregistrement...
                        </>
                    ) : (
                        "✓ Enregistrer les Modifications"
                    )}
                </Button>
            </div>
        </div>
    );
}
