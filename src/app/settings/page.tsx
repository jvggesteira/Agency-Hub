'use client';

import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { Settings as SettingsIcon, User, Bell, Lock, Palette, Database } from 'lucide-react';
import Link from 'next/link';

const settingsItems = [
  { 
    title: 'Perfil', 
    description: 'Informações da agência e dados pessoais', 
    icon: User, 
    href: '/settings/profile',
    color: 'from-blue-500 to-purple-600'
  },
  { 
    title: 'Notificações', 
    description: 'Configure alertas e notificações', 
    icon: Bell, 
    href: '/settings/notifications',
    color: 'from-green-500 to-emerald-600'
  },
  { 
    title: 'Segurança', 
    description: 'Senha e autenticação', 
    icon: Lock, 
    href: '/settings/security',
    color: 'from-orange-500 to-red-600'
  },
  { 
    title: 'Aparência', 
    description: 'Tema e personalização', 
    icon: Palette, 
    href: '/settings/appearance',
    color: 'from-purple-500 to-pink-600'
  },
  { 
    title: 'Integrações', 
    description: 'Meta Ads, Google Ads e APIs', 
    icon: Database, 
    href: '/settings/integrations',
    color: 'from-cyan-500 to-blue-600'
  },
  { 
    title: 'Geral', 
    description: 'Configurações gerais do sistema', 
    icon: SettingsIcon, 
    href: '/settings/general',
    color: 'from-slate-500 to-slate-700'
  },
];

export default function SettingsPage() {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Configurações</h1>
            <p className="text-slate-600 mt-1">Gerencie as configurações da sua agência</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {settingsItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link 
                  key={item.title} 
                  href={item.href}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer block"
                >
                  <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.description}</p>
                </Link>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}