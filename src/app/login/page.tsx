'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, CheckCircle2, Loader2, ShieldCheck, AlertCircle, Smartphone, ArrowRight, RefreshCw, Zap, UserCheck, ChevronRight } from 'lucide-react';
import { Logo } from '@/components/icons/Logo';
import { useToast } from "@/hooks/use-toast";

const QUICK_PROFILES = [
    {
        name: "Moslem G.",
        role: "Direction Compliance & GRC",
        email: "moslem.gouia@mae.tn",
        badge: "Admin",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200"
    },
    {
        name: "Responsable Conformité",
        role: "Équipe Conformité MAE",
        email: "conformite@mae.com.tn",
        badge: "GRC",
        color: "bg-blue-50 text-blue-700 border-blue-200"
    },
    {
        name: "Sarah L.",
        role: "Legal Counsel",
        email: "sarah@compliancenav.com",
        badge: "DPO",
        color: "bg-purple-50 text-purple-700 border-purple-200"
    },
    {
        name: "Karim B.",
        role: "Risk Officer",
        email: "karim@compliancenav.com",
        badge: "LCB-FT",
        color: "bg-amber-50 text-amber-700 border-amber-200"
    }
];

export default function LoginPage() {
    const {
        login,
        loginDirectly,
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
    const [directLoading, setDirectLoading] = useState<string | null>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);

    // Auto-redirect if already authenticated
    useEffect(() => {
        if (user && isLoaded) {
            const timer = setTimeout(() => {
                router.push('/dashboard');
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [user, isLoaded, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        setSendError(null);
        try {
            await login(email);
            setIsSent(true);
        } catch (error: any) {
            console.error("Login send error:", error);
            const msg = error?.message || "Une erreur est survenue lors de l'envoi du mail.";
            setSendError(msg);
            toast({
                title: "Information d'envoi",
                description: msg,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDirectLogin = async (targetEmail: string, name?: string, role?: string) => {
        setDirectLoading(targetEmail);
        setSendError(null);
        try {
            await loginDirectly(targetEmail, name, role);
            toast({
                title: "Connexion réussie",
                description: `Bienvenue, ${name || targetEmail}. Accès à l'application...`,
            });
            router.push('/dashboard');
        } catch (err: any) {
            console.error("Direct login failed:", err);
            toast({
                title: "Erreur de connexion",
                description: err?.message || "Impossible de se connecter.",
                variant: "destructive"
            });
        } finally {
            setDirectLoading(null);
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
            // Handled in context
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

    // State 5: Default Login Page (Request magic link OR Instant direct login)
    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
            <Card className="w-full max-w-lg border-2 border-slate-100 shadow-xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300">
                <CardHeader className="text-center pt-8 pb-4">
                    <div className="mx-auto mb-3 flex justify-center">
                        <Logo className="h-16 w-16 bg-white shadow-lg rounded-full p-2" />
                    </div>
                    <CardTitle className="text-3xl font-black tracking-tight">Bienvenue</CardTitle>
                    <CardDescription className="text-slate-500 font-medium px-4">
                        Accédez à votre espace de travail Compliance & Conformité Réglementaire.
                    </CardDescription>
                </CardHeader>

                <CardContent className="pb-8 pt-2 space-y-6">
                    {sendError && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm space-y-3">
                            <div className="flex items-start gap-2.5">
                                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-600" />
                                <div className="leading-relaxed font-medium">{sendError}</div>
                            </div>
                            {email && (
                                <Button
                                    size="sm"
                                    className="w-full font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow"
                                    onClick={() => handleDirectLogin(email)}
                                    disabled={directLoading !== null}
                                >
                                    {directLoading === email ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                                    Connexion directe avec {email}
                                </Button>
                            )}
                        </div>
                    )}

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
                            <div className="pt-2 space-y-2">
                                <Button
                                    variant="outline"
                                    className="w-full rounded-xl font-bold"
                                    onClick={() => handleDirectLogin(email)}
                                >
                                    <Zap className="mr-2 h-4 w-4 text-amber-500" />
                                    Ouvrir directement sans attendre l'email
                                </Button>
                                <Button variant="ghost" className="w-full text-slate-400 font-bold text-xs" onClick={() => setIsSent(false)}>
                                    Utiliser un autre email
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Email Form */}
                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Email professionnel
                                    </label>
                                    <Input
                                        type="email"
                                        placeholder="nom@mae.com.tn"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="h-12 px-4 rounded-xl border-2 border-slate-100 focus:border-primary/30 focus:ring-primary/10 font-medium"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                    <Button
                                        type="submit"
                                        className="w-full h-11 rounded-xl font-bold shadow-md shadow-primary/20"
                                        disabled={loading || directLoading !== null}
                                    >
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                                        Envoyer le lien
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full h-11 rounded-xl font-bold border-2 border-slate-200 hover:bg-slate-100"
                                        onClick={() => {
                                            if (email) {
                                                handleDirectLogin(email);
                                            } else {
                                                toast({
                                                    title: "Email requis",
                                                    description: "Veuillez entrer une adresse email pour la connexion directe.",
                                                });
                                            }
                                        }}
                                        disabled={loading || directLoading !== null}
                                    >
                                        {directLoading === email ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4 text-amber-500" />}
                                        Connexion directe
                                    </Button>
                                </div>
                            </form>

                            {/* Quick Team Profiles */}
                            <div className="pt-2 border-t border-slate-100 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Accès Rapide par Profil
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                        1 Clic
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {QUICK_PROFILES.map((p) => {
                                        const isThisLoading = directLoading === p.email;
                                        return (
                                            <button
                                                key={p.email}
                                                type="button"
                                                onClick={() => handleDirectLogin(p.email, p.name, p.role)}
                                                disabled={directLoading !== null || loading}
                                                className="flex items-center justify-between p-3 rounded-2xl border-2 border-slate-100 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group cursor-pointer disabled:opacity-50"
                                            >
                                                <div className="space-y-0.5 truncate pr-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-xs text-slate-900 truncate">{p.name}</span>
                                                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border ${p.color}`}>
                                                            {p.badge}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 truncate">{p.role}</p>
                                                </div>
                                                {isThisLoading ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}


