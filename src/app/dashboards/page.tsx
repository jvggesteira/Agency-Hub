'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { BarChart3, Plus, Settings, Edit, Trash2, X, Link as LinkIcon } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePermission } from '@/hooks/use-permission';
import AccessDenied from '@/components/custom/access-denied';

// ... (Schemas e Interfaces mantidos iguais) ...
const integrationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.enum(['meta_ads', 'google_ads', 'other'], { required_error: 'Tipo é obrigatório' }),
  api_key: z.string().min(1, 'API Key é obrigatória'),
  account_id: z.string().optional(),
  notes: z.string().optional(),
});
type IntegrationFormData = z.infer<typeof integrationSchema>;

interface Integration {
  id: string;
  name: string;
  type: 'meta_ads' | 'google_ads' | 'other';
  api_key: string;
  account_id?: string;
  notes?: string;
  created_at: string;
  status: 'active' | 'inactive';
}

export default function DashboardsPage() {
  const { can } = usePermission();
  
  // --- CORREÇÃO: Usando 'dashboards' (plural) conforme definido no use-permission ---
  if (!can('dashboards', 'view')) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-[#0c0a1a] transition-colors duration-300">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6"><AccessDenied /></main>
        </div>
      </div>
    );
  }

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<IntegrationFormData>({ resolver: zodResolver(integrationSchema) });

  // ... (Resto do código mantido igual) ...
  useEffect(() => { loadIntegrations(); }, []);

  const loadIntegrations = () => {
    try {
      const savedIntegrations = localStorage.getItem('integrations');
      if (savedIntegrations) setIntegrations(JSON.parse(savedIntegrations));
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const saveIntegrations = (list: Integration[]) => { try { localStorage.setItem('integrations', JSON.stringify(list)); } catch (error) { console.error(error); } };

  const onSubmit = (data: IntegrationFormData) => {
    const newIntegration: Integration = { id: editingIntegration?.id || Date.now().toString(), ...data, created_at: editingIntegration?.created_at || new Date().toISOString(), status: editingIntegration?.status || 'active' };
    let updated;
    if (editingIntegration) updated = integrations.map(i => i.id === editingIntegration.id ? newIntegration : i);
    else updated = [newIntegration, ...integrations];
    setIntegrations(updated); saveIntegrations(updated);
    setIsModalOpen(false); setEditingIntegration(null); reset();
  };

  const deleteIntegration = (id: string) => { if (confirm('Excluir?')) { const up = integrations.filter(i => i.id !== id); setIntegrations(up); saveIntegrations(up); } };
  const openEditModal = (i: Integration) => { setEditingIntegration(i); reset({ name: i.name, type: i.type, api_key: i.api_key, account_id: i.account_id || '', notes: i.notes || '' }); setIsModalOpen(true); };
  const getIcon = (type: string) => { switch(type) { case 'meta_ads': return '📘'; case 'google_ads': return '🔍'; default: return '🔗'; }};
  const getLabel = (type: string) => { switch(type) { case 'meta_ads': return 'Meta Ads'; case 'google_ads': return 'Google Ads'; default: return 'Outra'; }};

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0c0a1a] transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8 flex justify-between items-center">
             <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboards</h1><p className="text-slate-500 dark:text-white/40 text-sm">Integrações de Ads</p></div>
             <button onClick={() => { setEditingIntegration(null); reset(); setIsModalOpen(true); }} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm shadow-purple-600/20 px-4 py-2 flex items-center gap-2"><Plus className="h-4 w-4"/> Nova Integração</button>
          </div>

          <div className="bg-white dark:bg-white/[0.04] rounded-2xl shadow-sm border border-slate-200/80 dark:border-white/[0.06] p-6">
             {loading ? <div className="text-center py-10">Carregando...</div> : integrations.length === 0 ? (
                 <div className="text-center py-10 text-slate-500">Nenhuma integração configurada.</div>
             ) : (
                 <div className="grid gap-4 md:grid-cols-3">
                    {integrations.map(i => (
                        <div key={i.id} className="border p-4 rounded-lg bg-slate-50 dark:bg-[#0c0a1a] dark:border-white/[0.06]">
                            <div className="flex justify-between mb-2">
                                <div className="flex gap-2 items-center"><span className="text-xl">{getIcon(i.type)}</span> <span className="font-bold dark:text-white">{i.name}</span></div>
                                <div className="flex gap-1">
                                    <button onClick={() => openEditModal(i)}><Edit className="h-4 w-4 text-slate-400 hover:text-blue-500"/></button>
                                    <button onClick={() => deleteIntegration(i.id)}><Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500"/></button>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500">{getLabel(i.type)}</p>
                        </div>
                    ))}
                 </div>
             )}
          </div>
        </main>
      </div>
      
      {/* Modal Simplificado para o exemplo */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-[#1a1230] p-6 rounded-2xl w-full max-w-md">
                  <h2 className="text-xl font-bold mb-4 dark:text-white">{editingIntegration ? 'Editar' : 'Nova'} Integração</h2>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                      <input {...register('name')} placeholder="Nome" className="w-full border p-2 rounded dark:bg-[#0c0a1a]"/>
                      <select {...register('type')} className="w-full border p-2 rounded dark:bg-[#0c0a1a]"><option value="meta_ads">Meta Ads</option><option value="google_ads">Google Ads</option><option value="other">Outro</option></select>
                      <input {...register('api_key')} placeholder="API Key" className="w-full border p-2 rounded dark:bg-[#0c0a1a]"/>
                      <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 border p-2 rounded">Cancelar</button>
                          <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm shadow-purple-600/20 p-2">Salvar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}