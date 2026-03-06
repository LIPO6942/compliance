'use client';

import { useUser } from '@/contexts/UserContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (isLoaded && !user && pathname !== '/login') {
            router.push('/login');
        }
    }, [user, isLoaded, pathname, router]);

    if (!isLoaded || (!user && pathname !== '/login')) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="font-bold text-slate-400">Vérification de l'identité...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
