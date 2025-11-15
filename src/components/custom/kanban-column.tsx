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
        "bg-slate-50 rounded-lg p-4 flex flex-col min-h-[300px] transition-colors",
        isOver && "bg-slate-100/70"
      )}
    >
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <span className={cn("w-3 h-3 rounded-full", color)}></span>
        {title} ({tasks.length})
      </h3>
      
      <div className="flex-1 space-y-3">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </div>
    </div>
  );
}