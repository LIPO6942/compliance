'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (user) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [user, isLoaded, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
}

