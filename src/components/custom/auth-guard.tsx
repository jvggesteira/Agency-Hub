'use client';

import { useAuth } from '@/hooks/use-auth';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

// 1. LISTA ATUALIZADA (O Ponto Chave)
const PUBLIC_ROUTES = [
  '/login', 
  '/signup', 
  '/forgot-password', 
  '/verify',           // Necessário para validar o token
  '/update-password',  // Necessário para definir a senha
  '/auth/callback'     // Necessário para processos internos
];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth(); 
  const pathname = usePathname();
  const router = useRouter(); 
  
  // Estado para evitar piscar conteúdo protegido
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // 1. Se o Supabase ainda está carregando, não faz nada
    if (isLoading) return; 

    // Verifica se a rota atual começa com alguma das rotas públicas
    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));

    if (isPublicRoute) {
        // Se é pública, libera
        setIsChecking(false);

        // Opcional: Se já está logado e tenta ir pro login, manda pro dashboard.
        // MAS: Não redireciona se estiver no update-password ou verify
        if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
            router.replace('/dashboard');
        }
    } else {
        // Se é rota privada
        if (!isAuthenticated) {
            // Não logado -> Login
            router.replace('/login');
        } else {
            // Logado -> Libera
            setIsChecking(false);
        }
    }
    
  }, [isAuthenticated, isLoading, pathname, router]);

  // Enquanto verifica, mostra o loading
  if (isLoading || isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 dark:border-white"></div>
      </div>
    );
  }

  return <>{children}</>;
}