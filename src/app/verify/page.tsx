'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { type EmailOtpType } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';

function VerifyContent() {
  const [status, setStatus] = useState('Validando token de segurança...');
  const [errorDetails, setErrorDetails] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Pega o destino (se for invite/recovery, vai pra update-password)
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';

  useEffect(() => {
    const verifyToken = async () => {
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type') as EmailOtpType | null;

      if (!token_hash || !type) {
        // Se não tiver token, não faz nada (espera o usuário ou mostra erro)
        return;
      }

      console.log("🔐 Tentando validar token...");

      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type,
      });

      if (!error) {
        console.log("✅ Token válido! Redirecionando...");
        setStatus('Acesso liberado! Entrando...');
        setIsSuccess(true);
        
        // 🚨 O SEGREDO ESTÁ AQUI: 
        // Usamos window.location.href em vez de router.push
        // Isso força o navegador a ler o novo cookie de sessão
        setTimeout(() => {
            window.location.href = next;
        }, 1000);
        
      } else {
        console.error('❌ Erro:', error);
        setStatus('Link inválido ou expirado.');
        setErrorDetails(error.message);
      }
    };

    // Pequeno delay inicial para garantir hidratação
    const timer = setTimeout(() => {
        verifyToken();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchParams, next]);

  if (isSuccess) {
      return (
        <div className="space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500 mx-auto"></div>
            <p className="text-green-400 font-medium">Sucesso!</p>
            <p className="text-slate-500 text-sm">Carregando seus dados...</p>
        </div>
      );
  }

  if (errorDetails) {
      return (
          <div className="mt-4 p-4 bg-red-950/50 border border-red-900 rounded-lg text-red-200 text-sm">
            <p className="font-bold mb-2">Erro na validação:</p>
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

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-4">
      <div className="w-full max-w-md p-8 bg-slate-900 rounded-xl border border-slate-800 text-center shadow-2xl">
        <Suspense fallback={<div className="text-slate-400">Carregando...</div>}>
            <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}