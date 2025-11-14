'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { Briefcase, Plus, Search, Filter, Edit, Trash2, Calendar, DollarSign } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

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
    } else {
      const updatedProjects = [newProject, ...projects];
      setProjects(updatedProjects);
      saveProjects(updatedProjects);
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

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getClientName(project.clientId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.freelancer.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        return 'bg-blue-100 text-blue-700';
      case 'concluido':
        return 'bg-green-100 text-green-700';
      case 'cancelado':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
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
                <h1 className="text-3xl font-bold text-slate-900">Projetos Freelancer</h1>
                <p className="text-slate-600 mt-1">Gerencie projetos terceirizados</p>
              </div>
              <button
                onClick={() => {
                  setEditingProject(null);
                  reset();
                  setIsModalOpen(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Novo Projeto
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar projetos..."
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
                <p className="text-slate-600 mt-4">Carregando projetos...</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum projeto cadastrado</h3>
                <p className="text-slate-600 mb-6">Comece adicionando projetos com freelancers</p>
                <button
                  onClick={() => {
                    setEditingProject(null);
                    reset();
                    setIsModalOpen(true);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all inline-flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Adicionar Projeto
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                  <div key={project.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <Briefcase className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{project.name}</h3>
                          <p className="text-sm text-slate-600">{getClientName(project.clientId)}</p>
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
                      <p className="text-sm text-slate-600">Freelancer: {project.freelancer}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <DollarSign className="h-4 w-4" />
                        {project.value}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingProject ? 'Editar Projeto' : 'Novo Projeto'}
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nome do Projeto *
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome do projeto"
                  />
                  {errors.name && (
                    <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Cliente *
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
                  {errors.clientId && (
                    <p className="text-red-600 text-sm mt-1">{errors.clientId.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Freelancer *
                  </label>
                  <input
                    {...register('freelancer')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome do freelancer"
                  />
                  {errors.freelancer && (
                    <p className="text-red-600 text-sm mt-1">{errors.freelancer.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Valor *
                  </label>
                  <input
                    {...register('value')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="R$ 0,00"
                  />
                  {errors.value && (
                    <p className="text-red-600 text-sm mt-1">{errors.value.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Prazo *
                  </label>
                  <input
                    {...register('deadline')}
                    type="date"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.deadline && (
                    <p className="text-red-600 text-sm mt-1">{errors.deadline.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Status *
                  </label>
                  <select
                    {...register('status')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Descrição do projeto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Observações adicionais"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingProject(null);
                      reset();
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
                  >
                    {editingProject ? 'Atualizar' : 'Salvar'}
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
