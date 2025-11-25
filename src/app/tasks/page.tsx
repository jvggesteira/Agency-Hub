'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { CheckSquare, Plus, Search, Filter, Edit, Trash2, Calendar, LayoutGrid, List, X } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core';
import { KanbanColumn } from '@/components/custom/kanban-column';
import { SortableTaskCard } from '@/components/custom/sortable-task-card';
import { toast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/use-permission';
import AccessDenied from '@/components/custom/access-denied';

const taskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  priority: z.enum(['baixa', 'media', 'alta']),
  status: z.enum(['pendente', 'em_andamento', 'concluida', 'cancelada']),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
  clientId: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

type TaskStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
type TaskPriority = 'baixa' | 'media' | 'alta' | 'all';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'baixa' | 'media' | 'alta';
  status: TaskStatus;
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

const STATUS_COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'pendente', title: 'Pendente', color: 'bg-slate-400 dark:bg-slate-600' },
  { id: 'em_andamento', title: 'Em Andamento', color: 'bg-blue-500' },
  { id: 'concluida', title: 'Concluída', color: 'bg-green-500' },
  { id: 'cancelada', title: 'Cancelada', color: 'bg-red-500' },
];

export default function TasksPage() {
  const { can } = usePermission();

  if (!can('tasks', 'view')) {
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

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
      toast({
        title: "Tarefa Atualizada",
        description: `A tarefa "${newTask.title}" foi atualizada com sucesso.`,
      });
    } else {
      const updatedTasks = [newTask, ...tasks];
      setTasks(updatedTasks);
      saveTasks(updatedTasks);
      toast({
        title: "Tarefa Criada",
        description: `A tarefa "${newTask.title}" foi criada com sucesso.`,
      });
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
    toast({
      title: "Tarefa Excluída",
      description: "A tarefa foi removida permanentemente.",
      variant: "destructive",
    });
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

  const getClientName = (clientId?: string) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Cliente Desconhecido';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'media': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'baixa': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    if (active.data.current?.sortable.containerId === newStatus) {
      return;
    }

    if (['pendente', 'em_andamento', 'concluida', 'cancelada'].includes(newStatus)) {
      const updatedTasks = tasks.map(task => {
        if (task.id === taskId) {
          return { ...task, status: newStatus };
        }
        return task;
      });

      setTasks(updatedTasks);
      saveTasks(updatedTasks);
      toast({
        title: "Status Atualizado",
        description: `Tarefa movida para "${STATUS_COLUMNS.find(c => c.id === newStatus)?.title}".`,
      });
    }
  };

  const applyFilters = (task: Task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClientName(task.clientId)?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesClient = clientFilter === 'all' || task.clientId === clientFilter;

    return matchesPriority && matchesClient;
  };

  const filteredTasks = tasks.filter(applyFilters);

  const tasksByStatus = filteredTasks.reduce((acc, task) => {
    acc[task.status] = acc[task.status] || [];
    acc[task.status].push(task);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  const TaskCard = ({ task }: { task: Task }) => {
    const clientName = getClientName(task.clientId);
    
    return (
      <div className="bg-white dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow mb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-slate-900 dark:text-white">{task.title}</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            </div>
            {task.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">{task.description}</p>
            )}
            <div className="flex flex-col gap-1 text-sm text-slate-500 dark:text-slate-500">
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
          <div className="flex gap-1 ml-4">
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
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Tarefas</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Gerencie tarefas e checklists</p>
              </div>
              <div className="flex gap-3">
                <div className="flex gap-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-700 p-1">
                  <button
                    onClick={() => setViewMode('kanban')}
                    className={`px-3 py-2 rounded transition-colors ${
                      viewMode === 'kanban' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Visualização Kanban"
                  >
                    <LayoutGrid className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 rounded transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Visualização Lista"
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
                  className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <Plus className="h-5 w-5" />
                  Nova Tarefa
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar tarefas..."
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
                <p className="text-slate-600 dark:text-slate-400 mt-4">Carregando tarefas...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                    <CheckSquare className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Nenhuma tarefa cadastrada</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">Comece criando sua primeira tarefa</p>
                <button
                  onClick={() => {
                    setEditingTask(null);
                    reset({ priority: 'media', status: 'pendente' });
                    setIsModalOpen(true);
                  }}
                  className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all inline-flex items-center gap-2 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <Plus className="h-5 w-5" />
                  Criar Tarefa
                </button>
              </div>
            ) : viewMode === 'kanban' ? (
              <DndContext 
                collisionDetection={closestCorners}
                onDragEnd={handleDragEnd}
              >
                <div className="grid grid-cols-4 gap-4 min-h-[500px]">
                  {STATUS_COLUMNS.map(column => (
                    <KanbanColumn 
                      key={column.id} 
                      id={column.id} 
                      title={column.title} 
                      tasks={tasksByStatus[column.id] || []}
                      color={column.color}
                    >
                      {(tasksByStatus[column.id] || []).map(task => (
                        <SortableTaskCard 
                          key={task.id} 
                          task={task} 
                          clientName={getClientName(task.clientId)}
                          getPriorityColor={getPriorityColor}
                          openEditModal={openEditModal}
                          deleteTask={deleteTask}
                        />
                      ))}
                    </KanbanColumn>
                  ))}
                </div>
              </DndContext>
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

      {/* Modal Tarefa (Criação/Edição) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Título *
                  </label>
                  <input
                    {...register('title')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                    placeholder="Título da tarefa"
                  />
                  {errors.title && (
                    <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Descrição
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                    placeholder="Descrição da tarefa"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Prioridade *
                    </label>
                    <select
                      {...register('priority')}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:bg-slate-900"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Status *
                    </label>
                    <select
                      {...register('status')}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:bg-slate-900"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_andamento">Em Andamento</option>
                      <option value="concluida">Concluída</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Data de Vencimento
                  </label>
                  <input
                    {...register('dueDate')}
                    type="date"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Responsável
                  </label>
                  <select
                    {...register('assignedTo')}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:bg-slate-900"
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
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cliente
                  </label>
                  <select
                    {...register('clientId')}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:bg-slate-900"
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingTask(null);
                      reset({ priority: 'media', status: 'pendente' });
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:bg-slate-800 transition-all dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {editingTask ? 'Atualizar' : 'Salvar'}
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
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Filtrar Tarefas</h2>
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
                    Prioridade
                  </label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:bg-slate-900"
                  >
                    <option value="all">Todas</option>
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cliente
                  </label>
                  <select
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:bg-slate-900"
                  >
                    <option value="all">Todos os Clientes</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setPriorityFilter('all');
                    setClientFilter('all');
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