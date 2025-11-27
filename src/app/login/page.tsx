'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // REMOVIDO: O useEffect que fazia o redirecionamento automático e causava o loop.
  
  const handleGoToDashboard = () => {
      // Força recarregar para sincronizar cookies se necessário
      window.location.href = '/dashboard';
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Se já estiver logado, mostra opção manual em vez de redirecionar sozinho
  if (isAuthenticated) {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-50 flex-col gap-4">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-slate-900">Você já está conectado!</h1>
                <p className="text-slate-600">O sistema identificou sua sessão.</p>
            </div>
            <Button onClick={handleGoToDashboard} className="bg-slate-900 text-white px-8">
                Ir para o Dashboard
            </Button>
            <Button variant="outline" onClick={() => supabase.auth.signOut().then(() => window.location.reload())}>
                Sair e entrar com outra conta
            </Button>
        </div>
      )
  }

  const redirectUrl = origin ? `${origin}/auth/callback?next=/update-password` : undefined;

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-slate-200">
        <h1 className="text-2xl font-bold text-center text-slate-900 mb-6">Bem-vindo ao AgencyHub</h1>
        
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'oklch(0.205 0 0)', 
                  brandAccent: 'oklch(0.488 0.243 264.376)', 
                },
                radii: {
                  borderRadiusButton: '0.5rem',
                  inputBorderRadius: '0.5rem',
                },
              },
            },
          }}
          theme="light"
          providers={[]} 
          redirectTo={redirectUrl}
          view="sign_in"
          showLinks={true}
        />
      </div>
    </div>
  );
}