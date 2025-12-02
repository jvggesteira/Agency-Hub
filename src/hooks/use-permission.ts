import { useAuth } from '@/hooks/use-auth';

export function usePermission() {
  const { user } = useAuth();

  const can = (module: string, action: 'view' | 'create' | 'edit' | 'delete') => {
    if (!user) return false;

    // Converte para 'any' para evitar erro de tipagem no TypeScript
    // Isso permite acessar propriedades dinâmicas sem travar o build
    const safeUser = user as any;

    // 1. Super Admin (Email ou Cargo)
    if (safeUser.email === 'jvggesteira@gmail.com' || safeUser.role === 'manager' || safeUser.role === 'admin') {
      return true;
    }

    // 2. Verificação Granular
    if (safeUser.permissions && safeUser.permissions[module]) {
      return safeUser.permissions[module][action] === true;
    }

    return false;
  };

  return { can };
}