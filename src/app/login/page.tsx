'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    // Pega a URL base do navegador apenas no cliente para evitar erro de hidratação
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      redirect('/dashboard');
    }
  }, [isAuthenticated]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Define para onde o link do e-mail deve mandar
  // O callback vai receber isso e jogar para /update-password
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
          // AQUI ESTÁ A CORREÇÃO:
          redirectTo={redirectUrl}
          view="sign_in"
        />
      </div>
    </div>
  );
}