'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function NewWorkflowRedirect() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const domain = searchParams.get('domain');
        // Generate a random ID locally
        const newId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        let url = `/admin/workflows/${newId}/edit`;
        if (domain) {
            url += `?domain=${encodeURIComponent(domain)}`;
        }

        router.replace(url);
    }, [router, searchParams]);

    return (
        <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground animate-pulse">Initialisation du workflow...</p>
            </div>
        </div>
    );
}

export default function NewWorkflowPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-muted-foreground">Chargement...</p>
                </div>
            </div>
        }>
            <NewWorkflowRedirect />
        </Suspense>
    );
}
