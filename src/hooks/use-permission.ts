import { useAuth } from './use-auth';

export function usePermission() {
  const { user } = useAuth();

  // Função interna que verifica as permissões
  const can = (module: string, action: 'view' | 'create' | 'edit' | 'delete') => {
    
    // 1. Se não tiver usuário logado, nega imediatamente
    if (!user) return false;

    // 🚨 CHAVE MESTRA: Seu e-mail entra sempre (Ignora erros de banco/role)
    if (user.email === 'contato@assessoriagm.com') {
        return true;
    }

    // 2. Tenta ler o cargo (role) de forma segura
    // O uso de 'as any' evita erro de tipagem se o Typescript reclamar
    const userRole = (user as any).role;

    // 3. Se for ADMIN (aceita inglês ou português), libera tudo
    if (userRole === 'admin' || userRole === 'administrador') {
        return true;
    }

    // 4. Verifica as permissões granulares (JSON)
    const userPermissions = (user as any).permissions;

    // Se não tiver o objeto de permissões, nega
    if (!userPermissions) return false;

    // Se o módulo específico não existir nas permissões, nega
    if (!userPermissions[module]) return false;

    // Retorna true se a ação específica estiver marcada como true
    return userPermissions[module][action] === true;
  };

  // 👇 ESTA É A LINHA MAIS IMPORTANTE QUE ESTAVA FALTANDO OU NO LUGAR ERRADO
  return { can };
}