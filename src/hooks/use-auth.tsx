'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase'; // Caminho absoluto para evitar confusão
import { useRouter } from 'next/navigation';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

// ... (Mantenha suas interfaces UserProfile e AuthContextType iguais)
interface UserProfile {
  id: string;
  email: string;
  name: string;
  first_name: string;
  last_name: string;
  role: string;
  permissions: Record<string, any>;
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

  const fetchUserProfile = async (supabaseUser: User): Promise<UserProfile | null> => {
    if (!supabaseUser) return null;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      const fullName = profile?.name || supabaseUser.email?.split('@')[0] || 'Usuário';
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

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
      console.error("Auth Error:", error);
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
    // Carrega o estado inicial
    refreshUser();

    // Configura o listener de eventos
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      
      if (event === 'SIGNED_OUT') {
         setUser(null);
         setIsLoading(false);
         router.refresh(); // Força o middleware a rodar novamente
         return;
      }

      if (event === 'PASSWORD_RECOVERY') {
        return; 
      }

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
        if (authListener && authListener.subscription) {
            authListener.subscription.unsubscribe();
        }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    setIsLoading(true);
    try {
        await supabase.auth.signOut();
        setUser(null);
        router.push('/login'); // O middleware vai garantir que fique lá
        router.refresh();
    } catch (error) {
        console.error("SignOut Error:", error);
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