'use client';

import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { Database, Settings, Link, BarChart3 } from 'lucide-react';
import LinkNext from 'next/link';

export default function IntegrationsSettingsPage() {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Configurações de Integrações</h1>
            <p className="text-slate-600 mt-1">Conecte serviços externos para automatizar dados e relatórios.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            <LinkNext href="/dashboards" className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer block">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Integrações de Mídia</h3>
              <p className="text-sm text-slate-600">Gerencie conexões com Meta Ads, Google Ads e outras plataformas de anúncios.</p>
            </LinkNext>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4">
                <Link className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">APIs e Webhooks</h3>
              <p className="text-sm text-slate-600">Configure chaves de API e webhooks para comunicação com sistemas customizados.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}