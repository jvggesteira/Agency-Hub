'use client';

import { useAuth } from '@/hooks/use-auth';
import { redirect, usePathname } from 'next/navigation';
import React, { useEffect } from 'react';

const PUBLIC_ROUTES = ['/login'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && !isPublicRoute) {
        redirect('/login');
      }
      if (isAuthenticated && pathname === '/login') {
        redirect('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, pathname, isPublicRoute]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated && !isPublicRoute) {
    return null; // Redirecionamento já foi acionado no useEffect
  }

  return <>{children}</>;
}