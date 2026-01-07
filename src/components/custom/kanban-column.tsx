'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: any[];
  children: React.ReactNode;
  color: string;
}

export function KanbanColumn({ id, title, tasks, children, color }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const taskIds = tasks.map(task => task.id);

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        // Adicionado h-full e aumentado min-h para garantir área de drop grande
        "bg-slate-50 dark:bg-slate-900 rounded-lg p-4 flex flex-col h-full min-h-[600px] transition-all duration-200 border border-slate-200 dark:border-slate-800",
        // Feedback visual mais forte quando estiver arrastando por cima
        isOver && "bg-slate-100 dark:bg-slate-800 ring-2 ring-blue-500 ring-opacity-50"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <span className={cn("w-3 h-3 rounded-full", color)}></span>
          {title}
        </h3>
        <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-500">
            {tasks.length}
        </span>
      </div>
      
      {/* O flex-1 e o gap garantem que a lista ocupe o espaço */}
      <div className="flex-1 flex flex-col gap-3">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
        
        {/* Espaçador invisível no final: Garante que se soltar no final da coluna, funciona */}
        <div className="flex-grow min-h-[50px] bg-transparent" />
      </div>
    </div>
  );
}