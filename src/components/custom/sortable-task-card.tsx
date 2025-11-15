'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Edit, Trash2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableTaskCardProps {
  task: any;
  clientName: string | null;
  getPriorityColor: (priority: string) => string;
  openEditModal: (task: any) => void;
  deleteTask: (id: string) => void;
}

export function SortableTaskCard({ 
  task, 
  clientName, 
  getPriorityColor, 
  openEditModal, 
  deleteTask 
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      {...attributes}
      className={cn(
        "bg-white rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow cursor-grab",
        isDragging && "ring-2 ring-blue-500 shadow-xl"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1" {...listeners}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-slate-900">{task.title}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
          </div>
          {task.description && (
            <p className="text-sm text-slate-600 mb-2 line-clamp-2">{task.description}</p>
          )}
          <div className="flex flex-col gap-1 text-sm text-slate-500">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(task.dueDate).toLocaleDateString('pt-BR')}
              </div>
            )}
            {task.assignedTo && (
              <div className="flex items-center gap-1">
                <span>👤 {task.assignedTo}</span>
              </div>
            )}
            {clientName && (
              <div className="flex items-center gap-1">
                <span>🏢 {clientName}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-1 ml-4">
          <button
            onClick={() => openEditModal(task)}
            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => deleteTask(task.id)}
            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
            title="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}