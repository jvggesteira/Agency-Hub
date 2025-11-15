'use client';

import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { Bell, Mail, Smartphone, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function NotificationsSettingsPage() {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Configurações de Notificações</h1>
            <p className="text-slate-600 mt-1">Gerencie como e quando você recebe alertas.</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-3xl space-y-6">
            <h2 className="text-xl font-semibold mb-4">Alertas de Performance</h2>
            
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-slate-900">Alertas de Métrica Crítica</p>
                  <p className="text-sm text-slate-600">Receber notificação quando CPL ou ROAS atingir limites.</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>

            <h2 className="text-xl font-semibold mb-4 pt-4">Canais de Comunicação</h2>

            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-slate-900">Notificações por Email</p>
                  <p className="text-sm text-slate-600">Receber resumos diários e alertas por email.</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-slate-900">Notificações Push (App)</p>
                  <p className="text-sm text-slate-600">Receber alertas em tempo real no navegador/aplicativo.</p>
                </div>
              </div>
              <Switch defaultChecked={false} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}