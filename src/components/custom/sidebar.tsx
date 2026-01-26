'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getInitials } from '@/lib/utils';
import {
  LayoutDashboard, Users, DollarSign,
  BarChart2, PieChart, Briefcase, Folder,
  Users2, Settings, LogOut,
  ChevronLeft, ChevronRight, BarChart3, Megaphone, Building2 // <--- Building2 já importado
} from 'lucide-react';

// Configuração dos itens do menu
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Visão Geral', href: '/overview', icon: Building2 }, // <--- ADICIONADO AQUI
  { name: 'Clientes', href: '/clients', icon: Users }, 
  { name: 'CRM', href: '/crm', icon: Megaphone },
  { name: 'Financeiro', href: '/finances', icon: DollarSign },
  { name: 'DRE', href: '/dre', icon: BarChart2 },
  { name: 'Dashboards', href: '/dashboards', icon: PieChart },
  { name: 'Projetos Freelancer', href: '/freelancer-projects', icon: Briefcase },
  { name: 'Documentos', href: '/documents', icon: Folder },
  { name: 'Equipe', href: '/team', icon: Users2 },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  
  // Estado para controlar se está colapsado ou não
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div 
      className={`
        relative flex flex-col h-full bg-[#11061e] border-r border-slate-800
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Botão de Alternar (Toggle) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-slate-800 border border-slate-600 text-slate-300 rounded-full p-1 hover:bg-slate-700 hover:text-white transition-colors z-50"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {/* Logo */}
      <div className={`flex h-16 items-center border-b border-slate-800 ${isCollapsed ? 'justify-center' : 'px-6'}`}>
        <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
          <div className="h-8 w-8 min-w-[2rem] rounded-lg bg-slate-800 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          
          {/* Texto do Logo (some se estiver fechado) */}
          <span className={`text-xl font-bold text-white whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
            GM Hub
          </span>
        </Link>
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={isCollapsed ? item.name : ''} // Mostra tooltip nativo quando fechado
              className={`
                flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
                ${isCollapsed ? 'justify-center' : ''}
                ${isActive 
                  ? 'bg-slate-800 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }
              `}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              
              {/* Texto do Link (some se estiver fechado) */}
              <span className={`whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Info do Usuário e Logout */}
      <div className="border-t border-slate-800 p-4 overflow-hidden">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          
          {/* Avatar + Info */}
          <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="h-10 w-10 min-w-[2.5rem] rounded-full bg-slate-950 flex items-center justify-center border border-slate-800 text-white font-semibold text-sm">
              {user ? getInitials(user.first_name, user.last_name) : 'GM'}
            </div>
            
            <div className={`flex flex-col min-w-0 transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
              <p className="text-sm font-medium text-white truncate">
                {user ? `${user.first_name} ${user.last_name}` : 'Carregando...'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {user?.email || 'admin@agencia.com'}
              </p>
            </div>
          </div>

          {/* Botão Sair (some se estiver muito fechado ou vira um ícone pequeno) */}
          {!isCollapsed && (
            <button
              onClick={signOut}
              title="Sair"
              className="p-2 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}