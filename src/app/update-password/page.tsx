'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';

function UpdatePasswordContent() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Tentativa inicial de restaurar sessão (Visual)
  useEffect(() => {
    const restoreSession = async () => {
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');

        if (accessToken && refreshToken) {
            console.log("🔄 Restaurando sessão via URL...");
            await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });
        }
    };
    restoreSession();
  }, [searchParams]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password.length < 6) {
      toast({ title: "Erro", description: "Mínimo 6 caracteres.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      // --- DUPLA GARANTIA ---
      // Antes de salvar, garantimos que a sessão está ativa usando os tokens da URL
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');

      if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
          });
          if (sessionError) console.warn("Aviso de sessão:", sessionError.message);
      }

      // Agora sim, tentamos atualizar
      const { error } = await supabase.auth.updateUser({ password: password });

      if (error) throw error;

      toast({ title: "Sucesso!", description: "Senha definida. Entrando...", className: "bg-green-600 text-white" });
      
      // Força a ida para o dashboard
      window.location.href = '/dashboard';

    } catch (error: any) {
      console.error(error);
      toast({ title: "Erro", description: error.message || "Falha ao definir senha.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="text-center mb-6">
          <div className="mx-auto h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-slate-900 dark:text-white" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Definir Senha</h2>
        </div>

        <form className="space-y-6" onSubmit={handleUpdatePassword}>
          <Input
            type="password"
            required
            className="dark:bg-slate-950 dark:text-white"
            placeholder="Nova senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={loading} className="w-full bg-slate-900 dark:bg-white dark:text-slate-900">
            {loading ? 'Salvando...' : 'Salvar Senha'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function UpdatePasswordPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <UpdatePasswordContent />
        </Suspense>
    )
}