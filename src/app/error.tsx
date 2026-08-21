'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Next.js Root Error Boundary caught an exception:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-md border-2 border-red-100 shadow-xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300">
        <CardHeader className="text-center pt-10">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-black text-slate-900">Une anomalie est survenue</CardTitle>
          <CardDescription className="text-slate-600 font-medium px-4">
            {error?.message || "Une erreur inattendue s'est produite lors du chargement de l'application."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-10 pt-2 space-y-3">
          <Button
            className="w-full h-12 rounded-xl font-bold shadow-lg"
            onClick={() => reset()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 rounded-xl font-bold border-2"
            onClick={() => router.push('/login')}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Retourner à la page de connexion
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
