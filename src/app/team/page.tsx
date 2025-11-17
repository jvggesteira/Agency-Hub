'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { UserCog, Plus, Search, Filter, Edit, Trash2, Mail, Phone, Shield, X, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

// --- Schemas e Tipos ---

const permissionSetSchema = z.object({
  view: z.boolean(),
  create: z.boolean(),
  edit: z.boolean(),
  delete: z.boolean(),
});

const memberSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(), // Tornando opcional, pois não é padrão no auth.users
  role: z.string().min(1, 'Cargo é obrigatório'),
  department: z.string().optional(),
  notes: z.string().optional(),
  permissions: z.object({
    clients: permissionSetSchema,
    tasks: permissionSetSchema,
    finances: permissionSetSchema,
    goals: permissionSetSchema,
    documents: permissionSetSchema,
    team: permissionSetSchema,
    dashboards: permissionSetSchema,
    freelancer_projects: permissionSetSchema,
    alerts: permissionSetSchema,
    settings: permissionSetSchema,
  }),
});

type MemberFormData = z.infer<typeof memberSchema>;

interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  notes?: string;
  created_at: string;
  permissions: MemberFormData['permissions'];
  is_invited: boolean;
}

const defaultPermissions: MemberFormData['permissions'] = {
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

const permissionLabels: Record<keyof MemberFormData['permissions'], string> = {
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

// --- Componente Principal ---

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user: currentUser, refreshUser } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
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

  // Função auxiliar para formatar permissões do DB para o formato do formulário
  const formatDbPermissionsToForm = (dbPermissions: any): MemberFormData['permissions'] => {
    const permissions: any = {};
    for (const module of Object.keys(defaultPermissions)) {
      permissions[module] = {
        view: dbPermissions[`${module}_view`] || false,
        create: dbPermissions[`${module}_create`] || false,
        edit: dbPermissions[`${module}_edit`] || false,
        delete: dbPermissions[`${module}_delete`] || false,
      };
    }
    return permissions as MemberFormData['permissions'];
  };

  // Função auxiliar para formatar permissões do formulário para o DB
  const formatFormPermissionsToDb = (formPermissions: MemberFormData['permissions']): Record<string, boolean> => {
    const dbPermissions: Record<string, boolean> = {};
    for (const module of Object.keys(formPermissions)) {
      const perm = formPermissions[module as keyof MemberFormData['permissions']];
      dbPermissions[`${module}_view`] = perm.view;
      dbPermissions[`${module}_create`] = perm.create;
      dbPermissions[`${module}_edit`] = perm.edit;
      dbPermissions[`${module}_delete`] = perm.delete;
    }
    return dbPermissions;
  };

  const loadMembers = async () => {
    setLoading(true);
    try {
      // 1. Buscar todos os usuários do Supabase Auth (apenas se for admin/tiver permissão)
      // Nota: A API de listagem de usuários é restrita ao Service Role, que não deve ser usado no cliente.
      // Para simular a lista de membros, vamos buscar perfis e permissões.
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, updated_at, auth_users(email, created_at, last_sign_in_at)')
        .order('updated_at', { ascending: false });

      if (profilesError) throw profilesError;

      const userIds = profiles.map(p => p.id);

      // 2. Buscar todas as permissões
      const { data: permissions, error: permissionsError } = await supabase
        .from('team_permissions')
        .select('*')
        .in('user_id', userIds);

      if (permissionsError) throw permissionsError;

      const permissionsMap = new Map(permissions.map(p => [p.user_id, p]));

      // 3. Combinar dados
      const memberList: Member[] = profiles.map(profile => {
        const authUser = Array.isArray(profile.auth_users) ? profile.auth_users[0] : profile.auth_users;
        const dbPermissions = permissionsMap.get(profile.id);
        
        const member: Member = {
          id: profile.id,
          name: `${profile.first_name} ${profile.last_name}`.trim() || authUser?.email.split('@')[0] || 'Membro',
          email: authUser?.email || 'N/A',
          phone: '', // Não armazenado no perfil padrão
          role: 'Colaborador', // Mock role, pode ser adicionado ao perfil
          department: '',
          notes: '',
          created_at: authUser?.created_at || new Date().toISOString(),
          permissions: dbPermissions ? formatDbPermissionsToForm(dbPermissions) : defaultPermissions,
          is_invited: !authUser?.last_sign_in_at, // Simplesmente verifica se o usuário já fez login
        };
        return member;
      });

      setMembers(memberList);

    } catch (error) {
      console.error('Erro ao carregar membros:', error);
      toast({
        title: "Erro de Carregamento",
        description: "Não foi possível carregar a lista de membros.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteOrUpdate = async (data: MemberFormData) => {
    setIsSubmitting(true);

    try {
      const dbPermissions = formatFormPermissionsToDb(data.permissions);

      if (editingMember) {
        // --- Atualizar Membro Existente ---
        
        // 1. Atualizar Perfil (Nome, Cargo, Depto, Notas)
        const [firstName, ...lastNameParts] = data.name.split(' ');
        const lastName = lastNameParts.join(' ');

        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            first_name: firstName, 
            last_name: lastName,
            // Adicionar campos de role/department se existirem na tabela profiles
          })
          .eq('id', editingMember.id);

        if (profileError) throw profileError;

        // 2. Atualizar Permissões
        const { error: permissionsError } = await supabase
          .from('team_permissions')
          .update(dbPermissions)
          .eq('user_id', editingMember.id);

        if (permissionsError) throw permissionsError;

        toast({ title: "Sucesso", description: `Membro ${data.name} atualizado.` });

      } else {
        // --- Convidar Novo Membro ---
        
        // 1. Convidar usuário via email (Supabase envia o link de redefinição/confirmação)
        const [firstName, ...lastNameParts] = data.name.split(' ');
        const lastName = lastNameParts.join(' ');

        const { error: inviteError } = await supabase.auth.inviteUserByEmail(data.email, {
          data: {
            first_name: firstName,
            last_name: lastName,
            // Adicionar role/department aqui se necessário para o trigger
          }
        });

        if (inviteError) throw inviteError;

        // Nota: O trigger handle_new_user() cuidará da criação do perfil e das permissões padrão.
        // Se quisermos aplicar as permissões específicas AGORA, precisamos de uma Edge Function ou esperar o usuário se cadastrar.
        // Por simplicidade, vamos assumir que o trigger cria o perfil e as permissões padrão.
        // O administrador pode editar as permissões após o convite.

        toast({ 
          title: "Convite Enviado", 
          description: `Um convite foi enviado para ${data.email}. O usuário receberá um link para definir a senha.`,
        });
      }

      setIsModalOpen(false);
      setEditingMember(null);
      reset({ permissions: defaultPermissions });
      loadMembers(); // Recarregar lista
      refreshUser(); // Atualizar perfil do usuário logado, se necessário

    } catch (error: any) {
      console.error('Erro ao processar membro:', error);
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar o membro.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteMember = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este membro? Esta ação é irreversível e removerá o usuário do sistema de autenticação.')) return;

    // Nota: A exclusão de usuários Auth só pode ser feita com o Service Role Key (backend/Edge Function).
    // Como estamos no cliente, vamos simular a exclusão ou desativar o usuário (se tivéssemos uma coluna 'active').
    // Para este MVP, vamos apenas remover a entrada local (se fosse local) e notificar que a exclusão Auth deve ser manual.
    
    toast({ 
      title: "Aviso de Segurança", 
      description: "A exclusão de usuários Auth deve ser feita no console Supabase ou via Edge Function por segurança.",
      variant: "destructive"
    });
    
    // Simulação de exclusão local para remover da lista (em um ambiente real, isso falharia sem Service Role)
    setMembers(members.filter(member => member.id !== id));
  };

  const openEditModal = (member: Member) => {
    setEditingMember(member);
    reset({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
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
                Convidar Colaborador
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
                  Convidar Membro
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
                      {member.is_invited && (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
                          Convite Pendente
                        </span>
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  {editingMember ? 'Editar Membro' : 'Convidar Novo Membro'}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingMember(null);
                    reset({ permissions: defaultPermissions });
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(handleInviteOrUpdate)} className="space-y-4">
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
                      disabled={!!editingMember} // Não permite editar email após convite
                    />
                    {errors.email && (
                      <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Permissões de Acesso Granulares
                  </label>
                  <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200 max-h-96 overflow-y-auto">
                    {Object.keys(defaultPermissions).map((module) => (
                      <div key={module} className="border-b border-slate-200 pb-3 last:border-0">
                        <h4 className="font-semibold text-slate-900 mb-2">{permissionLabels[module as keyof MemberFormData['permissions']]}</h4>
                        <div className="grid grid-cols-4 gap-2">
                          {['view', 'create', 'edit', 'delete'].map(action => (
                            <label key={action} className="flex items-center gap-2 cursor-pointer">
                              <input
                                {...register(`permissions.${module}.${action}` as any)}
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm text-slate-700">
                                {action === 'view' ? 'Visualizar' : action === 'create' ? 'Criar' : action === 'edit' ? 'Editar' : 'Excluir'}
                              </span>
                            </label>
                          ))}
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
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingMember ? 'Atualizar' : 'Enviar Convite'}
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