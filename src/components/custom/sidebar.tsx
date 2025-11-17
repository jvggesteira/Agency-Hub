'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  DollarSign, 
  BarChart3, 
  FolderOpen, 
  Target, 
  Bell, 
  Settings,
  Briefcase,
  UserCog,
  Activity,
  TrendingUp // Adicionado para DRE
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Tarefas', href: '/tasks', icon: CheckSquare },
  { name: 'Financeiro', href: '/finances', icon: DollarSign },
  { name: 'DRE', href: '/dre', icon: TrendingUp }, // Re-adicionado
  { name: 'Produtividade', href: '/productivity', icon: Activity },
  { name: 'Dashboards', href: '/dashboards', icon: BarChart3 },
  { name: 'Projetos Freelancer', href: '/freelancer-projects', icon: Briefcase },
  { name: 'Documentos', href: '/documents', icon: FolderOpen },
  { name: 'Metas', href: '/goals', icon: Target },
  { name: 'Alertas', href: '/alerts', icon: Bell },
  { name: 'Equipe', href: '/team', icon: UserCog },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-slate-700 px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">AgencyHub</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="border-t border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-sm font-semibold text-white">AG</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Minha Agência</p>
            <p className="text-xs text-slate-400 truncate">admin@agencia.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}