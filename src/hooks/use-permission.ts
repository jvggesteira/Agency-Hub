import { useAuth } from '@/hooks/use-auth';

// LISTA DE MÓDULOS PERMITIDOS
export type ModuleName = 
  | 'dashboard'           // 1. Visão Geral do Sistema (Home)
  | 'dashboards'          // 2. Relatórios Automáticos (Meta/Google Ads)
  | 'clients' 
  | 'tasks' 
  | 'finance' 
  | 'dre' 
  | 'productivity' 
  | 'freelancer_projects' 
  | 'projects_freelancer' // Mantendo compatibilidade
  | 'documents' 
  | 'goals' 
  | 'alerts' 
  | 'team' 
  | 'settings' 
  | 'crm';

export type ActionName = 'view' | 'create' | 'edit' | 'delete';

export function usePermission() {
  const { user } = useAuth();

  const can = (module: ModuleName, action: ActionName) => {
    if (!user) return false;

    // 1. Super Admin (Email Mestre ou Role Admin) tem acesso total
    if (user.email === 'jvggesteira@gmail.com' || user.role === 'manager' || user.role === 'admin') {
      return true;
    }

    // 2. Verificação Granular baseada no JSON do banco
    if (user.permissions && user.permissions[module]) {
      return user.permissions[module][action] === true;
    }

    return false;
  };

  return { can };
}