'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import {
  Users,
  Package,
  Send,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Wallet,
  BarChart3,
  ArrowRight,
  AlertTriangle,
  Calendar,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { getDashboardStats, getDisparoClients, getClientsWithLowBalance } from '@/hooks/use-disparos';
import type { DisparoClient } from '@/hooks/use-disparos';

type LowBalanceAlert = { clientId: number; clientName: string; clientCompany: string | null; totalBalance: number; totalContracted: number };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value);
}

type PeriodKey = 'all' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

const PERIOD_LABELS: Record<PeriodKey, string> = {
  all: 'Todo o periodo',
  this_week: 'Esta semana',
  last_week: 'Semana passada',
  this_month: 'Este mes',
  last_month: 'Mes passado',
  custom: 'Periodo personalizado',
};

function getPeriodDates(period: PeriodKey): { start?: string; end?: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  if (period === 'all') return {};

  if (period === 'this_week') {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday-based
    const start = new Date(now);
    start.setDate(now.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return { start: fmt(start), end: fmt(now) };
  }

  if (period === 'last_week') {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - diff);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastSunday = new Date(thisMonday);
    lastSunday.setDate(thisMonday.getDate() - 1);
    return { start: fmt(lastMonday), end: fmt(lastSunday) };
  }

  if (period === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: fmt(start), end: fmt(now) };
  }

  if (period === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: fmt(start), end: fmt(end) };
  }

  return {};
}

// ---------------------------------------------------------------------------
// StatCard component
// ---------------------------------------------------------------------------

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white truncate">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-white/40 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg bg-slate-100 dark:bg-white/[0.06] ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 bg-slate-200 dark:bg-white/10 rounded" />
          <div className="h-7 w-32 bg-slate-200 dark:bg-white/10 rounded" />
        </div>
        <div className="h-9 w-9 bg-slate-200 dark:bg-white/10 rounded-lg" />
      </div>
    </div>
  );
}

function ClientCardSkeleton() {
  return (
    <div className="bg-white dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-5 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded" />
        <div className="h-3 w-24 bg-slate-200 dark:bg-white/10 rounded" />
        <div className="h-6 w-16 bg-slate-200 dark:bg-white/10 rounded-full" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

type ClientStatus = 'ativo' | 'pausado' | 'encerrado';

const STATUS_STYLES: Record<ClientStatus, string> = {
  ativo: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  pausado: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
  encerrado: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
};

const STATUS_LABELS: Record<ClientStatus, string> = {
  ativo: 'Ativo',
  pausado: 'Pausado',
  encerrado: 'Encerrado',
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DisparosPage() {
  const router = useRouter();

  // Period filter state
  const [period, setPeriod] = useState<PeriodKey>('all');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Data state
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getDashboardStats>> | null>(null);
  const [clients, setClients] = useState<DisparoClient[]>([]);
  const [lowBalanceClients, setLowBalanceClients] = useState<LowBalanceAlert[]>([]);

  // UI state
  const [alertOpen, setAlertOpen] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'todos' | ClientStatus>('todos');

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customStart, customEnd]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let start: string | undefined;
      let end: string | undefined;

      if (period === 'custom') {
        if (!customStart || !customEnd) {
          setLoading(false);
          return;
        }
        start = customStart;
        end = customEnd;
      } else {
        const dates = getPeriodDates(period);
        start = dates.start;
        end = dates.end;
      }

      const [statsData, clientsData, lowBalance] = await Promise.all([
        getDashboardStats(start, end),
        getDisparoClients(),
        getClientsWithLowBalance(),
      ]);

      setStats(statsData);
      setClients(clientsData);
      setLowBalanceClients(lowBalance);
    } catch (err) {
      console.error('Erro ao carregar dados de disparos:', err);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------

  const filteredClients =
    statusFilter === 'todos'
      ? clients
      : clients.filter((c) => c.status === statusFilter);

  const displayedClients = filteredClients.slice(0, 6);

  const statusCounts = {
    todos: clients.length,
    ativo: clients.filter((c) => c.status === 'ativo').length,
    pausado: clients.filter((c) => c.status === 'pausado').length,
    encerrado: clients.filter((c) => c.status === 'encerrado').length,
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0c0a1a] transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {/* ---------------------------------------------------------------- */}
          {/* Page header                                                      */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Gestao de Disparos
              </h1>
              <p className="text-sm text-slate-500 dark:text-white/40 mt-1">
                Acompanhe os disparos de WhatsApp dos seus clientes
              </p>
            </div>

            {/* Period dropdown */}
            <div className="relative">
              <button
                onClick={() => setPeriodOpen(!periodOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] rounded-xl text-sm text-slate-700 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors"
              >
                <Calendar className="h-4 w-4 text-purple-600" />
                <span>{PERIOD_LABELS[period]}</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {periodOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#1a1730] border border-slate-200/80 dark:border-white/[0.06] rounded-xl shadow-lg z-50 py-1">
                  {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        setPeriod(key);
                        if (key !== 'custom') setPeriodOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors ${
                        period === key
                          ? 'text-purple-600 font-medium bg-purple-50 dark:bg-purple-500/10'
                          : 'text-slate-700 dark:text-white/70'
                      }`}
                    >
                      {PERIOD_LABELS[key]}
                    </button>
                  ))}

                  {period === 'custom' && (
                    <div className="px-4 py-3 border-t border-slate-200/80 dark:border-white/[0.06] space-y-2">
                      <div>
                        <label className="text-xs text-slate-500 dark:text-white/40 block mb-1">
                          Inicio
                        </label>
                        <input
                          type="date"
                          value={customStart}
                          onChange={(e) => setCustomStart(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.1] rounded-lg text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 dark:text-white/40 block mb-1">
                          Fim
                        </label>
                        <input
                          type="date"
                          value={customEnd}
                          onChange={(e) => setCustomEnd(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.1] rounded-lg text-slate-900 dark:text-white"
                        />
                      </div>
                      <button
                        onClick={() => setPeriodOpen(false)}
                        className="w-full mt-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Aplicar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Low balance alert banner                                         */}
          {/* ---------------------------------------------------------------- */}
          {lowBalanceClients.length > 0 && alertOpen && (
            <div className="mb-6 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                      Clientes com saldo baixo ({lowBalanceClients.length})
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400/70 mt-0.5">
                      Os seguintes clientes possuem menos de 5.000 mensagens restantes:
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {lowBalanceClients.map((c) => (
                        <button
                          key={c.clientId}
                          onClick={() => router.push(`/disparos/clientes/${c.clientId}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 text-xs font-medium rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-500/30 transition-colors"
                        >
                          {c.clientName}
                          <span className="text-yellow-600 dark:text-yellow-400/60">
                            ({formatNumber(c.totalBalance)} msgs)
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setAlertOpen(false)}
                  className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 p-1"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Operacional stats                                                */}
          {/* ---------------------------------------------------------------- */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3">
              Operacional
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {loading ? (
                <>
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </>
              ) : (
                <>
                  <StatCard
                    title="Clientes Ativos"
                    value={formatNumber(stats?.clientsCount ?? 0)}
                    icon={Users}
                    color="text-purple-600"
                  />
                  <StatCard
                    title="Pacotes Ativos"
                    value={formatNumber(stats?.packagesCount ?? 0)}
                    icon={Package}
                    color="text-blue-600"
                  />
                  <StatCard
                    title="Total Disparos"
                    value={formatNumber(stats?.totalDispatches ?? 0)}
                    icon={Send}
                    color="text-indigo-600"
                  />
                  <StatCard
                    title="Msgs Entregues"
                    value={formatNumber(stats?.totalDelivered ?? 0)}
                    subtitle={
                      stats && stats.totalSent > 0
                        ? `${((stats.totalDelivered / stats.totalSent) * 100).toFixed(1)}% de entrega`
                        : undefined
                    }
                    icon={CheckCircle}
                    color="text-green-600"
                  />
                </>
              )}
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Saldo de Mensagens (only for "Todo o periodo")                   */}
          {/* ---------------------------------------------------------------- */}
          {period === 'all' && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3">
                Saldo de Mensagens
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {loading ? (
                  <>
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                  </>
                ) : (
                  <>
                    <StatCard
                      title="Msgs Contratadas"
                      value={formatNumber(stats?.totalContracted ?? 0)}
                      icon={TrendingUp}
                      color="text-purple-600"
                    />
                    <StatCard
                      title="Msgs Utilizadas"
                      value={formatNumber(stats?.totalDelivered ?? 0)}
                      subtitle={
                        stats && stats.totalContracted > 0
                          ? `${((stats.totalDelivered / stats.totalContracted) * 100).toFixed(1)}% utilizado`
                          : undefined
                      }
                      icon={BarChart3}
                      color="text-orange-600"
                    />
                    <StatCard
                      title="Saldo Restante"
                      value={formatNumber(stats?.totalBalance ?? 0)}
                      subtitle={
                        stats && stats.totalContracted > 0
                          ? `${((stats.totalBalance / stats.totalContracted) * 100).toFixed(1)}% disponivel`
                          : undefined
                      }
                      icon={Wallet}
                      color="text-emerald-600"
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Financeiro stats                                                 */}
          {/* ---------------------------------------------------------------- */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3">
              Financeiro
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {loading ? (
                <>
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </>
              ) : (
                <>
                  <StatCard
                    title="Receita Bruta"
                    value={formatCurrency(stats?.totalGrossRevenue ?? 0)}
                    icon={DollarSign}
                    color="text-green-600"
                  />
                  <StatCard
                    title="Custo Plataforma"
                    value={formatCurrency(stats?.totalPlatformCost ?? 0)}
                    icon={Wallet}
                    color="text-red-500"
                  />
                  <StatCard
                    title="Receita Empresa"
                    value={formatCurrency(stats?.totalCompanyRevenue ?? 0)}
                    icon={TrendingUp}
                    color="text-purple-600"
                  />
                  <StatCard
                    title="Receita Parceiro"
                    value={formatCurrency(stats?.totalPartnerRevenue ?? 0)}
                    icon={Users}
                    color="text-blue-600"
                  />
                </>
              )}
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Clients section                                                  */}
          {/* ---------------------------------------------------------------- */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Clientes Recentes
              </h2>
              <button
                onClick={() => router.push('/disparos/clientes')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors"
              >
                Gerenciar Clientes
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Status filter pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(
                [
                  { key: 'todos', label: 'Todos' },
                  { key: 'ativo', label: 'Ativos' },
                  { key: 'pausado', label: 'Pausados' },
                  { key: 'encerrado', label: 'Encerrados' },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    statusFilter === key
                      ? 'bg-purple-600 text-white'
                      : 'bg-white dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] text-slate-600 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  {label} ({statusCounts[key]})
                </button>
              ))}
            </div>

            {/* Client cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <>
                  <ClientCardSkeleton />
                  <ClientCardSkeleton />
                  <ClientCardSkeleton />
                  <ClientCardSkeleton />
                  <ClientCardSkeleton />
                  <ClientCardSkeleton />
                </>
              ) : displayedClients.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Send className="h-10 w-10 text-slate-300 dark:text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-white/40">
                    Nenhum cliente encontrado para este filtro.
                  </p>
                </div>
              ) : (
                displayedClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => router.push(`/disparos/clientes/${client.id}`)}
                    className="bg-white dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-5 text-left hover:border-purple-300 dark:hover:border-purple-500/30 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-purple-600 transition-colors">
                          {client.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-white/40 truncate mt-0.5">
                          {client.company}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ml-2 ${
                          STATUS_STYLES[client.status]
                        }`}
                      >
                        {STATUS_LABELS[client.status]}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-white/40">
                      {client.email && <p className="truncate">{client.email}</p>}
                      {client.phone && <p>{client.phone}</p>}
                    </div>

                    <div className="flex items-center justify-end mt-3 text-xs text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Ver detalhes
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
