'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { type EmailOtpType } from '@supabase/supabase-js';

export default function VerifyPage() {
  const [status, setStatus] = useState('Verificando link de acesso...');
  const [errorDetails, setErrorDetails] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const verifyToken = async () => {
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type') as EmailOtpType | null;
      const next = searchParams.get('next') ?? '/dashboard';

      if (!token_hash || !type) {
        setStatus('Erro: Link inválido (faltando token ou tipo).');
        return;
      }

      // Tenta validar o token diretamente no navegador
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type,
      });

      if (!error) {
        setStatus('Sucesso! Redirecionando...');
        // Dá um pequeno delay para garantir que o cookie foi gravado
        setTimeout(() => {
            router.push(next);
        }, 500);
      } else {
        console.error('Erro de Verificação:', error);
        setStatus('Falha na validação.');
        setErrorDetails(error.message);
      }
    };

    verifyToken();
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-4">
      <div className="w-full max-w-md p-6 bg-slate-900 rounded-lg border border-slate-800 text-center">
        <h2 className="text-xl font-bold mb-4">{status}</h2>
        
        {status === 'Sucesso! Redirecionando...' && (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
        )}

        {errorDetails && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-800 rounded text-red-200 text-sm break-words">
            <p className="font-bold">Detalhe do Erro:</p>
            {errorDetails}
          </div>
        )}
      </div>
    </div>
  );
}