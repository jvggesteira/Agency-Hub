'use client';

import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { Settings as SettingsIcon, User, Bell, Lock, Palette, Database } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/hooks/use-permission';
import AccessDenied from '@/components/custom/access-denied';

const settingsItems = [
  { 
    title: 'Perfil', 
    description: 'Informações da agência e dados pessoais', 
    icon: User, 
    href: '/settings/profile',
    // Cores removidas pois usamos estilo minimalista agora
  },
  { 
    title: 'Notificações', 
    description: 'Configure alertas e notificações', 
    icon: Bell, 
    href: '/settings/notifications',
  },
  { 
    title: 'Segurança', 
    description: 'Senha e autenticação', 
    icon: Lock, 
    href: '/settings/security',
  },
  { 
    title: 'Aparência', 
    description: 'Tema e personalização', 
    icon: Palette, 
    href: '/settings/appearance',
  },
  { 
    title: 'Integrações', 
    description: 'Meta Ads, Google Ads e APIs', 
    icon: Database, 
    href: '/settings/integrations',
  },
  { 
    title: 'Geral', 
    description: 'Configurações gerais do sistema', 
    icon: SettingsIcon, 
    href: '/settings/general',
  },
];

export default function SettingsPage() {
  const { can } = usePermission();

  if (!can('settings', 'view')) {
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Configurações</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Gerencie as configurações da sua agência</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {settingsItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link 
                  key={item.title} 
                  href={item.href}
                  className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-all cursor-pointer block h-full group"
                >
                  {/* Ícone Minimalista: Borda fina, sem fundo colorido */}
                  <div className="h-12 w-12 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-4 bg-slate-50 dark:bg-slate-950 group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-colors">
                    <Icon className="h-6 w-6 text-slate-700 dark:text-slate-200 stroke-[1.5]" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{item.description}</p>
                </Link>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}