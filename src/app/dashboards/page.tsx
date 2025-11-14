'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { BarChart3, Plus, Settings, Edit, Trash2, TrendingUp } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const integrationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.enum(['meta_ads', 'google_ads', 'other'], {
    required_error: 'Tipo é obrigatório',
  }),
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
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IntegrationFormData>({
    resolver: zodResolver(integrationSchema),
  });

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = () => {
    try {
      const savedIntegrations = localStorage.getItem('integrations');
      if (savedIntegrations) {
        setIntegrations(JSON.parse(savedIntegrations));
      }
    } catch (error) {
      console.error('Erro ao carregar integrações:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveIntegrations = (integrationsList: Integration[]) => {
    try {
      localStorage.setItem('integrations', JSON.stringify(integrationsList));
    } catch (error) {
      console.error('Erro ao salvar integrações:', error);
    }
  };

  const onSubmit = (data: IntegrationFormData) => {
    const newIntegration: Integration = {
      id: editingIntegration?.id || Date.now().toString(),
      ...data,
      created_at: editingIntegration?.created_at || new Date().toISOString(),
      status: editingIntegration?.status || 'active',
    };

    if (editingIntegration) {
      const updatedIntegrations = integrations.map(integration =>
        integration.id === editingIntegration.id ? newIntegration : integration
      );
      setIntegrations(updatedIntegrations);
      saveIntegrations(updatedIntegrations);
    } else {
      const updatedIntegrations = [newIntegration, ...integrations];
      setIntegrations(updatedIntegrations);
      saveIntegrations(updatedIntegrations);
    }

    setIsModalOpen(false);
    setEditingIntegration(null);
    reset();
  };

  const deleteIntegration = (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta integração?')) return;

    const updatedIntegrations = integrations.filter(integration => integration.id !== id);
    setIntegrations(updatedIntegrations);
    saveIntegrations(updatedIntegrations);
  };

  const openEditModal = (integration: Integration) => {
    setEditingIntegration(integration);
    reset({
      name: integration.name,
      type: integration.type,
      api_key: integration.api_key,
      account_id: integration.account_id || '',
      notes: integration.notes || '',
    });
    setIsModalOpen(true);
  };

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'meta_ads':
        return '📘';
      case 'google_ads':
        return '🔍';
      default:
        return '🔗';
    }
  };

  const getIntegrationLabel = (type: string) => {
    switch (type) {
      case 'meta_ads':
        return 'Meta Ads';
      case 'google_ads':
        return 'Google Ads';
      default:
        return 'Outra';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Dashboards</h1>
                <p className="text-slate-600 mt-1">Relatórios e métricas de performance</p>
              </div>
              <button
                onClick={() => {
                  setEditingIntegration(null);
                  reset();
                  setIsModalOpen(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Nova Integração
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-slate-600 mt-4">Carregando integrações...</p>
              </div>
            ) : integrations.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Configure suas integrações</h3>
                <p className="text-slate-600 mb-6">Conecte Meta Ads e Google Ads para visualizar métricas automatizadas</p>
                <button
                  onClick={() => {
                    setEditingIntegration(null);
                    reset();
                    setIsModalOpen(true);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all inline-flex items-center gap-2"
                >
                  <Settings className="h-5 w-5" />
                  Configurar Integrações
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {integrations.map((integration) => (
                  <div key={integration.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-2xl">
                          {getIntegrationIcon(integration.type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{integration.name}</h3>
                          <p className="text-sm text-slate-600">{getIntegrationLabel(integration.type)}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(integration)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteIntegration(integration.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {integration.account_id && (
                        <p className="text-sm text-slate-600">ID: {integration.account_id}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          integration.status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {integration.status === 'active' ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingIntegration ? 'Editar Integração' : 'Nova Integração'}
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nome *
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome da integração"
                  />
                  {errors.name && (
                    <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    {...register('type')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="meta_ads">Meta Ads</option>
                    <option value="google_ads">Google Ads</option>
                    <option value="other">Outra</option>
                  </select>
                  {errors.type && (
                    <p className="text-red-600 text-sm mt-1">{errors.type.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    API Key *
                  </label>
                  <input
                    {...register('api_key')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Sua chave de API"
                  />
                  {errors.api_key && (
                    <p className="text-red-600 text-sm mt-1">{errors.api_key.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    ID da Conta
                  </label>
                  <input
                    {...register('account_id')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ID da conta (opcional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Observações sobre a integração"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingIntegration(null);
                      reset();
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
                  >
                    {editingIntegration ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
