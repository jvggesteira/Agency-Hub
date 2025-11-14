'use client';

import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { Settings as SettingsIcon, User, Bell, Lock, Palette, Database } from 'lucide-react';

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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                <User className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Perfil</h3>
              <p className="text-sm text-slate-600">Informações da agência e dados pessoais</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Notificações</h3>
              <p className="text-sm text-slate-600">Configure alertas e notificações</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Segurança</h3>
              <p className="text-sm text-slate-600">Senha e autenticação</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4">
                <Palette className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Aparência</h3>
              <p className="text-sm text-slate-600">Tema e personalização</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4">
                <Database className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Integrações</h3>
              <p className="text-sm text-slate-600">Meta Ads, Google Ads e APIs</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center mb-4">
                <SettingsIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Geral</h3>
              <p className="text-sm text-slate-600">Configurações gerais do sistema</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
