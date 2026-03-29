'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Certifique-se que o caminho está certo
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSessionValid, setIsSessionValid] = useState(false); // Novo estado para controlar a tela
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const checkSession = async (attempt = 1): Promise<void> => {
      // 1. Tenta pegar a sessão atual
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        if (mounted) setIsSessionValid(true);
        return;
      }

      // 2. Se não achar, tenta um refresh
      const { data: refresh } = await supabase.auth.refreshSession();
      if (refresh.session && mounted) {
        setIsSessionValid(true);
        return;
      }

      // 3. Retry até 3 vezes com delay (aguarda cookies serem processados)
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1500));
        if (mounted) return checkSession(attempt + 1);
      }

      // Se realmente não tiver sessão após retries, manda pro login
      console.log("Sem sessão válida após tentativas.");
      if (mounted) router.replace('/login');
    };

    checkSession();

    // Listener para caso a sessão caia no meio do processo
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (session && mounted) setIsSessionValid(true);
        if (!session && mounted) setIsSessionValid(false);
    });

    return () => {
        mounted = false;
        authListener.subscription.unsubscribe();
    };
  }, [router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      // Sucesso!
      router.replace('/dashboard'); 
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Se ainda não validou a sessão, mostra loading para evitar o erro "Auth session missing"
  if (!isSessionValid) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0c0a1a] text-white gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            <p className="text-sm text-white/40">Verificando permissões de segurança...</p>
            <p className="text-xs text-white/20">(Se demorar, seu link pode ter expirado)</p>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c0a1a] p-4">
      <Card className="w-full max-w-md bg-white/[0.04] border-white/[0.06] text-white rounded-2xl">
        <CardHeader>
          <CardTitle>Criar Nova Senha</CardTitle>
          <CardDescription>Sessão validada. Defina sua senha agora.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pass" className="text-slate-300">Nova Senha</Label>
              <Input 
                id="pass" 
                type="password" 
                minLength={6} 
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-[#0c0a1a] border-white/10"
              />
            </div>
            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm shadow-purple-600/20" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2"/> : 'Salvar e Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}