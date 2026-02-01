'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Save } from 'lucide-react';

function ManualEntryContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawDate = searchParams.get('date');
  
  // GARANTIA DE DATA LIMPA
  const editDate = rawDate ? (rawDate.includes('T') ? rawDate.split('T')[0] : rawDate) : null;

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  
  const [formData, setFormData] = useState({
    date: editDate || new Date().toISOString().split('T')[0],
    adSpend: 0,
    agencyFee: 0, 
    impressions: 0,
    clicks: 0,
    leads: 0,
    appointments: 0,
    sales: 0,
    revenue: 0
  });

  useEffect(() => {
    params.then(p => {
        setClientId(p.id);
        if (editDate) fetchExistingData(p.id, editDate);
    });
  }, [params, editDate]);

  const fetchExistingData = async (cId: string, date: string) => {
    setFetchingData(true);
    try {
        const res = await fetch(`/api/analytics/report?clientId=${cId}&start=${date}&end=${date}&groupBy=day`);
        const data = await res.json();
        
        if (data && data.report && data.report.raw) {
            const raw = data.report.raw;
            setFormData({
                date: date,
                adSpend: raw.adSpend || 0,
                agencyFee: raw.agencyFee || 0, // Fee Manual
                impressions: raw.impressions || 0,
                clicks: raw.clicks || 0,
                leads: raw.leads || 0,
                appointments: raw.appointments || 0,
                sales: raw.sales || 0,
                revenue: raw.revenue || 0
            });
        }
    } catch (error) {
        console.error(error);
        alert("Erro ao carregar dados originais.");
    } finally {
        setFetchingData(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const safeDate = `${formData.date}T12:00:00.000Z`;

      const res = await fetch('/api/analytics/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          date: safeDate, 
          costs: {
            adSpend: Number(formData.adSpend),
            agencyFee: Number(formData.agencyFee)
          },
          metrics: {
            impressions: Number(formData.impressions),
            clicks: Number(formData.clicks),
            leads: Number(formData.leads),
            appointments: Number(formData.appointments),
            sales: Number(formData.sales),
            revenue: Number(formData.revenue)
          }
        })
      });

      if (res.ok) {
        alert(editDate ? "Dados corrigidos com sucesso!" : "Lançamento salvo com sucesso!");
        router.push(`/clients/${clientId}/analytics`); 
        router.refresh(); 
      } else {
        alert("Erro ao salvar.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex justify-center items-start pt-10">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <div>
              <h1 className="text-2xl font-bold text-slate-900">
                  {editDate ? 'Editar Lançamento' : 'Novo Lançamento Manual'}
              </h1>
              <p className="text-sm text-slate-500">
                  {editDate ? `Editando dados do dia: ${new Date(editDate + 'T12:00:00').toLocaleDateString('pt-BR')}` : 'Preencha os dados do dia.'}
              </p>
          </div>
          <Link href={`/clients/${clientId}/analytics`} className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4"/> Voltar
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Data de Referência</label>
            <input 
              type="date" 
              name="date"
              value={formData.date} 
              onChange={handleChange}
              disabled={!!editDate} 
              className={`w-full p-2 border border-slate-300 rounded-md ${editDate ? 'bg-slate-200 cursor-not-allowed text-slate-500' : 'bg-white'}`}
              required 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><span className="w-2 h-6 bg-orange-500 rounded-full"></span> 💰 Investimento</h3>
              <div className="space-y-3">
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Mídia Paga (Ads)</label>
                    <input type="number" step="0.01" name="adSpend" value={formData.adSpend} onChange={handleChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0,00" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Fee Agência (Manual)</label>
                    <input type="number" step="0.01" name="agencyFee" value={formData.agencyFee} onChange={handleChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0,00" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><span className="w-2 h-6 bg-blue-600 rounded-full"></span> 🚀 Funil de Vendas</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Impressões</label><input type="number" name="impressions" value={formData.impressions} onChange={handleChange} className="w-full p-2 border rounded" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Cliques</label><input type="number" name="clicks" value={formData.clicks} onChange={handleChange} className="w-full p-2 border rounded" /></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Leads (Cadastros)</label><input type="number" name="leads" value={formData.leads} onChange={handleChange} className="w-full p-2 border rounded border-purple-200 bg-purple-50" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Vendas / Fechamentos</label><input type="number" name="sales" value={formData.sales} onChange={handleChange} className="w-full p-2 border rounded border-green-200 bg-green-50" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Receita Total (R$)</label><input type="number" step="0.01" name="revenue" value={formData.revenue} onChange={handleChange} className="w-full p-2 border rounded bg-slate-50 font-semibold" placeholder="R$ 0,00" /></div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-4">
            {loading ? <Loader2 className="animate-spin"/> : <Save className="h-5 w-5"/>}
            {editDate ? 'Salvar Correções' : 'Salvar Lançamento'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ManualEntryPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Carregando...</div>}>
            <ManualEntryContent params={params} />
        </Suspense>
    )
}