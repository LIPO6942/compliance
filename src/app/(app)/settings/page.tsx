
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
    const { toast } = useToast();

    const handleSaveChanges = () => {
        toast({
            title: "Paramètres enregistrés",
            description: "Vos modifications ont été enregistrées avec succès.",
        });
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
                    <CardTitle>Profil</CardTitle>
                    <CardDescription>Informations publiques de votre compte.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nom</Label>
                        <Input id="name" defaultValue="Moslem" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue="conformite@mae.com.tn" readOnly />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="role">Rôle</Label>
                        <Input id="role" defaultValue="Conformité MAE" readOnly />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Interface</CardTitle>
                    <CardDescription>Personnalisez l'apparence de l'application.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <Label htmlFor="dark-mode">Mode Sombre</Label>
                            <p className="text-sm text-muted-foreground">
                                Activez le mode sombre pour une interface plus reposante.
                            </p>
                        </div>
                        <Switch id="dark-mode" aria-label="Toggle dark mode" />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSaveChanges}>Enregistrer les Modifications</Button>
            </div>
        </div>
    );
}
