'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

interface PermissionSet {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

interface UserPermissions {
  clients: PermissionSet;
  tasks: PermissionSet;
  finances: PermissionSet;
  goals: PermissionSet;
  documents: PermissionSet;
  team: PermissionSet;
  dashboards: PermissionSet;
  freelancer_projects: PermissionSet;
  alerts: PermissionSet;
  settings: PermissionSet;
}

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  permissions: UserPermissions;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultPermissions: UserPermissions = {
  clients: { view: false, create: false, edit: false, delete: false },
  tasks: { view: false, create: false, edit: false, delete: false },
  finances: { view: false, create: false, edit: false, delete: false },
  goals: { view: false, create: false, edit: false, delete: false },
  documents: { view: false, create: false, edit: false, delete: false },
  team: { view: false, create: false, edit: false, delete: false },
  dashboards: { view: false, create: false, edit: false, delete: false },
  freelancer_projects: { view: false, create: false, edit: false, delete: false },
  alerts: { view: false, create: false, edit: false, delete: false },
  settings: { view: false, create: false, edit: false, delete: false },
};

const formatPermissions = (dbPermissions: any): UserPermissions => {
  const permissions: any = {};
  for (const module of Object.keys(defaultPermissions)) {
    permissions[module] = {
      view: dbPermissions[`${module}_view`] || false,
      create: dbPermissions[`${module}_create`] || false,
      edit: dbPermissions[`${module}_edit`] || false,
      delete: dbPermissions[`${module}_delete`] || false,
    };
  }
  return permissions as UserPermissions;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUserProfile = async (supabaseUser: any): Promise<UserProfile | null> => {
    if (!supabaseUser) return null;

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url')
      .eq('id', supabaseUser.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      // Fallback profile if DB fails
      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        first_name: supabaseUser.email?.split('@')[0] || 'Usuário',
        last_name: '',
        permissions: defaultPermissions,
      };
    }

    const { data: permissionsData, error: permissionsError } = await supabase
      .from('team_permissions')
      .select('*')
      .eq('user_id', supabaseUser.id)
      .single();

    const permissions = permissionsData ? formatPermissions(permissionsData) : defaultPermissions;

    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      first_name: profileData?.first_name || supabaseUser.email?.split('@')[0] || 'Usuário',
      last_name: profileData?.last_name || '',
      avatar_url: profileData?.avatar_url,
      permissions,
    };
  };

  const refreshUser = async () => {
    setIsLoading(true);
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    if (supabaseUser) {
      const profile = await fetchUserProfile(supabaseUser);
      setUser(profile);
    } else {
      setUser(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    refreshUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          fetchUserProfile(session.user).then(setUser);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        router.push('/login');
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sessão encerrada",
        description: "Você foi desconectado com sucesso.",
      });
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, signOut, refreshUser }}>
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