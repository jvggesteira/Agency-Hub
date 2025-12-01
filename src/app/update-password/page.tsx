'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';

function UpdatePasswordContent() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // RECUPERA A SESSÃO DA URL (Se vier do /verify)
  useEffect(() => {
    const restoreSession = async () => {
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');

        if (accessToken && refreshToken) {
            console.log("🔄 Restaurando sessão...");
            await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });
            // Limpa a URL visualmente
            window.history.replaceState({}, '', '/update-password');
        }
    };
    restoreSession();
  }, [searchParams]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: password });
      if (error) throw error;

      toast({ title: "Sucesso!", description: "Senha definida.", className: "bg-green-600 text-white" });
      window.location.href = '/dashboard';

    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
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