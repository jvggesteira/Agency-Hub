'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Edit, Trash2, Calendar, User, Building, Flame, Snowflake, Minus, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskProps {
  id: string;
  title: string;
  description?: string;
  priority: string;
  dueDate?: string; // Garantindo camelCase para compatibilidade
  status?: string;
  assignedTo?: string; 
  assignee_name?: string; 
  client_name?: string;
  sub_project?: string;
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

  // --- Lógica de Prazo ---
  const getDeadlineStatus = () => {
    if (!task.dueDate || task.status === 'concluida' || task.status === 'cancelada') return null;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Tratamento de fuso horário: Adiciona T12:00:00 se vier apenas YYYY-MM-DD
    let dateStr = task.dueDate;
    if (!dateStr.includes('T')) dateStr += 'T12:00:00';
    
    const due = new Date(dateStr);
    due.setHours(0,0,0,0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: `${Math.abs(diffDays)}d atraso`, color: 'text-red-700 bg-red-100 border-red-200', icon: AlertCircle };
    if (diffDays === 0) return { label: 'Vence Hoje', color: 'text-amber-700 bg-amber-100 border-amber-200', icon: Clock };
    if (diffDays <= 2) return { label: `${diffDays}d rest.`, color: 'text-yellow-700 bg-yellow-100 border-yellow-200', icon: Clock };
    
    // Se estiver no prazo longo, mostra apenas a data em cinza
    return { label: new Date(dateStr).toLocaleDateString('pt-BR'), color: 'text-slate-500 bg-slate-100 border-slate-200', icon: Calendar };
  };

  const deadlineInfo = getDeadlineStatus();

  // --- Lógica Visual de Temperatura (CRM) ou Prioridade (Tarefa) ---
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
        isDragging && "ring-2 ring-blue-500 shadow-xl rotate-2",
        // Borda vermelha à esquerda se atrasado
        deadlineInfo?.label.includes('atraso') ? "border-l-4 border-l-red-500" : ""
      )}
    >
      <div className="flex flex-col gap-3">
        
        {/* Cabeçalho: Título e Badges */}
        <div className="flex justify-between items-start gap-2">
           <div className="flex flex-col gap-1 flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-2 leading-tight">
                    {task.title}
                </h3>
                
                <div className="flex flex-wrap gap-1 mt-1">
                    {/* Badge de Prazo */}
                    {deadlineInfo && (
                        <div className={cn("flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md w-fit border font-bold", deadlineInfo.color)}>
                            <deadlineInfo.icon className="h-3 w-3" />
                            <span>{deadlineInfo.label}</span>
                        </div>
                    )}
                     {/* Badge de Sub-Projeto */}
                    {task.sub_project && (
                         <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 border dark:border-slate-700 truncate max-w-[100px]">
                            {task.sub_project}
                        </span>
                    )}
                </div>
           </div>
          
           {/* Badge de Prioridade ou Temperatura */}
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

        {/* Informações: Cliente e Responsável */}
        <div className="flex flex-col gap-2 mt-1">
          {displayClientName && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <Building className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{displayClientName}</span>
            </div>
          )}

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
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2 right-2 bg-white dark:bg-slate-900 pl-2 shadow-sm rounded-tl-md">
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