'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { User, Save, Loader2 } from 'lucide-react';

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user) {
        getProfile();
    }
  }, [user]);

  const getProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
      if (data) {
          setFullName(data.full_name || data.name || '');
          setEmail(data.email || '');
      }
  };

  const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          // Atualiza tabela profiles
          const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user?.id);
          if (error) throw error;

          // Atualiza metadados do Auth (opcional, mas bom para consistência)
          await supabase.auth.updateUser({ data: { full_name: fullName } });

          toast({ title: "Perfil atualizado com sucesso!" });
      } catch (error) {
          toast({ title: "Erro ao atualizar", variant: "destructive" });
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
                <h1 className="text-2xl font-bold mb-6 dark:text-white flex items-center gap-2"><User/> Meu Perfil</h1>
                
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm">
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium dark:text-slate-300">Email (Não editável)</label>
                            <Input value={email} disabled className="bg-slate-100 dark:bg-slate-800 text-slate-500"/>
                        </div>
                        <div>
                            <label className="text-sm font-medium dark:text-slate-300">Nome Completo</label>
                            <Input value={fullName} onChange={e => setFullName(e.target.value)} className="dark:bg-slate-950"/>
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={loading} className="bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                                {loading ? <Loader2 className="animate-spin"/> : <><Save className="w-4 h-4 mr-2"/> Salvar Alterações</>}
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