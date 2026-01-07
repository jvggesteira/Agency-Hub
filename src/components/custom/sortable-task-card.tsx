'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Edit, Trash2, Calendar, User, Building, Flame, Snowflake, Minus, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskProps {
  id: string;
  title: string;
  description?: string;
  priority: string;
  dueDate?: string;
  assignedTo?: string; 
  assignee_name?: string; 
  client_name?: string;
  // Campos específicos de CRM
  temperature?: 'quente' | 'morno' | 'frio'; 
  budget?: string;
}

interface SortableTaskCardProps {
  task: TaskProps;
  clientName: string | null;
  getPriorityColor: (priority: string) => string;
  openEditModal: (task: any) => void;
  deleteTask: (id: string) => void;
  onCardClick?: () => void;
}

export function SortableTaskCard({ 
  task, 
  clientName, 
  getPriorityColor, 
  openEditModal, 
  deleteTask,
  onCardClick 
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'Task', task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.7 : 1,
  };

  const displayClientName = task.client_name || clientName;
  const displayAssignee = task.assignee_name || "Sem responsável";

  const handleAction = (e: React.PointerEvent | React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    e.preventDefault();
    action();
  };

  // --- Lógica Visual de Temperatura ---
  const getTemperatureStyle = (temp?: string) => {
    switch(temp) {
      case 'quente': return { class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: Flame, label: 'Quente' };
      case 'frio': return { class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Snowflake, label: 'Frio' };
      default: return { class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Minus, label: 'Morno' };
    }
  };

  const tempStyle = getTemperatureStyle(task.temperature);
  const TempIcon = tempStyle.icon;

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      {...attributes}
      {...listeners}
      onClick={onCardClick}
      className={cn(
        "bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative mb-3",
        isDragging && "ring-2 ring-blue-500 shadow-xl rotate-2"
      )}
    >
      <div className="flex flex-col gap-3">
        
        {/* Cabeçalho: Título e Badge (Prioridade ou Temperatura) */}
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-2 leading-tight">
            {task.title}
          </h3>
          
          {/* Se tiver temperatura (Lead), mostra ela. Se não, mostra prioridade (Tarefa) */}
          {task.temperature ? (
             <span className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap shrink-0 flex items-center gap-1",
                tempStyle.class
              )}>
                <TempIcon className="h-3 w-3" />
                {tempStyle.label}
             </span>
          ) : (
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap shrink-0",
              getPriorityColor(task.priority)
            )}>
              {task.priority}
            </span>
          )}
        </div>

        {/* Informações: Data e Cliente */}
        <div className="flex flex-col gap-2">
          {task.dueDate && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{new Date(task.dueDate).toLocaleDateString('pt-BR')}</span>
            </div>
          )}

          {displayClientName && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <Building className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{displayClientName}</span>
            </div>
          )}

          {/* --- RODAPÉ INTELIGENTE --- */}
          {/* Se for Lead (tem budget), mostra Valor. Se for Tarefa, mostra Responsável */}
          {task.budget ? (
             <div className="flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-1.5 rounded-md w-fit mt-1">
                <DollarSign className="h-3.5 w-3.5" />
                <span>{task.budget}</span>
             </div>
          ) : (
             <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-md w-fit mt-1">
                <User className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span className="font-medium truncate max-w-[150px]">{displayAssignee}</span>
             </div>
          )}
        </div>

        {/* Botões de Ação (Hover) */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2 right-2 bg-white dark:bg-slate-900 pl-2">
          <button
            onPointerDown={(e) => handleAction(e, () => openEditModal(task))}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors z-20"
            title="Editar"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
          
          <button
            onPointerDown={(e) => handleAction(e, () => deleteTask(task.id))}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors z-20"
            title="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}