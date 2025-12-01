'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { type EmailOtpType } from '@supabase/supabase-js';

function VerifyContent() {
  const [status, setStatus] = useState('Processando acesso...');
  const [errorDetails, setErrorDetails] = useState('');
  
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Ref para garantir que só roda UMA vez
  const processedRef = useRef(false);

  useEffect(() => {
    // Se já processou, para.
    if (processedRef.current) return;

    const verifyToken = async () => {
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type') as EmailOtpType | null;
      const next = searchParams.get('next') ?? '/dashboard';

      if (!token_hash || !type) {
        // Se não tem parâmetros, não é um erro do sistema, pode ser acesso direto
        return;
      }

      // Marca como processado para não rodar de novo
      processedRef.current = true;
      console.log("🔐 Validando token único...");

      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type,
      });

      if (!error) {
        console.log("✅ Token válido! Redirecionando...");
        setStatus('Sucesso! Entrando...');
        
        // Se a sessão foi criada, passamos o bastão via URL para garantir
        if (data.session) {
            const accessToken = data.session.access_token;
            const refreshToken = data.session.refresh_token;
            // Redirecionamento forçado com tokens
            window.location.href = `${next}?access_token=${accessToken}&refresh_token=${refreshToken}`;
        } else {
            // Fallback
            window.location.href = next;
        }
        
      } else {
        console.error('❌ Erro:', error);
        // Só mostra erro se realmente falhou
        setStatus('Link inválido ou expirado.');
        setErrorDetails(error.message);
      }
    };

    verifyToken();
  }, [searchParams]);

  if (errorDetails) {
      return (
          <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white p-4">
            <div className="p-6 bg-red-900/30 border border-red-800 rounded-lg max-w-md text-center">
                <p className="font-bold text-lg mb-2">Link Expirado</p> 
                <p className="text-sm text-slate-300 mb-4">{errorDetails}</p>
                <button 
                    onClick={() => window.location.href = '/login'}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                >
                    Voltar para Login
                </button>
            </div>
          </div>
      );
  }

  return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-400">{status}</p>
        </div>
      </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Carregando...</div>}>
        <VerifyContent />
    </Suspense>
  );
}