'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { Palette, Sun, Moon } from 'lucide-react';

export default function AppearanceSettingsPage() {
  // Mock state for theme
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
    // Em um app real, você usaria next-themes ou lógica de localStorage aqui
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Configurações de Aparência</h1>
            <p className="text-slate-600 mt-1">Personalize o tema e a interface do usuário.</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-3xl space-y-6">
            <h2 className="text-xl font-semibold mb-4">Tema</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div 
                onClick={() => setTheme('light')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  theme === 'light' ? 'border-blue-600 ring-4 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Sun className="h-6 w-6 text-yellow-500 mb-2" />
                <p className="font-medium">Claro</p>
                <p className="text-sm text-slate-500">Interface clara e brilhante.</p>
              </div>

              <div 
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  theme === 'dark' ? 'border-blue-600 ring-4 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                Moon className="h-6 w-6 text-slate-800 mb-2" />
                <p className="font-medium">Escuro</p>
                <p className="text-sm text-slate-500">Interface escura para ambientes com pouca luz.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}