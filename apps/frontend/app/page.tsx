'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // useEffect(() => {
  //   if (!isLoading) {
  //     router.push(isAuthenticated ? '/dashboard' : '/login');
  //   }
  // }, [isAuthenticated, isLoading, router]);

  return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
}
