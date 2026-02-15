
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
import { useState, useEffect } from "react";
import { useTimeline } from "@/contexts/TimelineContext";
import { Trash2, Plus, Calendar, Bookmark, Palette, Settings as SettingsIcon, FileType, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function SettingsPage() {
    const { toast } = useToast();
    const { user, updateUser, isLoaded } = useUser();
    const [profile, setProfile] = useState<Partial<UserProfile>>({
        name: '',
        email: '',
        role: ''
    });
    const { isDarkMode, toggleDarkMode } = useTheme();
    const { events, updateEvent, addEvent, deleteEvent } = useTimeline();

    useEffect(() => {
        if (isLoaded && user) {
            setProfile(user);
        }
    }, [user, isLoaded]);

    const handleSaveChanges = () => {
        updateUser(profile);
        toast({
            title: "Paramètres enregistrés",
            description: "Vos modifications ont été enregistrées avec succès.",
        });
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
                                    <Label className="text-[10px] font-black uppercase opacity-50">Date</Label>
                                    <Input
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
                                <div className="space-y-1 flex gap-2 items-end">
                                    <div className="flex-1">
                                        <Label className="text-[10px] font-black uppercase opacity-50">Couleur (Tailwind bg-*)</Label>
                                        <div className="flex gap-2">
                                            <div className={cn("w-9 h-9 rounded-lg shrink-0 border", event.color)} />
                                            <Input
                                                value={event.color}
                                                onChange={(e) => updateEvent({ ...event, color: e.target.value })}
                                                className="h-9 text-xs font-mono"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteEvent(event.id)}
                                        className="h-9 w-9 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
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
                <Button onClick={handleSaveChanges}>Enregistrer les Modifications</Button>
            </div>
        </div>
    );
}
