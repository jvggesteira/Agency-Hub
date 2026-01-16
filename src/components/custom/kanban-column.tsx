'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { HelpCircle } from 'lucide-react';

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: any[];
  children: React.ReactNode;
  color: string;
  description?: string; // Campo de descrição adicionado
}

export function KanbanColumn({ id, title, tasks, children, color, description }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const taskIds = tasks.map(task => task.id);

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "bg-slate-50 dark:bg-slate-900 rounded-lg p-4 flex flex-col h-full min-h-[600px] transition-all duration-200 border border-slate-200 dark:border-slate-800",
        isOver && "bg-slate-100 dark:bg-slate-800 ring-2 ring-blue-500 ring-opacity-50"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <span className={cn("w-3 h-3 rounded-full", color)}></span>
          {title}
          {/* Ícone de ajuda com tooltip nativo (não corta) */}
          {description && (
            <div className="cursor-help" title={description}>
                <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" />
            </div>
          )}
        </h3>
        <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-500">
            {tasks.length}
        </span>
      </div>
      
      <div className="flex-1 flex flex-col gap-3">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
        
        <div className="flex-grow min-h-[50px] bg-transparent" />
      </div>
    </div>
  );
}