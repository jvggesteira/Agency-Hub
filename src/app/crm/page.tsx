'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { KanbanColumn } from '@/components/custom/kanban-column';
import { SortableTaskCard } from '@/components/custom/sortable-task-card';
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core';
import { 
  Plus, UserPlus, X, ListTodo, History, Clock, Search, Copy
} from 'lucide-react';
import { usePermission } from '@/hooks/use-permission';
import AccessDenied from '@/components/custom/access-denied';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// --- SCHEMAS ---
const leadSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  budget: z.string().optional(),
  source: z.string().optional(),
  customSource: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['novo', 'contato', 'proposta', 'negociacao', 'ganho', 'perdido']),
});

type LeadFormData = z.infer<typeof leadSchema>;
type LeadStatus = 'novo' | 'contato' | 'proposta' | 'negociacao' | 'ganho' | 'perdido';

// Tipos de Banco de Dados
interface Pipeline {
  id: string;
  name: string;
}

interface LeadActivity {
  id: string;
  type: 'note' | 'status_change' | 'task_created' | 'task_completed';
  content: string;
  created_at: string;
}

interface LeadTask {
  id: string;
  title: string;
  due_date: string;
  is_completed: boolean;
}

interface Lead {
  id: string;
  title: string;
  description?: string;
  priority: 'baixa' | 'media' | 'alta'; 
  status: LeadStatus;
  email: string;
  phone: string;
  company: string;
  budget: string;
  source: string;
  created_at: string;
  notes?: string;
  pipeline_id?: string;
}

const PIPELINE_COLUMNS: { id: LeadStatus; title: string; color: string }[] = [
  { id: 'novo', title: 'Novos Leads', color: 'bg-blue-500' },
  { id: 'contato', title: 'Em Contato', color: 'bg-yellow-500' },
  { id: 'proposta', title: 'Proposta Enviada', color: 'bg-purple-500' },
  { id: 'negociacao', title: 'Negociação', color: 'bg-orange-500' },
  { id: 'ganho', title: 'Fechado (Ganho)', color: 'bg-green-500' },
  { id: 'perdido', title: 'Perdido', color: 'bg-red-500' },
];

const SOURCES = [
    { value: 'facebook_ads', label: 'Facebook Ads' },
    { value: 'google_ads', label: 'Google Ads' },
    { value: 'ligacao', label: 'Ligação' },
    { value: 'organico', label: 'Orgânico' },
    { value: 'indicacao', label: 'Indicação' },
    { value: 'networking', label: 'Networking' },
    { value: 'eventos', label: 'Eventos' },
    { value: 'site', label: 'Site' },
];

// --- FUNÇÕES DE FORMATAÇÃO ---
const formatPhone = (value: string) => {
  if (!value) return "";
  value = value.replace(/\D/g, "");
  if (value.length > 11) value = value.slice(0, 11);
  if (value.length > 10) return value.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  else if (value.length > 5) return value.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  else if (value.length > 2) return value.replace(/(\d{2})(\d{0,5})/, "($1) $2");
  return value;
};

const formatCurrencyInput = (value: string) => {
  if (!value) return "";
  const numericValue = value.replace(/\D/g, "");
  const amount = parseFloat(numericValue) / 100;
  if (isNaN(amount)) return "";
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const parseCurrency = (value?: string) => {
    if (!value) return 0;
    const cleanStr = value.replace(/[^\d,]/g, '').replace(',', '.');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
};

const formatCurrencyDisplay = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};


export default function CRMPage() {
  const { can } = usePermission();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [currentPipelineId, setCurrentPipelineId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: { status: 'novo' as LeadStatus },
  });

  const selectedSource = watch('source');

  useEffect(() => {
    if (typeof window !== 'undefined') setWebhookUrl(`${window.location.origin}/api/leads`);
    initializeCRM();
  }, []);

  const initializeCRM = async () => {
    setLoading(true);
    const { data: pipes } = await supabase.from('pipelines').select('*').order('created_at');
    
    if (pipes && pipes.length > 0) {
      setPipelines(pipes);
      if (!currentPipelineId) setCurrentPipelineId(pipes[0].id);
    } else {
      const { data: newPipe } = await supabase.from('pipelines').insert({ name: 'Funil Geral' }).select().single();
      if (newPipe) {
        setPipelines([newPipe]);
        setCurrentPipelineId(newPipe.id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
      if (currentPipelineId) fetchLeads(currentPipelineId);
  }, [currentPipelineId]);

  const fetchLeads = async (pipelineId: string) => {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('pipeline_id', pipelineId) 
      .order('created_at', { ascending: false });
    
    if (data) {
      const formattedLeads: Lead[] = data.map(l => ({
        id: l.id,
        title: l.name,
        description: l.company || l.email,
        priority: 'media',
        status: l.status as LeadStatus,
        email: l.email,
        phone: l.phone || '',
        company: l.company || '',
        budget: l.budget || '',
        source: l.source || 'manual',
        notes: l.notes || '',
        created_at: l.created_at,
        pipeline_id: l.pipeline_id
      }));
      setLeads(formattedLeads);
    }
  };

  const fetchLeadDetails = async (leadId: string) => {
    const { data: acts } = await supabase.from('lead_activities').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
    if (acts) setActivities(acts);

    const { data: tsks } = await supabase.from('lead_tasks').select('*').eq('lead_id', leadId).order('due_date', { ascending: true });
    if (tsks) setTasks(tsks);
  };

  const handleAddNote = async () => {
    if (!selectedLead || !newNote.trim()) return;
    
    const { error } = await supabase.from('lead_activities').insert({
      lead_id: selectedLead.id,
      type: 'note',
      content: newNote
    });

    if (!error) {
      setNewNote('');
      fetchLeadDetails(selectedLead.id);
      toast({ title: "Nota adicionada!" });
    }
  };

  const handleAddTask = async () => {
    if (!selectedLead || !newTaskTitle.trim() || !newTaskDate) {
        toast({ title: "Erro", description: "Preencha o título e a data da tarefa.", variant: "destructive" });
        return;
    }

    const { error } = await supabase.from('lead_tasks').insert({
      lead_id: selectedLead.id,
      title: newTaskTitle,
      due_date: new Date(newTaskDate).toISOString(),
      is_completed: false
    });

    if (!error) {
      setNewTaskTitle('');
      setNewTaskDate('');
      fetchLeadDetails(selectedLead.id);
      await supabase.from('lead_activities').insert({
        lead_id: selectedLead.id,
        type: 'task_created',
        content: `Tarefa criada: ${newTaskTitle}`
      });
      toast({ title: "Tarefa agendada!", description: "Você será notificado no dia." });
    }
  };

  const toggleTask = async (taskId: string, currentStatus: boolean) => {
      await supabase.from('lead_tasks').update({ is_completed: !currentStatus }).eq('id', taskId);
      if (selectedLead) fetchLeadDetails(selectedLead.id);
  };

  const createPipeline = async () => {
      const name = prompt("Nome do novo Pipeline (ex: Inbound, Outbound):");
      if (!name || name.trim() === "") return;

      try {
          const { data, error } = await supabase.from('pipelines').insert({ name }).select().single();
          if (error) throw error;

          if (data) {
              setPipelines([...pipelines, data]);
              setCurrentPipelineId(data.id);
              fetchLeads(data.id); 
              alert("Pipeline criado com sucesso!");
          }
      } catch (err: any) {
          alert(`Erro inesperado: ${err.message}`);
      }
  };
  
  // --- AQUI ESTA A CORREÇÃO: CONVERSÃO SEM BLOQUEIO DE DUPLICIDADE ---
  const convertToClient = async (lead: Lead) => {
    console.log("🔄 Convertendo lead em cliente (permitindo duplicidade):", lead.email);

    const { error } = await supabase.from('clients').insert({
      name: lead.title,
      email: lead.email,
      phone: lead.phone || '',
      company: lead.company || '',
      notes: `[Origem CRM] ${lead.notes || ''}`,
      contract_start_date: new Date().toISOString().split('T')[0], 
      status: 'active'
    });
    
    if (error) {
        console.error("Erro ao criar cliente:", error);
        
        if (error.message.includes('column "contract_start_date"')) {
            await supabase.from('clients').insert({
                name: lead.title,
                email: lead.email,
                phone: lead.phone || '',
                company: lead.company || '',
                notes: `[Origem CRM] ${lead.notes || ''}`,
                contractStartDate: new Date().toISOString().split('T')[0], 
                status: 'active'
            });
             toast({ title: "🎉 Cliente Fechado!", description: "Salvo (formato antigo).", className: "bg-green-600 text-white" });
        } else {
             toast({ title: "Erro", description: `Erro no banco: ${error.message}`, variant: "destructive" });
        }
    } else {
        toast({ title: "🎉 Cliente Fechado!", description: `${lead.title} foi cadastrado como novo cliente!`, className: "bg-green-600 text-white border-none" });
    }
  };

  const onModalSubmit = async (data: LeadFormData) => {
    try {
      let finalSource = data.source;
      if (data.source === 'outro' && data.customSource) finalSource = data.customSource;

      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        notes: data.notes,
        status: data.status,
        source: finalSource,
        budget: data.budget,
        pipeline_id: currentPipelineId 
      };

      if (editingLead) {
        await supabase.from('leads').update(payload).eq('id', editingLead.id);
        toast({ title: "Sucesso", description: "Lead atualizado." });
      } else {
        await supabase.from('leads').insert(payload);
        toast({ title: "Sucesso", description: "Lead criado." });
      }
      
      fetchLeads(currentPipelineId);
      setIsModalOpen(false);
      setEditingLead(null);
      reset();
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    }
  };
  
  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    const standardSources = SOURCES.map(s => s.value);
    const isStandardSource = standardSources.includes(lead.source || '');

    reset({
        name: lead.title,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        budget: lead.budget,
        source: isStandardSource ? lead.source : 'outro',
        customSource: isStandardSource ? '' : lead.source,
        notes: lead.notes,
        status: lead.status
    });
    setIsModalOpen(true);
  }

  const deleteLead = async (id: string) => {
      if(!confirm("Tem certeza que deseja excluir este lead?")) return;

      try {
          const { error } = await supabase.from('leads').delete().eq('id', id);
          if (error) throw error;
          
          setLeads(leads.filter(l => l.id !== id));
          toast({ title: "Excluído", description: "Lead removido do pipeline." });
      } catch (error) {
          toast({ title: "Erro", description: "Erro ao excluir lead.", variant: "destructive" });
      }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const leadId = active.id as string;
    const newStatus = over.id as LeadStatus;
    const currentLead = leads.find(l => l.id === leadId);

    if (currentLead && currentLead.status !== newStatus) {
        setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
        await supabase.from('leads').update({ status: newStatus }).eq('id', leadId);

        if (newStatus === 'ganho') {
            await convertToClient(currentLead);
        }
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
        const matchSearch = 
            lead.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.phone.includes(searchTerm) ||
            lead.company.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchSource = sourceFilter === 'all' || lead.source === sourceFilter;

        return matchSearch && matchSource; 
    });
  }, [leads, searchTerm, sourceFilter]);

  const leadsByStatus = PIPELINE_COLUMNS.reduce((acc, col) => {
    acc[col.id] = filteredLeads.filter(lead => lead.status === col.id);
    return acc;
  }, {} as Record<LeadStatus, Lead[]>);

  const totalsByStatus = PIPELINE_COLUMNS.reduce((acc, col) => {
      const leadsInColumn = leadsByStatus[col.id] || [];
      const total = leadsInColumn.reduce((sum, lead) => sum + parseCurrency(lead.budget), 0);
      acc[col.id] = total;
      return acc;
  }, {} as Record<LeadStatus, number>);

  const openDetailModal = (lead: Lead) => {
      setSelectedLead(lead);
      fetchLeadDetails(lead.id);
      setIsDetailModalOpen(true);
  }

  const copyWebhook = () => {
      navigator.clipboard.writeText(webhookUrl);
      toast({ title: "Copiado!", description: "URL do Webhook copiada." });
  }

  if (!can('crm', 'view')) {
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

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          
          <div className="mb-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Pipeline de Vendas</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Gerencie seus leads de tráfego pago e conversões</p>
              
              <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-2">
                {pipelines.map(p => (
                    <button 
                        key={p.id}
                        onClick={() => { setCurrentPipelineId(p.id); }}
                        className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                            currentPipelineId === p.id 
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                        }`}
                    >
                        {p.name}
                    </button>
                ))}
                <button onClick={createPipeline} className="p-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white">
                    <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="flex gap-3">
                 <div className="hidden md:flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Webhook URL:</span>
                    <code className="text-xs bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded text-slate-700 dark:text-slate-300 max-w-[150px] truncate">
                        {webhookUrl || 'Carregando...'}
                    </code>
                    <button onClick={copyWebhook} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                        <Copy className="h-4 w-4 text-slate-500" />
                    </button>
                 </div>

                <Button onClick={() => { setEditingLead(null); reset(); setIsModalOpen(true); }} className="bg-slate-900 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                    <UserPlus className="h-4 w-4 mr-2" /> Novo Lead
                </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-col md:flex-row gap-4 items-center transition-colors">
            <div className="flex-1 relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                    placeholder="Buscar por nome, email, telefone..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                 <select 
                    value={sourceFilter} 
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent dark:text-white text-sm min-w-[140px] dark:bg-slate-900"
                >
                    <option value="all">Todas as Fontes</option>
                    {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    <option value="outro">Outros</option>
                </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 dark:border-white"></div></div>
          ) : (
            <div className="h-[calc(100vh-280px)] overflow-x-auto pb-4">
                 <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                    <div className="flex gap-4 min-w-[1600px] h-full">
                        {PIPELINE_COLUMNS.map(column => (
                            <div key={column.id} className="flex flex-col h-full w-80">
                                <div className="mb-3 flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                            <span className={`w-3 h-3 rounded-full ${column.color}`}></span>
                                            {column.title}
                                        </span>
                                        <span className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400">
                                            {leadsByStatus[column.id]?.length || 0}
                                        </span>
                                    </div>
                                    <div className="text-sm font-bold text-slate-900 dark:text-white pl-5">
                                        {formatCurrencyDisplay(totalsByStatus[column.id])}
                                    </div>
                                </div>

                                <KanbanColumn 
                                    id={column.id} 
                                    title="" 
                                    tasks={leadsByStatus[column.id] || []}
                                    color={column.color}
                                >
                                    {(leadsByStatus[column.id] || []).map(lead => (
                                        <div onClick={() => openDetailModal(lead)} key={lead.id} className="cursor-pointer">
                                            <SortableTaskCard 
                                                task={lead as any}
                                                clientName={lead.company || lead.email}
                                                getPriorityColor={() => 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}
                                                openEditModal={() => openEditModal(lead)}
                                                deleteTask={() => deleteLead(lead.id)}
                                            />
                                        </div>
                                    ))}
                                </KanbanColumn>
                            </div>
                        ))}
                    </div>
                 </DndContext>
            </div>
          )}
        </main>
      </div>

      {isDetailModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-950 h-full shadow-2xl p-6 overflow-y-auto border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedLead.title}</h2>
                        <p className="text-slate-500 dark:text-slate-400">{selectedLead.company}</p>
                        <div className="flex gap-2 mt-2">
                             <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs dark:text-white">
                                Fonte: {selectedLead.source}
                             </span>
                             <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs dark:text-white">
                                {selectedLead.budget}
                             </span>
                        </div>
                    </div>
                    <button onClick={() => setIsDetailModalOpen(false)}><X className="h-6 w-6 text-slate-400 hover:text-slate-600" /></button>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            <ListTodo className="h-4 w-4" /> Tarefas & Lembretes
                        </h3>
                        <div className="flex gap-2 mb-4">
                            <Input 
                                placeholder="Ex: Ligar para cliente..." 
                                value={newTaskTitle}
                                onChange={e => setNewTaskTitle(e.target.value)}
                                className="dark:bg-slate-950"
                            />
                            <Input 
                                type="datetime-local"
                                value={newTaskDate}
                                onChange={e => setNewTaskDate(e.target.value)}
                                className="w-40 dark:bg-slate-950"
                            />
                            <Button size="sm" onClick={handleAddTask} className="bg-slate-900 dark:bg-white dark:text-slate-900">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {tasks.map(task => {
                                const isOverdue = !task.is_completed && new Date(task.due_date) < new Date();
                                return (
                                    <div key={task.id} className="flex items-center gap-3 p-2 bg-white dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800">
                                        <input 
                                            type="checkbox" 
                                            checked={task.is_completed}
                                            onChange={() => toggleTask(task.id, task.is_completed)}
                                            className="w-4 h-4 rounded border-slate-300"
                                        />
                                        <div className={`flex-1 ${task.is_completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                            <p className="text-sm font-medium">{task.title}</p>
                                            <p className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-slate-400'}`}>
                                                <Clock className="h-3 w-3" /> 
                                                {isOverdue ? 'Vencida:' : 'Prazo:'} {new Date(task.due_date).toLocaleString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                            {tasks.length === 0 && <p className="text-xs text-slate-400 text-center py-2">Nenhuma tarefa agendada.</p>}
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            <History className="h-4 w-4" /> Histórico & Notas
                        </h3>
                        <div className="flex gap-2 mb-6">
                            <Input 
                                placeholder="Adicionar uma nota..." 
                                value={newNote}
                                onChange={e => setNewNote(e.target.value)}
                                className="dark:bg-slate-900"
                            />
                            <Button size="sm" onClick={handleAddNote} className="bg-slate-900 dark:bg-white dark:text-slate-900">Enviar</Button>
                        </div>
                        
                        <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 space-y-6 pb-10">
                            {activities.map((act) => (
                                <div key={act.id} className="relative pl-6">
                                    <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white dark:border-slate-950 ${
                                        act.type === 'status_change' ? 'bg-blue-500' : 
                                        act.type === 'task_created' ? 'bg-orange-500' : 'bg-slate-400'
                                    }`}></div>
                                    <div className="text-xs text-slate-400 mb-1">
                                        {new Date(act.created_at).toLocaleString('pt-BR')}
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-sm text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                                        {act.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border dark:border-slate-800">
              <div className="flex justify-between mb-4">
                  <h2 className="text-xl font-bold dark:text-white">{editingLead ? 'Editar' : 'Novo'} Lead</h2>
                  <button onClick={() => setIsModalOpen(false)}><X className="dark:text-white"/></button>
              </div>
              <form onSubmit={handleSubmit(onModalSubmit)} className="space-y-4">
                <input type="hidden" {...register('status')} /> 
                
                <div className="grid grid-cols-2 gap-3">
                    <Input {...register('name')} placeholder="Nome" className="dark:bg-slate-950" />
                    {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                    <Input {...register('email')} placeholder="Email" className="dark:bg-slate-950" />
                    {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                </div>
                
                <Input 
                    {...register('phone')} 
                    placeholder="Telefone" 
                    className="dark:bg-slate-950"
                    onChange={(e) => {
                        e.target.value = formatPhone(e.target.value);
                        register('phone').onChange(e);
                    }}
                />
                <Input {...register('company')} placeholder="Empresa" className="dark:bg-slate-950" />

                <div className="grid grid-cols-2 gap-3">
                    <Input 
                        {...register('budget')} 
                        placeholder="Orçamento" 
                        className="dark:bg-slate-950" 
                        onChange={(e) => {
                            e.target.value = formatCurrencyInput(e.target.value);
                            register('budget').onChange(e);
                        }}
                    />
                    <select {...register('source')} className="w-full h-10 rounded-md border bg-transparent px-3 text-sm dark:border-slate-800 dark:text-white">
                        <option value="">Fonte...</option>
                        {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        <option value="outro">Outro</option>
                    </select>
                </div>
                
                {selectedSource === 'outro' && <Input {...register('customSource')} placeholder="Qual?" className="dark:bg-slate-950" />}
                
                <textarea {...register('notes')} placeholder="Notas / Briefing" className="w-full px-3 py-2 border dark:border-slate-800 rounded-lg bg-transparent dark:text-white" />

                <Button type="submit" className="w-full bg-slate-900 dark:bg-white dark:text-slate-900">Salvar</Button>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}