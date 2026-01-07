'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Lock, CheckCircle, Loader2 } from 'lucide-react';

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdatePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (password !== confirmPassword) {
          toast({ title: "As senhas não coincidem", variant: "destructive" });
          return;
      }
      if (password.length < 6) {
          toast({ title: "A senha deve ter no mínimo 6 caracteres", variant: "destructive" });
          return;
      }

      setLoading(true);
      try {
          const { error } = await supabase.auth.updateUser({ password: password });
          if (error) throw error;
          
          toast({ title: "Senha atualizada!", className: "bg-green-600 text-white" });
          setPassword('');
          setConfirmPassword('');
      } catch (error: any) {
          toast({ title: "Erro", description: error.message, variant: "destructive" });
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-6">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold mb-6 dark:text-white flex items-center gap-2"><Lock/> Segurança</h1>
                
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 dark:text-white">Alterar Senha</h3>
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium dark:text-slate-300">Nova Senha</label>
                            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="dark:bg-slate-950"/>
                        </div>
                        <div>
                            <label className="text-sm font-medium dark:text-slate-300">Confirmar Nova Senha</label>
                            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="dark:bg-slate-950"/>
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={loading} className="bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                                {loading ? <Loader2 className="animate-spin"/> : <><CheckCircle className="w-4 h-4 mr-2"/> Atualizar Senha</>}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
      </div>
    </div>
  );
}