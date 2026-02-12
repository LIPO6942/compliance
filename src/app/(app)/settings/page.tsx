
"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, ChevronRight, FileType } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useState, useEffect } from "react";
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

            <div className="flex justify-end">
                <Button onClick={handleSaveChanges}>Enregistrer les Modifications</Button>
            </div>
        </div>
    );
}
