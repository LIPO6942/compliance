'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, CheckCircle2, Loader2, ShieldCheck, AlertCircle, Smartphone, ArrowRight, RefreshCw } from 'lucide-react';
import { Logo } from '@/components/icons/Logo';
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
    const {
        login,
        completeEmailSignIn,
        isLoaded,
        user,
        emailLinkStatus,
        emailLinkError,
        clearEmailLinkStatus
    } = useUser();

    const router = useRouter();
    const { toast } = useToast();

    const [email, setEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [isSent, setIsSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);

    // Auto-redirect if already authenticated
    useEffect(() => {
        if (user && isLoaded) {
            const timer = setTimeout(() => {
                router.push('/dashboard');
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [user, isLoaded, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            await login(email);
            setIsSent(true);
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Erreur d'envoi",
                description: "Une erreur est survenue lors de l'envoi du mail. Vérifiez votre connexion ou la configuration Firebase.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirmEmail) return;

        setConfirmLoading(true);
        try {
            await completeEmailSignIn(confirmEmail);
            toast({
                title: "Connexion réussie",
                description: "Votre identité a été validée avec succès.",
            });
        } catch (err) {
            // Error is handled and stored in emailLinkError
        } finally {
            setConfirmLoading(false);
        }
    };

    // State 1: Already authenticated
    if (user && isLoaded) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
                <Card className="w-full max-w-md border-2 border-slate-100 shadow-xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300">
                    <CardHeader className="text-center pt-10">
                        <div className="mx-auto w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                            <ShieldCheck className="h-8 w-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl font-black">Vous êtes connecté</CardTitle>
                        <CardDescription className="text-slate-500 font-medium">
                            Redirection vers votre espace de travail...
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-10 text-center space-y-3">
                        <Button
                            className="w-full rounded-xl font-bold flex items-center justify-center gap-2"
                            onClick={() => router.push('/dashboard')}
                        >
                            <span>Accéder au tableau de bord</span>
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // State 2: Automatic verification in progress
    if (emailLinkStatus === 'verifying') {
        return (
            <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
                <Card className="w-full max-w-md border-2 border-slate-100 shadow-xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300 text-center">
                    <CardHeader className="pt-10 pb-4">
                        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        </div>
                        <CardTitle className="text-2xl font-black">Vérification de l'identité</CardTitle>
                        <CardDescription className="text-slate-500 font-medium px-4">
                            Validation sécurisée de votre lien de connexion...
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-10">
                        <p className="text-xs text-slate-400">Veuillez patienter quelques instants</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // State 3: User opened link on mobile / cross-device and needs to enter email
    if (emailLinkStatus === 'needs-email') {
        return (
            <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
                <Card className="w-full max-w-md border-2 border-slate-100 shadow-xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300">
                    <CardHeader className="text-center pt-10">
                        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                            <Smartphone className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-black tracking-tight">Vérification sur votre téléphone</CardTitle>
                        <CardDescription className="text-slate-500 font-medium px-4">
                            Pour finaliser votre connexion sécurisée sur cet appareil, veuillez confirmer votre adresse email professionnelle.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-10 pt-2 space-y-4">
                        {emailLinkError && (
                            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2.5">
                                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-600" />
                                <div>{emailLinkError}</div>
                            </div>
                        )}

                        <form onSubmit={handleConfirmEmailSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    Votre adresse email
                                </label>
                                <Input
                                    type="email"
                                    placeholder="nom@mae.com.tn"
                                    value={confirmEmail}
                                    onChange={(e) => setConfirmEmail(e.target.value)}
                                    required
                                    autoFocus
                                    className="h-12 px-4 rounded-xl border-2 border-slate-100 focus:border-primary/30 focus:ring-primary/10 font-medium"
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20"
                                disabled={confirmLoading}
                            >
                                {confirmLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirmer et ouvrir l'application
                            </Button>
                        </form>

                        <div className="pt-2 text-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                                onClick={clearEmailLinkStatus}
                            >
                                Recommencer avec un autre lien
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // State 4: Email link validation failed / error
    if (emailLinkStatus === 'error') {
        return (
            <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
                <Card className="w-full max-w-md border-2 border-red-100 shadow-xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300">
                    <CardHeader className="text-center pt-10">
                        <div className="mx-auto w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                            <AlertCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <CardTitle className="text-2xl font-black text-slate-900">Échec de vérification</CardTitle>
                        <CardDescription className="text-slate-600 font-medium px-4">
                            {emailLinkError || "Le lien de connexion est expiré ou invalide."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-10 pt-2 space-y-3">
                        <Button
                            className="w-full h-12 rounded-xl font-bold shadow-lg"
                            onClick={() => {
                                clearEmailLinkStatus();
                                setIsSent(false);
                            }}
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Demander un nouveau lien
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // State 5: Default Login Page (Request new magic link)
    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
            <Card className="w-full max-w-md border-2 border-slate-100 shadow-xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300">
                <CardHeader className="text-center pt-10">
                    <div className="mx-auto mb-4 flex justify-center">
                        <Logo className="h-20 w-20 bg-white shadow-xl rounded-full p-2" />
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
                                    Consultez votre boîte mail (<strong>{email}</strong>) sur cet appareil ou votre téléphone et cliquez sur le lien pour vous connecter.
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

