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
  status: string;
}

type DateRangeOption = '7d' | '14d' | '30d' | '90d' | '180d' | '1y' | 'custom';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeOption>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [mrrTarget, setMrrTarget] = useState(15000);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState('');
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

  useEffect(() => {
    if (allClients.length > 0) {
      calculateMetrics(allClients);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, customStart, customEnd, allClients]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, contract_value, created_at, contract_start_date, status')
        .order('created_at', { ascending: false });

      if (error) throw error;

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
            '7d': 7, '14d': 14, '30d': 30, '90d': 90, '180d': 180, '1y': 365
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

    const activeClientsNow = clients.filter(c =>
        new Date(c.created_at) <= end && c.status === 'active'
    ).length;

    const activeClientsPrev = clients.filter(c =>
        new Date(c.created_at) <= prevEnd && c.status === 'active'
    ).length;

    let clientsGrowth = 0;
    if (activeClientsPrev > 0) {
      clientsGrowth = ((activeClientsNow - activeClientsPrev) / activeClientsPrev) * 100;
    } else if (activeClientsNow > 0) {
      clientsGrowth = 100;
    }

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

  const mrrProgress = Math.min((metrics.mrrCurrent / mrrTarget) * 100, 100);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0c0a1a] transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Dashboard Principal
              </h1>
              <p className="text-slate-500 dark:text-white/40 mt-1 text-sm">
                Visão geral da performance da sua agência
              </p>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-white/5 p-2 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-sm">
                <Filter className="h-4 w-4 text-slate-400 dark:text-white/30 ml-2" />
                <span className="text-sm text-slate-400 dark:text-white/30 mr-2 border-r border-slate-200 dark:border-white/10 pr-2 h-5 flex items-center">Período:</span>

                <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
                    className="bg-transparent text-sm font-medium text-slate-700 dark:text-white/70 focus:outline-none cursor-pointer"
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
                    <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200 dark:border-white/10">
                        <input
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="text-xs bg-slate-50 dark:bg-white/5 border-none rounded-lg px-2 py-1"
                        />
                        <span className="text-slate-300 dark:text-white/20">-</span>
                        <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="text-xs bg-slate-50 dark:bg-white/5 border-none rounded-lg px-2 py-1"
                        />
                    </div>
                )}
            </div>
          </div>

          {loading ? (
             <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
             </div>
          ) : (
            <>
              <p className="text-xs text-slate-400 dark:text-white/30 mb-4 text-right">
                  Comparando: <span className="font-semibold text-slate-500 dark:text-white/50">{getPeriodLabel()}</span> com período anterior.
              </p>

              {/* KPI Cards */}
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 mb-8">

                {/* Card 1: Clientes */}
                <div className="card-hover bg-white dark:bg-white/[0.04] p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Total Clientes (Ativos)</h3>
                    <div className="p-2.5 bg-purple-50 dark:bg-purple-500/10 rounded-xl">
                      <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{metrics.clientsCurrent}</h2>
                    <span className={`text-xs font-semibold flex items-center px-1.5 py-0.5 rounded-md ${metrics.clientsGrowth >= 0 ? 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-500/10' : 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-500/10'}`}>
                      {metrics.clientsGrowth >= 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                      {metrics.clientsGrowth.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-white/25 mt-2">
                    Anteriormente: {metrics.clientsPrevious}
                  </p>
                </div>

                {/* Card 2: MRR */}
                <div className="card-hover bg-white dark:bg-white/[0.04] p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Receita Recorrente (MRR)</h3>
                    <div className="p-2.5 bg-green-50 dark:bg-green-500/10 rounded-xl">
                      <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(metrics.mrrCurrent)}
                    </h2>
                    <span className={`text-xs font-semibold flex items-center px-1.5 py-0.5 rounded-md ${metrics.mrrGrowth >= 0 ? 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-500/10' : 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-500/10'}`}>
                      {metrics.mrrGrowth >= 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                      {metrics.mrrGrowth.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-white/25 mt-2">
                    Anteriormente: {formatCurrency(metrics.mrrPrevious)}
                  </p>
                </div>

                {/* Card 3: ARR */}
                <div className="card-hover bg-white dark:bg-white/[0.04] p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Projeção Anual (ARR)</h3>
                    <div className="p-2.5 bg-violet-50 dark:bg-violet-500/10 rounded-xl">
                      <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(metrics.mrrCurrent * 12)}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-white/25 mt-2">
                    Baseado no MRR atual
                  </p>
                </div>

                {/* Card 4: Meta */}
                <div className="card-hover bg-white dark:bg-white/[0.04] p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm relative group">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Meta de Receita</h3>
                    <div className="p-2.5 bg-orange-50 dark:bg-orange-500/10 rounded-xl">
                      <Target className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>

                  {isEditingTarget ? (
                    <div className="flex items-center gap-2 mb-2">
                        <input
                            type="number"
                            value={tempTarget}
                            onChange={(e) => setTempTarget(e.target.value)}
                            className="w-full px-3 py-1.5 text-lg font-bold border rounded-xl dark:bg-white/5 dark:text-white dark:border-white/10"
                            autoFocus
                        />
                        <button onClick={handleUpdateTarget} className="p-1.5 text-green-600 bg-green-50 dark:bg-green-500/10 rounded-lg hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors">
                            <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setIsEditingTarget(false)} className="p-1.5 text-red-600 bg-red-50 dark:bg-red-500/10 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
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
                            className="opacity-0 group-hover:opacity-100 transition-all p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg"
                            title="Editar Meta"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                    </div>
                  )}

                  <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-2 mt-3 overflow-hidden">
                    <div
                        className="h-2 rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${mrrProgress}%`,
                          background: 'linear-gradient(90deg, #f97316, #fb923c)',
                        }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-white/25 mt-2">
                    {mrrProgress.toFixed(0)}% atingido
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                {/* Recent Activity */}
                <div className="md:col-span-2 bg-white dark:bg-white/[0.04] p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Últimas Adições</h3>
                    <Activity className="h-4 w-4 text-slate-300 dark:text-white/20" />
                  </div>
                  <div className="space-y-3">
                    {recentActivities.length === 0 ? (
                        <p className="text-slate-400 dark:text-white/30 text-sm">Nenhuma atividade recente encontrada.</p>
                    ) : (
                        recentActivities.map((activity, index) => (
                            <div key={index} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                <div className="p-2 bg-green-50 dark:bg-green-500/10 rounded-xl mt-0.5">
                                    <Users className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 dark:text-white/90 truncate">{activity.message}</p>
                                    <p className="text-xs text-slate-400 dark:text-white/30 mt-0.5">
                                        Valor do contrato: {activity.value ? formatCurrency(activity.value) : 'N/A'}
                                    </p>
                                </div>
                                <span className="text-xs text-slate-300 dark:text-white/20 whitespace-nowrap">{activity.time}</span>
                            </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Financial Status */}
                <div className="bg-white dark:bg-white/[0.04] p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6">Status Financeiro</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500 dark:text-white/40">MRR Atual</span>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(metrics.mrrCurrent)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500 dark:text-white/40">MRR Anterior</span>
                      <span className="text-sm font-medium text-slate-400 dark:text-white/30">{formatCurrency(metrics.mrrPrevious)}</span>
                    </div>
                    <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                      <span className="font-bold text-slate-900 dark:text-white">Crescimento</span>
                      <span className={`font-bold ${metrics.mrrGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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