'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { CheckSquare, Clock, AlertTriangle, Users, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  priority: 'baixa' | 'media' | 'alta';
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  dueDate?: string;
  assignedTo?: string;
  created_at: string;
}

interface Member {
  id: string;
  name: string;
}

const getMockData = (key: string) => {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }
  return [];
};

const PRIORITY_COLORS: Record<Task['priority'], string> = {
  alta: 'bg-red-500',
  media: 'bg-orange-500',
  baixa: 'bg-green-500',
};

export default function ProductivityPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      setTasks(getMockData('tasks'));
      const savedMembers = getMockData('team_members');
      setMembers(savedMembers.map((m: any) => ({ id: m.id, name: m.name })));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const date = new Date(t.created_at);
      const matchesDate = date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear;
      const matchesMember = selectedMember === 'all' || t.assignedTo === selectedMember;
      return matchesDate && matchesMember;
    });
  }, [tasks, selectedMonth, selectedYear, selectedMember]);

  const metrics = useMemo(() => {
    const totalTasks = filteredTasks.length;
    const concluded = filteredTasks.filter(t => t.status === 'concluida').length;
    const pending = filteredTasks.filter(t => t.status === 'pendente' || t.status === 'em_andamento').length;
    
    const today = new Date();
    const overdue = filteredTasks.filter(t => t.dueDate && new Date(t.dueDate) < today && t.status !== 'concluida' && t.status !== 'cancelada').length;
    
    const completionRate = totalTasks > 0 ? (concluded / totalTasks) * 100 : 0;

    // Cálculo de tempo médio (mock simples: dias entre criação e conclusão)
    const completedTasks = filteredTasks.filter(t => t.status === 'concluida');
    let totalDays = 0;
    completedTasks.forEach(t => {
      const created = new Date(t.created_at);
      const completed = today; // Mock: assume que a conclusão é hoje para simplificar
      totalDays += (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    });
    const averageTime = completedTasks.length > 0 ? totalDays / completedTasks.length : 0;

    const priorityDistribution = filteredTasks.reduce((acc, t) => {
      acc[t.priority] = (acc[t.priority] || 0) + 1;
      return acc;
    }, {} as Record<Task['priority'], number>);

    const statusDistribution = filteredTasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as Record<Task['status'], number>);

    return {
      totalTasks,
      concluded,
      pending,
      overdue,
      completionRate,
      averageTime,
      priorityDistribution,
      statusDistribution,
    };
  }, [filteredTasks]);

  const ranking = useMemo(() => {
    const memberStats: Record<string, { total: number; concluded: number; overdue: number; name: string }> = {};

    members.forEach(m => {
      memberStats[m.name] = { total: 0, concluded: 0, overdue: 0, name: m.name };
    });

    const today = new Date();

    tasks.forEach(t => {
      if (t.assignedTo && memberStats[t.assignedTo]) {
        memberStats[t.assignedTo].total += 1;
        if (t.status === 'concluida') {
          memberStats[t.assignedTo].concluded += 1;
        }
        if (t.dueDate && new Date(t.dueDate) < today && t.status !== 'concluida' && t.status !== 'cancelada') {
          memberStats[t.assignedTo].overdue += 1;
        }
      }
    });

    const ranked = Object.values(memberStats)
      .map(stat => ({
        ...stat,
        completionRate: stat.total > 0 ? (stat.concluded / stat.total) * 100 : 0,
      }))
      .sort((a, b) => b.completionRate - a.completionRate || b.concluded - a.concluded);

    return ranked;
  }, [tasks, members]);

  const getMonthName = (month: number) => {
    const date = new Date(selectedYear, month - 1, 1);
    return date.toLocaleString('pt-BR', { month: 'long' });
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const priorityOrder: Task['priority'][] = ['alta', 'media', 'baixa'];

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Relatórios de Produtividade</h1>
            <p className="text-slate-600 mt-1">Análise de desempenho por colaborador</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-slate-600 mt-4">Carregando dados de produtividade...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Filters */}
              <div className="flex gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-slate-600" />
                  <select
                    value={selectedMember}
                    onChange={(e) => setSelectedMember(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Colaborador: Todos</option>
                    {members.map(member => (
                      <option key={member.id} value={member.name}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-slate-600" />
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
              </div>

              {/* Row 1: Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="shadow-sm border border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
                    <Info className="h-4 w-4 text-slate-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.totalTasks}</div>
                    <p className="text-xs text-slate-500">{metrics.pending} pendentes, {metrics.statusDistribution['em_andamento'] || 0} em andamento</p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
                    <CheckSquare className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{metrics.concluded}</div>
                    <p className="text-xs text-slate-500">Taxa de conclusão: {metrics.completionRate.toFixed(1)}%</p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{metrics.overdue}</div>
                    <p className="text-xs text-slate-500">Requer atenção imediata</p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                    <Clock className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.averageTime.toFixed(1)}</div>
                    <p className="text-xs text-slate-500">Dias para conclusão</p>
                  </CardContent>
                </Card>
              </div>

              {/* Row 2: Distribution Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-sm border border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold">Distribuição por Prioridade</CardTitle>
                    <p className="text-sm text-slate-600">Tarefas por nível de prioridade</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {priorityOrder.map(priority => {
                      const count = metrics.priorityDistribution[priority] || 0;
                      const percentage = metrics.totalTasks > 0 ? (count / metrics.totalTasks) * 100 : 0;
                      const label = priority.charAt(0).toUpperCase() + priority.slice(1);
                      const color = PRIORITY_COLORS[priority];
                      
                      return (
                        <div key={priority}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{label}</span>
                            <span>{count}</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className={cn("h-2 rounded-full transition-all", color)}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card className="shadow-sm border border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold">Status das Tarefas</CardTitle>
                    <p className="text-sm text-slate-600">Distribuição por status</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { status: 'concluida', label: 'Concluídas', color: 'bg-green-500' },
                      { status: 'em_andamento', label: 'Em Andamento', color: 'bg-blue-500' },
                      { status: 'pendente', label: 'Pendentes', color: 'bg-orange-500' },
                      { status: 'cancelada', label: 'Canceladas', color: 'bg-red-500' },
                    ].map(({ status, label, color }) => {
                      const count = metrics.statusDistribution[status as Task['status']] || 0;
                      const percentage = metrics.totalTasks > 0 ? (count / metrics.totalTasks) * 100 : 0;
                      
                      return (
                        <div key={status}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{label}</span>
                            <span>{count}</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className={cn("h-2 rounded-full transition-all", color)}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Row 3: Ranking */}
              <Card className="shadow-sm border border-slate-200">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Ranking de Colaboradores</CardTitle>
                  <p className="text-sm text-slate-600">Desempenho geral de todos os colaboradores</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead>
                        <tr className="text-left text-sm font-medium text-slate-500">
                          <th className="py-3 px-4">Posição</th>
                          <th className="py-3 px-4">Colaborador</th>
                          <th className="py-3 px-4">Total de Tarefas</th>
                          <th className="py-3 px-4">Concluídas</th>
                          <th className="py-3 px-4">Taxa de Conclusão</th>
                          <th className="py-3 px-4">Atrasadas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ranking.map((stat, index) => (
                          <tr key={stat.name} className="hover:bg-slate-50">
                            <td className="py-3 px-4 text-sm font-semibold text-slate-900">#{index + 1}</td>
                            <td className="py-3 px-4 text-sm text-slate-700">{stat.name}</td>
                            <td className="py-3 px-4 text-sm text-slate-700">{stat.total}</td>
                            <td className="py-3 px-4 text-sm text-green-600">{stat.concluded}</td>
                            <td className="py-3 px-4 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full"
                                    style={{ width: `${stat.completionRate}%` }}
                                  />
                                </div>
                                <span className="text-slate-700">{stat.completionRate.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-red-600">{stat.overdue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}