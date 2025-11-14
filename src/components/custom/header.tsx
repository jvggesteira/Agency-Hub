'use client';

import { Bell, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Header() {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Buscar clientes, tarefas..."
            className="pl-10 bg-slate-50 border-slate-200 focus:bg-white"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-slate-600" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
        </Button>
        
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5 text-slate-600" />
        </Button>
      </div>
    </header>
  );
}
