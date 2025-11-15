'use client';

import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { User, Mail, Phone, Building } from 'lucide-react';

export default function ProfileSettingsPage() {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Configurações de Perfil</h1>
            <p className="text-slate-600 mt-1">Gerencie as informações da sua agência e dados de contato.</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-3xl">
            <h2 className="text-xl font-semibold mb-4">Informações da Agência</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                <Building className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Nome da Agência</p>
                  <p className="text-lg font-semibold text-slate-900">AgencyHub</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Email Principal</p>
                  <p className="text-lg font-semibold text-slate-900">admin@agencia.com</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                <Phone className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Telefone</p>
                  <p className="text-lg font-semibold text-slate-900">(11) 98765-4321</p>
                </div>
              </div>
            </div>
            <button className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Editar Informações
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}