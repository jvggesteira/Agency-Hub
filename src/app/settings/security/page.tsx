'use client';

import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { Lock, Key, ShieldCheck } from 'lucide-react';

export default function SecuritySettingsPage() {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Configurações de Segurança</h1>
            <p className="text-slate-600 mt-1">Gerencie sua senha e autenticação de dois fatores.</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-3xl space-y-6">
            <div className="border-b pb-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Key className="h-6 w-6 text-orange-600" />
                Alterar Senha
              </h2>
              <p className="text-sm text-slate-600 mb-4">Mantenha sua conta segura usando uma senha forte e única.</p>
              <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors">
                Redefinir Senha
              </button>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-green-600" />
                Autenticação de Dois Fatores (2FA)
              </h2>
              <p className="text-sm text-slate-600 mb-4">Adicione uma camada extra de segurança à sua conta.</p>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="font-medium text-green-800">2FA Ativa</p>
                <button className="text-sm text-green-600 hover:underline">Desativar</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}