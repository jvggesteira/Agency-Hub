'use client';

import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { Settings, Globe, Clock } from 'lucide-react';

export default function GeneralSettingsPage() {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Configurações Gerais</h1>
            <p className="text-slate-600 mt-1">Ajustes de idioma, fuso horário e padrões do sistema.</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-3xl space-y-6">
            <h2 className="text-xl font-semibold mb-4">Localização</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-slate-600" />
                  <p className="font-medium text-slate-900">Idioma</p>
                </div>
                <p className="text-sm text-slate-600">Português (Brasil)</p>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-slate-600" />
                  <p className="font-medium text-slate-900">Fuso Horário</p>
                </div>
                <p className="text-sm text-slate-600">America/Sao_Paulo (GMT-3)</p>
              </div>
            </div>
            
            <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Salvar Alterações
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}