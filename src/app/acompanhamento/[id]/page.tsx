'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Package, Send, CheckCircle, BarChart3, Loader2, TrendingUp, Wallet,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer,
} from 'recharts';

// ─── Types ──────────────────────────────────────────────────────────────────────

type ClientData = {
  client: { id: number; name: string; company: string | null; status: string };
  packages: Array<{ id: number; name: string; contracted: number; delivered: number; balance: number; refunded: number }>;
  dispatches: Array<{ id: number; packageId: number; name: string; date: string; sent: number; delivered: number; leads: number; sales: number }>;
  summary: {
    totalContracted: number; totalRefunded: number; totalBillable: number;
    totalDelivered: number; totalSent: number; totalBalance: number;
    totalDispatches: number; deliveryRate: number;
  };
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmtN(v: number) { return new Intl.NumberFormat('pt-BR').format(v); }

const STATUS_STYLES: Record<string, string> = {
  ativo: 'bg-emerald-100 text-emerald-700',
  pausado: 'bg-yellow-100 text-yellow-700',
  encerrado: 'bg-red-100 text-red-700',
};

// ─── Component ──────────────────────────────────────────────────────────────────

export default function AcompanhamentoPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/acompanhamento/${clientId}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Erro ao carregar dados');
        }
        setData(await res.json());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (clientId) load();
  }, [clientId]);

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700">Ops!</p>
          <p className="text-sm text-slate-500 mt-1">{error || 'Dados não encontrados.'}</p>
        </div>
      </div>
    );
  }

  const { client, packages, dispatches, summary } = data;

  // Chart data — last 20 dispatches chronologically
  const chartData = [...dispatches]
    .reverse()
    .slice(-20)
    .map(d => ({
      name: d.name.length > 18 ? d.name.slice(0, 18) + '…' : d.name,
      Entregues: d.delivered,
      Leads: d.leads,
      Vendas: d.sales,
    }));

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
              {client.name?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{client.name}</h1>
              {client.company && (
                <p className="text-xs text-slate-500">{client.company}</p>
              )}
            </div>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[client.status] || 'bg-slate-100 text-slate-600'}`}>
            {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">

        {/* ─── Summary Cards ───────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Resumo Geral
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard
              title="Msgs Contratadas"
              value={fmtN(summary.totalContracted)}
              icon={Package}
              color="text-purple-600 bg-purple-50"
            />
            <SummaryCard
              title="Msgs Entregues"
              value={fmtN(summary.totalDelivered)}
              subtitle={`${summary.deliveryRate.toFixed(1)}% taxa de entrega`}
              icon={CheckCircle}
              color="text-emerald-600 bg-emerald-50"
            />
            <SummaryCard
              title="Saldo Disponível"
              value={fmtN(summary.totalBalance)}
              subtitle={summary.totalBillable > 0 ? `${((summary.totalBalance / summary.totalBillable) * 100).toFixed(1)}% restante` : undefined}
              icon={Wallet}
              color={summary.totalBalance < 5000 ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'}
            />
            <SummaryCard
              title="Total de Disparos"
              value={fmtN(summary.totalDispatches)}
              icon={Send}
              color="text-indigo-600 bg-indigo-50"
            />
          </div>
        </section>

        {/* ─── Packages ────────────────────────────────────────────────────── */}
        {packages.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Pacotes Ativos
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {packages.map(pkg => {
                const usedPercent = pkg.contracted > 0
                  ? ((pkg.delivered / (pkg.contracted - pkg.refunded)) * 100)
                  : 0;
                return (
                  <div key={pkg.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-900">{pkg.name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        pkg.balance < 1000 ? 'bg-red-100 text-red-700' : pkg.balance < 5000 ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {fmtN(pkg.balance)} restantes
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>{fmtN(pkg.delivered)} entregues</span>
                        <span>{fmtN(pkg.contracted - pkg.refunded)} contratadas</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${usedPercent > 90 ? 'bg-red-500' : usedPercent > 70 ? 'bg-yellow-500' : 'bg-purple-600'}`}
                          style={{ width: `${Math.min(usedPercent, 100)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 text-right">
                        {usedPercent.toFixed(1)}% utilizado
                      </p>
                    </div>

                    {pkg.refunded > 0 && (
                      <p className="text-[11px] text-yellow-600">
                        {fmtN(pkg.refunded)} msgs estornadas
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Chart ───────────────────────────────────────────────────────── */}
        {chartData.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Desempenho dos Disparos
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Entregues" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Leads" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Vendas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ─── Dispatches Table ────────────────────────────────────────────── */}
        {dispatches.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Histórico de Disparos
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Disparo</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Data</th>
                      <th className="text-right text-xs font-medium text-slate-500 px-5 py-3">Enviadas</th>
                      <th className="text-right text-xs font-medium text-slate-500 px-5 py-3">Entregues</th>
                      <th className="text-right text-xs font-medium text-slate-500 px-5 py-3">Taxa</th>
                      <th className="text-right text-xs font-medium text-slate-500 px-5 py-3">Leads</th>
                      <th className="text-right text-xs font-medium text-slate-500 px-5 py-3">Vendas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatches.map((d, i) => {
                      const rate = d.sent > 0 ? ((d.delivered / d.sent) * 100).toFixed(1) : '0.0';
                      const pkg = packages.find(p => p.id === d.packageId);
                      return (
                        <tr key={d.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-purple-50/30 transition-colors`}>
                          <td className="px-5 py-3">
                            <p className="font-medium text-slate-900">{d.name}</p>
                            {pkg && <p className="text-[11px] text-slate-400">{pkg.name}</p>}
                          </td>
                          <td className="px-5 py-3 text-slate-600">
                            {new Date(d.date).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-5 py-3 text-right text-slate-700 font-medium">{fmtN(d.sent)}</td>
                          <td className="px-5 py-3 text-right text-slate-700 font-medium">{fmtN(d.delivered)}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={`text-xs font-semibold ${parseFloat(rate) >= 90 ? 'text-emerald-600' : parseFloat(rate) >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {rate}%
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-slate-700">{d.leads > 0 ? fmtN(d.leads) : '—'}</td>
                          <td className="px-5 py-3 text-right text-slate-700">{d.sales > 0 ? fmtN(d.sales) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ─── Footer ──────────────────────────────────────────────────────── */}
        <footer className="text-center py-8 text-xs text-slate-400">
          <p>Relatório gerado automaticamente por <span className="font-semibold text-purple-600">Antigravity</span></p>
          <p className="mt-1">Atualizado em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </footer>
      </main>
    </div>
  );
}

// ─── Summary Card ───────────────────────────────────────────────────────────────

function SummaryCard({
  title, value, subtitle, icon: Icon, color,
}: {
  title: string; value: string; subtitle?: string; icon: React.ElementType; color: string;
}) {
  const [iconColor, bgColor] = color.split(' ');
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">{title}</p>
          <p className="text-xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}
