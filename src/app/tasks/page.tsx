'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { CheckSquare, Plus, Search, Filter, Calendar, LayoutGrid, List, X, MessageSquare, Send, Clock } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DndContext, DragEndEvent, pointerWithin } from '@dnd-kit/core';
import { KanbanColumn } from '@/components/custom/kanban-column';
import { SortableTaskCard } from '@/components/custom/sortable-task-card';
import { toast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/use-permission';
import { useAuth } from '@/hooks/use-auth';
import AccessDenied from '@/components/custom/access-denied';
import { createClient } from '@supabase/supabase-js';


// --- 1. CONFIGURAÇÃO DO CLIENTE SUPABASE ---
// Criado fora do componente para manter a conexão estável e evitar loops
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- Esquemas e Tipos ---
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
  client_name?: string;
  assignee_name?: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
}

interface Client {
  id: string;
  name: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name?: string;
}

const STATUS_COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'pendente', title: 'Pendente', color: 'bg-slate-400 dark:bg-slate-600' },
  { id: 'em_andamento', title: 'Em Andamento', color: 'bg-blue-500' },
  { id: 'concluida', title: 'Concluída', color: 'bg-green-500' },
  { id: 'cancelada', title: 'Cancelada', color: 'bg-red-500' },
];

export default function TasksPage() {
  const { can } = usePermission();
  const { user } = useAuth();

  // --- 2. Declaração de Estados ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [activeTab, setActiveTab] = useState<'details' | 'comments'>('details');
  const [newComment, setNewComment] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

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

  // --- 3. Função de Busca de Dados (Atualizada e com Logs) ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Carregar Clientes
      const { data: clientsData } = await supabase.from('clients').select('id, name');
      if (clientsData) setClients(clientsData);

      // 2. Carregar Membros (COM DEBUG)
      // Selecionamos explicitamente id, full_name e email
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      // LOGS para você ver no console do navegador (F12)
      console.log("DEBUG - Dados brutos do Profiles:", profilesData);
      
      if (profilesError) {
        console.error("DEBUG - Erro ao buscar Profiles:", profilesError);
      }

      if (profilesData) {
        // Mapeamento para garantir que nunca falte nome
        const validMembers = profilesData.map((p: any) => ({
             id: p.id,
             full_name: p.full_name || p.email || 'Usuário sem nome', // Fallback se não tiver nome
             email: p.email || ''
        }));
        setTeamMembers(validMembers);
      }

      // 3. Carregar Tarefas
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`*, client:clients(name), assignee:profiles(full_name)`)
        .order('created_at', { ascending: false });

      if (tasksError) console.error("Erro ao buscar tarefas:", tasksError);

      if (tasksData) {
        const mappedTasks: Task[] = tasksData.map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          status: t.status,
          dueDate: t.due_date,
          assignedTo: t.assignee_id,
          clientId: t.client_id,
          created_at: t.created_at,
          client_name: t.client?.name,
          assignee_name: t.assignee?.full_name
        }));
        setTasks(mappedTasks);
      }
    } catch (error) {
      console.error('Erro Geral:', error);
      toast({ title: 'Erro', description: 'Falha ao carregar dados.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // --- 4. UseEffect para carregar dados ao iniciar ---
  useEffect(() => {
    fetchData(); 
  }, []); 

  // --- CRUD e Lógicas Auxiliares ---
  const onSubmit = async (data: TaskFormData) => {
    try {
      const payload = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        due_date: data.dueDate || null,
        client_id: data.clientId || null,
        assignee_id: data.assignedTo || null,
      };

      if (editingTask) {
        const { error } = await supabase.from('tasks').update(payload).eq('id', editingTask.id);
        if (error) throw error;
        toast({ title: "Tarefa Atualizada" });
      } else {
        const { error } = await supabase.from('tasks').insert([payload]);
        if (error) throw error;
        toast({ title: "Tarefa Criada" });
      }

      setIsModalOpen(false);
      setEditingTask(null);
      reset({ priority: 'media', status: 'pendente' });
      fetchData(); 
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      toast({ title: "Erro", description: "Falha ao excluir.", variant: "destructive" });
    } else {
      setTasks(prev => prev.filter(t => t.id !== id));
      toast({ title: "Tarefa Excluída" });
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setActiveTab('details');
    reset({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate || '',
      assignedTo: task.assignedTo || '',
      clientId: task.clientId || '',
    });
    fetchComments(task.id);
    setIsModalOpen(true);
  };

  const fetchComments = async (taskId: string) => {
    // A sintaxe 'profiles!user_id' força o uso da chave estrangeira correta
    const { data, error } = await supabase
      .from('task_comments')
      .select(`
        id,
        content,
        created_at,
        user_id,
        profiles!user_id ( full_name )
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    
    if (error) {
        console.error("Erro detalhado ao buscar comentários:", error);
        toast({ title: "Erro", description: "Falha ao carregar observações.", variant: "destructive" });
        return;
    }
    
    if (data) {
      const mappedComments = data.map((c: any) => ({
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        user_id: c.user_id,
        // Como usamos a sintaxe explícita, o dado vem dentro de 'profiles'
        // O array [0] ou acesso direto depende da relação, mas geralmente vem como objeto único
        user_name: c.profiles?.full_name || 'Usuário'
      }));
      setComments(mappedComments);
    } else {
      setComments([]);
    }
  };

  // --- SUBSTITUA A FUNÇÃO handleAddComment POR ESTA ---
  const handleAddComment = async () => {
    // Validações básicas
    if (!newComment.trim()) return;
    if (!editingTask) {
        toast({ title: "Erro", description: "Nenhuma tarefa selecionada.", variant: "destructive" });
        return;
    }

    // AQUI MUDOU: Em vez de perguntar pro supabase, usamos o user do hook useAuth
    if (!user) {
        toast({ title: "Erro de Permissão", description: "Você precisa estar logado para comentar.", variant: "destructive" });
        return;
    }

    // Envia para o banco usando o ID do usuário já autenticado
    const { error } = await supabase.from('task_comments').insert({
      task_id: editingTask.id,
      user_id: user.id, // ID vindo do hook
      content: newComment
    });

    if (error) {
      console.error("Erro ao salvar comentário:", error);
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    } else {
      setNewComment(''); 
      fetchComments(editingTask.id); 
      toast({ title: "Observação enviada!" });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    // 1. Se soltou fora de qualquer área detectável, cancela.
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string; // Tratamos como string primeiro

    // 2. TRAVA DE SEGURANÇA (O PULO DO GATO)
    // Só permite a mudança se o destino for REALMENTE uma das nossas colunas
    const validStatuses = ['pendente', 'em_andamento', 'concluida', 'cancelada'];
    
    if (!validStatuses.includes(newStatus)) {
        console.warn("Drop inválido ignorado:", newStatus);
        return; // Cancela a operação se soltou no "vão" ou lugar errado
    }

    // Se a tarefa já estava nessa coluna, não faz nada
    if (active.data.current?.sortable.containerId === newStatus) return;

    // 3. Atualização Otimista (Frontend)
    const oldTasks = [...tasks];
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus as TaskStatus } : task
    );
    setTasks(updatedTasks);

    // 4. Atualização no Banco (Backend)
    const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

    if (error) {
      console.error("Erro ao mover:", error);
      setTasks(oldTasks); // Reverte se der erro no banco
      toast({ title: "Erro ao mover", variant: "destructive" });
    }
  };

  // --- Filtros e Cálculos ---
  const applyFilters = (task: Task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    if (!matchesSearch) return false;

    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesClient = clientFilter === 'all' || task.clientId === clientFilter;
    const matchesAssignee = assigneeFilter === 'all' || task.assignedTo === assigneeFilter;
    return matchesPriority && matchesClient && matchesAssignee;
  };

  const filteredTasks = tasks.filter(applyFilters);
  const tasksByStatus = filteredTasks.reduce((acc, task) => {
    acc[task.status] = acc[task.status] || [];
    acc[task.status].push(task);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  const stats = {
    total: filteredTasks.length,
    pending: filteredTasks.filter(t => t.status === 'pendente').length,
    inProgress: filteredTasks.filter(t => t.status === 'em_andamento').length,
    done: filteredTasks.filter(t => t.status === 'concluida').length,
    canceled: filteredTasks.filter(t => t.status === 'cancelada').length
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'media': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'baixa': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  // --- Renderização ---
  if (!can('tasks', 'view')) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6"><AccessDenied /></main>
        </div>
      </div>
    );
  }

  const TaskCardList = ({ task }: { task: Task }) => (
    <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow mb-3 flex justify-between items-center">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">{task.title}</h3>
        <p className="text-sm text-slate-500">{task.client_name} • {task.assignee_name || 'Sem responsável'}</p>
      </div>
      <div className="flex items-center gap-2">
         <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(task.priority)}`}>{task.priority}</span>
         <button onClick={() => openEditModal(task)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">Editar</button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Tarefas</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Gerencie tarefas, prazos e responsáveis</p>
          </div>

          {/* DASHBOARD */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold">Total</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
             </div>
             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-l-4 border-l-slate-400 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold">Pendentes</p>
                <p className="text-2xl font-bold text-slate-500">{stats.pending}</p>
             </div>
             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-l-4 border-l-blue-500 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold">Em Andamento</p>
                <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
             </div>
             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-l-4 border-l-green-500 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold">Concluídas</p>
                <p className="text-2xl font-bold text-green-500">{stats.done}</p>
             </div>
             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-l-4 border-l-red-500 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold">Canceladas</p>
                <p className="text-2xl font-bold text-red-500">{stats.canceled}</p>
             </div>
          </div>

          {/* CONTROLES */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
              <div className="flex-1 relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text" placeholder="Buscar tarefas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent dark:text-white"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button onClick={() => setIsFilterModalOpen(true)} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <Filter className="h-5 w-5" /> Filtros
                </button>
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                  <button onClick={() => setViewMode('kanban')} className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-700 shadow' : ''}`}><LayoutGrid className="h-5 w-5" /></button>
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow' : ''}`}><List className="h-5 w-5" /></button>
                </div>
                <button
                  onClick={() => {
                    setEditingTask(null); setActiveTab('details'); reset({ priority: 'media', status: 'pendente' }); setComments([]); setIsModalOpen(true);
                  }}
                  className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2 dark:bg-white dark:text-slate-900"
                >
                  <Plus className="h-5 w-5" /> Nova
                </button>
              </div>
            </div>

            {/* KANBAN / LISTA */}
            {loading ? (
              <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Nenhuma tarefa encontrada.</p>
              </div>
            ) : viewMode === 'kanban' ? (
              <DndContext collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[500px]">
                  {STATUS_COLUMNS.map(column => (
                    <KanbanColumn key={column.id} id={column.id} title={column.title} color={column.color} tasks={tasksByStatus[column.id] || []}>
                      {(tasksByStatus[column.id] || []).map(task => (
                        <SortableTaskCard 
                          key={task.id} task={task} clientName={task.client_name ?? ""} 
                          getPriorityColor={getPriorityColor} openEditModal={openEditModal} deleteTask={deleteTask}
                        />
                      ))}
                    </KanbanColumn>
                  ))}
                </div>
              </DndContext>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map(task => <TaskCardList key={task.id} task={task} />)}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODAL DE TAREFA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold dark:text-white">{editingTask ? 'Detalhes' : 'Nova Tarefa'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>

            {editingTask && (
              <div className="flex border-b border-slate-200 dark:border-slate-800 px-6">
                <button onClick={() => setActiveTab('details')} className={`py-3 px-4 text-sm font-medium border-b-2 ${activeTab === 'details' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500'}`}>Dados</button>
                <button onClick={() => setActiveTab('comments')} className={`py-3 px-4 text-sm font-medium border-b-2 ${activeTab === 'comments' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500'}`}>Observações ({comments.length})</button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
              <div className={activeTab === 'details' ? 'block' : 'hidden'}>
                <form id="taskForm" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div><label className="block text-sm mb-1 dark:text-slate-300">Título *</label><input {...register('title')} className="w-full p-2 border rounded dark:bg-transparent dark:text-white dark:border-slate-700" /></div>
                  <div><label className="block text-sm mb-1 dark:text-slate-300">Descrição</label><textarea {...register('description')} rows={3} className="w-full p-2 border rounded dark:bg-transparent dark:text-white dark:border-slate-700" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm mb-1 dark:text-slate-300">Cliente</label>
                        <select {...register('clientId')} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white dark:border-slate-700">
                            <option value="">Selecione...</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm mb-1 dark:text-slate-300">Responsável</label>
                        <select {...register('assignedTo')} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white dark:border-slate-700">
                            <option value="">Selecione...</option>
                            {/* AQUI ESTÁ A LISTA DE USUÁRIOS */}
                            {teamMembers.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.full_name || m.email}
                                </option>
                            ))}
                        </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm mb-1 dark:text-slate-300">Prioridade</label><select {...register('priority')} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white dark:border-slate-700"><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></div>
                      <div><label className="block text-sm mb-1 dark:text-slate-300">Prazo</label><input type="date" {...register('dueDate')} className="w-full p-2 border rounded dark:bg-transparent dark:text-white dark:border-slate-700" /></div>
                  </div>
                  <div><label className="block text-sm mb-1 dark:text-slate-300">Status</label><select {...register('status')} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white dark:border-slate-700"><option value="pendente">Pendente</option><option value="em_andamento">Em Andamento</option><option value="concluida">Concluída</option><option value="cancelada">Cancelada</option></select></div>
                </form>
              </div>

              <div className={activeTab === 'comments' ? 'block space-y-4' : 'hidden'}>
                <div className="space-y-4 max-h-[300px] overflow-y-auto mb-4">
                   {comments.map(c => (
                      <div key={c.id} className="bg-slate-50 dark:bg-slate-800 p-3 rounded border dark:border-slate-700">
                         <div className="flex justify-between text-xs mb-1"><span className="font-bold text-blue-600">{c.user_name}</span><span className="text-slate-500">{new Date(c.created_at).toLocaleString()}</span></div>
                         <p className="text-sm dark:text-slate-300">{c.content}</p>
                      </div>
                   ))}
                </div>
                <div className="flex gap-2">
                   <input value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddComment()} placeholder="Escreva..." className="flex-1 p-2 border rounded dark:bg-transparent dark:text-white dark:border-slate-700" />
                   <button onClick={handleAddComment} className="bg-blue-600 text-white p-2 rounded"><Send size={18}/></button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t dark:border-slate-800 flex justify-end gap-3">
               <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-white dark:border-slate-700">Cancelar</button>
               {activeTab === 'details' && <button type="submit" form="taskForm" className="bg-slate-900 text-white px-6 py-2 rounded hover:bg-slate-800 dark:bg-white dark:text-slate-900">Salvar</button>}
            </div>
          </div>
        </div>
      )}

      {/* FILTROS */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-6 border dark:border-slate-800">
             <div className="flex justify-between mb-4"><h3 className="font-bold dark:text-white">Filtros</h3><button onClick={() => setIsFilterModalOpen(false)}><X /></button></div>
             <div className="space-y-3">
                <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as any)} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white dark:border-slate-700"><option value="all">Todas Prioridades</option><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></select>
                <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white dark:border-slate-700"><option value="all">Todos Clientes</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white dark:border-slate-700"><option value="all">Todos Responsáveis</option>{teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}</select>
             </div>
             <div className="flex gap-3 mt-6">
                <button onClick={() => { setPriorityFilter('all'); setClientFilter('all'); setAssigneeFilter('all'); setIsFilterModalOpen(false); }} className="flex-1 py-2 border rounded hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white">Limpar</button>
                <button onClick={() => setIsFilterModalOpen(false)} className="flex-1 py-2 bg-blue-600 text-white rounded">Aplicar</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}