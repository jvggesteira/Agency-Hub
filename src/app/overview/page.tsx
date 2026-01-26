'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Loader2, TrendingUp, TrendingDown, DollarSign, Users, Target, MousePointer, Wallet, BarChart3, Filter, Calendar, Building2
} from 'lucide-react';
import { Card } from '@/components/ui/card';

// --- TIPAGEM ---
interface GeneralData {
  report: {
    financial: { revenue: number; invested: number; netProfit: number; roi: number; roas: number; cac: number; ticket: number };
    funnel: { impressions: number; clicks: number; leads: number; sales: number; cpl: number; ctr: number; convLead: number; convSales: number };
  };
  history: Array<{ date: string; revenue: number; leads: number }>;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);
const formatPercent = (val: number) => `${val?.toFixed(2)}%`;

export default function GeneralOverviewPage() {
  const [data, setData] = useState<GeneralData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [timeRange, setTimeRange] = useState("30");
  const [chartGrouping, setChartGrouping] = useState<'day' | 'week' | 'month'>('day');
  
  // Datas Customizadas
  const [customStart, setCustomStart] = useState('2026-01-01');
  const [customEnd, setCustomEnd] = useState('2026-02-28');

  // Calcula datas (Mesma lógica do dashboard individual)
  const getDateRangeParams = (option: string) => {
    if (option === 'custom') return `start=${customStart}&end=${customEnd}`;
    const end = new Date('2026-02-28'); // DATA FIXA DE TESTE (Remover em prod)
    const start = new Date('2026-02-28');
    start.setDate(end.getDate() - parseInt(option));
    return `start=${start.toISOString().split('T')[0]}&end=${end.toISOString().split('T')[0]}`;
  };

  useEffect(() => {
    // Se for customizado e faltar data, para aqui.
    if (timeRange === 'custom' && (!customStart || !customEnd)) return;
    
    setLoading(true);
    const dateQuery = getDateRangeParams(timeRange);

    console.log("Chamando API Overview..."); // Log para Debug

    fetch(`/api/analytics/general?${dateQuery}&groupBy=${chartGrouping}`)
      .then(async (res) => {
        const text = await res.text(); // Pega resposta como texto primeiro
        console.log("Resposta API:", text); // Mostra o que veio no console do navegador

        try {
            const json = JSON.parse(text); // Tenta converter pra JSON
            if (!res.ok) throw new Error(json.error || 'Erro na API');
            setData(json);
        } catch (e) {
            console.error("Erro JSON:", e);
            throw new Error("Resposta inválida da API: " + text.substring(0, 50));
        }
      })
      .catch((err) => {
          console.error("Erro Fatal Overview:", err);
          alert("Erro ao carregar dados: " + err.message); // Mostra o erro na tela pro usuário
      })
      .finally(() => {
          setLoading(false); // <--- GARANTE QUE O LOADING PARE
      });
  }, [timeRange, chartGrouping, customStart, customEnd]);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* CABEÇALHO DA PÁGINA */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-blue-600"/> Visão Geral da Agência
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Dados consolidados de todos os clientes ativos.</p>
                </div>

                {/* FILTROS */}
                <div className="flex flex-col md:flex-row items-center gap-3 mt-4 md:mt-0">
                    {/* Filtro Data */}
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                        <Calendar className="h-4 w-4 text-slate-600"/>
                        <select 
                            value={timeRange} 
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="bg-transparent font-medium text-sm focus:outline-none cursor-pointer"
                        >
                            <option value="7">Últimos 7 dias</option>
                            <option value="15">Últimos 15 dias</option>
                            <option value="30">Últimos 30 dias</option>
                            <option value="90">Últimos 3 Meses</option>
                            <option value="custom">Personalizado</option>
                        </select>
                    </div>
                    {/* Inputs Customizados */}
                    {timeRange === 'custom' && (
                        <div className="flex items-center gap-2 animate-in fade-in">
                            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="px-2 py-1.5 border rounded text-xs" />
                            <span className="text-xs">até</span>
                            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="px-2 py-1.5 border rounded text-xs" />
                        </div>
                    )}
                    {/* Agrupamento Gráfico */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        {(['day', 'week', 'month'] as const).map((mode) => (
                            <button key={mode} onClick={() => setChartGrouping(mode)} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${chartGrouping === mode ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                {mode === 'day' ? 'Diário' : mode === 'week' ? 'Semanal' : 'Mensal'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading || !data ? (
                <div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
            ) : (
                <div className="space-y-6 animate-in fade-in duration-500">
                    
                    {/* KPI CARDS (GERAL) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        <KPICard title="Receita Total" value={formatCurrency(data.report.financial.revenue)} icon={<TrendingUp className="h-4 w-4 text-green-600" />} />
                        <KPICard title="Investimento Total" value={formatCurrency(data.report.financial.invested)} icon={<Wallet className="h-4 w-4 text-orange-600" />} invertGrowth />
                        
                        <KPICard 
                            title="Lucro Líquido Global" 
                            value={formatCurrency(data.report.financial.netProfit)} 
                            icon={<DollarSign className={`h-4 w-4 ${data.report.financial.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />}
                            valueColor={data.report.financial.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}
                            description="Soma dos lucros reais dos clientes"
                        />
                        
                        <KPICard title="ROAS Médio" value={`${data.report.financial.roas.toFixed(2)}x`} icon={<BarChart3 className="h-4 w-4 text-blue-600" />} valueColor="text-blue-700" />
                        
                        <KPICard 
                            title="ROI Global (x)" 
                            value={`${(data.report.financial.roi / 100).toFixed(2)}x`} 
                            icon={<Target className="h-4 w-4 text-purple-600" />}
                            valueColor={data.report.financial.roi > 0 ? 'text-purple-700' : 'text-red-700'}
                            description="Retorno sobre Investimento Total"
                        />
                    </div>

                    {/* FUNIL CONSOLIDADO */}
                    <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
                        <div className="p-6">
                            <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2"><Filter className="h-4 w-4"/> Funil Agregado (Todos os Clientes)</h3>
                            <div className="flex flex-col items-center justify-center space-y-1 max-w-2xl mx-auto">
                                <PyramidLevel label="Impressões Totais" value={formatNumber(data.report.funnel.impressions)} width="w-[100%]" color="bg-blue-50 border-blue-200 text-blue-800" />
                                <PyramidConnector label="CTR Médio" value={`${data.report.funnel.ctr.toFixed(2)}%`} />
                                <PyramidLevel label="Cliques Totais" value={formatNumber(data.report.funnel.clicks)} width="w-[85%]" color="bg-indigo-50 border-indigo-200 text-indigo-900" />
                                <PyramidConnector label="Conv. Lead" value={`${data.report.funnel.convLead.toFixed(2)}%`} />
                                <PyramidLevel label="Leads Totais" value={formatNumber(data.report.funnel.leads)} width="w-[70%]" color="bg-purple-50 border-purple-200 text-purple-800" />
                                <PyramidConnector label="Fechamento" value={`${data.report.funnel.convSales.toFixed(2)}%`} />
                                <PyramidLevel label="Vendas Totais" value={formatNumber(data.report.funnel.sales)} width="w-[55%]" color="bg-emerald-100 border-emerald-300 text-emerald-900" />
                            </div>
                        </div>
                    </Card>

                    {/* GRÁFICOS */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="p-6 bg-white rounded-xl border shadow-sm">
                            <div className="flex justify-between items-center mb-6"><h3 className="text-sm font-semibold text-gray-500 uppercase">Crescimento de Receita (Agência)</h3></div>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data.history}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="date" style={{ fontSize: 11, fill: '#64748b' }} tickMargin={10} />
                                        <YAxis style={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `R$${val/1000}k`} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(value: number) => [formatCurrency(value), 'Receita']} />
                                        <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="p-6 bg-white rounded-xl border shadow-sm">
                            <div className="flex justify-between items-center mb-6"><h3 className="text-sm font-semibold text-gray-500 uppercase">Volume de Leads (Agência)</h3></div>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.history}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="date" style={{ fontSize: 11, fill: '#64748b' }} tickMargin={10} />
                                        <YAxis style={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Bar dataKey="leads" fill="#f97316" radius={[4, 4, 0, 0]} barSize={chartGrouping === 'day' ? undefined : 40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* UNIT ECONOMICS MÉDIOS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
                            <h4 className="flex items-center gap-2 font-semibold text-gray-700"><Users className="h-4 w-4" /> Performance Média de Conversão</h4>
                            <MetricRow label="Custo por Lead (CPL Médio)" value={formatCurrency(data.report.funnel.cpl)} highlight />
                            <MetricRow label="Taxa de Lead (Média)" value={formatPercent(data.report.funnel.convLead)} />
                            <MetricRow label="Taxa de Fechamento (Média)" value={formatPercent(data.report.funnel.convSales)} />
                        </div>
                        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
                            <h4 className="flex items-center gap-2 font-semibold text-gray-700"><DollarSign className="h-4 w-4" /> Performance Média Financeira</h4>
                            <MetricRow label="Ticket Médio Geral" value={formatCurrency(data.report.financial.ticket)} />
                            <MetricRow label="CAC Geral (Custo Aquisição)" value={formatCurrency(data.report.financial.cac)} highlight />
                            <MetricRow label="Total Vendas Realizadas" value={formatNumber(data.report.funnel.sales)} />
                        </div>
                    </div>

                </div>
            )}
        </main>
      </div>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---
function KPICard({ title, value, icon, valueColor = "text-gray-900", description }: any) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-start mb-2"><h3 className="text-sm font-medium text-slate-500">{title}</h3><div className="p-2 bg-slate-50 rounded-lg">{icon}</div></div>
        <div className={`text-2xl font-bold ${valueColor} mb-1`}>{value}</div>
        {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
      </div>
    );
}
function PyramidLevel({ label, value, width, color }: any) { return (<div className={`${width} relative group transition-all duration-500`}><div className={`flex justify-between items-center px-4 py-3 rounded-lg border-2 ${color} shadow-sm relative z-10`}><span className="font-bold text-xs uppercase tracking-wider opacity-80">{label}</span><div className="flex items-center gap-2"><span className="font-bold text-lg">{value}</span></div></div></div>)}
function PyramidConnector({ label, value }: any) { return (<div className="h-8 flex items-center justify-center relative w-full"><div className="h-full w-0.5 bg-slate-200 absolute top-0"></div><div className="z-10 bg-white border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-500 shadow-sm flex gap-1"><span>{label}: {value}</span></div></div>)}
function MetricRow({ label, value, highlight }: any) { return (<div className="flex justify-between items-center py-2 border-b border-dashed border-gray-100 last:border-0"><span className="text-sm text-gray-500">{label}</span><span className={`text-sm font-medium ${highlight ? 'text-blue-600 bg-blue-50 px-2 py-0.5 rounded' : 'text-gray-900'}`}>{value}</span></div>); }