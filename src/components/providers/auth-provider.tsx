'use client';

import { createContext, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext({});

export const useAuthContext = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // O segredo da estabilidade está aqui:
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      
      // Se o token foi renovado automaticamente, atualiza a página para o Next.js pegar o novo cookie
      if (event === 'TOKEN_REFRESHED') {
        console.log('Sessão renovada automaticamente.');
        router.refresh();
      }

      // Se o usuário saiu ou foi expulso, manda pro login na hora
      if (event === 'SIGNED_OUT') {
        router.push('/login');
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return <AuthContext.Provider value={{}}>{children}</AuthContext.Provider>;
}