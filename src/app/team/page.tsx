'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { getRolePresets, saveRolePreset, deleteRolePreset } from '@/actions/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast'; 
import { usePermission } from '@/hooks/use-permission';
import AccessDenied from '@/components/custom/access-denied';
import { supabase } from '@/lib/supabase'; // Importação direta do Supabase client
import { 
    UserPlus, Shield, CheckCircle2, Save, Trash2, LayoutTemplate, Users, Loader2, Mail 
} from 'lucide-react';

// --- CONFIGURAÇÃO DOS MÓDULOS ---
const MODULES = [
  { id: 'dashboard_main', label: 'Dashboard Principal' },
  { id: 'clients', label: 'Clientes' },
  { id: 'tasks', label: 'Tarefas' },
  { id: 'finances', label: 'Financeiro' },
  { id: 'dre', label: 'DRE' },
  { id: 'productivity', label: 'Produtividade' },
  { id: 'analytics_dashboards', label: 'Dashboards (Relatórios)' },
  { id: 'freelancer_projects', label: 'Projetos Freelancer' },
  { id: 'documents', label: 'Documentos' },
  { id: 'goals', label: 'Metas' },
  { id: 'alerts', label: 'Alertas' },
  { id: 'team', label: 'Gestão de Equipe' },
  { id: 'settings', label: 'Configurações' },
  { id: 'crm', label: 'CRM (Vendas)' },
];

type PermissionState = {
  [moduleId: string]: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  }
};

const EMPTY_PERMISSIONS: PermissionState = MODULES.reduce((acc, module) => ({
    ...acc,
    [module.id]: { view: false, create: false, edit: false, delete: false }
}), {});

export default function TeamPage() {
  const { can } = usePermission();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [permissions, setPermissions] = useState<PermissionState>(EMPTY_PERMISSIONS);
  const [savedRoles, setSavedRoles] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]); // Estado para lista de membros
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [newRoleName, setNewRoleName] = useState("");
  const [isSaveMode, setIsSaveMode] = useState(false);

  useEffect(() => {
    loadPresets();
    loadTeamMembers();
  }, []);

  async function loadPresets() {
    const roles = await getRolePresets();
    setSavedRoles(roles || []);
  }

  // --- CARREGAR MEMBROS DA EQUIPE ---
  async function loadTeamMembers() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.error("Erro ao carregar membros:", error);
      }
      
      if (data) setTeamMembers(data);
  }

  const togglePermission = (module: string, type: 'view' | 'create' | 'edit' | 'delete') => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [type]: !prev[module][type]
      }
    }));
    setSelectedRole(""); 
  };

  const handleSelectPreset = (roleId: string) => {
    setSelectedRole(roleId);
    if (!roleId) {
        setPermissions(EMPTY_PERMISSIONS);
        return;
    }
    const role = savedRoles.find(r => r.id === roleId);
    if (role) {
        setPermissions({ ...EMPTY_PERMISSIONS, ...role.permissions });
        toast({ title: "Modelo Carregado", description: `Permissões de "${role.name}" aplicadas.` });
    }
  };

  const handleSavePreset = async () => {
    if (!newRoleName.trim()) {
        toast({ title: "Nome obrigatório", description: "Dê um nome para o cargo.", variant: "destructive" });
        return;
    }
    
    const result = await saveRolePreset(newRoleName, permissions);
    if (result.success) {
        toast({ title: "Cargo Salvo!", description: `O modelo "${newRoleName}" foi salvo.`, className: "bg-green-600 text-white border-none" });
        setNewRoleName("");
        setIsSaveMode(false);
        loadPresets();
    } else {
        toast({ title: "Erro", description: "Não foi possível salvar o modelo.", variant: "destructive" });
    }
  };

  const handleDeletePreset = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(!confirm("Tem certeza que deseja excluir este modelo de cargo?")) return;
      
      await deleteRolePreset(id);
      loadPresets();
      if (selectedRole === id) {
          setSelectedRole("");
          setPermissions(EMPTY_PERMISSIONS);
      }
      toast({ title: "Excluído", description: "Modelo de cargo removido." });
  }

  // --- NOVA FUNÇÃO DE SUBMIT USANDO A API DO GMAIL ---
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const fullName = formData.get('fullName') as string;

    try {
        // Chama nossa API personalizada que usa o Gmail
        const response = await fetch('/api/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                name: fullName,
                role: 'collaborator',
                permissions: permissions
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
             toast({ 
                title: "Convite Enviado!", 
                description: `E-mail enviado para ${email} com sucesso via Gmail.`, 
                className: "bg-green-600 text-white border-none" 
            });
            (event.target as HTMLFormElement).reset();
            setPermissions(EMPTY_PERMISSIONS);
            setSelectedRole("");
            loadTeamMembers(); // Atualiza a lista lateral
        } else {
            throw new Error(result.error || 'Erro desconhecido');
        }

    } catch (error: any) {
        console.error("Erro ao convidar:", error);
        toast({ title: "Erro no envio", description: error.message, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }

  // --- FUNÇÃO PARA REMOVER MEMBRO (Visualmente e do Banco) ---
  const handleRemoveMember = async (id: string) => {
      if(!confirm("Tem certeza que deseja remover este membro da equipe? Ele perderá o acesso.")) return;
      
      // Remove da tabela profiles (o que impede o login no frontend)
      // Nota: Para segurança total, idealmente deveria remover do Auth via API também, mas isso resolve o acesso imediato ao app.
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      
      if(error) {
          toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
      } else {
          toast({ title: "Membro removido", description: "O acesso foi revogado." });
          loadTeamMembers();
      }
  };

  if (!can('team', 'view')) {
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
          
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Gestão de Equipe</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Convide membros, defina cargos e gerencie acessos.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                
                {/* COLUNA ESQUERDA: FORMULÁRIO DE CONVITE (Maior parte) */}
                <div className="xl:col-span-8">
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                        
                        {/* DADOS BÁSICOS */}
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <UserPlus className="h-5 w-5" /> Enviar Novo Convite
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome Completo</label>
                            <Input name="fullName" required placeholder="Ex: João Silva" className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 dark:text-white focus:ring-slate-900 dark:focus:ring-slate-400" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email (Gmail ou Corporativo)</label>
                            <Input name="email" type="email" required placeholder="joao@agencia.com" className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 dark:text-white focus:ring-slate-900 dark:focus:ring-slate-400" />
                          </div>
                        </div>

                        <hr className="my-6 border-slate-100 dark:border-slate-800" />

                        {/* ÁREA DE CARGOS PRÉ-DEFINIDOS */}
                        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/30">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2">
                                        <LayoutTemplate className="h-4 w-4" /> Carregar Modelo de Cargo
                                    </label>
                                    <select 
                                        value={selectedRole} 
                                        onChange={(e) => handleSelectPreset(e.target.value)}
                                        className="w-full h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Personalizado / Selecione...</option>
                                        {savedRoles.map(role => (
                                            <option key={role.id} value={role.id}>{role.name}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="flex items-end">
                                    {!isSaveMode ? (
                                        <button 
                                            type="button"
                                            onClick={() => setIsSaveMode(true)}
                                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mb-2 sm:mb-0"
                                        >
                                            <Save className="h-4 w-4" /> Salvar configuração atual como novo cargo
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2 w-full">
                                            <Input 
                                                value={newRoleName}
                                                onChange={(e) => setNewRoleName(e.target.value)}
                                                placeholder="Nome do cargo (Ex: Gestor)"
                                                className="h-10 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 dark:text-white"
                                                autoFocus
                                            />
                                            <Button type="button" onClick={handleSavePreset} className="bg-green-600 hover:bg-green-700 text-white h-10">
                                                Salvar
                                            </Button>
                                            <Button type="button" onClick={() => setIsSaveMode(false)} variant="ghost" className="h-10 text-slate-600 dark:text-slate-400">
                                                Cancelar
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {selectedRole && (
                                <div className="mt-2 flex justify-end">
                                    <button 
                                        type="button"
                                        onClick={(e) => handleDeletePreset(e, selectedRole)}
                                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                                    >
                                        <Trash2 className="h-3 w-3" /> Excluir este modelo
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* LISTA DE PERMISSÕES */}
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Shield className="h-5 w-5" /> Configuração de Acessos
                        </h2>
                        
                        <div className="space-y-4">
                            {MODULES.map((module) => (
                                <div key={module.id} className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="min-w-[200px]">
                                            <span className="font-medium text-slate-900 dark:text-white">{module.label}</span>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-4">
                                            {['view', 'create', 'edit', 'delete'].map((type) => {
                                                const labels = { view: 'Ver', create: 'Criar', edit: 'Editar', delete: 'Excluir' };
                                                const isChecked = permissions[module.id]?.[type as keyof typeof permissions[string]];
                                                
                                                return (
                                                    <label key={type} className="flex items-center gap-2 cursor-pointer select-none group">
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                                            isChecked
                                                                ? 'bg-slate-900 border-slate-900 dark:bg-white dark:border-white' 
                                                                : 'bg-white border-gray-300 dark:bg-slate-950 dark:border-slate-600 group-hover:border-slate-400'
                                                        }`}>
                                                            {isChecked && (
                                                                <CheckCircle2 className="h-3.5 w-3.5 text-white dark:text-slate-900" />
                                                            )}
                                                        </div>
                                                        <input 
                                                            type="checkbox" 
                                                            className="hidden"
                                                            checked={isChecked}
                                                            onChange={() => togglePermission(module.id, type as any)}
                                                        />
                                                        <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                                            {labels[type as keyof typeof labels]}
                                                        </span>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <Button 
                                type="submit" 
                                disabled={isLoading} 
                                className="bg-slate-900 hover:bg-slate-800 text-white min-w-[250px] h-12 text-base dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 transition-all shadow-lg"
                            >
                                {isLoading ? (
                                    <><Loader2 className="animate-spin mr-2 h-5 w-5"/> Enviando...</>
                                ) : (
                                    <><Mail className="mr-2 h-5 w-5"/> Enviar Convite por Email</>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* COLUNA DIREITA: LISTA DE MEMBROS (Nova Área) */}
                <div className="xl:col-span-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-6">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-semibold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                <Users className="h-5 w-5"/> Membros da Equipe
                            </h3>
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs px-2 py-1 rounded-full font-bold">
                                {teamMembers.length}
                            </span>
                        </div>
                        
                        <div className="p-4 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
                            {teamMembers.length === 0 ? (
                                <div className="text-center py-10 px-4">
                                    <div className="bg-slate-50 dark:bg-slate-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Users className="h-6 w-6 text-slate-400"/>
                                    </div>
                                    <p className="text-sm text-slate-500">Nenhum membro encontrado.</p>
                                    <p className="text-xs text-slate-400 mt-1">Envie um convite para começar.</p>
                                </div>
                            ) : (
                                teamMembers.map(member => (
                                    <div key={member.id} className="group p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">
                                                        {member.name?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                                                        {member.name || 'Sem nome'}
                                                    </p>
                                                </div>
                                                <p className="text-xs text-slate-500 truncate pl-8">{member.email}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveMember(member.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                title="Remover acesso"
                                            >
                                                <Trash2 className="h-4 w-4"/>
                                            </button>
                                        </div>
                                        <div className="mt-3 pl-8 flex gap-2">
                                            <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                                                {member.role || 'Colaborador'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}