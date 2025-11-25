// src/components/custom/auth-guard.tsx

'use client';

import { useAuth } from '@/hooks/use-auth';
// Mudança: Importamos useRouter em vez de redirect
import { usePathname, useRouter } from 'next/navigation'; 
import React, { useEffect } from 'react';

// Rotas públicas que não exigem autenticação
const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  // Pega o estado do hook
  const { isAuthenticated, isLoading } = useAuth(); 
  const pathname = usePathname();
  // Mudança: Inicializa o useRouter
  const router = useRouter(); 
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Lógica de redirecionamento (Executa sempre que o estado de autenticação mudar)
  useEffect(() => {
    // 1. REGRA CRÍTICA: Se o estado ainda está carregando, SAIA.
    if (isLoading) return; 

    // 2. Cenário A: Usuário NÃO logado tentando acessar Rota Privada
    if (!isAuthenticated && !isPublicRoute) {
      // Redirecionamento suave que não força o re-render
      router.push('/login'); 
      return;
    }

    // 3. Cenário B: Usuário logado tentando acessar Rota Pública (como /login)
    if (isAuthenticated && isPublicRoute) {
      // Redirecionamento suave que não força o re-render
      router.push('/dashboard');
      return;
    }
    
  }, [isAuthenticated, isLoading, pathname, isPublicRoute, router]);

  // 4. O QUE MOSTRAR ENQUANTO CARREGA
  // Se o estado ainda está sendo resolvido (isLoading é true), mostre o loader.
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 5. Se passou por todas as verificações, mostre o conteúdo.
  // Se o redirecionamento foi acionado, o router.push já está atuando, então renderizamos children.
  return <>{children}</>;
}