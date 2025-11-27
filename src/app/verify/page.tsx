'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { type EmailOtpType } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';

// Componente interno que lê os parâmetros
function VerifyContent() {
  const [status, setStatus] = useState('Verificando link de acesso...');
  const [errorDetails, setErrorDetails] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';

  useEffect(() => {
    const verifyToken = async () => {
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type') as EmailOtpType | null;

      if (!token_hash || !type) {
        setStatus('Aguardando verificação...'); 
        return;
      }

      console.log("🔐 Iniciando verificação...");

      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type,
      });

      if (!error) {
        console.log("✅ Token válido!");
        setStatus('Sucesso! Entrando...');
        setIsSuccess(true);
        
        // Redirecionamento forçado para garantir limpeza de estado
        setTimeout(() => {
            window.location.href = next;
        }, 800);
      } else {
        console.error('❌ Erro:', error);
        setStatus('Link inválido ou expirado.');
        setErrorDetails(error.message);
      }
    };

    // Pequeno delay para garantir que o router esteja pronto
    const timer = setTimeout(() => {
        verifyToken();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchParams, next]);

  if (isSuccess) {
      return (
        <div className="space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500 mx-auto"></div>
            <p className="text-green-400 font-medium">Autenticado com sucesso.</p>
            <p className="text-slate-500 text-sm">Redirecionando...</p>
        </div>
      );
  }

  if (errorDetails) {
      return (
          <div className="mt-4 p-4 bg-red-950/50 border border-red-900 rounded-lg text-red-200 text-sm">
            <p className="font-bold mb-2">Falha na Verificação:</p>
            {errorDetails}
            <div className="mt-6">
                <Button onClick={() => window.location.href = '/login'} variant="outline" className="text-white border-slate-700 hover:bg-slate-800">
                    Voltar para Login
                </Button>
            </div>
          </div>
      );
  }

  return (
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-slate-300">{status}</p>
      </div>
  );
}

// Componente Principal com Suspense (Obrigatório no Next 15)
export default function VerifyPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-4">
      <div className="w-full max-w-md p-8 bg-slate-900 rounded-xl border border-slate-800 text-center shadow-2xl">
        <Suspense fallback={<div className="text-center text-slate-400">Carregando verificação...</div>}>
            <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}