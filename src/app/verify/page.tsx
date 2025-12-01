'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { type EmailOtpType } from '@supabase/supabase-js';

function VerifyContent() {
  const [status, setStatus] = useState('Validando token...');
  const [errorDetails, setErrorDetails] = useState('');
  
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';

  useEffect(() => {
    const verifyToken = async () => {
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type') as EmailOtpType | null;

      if (!token_hash || !type) return;

      console.log("🔐 Validando token...");

      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type,
      });

      if (!error && data.session) {
        setStatus('Sucesso! Transferindo sessão...');
        
        // --- O PULO DO GATO ---
        // Pegamos os tokens da sessão gerada
        const accessToken = data.session.access_token;
        const refreshToken = data.session.refresh_token;

        // Montamos a URL de destino INCLUINDO os tokens
        // Isso garante que a próxima página receba a sessão mesmo se o cookie falhar
        const targetUrl = `${next}?access_token=${accessToken}&refresh_token=${refreshToken}`;

        // Redirecionamento forçado
        window.location.href = targetUrl;
        
      } else {
        console.error('❌ Erro:', error);
        setStatus('Falha na validação.');
        setErrorDetails(error?.message || 'Erro desconhecido');
      }
    };

    // Delay mínimo para garantir carregamento
    setTimeout(verifyToken, 500);

  }, [searchParams, next]);

  if (errorDetails) {
      return (
          <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
            <div className="p-4 bg-red-900/50 border border-red-800 rounded">
                <p className="font-bold">Erro:</p> {errorDetails}
                <br/>
                <a href="/login" className="underline mt-2 block">Voltar ao Login</a>
            </div>
          </div>
      );
  }

  return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>{status}</p>
        </div>
      </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
        <VerifyContent />
    </Suspense>
  );
}