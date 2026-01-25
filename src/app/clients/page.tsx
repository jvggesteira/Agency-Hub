'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { 
  Search, Plus, Mail, Phone, Building, FileText, Folder, Upload, Download, Trash2, Clock, DollarSign, X, Edit, AlertCircle, Loader2, FolderPlus, ChevronLeft, CornerUpLeft,
  CheckSquare, Calendar, User, Target, Bell, LayoutGrid, List, MessageSquare, Send, Filter, TrendingUp, TrendingDown, Activity, Users, AlertTriangle, Info, Zap, RefreshCw,
  CheckCircle, Percent, Wallet, PieChart, Settings, ArrowUp, ArrowDown, HelpCircle, Save, CalendarDays,
  // Ícones adicionados para as novas funções:
  Palette, Repeat, ChevronUp, ChevronDown, CheckCircle2, History
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/use-permission';
import { useAuth } from '@/hooks/use-auth';
import AccessDenied from '@/components/custom/access-denied';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DndContext, DragEndEvent, pointerWithin } from '@dnd-kit/core';
import { KanbanColumn } from '@/components/custom/kanban-column';
import { SortableTaskCard } from '@/components/custom/sortable-task-card';
import { format, addDays, addWeeks, addMonths, nextDay } from 'date-fns';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ==================================================================================
// --- 1. VIEW CLIENTES ---
// ==================================================================================

const clientSchema = z.object({
  name: z.string().min(1, 'Nome do contato é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  feeType: z.enum(['fixed', 'variable', 'hybrid']),
  value: z.string().optional(),
  commissionPercent: z.string().optional(),
  contractDuration: z.string().min(1, "Duração obrigatória"),
  contractStartDate: z.string().min(1, "Início obrigatório"),
  notes: z.string().optional(),
});
type ClientFormData = z.infer<typeof clientSchema>;
const DEFAULT_FOLDERS = ['Contratos', 'Briefing', 'Tráfego Pago', 'Orgânico', 'Geral'];

function ClientsView() {
  const { can } = usePermission(); // Hook de permissão
  const [clients, setClients] = useState<any[]>([]);
  const [financialStatus, setFinancialStatus] = useState<any>({});
  const [monthlyStats, setMonthlyStats] = useState({ expected: 0, paid: 0, overdue: 0, open: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChurnModalOpen, setIsChurnModalOpen] = useState(false);
  const [clientToChurn, setClientToChurn] = useState<any | null>(null);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'dados' | 'historico' | 'docs'>('dados');
  
  const [subProjects, setSubProjects] = useState<string[]>([]);
  const [newSubProject, setNewSubProject] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  
  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema), defaultValues: { status: 'active', contractDuration: '12', feeType: 'fixed' }
  });
  const feeType = watch('feeType');

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data: clientsData } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    
    const today = new Date();
    const startMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const endMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();
    
    const { data: transactions } = await supabase.from('transactions')
        .select('client_id, status, date, id, amount')
        .eq('type', 'income')
        .gte('date', startMonth)
        .lte('date', endMonth);
        
    const statusMap: any = {};
    const activeClientIds = new Set(clientsData?.filter((c: any) => c.status === 'active').map((c: any) => c.id) || []);
    let totalExpected = 0, totalPaid = 0, totalOverdue = 0, totalOpen = 0;
    const todayNormalized = new Date(); todayNormalized.setHours(0,0,0,0);

    if (transactions) {
        transactions.forEach((t: any) => {
            if (!statusMap[t.client_id] || t.status === 'paid' || t.status === 'done') {
                statusMap[t.client_id] = { status: t.status, date: t.date, txId: t.id };
            }
            if (activeClientIds.has(t.client_id)) {
                const amount = Number(t.amount || 0);
                totalExpected += amount;
                if (t.status === 'done' || t.status === 'paid') totalPaid += amount;
                else {
                    const dueDate = new Date(t.date); dueDate.setHours(0,0,0,0);
                    if (dueDate.getTime() < todayNormalized.getTime()) totalOverdue += amount;
                    else totalOpen += amount;
                }
            }
        });
    }
    setFinancialStatus(statusMap);
    setMonthlyStats({ expected: totalExpected, paid: totalPaid, overdue: totalOverdue, open: totalOpen });
    
    if (clientsData) {
        setClients(clientsData.map((c: any) => ({ 
            ...c, 
            value: c.value || c.contract_value || 0,
            sub_projects: c.sub_projects || []
        })));
    }
    setLoading(false);
  };

  const handleQuickPay = async (clientId: string, txId: string) => {
      // Apenas quem edita financeiro ou clientes deveria poder pagar, mas deixarei aberto por enquanto ou vinculado ao financeiro
      if (!confirm("Confirmar que o cliente realizou o pagamento deste mês?")) return;
      const { error } = await supabase.from('transactions').update({ status: 'done' }).eq('id', txId);
      if (error) toast({ title: "Erro", description: "Não foi possível baixar.", variant: "destructive" });
      else { toast({ title: "Pago!", description: "Baixa realizada com sucesso.", className: "bg-green-600 text-white" }); fetchClients(); }
  };

  const generateFinancialRecords = async (clientId: string, value: number, duration: number, startDate: string, clientName: string) => {
      if (value <= 0) return;
      const transactions = [];
      const start = new Date(startDate + 'T12:00:00');
      const baseDay = start.getDate();
      const today = new Date(); today.setHours(0,0,0,0);

      for (let i = 0; i < duration; i++) {
          const date = new Date(start);
          date.setMonth(start.getMonth() + i);
          if (date.getDate() !== baseDay) date.setDate(0);
          const maxDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
          if (baseDay > maxDays) date.setDate(maxDays); else date.setDate(baseDay);

          if (date.getTime() >= today.getTime()) {
              transactions.push({
                  description: `Contrato: ${clientName}`,
                  amount: value,
                  type: 'income',
                  category: 'Vendas',
                  classification: 'fixo',
                  payment_method: 'boleto',
                  date: date.toISOString(),
                  client_id: clientId,
                  status: 'pending',
                  installment_number: i + 1,
                  installment_total: duration
              });
          }
      }
      if (transactions.length > 0) await supabase.from('transactions').insert(transactions);
  };

  const onSubmit = async (data: ClientFormData) => {
    try {
        const rawValue = data.value ? parseInt(data.value.replace(/\D/g, "")) / 100 : 0;
        const duration = parseInt(data.contractDuration);
        const commission = data.commissionPercent ? parseFloat(data.commissionPercent.replace(',', '.')) : 0;
        const displayName = data.company || data.name;

        const payload = {
            name: data.name, email: data.email, phone: data.phone, company: data.company, address: data.address,
            status: data.status, 
            value: rawValue, contract_value: rawValue, fee_type: data.feeType, commission_percent: commission,
            contract_duration: duration, contract_start_date: data.contractStartDate, notes: data.notes,
            sub_projects: subProjects
        };

        if (editingClient) {
            await supabase.from('clients').update(payload).eq('id', editingClient.id);
            const today = new Date().toISOString();
            await supabase.from('transactions').delete().eq('client_id', editingClient.id).eq('status', 'pending').gte('date', today);
            if (rawValue > 0 && data.status === 'active') await generateFinancialRecords(editingClient.id, rawValue, duration, data.contractStartDate, displayName);
            toast({ title: "Cliente e Financeiro Atualizados" });
        } else {
            const { data: newClient, error } = await supabase.from('clients').insert(payload).select().single();
            if (error) throw error;
            if (newClient && rawValue > 0) await generateFinancialRecords(newClient.id, rawValue, duration, data.contractStartDate, displayName);
            toast({ title: "Cliente criado" });
        }
        setIsModalOpen(false); fetchClients(); reset(); setSubProjects([]);
    } catch (error: any) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
  };

  const handleEdit = (client: any) => {
    // TRAVA DE SEGURANÇA NO CLICK
    if (!can('clients', 'edit')) return; 
    
    setEditingClient(client); setActiveTab('dados');
    setValue('name', client.name); setValue('email', client.email);
    setValue('phone', client.phone || ''); setValue('company', client.company || ''); setValue('address', client.address || '');
    setValue('status', client.status); 
    setValue('feeType', client.fee_type || 'fixed');
    setValue('value', client.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    setValue('commissionPercent', client.commission_percent?.toString());
    setValue('contractDuration', client.contract_duration?.toString() || '12');
    setValue('contractStartDate', client.contract_start_date?.split('T')[0] || new Date().toISOString().split('T')[0]);
    setValue('notes', client.notes || '');
    setSubProjects(client.sub_projects || []);
    fetchClientDetails(client.id, client.contract_url); setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    // TRAVA DE SEGURANÇA
    if (!can('clients', 'delete')) return;

    if (!confirm('ATENÇÃO: Excluir apagará TODO o histórico financeiro. Prefira "Encerrar Contrato". Deseja excluir?')) return;
    await supabase.from('clients').delete().eq('id', id);
    setClients(clients.filter(c => c.id !== id));
    toast({ title: "Cliente excluído" });
  };

  const handleChurn = async () => {
      // Churn é um tipo de edição
      if (!can('clients', 'edit')) return;
      if (!clientToChurn) return;
      try {
          await supabase.from('clients').update({ status: 'inactive' }).eq('id', clientToChurn.id);
          const { count } = await supabase.from('transactions').delete({ count: 'exact' }).eq('client_id', clientToChurn.id).eq('status', 'pending');
          toast({ title: "Contrato Encerrado", description: `Cliente inativado e ${count} lançamentos pendentes removidos.` });
          setIsChurnModalOpen(false); setClientToChurn(null); fetchClients();
      } catch (error) { toast({ title: "Erro", variant: "destructive" }); }
  };

  // ... (Outras funções auxiliares mantidas: handleAddSubProject, handleRemoveSubProject, etc.)
  const handleAddSubProject = () => { if (newSubProject.trim() && !subProjects.includes(newSubProject.trim())) { setSubProjects([...subProjects, newSubProject.trim()]); setNewSubProject(''); }};
  const handleRemoveSubProject = (idx: number) => { setSubProjects(subProjects.filter((_, i) => i !== idx)); };
  const handleCurrencyInput = (e: React.ChangeEvent<HTMLInputElement>) => { let value = e.target.value.replace(/\D/g, ""); value = (Number(value) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); setValue('value', value); };
  
  const stats = useMemo(() => {
      const activeClients = clients.filter(c => c.status === 'active');
      const totalActive = activeClients.length;
      const values = activeClients.map(c => Number(c.value) || 0);
      const totalRevenue = values.reduce((a, b) => a + b, 0);
      const avgTicket = totalActive > 0 ? totalRevenue / totalActive : 0;
      const maxFee = values.length > 0 ? Math.max(...values) : 0;
      const minFee = values.length > 0 ? Math.min(...values) : 0;
      return { totalActive, avgTicket, maxFee, minFee, totalRevenue };
  }, [clients]);

  const fetchClientDetails = async (clientId: string, contractUrl?: string) => {
    const { data: logsData } = await supabase.from('client_logs').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    if (logsData) setLogs(logsData);
    const prefix = `client_${clientId}/`;
    const { data: files } = await supabase.storage.from('contracts').list(prefix, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
    const loadedDocs: any[] = [];
    const foundFolders = new Set<string>();
    if (files) {
        files.forEach(file => {
            const parts = file.name.split('___');
            let folderName = 'Geral'; let fileName = file.name;
            if (parts.length > 1) { folderName = parts[0]; fileName = parts.slice(1).join('___'); }
            const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(`${prefix}${file.name}`);
            loadedDocs.push({ name: fileName, folder: folderName, url: urlData.publicUrl, date: file.created_at || new Date().toISOString() });
            foundFolders.add(folderName);
        });
    }
    if (contractUrl && !loadedDocs.some(d => d.url === contractUrl)) {
        loadedDocs.push({ name: 'Contrato Inicial', url: contractUrl, date: new Date().toISOString(), folder: 'Contratos', isInitial: true });
    }
    setDocs(loadedDocs);
    setCustomFolders(Array.from(foundFolders).filter(f => !DEFAULT_FOLDERS.includes(f)));
    setCurrentFolder(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !editingClient) return;
    const targetFolder = currentFolder || 'Geral'; setUploading(true); const file = e.target.files[0];
    try {
        const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_'); const path = `client_${editingClient.id}/${targetFolder}___${cleanName}`;
        await supabase.storage.from('contracts').upload(path, file);
        const { data } = supabase.storage.from('contracts').getPublicUrl(path);
        setDocs([{ name: cleanName, folder: targetFolder, url: data.publicUrl, date: new Date().toISOString() }, ...docs]);
        await supabase.from('client_logs').insert({ client_id: editingClient.id, content: `Arquivo anexado em ${targetFolder}: ${file.name}`, type: 'file' });
        toast({ title: "Arquivo enviado!" });
    } catch { toast({ title: "Erro no upload", variant: "destructive" }); } finally { setUploading(false); }
  };

  const handleCreateFolder = () => { const name = prompt("Nome da pasta:"); if(name && !DEFAULT_FOLDERS.includes(name) && !customFolders.includes(name)) setCustomFolders([...customFolders, name]); };
  const allFolders = [...DEFAULT_FOLDERS, ...customFolders];

  const renderPaymentStatus = (clientId: string) => {
      const statusData = financialStatus[clientId];
      if (!statusData) return <span className="text-xs text-slate-400 italic">Sem cobrança</span>;
      if (statusData.status === 'paid' || statusData.status === 'done') return <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200"><CheckCircle className="h-3 w-3" /> <span className="text-xs font-bold">Pago</span></div>;
      else {
          const today = new Date(); today.setHours(0,0,0,0);
          const dueDate = new Date(statusData.date); dueDate.setHours(0,0,0,0);
          const isLate = dueDate.getTime() < today.getTime();
          return (
              <button onClick={(e) => { e.stopPropagation(); handleQuickPay(clientId, statusData.txId); }}
                className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all hover:shadow-md ${isLate ? 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100' : 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100'}`}
                title={`Vencimento: ${dueDate.toLocaleDateString()}`}>
                  {isLate ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  <span className="text-xs font-bold">{isLate ? 'Atrasado' : 'A Vencer'}</span>
              </button>
          );
      }
  };

  const filteredClients = clients.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
  });

  const getDaysRemaining = (startStr: string, duration: number) => {
      if (!startStr) return null;
      const start = new Date(startStr); const end = new Date(start); end.setMonth(start.getMonth() + duration);
      const today = new Date(); const diffTime = end.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
        {/* DASHBOARD FINANCEIRO E BUSCA - Mantido igual */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"><p className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><Users className="h-3 w-3"/> Clientes Ativos</p><p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalActive}</p></div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-l-4 border-l-blue-500 shadow-sm"><p className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><DollarSign className="h-3 w-3"/> MRR Contratado</p><p className="text-2xl font-bold text-blue-600 mt-1">{stats.totalRevenue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p></div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-l-4 border-l-green-500 shadow-sm"><p className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><Wallet className="h-3 w-3"/> Recebido (Mês)</p><p className="text-2xl font-bold text-green-600 mt-1">{monthlyStats.paid.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p><div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden"><div className="bg-green-500 h-1.5" style={{width: `${monthlyStats.expected > 0 ? (monthlyStats.paid/monthlyStats.expected)*100 : 0}%`}}></div></div></div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-l-4 border-l-red-500 shadow-sm"><p className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3"/> Inadimplência</p><p className="text-2xl font-bold text-red-600 mt-1">{monthlyStats.overdue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p></div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-l-4 border-l-amber-500 shadow-sm"><p className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><Clock className="h-3 w-3"/> A Receber</p><p className="text-2xl font-bold text-amber-600 mt-1">{monthlyStats.open.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p></div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border dark:border-slate-800 flex justify-between gap-4">
            <div className="relative flex-1 flex gap-2">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input className="w-full pl-10 pr-4 py-2 border rounded-lg bg-transparent dark:text-white dark:border-slate-700" placeholder="Buscar clientes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="h-10 px-3 border rounded-lg bg-white dark:bg-slate-950 dark:text-white dark:border-slate-700 text-sm font-medium"><option value="active">Ativos</option><option value="inactive">Inativos (Churn)</option><option value="all">Todos</option></select>
            </div>
            
            {/* BOTÃO NOVO CLIENTE (Escondido se não tiver permissão de create) */}
            {can('clients', 'create') && (
                <Button onClick={() => { setEditingClient(null); reset(); setIsModalOpen(true); }} className="bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                    <Plus className="mr-2 h-4 w-4"/> Novo Cliente
                </Button>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map(client => {
                const daysRemaining = getDaysRemaining(client.contract_start_date, client.contract_duration);
                return (
                <div key={client.id} className={`p-5 rounded-xl border hover:shadow-md transition-shadow ${client.status === 'inactive' ? 'bg-slate-50 dark:bg-slate-900/50 opacity-70 border-slate-200' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                    {/* ... (Cabeçalho do Card mantido igual) ... */}
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">{(client.company || client.name).charAt(0).toUpperCase()}</div>
                            <div>{client.company ? (<><h3 className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{client.company}</h3><p className="text-xs text-slate-500">{client.name}</p></>) : (<><h3 className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{client.name}</h3><p className="text-xs text-slate-500">PF</p></>)}</div>
                        </div>
                        <div>{renderPaymentStatus(client.id)}</div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
                        <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-green-600"/> <div className="flex flex-col"><span className="font-semibold">{client.value > 0 ? client.value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : 'Variável'}</span>{client.commission_percent > 0 && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 rounded-full w-fit font-bold mt-0.5">+ {client.commission_percent}% Ads</span>}</div></div>
                        <div className="flex items-center gap-2 text-xs"><Calendar className="h-4 w-4 text-blue-500"/><span>{client.contract_duration} meses</span>{daysRemaining !== null && (<span className={`ml-auto font-bold ${daysRemaining < 30 ? 'text-red-500' : 'text-slate-500'}`}>{daysRemaining > 0 ? `${daysRemaining} dias rest.` : 'Finalizado'}</span>)}</div>
                        {client.sub_projects && client.sub_projects.length > 0 && (<div className="flex flex-wrap gap-1 mt-2">{client.sub_projects.map((sp: string, i: number) => (<span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 border dark:border-slate-700">{sp}</span>))}</div>)}
                    </div>
                    
                    <div className="flex flex-col gap-2 pt-2 border-t dark:border-slate-800">
                        {/* NOVO BOTÃO DE ANALYTICS */}
                    <Link href={`/clients/${client.id}/analytics`} className="w-full">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                             Performance 🚀
                        </Button>
                    </Link>

                    {/* MANTÉM OS BOTÕES ANTIGOS ABAIXO EM UMA LINHA */}
                    <div className="flex gap-2 w-full">
                        {/* Botão Gerenciar (Editar) */}
                        {can('clients', 'edit') ? (
                            <Button variant="outline" className="flex-1" onClick={() => handleEdit(client)}>Gerenciar</Button>
                        ) : (
                            <Button variant="outline" className="flex-1 opacity-50 cursor-not-allowed">Visualizar</Button>
                        )}

                        {/* Botão Churn (Editar status) */}
                        {can('clients', 'edit') && (
                            client.status === 'active' ? 
                            <Button variant="ghost" size="icon" onClick={() => { setClientToChurn(client); setIsChurnModalOpen(true); }} title="Encerrar Contrato"><Users className="h-4 w-4 text-amber-500"/></Button> :
                            <Button variant="ghost" size="icon" disabled><Users className="h-4 w-4 text-slate-300"/></Button>
                        )}

                        {/* Botão Excluir (Delete) */}
                        {can('clients', 'delete') && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(client.id)} title="Excluir Histórico"><Trash2 className="h-4 w-4 text-red-400"/></Button>
                        )}
                    </div>
                </div>
                </div>
                )})}
        </div>

        {/* MODAL CLIENTE e CHURN (Mantidos iguais, pois o controle é no botão de abrir) */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 rounded-xl max-w-4xl w-full h-[85vh] flex flex-col border dark:border-slate-800 shadow-2xl">
                    
                    {/* CABEÇALHO DO MODAL */}
                    <div className="flex flex-col bg-slate-50 dark:bg-slate-950 rounded-t-xl border-b dark:border-slate-800">
                        <div className="p-6 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold dark:text-white">
                                    {editingClient ? editingClient.name : 'Novo Cliente'}
                                </h2>
                                {editingClient && <p className="text-xs text-slate-500">Gerencie dados, contratos e histórico.</p>}
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="h-5 w-5"/></button>
                        </div>

                        {/* --- AQUI ESTAVAM FALTANDO AS ABAS --- */}
                        {editingClient && (
                            <div className="flex px-6 gap-6 text-sm font-medium text-slate-500">
                                <button 
                                    onClick={() => setActiveTab('dados')} 
                                    className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'dados' ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent hover:text-slate-700'}`}
                                >
                                    <User className="h-4 w-4"/> Dados Cadastrais
                                </button>
                                <button 
                                    onClick={() => setActiveTab('historico')} 
                                    className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'historico' ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent hover:text-slate-700'}`}
                                >
                                    <History className="h-4 w-4"/> Histórico & CRM
                                </button>
                                <button 
                                    onClick={() => setActiveTab('docs')} 
                                    className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'docs' ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent hover:text-slate-700'}`}
                                >
                                    <FileText className="h-4 w-4"/> Documentos
                                </button>
                            </div>
                        )}
                    </div>

                    {/* CONTEÚDO DO MODAL */}
                    <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900">
                        
                        {/* ABA 1: DADOS (FORMULÁRIO) */}
                        {(!editingClient || activeTab === 'dados') && (
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Empresa / Nome Fantasia</label><Input {...register('company')} className="dark:bg-slate-950"/></div>
                                    <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email Principal</label><Input {...register('email')} className="dark:bg-slate-950"/></div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Responsável</label><Input {...register('name')} className="dark:bg-slate-950"/></div>
                                    <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Telefone / WhatsApp</label><Input {...register('phone')} className="dark:bg-slate-950"/></div>
                                </div>

                                {/* CAMPO ENDEREÇO RESTAURADO */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Endereço Completo</label>
                                    <Input {...register('address')} placeholder="Rua, Número, Bairro, Cidade - UF" className="dark:bg-slate-950"/>
                                </div>

                                {/* FRENTES DE TRABALHO */}
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                   <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-blue-800 dark:text-blue-300"><Folder className="h-4 w-4"/> Frentes de Trabalho / Sub-Clientes</h3>
                                    <div className="flex gap-2 mb-3">
                                        <Input value={newSubProject} onChange={e => setNewSubProject(e.target.value)} placeholder="Ex: Só Multas B2B ou Cliente X" className="dark:bg-slate-950 h-9 bg-white"/>
                                        <Button type="button" onClick={handleAddSubProject} size="sm" className="bg-blue-600 text-white h-9 hover:bg-blue-700">Adicionar</Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {subProjects.map((sp, idx) => (
                                            <span key={idx} className="bg-white dark:bg-slate-950 border px-2 py-1 rounded text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300 shadow-sm">{sp}<button type="button" onClick={() => handleRemoveSubProject(idx)} className="text-red-500 hover:text-red-700"><X className="h-3 w-3"/></button></span>
                                        ))}
                                    </div>
                                </div>

                                {/* CONFIGURAÇÃO FINANCEIRA */}
                                <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-slate-700 dark:text-white"><DollarSign className="h-4 w-4"/> Configuração de Cobrança (Contrato)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <div><label className="text-[10px] uppercase font-bold text-slate-500">Modelo</label><select {...register('feeType')} className="w-full h-10 rounded-md border bg-white px-3 text-sm dark:border-slate-700 dark:text-white dark:bg-slate-900"><option value="fixed">Valor Fixo (Fee)</option><option value="hybrid">Híbrido (Fixo + %)</option><option value="variable">Variável (% Ads)</option></select></div>
                                        <div><label className="text-[10px] uppercase font-bold text-slate-500">Duração (Meses)</label><Input {...register('contractDuration')} type="number" className="dark:bg-slate-900 bg-white"/></div>
                                        <div><label className="text-[10px] uppercase font-bold text-slate-500">Início do Contrato</label><Input {...register('contractStartDate')} type="date" className="dark:bg-slate-900 bg-white"/></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {(feeType === 'fixed' || feeType === 'hybrid') && (<div><label className="text-[10px] uppercase font-bold text-slate-500">Valor Mensal (R$)</label><Input {...register('value')} onChange={handleCurrencyInput} className="dark:bg-slate-900 bg-white font-bold text-green-700" placeholder="R$ 0,00"/></div>)}
                                        {(feeType === 'hybrid' || feeType === 'variable') && (<div><label className="text-[10px] uppercase font-bold text-slate-500">Comissão de Ads (%)</label><Input {...register('commissionPercent')} className="dark:bg-slate-900 bg-white font-bold text-purple-600" placeholder="Ex: 10"/></div>)}
                                    </div>
                                </div>

                                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Observações Gerais</label><textarea {...register('notes')} className="w-full p-2 border rounded dark:bg-slate-950 dark:text-white dark:border-slate-700" rows={3}></textarea></div>
                                
                                <div className="flex justify-end pt-4 border-t dark:border-slate-800">
                                    <Button type="submit" disabled={isSubmitting} className="bg-slate-900 text-white hover:bg-slate-800 px-8">
                                        {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <><Save className="mr-2 h-4 w-4"/> Salvar Alterações</>}
                                    </Button>
                                </div>
                            </form>
                        )}

                        {/* ABA 2: HISTÓRICO (AGORA MOSTRA CRM) */}
                        {editingClient && activeTab === 'historico' && ( 
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="font-bold text-lg mb-4 dark:text-white flex items-center gap-2"><History className="h-5 w-5"/> Linha do Tempo</h3>
                                {logs.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-lg border border-dashed">Nenhum histórico registrado ainda.</div>
                                ) : (
                                    <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 space-y-8 pb-4">
                                        {logs.map((log, idx) => (
                                            <div key={log.id || idx} className="relative pl-8">
                                                {/* Bolinha da Linha do Tempo */}
                                                <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white dark:border-slate-900 ${log.content?.includes('[CRM]') ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
                                                
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                                        {new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    
                                                    {/* Card do Histórico */}
                                                    <div className={`p-4 rounded-lg border text-sm ${log.content?.includes('[CRM]') ? 'bg-blue-50 border-blue-100 text-slate-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-slate-200' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}>
                                                        {log.content?.includes('[CRM]') && (
                                                            <span className="inline-block bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded mb-2 font-bold uppercase">Origem: CRM</span>
                                                        )}
                                                        <div className="whitespace-pre-wrap leading-relaxed">
                                                            {log.content?.replace('[CRM]', '').trim()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div> 
                        )}

                        {/* ABA 3: DOCUMENTOS (RESTAURADA) */}
                        {editingClient && activeTab === 'docs' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex justify-between items-center mb-6 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border dark:border-slate-700">
                                    <div className="flex items-center gap-2">
                                        {currentFolder && <button onClick={() => setCurrentFolder(null)} className="hover:bg-slate-200 p-1 rounded"><ChevronLeft/></button>} 
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-500 uppercase font-bold">Pasta Atual</span>
                                            <span className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-white">
                                                <Folder className="h-5 w-5 text-blue-500"/> {currentFolder || 'Raiz (Todas as Pastas)'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {!currentFolder && <Button variant="outline" size="sm" onClick={handleCreateFolder} className="bg-white dark:bg-slate-900"><FolderPlus className="h-4 w-4 mr-2"/> Nova Pasta</Button>}
                                        {currentFolder && (
                                            <div>
                                                <input type="file" id="up" className="hidden" onChange={handleFileUpload} disabled={uploading}/>
                                                <label htmlFor="up" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium cursor-pointer flex items-center gap-2 shadow-sm transition-all">
                                                    {uploading ? <Loader2 className="animate-spin h-4 w-4"/> : <Upload className="h-4 w-4"/>} 
                                                    {uploading ? 'Enviando...' : 'Enviar Arquivo'}
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {!currentFolder ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {allFolders.map(f => (
                                            <div key={f} onClick={() => setCurrentFolder(f)} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all flex flex-col items-center group">
                                                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                                    <Folder className="h-8 w-8 text-blue-500"/> 
                                                </div>
                                                <span className="font-bold text-slate-700 dark:text-slate-200">{f}</span>
                                                <span className="text-xs text-slate-400 mt-1">{docs.filter(d => d.folder === f).length} arquivos</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {docs.filter(d => d.folder === currentFolder).length === 0 && (
                                            <div className="text-center py-10 text-slate-400">Pasta vazia. Envie o primeiro arquivo.</div>
                                        )}
                                        {docs.filter(d => d.folder === currentFolder).map((doc, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-sm transition-shadow group">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded text-slate-500">
                                                        <FileText className="h-5 w-5"/>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[300px]">{doc.name}</span>
                                                        <span className="text-xs text-slate-400">{new Date(doc.date).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <a href={doc.url} target="_blank" className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Baixar">
                                                    <Download className="h-5 w-5"/>
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {isChurnModalOpen && clientToChurn && (
            <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border-l-4 border-red-500 shadow-2xl animate-in zoom-in">
                    <div className="flex items-start gap-4">
                        <div className="bg-red-100 p-3 rounded-full"><AlertTriangle className="h-6 w-6 text-red-600"/></div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Encerrar Contrato?</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Você está prestes a inativar <strong>{clientToChurn.name}</strong>.</p>
                            <div className="flex gap-3 mt-6">
                                <Button variant="ghost" onClick={() => setIsChurnModalOpen(false)} className="flex-1">Cancelar</Button>
                                <Button onClick={handleChurn} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Confirmar Encerramento</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

// ==================================================================================
// --- 2. VIEW TAREFAS (COM COLUNAS DINÂMICAS E PRAZOS) ---
// ==================================================================================

// --- ATUALIZAÇÃO DO SCHEMA (Substitua o const taskSchema existente) ---
const taskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  priority: z.enum(['baixa', 'media', 'alta']),
  status: z.string().min(1, "Status obrigatório"),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
  clientId: z.string().optional(),
  subProject: z.string().optional(),
  // Novos campos de recorrência
  isRecurring: z.boolean().optional(),
  recurrenceInterval: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'custom']).optional(),
  recurrenceDayOfWeek: z.string().optional(),
  recurrenceCustomDays: z.string().optional(),
});
type TaskFormData = z.infer<typeof taskSchema>;

// Cores para as Colunas
const COLUMN_COLORS = [
  { name: 'Cinza', value: 'bg-slate-400' },
  { name: 'Azul', value: 'bg-blue-500' },
  { name: 'Verde', value: 'bg-green-500' },
  { name: 'Amarelo', value: 'bg-yellow-500' },
  { name: 'Vermelho', value: 'bg-red-500' },
  { name: 'Roxo', value: 'bg-purple-500' },
  { name: 'Laranja', value: 'bg-orange-500' },
  { name: 'Preto', value: 'bg-slate-900' },
];

const DEFAULT_COLUMNS = [
  { id: 'pendente', title: 'Pendente', color: 'bg-slate-400', description: 'Tarefas aguardando início.' },
  { id: 'em_andamento', title: 'Em Andamento', color: 'bg-blue-500', description: 'Tarefas sendo executadas no momento.' },
  { id: 'concluida', title: 'Concluída', color: 'bg-green-500', description: 'Tarefas finalizadas e entregues.' },
  { id: 'cancelada', title: 'Cancelada', color: 'bg-red-500', description: 'Tarefas que não serão mais realizadas.' },
];

// --- FUNÇÃO TASKSVIEW ATUALIZADA ---
function TasksView() {
  const { user } = useAuth();
  const { can } = usePermission();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  
  const [columns, setColumns] = useState<any[]>([]);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [newColumnDesc, setNewColumnDesc] = useState('');
  const [editingColumn, setEditingColumn] = useState<any | null>(null);

  const [clients, setClients] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [availableSubProjects, setAvailableSubProjects] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [subProjectFilter, setSubProjectFilter] = useState('all');
  const [deadlineFilter, setDeadlineFilter] = useState('all');
  
  const { register, handleSubmit, reset, watch, setValue } = useForm<TaskFormData>({ resolver: zodResolver(taskSchema) });
  const selectedClientId = watch('clientId');
  
  // Watchers para recorrência
  const isRecurring = watch('isRecurring');
  const recurrenceInterval = watch('recurrenceInterval');
  
  useEffect(() => { fetchData(); fetchColumns(); }, []);
  
  const fetchColumns = async () => {
      try {
          const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'kanban_columns').single();
          if (data?.value) setColumns(data.value);
          else setColumns(DEFAULT_COLUMNS);
      } catch (err) { console.error(err); }
  };

  const saveColumnsToDb = async (newCols: any[]) => {
      if (!can('tasks', 'edit')) return;
      setColumns(newCols);
      try { await supabase.from('app_settings').upsert({ key: 'kanban_columns', value: newCols, updated_by: user?.id }); } 
      catch (err) { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  // Função para atualizar cor da coluna
  const updateColumnColor = (colId: string, newColor: string) => {
      const newCols = columns.map(c => c.id === colId ? { ...c, color: newColor } : c);
      saveColumnsToDb(newCols);
  };

  useEffect(() => {
      if (selectedClientId) {
          const client = clients.find(c => c.id === selectedClientId);
          setAvailableSubProjects(client?.sub_projects || []);
      } else { setAvailableSubProjects([]); }
  }, [selectedClientId, clients]);

  const fetchData = async () => {
    setLoading(true);
    const { data: c } = await supabase.from('clients').select('id, name, company, sub_projects').eq('status', 'active');
    if (c) setClients(c);
    const { data: p } = await supabase.from('profiles').select('id, full_name, email');
    if (p) setTeamMembers(p);
    const { data: t } = await supabase.from('tasks').select('*, client:clients(name, company), assignee:profiles(full_name)').order('created_at', {ascending:false});
    if (t) setTasks(t.map((task: any) => ({ ...task, dueDate: task.due_date, client_name: task.client?.company || task.client?.name, assignee_name: task.assignee?.full_name })));
    setLoading(false);
  };

  const getTaskDeadlineStatus = (task: any) => {
      if (!task.dueDate || task.status === 'concluida' || task.status === 'cancelada') return 'on_time';
      const today = new Date(); today.setHours(0,0,0,0);
      let dateStr = task.dueDate; if (!dateStr.includes('T')) dateStr += 'T12:00:00';
      const due = new Date(dateStr); due.setHours(0,0,0,0);
      if (due < today) return 'overdue';
      if (due.getTime() === today.getTime()) return 'today';
      return 'on_time';
  };

  const filteredTasks = tasks.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      const matchClient = clientFilter === 'all' || t.client_id === clientFilter;
      const matchAssignee = assigneeFilter === 'all' || t.assignee_id === assigneeFilter;
      const matchSubProject = subProjectFilter === 'all' || t.sub_project === subProjectFilter;
      const deadlineStatus = getTaskDeadlineStatus(t);
      const matchDeadline = deadlineFilter === 'all' || (deadlineFilter === 'overdue' && deadlineStatus === 'overdue') || (deadlineFilter === 'today' && deadlineStatus === 'today') || (deadlineFilter === 'on_time' && deadlineStatus === 'on_time');
      return matchSearch && matchPriority && matchClient && matchAssignee && matchSubProject && matchDeadline;
  });

  const tasksByStatus = filteredTasks.reduce((acc, t) => { acc[t.status] = acc[t.status] || []; acc[t.status].push(t); return acc; }, {} as any);
  const stats = { total: filteredTasks.length, overdue: tasks.filter(t => getTaskDeadlineStatus(t) === 'overdue').length };

  // --- LÓGICA DE CÁLCULO DE DATA FUTURA ---
  const calculateNextDate = (baseDate: string | Date, interval: string, dayOfWeek?: string, customDays?: string) => {
      const start = baseDate ? new Date(baseDate) : new Date();
      // Se a data base for passado, usa hoje
      const effectiveStart = start < new Date() ? new Date() : start;
      
      switch(interval) {
          case 'daily': return addDays(effectiveStart, 1);
          case 'weekly': 
              if(dayOfWeek) return nextDay(effectiveStart, Number(dayOfWeek) as any);
              return addWeeks(effectiveStart, 1);
          case 'biweekly': return addWeeks(effectiveStart, 2);
          case 'monthly': return addMonths(effectiveStart, 1);
          case 'custom': return addDays(effectiveStart, Number(customDays) || 1);
          default: return addDays(effectiveStart, 1);
      }
  };

const onSubmit = async (data: TaskFormData) => {
    // 1. Verificações de Permissão
    if (editingTask && !can('tasks', 'edit')) { 
        toast({ title: "Acesso Negado", description: "Sem permissão para editar.", variant: "destructive" }); 
        return; 
    }
    if (!editingTask && !can('tasks', 'create')) { 
        toast({ title: "Acesso Negado", description: "Sem permissão para criar.", variant: "destructive" }); 
        return; 
    }

    const finalDate = data.dueDate ? `${data.dueDate}T12:00:00` : null;
    
    // 2. Tratamento ROBUSTO dos dados de Recorrência (AQUI ESTÁ A CORREÇÃO)
    let recInterval = null;
    let recDay = null;
    let recCustom = null;

    if (data.isRecurring) {
        recInterval = data.recurrenceInterval;
        
        // Converte "0" (Domingo) ou "5" (Sexta) para número. Se for vazio, vira null.
        if (data.recurrenceDayOfWeek && data.recurrenceDayOfWeek !== "") {
            recDay = Number(data.recurrenceDayOfWeek);
        }

        // Converte "10" (dias) para número. Se for vazio, vira null.
        if (data.recurrenceCustomDays && data.recurrenceCustomDays !== "") {
            recCustom = Number(data.recurrenceCustomDays);
        }
    }

    // 3. Montagem do Payload
    const payload: any = {
        title: data.title, 
        description: data.description, 
        priority: data.priority, 
        status: data.status,
        due_date: finalDate, 
        client_id: data.clientId || null, 
        assignee_id: data.assignedTo || null,
        sub_project: data.subProject || null,
        
        // Campos de recorrência sanitizados
        is_recurring: data.isRecurring || false,
        recurrence_interval: recInterval,
        recurrence_day_of_week: recDay,
        recurrence_custom_days: recCustom
    };
    
    let error = null;

    // 4. Envio para o Banco
    if (editingTask) {
        const { error: err } = await supabase.from('tasks').update(payload).eq('id', editingTask.id);
        error = err;
    } else {
        const { error: err } = await supabase.from('tasks').insert(payload);
        error = err;
    }
    
    // 5. Tratamento de Erros
    if (error) {
        console.error("Erro Supabase:", error);
        if (error.message?.includes('invalid input syntax')) {
             toast({ title: "Erro de Formato", description: "Verifique os campos de dias ou intervalo.", variant: "destructive" });
        } else {
             toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        }
    } else {
        setIsModalOpen(false); 
        await fetchData(); 
        reset(); 
        toast({ title: "Sucesso", description: "Tarefa salva corretamente.", className: "bg-green-600 text-white" });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
      if (!can('tasks', 'delete')) {
          toast({ title: "Acesso Negado", description: "Você não tem permissão para excluir tarefas.", variant: "destructive" });
          return;
      }
      if(!confirm("Tem certeza que deseja excluir esta tarefa?")) return;
      try {
          const { error } = await supabase.from('tasks').delete().eq('id', taskId);
          if (error) throw error;
          setTasks(prev => prev.filter(t => t.id !== taskId));
          toast({ title: "Tarefa excluída" });
      } catch (error) { toast({ title: "Erro ao excluir", variant: "destructive" }); }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const newStatus = over.id as string;
    if (!columns.some(c => c.id === newStatus)) return;
    if (active.data.current?.sortable.containerId === newStatus) return;

    const task = tasks.find(t => t.id === taskId);
    
    // Atualização otimista
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);

    // --- LÓGICA DE RECORRÊNCIA AO CONCLUIR ---
    if (newStatus === 'concluida' && task.is_recurring) {
        const nextDate = calculateNextDate(
            task.due_date, 
            task.recurrence_interval, 
            task.recurrence_day_of_week, 
            task.recurrence_custom_days
        );

        // Cria nova tarefa
        const newTaskPayload = {
            ...task,
            id: undefined, // Remove ID para criar novo
            created_at: undefined,
            status: 'pendente', // Volta para o início
            due_date: nextDate.toISOString(),
            // Mantém as configurações de recorrência para a próxima também ser recorrente
            is_recurring: true
        };
        
        // Remove campos extras do objeto task que não vão para o banco (joins)
        delete newTaskPayload.client;
        delete newTaskPayload.assignee;
        delete newTaskPayload.client_name;
        delete newTaskPayload.assignee_name;
        delete newTaskPayload.dueDate; // Usamos due_date no banco

        const { data: createdTask, error } = await supabase.from('tasks').insert(newTaskPayload).select().single();
        
        if (!error && createdTask) {
            toast({ title: "Tarefa recorrente gerada", description: `Agendada para ${format(nextDate, 'dd/MM/yyyy')}`, className: "bg-blue-600 text-white" });
            fetchData(); // Recarrega para trazer a nova tarefa
        }
    }
  };

  const addColumn = () => { if (!newColumnTitle.trim()) return; const id = newColumnTitle.toLowerCase().replace(/\s+/g, '_'); if (columns.some(c => c.id === id)) { toast({ title: "Coluna já existe" }); return; } const newCols = [...columns, { id, title: newColumnTitle, color: 'bg-slate-200', description: newColumnDesc }]; saveColumnsToDb(newCols); setNewColumnTitle(''); setNewColumnDesc(''); };
  const updateColumn = () => { if (!editingColumn || !newColumnTitle.trim()) return; const newCols = columns.map(c => c.id === editingColumn.id ? { ...c, title: newColumnTitle, description: newColumnDesc } : c); saveColumnsToDb(newCols); setEditingColumn(null); setNewColumnTitle(''); setNewColumnDesc(''); };
  const removeColumn = (id: string) => { if (tasks.some(t => t.status === id)) { toast({ title: "Impossível excluir", description: "Mova as tarefas desta coluna antes.", variant: "destructive" }); return; } if (['pendente', 'concluida'].includes(id)) { toast({ title: "Não permitido", description: "Colunas padrão não podem ser removidas." }); return; } const newCols = columns.filter(c => c.id !== id); saveColumnsToDb(newCols); };
  const moveColumn = (index: number, direction: 'up' | 'down') => { if ((direction === 'up' && index === 0) || (direction === 'down' && index === columns.length - 1)) return; const newCols = [...columns]; const targetIndex = direction === 'up' ? index - 1 : index + 1; [newCols[index], newCols[targetIndex]] = [newCols[targetIndex], newCols[index]]; saveColumnsToDb(newCols); };

  const openEditModal = (task: any) => {
      if (!can('tasks', 'edit')) {
          toast({ title: "Acesso Negado", description: "Apenas visualização permitida.", variant: "destructive" });
          return;
      }
      setEditingTask(task); setActiveTab('details');
      let formattedDate = ''; if (task.dueDate) { if (task.dueDate.includes('T')) formattedDate = task.dueDate.split('T')[0]; else formattedDate = task.dueDate; }
      
      reset({ 
          title: task.title, 
          description: task.description || '', 
          priority: task.priority, 
          status: task.status, 
          dueDate: formattedDate, 
          assignedTo: task.assignee_id || '', 
          clientId: task.client_id || '', 
          subProject: task.sub_project || '',
          // Recorrência
          isRecurring: task.is_recurring || false,
          recurrenceInterval: task.recurrence_interval || '',
          recurrenceDayOfWeek: task.recurrence_day_of_week || '',
          recurrenceCustomDays: task.recurrence_custom_days || ''
      });
      fetchComments(task.id); setIsModalOpen(true);
  };

  const fetchComments = async (taskId: string) => { const { data } = await supabase.from('task_comments').select('*, profiles(full_name)').eq('task_id', taskId).order('created_at'); if (data) setComments(data); };
  const handleAddComment = async () => { if(!newComment.trim() || !user) return; await supabase.from('task_comments').insert({ task_id: editingTask.id, user_id: user.id, content: newComment }); setNewComment(''); fetchComments(editingTask.id); };
  
  const getPriorityColor = (priority: string) => { switch (priority) { case 'alta': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'; case 'media': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'; case 'baixa': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'; default: return 'bg-slate-100 text-slate-700'; } };
  const allSubProjects = Array.from(new Set(tasks.map(t => t.sub_project).filter(Boolean)));
  const getDeadlineBadge = (task: any) => { const status = getTaskDeadlineStatus(task); if (status === 'overdue') return <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200"><AlertCircle className="h-3 w-3"/> Atrasada</span>; if (status === 'today') return <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded border border-amber-200"><Clock className="h-3 w-3"/> Vence Hoje</span>; return null; };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
        {stats.overdue > 0 && ( <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-300"><AlertCircle className="h-5 w-5" /> <span className="text-sm font-medium">Atenção: Você tem <strong>{stats.overdue}</strong> tarefas atrasadas!</span></div> )}

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex items-center gap-2 w-full md:w-auto flex-1"><Search className="h-4 w-4 text-slate-400"/><input placeholder="Buscar tarefas..." className="bg-transparent outline-none dark:text-white w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
            <div className="flex gap-2">
                {can('tasks', 'edit') && (
                    <button onClick={() => setIsColumnsModalOpen(true)} className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-slate-50 text-xs dark:text-white dark:hover:bg-slate-800"><Settings className="h-4 w-4" /> Colunas</button>
                )}
                <button onClick={() => setIsFilterModalOpen(true)} className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-slate-50 text-xs dark:text-white dark:hover:bg-slate-800"><Filter className="h-4 w-4" /> Filtros</button>
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded p-1">
                    <button onClick={() => setViewMode('kanban')} className={`p-2 rounded ${viewMode==='kanban' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}><LayoutGrid className="h-4 w-4"/></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode==='list' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}><List className="h-4 w-4"/></button>
                </div>
                {can('tasks', 'create') && (
                    <Button onClick={() => { setEditingTask(null); reset(); setIsModalOpen(true); }} className="bg-slate-900 text-white"><Plus className="mr-2 h-4 w-4"/> Nova Tarefa</Button>
                )}
            </div>
        </div>

        {viewMode === 'kanban' ? (
            <DndContext collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
                <div className="flex gap-4 overflow-x-auto min-h-[500px] pb-4">
                    {columns.map(col => (
                        // CORREÇÃO ERRO 3: Aplicamos a borda colorida AQUI, na div pai, não no KanbanColumn
                        <div key={col.id} className={`min-w-[280px] rounded-xl border-t-4 ${col.color ? col.color.replace('bg-', 'border-') : 'border-slate-400'}`}>
                            
                            {/* CABEÇALHO COM SELETOR DE COR */}
                            <div className="flex items-center justify-between mb-2 px-1 pt-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{col.title}</h3>
                                    <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">{tasksByStatus[col.id]?.length || 0}</span>
                                </div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button className={`w-4 h-4 rounded-full ${col.color || 'bg-slate-400'} ring-2 ring-offset-1 ring-transparent hover:ring-slate-300 transition-all`}></button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-48 p-2" align="end">
                                        <p className="text-xs font-semibold mb-2 ml-1 text-slate-500">Cor da coluna</p>
                                        <div className="grid grid-cols-4 gap-2">
                                            {COLUMN_COLORS.map(color => (
                                                <button
                                                    key={color.value}
                                                    className={`w-8 h-8 rounded-full ${color.value} hover:scale-110 transition-transform ring-1 ring-slate-200`}
                                                    onClick={() => updateColumnColor(col.id, color.value)}
                                                />
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            
                            {/* CORREÇÃO ERRO 3: Removemos className daqui */}
                            <KanbanColumn 
                                id={col.id} 
                                title="" 
                                color="transparent" 
                                description={col.description} 
                                tasks={tasksByStatus[col.id] || []}
                            >
                                {(tasksByStatus[col.id] || []).map((task: any) => (
                                    // CORREÇÃO ERRO 4: Removemos os children (o ícone Repeat dentro do card)
                                    // O componente SortableTaskCard é self-closing agora para evitar o erro de tipagem.
                                    <SortableTaskCard 
                                        key={task.id} 
                                        task={task} 
                                        clientName={task.client_name} 
                                        getPriorityColor={getPriorityColor} 
                                        openEditModal={openEditModal} 
                                        deleteTask={() => handleDeleteTask(task.id)} 
                                        onCardClick={() => openEditModal(task)}
                                    />
                                ))}
                            </KanbanColumn>
                        </div>
                    ))}
                </div>
            </DndContext>
        ) : (
            <div className="space-y-2">
                {filteredTasks.map(t => (
                    <div key={t.id} className="p-4 bg-white dark:bg-slate-900 border rounded flex justify-between items-center group hover:shadow-sm transition-all">
                        <div>
                             <div className="flex items-center gap-2">
                                 <h4 className="font-bold">{t.title}</h4>
                                 {t.is_recurring && <div title="Recorrente"><Repeat className="h-3 w-3 text-blue-500"/></div>}
                                 {t.sub_project && <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 border dark:border-slate-700">{t.sub_project}</span>}
                                 {getDeadlineBadge(t)}
                             </div>
                            <p className="text-sm text-slate-500">{t.client_name} - {t.assignee_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(t.priority)}`}>{t.priority}</span>
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded">{columns.find(c => c.id === t.status)?.title || t.status}</span>
                            {can('tasks', 'edit') && <Button variant="outline" size="sm" onClick={() => openEditModal(t)}>Editar</Button>}
                            {can('tasks', 'delete') && <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(t.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full flex flex-col border dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b flex justify-between">
                        <h2 className="text-xl font-bold">{editingTask ? 'Editar' : 'Nova Tarefa'}</h2>
                        <button onClick={() => setIsModalOpen(false)}><X/></button>
                    </div>
                    {editingTask && (<div className="flex border-b px-6"><button onClick={() => setActiveTab('details')} className={`py-3 px-4 ${activeTab === 'details' ? 'border-b-2 border-blue-500 font-bold' : ''}`}>Dados</button><button onClick={() => setActiveTab('comments')} className={`py-3 px-4 ${activeTab === 'comments' ? 'border-b-2 border-blue-500 font-bold' : ''}`}>Observações</button></div>)}
                    <div className="p-6">
                        <div className={activeTab === 'details' ? 'block' : 'hidden'}>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div><label className="text-sm">Título</label><Input {...register('title')}/></div>
                                <div><label className="text-sm">Descrição</label><textarea {...register('description')} className="w-full border rounded p-2 bg-transparent dark:bg-slate-950 dark:border-slate-700" rows={3}></textarea></div>
                                <div className="grid grid-cols-2 gap-4"><div><label className="text-sm">Cliente</label><select {...register('clientId')} className="w-full p-2 border rounded bg-transparent dark:bg-slate-900 dark:border-slate-700"><option value="">Selecione...</option>{clients.map(c => (<option key={c.id} value={c.id}>{c.company ? c.company : c.name}</option>))}</select></div><div><label className="text-sm">Frente / Sub-Projeto</label><select {...register('subProject')} className="w-full p-2 border rounded bg-transparent dark:bg-slate-900 dark:border-slate-700" disabled={availableSubProjects.length === 0}><option value="">{availableSubProjects.length > 0 ? 'Selecione...' : 'Nenhuma frente'}</option>{availableSubProjects.map(sp => <option key={sp} value={sp}>{sp}</option>)}</select></div></div>
                                <div className="grid grid-cols-2 gap-4"><div><label className="text-sm">Responsável</label><select {...register('assignedTo')} className="w-full p-2 border rounded bg-transparent dark:bg-slate-900 dark:border-slate-700"><option value="">Selecione...</option>{teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div><div><label className="text-sm">Prioridade</label><select {...register('priority')} className="w-full p-2 border rounded bg-transparent dark:bg-slate-900 dark:border-slate-700"><option value="media">Média</option><option value="alta">Alta</option><option value="baixa">Baixa</option></select></div></div>
                                <div className="grid grid-cols-2 gap-4"><div><label className="text-sm">Prazo</label><Input type="date" {...register('dueDate')}/></div><div><label className="text-sm">Status</label><select {...register('status')} className="w-full p-2 border rounded bg-transparent dark:bg-slate-900 dark:border-slate-700">{columns.map(col => (<option key={col.id} value={col.id}>{col.title}</option>))}</select></div></div>
                                
                                {/* SEÇÃO DE RECORRÊNCIA */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border dark:border-slate-800 space-y-4 mt-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <RefreshCw className="h-4 w-4 text-slate-500" />
                                            <Label htmlFor="recurring-switch" className="cursor-pointer font-medium">Repetir Tarefa?</Label>
                                        </div>
                                        <Switch 
                                            id="recurring-switch" 
                                            checked={isRecurring} 
                                            onCheckedChange={(checked) => setValue('isRecurring', checked)} 
                                        />
                                    </div>

                                    {isRecurring && (
                                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                                            <div className="col-span-2 sm:col-span-1">
                                                <Label className="text-xs text-slate-500">Frequência</Label>
                                                <select {...register('recurrenceInterval')} className="w-full p-2 text-sm border rounded bg-transparent dark:bg-slate-900 dark:border-slate-700">
                                                    <option value="daily">Diário</option>
                                                    <option value="weekly">Semanal</option>
                                                    <option value="biweekly">Quinzenal</option>
                                                    <option value="monthly">Mensal</option>
                                                    <option value="custom">Personalizado</option>
                                                </select>
                                            </div>

                                            {recurrenceInterval === 'weekly' && (
                                                <div className="col-span-2 sm:col-span-1">
                                                    <Label className="text-xs text-slate-500">Dia da Semana</Label>
                                                    <select {...register('recurrenceDayOfWeek')} className="w-full p-2 text-sm border rounded bg-transparent dark:bg-slate-900 dark:border-slate-700">
                                                        <option value="">Selecione...</option>
                                                        <option value="0">Domingo</option>
                                                        <option value="1">Segunda</option>
                                                        <option value="2">Terça</option>
                                                        <option value="3">Quarta</option>
                                                        <option value="4">Quinta</option>
                                                        <option value="5">Sexta</option>
                                                        <option value="6">Sábado</option>
                                                    </select>
                                                </div>
                                            )}

                                            {recurrenceInterval === 'custom' && (
                                                <div className="col-span-2 sm:col-span-1">
                                                    <Label className="text-xs text-slate-500">A cada (dias)</Label>
                                                    <Input type="number" min="1" {...register('recurrenceCustomDays')} className="h-9 dark:bg-slate-950" placeholder="Ex: 3" />
                                                </div>
                                            )}
                                            
                                            <div className="col-span-2 text-xs text-blue-600 dark:text-blue-400 italic">
                                                * Uma nova tarefa será criada automaticamente quando esta for movida para "Concluída".
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Button className="w-full bg-slate-900 text-white mt-4" type="submit">Salvar</Button>
                            </form>
                        </div>
                        <div className={activeTab === 'comments' ? 'block space-y-4' : 'hidden'}><div className="h-48 overflow-y-auto space-y-2">{comments.map(c => (<div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border dark:border-slate-800 space-y-1"><div className="flex justify-between items-center"><p className="text-xs font-bold text-blue-600">{c.profiles?.full_name || 'Usuário'}</p><span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString('pt-BR')}</span></div><p className="text-sm text-slate-700 dark:text-slate-300">{c.content}</p></div>))}</div><div className="flex gap-2"><Input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Comentário..." /><Button onClick={handleAddComment}><Send className="h-4 w-4"/></Button></div></div>
                    </div>
                </div>
            </div>
        )}

        {isColumnsModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-6 border dark:border-slate-800 shadow-xl">
                    <div className="flex justify-between mb-4"><h3 className="font-bold dark:text-white">Gerenciar Colunas</h3><button onClick={() => setIsColumnsModalOpen(false)}><X/></button></div>
                    {!editingColumn ? (<div className="flex flex-col gap-2 mb-6 bg-slate-50 p-3 rounded-lg border"><h4 className="text-xs font-bold uppercase text-slate-500">Nova Coluna</h4><Input value={newColumnTitle} onChange={e => setNewColumnTitle(e.target.value)} placeholder="Título" className="dark:bg-slate-950 h-8 text-sm"/><textarea value={newColumnDesc} onChange={e => setNewColumnDesc(e.target.value)} placeholder="Descrição (opcional)" className="w-full p-2 border rounded bg-transparent text-sm h-16 dark:bg-slate-950" /><Button onClick={addColumn} size="sm" className="w-full"><Plus className="h-4 w-4 mr-2"/> Adicionar</Button></div>) : (<div className="flex flex-col gap-2 mb-6 bg-blue-50 p-3 rounded-lg border border-blue-200"><h4 className="text-xs font-bold uppercase text-blue-600">Editando Coluna</h4><Input value={newColumnTitle} onChange={e => setNewColumnTitle(e.target.value)} placeholder="Título" className="dark:bg-slate-950 h-8 text-sm"/><textarea value={newColumnDesc} onChange={e => setNewColumnDesc(e.target.value)} placeholder="Descrição" className="w-full p-2 border rounded bg-transparent text-sm h-16 dark:bg-slate-950" /><div className="flex gap-2"><Button onClick={() => { setEditingColumn(null); setNewColumnTitle(''); setNewColumnDesc(''); }} variant="outline" size="sm" className="flex-1">Cancelar</Button><Button onClick={updateColumn} size="sm" className="flex-1"><Save className="h-4 w-4 mr-2"/> Salvar</Button></div></div>)}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">{columns.map((col, idx) => (<div key={col.id} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800 rounded border dark:border-slate-700 group"><div className="flex flex-col"><span className="text-sm font-medium">{col.title}</span>{col.description && <span className="text-[10px] text-slate-400 truncate max-w-[150px]">{col.description}</span>}</div><div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity"><button onClick={() => { setEditingColumn(col); setNewColumnTitle(col.title); setNewColumnDesc(col.description || ''); }} className="p-1 hover:bg-slate-200 rounded text-slate-500"><Edit className="h-3 w-3"/></button><button onClick={() => moveColumn(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"><ArrowUp className="h-3 w-3"/></button><button onClick={() => moveColumn(idx, 'down')} disabled={idx === columns.length - 1} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"><ArrowDown className="h-3 w-3"/></button><button onClick={() => removeColumn(col.id)} className="p-1 text-red-500 hover:bg-red-100 rounded ml-1"><Trash2 className="h-3 w-3"/></button></div></div>))}</div>
                </div>
            </div>
        )}

        {isFilterModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-6 border dark:border-slate-800">
                    <div className="flex justify-between mb-4"><h3 className="font-bold dark:text-white">Filtros Avançados</h3><button onClick={() => setIsFilterModalOpen(false)}><X /></button></div>
                    <div className="space-y-3">
                        <select value={deadlineFilter} onChange={e => setDeadlineFilter(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white dark:border-slate-700 bg-red-50 text-red-900 font-medium"><option value="all">Situação do Prazo: Todos</option><option value="overdue">🚨 Atrasadas</option><option value="today">⚠️ Vence Hoje</option><option value="on_time">✅ No Prazo</option></select>
                        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white dark:border-slate-700"><option value="all">Prioridade: Todas</option><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></select>
                        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white dark:border-slate-700"><option value="all">Cliente: Todos</option>{clients.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}</select>
                        <select value={subProjectFilter} onChange={e => setSubProjectFilter(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white dark:border-slate-700"><option value="all">Frente: Todas</option>{allSubProjects.map(sp => <option key={sp} value={sp}>{sp}</option>)}</select>
                        <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white dark:border-slate-700"><option value="all">Responsável: Todos</option>{teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}</select>
                    </div>
                    <div className="flex gap-3 mt-6"><button onClick={() => { setPriorityFilter('all'); setClientFilter('all'); setAssigneeFilter('all'); setSubProjectFilter('all'); setDeadlineFilter('all'); setIsFilterModalOpen(false); }} className="flex-1 py-2 border rounded hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white">Limpar</button><button onClick={() => setIsFilterModalOpen(false)} className="flex-1 py-2 bg-blue-600 text-white rounded">Aplicar</button></div>
                </div>
            </div>
        )}
    </div>
  );
}

// ==================================================================================
// --- 3. VIEW METAS ---
// ==================================================================================

const goalSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  targetValue: z.string().min(1, 'Meta é obrigatória'),
  currentValue: z.string().optional(),
  deadline: z.string().optional(),
  clientId: z.string().optional(),
  notes: z.string().optional(),
});
type GoalFormData = z.infer<typeof goalSchema>;

function GoalsView() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Schema de Validação
  const goalSchema = z.object({
    title: z.string().min(1, "Título é obrigatório"),
    targetValue: z.string().min(1, "Valor da meta é obrigatório"),
    currentValue: z.string().min(1, "Valor atual é obrigatório"),
    deadline: z.string().min(1, "Prazo é obrigatório"),
    clientId: z.string().optional(),
  });

  type GoalFormData = z.infer<typeof goalSchema>;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema)
  });

  // --- 1. CARREGAMENTO CORRIGIDO (Com Await e Banco de Dados) ---
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carrega Clientes para o Select
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name, company')
        .eq('status', 'active');
      
      if (clientsData) setClients(clientsData);

      // Carrega Metas do App Settings (Banco de Dados Compartilhado)
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'goals_config')
        .single();

      if (settingsData?.value) {
        // O Supabase já retorna o JSON pronto, não precisa de JSON.parse se for jsonb
        setGoals(settingsData.value);
      }
    } catch (error) {
      console.error("Erro ao carregar metas:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. SALVAMENTO CORRIGIDO (Salva no Banco) ---
  const onSubmit = async (data: GoalFormData) => {
    const newGoal = {
      id: crypto.randomUUID(),
      ...data,
      progress: Math.min(100, Math.round((Number(data.currentValue) / Number(data.targetValue)) * 100))
    };

    const updatedGoals = [...goals, newGoal];
    
    // Atualiza visualmente na hora
    setGoals(updatedGoals);
    setIsModalOpen(false);
    reset();

    // Salva no Banco para todos verem
    try {
        await supabase.from('app_settings').upsert({
            key: 'goals_config',
            value: updatedGoals,
            updated_by: user?.id
        });
        toast({ title: "Meta criada com sucesso!" });
    } catch (error) {
        toast({ title: "Erro ao salvar meta", variant: "destructive" });
    }
  };

  const deleteGoal = async (id: string) => {
      if(!confirm("Excluir meta?")) return;
      
      const updatedGoals = goals.filter(g => g.id !== id);
      setGoals(updatedGoals);

      await supabase.from('app_settings').upsert({
          key: 'goals_config',
          value: updatedGoals,
          updated_by: user?.id
      });
  };

  // Função auxiliar para cor da barra de progresso
  const getProgressColor = (progress: number) => {
      if (progress >= 100) return 'bg-green-500';
      if (progress >= 50) return 'bg-blue-500';
      return 'bg-yellow-500';
  };

  const formatMoney = (val: string) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border dark:border-slate-800">
        <div>
            <h2 className="text-lg font-bold dark:text-white">Metas da Agência</h2>
            <p className="text-sm text-slate-500">Acompanhamento de objetivos financeiros e operacionais</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white"><Plus className="mr-2 h-4 w-4"/> Nova Meta</Button>
      </div>

      {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin h-8 w-8 text-blue-600"/></div>
      ) : goals.length === 0 ? (
          <div className="text-center py-10 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed dark:border-slate-800">
              Nenhuma meta definida. Clique em "Nova Meta" para começar.
          </div>
      ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => (
              <div key={goal.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative group">
                <button onClick={() => deleteGoal(goal.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4"/></button>
                
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Target className="h-4 w-4 text-blue-600"/>
                        <h3 className="font-bold text-slate-800 dark:text-white">{goal.title}</h3>
                    </div>
                    {goal.clientId && <p className="text-xs text-slate-500 ml-6">{clients.find(c => c.id === goal.clientId)?.name || 'Cliente'}</p>}
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-xs text-slate-500">Atual</p>
                            <p className="text-xl font-bold dark:text-white">{formatMoney(goal.currentValue)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500">Alvo</p>
                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{formatMoney(goal.targetValue)}</p>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                            <span className={goal.progress >= 100 ? 'text-green-600' : 'text-blue-600'}>{goal.progress}% Concluído</span>
                            <span className="text-slate-400">Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full ${getProgressColor(goal.progress)} transition-all duration-500`} style={{ width: `${Math.min(goal.progress, 100)}%` }}></div>
                        </div>
                    </div>
                </div>
              </div>
            ))}
          </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border dark:border-slate-800 shadow-2xl">
                <div className="flex justify-between mb-6">
                    <h3 className="font-bold text-lg dark:text-white">Nova Meta</h3>
                    <button onClick={() => setIsModalOpen(false)}><X className="dark:text-white"/></button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div><label className="text-sm mb-1 block">Título da Meta</label><Input {...register('title')} placeholder="Ex: Faturamento Q1" /></div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-sm mb-1 block">Valor Alvo (R$)</label><Input type="number" {...register('targetValue')} placeholder="0.00" /></div>
                        <div><label className="text-sm mb-1 block">Valor Atual (R$)</label><Input type="number" {...register('currentValue')} placeholder="0.00" /></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-sm mb-1 block">Prazo</label><Input type="date" {...register('deadline')} /></div>
                        <div>
                            <label className="text-sm mb-1 block">Vincular Cliente</label>
                            <select {...register('clientId')} className="w-full h-10 rounded-md border bg-transparent px-3 text-sm dark:border-slate-800">
                                <option value="">Geral (Sem cliente)</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <Button type="submit" className="w-full bg-slate-900 text-white mt-2">Criar Meta</Button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}

// ==================================================================================
// --- 4. VIEW ALERTAS ---
// ==================================================================================

const alertSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  metric: z.string().min(1, 'Métrica é obrigatória'),
  condition: z.string().min(1, 'Condição é obrigatória'),
  value: z.string().min(1, 'Valor é obrigatório'),
  clientId: z.string().optional(),
  notification_type: z.string().min(1, 'Tipo de notificação'),
  email: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});
type AlertFormData = z.infer<typeof alertSchema>;

function AlertsView() {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [clientFilter, setClientFilter] = useState('all');
    const [metricFilter, setMetricFilter] = useState('all');
    
    const { register, handleSubmit, reset, watch } = useForm<AlertFormData>({ resolver: zodResolver(alertSchema) });
    const notifType = watch('notification_type');

    useEffect(() => {
        const saved = localStorage.getItem('alerts');
        if (saved) setAlerts(JSON.parse(saved));
        fetchClients();
    }, []);
    const fetchClients = async () => {
        const { data } = await supabase.from('clients').select('id, name, company');
        if (data) setClients(data);
    };

    const stats = {
        total: alerts.length,
        active: alerts.filter(a => a.status === 'active').length,
    };
    const onSubmit = (data: AlertFormData) => {
        const newAlert = { id: Date.now().toString(), ...data, status: 'active' };
        const updated = [...alerts, newAlert];
        setAlerts(updated);
        localStorage.setItem('alerts', JSON.stringify(updated));
        setIsModalOpen(false); reset();
    };
    const deleteAlert = (id: string) => {
        if (!confirm('Excluir?')) return;
        const updated = alerts.filter(a => a.id !== id);
        setAlerts(updated);
        localStorage.setItem('alerts', JSON.stringify(updated));
    }

    const filteredAlerts = alerts.filter(a => (clientFilter === 'all' || a.clientId === clientFilter) && (metricFilter === 'all' || a.metric === metricFilter));
    return (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><Bell className="h-3 w-3"/> Total Alertas</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-l-4 border-l-yellow-500 shadow-sm">
                    <p className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><Activity className="h-3 w-3"/> Ativos</p>
                    <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.active}</p>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold dark:text-white">Central de Alertas</h3>
                <div className="flex gap-2">
                    <Button onClick={() => setIsFilterModalOpen(true)} variant="outline"><Filter className="h-4 w-4 mr-2"/> Filtros</Button>
                    <Button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white dark:bg-white dark:text-slate-900"><Plus className="mr-2 h-4 w-4"/> Novo Alerta</Button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredAlerts.length === 0 && <p className="text-slate-500">Nenhum alerta encontrado.</p>}
                {filteredAlerts.map(alert => (
                    <div key={alert.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-100 rounded-lg text-red-600"><Bell className="h-5 w-5"/></div>
                            <div>
                                <h4 className="font-bold dark:text-white">{alert.name}</h4>
                                <p className="text-xs text-slate-500 uppercase">{alert.metric} • {alert.condition}</p>
                            </div>
                            <button onClick={() => deleteAlert(alert.id)} className="ml-auto text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4"/></button>
                        </div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">{alert.value}</p>
                        <p className="text-xs text-slate-400 mb-2">Notificação: {alert.notification_type}</p>
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">Ativo</span>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-lg max-w-md w-full p-6 border dark:border-slate-800 h-[80vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Configurar Alerta</h2>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div><label className="text-sm dark:text-slate-300">Nome do Alerta *</label><Input {...register('name')} className="dark:bg-slate-900"/></div>
                            <div>
                                <label className="text-sm dark:text-slate-300">Métrica *</label>
                                <select {...register('metric')} className="w-full p-2 border rounded bg-transparent dark:bg-slate-900 dark:text-white">
                                    <option value="">Selecione...</option><option value="cpl">CPL</option><option value="roas">ROAS</option><option value="ctr">CTR</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm dark:text-slate-300">Condição *</label>
                                <select {...register('condition')} className="w-full p-2 border rounded bg-transparent dark:bg-slate-900 dark:text-white">
                                    <option value="">Selecione...</option><option value="maior">Maior que</option><option value="menor">Menor que</option>
                                </select>
                            </div>
                            <div><label className="text-sm dark:text-slate-300">Valor *</label><Input {...register('value')} placeholder="Ex: 50.00" className="dark:bg-slate-900"/></div>
                            
                            <div><label className="text-sm dark:text-slate-300">Cliente (Opcional)</label><select {...register('clientId')} className="w-full p-2 border rounded bg-transparent dark:bg-slate-900 dark:text-white"><option value="">Selecione...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}</select></div>
                            
                            <div>
                                <label className="text-sm dark:text-slate-300">Tipo de Notificação *</label>
                                <select {...register('notification_type')} className="w-full p-2 border rounded bg-transparent dark:bg-slate-900 dark:text-white">
                                    <option value="">Selecione...</option><option value="email">Email</option><option value="push">Push</option><option value="both">Ambos</option>
                                </select>
                            </div>

                            {(notifType === 'email' || notifType === 'both') && <div><label className="text-sm dark:text-slate-300">Email</label><Input {...register('email')} className="dark:bg-slate-900"/></div>}
                            {(notifType === 'push' || notifType === 'both') && <div><label className="text-sm dark:text-slate-300">Telefone</label><Input {...register('phone')} className="dark:bg-slate-900"/></div>}

                            <div><label className="text-sm dark:text-slate-300">Observações</label><textarea {...register('notes')} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white" rows={2}></textarea></div>

                            <div className="flex justify-end gap-2 mt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" className="bg-slate-900 text-white dark:bg-white dark:text-slate-900">Salvar Alerta</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isFilterModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-6 border dark:border-slate-800">
                        <div className="flex justify-between mb-4"><h3 className="font-bold dark:text-white">Filtrar Alertas</h3><button onClick={() => setIsFilterModalOpen(false)}><X /></button></div>
                        <div className="space-y-3">
                            <label className="text-sm">Métrica</label>
                            <select value={metricFilter} onChange={e => setMetricFilter(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white dark:border-slate-700"><option value="all">Todas</option><option value="cpl">CPL</option><option value="roas">ROAS</option></select>
                            
                            <label className="text-sm">Cliente</label>
                            <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white dark:border-slate-700"><option value="all">Todos</option>{clients.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}</select>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => { setClientFilter('all'); setMetricFilter('all'); setIsFilterModalOpen(false); }} className="flex-1 py-2 border rounded hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white">Limpar</button>
                            <button onClick={() => setIsFilterModalOpen(false)} className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Aplicar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ==================================================================================
// --- 5. VIEW PRODUTIVIDADE ---
// ==================================================================================

function ProductivityView() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => { loadData(); }, []);
    const loadData = async () => {
        setLoading(true);
        const { data: t } = await supabase.from('tasks').select('*');
        if (t) setTasks(t);
        const { data: p } = await supabase.from('profiles').select('id, full_name');
        if (p) setMembers(p.map((m: any) => ({ id: m.id, name: m.full_name })));
        setLoading(false);
    };
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const date = new Date(t.created_at);
            const matchesDate = date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear;
            const matchesMember = selectedMember === 'all' || t.assignee_id === selectedMember;
            return matchesDate && matchesMember;
        });
    }, [tasks, selectedMonth, selectedYear, selectedMember]);
    const metrics = useMemo(() => {
        const totalTasks = filteredTasks.length;
        const concluded = filteredTasks.filter(t => t.status === 'concluida').length;
        const pending = filteredTasks.filter(t => t.status === 'pendente' || t.status === 'em_andamento').length;
        const today = new Date();
        // --- LÓGICA DE ATRASO CORRETA ---
        const overdue = filteredTasks.filter(t => {
            if (!t.due_date || t.status === 'concluida' || t.status === 'cancelada') return false;
            // Cria data UTC para comparação correta
            let dateStr = t.due_date;
            if (!dateStr.includes('T')) dateStr += 'T12:00:00';
            const due = new Date(dateStr); due.setHours(0,0,0,0);
            
            const now = new Date(); now.setHours(0,0,0,0);
            return due < now;
        }).length;
        
        const completionRate = totalTasks > 0 ? (concluded / totalTasks) * 100 : 0;
        const averageTime = 2.5; 
        const priorityDistribution = filteredTasks.reduce((acc, t) => { acc[t.priority] = (acc[t.priority] || 0) + 1; return acc; }, {} as any);
        const statusDistribution = filteredTasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {} as any);
        return { totalTasks, concluded, pending, overdue, completionRate, averageTime, priorityDistribution, statusDistribution };
    }, [filteredTasks]);

    return (
        <div className="space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="flex gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className="px-3 py-2 border rounded-lg text-sm bg-transparent dark:text-white dark:bg-slate-900">
                        <option value="all">Colaborador: Todos</option>
                        {members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg text-sm bg-transparent dark:text-white dark:bg-slate-900">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>Mês: {m}</option>)}
                    </select>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg text-sm bg-transparent dark:text-white dark:bg-slate-900">
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>Ano: {y}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-white dark:bg-slate-900 border dark:border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle><Info className="h-4 w-4 text-slate-500"/></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{metrics.totalTasks}</div><p className="text-xs text-slate-500">{metrics.pending} em aberto</p></CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-900 border dark:border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Concluídas</CardTitle><CheckSquare className="h-4 w-4 text-green-500"/></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{metrics.concluded}</div><p className="text-xs text-slate-500">Taxa: {metrics.completionRate.toFixed(1)}%</p></CardContent>
                </Card>
                {/* --- CARD DE ATRASADAS NOVO --- */}
                <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-red-500 shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Atrasadas</CardTitle><AlertTriangle className="h-4 w-4 text-red-500"/></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-red-600">{metrics.overdue}</div><p className="text-xs text-slate-500">Atenção imediata</p></CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-900 border dark:border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Tempo Médio</CardTitle><Clock className="h-4 w-4 text-blue-500"/></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{metrics.averageTime}</div><p className="text-xs text-slate-500">dias para conclusão</p></CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white dark:bg-slate-900 border dark:border-slate-800">
                    <CardHeader><CardTitle>Distribuição por Prioridade</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {['alta', 'media', 'baixa'].map(p => (
                            <div key={p}>
                                <div className="flex justify-between text-sm mb-1"><span className="capitalize">{p}</span><span>{metrics.priorityDistribution[p] || 0}</span></div>
                                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full"><div className={`h-2 rounded-full ${p==='alta'?'bg-red-500':p==='media'?'bg-orange-500':'bg-green-500'}`} style={{width: `${(metrics.priorityDistribution[p]||0)/metrics.totalTasks*100}%`}}></div></div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-900 border dark:border-slate-800">
                    <CardHeader><CardTitle>Status das Tarefas</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {['concluida', 'em_andamento', 'pendente', 'cancelada'].map(s => (
                            <div key={s}>
                                <div className="flex justify-between text-sm mb-1"><span className="capitalize">{s.replace('_', ' ')}</span><span>{metrics.statusDistribution[s] || 0}</span></div>
                                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full"><div className="bg-blue-500 h-2 rounded-full" style={{width: `${(metrics.statusDistribution[s]||0)/metrics.totalTasks*100}%`}}></div></div>
                            </div>
                        ))}
                        {/* --- LINHA MANUAL DE ATRASADAS --- */}
                        <div>
                            <div className="flex justify-between text-sm mb-1"><span className="text-red-600 font-bold">Atrasadas (Alerta)</span><span className="text-red-600 font-bold">{metrics.overdue}</span></div>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full"><div className="bg-red-500 h-2 rounded-full" style={{width: `${(metrics.overdue/metrics.totalTasks*100) || 0}%`}}></div></div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// ==================================================================================
// --- PÁGINA PRINCIPAL: CLIENTES HUB ---
// ==================================================================================

export default function ClientsPage() {
  const { can } = usePermission();
  const [currentView, setCurrentView] = useState<'clients' | 'tasks' | 'goals' | 'alerts' | 'productivity'>('clients');
  
  if (!can('clients', 'view')) {
      return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
          <Sidebar /><div className="flex-1 flex flex-col"><Header /><main className="p-6"><AccessDenied /></main></div>
        </div>
      );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Central de Clientes</h1>
            
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border dark:border-slate-800 w-fit shadow-sm overflow-x-auto">
                <button onClick={() => setCurrentView('clients')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${currentView === 'clients' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                     <User className="h-4 w-4"/> Clientes
                </button>
                <button onClick={() => setCurrentView('tasks')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${currentView === 'tasks' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <CheckSquare className="h-4 w-4"/> Tarefas
                </button>
                <button onClick={() => setCurrentView('goals')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${currentView === 'goals' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <Target className="h-4 w-4"/> Metas
                </button>
                <button onClick={() => setCurrentView('alerts')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${currentView === 'alerts' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <Bell className="h-4 w-4"/> Alertas
                </button>
                <button onClick={() => setCurrentView('productivity')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${currentView === 'productivity' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <Zap className="h-4 w-4"/> Produtividade
                </button>
            </div>
          </div>

          <div className="mt-4">
              {currentView === 'clients' && <ClientsView />}
              {currentView === 'tasks' && <TasksView />}
              {currentView === 'goals' && <GoalsView />}
              {currentView === 'alerts' && <AlertsView />}
              {currentView === 'productivity' && <ProductivityView />}
          </div>

        </main>
      </div>
    </div>
  );
}