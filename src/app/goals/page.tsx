'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { Target, Plus, Search, Filter, Edit, Trash2, Calendar, X } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/use-permission';
import AccessDenied from '@/components/custom/access-denied';

const goalSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  targetValue: z.string().min(1, 'Meta é obrigatória'),
  currentValue: z.string().optional(),
  deadline: z.string().optional(),
  clientId: z.string().optional(),
  notes: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface Goal {
  id: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  deadline?: string;
  clientId?: string;
  notes?: string;
  created_at: string;
}

interface Client {
  id: string;
  name: string;
}

export default function GoalsPage() {
  const { can } = usePermission();

  if (!can('goals', 'view')) {
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
  const [goals, setGoals] = useState<Goal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState<string>('all');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
  });

  useEffect(() => {
    loadGoals();
    loadClients();
  }, []);

  const loadGoals = () => {
    try {
      const savedGoals = localStorage.getItem('goals');
      if (savedGoals) {
        setGoals(JSON.parse(savedGoals));
      }
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
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

  const saveGoals = (goalsList: Goal[]) => {
    try {
      localStorage.setItem('goals', JSON.stringify(goalsList));
    } catch (error) {
      console.error('Erro ao salvar metas:', error);
    }
  };

  const onSubmit = (data: GoalFormData) => {
    const newGoal: Goal = {
      id: editingGoal?.id || Date.now().toString(),
      title: data.title,
      description: data.description,
      targetValue: parseFloat(data.targetValue.replace(',', '.')),
      currentValue: data.currentValue ? parseFloat(data.currentValue.replace(',', '.')) : 0,
      deadline: data.deadline,
      clientId: data.clientId,
      notes: data.notes,
      created_at: editingGoal?.created_at || new Date().toISOString(),
    };

    if (editingGoal) {
      const updatedGoals = goals.map(goal =>
        goal.id === editingGoal.id ? newGoal : goal
      );
      setGoals(updatedGoals);
      saveGoals(updatedGoals);
      toast({ title: "Sucesso", description: "Meta atualizada." });
    } else {
      const updatedGoals = [newGoal, ...goals];
      setGoals(updatedGoals);
      saveGoals(updatedGoals);
      toast({ title: "Sucesso", description: "Nova meta criada." });
    }

    setIsModalOpen(false);
    setEditingGoal(null);
    reset();
  };

  const deleteGoal = (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return;

    const updatedGoals = goals.filter(goal => goal.id !== id);
    setGoals(updatedGoals);
    saveGoals(updatedGoals);
    toast({ title: "Excluído", description: "Meta removida.", variant: "destructive" });
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    reset({
      title: goal.title,
      description: goal.description || '',
      targetValue: goal.targetValue.toString(),
      currentValue: goal.currentValue.toString(),
      deadline: goal.deadline || '',
      clientId: goal.clientId || '',
      notes: goal.notes || '',
    });
    setIsModalOpen(true);
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client?.name;
  };

  const applyFilters = (goal: Goal) => {
    const matchesSearch = goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClientName(goal.clientId)?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const matchesClient = clientFilter === 'all' || goal.clientId === clientFilter;

    return matchesClient;
  };

  const filteredGoals = goals.filter(applyFilters);

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Metas</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Defina e acompanhe objetivos mensais</p>
              </div>
              <button
                onClick={() => {
                  setEditingGoal(null);
                  reset();
                  setIsModalOpen(true);
                }}
                className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <Plus className="h-5 w-5" />
                Nova Meta
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar metas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:placeholder-slate-500"
                />
              </div>
              <button 
                onClick={() => setIsFilterModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
              >
                <Filter className="h-5 w-5 text-slate-600" />
                Filtros
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-slate-600 dark:text-slate-400 mt-4">Carregando metas...</p>
              </div>
            ) : filteredGoals.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                    <Target className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Nenhuma meta cadastrada</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">Defina metas de conversões, leads e ROAS por cliente</p>
                <button
                  onClick={() => {
                    setEditingGoal(null);
                    reset();
                    setIsModalOpen(true);
                  }}
                  className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all inline-flex items-center gap-2 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <Plus className="h-5 w-5" />
                  Criar Meta
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredGoals.map((goal) => {
                  const progress = calculateProgress(goal.currentValue, goal.targetValue);
                  const clientName = getClientName(goal.clientId);
                  return (
                    <div key={goal.id} className="bg-slate-50 dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-10 h-10 bg-slate-900 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                              <Target className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900 dark:text-white">{goal.title}</h3>
                              {clientName && (
                                <p className="text-sm text-slate-600 dark:text-slate-400">Cliente: {clientName}</p>
                              )}
                            </div>
                          </div>
                          {goal.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{goal.description}</p>
                          )}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-600 dark:text-slate-400">Progresso</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {goal.currentValue.toLocaleString('pt-BR')} / {goal.targetValue.toLocaleString('pt-BR')}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-500">
                              <span>{progress.toFixed(0)}% concluído</span>
                              {goal.deadline && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-4">
                          <button
                            onClick={() => openEditModal(goal)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteGoal(goal.id)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal Meta (Criação/Edição) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {editingGoal ? 'Editar Meta' : 'Nova Meta'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Título *
                  </label>
                  <input
                    {...register('title')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                    placeholder="Ex: Meta de conversões"
                  />
                  {errors.title && (
                    <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cliente
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Valor Meta *
                    </label>
                    <input
                      {...register('targetValue')}
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                      placeholder="1000"
                    />
                    {errors.targetValue && (
                      <p className="text-red-600 text-sm mt-1">{errors.targetValue.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Valor Atual
                    </label>
                    <input
                      {...register('currentValue')}
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Prazo
                  </label>
                  <input
                    {...register('deadline')}
                    type="date"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Descrição
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                    placeholder="Descrição da meta"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Observações
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                    placeholder="Observações adicionais"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingGoal(null);
                      reset();
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {editingGoal ? 'Atualizar' : 'Salvar'}
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
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Filtrar Metas</h2>
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
                  className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
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