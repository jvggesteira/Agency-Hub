'use client';

import { Search, Bell, Menu } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getInitials } from '@/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between transition-colors duration-300">
      
      {/* Área da Esquerda: Busca */}
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar clientes, tarefas..."
            className="w-full h-10 pl-10 pr-4 rounded-lg text-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-700 transition-all"
          />
        </div>
      </div>

      {/* Área da Direita: Notificações e Perfil */}
      <div className="flex items-center gap-4">
        
        {/* Botão de Notificação */}
        <button className="relative p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950" />
        </button>

        {/* Dropdown do Usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <div className="h-9 w-9 rounded-full bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white font-semibold text-sm cursor-pointer hover:ring-2 hover:ring-slate-200 dark:hover:ring-slate-700 transition-all">
               {user ? getInitials(user.first_name, user.last_name) : 'GM'}
            </div>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <DropdownMenuLabel className="text-slate-900 dark:text-white">Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />
            <div className="px-2 py-1.5 text-sm text-slate-500 dark:text-slate-400 break-all">
              {user?.email}
            </div>
            <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />
            <DropdownMenuItem className="cursor-pointer text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800">
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800">
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />
            <DropdownMenuItem 
              className="cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20"
              onClick={signOut}
            >
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}