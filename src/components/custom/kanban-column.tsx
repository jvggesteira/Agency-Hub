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
  description?: string;
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
        "bg-slate-50/80 dark:bg-white/[0.02] rounded-2xl p-4 flex flex-col h-full min-h-[600px] transition-all duration-200 border border-slate-200/80 dark:border-white/[0.06]",
        isOver && "bg-purple-50/50 dark:bg-purple-500/5 ring-2 ring-purple-500/40"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <span className={cn("w-2.5 h-2.5 rounded-full", color)}></span>
          {title}
          {description && (
            <div className="cursor-help" title={description}>
                <HelpCircle className="h-3.5 w-3.5 text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60 transition-colors" />
            </div>
          )}
        </h3>
        <span className="bg-white dark:bg-white/[0.06] px-2 py-0.5 rounded-lg text-xs font-semibold border border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-white/40">
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