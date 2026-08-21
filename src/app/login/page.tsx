'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck, ArrowRight, ChevronRight } from 'lucide-react';
import { Logo } from '@/components/icons/Logo';
import { useToast } from "@/hooks/use-toast";

// Real team members from Governance Network (mae.tn)
const REAL_TEAM_PROFILES = [
    {
        id: "1",
        name: "Moslem G.",
        role: "COMPLIANCE OFFICER",
        email: "moslem.gouia@mae.tn",
        initials: "MG",
        color: "bg-blue-600",
    },
    {
        id: "2",
        name: "Basma Machatt",
        role: "RISK OFFICER",
        email: "basma.machatt@mae.tn",
        initials: "BM",
        color: "bg-blue-500",
    },
    {
        id: "3",
        name: "Leila Kefi",
        role: "COMPLIANCE OFFICER",
        email: "leila.kefi@mae.tn",
        initials: "LK",
        color: "bg-indigo-600",
    },
    {
        id: "4",
        name: "Compliance AI",
        role: "ASSISTANT INTELLIGENT",
        email: "ai@compliancenav.ai",
        initials: "AI",
        color: "bg-slate-800",
    }
];

export default function LoginPage() {
    const { loginDirectly, isLoaded, user } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    // If already logged in (e.g. auto-restored from localStorage), redirect immediately
    useEffect(() => {
        if (user && isLoaded) {
            router.replace('/dashboard');
        }
    }, [user, isLoaded, router]);

    const handleSelect = async (profile: typeof REAL_TEAM_PROFILES[0]) => {
        setLoadingId(profile.id);
        try {
            await loginDirectly(profile.email, profile.name, profile.role);
            // loginDirectly sets the user state AND persists the profile to localStorage
            // UserContext will see user != null and this page will auto-redirect
        } catch (err: any) {
            toast({
                title: "Erreur de connexion",
                description: err?.message || "Impossible de se connecter.",
                variant: "destructive"
            });
            setLoadingId(null);
        }
    };

    // Still checking stored session
    if (!isLoaded) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Already authenticated — show brief redirect screen
    if (user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="text-center space-y-3">
                    <ShieldCheck className="h-10 w-10 text-green-600 mx-auto" />
                    <p className="font-bold text-slate-700">Connecté — Redirection...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
            <Card className="w-full max-w-md border-2 border-slate-100 shadow-xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300">
                <CardHeader className="text-center pt-8 pb-4">
                    <div className="mx-auto mb-3 flex justify-center">
                        <Logo className="h-16 w-16 bg-white shadow-lg rounded-full p-2" />
                    </div>
                    <CardTitle className="text-2xl font-black tracking-tight">Compliance Navigator</CardTitle>
                    <CardDescription className="text-slate-500 font-medium">
                        Sélectionnez votre compte pour accéder à l'application.
                    </CardDescription>
                </CardHeader>

                <CardContent className="pb-8 pt-2 space-y-2">
                    {REAL_TEAM_PROFILES.map((profile) => {
                        const isLoading = loadingId === profile.id;
                        const isDisabled = loadingId !== null;
                        return (
                            <button
                                key={profile.id}
                                type="button"
                                onClick={() => handleSelect(profile)}
                                disabled={isDisabled}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-primary/40 hover:bg-primary/5 hover:shadow-md transition-all text-left group disabled:opacity-50 disabled:cursor-wait"
                            >
                                {/* Avatar */}
                                <div className={`w-12 h-12 rounded-xl ${profile.color} text-white flex items-center justify-center font-black text-sm flex-shrink-0 shadow`}>
                                    {profile.initials}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-slate-900 truncate">{profile.name}</p>
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide truncate">{profile.role}</p>
                                </div>

                                {/* Arrow or spinner */}
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
                                ) : (
                                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                                )}
                            </button>
                        );
                    })}

                    <p className="text-center text-[11px] text-slate-400 pt-2 pb-1">
                        🔒 Votre session est mémorisée sur cet appareil — connexion automatique lors de vos prochaines visites.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
