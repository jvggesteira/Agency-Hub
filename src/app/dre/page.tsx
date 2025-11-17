'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { TrendingUp, TrendingDown, DollarSign, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  category: string;
  frequency: 'fixa' | 'variavel';
  date: string;
  clientId?: string; // Adicionado para potencial filtragem por cliente
}

interface Client {
  id: string;
  name: string;
}

interface DREItem {
  description: string;
  value: number;
  type: 'header' | 'subtotal' | 'item' | 'result';
  color: string;
  isNegative?: boolean;
}

const getMockData = (key: string) => {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }
  return [];
};

// Mapeamento de categorias para o DRE (simplificado para a nova estrutura)
const CATEGORY_MAPPING: Record<string, 'custo' | 'despesa_operacional' | 'deducao' | 'receita' | 'financeira' | 'imposto'> = {
  'Serviço': 'receita',
  'Comissão': 'deducao', // Dedução/Abatimento
  'Aluguel': 'despesa_operacional', // Despesa Operacional Fixa
  'Conta de Água': 'despesa_operacional',
  'Conta de Luz': 'despesa_operacional',
  'Internet': 'despesa_operacional',
  'Telefone': 'despesa_operacional',
  'Salários': 'despesa_operacional',
  'Impostos': 'imposto', // Imposto
  'Ferramentas': 'custo', // Custo
  'Marketing': 'custo', // Custo
  'Transporte': 'custo', // Custo
  'Alimentação': 'custo', // Custo
  'Outros': 'custo', // Default para Custo
};

const IMPOSTO_PERCENTUAL = 0.15; // 15% de imposto sobre o Resultado Antes dos Impostos

export default function DREPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedClient, setSelectedClient] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      setTransactions(getMockData('transactions'));
      const savedClients = getMockData('clients');
      setClients(savedClients.map((c: any) => ({ id: c.id, name: c.name })));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = new Date(t.date);
      const matchesDate = date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear;
      
      // Nota: A filtragem por cliente só funcionará se a página 'finances' tiver salvo o clientId na transação.
      const matchesClient = selectedClient === 'all' || t.clientId === selectedClient;
      
      return matchesDate && matchesClient;
    });
  }, [transactions, selectedMonth, selectedYear, selectedClient]);

  const dreData = useMemo(() => {
    const totals = {
      receitaBruta: 0,
      deducoes: 0,
      custos: 0,
      despesasOperacionais: 0,
      despesasFinanceiras: 0,
      receitasFinanceiras: 0,
      impostos: 0,
    };

    filteredTransactions.forEach(t => {
      const mapping = CATEGORY_MAPPING[t.category] || 'custo';
      const amount = t.amount;

      if (t.type === 'receita') {
        totals.receitaBruta += amount;
      } else if (t.type === 'despesa') {
        switch (mapping) {
          case 'deducao':
            totals.deducoes += amount;
            break;
          case 'custo':
            totals.custos += amount;
            break;
          case 'despesa_operacional':
            totals.despesasOperacionais += amount;
            break;
          case 'financeira':
            totals.despesasFinanceiras += amount;
            break;
          case 'imposto':
            totals.impostos += amount;
            break;
          default:
            totals.custos += amount;
        }
      }
    });

    // --- Cálculos do DRE ---
    const receitaLiquida = totals.receitaBruta - totals.deducoes;
    const lucroBruto = receitaLiquida - totals.custos;
    const resultadoOperacional = lucroBruto - totals.despesasOperacionais;
    const resultadoAntesImpostos = resultadoOperacional - totals.despesasFinanceiras + totals.receitasFinanceiras;
    
    // Impostos calculados sobre o Resultado Antes dos Impostos
    const impostosCalculados = Math.max(0, resultadoAntesImpostos * IMPOSTO_PERCENTUAL);
    
    const lucroLiquido = resultadoAntesImpostos - impostosCalculados;

    const dre: DREItem[] = [
      { description: 'Receita Bruta', value: totals.receitaBruta, type: 'result', color: 'bg-green-100 text-green-800' },
      { description: '(-) Deduções e Abatimentos', value: totals.deducoes, type: 'item', color: 'text-red-600', isNegative: true },
      { description: '= Receita Líquida', value: receitaLiquida, type: 'subtotal', color: 'bg-blue-100 text-blue-800' },
      { description: '(-) Custos', value: totals.custos, type: 'item', color: 'text-red-600', isNegative: true },
      { description: '= Lucro Bruto', value: lucroBruto, type: 'subtotal', color: 'bg-purple-100 text-purple-800' },
      { description: '(-) Despesas Operacionais', value: totals.despesasOperacionais, type: 'item', color: 'text-red-600', isNegative: true },
      { description: '= Resultado Operacional', value: resultadoOperacional, type: 'subtotal', color: 'bg-orange-100 text-orange-800' },
      { description: '(-) Despesas Financeiras', value: totals.despesasFinanceiras, type: 'item', color: 'text-red-600', isNegative: true },
      { description: '(+) Receitas Financeiras', value: totals.receitasFinanceiras, type: 'item', color: 'text-green-600', isNegative: false },
      { description: '= Resultado Antes dos Impostos', value: resultadoAntesImpostos, type: 'subtotal', color: 'bg-yellow-100 text-yellow-800' },
      { description: `(-) Impostos (${IMPOSTO_PERCENTUAL * 100}%)`, value: impostosCalculados, type: 'item', color: 'text-red-600', isNegative: true },
      { description: '= LUCRO LÍQUIDO', value: lucroLiquido, type: 'result', color: 'bg-blue-600 text-white' },
    ];

    return { dre, totals, lucroLiquido, receitaLiquida, lucroBruto, resultadoOperacional, resultadoAntesImpostos };
  }, [filteredTransactions]);

  const { dre, totals, lucroLiquido, receitaLiquida, lucroBruto, resultadoOperacional, resultadoAntesImpostos } = dreData;

  const formatCurrency = (value: number) => {
    return `R$ ${Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const calculatePercent = (value: number, base: number) => {
    if (base === 0) return 0;
    return (value / base) * 100;
  };

  const getMonthName = (month: number) => {
    const date = new Date(selectedYear, month - 1, 1);
    return date.toLocaleString('pt-BR', { month: 'long' });
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">DRE - Demonstração do Resultado do Exercício</h1>
            <p className="text-slate-600 mt-1">Análise detalhada da performance financeira por período.</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-slate-600 mt-4">Carregando dados financeiros...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Filters */}
              <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-slate-600" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>
                        Mês: {getMonthName(month)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>
                        Ano: {year}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Cliente: Todos</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="shadow-sm border border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Receita Líquida</CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(receitaLiquida)}</div>
                    <p className="text-xs text-slate-500">Após deduções</p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Lucro Bruto</CardTitle>
                    <DollarSign className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">{formatCurrency(lucroBruto)}</div>
                    <p className="text-xs text-slate-500">Margem: {calculatePercent(lucroBruto, receitaLiquida).toFixed(1)}%</p>
                  </CardContent>
                </Card>
                
                <Card className="shadow-sm border border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Resultado Operacional</CardTitle>
                    <DollarSign className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{formatCurrency(resultadoOperacional)}</div>
                    <p className="text-xs text-slate-500">Antes de receitas/despesas financeiras</p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
                    <DollarSign className="h-4 w-4 text-slate-500" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(lucroLiquido)}</div>
                    <p className="text-xs text-slate-500">Resultado final do período</p>
                  </CardContent>
                </Card>
              </div>

              {/* DRE Table */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Demonstrativo ({getMonthName(selectedMonth)}/{selectedYear})</h2>

                <div className="space-y-1">
                  <div className="grid grid-cols-3 font-medium text-sm text-slate-600 border-b pb-2">
                    <span className="col-span-1">Descrição</span>
                    <span className="text-right">Valor</span>
                    <span className="text-right">% Receita Bruta</span>
                  </div>

                  {dre.map((item, index) => {
                    const isResult = item.type === 'result';
                    const isSubtotal = item.type === 'subtotal';
                    const isItem = item.type === 'item';
                    const isLucroLiquido = item.description.includes('LUCRO LÍQUIDO');
                    
                    const percent = calculatePercent(item.value, totals.receitaBruta);
                    const valueDisplay = formatCurrency(item.value);
                    
                    return (
                      <div
                        key={index}
                        className={cn(
                          "grid grid-cols-3 py-2 transition-colors",
                          isLucroLiquido 
                            ? 'font-bold text-white rounded-lg px-2' 
                            : isSubtotal 
                            ? 'font-semibold border-t border-b border-slate-200' 
                            : isItem 
                            ? 'text-slate-700' 
                            : 'font-bold text-slate-900',
                          isLucroLiquido && item.value >= 0 ? 'bg-green-600' : isLucroLiquido && item.value < 0 ? 'bg-red-600' : item.color
                        )}
                      >
                        <span className={`col-span-1 ${isItem ? 'pl-4' : ''}`}>{item.description}</span>
                        <span className={cn(
                          "text-right",
                          item.isNegative && !isLucroLiquido ? 'text-red-600' : '',
                          isLucroLiquido ? 'text-white' : ''
                        )}>
                          {item.isNegative && item.value !== 0 ? `(${formatCurrency(item.value)})` : formatCurrency(item.value)}
                        </span>
                        <span className="text-right">{percent.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}