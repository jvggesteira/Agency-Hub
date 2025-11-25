'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { Bell, Plus, Search, Filter, Edit, Trash2, X } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/use-permission';
import AccessDenied from '@/components/custom/access-denied';

const alertSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  metric: z.enum(['cpl', 'cpp', 'roas', 'ctr', 'cpc', 'other'], {
    required_error: 'Métrica é obrigatória',
  }),
  condition: z.enum(['maior_que', 'menor_que', 'igual_a'], {
    required_error: 'Condição é obrigatória',
  }),
  value: z.string().min(1, 'Valor é obrigatório'),
  clientId: z.string().optional(),
  notification_type: z.enum(['email', 'push', 'both'], {
    required_error: 'Tipo de notificação é obrigatório',
  }),
  email: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type AlertFormData = z.infer<typeof alertSchema>;

type AlertMetric = 'all' | 'cpl' | 'cpp' | 'roas' | 'ctr' | 'cpc' | 'other';

interface Alert {
  id: string;
  name: string;
  metric: 'cpl' | 'cpp' | 'roas' | 'ctr' | 'cpc' | 'other';
  condition: 'maior_que' | 'menor_que' | 'igual_a';
  value: string;
  clientId?: string;
  notification_type: 'email' | 'push' | 'both';
  email?: string;
  phone?: string;
  notes?: string;
  created_at: string;
  status: 'active' | 'inactive';
}

interface Client {
  id: string;
  name: string;
}

export default function AlertsPage() {
  const { can } = usePermission();

  if (!can('alerts', 'view')) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6"><AccessDenied /></main>
        </div>
      </div>
    );
  }
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [notificationType, setNotificationType] = useState<'email' | 'push' | 'both'>('email');
  const [metricFilter, setMetricFilter] = useState<AlertMetric>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
  });

  const watchNotificationType = watch('notification_type');

  useEffect(() => {
    if (watchNotificationType) {
      setNotificationType(watchNotificationType);
    }
  }, [watchNotificationType]);

  useEffect(() => {
    loadAlerts();
    loadClients();
  }, []);

  const loadAlerts = () => {
    try {
      const savedAlerts = localStorage.getItem('alerts');
      if (savedAlerts) {
        setAlerts(JSON.parse(savedAlerts));
      }
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = () => {
    try {
      const savedClients = localStorage.getItem('clients');
      if (savedClients) {
        const clientsList = JSON.parse(savedClients);
        setClients(clientsList.map((c: any) => ({ id: c.id, name: c.name })));
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const saveAlerts = (alertsList: Alert[]) => {
    try {
      localStorage.setItem('alerts', JSON.stringify(alertsList));
    } catch (error) {
      console.error('Erro ao salvar alertas:', error);
    }
  };

  const onSubmit = (data: AlertFormData) => {
    const newAlert: Alert = {
      id: editingAlert?.id || Date.now().toString(),
      ...data,
      created_at: editingAlert?.created_at || new Date().toISOString(),
      status: editingAlert?.status || 'active',
    };

    if (editingAlert) {
      const updatedAlerts = alerts.map(alert =>
        alert.id === editingAlert.id ? newAlert : alert
      );
      setAlerts(updatedAlerts);
      saveAlerts(updatedAlerts);
      toast({ title: "Sucesso", description: "Alerta atualizado." });
    } else {
      const updatedAlerts = [newAlert, ...alerts];
      setAlerts(updatedAlerts);
      saveAlerts(updatedAlerts);
      toast({ title: "Sucesso", description: "Novo alerta configurado." });
    }

    setIsModalOpen(false);
    setEditingAlert(null);
    reset();
  };

  const deleteAlert = (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este alerta?')) return;

    const updatedAlerts = alerts.filter(alert => alert.id !== id);
    setAlerts(updatedAlerts);
    saveAlerts(updatedAlerts);
    toast({ title: "Excluído", description: "Alerta removido.", variant: "destructive" });
  };

  const openEditModal = (alert: Alert) => {
    setEditingAlert(alert);
    setNotificationType(alert.notification_type);
    reset({
      name: alert.name,
      metric: alert.metric,
      condition: alert.condition,
      value: alert.value,
      clientId: alert.clientId || '',
      notification_type: alert.notification_type,
      email: alert.email || '',
      phone: alert.phone || '',
      notes: alert.notes || '',
    });
    setIsModalOpen(true);
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client?.name;
  };

  const getMetricLabel = (metric: string) => {
    const labels: Record<string, string> = {
      cpl: 'CPL',
      cpp: 'CPP',
      roas: 'ROAS',
      ctr: 'CTR',
      cpc: 'CPC',
      other: 'Outra',
    };
    return labels[metric] || metric;
  };

  const getConditionLabel = (condition: string) => {
    const labels: Record<string, string> = {
      maior_que: 'Maior que',
      menor_que: 'Menor que',
      igual_a: 'Igual a',
    };
    return labels[condition] || condition;
  };

  const getNotificationLabel = (type: string) => {
    const labels: Record<string, string> = {
      email: 'Email',
      push: 'Push',
      both: 'Email + Push',
    };
    return labels[type] || type;
  };

  const applyFilters = (alert: Alert) => {
    const matchesSearch = alert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.metric.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClientName(alert.clientId)?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const matchesMetric = metricFilter === 'all' || alert.metric === metricFilter;
    const matchesClient = clientFilter === 'all' || alert.clientId === clientFilter;

    return matchesMetric && matchesClient;
  };

  const filteredAlerts = alerts.filter(applyFilters);

  return (
    // 1. Fundo Geral Escuro
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Alertas</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Configure notificações de performance</p>
              </div>
              <button
                onClick={() => {
                  setEditingAlert(null);
                  setNotificationType('email');
                  reset();
                  setIsModalOpen(true);
                }}
                // Botão Dark
                className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <Plus className="h-5 w-5" />
                Novo Alerta
              </button>
            </div>
          </div>

          {/* Container de Busca e Filtros */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar alertas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:placeholder-slate-500"
                />
              </div>
              <button 
                onClick={() => setIsFilterModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
              >
                <Filter className="h-5 w-5" />
                Filtros
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-slate-600 dark:text-slate-400 mt-4">Carregando alertas...</p>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                    <Bell className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Nenhum alerta configurado</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">Configure alertas para CPL, CPP e ROAS</p>
                <button
                  onClick={() => {
                    setEditingAlert(null);
                    setNotificationType('email');
                    reset();
                    setIsModalOpen(true);
                  }}
                  className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all inline-flex items-center gap-2 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <Plus className="h-5 w-5" />
                  Configurar Alerta
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredAlerts.map((alert) => {
                  const clientName = getClientName(alert.clientId);
                  return (
                    // CARD DO ALERTA
                    <div key={alert.id} className="bg-white dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {/* Ícone Sólido Escuro */}
                          <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center dark:bg-slate-800">
                            <Bell className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">{alert.name}</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{getMetricLabel(alert.metric)}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditModal(alert)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteAlert(alert.id)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {getConditionLabel(alert.condition)} <span className="font-medium text-slate-900 dark:text-white">{alert.value}</span>
                        </p>
                        {clientName && (
                          <p className="text-sm text-slate-600 dark:text-slate-400">Cliente: {clientName}</p>
                        )}
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Notificação: {getNotificationLabel(alert.notification_type)}
                        </p>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          alert.status === 'active' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {alert.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal Alerta (Criação/Edição) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {editingAlert ? 'Editar Alerta' : 'Novo Alerta'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Alerta *
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                    placeholder="Nome do alerta"
                  />
                  {errors.name && (
                    <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Métrica *
                  </label>
                  <select
                    {...register('metric')}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:bg-slate-900"
                  >
                    <option value="">Selecione a métrica</option>
                    <option value="cpl">CPL (Custo por Lead)</option>
                    <option value="cpp">CPP (Custo por Pedido)</option>
                    <option value="roas">ROAS (Retorno sobre Investimento)</option>
                    <option value="ctr">CTR (Taxa de Cliques)</option>
                    <option value="cpc">CPC (Custo por Clique)</option>
                    <option value="other">Outra</option>
                  </select>
                  {errors.metric && (
                    <p className="text-red-600 text-sm mt-1">{errors.metric.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Condição *
                  </label>
                  <select
                    {...register('condition')}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:bg-slate-900"
                  >
                    <option value="">Selecione a condição</option>
                    <option value="maior_que">Maior que</option>
                    <option value="menor_que">Menor que</option>
                    <option value="igual_a">Igual a</option>
                  </select>
                  {errors.condition && (
                    <p className="text-red-600 text-sm mt-1">{errors.condition.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Valor *
                  </label>
                  <input
                    {...register('value')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                    placeholder="Ex: 50, 2.5, 100"
                  />
                  {errors.value && (
                    <p className="text-red-600 text-sm mt-1">{errors.value.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cliente (opcional)
                  </label>
                  <select
                    {...register('clientId')}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:bg-slate-900"
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Notificação *
                  </label>
                  <select
                    {...register('notification_type')}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:bg-slate-900"
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="email">Email</option>
                    <option value="push">Push</option>
                    <option value="both">Email + Push</option>
                  </select>
                  {errors.notification_type && (
                    <p className="text-red-600 text-sm mt-1">{errors.notification_type.message}</p>
                  )}
                </div>

                {(notificationType === 'email' || notificationType === 'both') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Email para Notificação
                    </label>
                    <input
                      {...register('email')}
                      type="email"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                      placeholder="email@exemplo.com"
                    />
                  </div>
                )}

                {(notificationType === 'push' || notificationType === 'both') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Telefone para SMS
                    </label>
                    <input
                      {...register('phone')}
                      type="tel"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Observações
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                    placeholder="Observações sobre o alerta"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingAlert(null);
                      reset();
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:bg-slate-800 transition-all dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {editingAlert ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Filtros */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Filtrar Alertas</h2>
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Métrica
                  </label>
                  <select
                    value={metricFilter}
                    onChange={(e) => setMetricFilter(e.target.value as AlertMetric)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:bg-slate-900"
                  >
                    <option value="all">Todas as Métricas</option>
                    <option value="cpl">CPL</option>
                    <option value="cpp">CPP</option>
                    <option value="roas">ROAS</option>
                    <option value="ctr">CTR</option>
                    <option value="cpc">CPC</option>
                    <option value="other">Outra</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cliente
                  </label>
                  <select
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:bg-slate-900"
                  >
                    <option value="all">Todos os Clientes</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setMetricFilter('all');
                    setClientFilter('all');
                    setIsFilterModalOpen(false);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Limpar Filtros
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(false)}
                  className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:bg-slate-800 transition-all dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}