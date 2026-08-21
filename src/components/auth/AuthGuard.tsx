'use client';

import { useUser } from '@/contexts/UserContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const [isTimedOut, setIsTimedOut] = useState(false);

    useEffect(() => {
        if (isLoaded && !user && pathname !== '/login') {
            router.push('/login');
        }
    }, [user, isLoaded, pathname, router]);

    // Safety timeout to avoid getting permanently stuck on loading screen
    useEffect(() => {
        if (isLoaded && user) {
            setIsTimedOut(false);
            return;
        }

        const timer = setTimeout(() => {
            if (!isLoaded || !user) {
                setIsTimedOut(true);
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [isLoaded, user]);

    if (!isLoaded || (!user && pathname !== '/login')) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
                <div className="flex flex-col items-center gap-4 text-center max-w-sm">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <div className="space-y-1">
                        <p className="font-bold text-slate-700">Vérification de l'identité...</p>
                        <p className="text-xs text-slate-400">Chargement de votre profil sécurisé</p>
                    </div>

                    {isTimedOut && (
                        <div className="mt-4 p-4 bg-white rounded-2xl shadow-md border border-slate-100 space-y-3 animate-in fade-in duration-300">
                            <p className="text-xs text-slate-500 font-medium">
                                La vérification prend plus de temps que prévu.
                            </p>
                            <div className="flex flex-col gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full text-xs font-bold"
                                    onClick={() => window.location.reload()}
                                >
                                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                    Actualiser la page
                                </Button>
                                <Button
                                    size="sm"
                                    className="w-full text-xs font-bold"
                                    onClick={() => router.push('/login')}
                                >
                                    <LogIn className="mr-2 h-3.5 w-3.5" />
                                    Page de connexion
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

