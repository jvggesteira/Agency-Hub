'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { type EmailOtpType } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';

export default function VerifyPage() {
  const [status, setStatus] = useState('Verificando token de segurança...');
  const [errorDetails, setErrorDetails] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const searchParams = useSearchParams();

  // Pega os parâmetros da URL
  const next = searchParams.get('next') ?? '/dashboard';

  useEffect(() => {
    const verifyToken = async () => {
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type') as EmailOtpType | null;

      if (!token_hash || !type) {
        setStatus('Erro: Link inválido (faltando token ou tipo).');
        return;
      }

      console.log("🔐 Iniciando verificação de token...");

      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type,
      });

      if (!error) {
        console.log("✅ Token válido! Sessão criada.");
        setStatus('Sucesso! Redirecionando...');
        setIsSuccess(true);
        
        // Pequeno delay para garantir que o cookie foi gravado no navegador
        setTimeout(() => {
            // USANDO REDIRECIONAMENTO FORÇADO (Hard Reload)
            // Isso previne o loop infinito do Next.js
            window.location.href = next;
        }, 1000);
      } else {
        console.error('❌ Erro de Verificação:', error);
        setStatus('Falha na validação do link.');
        setErrorDetails(error.message);
      }
    };

    verifyToken();
  }, [searchParams, next]);

  const handleManualRedirect = () => {
      window.location.href = next;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-4">
      <div className="w-full max-w-md p-8 bg-slate-900 rounded-xl border border-slate-800 text-center shadow-2xl">
        
        <h2 className="text-xl font-bold mb-4">{status}</h2>
        
        {/* Mostra Spinner se não tiver erro e não tiver terminado */}
        {!errorDetails && !isSuccess && (
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
        )}

        {/* Mostra botão manual se deu sucesso mas travou no redirect */}
        {isSuccess && (
            <div className="space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500 mx-auto"></div>
                <p className="text-slate-400 text-sm">Se não redirecionar em 5 segundos, clique abaixo:</p>
                <Button onClick={handleManualRedirect} className="bg-green-600 hover:bg-green-700 text-white w-full">
                    Acessar Plataforma
                </Button>
            </div>
        )}

        {/* Mostra erro se falhou */}
        {errorDetails && (
          <div className="mt-4 p-4 bg-red-950/50 border border-red-900 rounded-lg text-red-200 text-sm break-words">
            <p className="font-bold mb-1">Ocorreu um problema:</p>
            {errorDetails}
            <div className="mt-4">
                <a href="/login" className="text-white underline hover:text-blue-400">Voltar para o Login</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}