'use client';

import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Loader2, TrendingUp, TrendingDown, DollarSign, Users, Target, MousePointer, Wallet, Settings, BarChart3, Filter, Calendar, Edit2, ArrowRight, Calculator, Trash2, AlertTriangle, HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ProjectionSimulator from './ProjectionSimulator'; 

interface DashboardData {
  report: {
    metrics: {
      marketing: { ctr: number; cpc: number; cpm: number };
      conversion: { cpl: number; leadRate: number; closeRate: number; appointmentRate: number };
      financial: { totalCost: number; cac: number; roas: number; roi: number; averageTicket: number; grossProfit: number; netProfit: number };
    };
    raw: { adSpend: number; revenue: number; leads: number; sales: number; clicks: number; impressions: number; marginPercent: number };
    growth: { [key: string]: number };
    niche: string;
  };
  history: Array<{ date: string; shortDate: string; humanDate: string; revenue: number; leads: number }>;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);
const formatPercent = (val: number) => `${val?.toFixed(2)}%`;

const formatDateDisplay = (isoDate: string) => {
    if (!isoDate) return '-';
    const parts = isoDate.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return isoDate;
};

export default function AnalyticsDashboard({ clientId }: { clientId: string }) {
  const [activeTab, setActiveTab] = useState<'report' | 'projection'>('report');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [timeRange, setTimeRange] = useState("30"); 
  const [chartGrouping, setChartGrouping] = useState<'day' | 'week' | 'month'>('day');
  const [marginInput, setMarginInput] = useState<string>(""); 
  const [isSavingMargin, setIsSavingMargin] = useState(false);

  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);

  const getDateRangeParams = (option: string) => {
    if (option === 'custom') return `start=${customStart}&end=${customEnd}`;
    const end = new Date(); 
    const start = new Date();
    start.setDate(end.getDate() - parseInt(option));
    return `start=${start.toISOString().split('T')[0]}&end=${end.toISOString().split('T')[0]}`;
  };

  const fetchData = () => {
    setLoading(true);
    const dateQuery = getDateRangeParams(timeRange);
    fetch(`/api/analytics/report?clientId=${clientId}&${dateQuery}&groupBy=${chartGrouping}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Falha ao carregar');
        return res.json();
      })
      .then((json) => {
        setData(json);
        const backendMargin = json.report.raw.marginPercent ?? 0;
        setMarginInput((backendMargin * 100).toFixed(0));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!clientId) return;
    if (timeRange === 'custom' && (!customStart || !customEnd)) return;
    if (activeTab === 'report') fetchData();
  }, [clientId, timeRange, chartGrouping, customStart, customEnd, activeTab]);

  const handleSaveMargin = async () => {
    setIsSavingMargin(true);
    try {
        const decimalMargin = parseFloat(marginInput) / 100;
        await fetch(`/api/clients/${clientId}/margin`, {
            method: 'POST',
            body: JSON.stringify({ margin: decimalMargin })
        });
        alert("Margem salva!");
        fetchData();
    } catch (error) { alert("Erro ao salvar."); } 
    finally { setIsSavingMargin(false); }
  };

  const handleDeleteDate = async (shortDate: string) => {
      if (!confirm("Tem certeza que deseja apagar os dados deste dia?")) return;
      try {
          await fetch(`/api/analytics/data?clientId=${clientId}&action=single&date=${shortDate}`, { method: 'DELETE' });
          alert("Lançamento excluído.");
          fetchData();
      } catch (error) {
          alert("Erro ao excluir.");
      }
  };

  const handleResetAll = async () => {
      if (!confirm("ATENÇÃO: Isso apagará TODO o histórico.")) return;
      if (!confirm("Tem certeza absoluta?")) return;
      try {
          await fetch(`/api/analytics/data?clientId=${clientId}&action=reset_all`, { method: 'DELETE' });
          alert("Dados zerados.");
          fetchData();
      } catch (error) { alert("Erro ao zerar."); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
         <div className="flex flex-col gap-4 w-full md:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-lg w-fit border border-slate-200">
                <button onClick={() => setActiveTab('report')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'report' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-blue-600'}`}><BarChart3 className="h-4 w-4"/> Relatório</button>
                <button onClick={() => setActiveTab('projection')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'projection' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-blue-600'}`}><Calculator className="h-4 w-4"/> Simulação</button>
            </div>
            {activeTab === 'report' && (
                <div className="flex flex-col md:flex-row items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 w-full md:w-auto">
                        <Calendar className="h-4 w-4 text-slate-600"/>
                        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="bg-transparent font-medium text-sm focus:outline-none cursor-pointer w-full">
                            <option value="7">Últimos 7 dias</option>
                            <option value="15">Últimos 15 dias</option>
                            <option value="30">Últimos 30 dias</option>
                            <option value="90">Últimos 3 Meses</option>
                            <option value="custom">Personalizado</option>
                        </select>
                    </div>
                    {timeRange === 'custom' && (
                        <div className="flex items-center gap-2 animate-in fade-in">
                            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="px-2 py-1.5 border rounded text-xs" />
                            <span className="text-xs">até</span>
                            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="px-2 py-1.5 border rounded text-xs" />
                        </div>
                    )}
                </div>
            )}
         </div>
         {activeTab === 'report' && (
            <div className="flex gap-4 items-center self-end md:self-center">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {(['day', 'week', 'month'] as const).map((mode) => (
                        <button key={mode} onClick={() => setChartGrouping(mode)} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${chartGrouping === mode ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{mode === 'day' ? 'Diário' : mode === 'week' ? 'Semanal' : 'Mensal'}</button>
                    ))}
                </div>
                <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <Settings className="h-4 w-4 text-slate-400" /><span className="text-xs font-medium text-slate-500">Margem:</span>
                    <div className="relative w-16"><input type="number" value={marginInput} onChange={(e) => setMarginInput(e.target.value)} className="w-full bg-transparent text-sm font-bold text-slate-900 focus:outline-none text-right pr-3" /><span className="absolute right-0 top-0 text-sm font-bold text-slate-400">%</span></div>
                    <button onClick={handleSaveMargin} disabled={isSavingMargin} className="text-xs bg-slate-900 text-white px-2 py-1 rounded">OK</button>
                </div>
                <button onClick={handleResetAll} className="p-2 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-all" title="Zerar"><Trash2 className="h-4 w-4" /></button>
            </div>
         )}
      </div>

      {activeTab === 'projection' ? (
          <ProjectionSimulator />
      ) : (
          (!data || loading) ? (
             <div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
          ) : (
            <>
                {(() => {
                    const { metrics, raw, growth } = data.report;
                    const currentMargin = marginInput ? parseFloat(marginInput) / 100 : 0;
                    const grossProfit = raw.revenue * currentMargin;
                    const netProfitReal = grossProfit - metrics.financial.totalCost;
                    const roiX = metrics.financial.totalCost > 0 ? (netProfitReal / metrics.financial.totalCost) : 0;
                    const isPositive = netProfitReal >= 0;

                    return (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                <KPICard title="Receita" value={formatCurrency(raw.revenue)} growth={growth.revenue} icon={<TrendingUp className="h-4 w-4 text-green-600" />} />
                                <KPICard title="Investimento" value={formatCurrency(metrics.financial.totalCost)} growth={growth.spend} invertGrowth icon={<Wallet className="h-4 w-4 text-orange-600" />} description="Mídia + Fee Manual" />
                                <KPICard title="Lucro Líquido" value={formatCurrency(netProfitReal)} icon={<DollarSign className={`h-4 w-4 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />} valueColor={isPositive ? 'text-green-700' : 'text-red-700'} />
                                <KPICard title="ROAS" value={`${metrics.financial.roas.toFixed(2)}x`} growth={growth.roas} icon={<BarChart3 className="h-4 w-4 text-blue-600" />} valueColor="text-blue-700" />
                                <KPICard title="ROI Real (x)" value={`${roiX.toFixed(2)}x`} growth={growth.roi} icon={<Target className="h-4 w-4 text-purple-600" />} valueColor={roiX > 0 ? 'text-purple-700' : 'text-red-700'} />
                            </div>

                            {/* --- FUNIL RICO RESTAURADO --- */}
                            <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
                                <div className="p-6">
                                    <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2"><Filter className="h-4 w-4"/> Funil de Conversão</h3>
                                    <div className="flex flex-col items-center justify-center space-y-1 max-w-2xl mx-auto">
                                        <PyramidLevel label="Impressões" value={formatNumber(raw.impressions)} width="w-[100%]" color="bg-blue-50 border-blue-200 text-blue-800" growth={growth.impressions} />
                                        
                                        {/* CONECTOR COM TAXA DE CONVERSÃO (CTR) */}
                                        <PyramidConnector label="CTR" value={`${metrics.marketing.ctr.toFixed(2)}%`} />
                                        
                                        <PyramidLevel label="Cliques" value={formatNumber(raw.clicks)} width="w-[85%]" color="bg-indigo-50 border-indigo-200 text-indigo-900" growth={growth.clicks} />
                                        
                                        {/* CONECTOR COM TAXA DE CONVERSÃO (LEAD RATE) */}
                                        <PyramidConnector label="Conv. Lead" value={`${metrics.conversion.leadRate.toFixed(2)}%`} />
                                        
                                        <PyramidLevel label="Leads (MQL)" value={formatNumber(raw.leads)} width="w-[70%]" color="bg-purple-50 border-purple-200 text-purple-800" growth={growth.leads} />
                                        
                                        {/* CONECTOR COM TAXA DE CONVERSÃO (CLOSE RATE) */}
                                        <PyramidConnector label="Fechamento" value={`${metrics.conversion.closeRate.toFixed(2)}%`} />
                                        
                                        <PyramidLevel label="Vendas (Deals)" value={formatNumber(raw.sales)} width="w-[55%]" color="bg-emerald-100 border-emerald-300 text-emerald-900" growth={growth.sales} />
                                    </div>
                                </div>
                            </Card>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
                                <div className="p-6 bg-white rounded-xl border shadow-sm h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%"><LineChart data={data.history}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="date" style={{ fontSize: 11, fill: '#64748b' }} tickMargin={10} tickFormatter={formatDateDisplay} /><YAxis style={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `R$${val/1000}k`} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(value: number) => [formatCurrency(value), 'Receita']} /><Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer>
                                </div>
                                <div className="p-6 bg-white rounded-xl border shadow-sm h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%"><BarChart data={data.history}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="date" style={{ fontSize: 11, fill: '#64748b' }} tickMargin={10} tickFormatter={formatDateDisplay} /><YAxis style={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} /><Bar dataKey="leads" fill="#f97316" radius={[4, 4, 0, 0]} barSize={chartGrouping === 'day' ? undefined : 40} /></BarChart></ResponsiveContainer>
                                </div>
                            </div>

                            {/* --- TABELAS METRIFICADAS RESTAURADAS --- */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                                <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
                                <h4 className="flex items-center gap-2 font-semibold text-gray-700"><MousePointer className="h-4 w-4" /> Tráfego</h4>
                                <MetricRow label="Impressões" value={formatNumber(raw.impressions)} growth={growth.impressions} />
                                <MetricRow label="Cliques" value={formatNumber(raw.clicks)} growth={growth.clicks} />
                                <MetricRow label="CTR" value={formatPercent(metrics.marketing.ctr)} growth={growth.ctr} />
                                <MetricRow label="CPC" value={formatCurrency(metrics.marketing.cpc)} growth={growth.cpc} invertGrowth />
                                </div>

                                <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
                                <h4 className="flex items-center gap-2 font-semibold text-gray-700"><Users className="h-4 w-4" /> Conversão</h4>
                                <MetricRow label="Leads Gerados" value={formatNumber(raw.leads)} growth={growth.leads} />
                                <MetricRow label="Taxa de Lead" value={formatPercent(metrics.conversion.leadRate)} growth={growth.leadRate} highlight />
                                <MetricRow label="Custo/Lead (CPL)" value={formatCurrency(metrics.conversion.cpl)} growth={growth.cpl} highlight invertGrowth />
                                </div>

                                <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
                                <h4 className="flex items-center gap-2 font-semibold text-gray-700"><DollarSign className="h-4 w-4" /> Vendas</h4>
                                <MetricRow label="Total Vendas" value={formatNumber(raw.sales)} growth={growth.sales} />
                                <MetricRow label="Taxa de Fechamento" value={formatPercent(metrics.conversion.closeRate)} growth={growth.closeRate} />
                                <MetricRow label="Ticket Médio" value={formatCurrency(metrics.financial.averageTicket)} growth={growth.ticket} />
                                <MetricRow label="CAC Real" value={formatCurrency(metrics.financial.cac)} growth={growth.cac} highlight invertGrowth />
                                </div>
                            </div>

                            <Card className="mt-8 bg-slate-50 border-slate-200">
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-slate-700">Histórico de Lançamentos</h3>
                                        <Link href={`/clients/${clientId}/analytics/add`}>
                                            <Button variant="outline" size="sm">+ Novo Lançamento</Button>
                                        </Link>
                                    </div>
                                    <div className="space-y-2">
                                        {data.history && data.history.length > 0 ? (
                                        data.history.slice().reverse().map((item, idx) => (
                                            <div key={idx} className="bg-white p-3 rounded border border-slate-200 hover:border-blue-400 flex justify-between items-center transition-colors group">
                                                <Link href={`/clients/${clientId}/analytics/add?date=${item.shortDate}`} className="flex items-center gap-3 flex-1 cursor-pointer">
                                                        <div className="p-2 bg-slate-100 rounded group-hover:bg-blue-50 text-slate-500 group-hover:text-blue-600"><Edit2 className="h-4 w-4"/></div>
                                                        <div>
                                                            <p className="font-semibold text-slate-800">{formatDateDisplay(item.date)}</p>
                                                            <p className="text-xs text-slate-400">Clique para editar</p>
                                                        </div>
                                                </Link>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right mr-2"><p className="font-medium text-slate-900">{formatCurrency(item.revenue)}</p><p className="text-xs text-slate-500">{item.leads} Leads</p></div>
                                                    <button onClick={() => handleDeleteDate(item.shortDate)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="h-4 w-4" /></button>
                                                </div>
                                            </div>
                                        ))
                                        ) : (<div className="text-center p-4 text-slate-400">Nenhum histórico encontrado para este período.</div>)}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )
                })()}
             </>
          )
      )}
    </div>
  );
}

// --- HELPERS VISUAIS (PÍLULAS, CORES E SETAS) ---

function KPICard({ title, value, growth, invertGrowth, icon, valueColor = "text-gray-900", description }: any) {
    const isGrowthPositive = growth >= 0; const isGood = invertGrowth ? !isGrowthPositive : isGrowthPositive;
    return (<div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative"><div className="flex justify-between items-start mb-2"><h3 className="text-sm font-medium text-slate-500">{title}</h3><div className="p-2 bg-slate-50 rounded-lg">{icon}</div></div><div className={`text-2xl font-bold ${valueColor} mb-1`}>{value}</div>{growth !== undefined && (<div className={`flex items-center text-xs font-medium ${isGood ? 'text-green-600' : 'text-red-600'}`}>{isGrowthPositive ? <TrendingUp className="h-3 w-3 mr-1"/> : <TrendingDown className="h-3 w-3 mr-1"/>}{Math.abs(growth).toFixed(1)}% </div>)}{description && <p className="text-xs text-slate-400 mt-1">{description}</p>}</div>);
}

function PyramidLevel({ label, value, width, color, growth }: any) { 
    return (
        <div className={`${width} relative group transition-all duration-500`}>
            <div className={`flex justify-between items-center px-4 py-3 rounded-lg border-2 ${color} shadow-sm relative z-10`}>
                <span className="font-bold text-xs uppercase tracking-wider opacity-80">{label}</span>
                <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{value}</span>
                    {growth !== undefined && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${growth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {growth >= 0 ? '+' : ''}{growth.toFixed(0)}%
                        </span>
                    )}
                </div>
            </div>
        </div>
    ) 
}

// RESTAURAÇÃO DA PÍLULA CENTRAL (CTR, Taxa de Lead, etc)
function PyramidConnector({ label, value }: any) { 
    return (
        <div className="h-8 flex items-center justify-center relative w-full">
            <div className="h-full w-0.5 bg-slate-200 absolute top-0"></div>
            <div className="z-10 bg-white border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-500 shadow-sm flex gap-1">
                <span>{label}: {value}</span>
                <HelpCircle className="h-3 w-3 text-slate-300" />
            </div>
        </div>
    ) 
}

// RESTAURAÇÃO DAS LINHAS DE MÉTRICAS COM CRESCIMENTO
function MetricRow({ label, value, highlight, growth, invertGrowth }: any) { 
    const isGood = invertGrowth ? growth < 0 : growth >= 0; 
    return (
        <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-100 last:border-0">
            <span className="text-sm text-gray-500">{label}</span>
            <div className="flex items-center gap-2">
                {growth !== undefined && (
                    <span className={`text-[10px] ${isGood ? 'text-green-600' : 'text-red-600'}`}>
                        {growth > 0 ? '+' : ''}{growth.toFixed(0)}%
                    </span>
                )}
                <span className={`text-sm font-medium ${highlight ? 'text-blue-600 bg-blue-50 px-2 py-0.5 rounded' : 'text-gray-900'}`}>{value}</span>
            </div>
        </div>
    ); 
}