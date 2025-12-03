'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase'; 
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

function UpdatePasswordForm() {
  const [password, setPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading, refreshUser } = useAuth(); 

  // EFEITO ESPECIAL: Força a captura do token da URL se o usuário estiver nulo
  useEffect(() => {
    const handleSessionRecovery = async () => {
      // Se já temos usuário, não precisa fazer nada
      if (user) return;

      // Verifica se tem tokens na URL (formato ?access_token=...)
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');

      if (accessToken && refreshToken) {
        try {
          // Força a sessão manualmente
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (!error) {
            // Se deu certo, atualiza o contexto global
            await refreshUser();
          }
        } catch (err) {
          console.error("Erro ao recuperar sessão da URL:", err);
        }
      }
    };

    handleSessionRecovery();
  }, [searchParams, user, refreshUser]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFormLoading(true);

    try {
      // Tentativa final de verificar o usuário antes de enviar
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        throw new Error('Sessão expirou. Por favor, solicite um novo link.');
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      
      setTimeout(() => {
        router.push('/login'); 
      }, 3000);

    } catch (err: any) {
      console.error('Erro ao atualizar senha:', err);
      setError(err.message || 'Erro ao atualizar senha.');
    } finally {
      setFormLoading(false);
    }
  };

  // Enquanto o Auth carrega OU enquanto tentamos recuperar a sessão da URL
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-600">Validando link de segurança...</span>
      </div>
    );
  }

  // Só mostra erro se realmente não tiver usuário E não tiver token na URL para tentar recuperar
  const hasTokenInUrl = searchParams.get('access_token');
  if (!user && !hasTokenInUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle /> Link Inválido ou Expirado
            </CardTitle>
            <CardDescription>
              Não foi possível validar sua sessão. O link pode ter expirado.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <Button onClick={() => router.push('/login')} className="w-full">
               Voltar para Login
             </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Definir Nova Senha</CardTitle>
          <CardDescription>
            Digite sua nova senha abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center text-green-500">
                <CheckCircle className="w-12 h-12" />
              </div>
              <p className="text-green-700 font-medium">Senha atualizada com sucesso!</p>
              <p className="text-sm text-gray-500">Redirecionando para login...</p>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={formLoading}>
                {formLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Nova Senha'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Carregando...</div>}>
      <UpdatePasswordForm />
    </Suspense>
  );
}