'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { supabase } from '@/lib/supabase';
import { 
  DollarSign, TrendingUp, TrendingDown, Filter, Loader2, ArrowUpRight, ArrowDownRight, Search, Plus, X, Trash2, Calendar, Repeat, MoreHorizontal,
  CreditCard, QrCode, Barcode, Banknote // Ícones novos importados
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const transactionSchema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  amount: z.string().min(1, 'Valor obrigatório'),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1, 'Categoria obrigatória'),
  customCategory: z.string().optional(),
  classification: z.enum(['fixo', 'variavel']),
  payment_method: z.string().optional(), // Novo campo no schema
  date: z.string().min(1, 'Data obrigatória'),
  repeat_months: z.string().optional(),
  notes: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category: string;
  classification: 'fixo' | 'variavel';
  payment_method?: string; // Novo campo na interface
  installment_number?: number;
  installment_total?: number;
  group_id?: string;
}

const CATEGORIES = [
    'Vendas', 'Aluguel', 'Colaborador', 'Freelancers', 'Água', 'Luz', 'Internet', 
    'Comissão', 'Contrato', 'Alimentação', 'Transporte', 'Marketing', 'Softwares', 'Impostos', 'Outro'
];

export default function FinancesPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filtros
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Novos Filtros
  const [filterType, setFilterType] = useState('all'); // all, income, expense
  const [filterClass, setFilterClass] = useState('all'); // all, fixo, variavel

  const [metrics, setMetrics] = useState({ income: 0, expenses: 0, balance: 0 });
  
  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { type: 'expense', classification: 'variavel', payment_method: 'pix', date: new Date().toISOString().split('T')[0], repeat_months: '1' }
  });

  const selectedCategory = watch('category');
  const selectedType = watch('type');

  useEffect(() => { fetchFinancialData(); }, [selectedMonth, selectedYear]);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const start = new Date(selectedYear, selectedMonth, 1);
      const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

      const { data: dbTransactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', start.toISOString())
        .lte('date', end.toISOString())
        .order('date', { ascending: false });

      if (txError) throw txError;

      const formatted: Transaction[] = (dbTransactions || []).map(t => ({
          id: t.id,
          description: t.description,
          amount: Number(t.amount),
          type: t.type,
          date: t.date,
          category: t.category,
          classification: t.classification || 'variavel',
          payment_method: t.payment_method || 'pix', // Mapeando forma de pagamento
          installment_number: t.installment_number || 1,
          installment_total: t.installment_total || 1,
          group_id: t.group_id
      }));
      setTransactions(formatted);
      calculateMetrics(formatted);

    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar financeiro.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (data: Transaction[]) => {
    const income = data.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expenses = data.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    setMetrics({ income, expenses, balance: income - expenses });
  };

  const onSubmit = async (data: TransactionFormData) => {
      try {
          const finalCategory = data.category === 'Outro' ? data.customCategory || 'Outro' : data.category;
          const numericAmount = parseFloat(data.amount.replace(/[^\d,.-]/g, '').replace(',', '.'));
          const repeat = parseInt(data.repeat_months || '1');
          const groupId = repeat > 1 ? crypto.randomUUID() : null;

          const transactionsToInsert = [];
          for (let i = 0; i < repeat; i++) {
              const dateObj = new Date(data.date);
              dateObj.setMonth(dateObj.getMonth() + i);
              
              transactionsToInsert.push({
                  description: data.description,
                  amount: numericAmount,
                  type: data.type,
                  category: finalCategory,
                  classification: data.classification,
                  payment_method: data.payment_method || 'pix', // Salvando forma de pagamento
                  date: dateObj.toISOString(),
                  notes: data.notes,
                  group_id: groupId,
                  installment_number: i + 1,
                  installment_total: repeat
              });
          }

          const { error } = await supabase.from('transactions').insert(transactionsToInsert);
          if(error) throw error;
          
          toast({ title: repeat > 1 ? `${repeat} lançamentos gerados!` : "Lançamento salvo!" });
          setIsModalOpen(false); reset(); fetchFinancialData();
      } catch (error: any) {
          toast({ title: "Erro", description: error.message, variant: "destructive" });
      }
  };

  const handleDelete = async (t: Transaction, deleteMode: 'single' | 'future') => {
      try {
          if (deleteMode === 'single') {
              await supabase.from('transactions').delete().eq('id', t.id);
              toast({ title: "Lançamento excluído" });
          } else if (deleteMode === 'future' && t.group_id) {
              const { count } = await supabase.from('transactions')
                  .delete({ count: 'exact' })
                  .eq('group_id', t.group_id)
                  .gte('date', t.date);
              toast({ title: "Recorrência atualizada", description: `${count} lançamentos removidos.` });
          }
          fetchFinancialData();
      } catch (error) {
          toast({ title: "Erro ao excluir", variant: "destructive" });
      }
  };

  const filteredTransactions = transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || t.type === filterType;
      const matchesClass = filterClass === 'all' || t.classification === filterClass;
      return matchesSearch && matchesType && matchesClass;
  });

  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const years = [2024, 2025, 2026, 2027];

  // Helper para ícones de pagamento
  const getPaymentIcon = (method: string) => {
      switch (method) {
          case 'cartao': return <CreditCard className="h-4 w-4 text-purple-500" />;
          case 'boleto': return <Barcode className="h-4 w-4 text-slate-500" />;
          case 'dinheiro': return <Banknote className="h-4 w-4 text-green-600" />;
          default: return <QrCode className="h-4 w-4 text-blue-500" />; // PIX padrão
      }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Financeiro</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Gestão de fluxo de caixa</p>
            </div>
            
            <div className="flex gap-2 flex-wrap items-center">
                 <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                    <Calendar className="h-4 w-4 text-slate-500 ml-2" />
                    <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="bg-transparent text-sm font-medium dark:text-white cursor-pointer focus:outline-none">
                        {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-transparent text-sm font-medium dark:text-white cursor-pointer border-l pl-2 dark:border-slate-700 focus:outline-none">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 h-10">
                    <Plus className="mr-2 h-4 w-4"/> Novo Lançamento
                </Button>
            </div>
          </div>

          {loading ? (
             <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-blue-600"/></div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-3 mb-8">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-4"><span className="text-slate-500 text-sm font-medium">Receitas</span><div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"><TrendingUp className="h-5 w-5 text-green-600" /></div></div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(metrics.income)}</h2>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-4"><span className="text-slate-500 text-sm font-medium">Despesas</span><div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg"><TrendingDown className="h-5 w-5 text-red-600" /></div></div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(metrics.expenses)}</h2>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-4"><span className="text-slate-500 text-sm font-medium">Saldo</span><div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><DollarSign className="h-5 w-5 text-blue-600" /></div></div>
                    <h2 className={`text-2xl font-bold ${metrics.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(metrics.balance)}</h2>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-[600px]">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                  
                  <div className="flex gap-4 items-center w-full">
                        <h3 className="font-bold text-slate-900 dark:text-white whitespace-nowrap">Extrato</h3>
                        <div className="relative w-full max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
                            <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent dark:text-white"/>
                        </div>
                    </div>
               
                    {/* NOVOS FILTROS */}
                    <div className="flex gap-2">
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-xs p-2 border rounded bg-transparent dark:text-white dark:border-slate-700"><option value="all">Todas</option><option value="income">Receitas</option><option value="expense">Despesas</option></select>
                        <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="text-xs p-2 border rounded bg-transparent dark:text-white dark:border-slate-700"><option value="all">Tudo</option><option value="fixo">Fixo</option><option value="variavel">Variável</option></select>
                    </div>
                </div>
                
                <div className="flex-1 overflow-auto p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800 sticky top-0">
                            <tr>
                                <th className="px-6 py-3">Descrição</th>
                                <th className="px-6 py-3">Classificação</th>
                                <th className="px-6 py-3">Categoria</th>
                                <th className="px-6 py-3">Data</th>
                                <th className="px-6 py-3 text-right">Valor</th>
                                <th className="px-6 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Nenhum lançamento encontrado.</td></tr>
                            ) : (
                                filteredTransactions.map((t) => (
                                    <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center gap-3">
                                            <div className={`p-1.5 rounded-full ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                {t.type === 'income' ? <ArrowUpRight className="h-3 w-3"/> : <ArrowDownRight className="h-3 w-3"/>}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    {/* Ícone da forma de pagamento */}
                                                    <div title={t.payment_method}>
                                                        {getPaymentIcon(t.payment_method || 'pix')}
                                                    </div>
                                                    <p>{t.description}</p>
                                                </div>
                                                {t.installment_total && t.installment_total > 1 && (
                                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 rounded text-slate-500">
                                                        {t.installment_number}/{t.installment_total}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs px-2 py-1 rounded-full capitalize ${t.classification === 'fixo' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                                                {t.classification}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{t.category}</td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(t.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                                        <td className={`px-6 py-4 text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100">
                                                        <MoreHorizontal className="h-4 w-4"/>
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleDelete(t, 'single')} className="text-red-600 cursor-pointer">
                                                        <Trash2 className="h-4 w-4 mr-2"/> Excluir este
                                                    </DropdownMenuItem>
                                                    {t.group_id && (
                                                        <DropdownMenuItem onClick={() => handleDelete(t, 'future')} className="text-red-600 cursor-pointer">
                                                            <Repeat className="h-4 w-4 mr-2"/> Excluir este e futuros
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
               </div>
            </>
          )}
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between mb-6">
                  <h2 className="text-xl font-bold dark:text-white">Novo Lançamento</h2>
                  <button onClick={() => setIsModalOpen(false)}><X className="dark:text-white"/></button>
              </div>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setValue('type', 'income')} className={`py-3 rounded-lg border font-medium flex items-center justify-center gap-2 transition-all ${selectedType === 'income' ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}><ArrowUpRight className="h-4 w-4"/> Receita</button>
                      <button type="button" onClick={() => setValue('type', 'expense')} className={`py-3 rounded-lg border font-medium flex items-center justify-center gap-2 transition-all ${selectedType === 'expense' ? 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}><ArrowDownRight className="h-4 w-4"/> Despesa</button>
                  </div>

                  <div><label className="text-sm font-medium dark:text-slate-300">Descrição</label><Input {...register('description')} placeholder="Ex: Salário, Contrato X" className="dark:bg-slate-950"/></div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-sm font-medium dark:text-slate-300">Valor (R$)</label><Input {...register('amount')} placeholder="0,00" className="dark:bg-slate-950"/></div>
                      <div><label className="text-sm font-medium dark:text-slate-300">Data de Pagamento</label><Input type="date" {...register('date')} className="dark:bg-slate-950"/></div>
                  </div>

                  {/* NOVO CAMPO DE FORMA DE PAGAMENTO */}
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="text-sm font-medium dark:text-slate-300">Categoria</label>
                          <select {...register('category')} className="w-full h-10 rounded-md border bg-transparent px-3 text-sm dark:border-slate-800 dark:text-white dark:bg-slate-950">
                              <option value="">Selecione...</option>
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-sm font-medium dark:text-slate-300">Pagamento</label>
                          <select {...register('payment_method')} className="w-full h-10 rounded-md border bg-transparent px-3 text-sm dark:border-slate-800 dark:text-white dark:bg-slate-950">
                              <option value="pix">PIX / Transf.</option>
                              <option value="boleto">Boleto</option>
                              <option value="cartao">Cartão Crédito</option>
                              <option value="dinheiro">Dinheiro</option>
                          </select>
                      </div>
                  </div>

                  <div>
                       <label className="text-sm font-medium dark:text-slate-300">Classificação</label>
                       <select {...register('classification')} className="w-full h-10 rounded-md border bg-transparent px-3 text-sm dark:border-slate-800 dark:text-white dark:bg-slate-950"><option value="variavel">Variável</option><option value="fixo">Fixo</option></select>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 mb-2"><Repeat className="h-4 w-4 text-slate-500"/><label className="text-sm font-medium dark:text-slate-300">Repetir por (meses)</label></div>
                      <div className="flex gap-2 items-center"><Input type="number" min="1" max="60" {...register('repeat_months')} className="dark:bg-slate-950 w-20" defaultValue="1"/><span className="text-xs text-slate-500">Ex: 6 para contrato semestral. (1 = hoje)</span></div>
                  </div>

                  <div><label className="text-sm font-medium dark:text-slate-300">Observações</label><textarea {...register('notes')} className="w-full p-2 border rounded-md dark:bg-slate-950 dark:border-slate-800 dark:text-white" rows={2}></textarea></div>

                  <Button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 mt-2">{isSubmitting ? <Loader2 className="animate-spin"/> : 'Salvar Lançamento'}</Button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}