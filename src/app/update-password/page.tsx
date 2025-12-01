'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Verifica se a sessão existe ao carregar a página
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Se não tiver sessão, tenta recuperar do URL (caso o verify tenha passado o token na url)
        // ou manda pro login se realmente perdeu tudo.
        console.warn("Sessão não encontrada no início do update-password");
      } else {
        console.log("Sessão ativa confirmada:", session.user.email);
      }
    };
    checkSession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter no mínimo 6 caracteres.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      // 1. Tenta atualizar a senha
      const { error } = await supabase.auth.updateUser({ password: password });

      if (error) throw error;

      toast({ 
        title: "Sucesso!", 
        description: "Senha definida. Entrando...", 
        className: "bg-green-600 text-white border-none" 
      });
      
      // 2. Força login e redirecionamento
      window.location.href = '/dashboard';

    } catch (error: any) {
      console.error("Erro no update:", error);
      
      // SE DER ERRO DE SESSÃO: Tenta um "Plan B" (Login com token implícito se existir)
      if (error.message.includes("session missing") || error.message.includes("Auth session missing")) {
         toast({ title: "Erro de Sessão", description: "Sua sessão expirou. Tente clicar no link do e-mail novamente.", variant: "destructive" });
      } else {
         toast({ title: "Erro", description: error.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-slate-900 dark:text-white" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Definir Senha</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Defina sua senha para acessar a plataforma.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleUpdatePassword}>
          <div>
            <label htmlFor="password" className="sr-only">Nova Senha</label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="dark:bg-slate-950 dark:text-white"
              placeholder="Digite sua nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-slate-900 dark:bg-white dark:text-slate-900">
            {loading ? 'Salvando...' : 'Salvar e Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}