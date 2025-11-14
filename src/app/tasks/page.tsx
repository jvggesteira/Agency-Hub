'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { CheckSquare, Plus, Search, Filter, Edit, Trash2, Calendar, Clock, LayoutGrid, List } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const taskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  priority: z.enum(['baixa', 'media', 'alta']),
  status: z.enum(['pendente', 'em_andamento', 'concluida']),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
  clientId: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'baixa' | 'media' | 'alta';
  status: 'pendente' | 'em_andamento' | 'concluida';
  dueDate?: string;
  assignedTo?: string;
  clientId?: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      priority: 'media',
      status: 'pendente',
    },
  });

  useEffect(() => {
    loadTasks();
    loadTeamMembers();
    loadClients();
  }, []);

  const loadTasks = () => {
    try {
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = () => {
    try {
      const savedMembers = localStorage.getItem('team_members');
      if (savedMembers) {
        const members = JSON.parse(savedMembers);
        setTeamMembers(members.map((m: any) => ({ id: m.id, name: m.name })));
      }
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
    }
  };

  const loadClients = () => {
    try {
      const savedClients = localStorage.getItem('clients');
      if (savedClients) {
        const clientsList = JSON.parse(savedClients);
        setClients(clientsList.map((c: any) => ({ id: c.id, name: c.name })));
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const saveTasks = (tasksList: Task[]) => {
    try {
      localStorage.setItem('tasks', JSON.stringify(tasksList));
    } catch (error) {
      console.error('Erro ao salvar tarefas:', error);
    }
  };

  const onSubmit = (data: TaskFormData) => {
    const newTask: Task = {
      id: editingTask?.id || Date.now().toString(),
      ...data,
      created_at: editingTask?.created_at || new Date().toISOString(),
    };

    if (editingTask) {
      const updatedTasks = tasks.map(task =>
        task.id === editingTask.id ? newTask : task
      );
      setTasks(updatedTasks);
      saveTasks(updatedTasks);
    } else {
      const updatedTasks = [newTask, ...tasks];
      setTasks(updatedTasks);
      saveTasks(updatedTasks);
    }

    setIsModalOpen(false);
    setEditingTask(null);
    reset({ priority: 'media', status: 'pendente' });
  };

  const deleteTask = (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

    const updatedTasks = tasks.filter(task => task.id !== id);
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    reset({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate || '',
      assignedTo: task.assignedTo || '',
      clientId: task.clientId || '',
    });
    setIsModalOpen(true);
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'bg-red-100 text-red-700';
      case 'media': return 'bg-yellow-100 text-yellow-700';
      case 'baixa': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluida': return 'bg-green-100 text-green-700';
      case 'em_andamento': return 'bg-blue-100 text-blue-700';
      case 'pendente': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client?.name;
  };

  const tasksByStatus = {
    pendente: filteredTasks.filter(t => t.status === 'pendente'),
    em_andamento: filteredTasks.filter(t => t.status === 'em_andamento'),
    concluida: filteredTasks.filter(t => t.status === 'concluida'),
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const clientName = getClientName(task.clientId);
    
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow mb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-slate-900">{task.title}</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            </div>
            {task.description && (
              <p className="text-sm text-slate-600 mb-2">{task.description}</p>
            )}
            <div className="flex flex-col gap-1 text-sm text-slate-500">
              {task.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                </div>
              )}
              {task.assignedTo && (
                <div className="flex items-center gap-1">
                  <span>👤 {task.assignedTo}</span>
                </div>
              )}
              {clientName && (
                <div className="flex items-center gap-1">
                  <span>🏢 {clientName}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => openEditModal(task)}
              className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => deleteTask(task.id)}
              className="p-1 text-slate-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Tarefas</h1>
                <p className="text-slate-600 mt-1">Gerencie tarefas e checklists</p>
              </div>
              <div className="flex gap-3">
                <div className="flex gap-1 bg-white rounded-lg border border-slate-300 p-1">
                  <button
                    onClick={() => setViewMode('kanban')}
                    className={`px-3 py-2 rounded transition-colors ${
                      viewMode === 'kanban' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <LayoutGrid className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 rounded transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <List className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    setEditingTask(null);
                    reset({ priority: 'media', status: 'pendente' });
                    setIsModalOpen(true);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Nova Tarefa
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar tarefas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                <Filter className="h-5 w-5 text-slate-600" />
                Filtros
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-slate-600 mt-4">Carregando tarefas...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <CheckSquare className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma tarefa cadastrada</h3>
                <p className="text-slate-600 mb-6">Comece criando sua primeira tarefa</p>
                <button
                  onClick={() => {
                    setEditingTask(null);
                    reset({ priority: 'media', status: 'pendente' });
                    setIsModalOpen(true);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all inline-flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Criar Tarefa
                </button>
              </div>
            ) : viewMode === 'kanban' ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-slate-400 rounded-full"></span>
                    Pendente ({tasksByStatus.pendente.length})
                  </h3>
                  <div>
                    {tasksByStatus.pendente.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    Em Andamento ({tasksByStatus.em_andamento.length})
                  </h3>
                  <div>
                    {tasksByStatus.em_andamento.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    Concluída ({tasksByStatus.concluida.length})
                  </h3>
                  <div>
                    {tasksByStatus.concluida.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Título *
                  </label>
                  <input
                    {...register('title')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Título da tarefa"
                  />
                  {errors.title && (
                    <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Descrição da tarefa"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Prioridade *
                    </label>
                    <select
                      {...register('priority')}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Status *
                    </label>
                    <select
                      {...register('status')}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_andamento">Em Andamento</option>
                      <option value="concluida">Concluída</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Data de Vencimento
                  </label>
                  <input
                    {...register('dueDate')}
                    type="date"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Responsável
                  </label>
                  <select
                    {...register('assignedTo')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione um responsável</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.name}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Cliente
                  </label>
                  <select
                    {...register('clientId')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingTask(null);
                      reset({ priority: 'media', status: 'pendente' });
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
                  >
                    {editingTask ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
