'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { BarChart3, Users, CheckSquare, DollarSign, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { usePermission } from '@/hooks/use-permission';
import AccessDenied from '@/components/custom/access-denied';

// Mock Data Structures (simplified for dashboard display)
interface Client { id: string; name: string; contractValue?: string; }
interface Task { id: string; status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'; }
interface Transaction { id: string; type: 'receita' | 'despesa'; amount: number; }
interface Goal { id: string; title: string; targetValue: number; currentValue: number; }

const getMockData = (key: string) => {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }
  return [];
};

export default function DashboardPage() {
  const { can } = usePermission();

  if (!can('dashboard_main', 'view')) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6"><AccessDenied /></main>
        </div>
      </div>
    );
  }
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load data from localStorage
    setClients(getMockData('clients'));
    setTasks(getMockData('tasks'));
    setTransactions(getMockData('transactions'));
    setGoals(getMockData('goals'));
    setLoading(false);
  }, []);

  // --- Cálculos de Métricas ---
  const totalClients = clients.length;
  const totalTasks = tasks.length;
  const tasksCompleted = tasks.filter(t => t.status === 'concluida').length;
  const completionRate = totalTasks > 0 ? (tasksCompleted / totalTasks) * 100 : 0;

  const totalReceitas = transactions
    .filter(t => t.type === 'receita')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDespesas = transactions
    .filter(t => t.type === 'despesa')
    .reduce((sum, t) => sum + t.amount, 0);

  const saldo = totalReceitas - totalDespesas;

  const activeGoals = goals.filter(g => g.currentValue < g.targetValue);
  const goalsProgress = activeGoals.length > 0 
    ? activeGoals.reduce((sum, g) => sum + (g.currentValue / g.targetValue), 0) / activeGoals.length * 100
    : 0;

  return (
    // 1. Fundo Geral Escuro
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard Principal</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Visão geral da performance da sua agência</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-slate-600 dark:text-slate-400 mt-4">Carregando dados...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Row 1: Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* CARD 1 */}
                <Card className="shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">Clientes Ativos</CardTitle>
                    <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalClients}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">+20% desde o mês passado</p>
                  </CardContent>
                </Card>

                {/* CARD 2 */}
                <Card className="shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">Taxa de Conclusão</CardTitle>
                    <CheckSquare className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{completionRate.toFixed(0)}%</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{tasksCompleted} de {totalTasks} tarefas concluídas</p>
                  </CardContent>
                </Card>

                {/* CARD 3 */}
                <Card className="shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">Receita Total</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Saldo: R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </CardContent>
                </Card>

                {/* CARD 4 */}
                <Card className="shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">Metas em Progresso</CardTitle>
                    <Target className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{activeGoals.length}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{goalsProgress.toFixed(0)}% de progresso médio</p>
                  </CardContent>
                </Card>
              </div>

              {/* Row 2: Recent Activity & Financial Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Atividade Recente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-4">
                        <li className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-200">
                          <span>✅ Tarefa 'Criar Landing Page' concluída por João</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">10 min atrás</span>
                        </li>
                        <Separator className="dark:bg-slate-800" />
                        <li className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-200">
                          <span>💰 Receita de R$ 5.000,00 registrada (Cliente Alpha)</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">1 hora atrás</span>
                        </li>
                        <Separator className="dark:bg-slate-800" />
                        <li className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-200">
                          <span>🔔 Alerta: CPL do Cliente Beta subiu 15%</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">3 horas atrás</span>
                        </li>
                        <Separator className="dark:bg-slate-800" />
                        <li className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-200">
                          <span>👤 Novo membro da equipe adicionado: Maria</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">Ontem</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <Card className="shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Resumo Financeiro</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400">Receitas</span>
                        <span className="font-semibold text-green-600">R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400">Despesas</span>
                        <span className="font-semibold text-red-600">R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <Separator className="dark:bg-slate-800" />
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span className="text-slate-900 dark:text-white">Saldo Atual</span>
                        <span className={saldo >= 0 ? 'text-green-600' : 'text-red-600'}>R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}