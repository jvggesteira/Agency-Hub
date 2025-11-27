import { useAuth } from '@/hooks/use-auth'; // Ajuste o import se seu arquivo se chama diferente

export function usePermission() {
  const { user } = useAuth();

  const can = (module: string, action: 'view' | 'create' | 'edit' | 'delete') => {
    if (!user) return false;

    // 1. Super Admin (Email ou Cargo)
    if (user.email === 'jvggesteira@gmail.com' || user.role === 'manager' || user.role === 'admin') {
      return true;
    }

    // 2. Verificação Granular
    if (user.permissions && user.permissions[module]) {
      return user.permissions[module][action] === true;
    }

    return false;
  };

  return { can };
}