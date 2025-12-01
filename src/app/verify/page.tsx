'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { type EmailOtpType } from '@supabase/supabase-js';

function VerifyContent() {
  const [status, setStatus] = useState('Validando token...');
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';

  useEffect(() => {
    const verifyToken = async () => {
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type') as EmailOtpType | null;

      if (!token_hash || !type) return;

      const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });

      if (!error && data.session) {
        setStatus('Sucesso! Redirecionando...');
        
        // PULO DO GATO: Passa a sessão na URL
        const accessToken = data.session.access_token;
        const refreshToken = data.session.refresh_token;
        
        // Redireciona com os tokens
        const targetUrl = `${next}?access_token=${accessToken}&refresh_token=${refreshToken}`;
        window.location.href = targetUrl;
        
      } else {
        setStatus('Erro na validação.');
        console.error(error);
      }
    };

    verifyToken();
  }, [searchParams, next]);

  return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p>{status}</p>
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