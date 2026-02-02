'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, Filter, TrendingUp, TrendingDown, Save, Edit2, Download, ChevronRight, ChevronDown, AlertCircle, Ban, Wallet, Coins
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/use-permission';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const formatCurrency = (val: number, currency: string = 'BRL') => {
  if (currency === 'N') {
    return new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2 }).format(val) + ' N';
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const getPercent = (part: number, total: number) => total === 0 ? '0.0%' : `${((part / total) * 100).toFixed(1)}%`;

interface DetailGroup {
  [category: string]: number;
}

export default function DrePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { can } = usePermission();
  const [loading, setLoading] = useState(true);
  
  const [selectedCurrency, setSelectedCurrency] = useState<'BRL' | 'N'>('BRL');

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedClient, setSelectedClient] = useState('all');
  
  const [taxRate, setTaxRate] = useState(6.00);
  const [isEditingTax, setIsEditingTax] = useState(false);
  
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [newInitialBalance, setNewInitialBalance] = useState('');
  const [isSubmittingBalance, setIsSubmittingBalance] = useState(false);

  const [dre, setDre] = useState({
    previousBalance: 0,
    grossRevenue: 0,
    grossRevenueDetails: {} as DetailGroup,
    taxes: 0,
    netRevenue: 0,
    variableCosts: 0,
    variableCostsDetails: {} as DetailGroup,
    contributionMargin: 0,
    fixedCosts: 0,
    fixedCostsDetails: {} as DetailGroup,
    financialResult: 0,
    financialResultDetails: {} as DetailGroup,
    netProfit: 0,
    finalBalance: 0,
    marginPercent: 0,
    ebitda: 0
  });

  const fetchInitialData = async () => {
    try {
      const monthKey = `${selectedMonth}-${selectedYear}`;
      const { data: taxData } = await supabase.from('tax_settings').select('rate').eq('month_key', monthKey).single();
      if (taxData) setTaxRate(taxData.rate);
    } catch (error) {
      console.error("Erro ao buscar dados iniciais", error);
    }
  };

  const calculateDre = async () => {
    setLoading(true);
    try {
      const start = new Date(Number(selectedYear), Number(selectedMonth) - 1, 1);
      const end = new Date(Number(selectedYear), Number(selectedMonth), 0, 23, 59, 59);

      // BUSCAR SALDO INICIAL DEFINIDO PELO USUÁRIO PARA ESTE MÊS
      // Se existir, ele substitui qualquer cálculo histórico.
      const { data: manualStartData } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('currency', selectedCurrency)
        .eq('description', `Saldo Inicial Definido (${selectedCurrency})`)
        .gte('date', start.toISOString())
        .lte('date', end.toISOString())
        .maybeSingle();

      let previousBalance = 0;
      let useManualStart = false;

      if (manualStartData) {
          // LÓGICA DO USUÁRIO: Se definiu manualmente, esse é o valor que começa o mês.
          previousBalance = Number(manualStartData.amount);
          useManualStart = true;
      } else {
          // Se não definiu, segue o fluxo normal (Soma tudo até o dia 1)
          const { data: prevData } = await supabase
            .from('transactions')
            .select('amount, type, description')
            .eq('currency', selectedCurrency)
            .lt('date', start.toISOString())
            .or('status.eq.done,status.eq.paid');

          if (prevData) {
            prevData.forEach(t => {
                // Ignora "Saldo Inicial" de meses passados na soma acumulada para não duplicar se a lógica mudar
                if (t.description?.includes('Saldo Inicial Definido')) return;

                const val = Number(t.amount);
                if (t.type === 'income') previousBalance += val;
                else previousBalance -= val;
            });
          }
      }

      // 2. DADOS DO MÊS ATUAL
      let query = supabase
        .from('transactions')
        .select('*, clients(name, company)')
        .eq('currency', selectedCurrency)
        .gte('date', start.toISOString())
        .lte('date', end.toISOString());

      if (user?.role !== 'admin') {
         query = query.neq('category', 'Colaborador');
      }

      const { data: transactions, error } = await query;
      if (error) throw error;
      const txs = (transactions as any[]) || [];

      let grossRevenue = 0;
      let variableCosts = 0;
      let fixedCosts = 0;
      let financialResult = 0;
      let taxesValues = 0; 

      const grossRevenueDetails: DetailGroup = {};
      const variableCostsDetails: DetailGroup = {};
      const fixedCostsDetails: DetailGroup = {};
      const financialResultDetails: DetailGroup = {};

      const addToGroup = (group: DetailGroup, key: string, value: number) => {
        if (!group[key]) group[key] = 0;
        group[key] += value;
      };

      txs.forEach(t => {
          if (selectedClient !== 'all' && t.client_id !== selectedClient) return;
          const isPaid = t.status === 'done' || t.status === 'paid';
          if (!isPaid) return; 

          const description = (t.description || '').trim();
          
          // IGNORAR O PRÓPRIO SALDO INICIAL NO CÁLCULO DE RECEITA/DESPESA DO MÊS
          if (description === `Saldo Inicial Definido (${selectedCurrency})`) return;

          const val = Math.abs(Number(t.amount)); 
          const categoryName = t.category || 'Outros';
          const catLower = categoryName.toLowerCase();
          const classLower = (t.classification || '').toLowerCase();
          const typeLower = (t.type || '').toLowerCase();

          if (typeLower === 'income') {
              grossRevenue += val; 
              let incomeKey = t.description;
              if (incomeKey.startsWith('Contrato:')) {
                  const clientName = t.clients?.company || t.clients?.name || 'Cliente';
                  incomeKey = `Contrato: ${clientName}`;
              }
              addToGroup(grossRevenueDetails, incomeKey, val);
          } else if (typeLower === 'expense') {
              if (catLower.includes('imposto')) {
                  taxesValues += val; 
                  fixedCosts += val; 
                  addToGroup(fixedCostsDetails, categoryName, val);
              } 
              else if (['juros', 'multa', 'tarifa', 'bancario', 'bancário'].some(term => catLower.includes(term))) {
                  financialResult += val;
                  addToGroup(financialResultDetails, categoryName, val);
              } 
              else if (classLower.includes('var')) {
                  variableCosts += val;
                  addToGroup(variableCostsDetails, categoryName, val);
              } 
              else {
                  fixedCosts += val;
                  addToGroup(fixedCostsDetails, categoryName, val);
              }
          }
      });

      // Provisão de Imposto (Apenas visual)
      let calculatedTax = 0;
      if (selectedCurrency === 'BRL') {
        if (taxRate > 0) {
            calculatedTax = grossRevenue * (taxRate / 100);
        }
      }
      
      const netRevenue = grossRevenue - calculatedTax;
      const contributionMargin = netRevenue - variableCosts;
      const ebitda = contributionMargin - fixedCosts;
      const netProfit = ebitda - financialResult;

      // CÁLCULO FINAL DE CAIXA
      // Lógica do Usuário: Saldo Final = Saldo Inicial Definido (ou anterior) + Receitas - Despesas
      const totalOutflows = variableCosts + fixedCosts + financialResult; // fixedCosts já inclui impostos pagos
      const finalBalance = previousBalance + grossRevenue - totalOutflows;

      let marginPercent = 0;
      if (grossRevenue > 0) marginPercent = (netProfit / grossRevenue) * 100;

      setDre({
        previousBalance, // Mostra o valor que você definiu como inicial
        grossRevenue, grossRevenueDetails,
        taxes: calculatedTax,
        netRevenue,
        variableCosts, variableCostsDetails,
        contributionMargin,
        fixedCosts, fixedCostsDetails,
        ebitda, 
        financialResult, financialResultDetails,
        netProfit,
        finalBalance, // Atualiza dinamicamente conforme despesas entram
        marginPercent
      });
    } catch (error) {
      console.error('Erro DRE:', error);
      toast({ title: "Erro", description: "Falha ao calcular DRE." });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBalance = async () => {
    if (!newInitialBalance) return;
    setIsSubmittingBalance(true);
    try {
      const targetValue = parseFloat(newInitialBalance.replace(',', '.'));
      
      // Data: Dia 01 do mês selecionado
      const startOfMonth = new Date(Number(selectedYear), Number(selectedMonth) - 1, 1).toISOString();
      const endOfMonth = new Date(Number(selectedYear), Number(selectedMonth), 0).toISOString();

      // 1. Remove qualquer definição anterior para este mês
      await supabase.from('transactions')
        .delete()
        .eq('description', `Saldo Inicial Definido (${selectedCurrency})`)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      // 2. Insere o valor exato como "Saldo Inicial Definido"
      // Categoria 'Ajuste' para facilitar filtragem no Financeiro
      const { error } = await supabase.from('transactions').insert([{
        description: `Saldo Inicial Definido (${selectedCurrency})`,
        amount: targetValue,
        type: 'income', // Entra como crédito para compor o saldo
        currency: selectedCurrency, 
        category: 'Ajuste', 
        classification: 'fixo',
        status: 'done',
        date: startOfMonth, // Salva no dia 1
        notes: 'Valor definido manualmente pelo usuário como ponto de partida'
      }]);

      if (error) throw error;
      
      toast({ title: "Saldo Definido", description: `Mês inicia com ${formatCurrency(targetValue, selectedCurrency)}.` });
      setIsBalanceModalOpen(false);
      setNewInitialBalance('');
      calculateDre();
    } catch (error: any) {
      toast({ title: "Erro ao ajustar", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmittingBalance(false);
    }
  };

  const saveTaxRate = async () => {
    const monthKey = `${selectedMonth}-${selectedYear}`;
    try {
        await supabase.from('tax_settings').upsert({ month_key: monthKey, rate: taxRate });
        toast({ title: "Salvo", description: "Imposto atualizado." });
        setIsEditingTax(false);
        calculateDre();
    } catch (error) {
        toast({ title: "Erro", description: "Falha ao salvar.", variant: "destructive" });
    }
  }

  const fetchTaxRateForMonth = async () => {
    try {
      const monthKey = `${selectedMonth}-${selectedYear}`;
      const { data: taxData } = await supabase
        .from('tax_settings')
        .select('rate')
        .eq('month_key', monthKey)
        .maybeSingle();

      if (taxData) {
        setTaxRate(taxData.rate);
      } else {
        setTaxRate(0); 
      }
    } catch (error) {
      console.error("Erro ao buscar taxa", error);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
        fetchTaxRateForMonth().then(() => {
             calculateDre();
        });
    }
  }, [selectedMonth, selectedYear, selectedClient, user, authLoading, selectedCurrency]);

  if (authLoading) {
      return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 items-center justify-center">
            <Loader2 className="animate-spin h-10 w-10 text-blue-600"/>
        </div>
      );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
             <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">DRE Gerencial</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Gestão de caixa e resultado em {selectedCurrency === 'BRL' ? 'Reais' : 'Moeda N'}</p>
            </div>
            <div className="flex flex-wrap gap-2 items-center bg-white dark:bg-slate-900 p-2 rounded-lg border shadow-sm">
                
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-md mr-2">
                    <button 
                      onClick={() => setSelectedCurrency('BRL')}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all ${selectedCurrency === 'BRL' ? 'bg-white dark:bg-slate-700 shadow-sm text-black dark:text-white' : 'text-slate-500'}`}
                    >R$</button>
                    <button 
                      onClick={() => setSelectedCurrency('N')}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all ${selectedCurrency === 'N' ? 'bg-white dark:bg-slate-700 shadow-sm text-black dark:text-white' : 'text-slate-500'}`}
                    >Moeda N</button>
                </div>

                <Filter className="h-4 w-4 text-slate-500 ml-2" />
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-sm font-medium focus:outline-none border-r pr-2 dark:text-white dark:bg-slate-900 cursor-pointer">
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{new Date(0, m-1).toLocaleString('pt-BR', {month: 'long'})}</option>
                    ))}
                </select>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent text-sm font-medium focus:outline-none border-r pr-2 dark:text-white dark:bg-slate-900 cursor-pointer">
                    <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option><option value="2027">2027</option>
                </select>
                <Button variant="outline" size="sm" onClick={() => setIsBalanceModalOpen(true)} className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                    <Wallet className="h-3 w-3" /> Ajustar Caixa {selectedCurrency}
                </Button>
                <button className="bg-slate-900 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-slate-800 ml-2">
                    <Download className="h-3 w-3 inline mr-1" /> PDF
                </button>
            </div>
          </div>

          {loading ? (
             <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-blue-600"/></div>
          ) : (
            <div className="space-y-6">
              
              <div className={`p-6 rounded-xl shadow-lg flex justify-between items-center relative overflow-hidden transition-colors ${dre.finalBalance >= 0 ? 'bg-slate-900 text-white' : 'bg-red-900 text-white'}`}>
                    <div className="relative z-10">
                        <p className="text-sm font-medium text-slate-300 mb-1">Saldo Final em Caixa ({selectedCurrency})</p>
                        <h2 className="text-4xl font-bold">{formatCurrency(dre.finalBalance, selectedCurrency)}</h2>
                        <div className="flex items-center gap-4 mt-2">
                            <span className={`text-xs px-2 py-1 rounded ${dre.netProfit >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-200'}`}>
                                Resultado Líquido: {formatCurrency(dre.netProfit, selectedCurrency)}
                            </span>
                            
                            {selectedCurrency === 'BRL' && (
                              <div className="flex items-center gap-2 bg-white/10 px-2 py-1 rounded">
                                  <span className="text-xs text-slate-300">Aliquota Imposto (Mês):</span>
                                  {isEditingTax ? (
                                      <div className="flex items-center gap-1">
                                          <input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className="w-12 px-1 py-0.5 text-xs text-black rounded" autoFocus />
                                          <button onClick={saveTaxRate}><Save className="h-3 w-3 text-green-400"/></button>
                                      </div>
                                  ) : (
                                      <div className="flex items-center gap-1 cursor-pointer hover:text-white" onClick={() => setIsEditingTax(true)}>
                                          <span className="text-xs font-bold">{taxRate}%</span>
                                          <Edit2 className="h-3 w-3 text-slate-400"/>
                                      </div>
                                  )}
                              </div>
                            )}
                        </div>
                    </div>
                    {dre.finalBalance >= 0 ? <TrendingUp className="h-16 w-16 text-white/10 absolute right-4 -bottom-2" /> : <TrendingDown className="h-16 w-16 text-white/10 absolute right-4 -bottom-2" />}
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                 <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 grid grid-cols-12 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    <div className="col-span-8">Descrição</div>
                    <div className="col-span-2 text-right">Valor</div>
                    <div className="col-span-2 text-right text-xs">% RB</div>
                 </div>
                 
                 <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    <div className="p-3 grid grid-cols-12 items-center bg-blue-50/20 dark:bg-blue-900/10 italic font-semibold">
                        <div className="col-span-8 pl-4 text-blue-700 dark:text-blue-300">Saldo de Abertura ({selectedCurrency})</div>
                        <div className="col-span-2 text-right text-blue-700 dark:text-blue-300">{formatCurrency(dre.previousBalance, selectedCurrency)}</div>
                        <div className="col-span-2 text-right text-slate-400">-</div>
                    </div>

                    <ExpandableDRERow label="(+) Receita Operacional Bruta" value={dre.grossRevenue} details={dre.grossRevenueDetails} totalRevenue={dre.grossRevenue} type="positive" bold currency={selectedCurrency} />

                    {selectedCurrency === 'BRL' && (
                      <div className="p-3 grid grid-cols-12 items-center hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <div className="col-span-8 pl-10 text-slate-600 dark:text-slate-400">(-) Impostos Prováveis (Estimado {taxRate}%) - Provisão</div>
                          <div className="col-span-2 text-right text-red-500 font-medium">{formatCurrency(dre.taxes, selectedCurrency)}</div>
                          <div className="col-span-2 text-right text-slate-400">{getPercent(dre.taxes, dre.grossRevenue)}</div>
                      </div>
                    )}

                    <div className="p-3 grid grid-cols-12 items-center bg-blue-50/50 dark:bg-blue-900/10 font-semibold border-y border-blue-100 dark:border-blue-900/30">
                        <div className="col-span-8 pl-4 text-blue-800 dark:text-blue-300">(=) Receita Líquida</div>
                        <div className="col-span-2 text-right text-blue-800 dark:text-blue-300">{formatCurrency(dre.netRevenue, selectedCurrency)}</div>
                        <div className="col-span-2 text-right text-blue-400 text-xs">{getPercent(dre.netRevenue, dre.grossRevenue)}</div>
                    </div>

                    <ExpandableDRERow label="(-) Custos Variáveis" value={dre.variableCosts} details={dre.variableCostsDetails} totalRevenue={dre.grossRevenue} type="negative" currency={selectedCurrency} />

                    <div className="p-3 grid grid-cols-12 items-center bg-yellow-50/50 dark:bg-yellow-900/10 font-semibold border-y border-yellow-100 dark:border-yellow-900/30">
                        <div className="col-span-8 pl-4 text-yellow-800 dark:text-yellow-400">(=) Margem de Contribuição</div>
                        <div className="col-span-2 text-right text-yellow-800 dark:text-yellow-400">{formatCurrency(dre.contributionMargin, selectedCurrency)}</div>
                        <div className="col-span-2 text-right text-yellow-600 dark:text-yellow-600 text-xs">{getPercent(dre.contributionMargin, dre.grossRevenue)}</div>
                    </div>

                    <ExpandableDRERow label="(-) Custos Fixos" value={dre.fixedCosts} details={dre.fixedCostsDetails} totalRevenue={dre.grossRevenue} type="negative" currency={selectedCurrency} />

                    <div className="p-3 grid grid-cols-12 items-center bg-slate-100 dark:bg-slate-800 font-semibold">
                        <div className="col-span-8 pl-4 text-slate-700 dark:text-slate-300">(=) Resultado Operacional (EBITDA)</div>
                        <div className="col-span-2 text-right text-slate-800 dark:text-white">{formatCurrency(dre.ebitda, selectedCurrency)}</div>
                        <div className="col-span-2 text-right text-slate-500 text-xs">{getPercent(dre.ebitda, dre.grossRevenue)}</div>
                    </div>

                    <ExpandableDRERow label="(-) Resultado Financeiro" value={dre.financialResult} details={dre.financialResultDetails} totalRevenue={dre.grossRevenue} type="negative" currency={selectedCurrency} />

                    <div className={`p-4 grid grid-cols-12 items-center font-bold text-lg border-t-2 ${dre.netProfit >= 0 ? 'border-green-500 bg-green-50 dark:bg-green-900/10 text-green-700' : 'border-red-500 bg-red-50 dark:bg-red-900/10 text-red-700'}`}>
                        <div className="col-span-8">(=) Resultado Líquido Mensal</div>
                        <div className="col-span-2 text-right">{formatCurrency(dre.netProfit, selectedCurrency)}</div>
                        <div className="col-span-2 text-right text-sm">{getPercent(dre.netProfit, dre.grossRevenue)}</div>
                    </div>

                    <div className="p-6 grid grid-cols-12 items-center bg-slate-900 dark:bg-white font-black text-white dark:text-slate-900 text-xl shadow-inner">
                        <div className="col-span-8">SALDO FINAL EM CAIXA (Soma Total {selectedCurrency})</div>
                        <div className="col-span-4 text-right">{formatCurrency(dre.finalBalance, selectedCurrency)}</div>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {isBalanceModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-6 border shadow-2xl">
              <h2 className="text-xl font-bold mb-4 dark:text-white">Ajustar Saldo {selectedCurrency}</h2>
              <p className="text-sm text-slate-500 mb-4">
                Digite o valor que você tinha em caixa no <strong>INÍCIO</strong> deste mês (ou que você tem agora e quer considerar como ponto de partida). 
              </p>
              <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-400">Valor de Abertura ({selectedCurrency})</label>
                    <Input placeholder="0,00" value={newInitialBalance} onChange={e => setNewInitialBalance(e.target.value)} className="mt-1" />
                  </div>
                  <div className="flex gap-2">
                      <Button variant="ghost" className="flex-1" onClick={() => setIsBalanceModalOpen(false)}>Cancelar</Button>
                      <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleUpdateBalance} disabled={isSubmittingBalance}>
                          {isSubmittingBalance ? <Loader2 className="animate-spin h-4 w-4" /> : 'Confirmar Saldo'}
                      </Button>
                  </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function ExpandableDRERow({ label, value, details, totalRevenue, type, bold = false, currency = 'BRL' }: any) {
    const [expanded, setExpanded] = useState(false);
    const hasDetails = details && Object.keys(details).length > 0;
    const getColor = () => {
        if (type === 'positive') return 'text-green-600 dark:text-green-400';
        if (type === 'negative') return 'text-red-500';
        return 'text-slate-900 dark:text-white';
    };
    return (
        <div className="border-b border-slate-50 dark:border-slate-800/50">
            <div className={`p-3 grid grid-cols-12 items-center hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer select-none`} onClick={() => hasDetails && setExpanded(!expanded)}>
                <div className={`col-span-8 flex items-center gap-2 ${bold ? 'font-bold' : 'font-medium'} text-slate-700 dark:text-slate-200`}>
                    <div className={`w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${!hasDetails ? 'invisible' : ''}`}>
                        {expanded ? <ChevronDown className="h-4 w-4 text-slate-500"/> : <ChevronRight className="h-4 w-4 text-slate-500"/>}
                    </div>
                    {label}
                </div>
                <div className={`col-span-2 text-right ${bold ? 'font-bold' : 'font-medium'} ${getColor()}`}>{formatCurrency(value, currency)}</div>
                <div className="col-span-2 text-right text-slate-400">{getPercent(value, totalRevenue)}</div>
            </div>
            {expanded && hasDetails && (
                <div className="bg-slate-50/50 dark:bg-slate-900/50 shadow-inner">
                    {Object.entries(details).sort(([,a], [,b]) => (b as number) - (a as number)).map(([cat, val], idx) => (
                        <div key={idx} className="grid grid-cols-12 py-2 px-3 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                            <div className="col-span-8 pl-12 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>{cat}</div>
                            <div className="col-span-2 text-right font-mono">{formatCurrency(val as number, currency)}</div>
                            <div className="col-span-2 text-right opacity-50">{getPercent(val as number, totalRevenue)}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}