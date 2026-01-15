'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Target, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  Filter,
  Edit2,
  Check,
  X
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  contract_value: number | null;
  created_at: string;
  contract_start_date: string | null;
  status: string; // Adicionado para filtrar ativos/inativos
}

type DateRangeOption = '7d' | '14d' | '30d' | '90d' | '180d' | '1y' | 'custom';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [allClients, setAllClients] = useState<Client[]>([]);
  
  // Estado do Filtro
  const [dateRange, setDateRange] = useState<DateRangeOption>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  // Estado da Meta
  const [mrrTarget, setMrrTarget] = useState(15000);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState('');
  
  // Estados para as métricas
  const [metrics, setMetrics] = useState({
    clientsCurrent: 0,
    clientsGrowth: 0,
    mrrCurrent: 0,
    mrrGrowth: 0,
    clientsPrevious: 0,
    mrrPrevious: 0
  });
  
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  // Recalcula métricas sempre que o filtro muda
  useEffect(() => {
    if (allClients.length > 0) {
      calculateMetrics(allClients);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, customStart, customEnd, allClients]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Busca Clientes (INCLUINDO STATUS)
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, contract_value, created_at, contract_start_date, status')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 2. Busca Meta de MRR
      const { data: goalData } = await supabase
        .from('goals')
        .select('target_value')
        .eq('key', 'mrr_target')
        .single();

      if (goalData) {
        setMrrTarget(Number(goalData.target_value));
      }

      if (clients) {
        setAllClients(clients);
        
        // Simula atividades (baseado nos clientes recém criados)
        const activities = clients.slice(0, 5).map(client => ({
          id: client.id,
          type: 'new_client',
          message: `Novo cliente adicionado: ${client.name}`,
          time: new Date(client.created_at).toLocaleDateString('pt-BR'),
          value: client.contract_value
        }));
        setRecentActivities(activities);
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTarget = async () => {
    const newTarget = parseFloat(tempTarget);
    if (isNaN(newTarget) || newTarget <= 0) {
        toast({ title: "Valor inválido", variant: "destructive" });
        return;
    }

    try {
        const { error } = await supabase
            .from('goals')
            .upsert({ key: 'mrr_target', target_value: newTarget, title: 'Meta de Receita Mensal' }, { onConflict: 'key' });

        if (error) throw error;

        setMrrTarget(newTarget);
        setIsEditingTarget(false);
        toast({ title: "Meta atualizada!", description: "Sua nova meta foi definida." });
    } catch (error) {
        toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const startEditing = () => {
    setTempTarget(mrrTarget.toString());
    setIsEditingTarget(true);
  };

  const getDates = () => {
    const end = customEnd ? new Date(customEnd) : new Date();
    end.setHours(23, 59, 59, 999); 
    
    let start = new Date();
    
    if (dateRange === 'custom') {
        start = customStart ? new Date(customStart) : new Date();
    } else {
        const daysMap: Record<string, number> = {
            '7d': 7,
            '14d': 14,
            '30d': 30,
            '90d': 90,
            '180d': 180,
            '1y': 365
        };
        const daysToSubtract = daysMap[dateRange] || 30;
        start.setDate(end.getDate() - daysToSubtract);
    }
    start.setHours(0, 0, 0, 0);

    const duration = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1); 
    const prevStart = new Date(prevEnd.getTime() - duration);

    return { start, end, prevStart, prevEnd };
  };

  const calculateMetrics = (clients: Client[]) => {
    const { start, end, prevStart, prevEnd } = getDates();

    // --- CÁLCULO 1: CLIENTES (APENAS ATIVOS) ---
    // Filtra clientes criados até a data final E que estão ativos hoje
    const activeClientsNow = clients.filter(c => 
        new Date(c.created_at) <= end && c.status === 'active'
    ).length;

    // Para comparação histórica, assumimos status ativo no passado baseado na data de criação
    // (Aprimoramento ideal seria ter tabela de histórico de status, mas isso resolve 90%)
    const activeClientsPrev = clients.filter(c => 
        new Date(c.created_at) <= prevEnd && c.status === 'active'
    ).length;

    let clientsGrowth = 0;
    if (activeClientsPrev > 0) {
      clientsGrowth = ((activeClientsNow - activeClientsPrev) / activeClientsPrev) * 100;
    } else if (activeClientsNow > 0) {
      clientsGrowth = 100;
    }

    // --- CÁLCULO 2: MRR (APENAS ATIVOS) ---
    const currentMRR = clients
        .filter(c => new Date(c.created_at) <= end && c.status === 'active')
        .reduce((acc, c) => acc + (c.contract_value || 0), 0);

    const previousMRR = clients
        .filter(c => new Date(c.created_at) <= prevEnd && c.status === 'active')
        .reduce((acc, c) => acc + (c.contract_value || 0), 0);

    let mrrGrowth = 0;
    if (previousMRR > 0) {
      mrrGrowth = ((currentMRR - previousMRR) / previousMRR) * 100;
    } else if (currentMRR > 0) {
      mrrGrowth = 100;
    }

    setMetrics({
      clientsCurrent: activeClientsNow,
      clientsPrevious: activeClientsPrev,
      clientsGrowth,
      mrrCurrent: currentMRR,
      mrrPrevious: previousMRR,
      mrrGrowth
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getPeriodLabel = () => {
    const { start, end } = getDates();
    return `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`;
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard Principal</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Visão geral da performance da sua agência
              </p>
            </div>

            {/* BARRA DE FILTROS */}
            <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                <Filter className="h-4 w-4 text-slate-500 ml-2" />
                <span className="text-sm text-slate-500 mr-2 border-r border-slate-200 dark:border-slate-700 pr-2 h-5 flex items-center">Período:</span>
                
                <select 
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
                    className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                    <option value="7d">Últimos 7 dias</option>
                    <option value="14d">Últimos 14 dias</option>
                    <option value="30d">Últimos 30 dias</option>
                    <option value="90d">Últimos 3 meses</option>
                    <option value="180d">Últimos 6 meses</option>
                    <option value="1y">Último Ano</option>
                    <option value="custom">Personalizado</option>
                </select>

                {dateRange === 'custom' && (
                    <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                        <input 
                            type="date" 
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="text-xs bg-slate-100 dark:bg-slate-800 border-none rounded px-2 py-1"
                        />
                        <span className="text-slate-400">-</span>
                        <input 
                            type="date" 
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="text-xs bg-slate-100 dark:bg-slate-800 border-none rounded px-2 py-1"
                        />
                    </div>
                )}
            </div>
          </div>

          {loading ? (
             <div className="flex items-center justify-center h-64">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
             </div>
          ) : (
            <>
              <p className="text-xs text-slate-500 mb-4 text-right">
                  Comparando período: <span className="font-semibold">{getPeriodLabel()}</span> com período anterior equivalente.
              </p>

              {/* GRID DE CARDS INTELIGENTES */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                
                {/* CARD 1: BASE DE CLIENTES ATIVOS */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total de Clientes (Ativos)</h3>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{metrics.clientsCurrent}</h2>
                    <span className={`text-xs font-medium flex items-center ${metrics.clientsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.clientsGrowth >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                      {metrics.clientsGrowth.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Anteriormente: {metrics.clientsPrevious}
                  </p>
                </div>

                {/* CARD 2: MRR */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Receita Recorrente (MRR)</h3>
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(metrics.mrrCurrent)}
                    </h2>
                    <span className={`text-xs font-medium flex items-center ${metrics.mrrGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.mrrGrowth >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                      {metrics.mrrGrowth.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Anteriormente: {formatCurrency(metrics.mrrPrevious)}
                  </p>
                </div>

                {/* CARD 3: PROJEÇÃO ANUAL */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Projeção Anual (ARR)</h3>
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(metrics.mrrCurrent * 12)}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Baseado no MRR atual
                  </p>
                </div>

                {/* CARD 4: META DO PERÍODO (EDITÁVEL) */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 relative group">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Meta de Receita</h3>
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                  
                  {isEditingTarget ? (
                    <div className="flex items-center gap-2 mb-2">
                        <input 
                            type="number" 
                            value={tempTarget}
                            onChange={(e) => setTempTarget(e.target.value)}
                            className="w-full px-2 py-1 text-lg font-bold border rounded dark:bg-slate-800 dark:text-white dark:border-slate-700"
                            autoFocus
                        />
                        <button onClick={handleUpdateTarget} className="p-1 text-green-600 bg-green-100 rounded hover:bg-green-200">
                            <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setIsEditingTarget(false)} className="p-1 text-red-600 bg-red-100 rounded hover:bg-red-200">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {formatCurrency(mrrTarget)}
                        </h2>
                        <button 
                            onClick={startEditing} 
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar Meta"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                    </div>
                  )}

                  <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2 dark:bg-slate-800">
                    <div 
                        className="bg-orange-500 h-2.5 rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min((metrics.mrrCurrent / mrrTarget) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {((metrics.mrrCurrent / mrrTarget) * 100).toFixed(0)}% atingido
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {/* ATIVIDADE RECENTE */}
                <div className="md:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Últimas Adições</h3>
                    <Activity className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="space-y-4">
                    {recentActivities.length === 0 ? (
                        <p className="text-slate-500 text-sm">Nenhuma atividade recente encontrada.</p>
                    ) : (
                        recentActivities.map((activity, index) => (
                            <div key={index} className="flex items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full mt-1">
                                    <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{activity.message}</p>
                                    <p className="text-xs text-slate-500">
                                        Valor do contrato: {activity.value ? formatCurrency(activity.value) : 'N/A'}
                                    </p>
                                </div>
                                <span className="text-xs text-slate-400">{activity.time}</span>
                            </div>
                        ))
                    )}
                  </div>
                </div>

                {/* RESUMO RÁPIDO */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Status Financeiro</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600 dark:text-slate-400">MRR Atual</span>
                      <span className="text-sm font-medium text-green-600">{formatCurrency(metrics.mrrCurrent)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600 dark:text-slate-400">MRR Anterior</span>
                      <span className="text-sm font-medium text-slate-500">{formatCurrency(metrics.mrrPrevious)}</span>
                    </div>
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <span className="font-bold text-slate-900 dark:text-white">Crescimento</span>
                      <span className={`font-bold ${metrics.mrrGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {metrics.mrrGrowth > 0 ? '+' : ''}{formatCurrency(metrics.mrrCurrent - metrics.mrrPrevious)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
}