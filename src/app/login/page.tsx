'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

export default function LoginPage() {
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    // Garante que pegamos a URL correta do navegador
    setOrigin(window.location.origin);
  }, []);

  // Define a URL de redirecionamento pós-login
  const redirectUrl = origin ? `${origin}/auth/callback` : undefined;

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-slate-200">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Bem-vindo ao AgencyHub</h1>
          <p className="text-slate-500 text-sm mt-2">Entre com suas credenciais para continuar</p>
        </div>
        
        <Auth
          // O "as any" aqui resolve o conflito de tipagem entre as bibliotecas
          supabaseClient={supabase as any}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#0f172a', // Slate 900
                  brandAccent: '#334155', // Slate 700
                },
                radii: {
                  borderRadiusButton: '0.5rem',
                  inputBorderRadius: '0.5rem',
                },
              },
            },
            className: {
                button: 'w-full px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 transition-colors',
                input: 'w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent',
            }
          }}
          theme="light"
          providers={[]} 
          redirectTo={redirectUrl}
          view="sign_in"
          showLinks={true}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Endereço de e-mail',
                password_label: 'Sua senha',
                button_label: 'Entrar',
                loading_button_label: 'Entrando...',
                email_input_placeholder: 'seu@email.com',
                password_input_placeholder: '••••••••',
              },
              forgotten_password: {
                  link_text: "Esqueceu sua senha?",
                  email_label: "Endereço de e-mail",
                  button_label: "Enviar instruções",
                  loading_button_label: "Enviando...",
              }
            },
          }}
        />
      </div>
    </div>
  );
}