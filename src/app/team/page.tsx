'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { inviteUser } from '@/actions/invite-user';
import { getRolePresets, saveRolePreset, deleteRolePreset } from '@/actions/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast'; 
import { usePermission } from '@/hooks/use-permission';
import AccessDenied from '@/components/custom/access-denied';
import { 
    UserPlus, Mail, Shield, CheckCircle2, AlertCircle, 
    Save, Trash2, LayoutTemplate 
} from 'lucide-react';

// --- CONFIGURAÇÃO DOS MÓDULOS (Lista Completa) ---
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

// Permissões vazias (zeradas)
const EMPTY_PERMISSIONS: PermissionState = MODULES.reduce((acc, module) => ({
    ...acc,
    [module.id]: { view: false, create: false, edit: false, delete: false }
}), {});

export default function TeamPage() {
  const { can } = usePermission();

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

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Estado das Permissões
  const [permissions, setPermissions] = useState<PermissionState>(EMPTY_PERMISSIONS);

  // Estado dos Cargos Salvos (Presets)
  const [savedRoles, setSavedRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [newRoleName, setNewRoleName] = useState("");
  const [isSaveMode, setIsSaveMode] = useState(false);

  useEffect(() => {
    loadPresets();
  }, []);

  async function loadPresets() {
    const roles = await getRolePresets();
    setSavedRoles(roles || []);
  }

  const togglePermission = (module: string, type: 'view' | 'create' | 'edit' | 'delete') => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [type]: !prev[module][type]
      }
    }));
    setSelectedRole(""); // Limpa seleção se mexer manualmente
  };

  const handleSelectPreset = (roleId: string) => {
    setSelectedRole(roleId);
    if (!roleId) {
        setPermissions(EMPTY_PERMISSIONS);
        return;
    }
    const role = savedRoles.find(r => r.id === roleId);
    if (role) {
        // Mescla as permissões salvas com as vazias para garantir que novos módulos não quebrem
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(event.currentTarget);
    formData.append('permissions', JSON.stringify(permissions));
    
    const result = await inviteUser(formData);
    
    setIsLoading(false);

    if (result.success) {
      toast({ 
          title: "Convite Enviado!", 
          description: `Email enviado com sucesso.`, 
          className: "bg-green-600 text-white border-none" 
      });
      (event.target as HTMLFormElement).reset();
      setPermissions(EMPTY_PERMISSIONS);
      setSelectedRole("");
    } else {
      toast({ title: "Erro", description: result.message, variant: "destructive" });
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Gestão de Acessos</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Configure permissões ou use modelos pré-definidos.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                
                {/* DADOS BÁSICOS */}
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <UserPlus className="h-5 w-5" /> Dados do Colaborador
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome Completo</label>
                    <Input name="fullName" required placeholder="Ex: João Silva" className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 dark:text-white focus:ring-slate-900 dark:focus:ring-slate-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Corporativo</label>
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
                        
                        {/* Botão de Salvar Preset */}
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
                    
                    {/* Botão de excluir preset selecionado */}
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

                {/* LISTA DE PERMISSÕES (CHECKBOXES) */}
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
                        className="bg-slate-900 hover:bg-slate-800 text-white min-w-[200px] h-12 text-base dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 transition-all"
                    >
                        {isLoading ? 'Processando...' : 'Enviar Convite'}
                    </Button>
                </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}