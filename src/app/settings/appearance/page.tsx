// src/app/settings/appearance/page.tsx

'use client'; // Componente de cliente para usar hooks

import { useState } from 'react';
import { Sidebar } from '@/components/custom/sidebar'; // Ajuste conforme seu caminho real
import { Header } from '@/components/custom/header';   // Ajuste conforme seu caminho real
import { Sun, Moon, Palette } from 'lucide-react';  // Componentes de ícone
import { useTheme } from '@/context/theme-context';   // Hook do tema

export default function AppearanceSettingsPage() {
  // Conecta o hook real para gerenciar o estado do tema
  const { theme, setTheme } = useTheme();

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
              
              {/* CARD 1: CLARO */}
              <div 
                // Função de clique
                onClick={() => setTheme('light')}
                // Sintaxe de className limpa e robusta (sem template strings complexas)
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  theme === 'light' 
                  ? 'border-blue-600 ring-4 ring-blue-100' 
                  : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Sun className="h-6 w-6 text-yellow-500 mb-2" />
                <p className="font-medium">Claro</p>
                <p className="text-sm text-slate-500">Interface clara e brilhante.</p>
              </div>

              {/* CARD 2: ESCURO */}
              <div 
                // Função de clique
                onClick={() => setTheme('dark')}
                // Sintaxe de className limpa e robusta
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  theme === 'dark' 
                  ? 'border-blue-600 ring-4 ring-blue-100' 
                  : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Moon className="h-6 w-6 text-slate-800 mb-2" />
                <p className="font-medium">Escuro</p>
                <p className="text-sm text-slate-500">Interface escura para ambientes com pouca luz.</p>
              </div>

            </div>
            
            <hr className="my-6 border-slate-200" />

            {/* Seção de Cores Personalizadas (Próximo Passo) */}
            <h2 className="text-xl font-semibold mb-4">Cores da Marca</h2>
            <p className="text-slate-600">Selecione a cor primária para botões e elementos de destaque.</p>
            
            {/* O SELETOR DE CORES ENTRARÁ AQUI */}
            <div className="flex items-center space-x-4">
                <Palette className="h-6 w-6 text-slate-600" />
                <p>Seletor de cores a ser implementado...</p>
            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
}