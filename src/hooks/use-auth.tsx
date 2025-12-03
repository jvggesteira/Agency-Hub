'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase'; // Ajustei para @/lib se for o padrão, ou mantenha ../lib
import { useRouter, usePathname } from 'next/navigation';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

interface PermissionSet {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  first_name: string;
  last_name: string;
  role: string;
  permissions: Record<string, PermissionSet>;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  const pathname = usePathname(); // MUDANÇA: Saber onde estamos

  // Função auxiliar para buscar/formatar perfil
  const fetchUserProfile = async (supabaseUser: User): Promise<UserProfile | null> => {
    if (!supabaseUser) return null;

    try {
      // Tenta buscar o perfil
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      // Formatação de nome robusta
      const fullName = profile?.name || supabaseUser.email?.split('@')[0] || 'Usuário';
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      // Retorna perfil do banco ou objeto padrão se falhar
      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: fullName,
        first_name: firstName,
        last_name: lastName,
        role: profile?.role || 'collaborator',
        permissions: profile?.permissions || {},
      };

    } catch (error) {
      console.error("Erro silencioso no AuthProvider (Fetch Profile):", error);
      return null;
    }
  };

  const refreshUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // BLINDAGEM: Se estamos na página de update-password, evitamos sobrescrever estado
      if (pathname?.includes('/auth/update-password')) {
         setIsLoading(false);
         return;
      }

      if (session?.user) {
        const profile = await fetchUserProfile(session.user);
        setUser(profile);
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    // Timer de segurança para destravar a tela se o Supabase demorar
    const safetyTimer = setTimeout(() => {
        setIsLoading((prev) => {
            if (prev) return false;
            return prev;
        });
    }, 4000); // Aumentei para 4s para dar tempo em conexões lentas

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      
      // BLINDAGEM CRÍTICA:
      // Se for recuperação de senha, NÃO force atualização de estado global agora.
      // Deixe a página update-password lidar com a sessão.
      if (event === 'PASSWORD_RECOVERY') {
        setIsLoading(false);
        return; 
      }

      // Se for apenas atualização de token, muitas vezes não precisamos buscar o perfil de novo
      if (event === 'TOKEN_REFRESHED' && user) {
        return; 
      }

      if (session?.user) {
        const profile = await fetchUserProfile(session.user);
        setUser(profile);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
        subscription.unsubscribe();
        clearTimeout(safetyTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Array vazio intencional

  const signOut = async () => {
    setIsLoading(true);
    try {
        await supabase.auth.signOut();
        setUser(null);
        router.refresh(); // Limpa cache do Next.js
        router.push('/login');
    } catch (error) {
        console.error("Erro ao sair:", error);
        // Fallback forçado se o signOut falhar
        window.location.href = '/login';
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};