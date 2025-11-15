'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  category: string;
  frequency: 'fixa' | 'variavel';
  date: string;
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

// Mapeamento de categorias para o DRE (simplificado)
const CATEGORY_MAPPING: Record<string, 'comissao' | 'variavel' | 'fixa' | 'colaborador' | 'receita'> = {
  'Serviço': 'receita',
  'Comissão': 'comissao',
  'Alimentação': 'variavel',
  'Ferramentas': 'variavel',
  'Aluguel': 'fixa',
  'Conta de Água': 'fixa',
  'Conta de Luz': 'fixa',
  'Internet': 'fixa',
  'Telefone': 'fixa',
  'Transporte': 'variavel',
  'Marketing': 'variavel',
  'Salários': 'colaborador',
  'Impostos': 'fixa',
  'Outros': 'variavel',
};

export default function DREPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = () => {
    try {
      const savedTransactions = getMockData('transactions');
      setTransactions(savedTransactions);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear;
    });
  }, [transactions, selectedMonth, selectedYear]);

  const dreData = useMemo(() => {
    const totals = {
      receitaBruta: 0,
      comissoes: 0,
      despesasVariaveis: 0,
      despesasFixas: 0,
      comissoesColaboradores: 0,
    };

    filteredTransactions.forEach(t => {
      const mapping = CATEGORY_MAPPING[t.category] || 'variavel';
      const amount = t.amount;

      if (t.type === 'receita') {
        totals.receitaBruta += amount;
      } else if (t.type === 'despesa') {
        switch (mapping) {
          case 'comissao':
            totals.comissoes += amount;
            break;
          case 'variavel':
            totals.despesasVariaveis += amount;
            break;
          case 'fixa':
            totals.despesasFixas += amount;
            break;
          case 'colaborador':
            totals.comissoesColaboradores += amount;
            break;
          default:
            totals.despesasVariaveis += amount;
        }
      }
    });

    // Cálculos do DRE
    const receitaLiquida = totals.receitaBruta - totals.comissoes;
    const margemBruta = receitaLiquida - totals.despesasVariaveis;
    const margemOperacional = margemBruta - totals.despesasFixas;
    const lucroLiquido = margemOperacional - totals.comissoesColaboradores;

    const calculatePercent = (value: number, base: number) => {
      if (base === 0) return 0;
      return (value / base) * 100;
    };

    const baseReceita = totals.receitaBruta || 1;

    const dre: DREItem[] = [
      { description: 'Receita Bruta', value: totals.receitaBruta, type: 'result', color: 'bg-green-100 text-green-800' },
      { description: '(-) Comissões Pagas', value: totals.comissoes, type: 'item', color: 'text-red-600', isNegative: true },
      { description: '= Receita Líquida', value: receitaLiquida, type: 'subtotal', color: 'bg-blue-100 text-blue-800' },
      { description: '(-) Despesas Variáveis', value: totals.despesasVariaveis, type: 'item', color: 'text-red-600', isNegative: true },
      { description: '= Margem Bruta', value: margemBruta, type: 'subtotal', color: 'bg-purple-100 text-purple-800' },
      { description: '(-) Despesas Fixas', value: totals.despesasFixas, type: 'item', color: 'text-red-600', isNegative: true },
      { description: '= Margem Operacional', value: margemOperacional, type: 'subtotal', color: 'bg-orange-100 text-orange-800' },
      { description: '(-) Comissões Colaboradores', value: totals.comissoesColaboradores, type: 'item', color: 'text-red-600', isNegative: true },
      { description: '= LUCRO LÍQUIDO', value: lucroLiquido, type: 'result', color: 'bg-blue-600 text-white' },
    ];

    return { dre, totals, lucroLiquido };
  }, [filteredTransactions]);

  const { dre, totals, lucroLiquido } = dreData;

  const formatCurrency = (value: number) => {
    return `R$ ${Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const getMonthName = (month: number) => {
    const date = new Date(selectedYear, month - 1, 1);
    return date.toLocaleString('pt-BR', { month: 'long' });
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(parseInt(e.target.value));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(e.target.value));
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Relatórios DRE</h1>
            <p className="text-slate-600 mt-1">Demonstrativo de Resultados do Exercício</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-slate-600 mt-4">Carregando dados financeiros...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-sm border border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.receitaBruta)}</div>
                    <p className="text-xs text-slate-500">{getMonthName(selectedMonth)} atual</p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Despesas Totais</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{formatCurrency(totals.comissoes + totals.despesasVariaveis + totals.despesasFixas + totals.comissoesColaboradores)}</div>
                    <p className="text-xs text-slate-500">{getMonthName(selectedMonth)} atual</p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
                    <DollarSign className="h-4 w-4 text-slate-500" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(lucroLiquido)}</div>
                    <p className="text-xs text-slate-500">{getMonthName(selectedMonth)} atual</p>
                  </CardContent>
                </Card>
              </div>

              {/* DRE Table */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-slate-900">DRE Mensal</h2>
                  <div className="flex gap-3">
                    <select
                      value={selectedMonth}
                      onChange={handleMonthChange}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <option key={month} value={month}>
                          {getMonthName(month)}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedYear}
                      onChange={handleYearChange}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {years.map(year => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="grid grid-cols-3 font-medium text-sm text-slate-600 border-b pb-2">
                    <span className="col-span-1">Descrição</span>
                    <span className="text-right">Valor</span>
                    <span className="text-right">% Receita</span>
                  </div>

                  {dre.map((item, index) => {
                    const isResult = item.type === 'result';
                    const isSubtotal = item.type === 'subtotal';
                    const isItem = item.type === 'item';
                    const isLucroLiquido = item.description === '= LUCRO LÍQUIDO';
                    
                    const percent = calculatePercent(item.value, totals.receitaBruta);
                    const valueDisplay = formatCurrency(item.value);
                    
                    return (
                      <div
                        key={index}
                        className={`grid grid-cols-3 py-2 transition-colors ${
                          isLucroLiquido 
                            ? 'font-bold text-white rounded-lg px-2' 
                            : isSubtotal 
                            ? 'font-semibold border-t border-b border-slate-200' 
                            : isItem 
                            ? 'text-slate-700' 
                            : 'font-bold text-slate-900'
                        } ${item.color}`}
                      >
                        <span className={`col-span-1 ${isItem ? 'pl-4' : ''}`}>{item.description}</span>
                        <span className={`text-right ${item.isNegative ? 'text-red-600' : ''} ${isLucroLiquido ? 'text-white' : ''}`}>
                          {item.isNegative ? `(${formatCurrency(item.value)})` : formatCurrency(item.value)}
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