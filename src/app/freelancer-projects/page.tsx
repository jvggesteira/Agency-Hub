'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { Briefcase, Plus, Search, Filter, Edit, Trash2, Calendar, DollarSign, X, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/use-permission';
import AccessDenied from '@/components/custom/access-denied';
import { supabase } from '@/lib/supabase';

const projectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  freelancer: z.string().min(1, 'Freelancer é obrigatório'),
  value: z.string().min(1, 'Valor é obrigatório'),
  deadline: z.string().min(1, 'Prazo é obrigatório'),
  status: z.enum(['em_andamento', 'concluido', 'cancelado']),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;
type ProjectStatusFilter = 'all' | 'em_andamento' | 'concluido' | 'cancelado';

interface Client {
  id: string;
  name: string;
  company?: string;
}

interface Project {
  id: string;
  name: string;
  clientId: string;
  freelancer: string;
  value: string;
  deadline: string;
  status: 'em_andamento' | 'concluido' | 'cancelado';
  description?: string;
  notes?: string;
  created_at: string;
  client?: { name: string; company?: string };
}

export default function FreelancerProjectsPage() {
  const { can } = usePermission();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: projectsData, error: projError } = await supabase
        .from('projects')
        .select('*, client:clients(name, company)')
        .order('created_at', { ascending: false });
      
      if (projError) throw projError;

      const mappedProjects: Project[] = (projectsData || []).map(p => ({
        id: p.id,
        name: p.name,
        clientId: p.client_id,
        freelancer: p.freelancer_name,
        value: p.cost?.toString() || '0',
        deadline: p.deadline,
        status: p.status,
        description: p.description,
        notes: p.notes,
        created_at: p.created_at,
        client: p.client
      }));
      
      setProjects(mappedProjects);

      const { data: clientsData } = await supabase.from('clients').select('id, name, company').order('name');
      setClients(clientsData || []);
    } catch (error) {
      console.error('Erro:', error);
      toast({ title: "Erro", description: "Falha ao carregar dados.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value.replace(/\D/g, "");
      value = (Number(value) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      setValue('value', value);
  };

  const onSubmit = async (data: ProjectFormData) => {
    try {
      const costValue = parseFloat(data.value.replace(/[^\d]/g, "")) / 100;
      
      // CORREÇÃO DATA: Adiciona T12:00:00 para garantir o dia correto independente do fuso
      // Se a data já vier com hora, mantemos, senão adicionamos meio-dia.
      const safeDeadline = data.deadline.includes('T') ? data.deadline : `${data.deadline}T12:00:00`;

      const payload = {
        name: data.name,
        client_id: data.clientId,
        freelancer_name: data.freelancer,
        cost: costValue,
        deadline: safeDeadline, 
        status: data.status,
        description: data.description,
        notes: data.notes
      };

      if (editingProject) {
        await supabase.from('projects').update(payload).eq('id', editingProject.id);
        toast({ title: "Sucesso", description: "Projeto atualizado." });
      } else {
        const { error: projError } = await supabase.from('projects').insert([payload]);
        if (projError) throw projError;

        if (costValue > 0) {
            const { error: transError } = await supabase
                .from('transactions')
                .insert([{
                    description: `Projeto: ${data.name} (${data.freelancer})`,
                    amount: costValue,
                    type: 'expense',
                    classification: 'variavel', 
                    category: 'Freelancers',    
                    date: new Date().toISOString(), 
                    client_id: data.clientId,   
                    status: 'pending'           
                }]);
            
            if (transError) {
                console.error("Erro ao criar despesa automática:", transError);
                toast({ title: "Aviso", description: "Projeto salvo, mas erro ao gerar financeiro.", variant: "destructive" });
            } else {
                toast({ title: "Financeiro Atualizado", description: "Despesa variável lançada na DRE." });
            }
        } else {
            toast({ title: "Sucesso", description: "Projeto criado." });
        }
      }

      setIsModalOpen(false);
      setEditingProject(null);
      reset();
      fetchData();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast({ title: "Erro", description: error.message || "Falha ao salvar projeto.", variant: "destructive" });
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return;
    try {
        await supabase.from('projects').delete().eq('id', id);
        toast({ title: "Excluído", description: "Projeto removido." });
        setProjects(projects.filter(p => p.id !== id));
    } catch (error) {
        toast({ title: "Erro", description: "Falha ao excluir.", variant: "destructive" });
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setValue('name', project.name);
    setValue('clientId', project.clientId);
    setValue('freelancer', project.freelancer);
    setValue('value', parseFloat(project.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    
    // CORREÇÃO DATA NO FORM: Extrai apenas a parte YYYY-MM-DD para o input type="date"
    const formattedDate = project.deadline ? project.deadline.split('T')[0] : '';
    setValue('deadline', formattedDate);
    
    setValue('status', project.status);
    setValue('description', project.description || '');
    setValue('notes', project.notes || '');
    setIsModalOpen(true);
  };

  // Funcao auxiliar para exibir data correta no card (evita voltar 1 dia)
  const formatDateDisplay = (dateString: string) => {
      if(!dateString) return '-';
      // Cria a data adicionando o T12:00:00 se não tiver, para forçar meio-dia e evitar UTC-3 problem
      const safeDate = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
      return new Date(safeDate).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'em_andamento': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'concluido': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelado': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  if (!can('freelancer_projects', 'view')) return <div className="flex h-screen"><Sidebar /><div className="flex-1"><Header /><main className="p-6"><AccessDenied /></main></div></div>;

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.client?.company || project.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.freelancer.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesClient = clientFilter === 'all' || project.clientId === clientFilter;
    return matchesStatus && matchesClient;
  });

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {/* ... (O resto do JSX permanece igual, apenas atualize onde exibe a data) ... */}
          <div className="mb-8 flex justify-between items-center">
              <div><h1 className="text-3xl font-bold text-slate-900 dark:text-white">Projetos Freelancer</h1><p className="text-slate-600 dark:text-slate-400 mt-1">Gerencie projetos terceirizados</p></div>
              <button onClick={() => { setEditingProject(null); reset({ status: 'em_andamento' }); setIsModalOpen(true); }} className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 dark:bg-white dark:text-slate-900"><Plus className="h-5 w-5" /> Novo Projeto</button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            {/* ... Filtros ... */}
            <div className="flex items-center gap-4 mb-6">
               <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" /><input type="text" placeholder="Buscar projetos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white" /></div>
               <button onClick={() => setIsFilterModalOpen(true)} className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"><Filter className="h-5 w-5" /> Filtros</button>
            </div>

            {loading ? ( <div className="text-center py-12"><Loader2 className="animate-spin h-10 w-10 text-blue-600 mx-auto" /></div> ) : filteredProjects.length === 0 ? ( <div className="text-center py-12"><div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4"><Briefcase className="h-8 w-8 text-slate-400" /></div><h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Nenhum projeto</h3></div> ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                  <div key={project.id} className="bg-slate-50 dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-3">
                       <div className="flex items-center gap-3"><div className="w-10 h-10 bg-slate-900 dark:bg-slate-800 rounded-lg flex items-center justify-center"><Briefcase className="h-5 w-5 text-white" /></div><div><h3 className="font-semibold text-slate-900 dark:text-white">{project.name}</h3><p className="text-sm text-slate-600 dark:text-slate-400">{project.client?.company || project.client?.name || 'Cliente Removido'}</p></div></div>
                       <div className="flex gap-1"><button onClick={() => openEditModal(project)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><Edit className="h-4 w-4" /></button><button onClick={() => deleteProject(project.id)} className="p-1 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button></div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Freelancer: {project.freelancer}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><DollarSign className="h-4 w-4" /> {parseFloat(project.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                      
                      {/* USO DA FUNÇÃO DE DATA CORRIGIDA AQUI: */}
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><Calendar className="h-4 w-4" /> {formatDateDisplay(project.deadline)}</div>
                      
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}>{project.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto border dark:border-slate-800 shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold dark:text-white">{editingProject ? 'Editar Projeto' : 'Novo Projeto'}</h2><button onClick={() => setIsModalOpen(false)}><X className="h-5 w-5 dark:text-white" /></button></div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div><label className="text-sm font-medium dark:text-slate-300">Nome do Projeto *</label><input {...register('name')} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-950 dark:border-slate-700" placeholder="Nome do projeto" /></div>
                <div><label className="text-sm font-medium dark:text-slate-300">Cliente *</label><select {...register('clientId')} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-950 dark:border-slate-700"><option value="">Selecione...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.company ? c.company : c.name}</option>)}</select></div>
                <div><label className="text-sm font-medium dark:text-slate-300">Freelancer *</label><input {...register('freelancer')} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-950 dark:border-slate-700" placeholder="Nome" /></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium dark:text-slate-300">Valor *</label><input {...register('value')} onChange={handleCurrencyInput} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-950 dark:border-slate-700" placeholder="R$ 0,00" /></div><div><label className="text-sm font-medium dark:text-slate-300">Prazo *</label><input {...register('deadline')} type="date" className="w-full px-3 py-2 border rounded-lg dark:bg-slate-950 dark:border-slate-700" /></div></div>
                <div><label className="text-sm font-medium dark:text-slate-300">Status *</label><select {...register('status')} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-950 dark:border-slate-700"><option value="em_andamento">Em Andamento</option><option value="concluido">Concluído</option><option value="cancelado">Cancelado</option></select></div>
                <div><label className="text-sm font-medium dark:text-slate-300">Descrição</label><textarea {...register('description')} rows={3} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-950 dark:border-slate-700" /></div>
                <div><label className="text-sm font-medium dark:text-slate-300">Observações</label><textarea {...register('notes')} rows={2} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-950 dark:border-slate-700" /></div>
                <div className="flex gap-3 pt-4 border-t dark:border-slate-800"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white">Cancelar</button><button type="submit" disabled={isSubmitting} className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg dark:bg-white dark:text-slate-900">{isSubmitting ? 'Salvando...' : 'Salvar'}</button></div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Filtro (Mantido igual) */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-6 border dark:border-slate-800">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Filtrar</h2>
            <div className="space-y-4">
                <div><label className="text-sm dark:text-slate-300">Status</label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProjectStatusFilter)} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-950"><option value="all">Todos</option><option value="em_andamento">Em Andamento</option><option value="concluido">Concluído</option></select></div>
                <div><label className="text-sm dark:text-slate-300">Cliente</label><select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-950"><option value="all">Todos</option>{clients.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}</select></div>
            </div>
            <div className="flex gap-3 mt-6"><button onClick={() => {setStatusFilter('all'); setClientFilter('all'); setIsFilterModalOpen(false);}} className="flex-1 border rounded-lg py-2 dark:text-white">Limpar</button><button onClick={() => setIsFilterModalOpen(false)} className="flex-1 bg-slate-900 text-white rounded-lg py-2 dark:bg-white dark:text-slate-900">Aplicar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}