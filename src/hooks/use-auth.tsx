'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Definição segura das permissões
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

  // Função para buscar/criar perfil
  const fetchUserProfile = async (supabaseUser: any): Promise<UserProfile | null> => {
    if (!supabaseUser) return null;

    try {
      // 1. Tenta buscar o perfil
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle(); // Usa maybeSingle para não dar erro 406 se não existir

      // 2. Se o perfil existe, retorna ele
      if (profile) {
        return {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: profile.name || supabaseUser.email?.split('@')[0] || 'Usuário',
          role: profile.role || 'collaborator',
          permissions: profile.permissions || {},
        };
      }

      // 3. Se não existe (Caso Raro/Novo), retorna um objeto temporário seguro
      // Isso evita o "Acesso Negado" por falta de dados
      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.email?.split('@')[0] || 'Novo Usuário',
        role: 'collaborator', // Cargo padrão seguro
        permissions: {}, // Sem permissões por padrão
      };

    } catch (error) {
      console.error("Erro no AuthProvider:", error);
      return null;
    }
  };

  const refreshUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchUserProfile(session.user);
        setUser(profile);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
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