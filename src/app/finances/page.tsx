'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { DollarSign, TrendingUp, TrendingDown, Plus, Search, Filter, Edit, Trash2, Calendar, X } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/use-permission';
import AccessDenied from '@/components/custom/access-denied';

const transactionSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.string().min(1, 'Valor é obrigatório'),
  type: z.enum(['receita', 'despesa']),
  category: z.string().min(1, 'Categoria é obrigatória'),
  frequency: z.enum(['fixa', 'variavel']),
  date: z.string().min(1, 'Data é obrigatória'),
  notes: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

type TransactionTypeFilter = 'all' | 'receita' | 'despesa';
type TransactionFrequencyFilter = 'all' | 'fixa' | 'variavel';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  category: string;
  frequency: 'fixa' | 'variavel';
  date: string;
  notes?: string;
  created_at: string;
}

const CATEGORIES = [
  'Serviço',
  'Alimentação',
  'Comissão',
  'Ferramentas',
  'Aluguel',
  'Conta de Água',
  'Conta de Luz',
  'Internet',
  'Telefone',
  'Transporte',
  'Marketing',
  'Salários',
  'Impostos',
  'Outros',
];

export default function FinancesPage() {
  const { can } = usePermission();

  if (!can('finances', 'view')) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
             <AccessDenied />
          </main>
        </div>
      </div>
    );
  }
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<TransactionFrequencyFilter>('all');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'receita',
      frequency: 'variavel',
      date: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = () => {
    try {
      const savedTransactions = localStorage.getItem('transactions');
      if (savedTransactions) {
        setTransactions(JSON.parse(savedTransactions));
      }
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTransactions = (transactionsList: Transaction[]) => {
    try {
      localStorage.setItem('transactions', JSON.stringify(transactionsList));
    } catch (error) {
      console.error('Erro ao salvar transações:', error);
    }
  };

  const onSubmit = (data: TransactionFormData) => {
    const newTransaction: Transaction = {
      id: editingTransaction?.id || Date.now().toString(),
      description: data.description,
      amount: parseFloat(data.amount.replace(',', '.')),
      type: data.type,
      category: data.category,
      frequency: data.frequency,
      date: data.date,
      notes: data.notes,
      created_at: editingTransaction?.created_at || new Date().toISOString(),
    };

    if (editingTransaction) {
      const updatedTransactions = transactions.map(transaction =>
        transaction.id === editingTransaction.id ? newTransaction : transaction
      );
      setTransactions(updatedTransactions);
      saveTransactions(updatedTransactions);
      toast({ title: "Sucesso", description: "Transação atualizada." });
    } else {
      const updatedTransactions = [newTransaction, ...transactions];
      setTransactions(updatedTransactions);
      saveTransactions(updatedTransactions);
      toast({ title: "Sucesso", description: "Nova transação registrada." });
    }

    setIsModalOpen(false);
    setEditingTransaction(null);
    reset({ type: 'receita', frequency: 'variavel', date: new Date().toISOString().split('T')[0] });
  };

  const deleteTransaction = (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

    const updatedTransactions = transactions.filter(transaction => transaction.id !== id);
    setTransactions(updatedTransactions);
    saveTransactions(updatedTransactions);
    toast({ title: "Excluído", description: "Transação removida.", variant: "destructive" });
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    reset({
      description: transaction.description,
      amount: transaction.amount.toString(),
      type: transaction.type,
      category: transaction.category,
      frequency: transaction.frequency,
      date: transaction.date,
      notes: transaction.notes || '',
    });
    setIsModalOpen(true);
  };

  const applyFilters = (transaction: Transaction) => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    const matchesFrequency = frequencyFilter === 'all' || transaction.frequency === frequencyFilter;

    return matchesType && matchesFrequency;
  };

  const filteredTransactions = transactions.filter(applyFilters);

  const totalReceitas = filteredTransactions
    .filter(t => t.type === 'receita')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDespesas = filteredTransactions
    .filter(t => t.type === 'despesa')
    .reduce((sum, t) => sum + t.amount, 0);

  const saldo = totalReceitas - totalDespesas;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Financeiro</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Controle de receitas e despesas</p>
              </div>
              <button
                onClick={() => {
                  setEditingTransaction(null);
                  reset({ type: 'receita', frequency: 'variavel', date: new Date().toISOString().split('T')[0] });
                  setIsModalOpen(true);
                }}
                className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <Plus className="h-5 w-5" />
                Nova Transação
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Receitas (Filtradas)</h3>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Despesas (Filtradas)</h3>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-lg bg-slate-900 dark:bg-slate-800 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Saldo (Filtrado)</h3>
              <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar transações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:placeholder-slate-500"
                />
              </div>
              <button 
                onClick={() => setIsFilterModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
              >
                <Filter className="h-5 w-5 text-slate-600" />
                Filtros
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-slate-600 dark:text-slate-400 mt-4">Carregando transações...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                    <DollarSign className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Nenhuma transação registrada</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">Comece registrando suas receitas e despesas</p>
                <button
                  onClick={() => {
                    setEditingTransaction(null);
                    reset({ type: 'receita', frequency: 'variavel', date: new Date().toISOString().split('T')[0] });
                    setIsModalOpen(true);
                  }}
                  className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all inline-flex items-center gap-2 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <Plus className="h-5 w-5" />
                  Adicionar Transação
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className="bg-slate-50 dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`h-10 w-10 rounded-lg ${transaction.type === 'receita' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'} flex items-center justify-center`}>
                            {transaction.type === 'receita' ? (
                              <TrendingUp className={`h-5 w-5 text-green-600 dark:text-green-400`} />
                            ) : (
                              <TrendingDown className={`h-5 w-5 text-red-600 dark:text-red-400`} />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">{transaction.description}</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {transaction.category} • {transaction.frequency === 'fixa' ? 'Fixa' : 'Variável'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-500 ml-12">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(transaction.date).toLocaleDateString('pt-BR')}
                          </div>
                          {transaction.notes && (
                            <p className="text-sm text-slate-500">{transaction.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className={`text-xl font-bold ${transaction.type === 'receita' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {transaction.type === 'receita' ? '+' : '-'} R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditModal(transaction)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteTransaction(transaction.id)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal Transação (Criação/Edição) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Tipo *
                    </label>
                    <select
                      {...register('type')}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:bg-slate-900"
                    >
                      <option value="receita">Receita</option>
                      <option value="despesa">Despesa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Frequência *
                    </label>
                    <select
                      {...register('frequency')}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:bg-slate-900"
                    >
                      <option value="fixa">Fixa</option>
                      <option value="variavel">Variável</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Descrição *
                  </label>
                  <input
                    {...register('description')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                    placeholder="Ex: Pagamento de cliente"
                  />
                  {errors.description && (
                    <p className="text-red-600 text-sm mt-1">{errors.description.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Valor *
                    </label>
                    <input
                      {...register('amount')}
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                      placeholder="0.00"
                    />
                    {errors.amount && (
                      <p className="text-red-600 text-sm mt-1">{errors.amount.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Data *
                    </label>
                    <input
                      {...register('date')}
                      type="date"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                    />
                    {errors.date && (
                      <p className="text-red-600 text-sm mt-1">{errors.date.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Categoria *
                  </label>
                  <select
                    {...register('category')}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:bg-slate-900"
                  >
                    <option value="">Selecione uma categoria</option>
                    {CATEGORIES.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-red-600 text-sm mt-1">{errors.category.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Observações
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                    placeholder="Observações adicionais"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingTransaction(null);
                      reset({ type: 'receita', frequency: 'variavel', date: new Date().toISOString().split('T')[0] });
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {editingTransaction ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Filtros */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Filtrar Transações</h2>
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tipo
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as TransactionTypeFilter)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:bg-slate-900"
                  >
                    <option value="all">Todos</option>
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Frequência
                  </label>
                  <select
                    value={frequencyFilter}
                    onChange={(e) => setFrequencyFilter(e.target.value as TransactionFrequencyFilter)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:bg-slate-900"
                  >
                    <option value="all">Todas</option>
                    <option value="fixa">Fixa</option>
                    <option value="variavel">Variável</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('all');
                    setFrequencyFilter('all');
                    setIsFilterModalOpen(false);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Limpar Filtros
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(false)}
                  className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:bg-slate-800 transition-all dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}