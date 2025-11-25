'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { Briefcase, Plus, Search, Filter, Edit, Trash2, Calendar, DollarSign, X } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/use-permission';
import AccessDenied from '@/components/custom/access-denied';

const projectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  freelancer: z.string().min(1, 'Freelancer é obrigatório'),
  value: z.string().min(1, 'Valor é obrigatório'),
  deadline: z.string().min(1, 'Prazo é obrigatório'),
  status: z.enum(['em_andamento', 'concluido', 'cancelado'], {
    required_error: 'Status é obrigatório',
  }),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

type ProjectStatusFilter = 'all' | 'em_andamento' | 'concluido' | 'cancelado';

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
}

interface Client {
  id: string;
  name: string;
}

export default function FreelancerProjectsPage() {
  const { can } = usePermission();

  if (!can('freelancer_projects', 'view')) {
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
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
  });

  useEffect(() => {
    loadProjects();
    loadClients();
  }, []);

  const loadProjects = () => {
    try {
      const savedProjects = localStorage.getItem('freelancer_projects');
      if (savedProjects) {
        setProjects(JSON.parse(savedProjects));
      }
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    } finally {
      setLoading(false);
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

  const saveProjects = (projectsList: Project[]) => {
    try {
      localStorage.setItem('freelancer_projects', JSON.stringify(projectsList));
    } catch (error) {
      console.error('Erro ao salvar projetos:', error);
    }
  };

  const onSubmit = (data: ProjectFormData) => {
    const newProject: Project = {
      id: editingProject?.id || Date.now().toString(),
      ...data,
      created_at: editingProject?.created_at || new Date().toISOString(),
    };

    if (editingProject) {
      const updatedProjects = projects.map(project =>
        project.id === editingProject.id ? newProject : project
      );
      setProjects(updatedProjects);
      saveProjects(updatedProjects);
      toast({ title: "Sucesso", description: "Projeto atualizado." });
    } else {
      const updatedProjects = [newProject, ...projects];
      setProjects(updatedProjects);
      saveProjects(updatedProjects);
      toast({ title: "Sucesso", description: "Novo projeto adicionado." });
    }

    setIsModalOpen(false);
    setEditingProject(null);
    reset();
  };

  const deleteProject = (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return;

    const updatedProjects = projects.filter(project => project.id !== id);
    setProjects(updatedProjects);
    saveProjects(updatedProjects);
    toast({ title: "Excluído", description: "Projeto removido.", variant: "destructive" });
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    reset({
      name: project.name,
      clientId: project.clientId,
      freelancer: project.freelancer,
      value: project.value,
      deadline: project.deadline,
      status: project.status,
      description: project.description || '',
      notes: project.notes || '',
    });
    setIsModalOpen(true);
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Cliente não encontrado';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'em_andamento':
        return 'Em Andamento';
      case 'concluido':
        return 'Concluído';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'em_andamento':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'concluido':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelado':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const applyFilters = (project: Project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClientName(project.clientId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.freelancer.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesClient = clientFilter === 'all' || project.clientId === clientFilter;

    return matchesStatus && matchesClient;
  };

  const filteredProjects = projects.filter(applyFilters);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Projetos Freelancer</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Gerencie projetos terceirizados</p>
              </div>
              <button
                onClick={() => {
                  setEditingProject(null);
                  reset();
                  setIsModalOpen(true);
                }}
                className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <Plus className="h-5 w-5" />
                Novo Projeto
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar projetos..."
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
                <p className="text-slate-600 dark:text-slate-400 mt-4">Carregando projetos...</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                    <Briefcase className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Nenhum projeto cadastrado</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">Comece adicionando projetos com freelancers</p>
                <button
                  onClick={() => {
                    setEditingProject(null);
                    reset();
                    setIsModalOpen(true);
                  }}
                  className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all inline-flex items-center gap-2 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <Plus className="h-5 w-5" />
                  Adicionar Projeto
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                  <div key={project.id} className="bg-slate-50 dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                          <Briefcase className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">{project.name}</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{getClientName(project.clientId)}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(project)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteProject(project.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Freelancer: {project.freelancer}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <DollarSign className="h-4 w-4" />
                        {project.value}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Calendar className="h-4 w-4" />
                        {new Date(project.deadline).toLocaleDateString('pt-BR')}
                      </div>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}>
                        {getStatusLabel(project.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal Projeto (Criação/Edição) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {editingProject ? 'Editar Projeto' : 'Novo Projeto'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Projeto *
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                    placeholder="Nome do projeto"
                  />
                  {errors.name && (
                    <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cliente *
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
                  {errors.clientId && (
                    <p className="text-red-600 text-sm mt-1">{errors.clientId.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Freelancer *
                  </label>
                  <input
                    {...register('freelancer')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                    placeholder="Nome do freelancer"
                  />
                  {errors.freelancer && (
                    <p className="text-red-600 text-sm mt-1">{errors.freelancer.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Valor *
                  </label>
                  <input
                    {...register('value')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                    placeholder="R$ 0,00"
                  />
                  {errors.value && (
                    <p className="text-red-600 text-sm mt-1">{errors.value.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Prazo *
                  </label>
                  <input
                    {...register('deadline')}
                    type="date"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                  />
                  {errors.deadline && (
                    <p className="text-red-600 text-sm mt-1">{errors.deadline.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Status *
                  </label>
                  <select
                    {...register('status')}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:bg-slate-900"
                  >
                    <option value="">Selecione o status</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                  {errors.status && (
                    <p className="text-red-600 text-sm mt-1">{errors.status.message}</p>
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
                    placeholder="Descrição do projeto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Observações
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                    placeholder="Observações adicionais"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingProject(null);
                      reset();
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:bg-slate-800 transition-all dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {editingProject ? 'Atualizar' : 'Salvar'}
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
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Filtrar Projetos</h2>
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
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ProjectStatusFilter)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:bg-slate-900"
                  >
                    <option value="all">Todos</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
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
                    setStatusFilter('all');
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