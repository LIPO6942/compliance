'use client';

import React, { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
    const { login, isLoaded, user } = useUser();
    const [email, setEmail] = useState('');
    const [isSent, setIsSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            await login(email);
            setIsSent(true);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (user && isLoaded) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
                <Card className="w-full max-w-md border-2 border-slate-100 shadow-xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300">
                    <CardHeader className="text-center pt-10">
                        <div className="mx-auto w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                            <ShieldCheck className="h-8 w-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl font-black">Vous êtes déjà connecté</CardTitle>
                        <CardDescription className="text-slate-500 font-medium">
                            Redirection en cours...
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-10 text-center">
                        <Button variant="outline" className="rounded-xl" onClick={() => window.location.href = '/'}>
                            Aller au tableau de bord
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
            <Card className="w-full max-w-md border-2 border-slate-100 shadow-xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300">
                <CardHeader className="text-center pt-10">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 text-primary">
                        <Mail className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-3xl font-black tracking-tight">Bienvenue</CardTitle>
                    <CardDescription className="text-slate-500 font-medium px-6">
                        Entrez votre email professionnel pour recevoir un lien de connexion sécurisé.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pb-10 pt-4">
                    {isSent ? (
                        <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="mx-auto w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <div className="space-y-2">
                                <p className="font-bold text-lg">Lien envoyé !</p>
                                <p className="text-sm text-slate-500 px-4">
                                    Consultez votre boîte mail (<strong>{email}</strong>) et cliquez sur le lien pour vous connecter.
                                </p>
                            </div>
                            <Button variant="ghost" className="w-full text-slate-400 font-bold" onClick={() => setIsSent(false)}>
                                Utiliser un autre email
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    type="email"
                                    placeholder="nom@mae.com.tn"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="h-12 px-4 rounded-xl border-2 border-slate-100 focus:border-primary/30 focus:ring-primary/10 font-medium"
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20"
                                disabled={loading}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Envoyer le lien magique
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
