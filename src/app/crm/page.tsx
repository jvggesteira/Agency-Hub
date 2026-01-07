'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { KanbanColumn } from '@/components/custom/kanban-column';
import { SortableTaskCard } from '@/components/custom/sortable-task-card';
import { 
  DndContext, 
  DragEndEvent, 
  pointerWithin,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  TouchSensor
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { 
  Plus, UserPlus, X, ListTodo, History, Clock, Search, Copy, Upload, FileText, CheckCircle, AlertCircle, 
  Settings, Trash2, ArrowRightLeft, Flame, Snowflake, Minus, ChevronUp, ChevronDown
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
  status: z.string(), 
  temperature: z.enum(['quente', 'morno', 'frio']).optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

// Tipos
interface Pipeline {
  id: string;
  name: string;
}

interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  position: number;
  color: string;
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
  priority: string; 
  temperature: 'quente' | 'morno' | 'frio'; 
  status: string; 
  email: string;
  phone: string;
  company: string;
  budget: string;
  source: string;
  created_at: string;
  notes?: string;
  pipeline_id?: string;
}

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

// --- FUNÇÕES DE FORMATAÇÃO (MANTIDAS DO SEU CÓDIGO ORIGINAL) ---
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
  const [stages, setStages] = useState<PipelineStage[]>([]); 
  const [currentPipelineId, setCurrentPipelineId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isWonModalOpen, setIsWonModalOpen] = useState(false);
  const [isPipelineSettingsOpen, setIsPipelineSettingsOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Estados de Edição
  const [pendingLeadToConvert, setPendingLeadToConvert] = useState<Lead | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Atividades
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  // Filtros e Config
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [transferTargetPipeline, setTransferTargetPipeline] = useState('');
  const [transferTargetStage, setTransferTargetStage] = useState('');
  const [targetStages, setTargetStages] = useState<PipelineStage[]>([]);
  const [editPipelineName, setEditPipelineName] = useState('');
  const [newStageName, setNewStageName] = useState('');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
  });

  // --- CONFIGURAÇÃO DE SENSORES PARA DRAG AND DROP ---
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    useSensor(TouchSensor)
  );

  useEffect(() => {
    if (typeof window !== 'undefined') setWebhookUrl(`${window.location.origin}/api/leads`);
    initializeCRM();
  }, []);

  useEffect(() => {
      if (currentPipelineId) {
          fetchStages(currentPipelineId);
          fetchLeads(currentPipelineId);
          const pipe = pipelines.find(p => p.id === currentPipelineId);
          if(pipe) setEditPipelineName(pipe.name);
      }
  }, [currentPipelineId, pipelines]);

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
        createDefaultStages(newPipe.id);
      }
    }
    setLoading(false);
  };

  const createDefaultStages = async (pipelineId: string) => {
      const defaults = ['Novos Leads', 'Em Contato', 'Proposta', 'Negociação', 'Ganho', 'Perdido'];
      const inserts = defaults.map((name, idx) => ({
          pipeline_id: pipelineId,
          name,
          position: idx,
          color: name === 'Ganho' ? 'bg-green-500' : name === 'Perdido' ? 'bg-red-500' : 'bg-slate-200'
      }));
      await supabase.from('pipeline_stages').insert(inserts);
      fetchStages(pipelineId);
  };

  const fetchStages = async (pipelineId: string) => {
      const { data } = await supabase.from('pipeline_stages').select('*').eq('pipeline_id', pipelineId).order('position');
      if (data) setStages(data);
  };

  const fetchLeads = async (pipelineId: string) => {
    const { data } = await supabase.from('leads').select('*').eq('pipeline_id', pipelineId).order('created_at', { ascending: false });
    
    if (data) {
      const formattedLeads: Lead[] = data.map(l => ({
        id: l.id,
        title: l.name,
        description: l.company || l.email,
        priority: 'media', 
        temperature: l.temperature || 'morno',
        status: l.status,
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
    const { error } = await supabase.from('lead_activities').insert({ lead_id: selectedLead.id, type: 'note', content: newNote });
    if (!error) { setNewNote(''); fetchLeadDetails(selectedLead.id); toast({ title: "Nota adicionada!" }); }
  };

  const handleAddTask = async () => {
    if (!selectedLead || !newTaskTitle.trim() || !newTaskDate) { toast({ title: "Erro", description: "Preencha o título e a data.", variant: "destructive" }); return; }
    const { error } = await supabase.from('lead_tasks').insert({ lead_id: selectedLead.id, title: newTaskTitle, due_date: new Date(newTaskDate).toISOString(), is_completed: false });
    if (!error) {
      setNewTaskTitle(''); setNewTaskDate(''); fetchLeadDetails(selectedLead.id);
      await supabase.from('lead_activities').insert({ lead_id: selectedLead.id, type: 'task_created', content: `Tarefa criada: ${newTaskTitle}` });
      toast({ title: "Tarefa agendada!" });
    }
  };

  const toggleTask = async (taskId: string, currentStatus: boolean) => {
      await supabase.from('lead_tasks').update({ is_completed: !currentStatus }).eq('id', taskId);
      if (selectedLead) fetchLeadDetails(selectedLead.id);
  };

  const onModalSubmit = async (data: LeadFormData) => {
    try {
      let finalSource = data.source;
      if (data.source === 'outro' && data.customSource) finalSource = data.customSource;
      const initialStatus = editingLead ? data.status : (stages[0]?.id || 'novo');
      const payload = {
        name: data.name, email: data.email, phone: data.phone, company: data.company, notes: data.notes,
        status: initialStatus, source: finalSource, budget: data.budget, pipeline_id: currentPipelineId, temperature: data.temperature || 'morno'
      };

      if (editingLead) {
        await supabase.from('leads').update(payload).eq('id', editingLead.id);
        toast({ title: "Sucesso", description: "Lead atualizado." });
      } else {
        await supabase.from('leads').insert(payload);
        toast({ title: "Sucesso", description: "Lead criado." });
      }
      fetchLeads(currentPipelineId); setIsModalOpen(false); setEditingLead(null); reset();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    const standardSources = SOURCES.map(s => s.value);
    const isStandardSource = standardSources.includes(lead.source || '');
    reset({
        name: lead.title, email: lead.email, phone: lead.phone, company: lead.company, budget: lead.budget,
        source: isStandardSource ? lead.source : 'outro', customSource: isStandardSource ? '' : lead.source,
        notes: lead.notes, status: lead.status, temperature: lead.temperature || 'morno'
    });
    setIsModalOpen(true);
  }

  const deleteLead = async (id: string) => {
      if(!confirm("Excluir este lead?")) return;
      try {
        const { error } = await supabase.from('leads').delete().eq('id', id);
        if(error) throw error;
        setLeads(leads.filter(l => l.id !== id));
        toast({ title: "Excluído", description: "Lead removido do pipeline." });
      } catch (error) {
        toast({ title: "Erro", description: "Erro ao excluir lead.", variant: "destructive" });
      }
  }

  const convertToClient = async (lead: Lead, contractUrl: string | null = null) => {
    const contractValue = parseCurrency(lead.budget);
    const { data: newClient, error } = await supabase.from('clients').insert({
      name: lead.title, email: lead.email, phone: lead.phone || '', company: lead.company || '',
      notes: `[Origem CRM] ${lead.notes || ''}`, contractStartDate: new Date().toISOString().split('T')[0],
      status: 'active', value: contractValue, contract_url: contractUrl
    }).select().single();
    
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }

    if (newClient) {
        const { data: leadActs } = await supabase.from('lead_activities').select('*').eq('lead_id', lead.id);
        if (leadActs && leadActs.length > 0) {
            const logsToInsert = leadActs.map(act => ({
                client_id: newClient.id, content: `[CRM] ${act.content}`, type: 'migration', created_at: act.created_at
            }));
            await supabase.from('client_logs').insert(logsToInsert);
        }
        await supabase.from('client_logs').insert({ client_id: newClient.id, content: `Venda fechada via CRM. Valor: ${lead.budget}.`, type: 'sale' });
        toast({ title: "Cliente Fechado!", className: "bg-green-600 text-white" });
    }
  };

  const handleConfirmWin = async () => {
    if (!pendingLeadToConvert) return;
    
    // 1. Validação do Arquivo
    if (!contractFile) {
        toast({ 
            title: "Documento Obrigatório", 
            description: "Para fechar a venda, é OBRIGATÓRIO anexar o contrato assinado ou comprovante.", 
            variant: "destructive" 
        });
        return;
    }

    setIsUploading(true);
    let publicUrl: string | null = null;

    try {
        // 2. Upload do Arquivo
        const cleanName = contractFile.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
        const fileName = `${Date.now()}_${cleanName}`;

        const { error: uploadError } = await supabase.storage.from('contracts').upload(fileName, contractFile, { cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;

        // 3. Descobrir o ID da coluna "Ganho"
        // Procuramos a coluna que tem "ganho" ou "fechado" no nome para garantir que o lead vá para o lugar certo visualmente
        const wonStage = stages.find(s => s.name.toLowerCase().includes('ganho') || s.name.toLowerCase().includes('fechado'));
        const newStatusId = wonStage ? wonStage.id : pendingLeadToConvert.status; // Fallback se não achar

        // 4. Atualizar o Status no Banco
        const { error: updateError } = await supabase
            .from('leads')
            .update({ status: newStatusId })
            .eq('id', pendingLeadToConvert.id);

        if (updateError) throw updateError;

        // 5. ATUALIZAR A INTERFACE (O PASSO QUE FALTAVA)
        setLeads(currentLeads => currentLeads.map(l => 
            l.id === pendingLeadToConvert.id 
                ? { ...l, status: newStatusId } 
                : l
        ));

        // 6. Converter para Cliente e Logs
        await convertToClient(pendingLeadToConvert, publicUrl);

        // 7. Limpeza e Fechamento
        setIsWonModalOpen(false);
        setPendingLeadToConvert(null);
        setContractFile(null);

    } catch (error: any) {
        console.error("Erro no processo de ganho:", error);
        toast({ title: "Erro ao processar", description: error.message, variant: "destructive" });
    } finally {
        setIsUploading(false);
    }
  };

  const handleCancelWin = () => {
      setIsWonModalOpen(false);
      setPendingLeadToConvert(null);
      setContractFile(null);
  };

  const openTransferModal = (lead: Lead) => { setSelectedLead(lead); setTransferTargetPipeline(''); setTargetStages([]); setIsTransferModalOpen(true); };

  useEffect(() => {
      if (transferTargetPipeline) {
          const fetchTargetStages = async () => {
              const { data } = await supabase.from('pipeline_stages').select('*').eq('pipeline_id', transferTargetPipeline).order('position');
              if (data) { setTargetStages(data); setTransferTargetStage(data[0]?.id || ''); }
          };
          fetchTargetStages();
      }
  }, [transferTargetPipeline]);

  const handleTransferLead = async () => {
      if (!selectedLead || !transferTargetPipeline || !transferTargetStage) return;
      await supabase.from('leads').update({ pipeline_id: transferTargetPipeline, status: transferTargetStage }).eq('id', selectedLead.id);
      setLeads(leads.filter(l => l.id !== selectedLead.id));
      setIsTransferModalOpen(false); setIsDetailModalOpen(false);
      toast({ title: "Lead transferido com sucesso!" });
  };

  const createPipeline = async () => {
      const name = prompt("Nome do novo Pipeline:");
      if (!name || name.trim() === "") return;
      try {
        const { data } = await supabase.from('pipelines').insert({ name }).select().single();
        if (data) { await createDefaultStages(data.id); setPipelines([...pipelines, data]); setCurrentPipelineId(data.id); alert("Pipeline criado com sucesso!"); }
      } catch(err: any) { alert(`Erro: ${err.message}`); }
  };

  const handleUpdatePipeline = async () => {
      await supabase.from('pipelines').update({ name: editPipelineName }).eq('id', currentPipelineId);
      setPipelines(pipelines.map(p => p.id === currentPipelineId ? { ...p, name: editPipelineName } : p));
      toast({ title: "Pipeline renomeado" });
  };

  const handleDeletePipeline = async () => {
      if (!confirm("Excluir este pipeline e todos os leads nele?")) return;
      await supabase.from('pipelines').delete().eq('id', currentPipelineId);
      const remaining = pipelines.filter(p => p.id !== currentPipelineId);
      setPipelines(remaining);
      if (remaining.length > 0) setCurrentPipelineId(remaining[0].id);
      setIsPipelineSettingsOpen(false);
  };

  const handleAddStage = async () => {
      if (!newStageName) return;
      const position = stages.length;
      const { data } = await supabase.from('pipeline_stages').insert({ pipeline_id: currentPipelineId, name: newStageName, position, color: 'bg-slate-200' }).select().single();
      if (data) { setStages([...stages, data]); setNewStageName(''); }
  };

  const handleDeleteStage = async (stageId: string) => {
      if (!confirm("Excluir coluna?")) return;
      await supabase.from('pipeline_stages').delete().eq('id', stageId);
      setStages(stages.filter(s => s.id !== stageId));
  };

  const moveStage = async (index: number, direction: 'up' | 'down') => {
      const newStages = [...stages];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
      const updatedStages = newStages.map((stage, idx) => ({ ...stage, position: idx }));
      setStages(updatedStages);
      const updates = updatedStages.map(s => ({ id: s.id, pipeline_id: s.pipeline_id, name: s.name, position: s.position, color: s.color }));
      await supabase.from('pipeline_stages').upsert(updates);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const newStatusId = over.id as string; 
    
    if (active.data.current?.sortable.containerId === newStatusId) return;

    const currentLead = leads.find(l => l.id === leadId);
    if (!currentLead || currentLead.status === newStatusId) return;

    const targetStage = stages.find(s => s.id === newStatusId);
    const isWonStage = targetStage?.name.toLowerCase().includes('ganho') || targetStage?.name.toLowerCase().includes('fechado');

    if (isWonStage) {
        setPendingLeadToConvert(currentLead);
        setIsWonModalOpen(true);
        return;
    }

    setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatusId } : l));
    await supabase.from('leads').update({ status: newStatusId }).eq('id', leadId);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
        const matchSearch = lead.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            lead.phone.includes(searchTerm) ||
                            lead.company.toLowerCase().includes(searchTerm.toLowerCase());
        const matchSource = sourceFilter === 'all' || lead.source === sourceFilter;
        return matchSearch && matchSource; 
    });
  }, [leads, searchTerm, sourceFilter]);

  const leadsByStage = useMemo(() => {
      const grouped: Record<string, Lead[]> = {};
      stages.forEach(s => grouped[s.id] = []);
      filteredLeads.forEach(lead => {
          if (grouped[lead.status]) grouped[lead.status].push(lead);
          else if (stages.length > 0) {
              const matchedStage = stages.find(s => s.name.toLowerCase().includes(lead.status.toLowerCase()));
              if(matchedStage) grouped[matchedStage.id].push(lead);
              else grouped[stages[0].id].push(lead);
          }
      });
      return grouped;
  }, [filteredLeads, stages]);

  const totalsByStatus = useMemo(() => {
      const totals: Record<string, number> = {};
      stages.forEach(s => {
          const leadsInColumn = leadsByStage[s.id] || [];
          totals[s.id] = leadsInColumn.reduce((sum, lead) => sum + parseCurrency(lead.budget), 0);
      });
      return totals;
  }, [leadsByStage, stages]);

  const getTemperatureBadge = (temp: string) => {
      switch(temp) {
          case 'quente': return { color: 'bg-red-100 text-red-600', icon: Flame };
          case 'frio': return { color: 'bg-blue-100 text-blue-600', icon: Snowflake };
          default: return { color: 'bg-yellow-100 text-yellow-600', icon: Minus };
      }
  };

  const openDetailModal = (lead: Lead) => {
      setSelectedLead(lead);
      fetchLeadDetails(lead.id);
      setIsDetailModalOpen(true);
  }

  const copyWebhook = () => { navigator.clipboard.writeText(webhookUrl); toast({ title: "Copiado!" }); }

  if (!can('crm', 'view')) return <div className="flex h-screen"><AccessDenied /></div>;

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
                    <button key={p.id} onClick={() => setCurrentPipelineId(p.id)} className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${currentPipelineId === p.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {p.name}
                    </button>
                ))}
                <button onClick={createPipeline} className="p-1 rounded-full bg-slate-200 dark:bg-slate-800"><Plus className="h-4 w-4" /></button>
                <button onClick={() => setIsPipelineSettingsOpen(true)} className="p-1 rounded-full bg-slate-200 dark:bg-slate-800 ml-2"><Settings className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="flex gap-3">
                <div className="hidden md:flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border dark:border-slate-800">
                    <span className="text-xs text-slate-500">Webhook:</span>
                    <code className="text-xs bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded max-w-[100px] truncate">{webhookUrl || 'Carregando...'}</code>
                    <button onClick={copyWebhook}><Copy className="h-4 w-4"/></button>
                </div>
                <Button onClick={() => { setEditingLead(null); reset(); setIsModalOpen(true); }} className="bg-slate-900 dark:bg-white dark:text-slate-900"><UserPlus className="h-4 w-4 mr-2" /> Novo Lead</Button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border dark:border-slate-800 mb-6 flex gap-4 items-center">
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input placeholder="Buscar por nome, email, telefone..." className="w-full pl-10 pr-4 py-2 border rounded-lg bg-transparent dark:text-white dark:border-slate-700" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
            </div>
            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="px-3 py-2 border rounded-lg bg-transparent dark:text-white dark:bg-slate-900 dark:border-slate-700">
                <option value="all">Todas as Fontes</option>
                {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                <option value="outro">Outro</option>
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div></div>
          ) : (
            <div className="h-[calc(100vh-280px)] overflow-x-auto pb-4">
                 <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
                    <div className="flex gap-4 h-full" style={{ minWidth: `${stages.length * 320}px` }}>
                        {stages.map(stage => {
                            const leadsInStage = leadsByStage[stage.id] || [];
                            return (
                                <div key={stage.id} className="flex flex-col h-full w-80">
                                    <div className="mb-3">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                                <span className={`w-3 h-3 rounded-full ${stage.color || 'bg-slate-400'}`}></span>
                                                {stage.name}
                                            </span>
                                            <span className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">{leadsInStage.length}</span>
                                        </div>
                                        <div className="text-sm font-bold pl-5 mt-1 text-slate-500">
                                            {formatCurrencyDisplay(totalsByStatus[stage.id] || 0)}
                                        </div>
                                    </div>
                                    <KanbanColumn id={stage.id} title="" tasks={leadsInStage} color={stage.color || 'bg-slate-100'}>
                                        {leadsInStage.map(lead => {
                                            const tempBadge = getTemperatureBadge(lead.temperature);
                                            const TempIcon = tempBadge.icon;
                                            return (
                                                <SortableTaskCard
                                                    key={lead.id}
                                                    task={lead as any}
                                                    clientName={lead.company || lead.email}
                                                    getPriorityColor={() => 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}
                                                    openEditModal={() => openEditModal(lead)}
                                                    deleteTask={() => deleteLead(lead.id)}
                                                    onCardClick={() => openDetailModal(lead)}
                                                />
                                            )
                                        })}
                                    </KanbanColumn>
                                </div>
                            );
                        })}
                    </div>
                 </DndContext>
            </div>
          )}
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border dark:border-slate-800">
              <div className="flex justify-between mb-4">
                  <h2 className="text-xl font-bold dark:text-white">{editingLead ? 'Editar' : 'Novo'} Lead</h2>
                  <button onClick={() => setIsModalOpen(false)}><X/></button>
              </div>
              <form onSubmit={handleSubmit(onModalSubmit)} className="space-y-4">
                <input type="hidden" {...register('status')} /> 
                <div className="grid grid-cols-2 gap-3">
                    <Input {...register('name')} placeholder="Nome" className="dark:bg-slate-950" />
                    <Input {...register('email')} placeholder="Email" className="dark:bg-slate-950" />
                </div>
                <Input {...register('phone')} placeholder="Telefone" className="dark:bg-slate-950" onChange={(e) => { e.target.value = formatPhone(e.target.value); register('phone').onChange(e); }}/>
                <Input {...register('company')} placeholder="Empresa" className="dark:bg-slate-950" />
                <div className="grid grid-cols-2 gap-3">
                    <Input {...register('budget')} placeholder="Orçamento" className="dark:bg-slate-950" onChange={(e) => { e.target.value = formatCurrencyInput(e.target.value); register('budget').onChange(e); }}/>
                    <select {...register('temperature')} className="w-full h-10 rounded-md border bg-transparent px-3 text-sm dark:border-slate-800 dark:text-white dark:bg-slate-950">
                        <option value="morno">Morno</option>
                        <option value="quente">Quente</option>
                        <option value="frio">Frio</option>
                    </select>
                </div>
                <select {...register('source')} className="w-full h-10 rounded-md border bg-transparent px-3 text-sm dark:border-slate-800 dark:text-white dark:bg-slate-950">
                    <option value="">Fonte...</option>
                    {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    <option value="outro">Outro</option>
                </select>
                <textarea {...register('notes')} placeholder="Notas" className="w-full px-3 py-2 border dark:border-slate-800 rounded-lg bg-transparent dark:text-white" />
                <Button type="submit" className="w-full bg-slate-900 dark:bg-white dark:text-slate-900">Salvar</Button>
              </form>
           </div>
        </div>
      )}

      {isDetailModalOpen && selectedLead && (
          <div className="fixed inset-0 bg-black/60 z-50 flex justify-end">
              <div className="w-full max-w-xl bg-white dark:bg-slate-950 h-full shadow-2xl p-6 border-l dark:border-slate-800 overflow-y-auto animate-in slide-in-from-right">
                  <div className="flex justify-between items-start mb-6">
                      <div>
                          <h2 className="text-2xl font-bold dark:text-white">{selectedLead.title}</h2>
                          <div className="flex gap-2 mt-2">
                              <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs">{selectedLead.company}</span>
                              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => openTransferModal(selectedLead)}>
                                  <ArrowRightLeft className="h-3 w-3 mr-1"/> Transferir Lead
                              </Button>
                          </div>
                      </div>
                      <button onClick={() => setIsDetailModalOpen(false)}><X/></button>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-6">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><ListTodo className="h-4 w-4" /> Tarefas</h3>
                        <div className="flex gap-2 mb-4">
                            <Input placeholder="Nova tarefa..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="dark:bg-slate-950"/>
                            <Input type="datetime-local" value={newTaskDate} onChange={e => setNewTaskDate(e.target.value)} className="w-40 dark:bg-slate-950"/>
                            <Button size="sm" onClick={handleAddTask}><Plus className="h-4 w-4" /></Button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {tasks.map(task => (
                                <div key={task.id} className="flex items-center gap-3 p-2 bg-white dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800">
                                    <input type="checkbox" checked={task.is_completed} onChange={() => toggleTask(task.id, task.is_completed)} className="w-4 h-4 rounded"/>
                                    <div className={`flex-1 ${task.is_completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                        <p className="text-sm font-medium">{task.title}</p>
                                        <p className="text-xs text-slate-400">{new Date(task.due_date).toLocaleString('pt-BR')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                  </div>

                  <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><History className="h-4 w-4" /> Histórico & Notas</h3>
                        <div className="flex gap-2 mb-6">
                            <Input placeholder="Adicionar nota..." value={newNote} onChange={e => setNewNote(e.target.value)} className="dark:bg-slate-900"/>
                            <Button size="sm" onClick={handleAddNote}>Enviar</Button>
                        </div>
                        <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 space-y-6 pb-10">
                            {activities.map((act) => (
                                <div key={act.id} className="relative pl-6">
                                    <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white dark:border-slate-950 ${act.type === 'status_change' ? 'bg-blue-500' : act.type === 'task_created' ? 'bg-orange-500' : 'bg-slate-400'}`}></div>
                                    <div className="text-xs text-slate-400 mb-1">{new Date(act.created_at).toLocaleString('pt-BR')}</div>
                                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-sm text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800">{act.content}</div>
                                </div>
                            ))}
                        </div>
                  </div>
              </div>
          </div>
      )}

      {isTransferModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-6 border dark:border-slate-800">
                  <h3 className="font-bold mb-4 dark:text-white">Transferir Lead</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="text-sm">Funil de Destino</label>
                          <select className="w-full p-2 border rounded dark:bg-slate-950" value={transferTargetPipeline} onChange={e => setTransferTargetPipeline(e.target.value)}>
                              <option value="">Selecione...</option>
                              {pipelines.filter(p => p.id !== currentPipelineId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-sm">Etapa de Destino</label>
                          <select className="w-full p-2 border rounded dark:bg-slate-950" value={transferTargetStage} onChange={e => setTransferTargetStage(e.target.value)} disabled={!transferTargetPipeline}>
                              {targetStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                      </div>
                      <Button className="w-full bg-slate-900 dark:bg-white dark:text-slate-900" onClick={handleTransferLead} disabled={!transferTargetStage}>Confirmar Transferência</Button>
                      <Button variant="ghost" className="w-full" onClick={() => setIsTransferModalOpen(false)}>Cancelar</Button>
                  </div>
              </div>
          </div>
      )}

      {isWonModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-6 border dark:border-slate-800 shadow-xl animate-in fade-in zoom-in duration-300">
              <div className="flex flex-col items-center text-center mb-6">
                  <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full mb-4"><CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" /></div>
                  <h2 className="text-xl font-bold dark:text-white">Venda Realizada!</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 px-2">Anexe o contrato assinado.</p>
              </div>
              <div className={`bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border-2 border-dashed transition-colors mb-6 text-center ${!contractFile ? 'border-slate-300' : 'border-green-500 bg-green-50'}`}>
                  <input type="file" id="contract-upload" className="hidden" onChange={(e) => setContractFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx,.jpg,.png,.jpeg"/>
                  <label htmlFor="contract-upload" className="cursor-pointer flex flex-col items-center gap-2">
                      {contractFile ? <><FileText className="h-8 w-8 text-green-500" /><span className="text-sm font-medium truncate max-w-[200px]">{contractFile.name}</span></> : <><Upload className="h-8 w-8 text-slate-400" /><span className="text-sm font-medium text-slate-600">Clique para selecionar</span></>}
                  </label>
              </div>
              <div className="flex gap-3">
                  <Button variant="outline" onClick={() => {setIsWonModalOpen(false); setPendingLeadToConvert(null); setContractFile(null);}} className="flex-1">Cancelar</Button>
                  <Button onClick={handleConfirmWin} className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={isUploading || !contractFile}>{isUploading ? 'Enviando...' : 'Confirmar'}</Button>
              </div>
           </div>
        </div>
      )}

      {isPipelineSettingsOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 border dark:border-slate-800 max-h-[80vh] overflow-y-auto">
                  <div className="flex justify-between mb-4">
                      <h3 className="font-bold dark:text-white">Configurar Pipeline</h3>
                      <button onClick={() => setIsPipelineSettingsOpen(false)}><X/></button>
                  </div>
                  <div className="mb-6">
                      <label className="text-sm font-medium">Nome do Funil</label>
                      <div className="flex gap-2 mt-1">
                          <Input value={editPipelineName} onChange={e => setEditPipelineName(e.target.value)} className="dark:bg-slate-950"/>
                          <Button onClick={handleUpdatePipeline}>Salvar</Button>
                      </div>
                  </div>
                  <div className="mb-6">
                      <label className="text-sm font-medium">Etapas (Colunas)</label>
                      <div className="space-y-2 mt-2">
                          {stages.map((s, index) => (
                              <div key={s.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded border">
                                  <span className="text-sm">{s.name}</span>
                                  <div className="flex items-center gap-1">
                                      {/* SETAS DE ORDENAÇÃO */}
                                      <button disabled={index === 0} onClick={() => moveStage(index, 'up')} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-30"><ChevronUp className="h-4 w-4"/></button>
                                      <button disabled={index === stages.length - 1} onClick={() => moveStage(index, 'down')} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-30"><ChevronDown className="h-4 w-4"/></button>
                                      <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1"></div>
                                      <button onClick={() => handleDeleteStage(s.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4"/></button>
                                  </div>
                              </div>
                          ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                          <Input placeholder="Nova Coluna" value={newStageName} onChange={e => setNewStageName(e.target.value)} className="dark:bg-slate-950"/>
                          <Button variant="outline" onClick={handleAddStage}><Plus className="h-4 w-4"/></Button>
                      </div>
                  </div>
                  <div className="border-t pt-4">
                      <Button variant="destructive" className="w-full" onClick={handleDeletePipeline}>Excluir Pipeline Inteiro</Button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}