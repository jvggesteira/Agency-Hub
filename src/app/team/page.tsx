'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { UserCog, Plus, Search, Filter, Edit, Trash2, Mail, Phone, Shield } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const memberSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  role: z.string().min(1, 'Cargo é obrigatório'),
  department: z.string().optional(),
  notes: z.string().optional(),
  permissions: z.object({
    clients: z.object({
      view: z.boolean(),
      create: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
    }),
    tasks: z.object({
      view: z.boolean(),
      create: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
    }),
    finances: z.object({
      view: z.boolean(),
      create: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
    }),
    goals: z.object({
      view: z.boolean(),
      create: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
    }),
    documents: z.object({
      view: z.boolean(),
      create: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
    }),
    team: z.object({
      view: z.boolean(),
      create: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
    }),
    dashboards: z.object({
      view: z.boolean(),
      create: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
    }),
    freelancer_projects: z.object({
      view: z.boolean(),
      create: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
    }),
    alerts: z.object({
      view: z.boolean(),
      create: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
    }),
    settings: z.object({
      view: z.boolean(),
      create: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
    }),
  }),
});

type MemberFormData = z.infer<typeof memberSchema>;

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department?: string;
  notes?: string;
  created_at: string;
  permissions: {
    clients: { view: boolean; create: boolean; edit: boolean; delete: boolean };
    tasks: { view: boolean; create: boolean; edit: boolean; delete: boolean };
    finances: { view: boolean; create: boolean; edit: boolean; delete: boolean };
    goals: { view: boolean; create: boolean; edit: boolean; delete: boolean };
    documents: { view: boolean; create: boolean; edit: boolean; delete: boolean };
    team: { view: boolean; create: boolean; edit: boolean; delete: boolean };
    dashboards: { view: boolean; create: boolean; edit: boolean; delete: boolean };
    freelancer_projects: { view: boolean; create: boolean; edit: boolean; delete: boolean };
    alerts: { view: boolean; create: boolean; edit: boolean; delete: boolean };
    settings: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  };
}

const defaultPermissions = {
  clients: { view: false, create: false, edit: false, delete: false },
  tasks: { view: false, create: false, edit: false, delete: false },
  finances: { view: false, create: false, edit: false, delete: false },
  goals: { view: false, create: false, edit: false, delete: false },
  documents: { view: false, create: false, edit: false, delete: false },
  team: { view: false, create: false, edit: false, delete: false },
  dashboards: { view: false, create: false, edit: false, delete: false },
  freelancer_projects: { view: false, create: false, edit: false, delete: false },
  alerts: { view: false, create: false, edit: false, delete: false },
  settings: { view: false, create: false, edit: false, delete: false },
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      permissions: defaultPermissions,
    },
  });

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = () => {
    try {
      const savedMembers = localStorage.getItem('team_members');
      if (savedMembers) {
        setMembers(JSON.parse(savedMembers));
      }
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveMembers = (membersList: Member[]) => {
    try {
      localStorage.setItem('team_members', JSON.stringify(membersList));
    } catch (error) {
      console.error('Erro ao salvar membros:', error);
    }
  };

  const onSubmit = (data: MemberFormData) => {
    const newMember: Member = {
      id: editingMember?.id || Date.now().toString(),
      ...data,
      created_at: editingMember?.created_at || new Date().toISOString(),
    };

    if (editingMember) {
      const updatedMembers = members.map(member =>
        member.id === editingMember.id ? newMember : member
      );
      setMembers(updatedMembers);
      saveMembers(updatedMembers);
    } else {
      const updatedMembers = [newMember, ...members];
      setMembers(updatedMembers);
      saveMembers(updatedMembers);
    }

    setIsModalOpen(false);
    setEditingMember(null);
    reset({ permissions: defaultPermissions });
  };

  const deleteMember = (id: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;

    const updatedMembers = members.filter(member => member.id !== id);
    setMembers(updatedMembers);
    saveMembers(updatedMembers);
  };

  const openEditModal = (member: Member) => {
    setEditingMember(member);
    reset({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      department: member.department || '',
      notes: member.notes || '',
      permissions: member.permissions,
    });
    setIsModalOpen(true);
  };

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const countActivePermissions = (permissions: Member['permissions']) => {
    let count = 0;
    Object.values(permissions).forEach(perm => {
      if (perm.view) count++;
      if (perm.create) count++;
      if (perm.edit) count++;
      if (perm.delete) count++;
    });
    return count;
  };

  const permissionLabels: Record<string, string> = {
    clients: 'Clientes',
    tasks: 'Tarefas',
    finances: 'Financeiro',
    goals: 'Metas',
    documents: 'Documentos',
    team: 'Equipe',
    dashboards: 'Dashboards',
    freelancer_projects: 'Projetos Freelancer',
    alerts: 'Alertas',
    settings: 'Configurações',
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
                <h1 className="text-3xl font-bold text-slate-900">Equipe</h1>
                <p className="text-slate-600 mt-1">Gerencie colaboradores e permissões</p>
              </div>
              <button
                onClick={() => {
                  setEditingMember(null);
                  reset({ permissions: defaultPermissions });
                  setIsModalOpen(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Adicionar Colaborador
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar membros..."
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
                <p className="text-slate-600 mt-4">Carregando membros...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-12">
                <UserCog className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum colaborador cadastrado</h3>
                <p className="text-slate-600 mb-6">Adicione membros da equipe e configure permissões</p>
                <button
                  onClick={() => {
                    setEditingMember(null);
                    reset({ permissions: defaultPermissions });
                    setIsModalOpen(true);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all inline-flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Adicionar Membro
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredMembers.map((member) => (
                  <div key={member.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{member.name}</h3>
                          <p className="text-sm text-slate-600">{member.role}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(member)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteMember(member.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="h-4 w-4" />
                        {member.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="h-4 w-4" />
                        {member.phone}
                      </div>
                      {member.department && (
                        <p className="text-sm text-slate-600">Depto: {member.department}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Shield className="h-4 w-4" />
                        {countActivePermissions(member.permissions)} permissões ativas
                      </div>
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
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingMember ? 'Editar Membro' : 'Novo Membro'}
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nome *
                    </label>
                    <input
                      {...register('name')}
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nome completo"
                    />
                    {errors.name && (
                      <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email *
                    </label>
                    <input
                      {...register('email')}
                      type="email"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="email@exemplo.com"
                    />
                    {errors.email && (
                      <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Telefone *
                    </label>
                    <input
                      {...register('phone')}
                      type="tel"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="(11) 99999-9999"
                    />
                    {errors.phone && (
                      <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Cargo *
                    </label>
                    <input
                      {...register('role')}
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Designer, Desenvolvedor"
                    />
                    {errors.role && (
                      <p className="text-red-600 text-sm mt-1">{errors.role.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Departamento
                  </label>
                  <input
                    {...register('department')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Marketing, TI"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Permissões de Acesso Granulares
                  </label>
                  <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200 max-h-96 overflow-y-auto">
                    {Object.keys(defaultPermissions).map((module) => (
                      <div key={module} className="border-b border-slate-200 pb-3 last:border-0">
                        <h4 className="font-semibold text-slate-900 mb-2">{permissionLabels[module]}</h4>
                        <div className="grid grid-cols-4 gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              {...register(`permissions.${module}.view` as any)}
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-700">Visualizar</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              {...register(`permissions.${module}.create` as any)}
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-700">Criar</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              {...register(`permissions.${module}.edit` as any)}
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-700">Editar</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              {...register(`permissions.${module}.delete` as any)}
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-700">Excluir</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Observações sobre o membro"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingMember(null);
                      reset({ permissions: defaultPermissions });
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
                  >
                    {editingMember ? 'Atualizar' : 'Salvar'}
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
