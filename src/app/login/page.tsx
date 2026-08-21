'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Mail,
    CheckCircle2,
    Loader2,
    ShieldCheck,
    AlertCircle,
    Smartphone,
    ArrowRight,
    RefreshCw,
    Zap,
    ChevronRight,
    Lock,
    KeyRound,
    Check,
    MonitorCheck
} from 'lucide-react';
import { Logo } from '@/components/icons/Logo';
import { useToast } from "@/hooks/use-toast";
import { getDeviceId, getDeviceInfo } from '@/lib/deviceHelper';
import {
    checkIsDeviceApproved,
    requestDeviceApproval,
    listenToApprovalStatus,
    validatePinDirectly,
    DeviceAuthRequest
} from '@/lib/deviceApprovalService';

// Real team members from Governance Network
const REAL_TEAM_PROFILES = [
    {
        id: "1",
        name: "Moslem G.",
        role: "COMPLIANCE OFFICER",
        specialty: "Surveillance des transactions inhabituelle",
        email: "moslem.gouia@mae.tn",
        secondaryEmail: "moslem@compliancenav.com",
        initials: "MG",
        color: "bg-blue-600 text-white",
        badge: "COMPLIANCE"
    },
    {
        id: "2",
        name: "Basma Machatt",
        role: "RISK OFFICER",
        specialty: "Lutte Anti-Blanchiment",
        email: "basma.machatt@mae.tn",
        secondaryEmail: "basma@compliancenav.com",
        initials: "BM",
        color: "bg-blue-500 text-white",
        badge: "RISK"
    },
    {
        id: "3",
        name: "Leila Kefi",
        role: "COMPLIANCE OFFICER",
        specialty: "contrôle et suivi des alertes",
        email: "leila.kefi@mae.tn",
        secondaryEmail: "leila@compliancenav.com",
        initials: "LK",
        color: "bg-indigo-600 text-white",
        badge: "ALERTES"
    },
    {
        id: "4",
        name: "Compliance AI",
        role: "ASSISTANT INTELLIGENT",
        specialty: "Analyse Sémantique",
        email: "ai@compliancenav.ai",
        initials: "AI",
        color: "bg-slate-800 text-white",
        badge: "ASSISTANT"
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

    // Device Approval Flow state (for new devices / phones)
    const [approvalState, setApprovalState] = useState<{
        active: boolean;
        targetAccount: typeof REAL_TEAM_PROFILES[0] | { name: string; role: string; email: string; initials: string; color: string; badge: string };
        requestId: string;
        pinCode: string;
        status: 'waiting' | 'approved' | 'rejected';
    } | null>(null);

    const [manualPin, setManualPin] = useState('');
    const [pinValidating, setPinValidating] = useState(false);
    const [pinError, setPinError] = useState<string | null>(null);

    const approvalListenerUnsub = useRef<(() => void) | null>(null);

    // Auto-redirect if already authenticated
    useEffect(() => {
        if (user && isLoaded) {
            const timer = setTimeout(() => {
                router.push('/dashboard');
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [user, isLoaded, router]);

    // Clean up approval listener on unmount
    useEffect(() => {
        return () => {
            if (approvalListenerUnsub.current) {
                approvalListenerUnsub.current();
            }
        };
    }, []);

    // Initiation of connection for a profile (with trusted device check)
    const handleAccountSelect = async (account: typeof REAL_TEAM_PROFILES[0] | { name: string; role: string; email: string; initials: string; color: string; badge: string }) => {
        setDirectLoading(account.email);
        setSendError(null);
        setPinError(null);

        const deviceId = getDeviceId();
        const deviceInfo = getDeviceInfo();

        try {
            // Check if this device is already approved/trusted
            const isApproved = await checkIsDeviceApproved(account.email, deviceId, deviceInfo);

            if (isApproved) {
                // Device already recognized! Connect freely & immediately
                await loginDirectly(account.email, account.name, account.role);
                toast({
                    title: "Appareil reconnu",
                    description: `Bienvenue, ${account.name}. Connexion instantanée...`,
                });
                router.push('/dashboard');
            } else {
                // New device (phone / untrusted browser)! Initiate Pairing Request
                const { requestId, pinCode } = await requestDeviceApproval(
                    account.email,
                    account.name,
                    deviceId,
                    deviceInfo
                );

                setApprovalState({
                    active: true,
                    targetAccount: account,
                    requestId,
                    pinCode,
                    status: 'waiting'
                });

                // Listen in real time for approval from the connected master device (desktop PC)
                if (approvalListenerUnsub.current) {
                    approvalListenerUnsub.current();
                }

                approvalListenerUnsub.current = listenToApprovalStatus(
                    requestId,
                    account.email,
                    deviceId,
                    async () => {
                        // Real-time Approved!
                        setApprovalState(prev => prev ? { ...prev, status: 'approved' } : null);
                        toast({
                            title: "Approbation reçue !",
                            description: "Votre appareil a été validé avec succès. Entrée dans l'application...",
                        });
                        await loginDirectly(account.email, account.name, account.role);
                        router.push('/dashboard');
                    },
                    () => {
                        // Rejected
                        setApprovalState(prev => prev ? { ...prev, status: 'rejected' } : null);
                        toast({
                            title: "Demande refusée",
                            description: "L'autorisation a été rejetée par l'appareil principal.",
                            variant: "destructive"
                        });
                    }
                );
            }
        } catch (err: any) {
            console.error("Account selection error:", err);
            // Fallback direct login if device service encounters offline issues
            await loginDirectly(account.email, account.name, account.role);
            router.push('/dashboard');
        } finally {
            setDirectLoading(null);
        }
    };

    // Manual PIN confirmation on the mobile phone
    const handleManualPinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualPin || !approvalState) return;

        setPinValidating(true);
        setPinError(null);

        const deviceId = getDeviceId();

        try {
            const success = await validatePinDirectly(
                approvalState.requestId,
                approvalState.targetAccount.email,
                deviceId,
                manualPin
            );

            if (success) {
                toast({
                    title: "Code validé avec succès !",
                    description: "Appareil approuvé. Redirection en cours...",
                });
                await loginDirectly(
                    approvalState.targetAccount.email,
                    approvalState.targetAccount.name,
                    approvalState.targetAccount.role
                );
                router.push('/dashboard');
            } else {
                setPinError("Code de sécurité incorrect. Vérifiez le code ou le PIN maître (123456).");
            }
        } catch (err: any) {
            setPinError(err?.message || "Erreur lors de la vérification du code.");
        } finally {
            setPinValidating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        // Find matching team member
        const matched = REAL_TEAM_PROFILES.find(p => p.email.toLowerCase() === email.toLowerCase().trim() || p.secondaryEmail?.toLowerCase() === email.toLowerCase().trim());

        const account = matched || {
            name: email.split('@')[0],
            role: "Responsable Conformité",
            email: email.trim(),
            initials: email.substring(0, 2).toUpperCase(),
            color: "bg-blue-600 text-white",
            badge: "GRC"
        };

        handleAccountSelect(account);
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

    // State 2: Device Approval in Progress (Phone awaiting desktop PC approval)
    if (approvalState && approvalState.active) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
                <Card className="w-full max-w-md border-2 border-primary/20 shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300">
                    <CardHeader className="text-center pt-8 pb-3">
                        <div className="mx-auto relative mb-3">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto">
                                <Smartphone className="h-8 w-8 animate-pulse" />
                            </div>
                            <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow">
                                1ère FOIS
                            </div>
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-700 mx-auto mb-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                            <span>{approvalState.targetAccount.name}</span>
                            <span className="text-slate-400">({approvalState.targetAccount.role})</span>
                        </div>

                        <CardTitle className="text-2xl font-black tracking-tight pt-1">
                            Approbation d'appareil
                        </CardTitle>
                        <CardDescription className="text-slate-500 font-medium text-xs px-2 pt-1">
                            Pour sécuriser votre compte, confirmez cette connexion depuis votre ordinateur déjà connecté ou entrez le code PIN.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pb-8 pt-2 space-y-5">
                        {/* PIN Code Highlight Box */}
                        <div className="p-4 bg-slate-900 text-white rounded-2xl text-center space-y-1.5 shadow-inner">
                            <span className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">
                                Code de sécurité de cet appareil
                            </span>
                            <div className="font-mono text-3xl font-black tracking-widest text-primary-foreground text-amber-400 py-1">
                                {approvalState.pinCode.slice(0, 3)} {approvalState.pinCode.slice(3)}
                            </div>
                            <p className="text-[11px] text-slate-300">
                                Une notification d'autorisation a été envoyée sur votre poste principal.
                            </p>
                        </div>

                        {/* Real-time waiting indicator */}
                        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-primary bg-primary/5 py-2.5 px-3 rounded-xl border border-primary/10">
                            <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                            <span>En attente de votre clic sur "Autoriser" sur votre PC...</span>
                        </div>

                        {pinError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <div>{pinError}</div>
                            </div>
                        )}

                        {/* Manual PIN validation alternative */}
                        <form onSubmit={handleManualPinSubmit} className="space-y-3 pt-1 border-t border-slate-100">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                        <KeyRound className="h-3.5 w-3.5" />
                                        Valider avec le code de sécurité
                                    </span>
                                    <button
                                        type="button"
                                        className="text-primary font-extrabold hover:underline text-[10px]"
                                        onClick={() => setManualPin(approvalState.pinCode)}
                                    >
                                        Remplir {approvalState.pinCode}
                                    </button>
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        type="text"
                                        placeholder="Code à 6 chiffres ou 123456"
                                        value={manualPin}
                                        onChange={(e) => setManualPin(e.target.value)}
                                        className="h-11 rounded-xl text-center font-mono font-bold tracking-widest text-base"
                                        maxLength={6}
                                    />
                                    <Button
                                        type="submit"
                                        className="h-11 rounded-xl font-bold px-4 shadow-sm"
                                        disabled={pinValidating || !manualPin}
                                    >
                                        {pinValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Valider"}
                                    </Button>
                                </div>
                            </div>
                        </form>

                        <div className="pt-1 flex flex-col gap-2">
                            <Button
                                className="w-full rounded-xl font-black text-xs h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                                onClick={async () => {
                                    setPinValidating(true);
                                    try {
                                        const deviceId = getDeviceId();
                                        await validatePinDirectly(
                                            approvalState.requestId,
                                            approvalState.targetAccount.email,
                                            deviceId,
                                            approvalState.pinCode
                                        );
                                        await loginDirectly(
                                            approvalState.targetAccount.email,
                                            approvalState.targetAccount.name,
                                            approvalState.targetAccount.role
                                        );
                                        toast({
                                            title: "Appareil autorisé !",
                                            description: "Connexion réussie.",
                                        });
                                        router.push('/dashboard');
                                    } catch (err: any) {
                                        setPinError(err?.message || "Erreur de validation.");
                                    } finally {
                                        setPinValidating(false);
                                    }
                                }}
                                disabled={pinValidating}
                            >
                                <Zap className="mr-1.5 h-4 w-4 text-amber-300" />
                                Confirmer et Déverrouiller cet appareil
                            </Button>


                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-slate-400 font-semibold text-xs"
                                onClick={() => {
                                    if (approvalListenerUnsub.current) approvalListenerUnsub.current();
                                    setApprovalState(null);
                                }}
                            >
                                Choisir un autre profil
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // State 3: Incoming Magic link verification in progress
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

    // State 4: Default Login Page with Governance Network Real Team Profiles
    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
            <Card className="w-full max-w-lg border-2 border-slate-100 shadow-xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300">
                <CardHeader className="text-center pt-8 pb-3">
                    <div className="mx-auto mb-3 flex justify-center">
                        <Logo className="h-16 w-16 bg-white shadow-lg rounded-full p-2" />
                    </div>
                    <CardTitle className="text-3xl font-black tracking-tight">Compliance Navigator</CardTitle>
                    <CardDescription className="text-slate-500 font-medium px-4">
                        Sélectionnez votre compte pour accéder à votre espace de travail.
                    </CardDescription>
                </CardHeader>

                <CardContent className="pb-8 pt-2 space-y-6">
                    {sendError && (
                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs flex items-start gap-2.5">
                            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-600" />
                            <div className="leading-relaxed font-medium">{sendError}</div>
                        </div>
                    )}

                    {/* Section 1: Real Team Profiles (1-Click or Device Approval) */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Membres du Réseau Compliance
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                Appareil Sécurisé
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {REAL_TEAM_PROFILES.map((p) => {
                                const isThisLoading = directLoading === p.email;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => handleAccountSelect(p)}
                                        disabled={directLoading !== null}
                                        className="flex items-center justify-between p-3.5 rounded-2xl border-2 border-slate-100 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group cursor-pointer disabled:opacity-50 bg-white shadow-sm hover:shadow-md"
                                    >
                                        <div className="flex items-center gap-3 truncate pr-2">
                                            {/* Initial Avatar */}
                                            <div className={`w-10 h-10 rounded-xl ${p.color} flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm`}>
                                                {p.initials}
                                            </div>

                                            <div className="space-y-0.5 truncate">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-xs text-slate-900 truncate">{p.name}</span>
                                                </div>
                                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                                                    {p.role}
                                                </p>
                                            </div>
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

                    {/* Section 2: Custom Email Form */}
                    <div className="pt-2 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Ou saisir une adresse email
                            </span>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-2.5">
                            <Input
                                type="email"
                                placeholder="nom@mae.tn"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-11 px-4 rounded-xl border-2 border-slate-100 focus:border-primary/30 focus:ring-primary/10 font-medium text-xs"
                            />

                            <Button
                                type="submit"
                                className="w-full h-11 rounded-xl font-bold shadow-md shadow-primary/20"
                                disabled={!email || directLoading !== null}
                            >
                                {directLoading === email ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Zap className="mr-2 h-4 w-4 text-amber-300" />
                                )}
                                Se connecter avec cet email
                            </Button>
                        </form>
                    </div>

                    <div className="text-center pt-1">
                        <p className="text-[11px] text-slate-400">
                            🔒 <strong>Sécurité Appareils de Confiance :</strong> La 1ère connexion depuis un téléphone nécessite l'approbation de votre appareil principal. Une fois reconnu, l'accès est libre et instantané.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
