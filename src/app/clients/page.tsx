'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { 
  Search, Plus, Mail, Phone, Building, FileText, Folder, Upload, Download, Trash2, Clock, DollarSign, X, Edit, AlertCircle, Loader2, FolderPlus, ChevronLeft, CornerUpLeft,
  CheckSquare, Calendar, User, Target, Bell, LayoutGrid, List, MessageSquare, Send, Filter, TrendingUp, TrendingDown, Activity, Users, AlertTriangle, Info, Zap, RefreshCw
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

// ==================================================================================
// --- 1. VIEW CLIENTES (ATUALIZADA COM INTEGRAÇÃO FINANCEIRA) ---
// ==================================================================================

const clientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  value: z.string().min(1, "Valor obrigatório"),
  contractDuration: z.string().min(1, "Duração obrigatória"), // Agora obrigatório para previsão
  contractStartDate: z.string().min(1, "Início obrigatório"), // Agora obrigatório
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;
const DEFAULT_FOLDERS = ['Contratos', 'Briefing', 'Tráfego Pago', 'Orgânico', 'Geral'];

function ClientsView() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChurnModalOpen, setIsChurnModalOpen] = useState(false); // Novo modal de Churn
  const [clientToChurn, setClientToChurn] = useState<any | null>(null);

  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'dados' | 'historico' | 'docs'>('dados');
  
  const [logs, setLogs] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]); 
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  
  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema), defaultValues: { status: 'active', contractDuration: '12' }
  });

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (data) setClients(data.map((c: any) => ({ ...c, value: c.value || c.contract_value || 0 })));
    setLoading(false);
  };

  // --- INTEGRAÇÃO FINANCEIRA ---
  const generateFinancialRecords = async (clientId: string, value: number, duration: number, startDate: string, clientName: string) => {
      const transactions = [];
      const start = new Date(startDate);

      for (let i = 0; i < duration; i++) {
          const date = new Date(start);
          date.setMonth(start.getMonth() + i);

          transactions.push({
              description: `Contrato: ${clientName}`,
              amount: value,
              type: 'income',
              category: 'Vendas',
              classification: 'fixo',
              date: date.toISOString(),
              client_id: clientId,
              status: 'pending',
              installment_number: i + 1,
              installment_total: duration
          });
      }
      await supabase.from('transactions').insert(transactions);
  };

  // --- SUBMIT DO CLIENTE ---
  const onSubmit = async (data: ClientFormData) => {
    try {
        const rawValue = parseInt(data.value.replace(/\D/g, "")) / 100;
        const duration = parseInt(data.contractDuration);
        
        const payload = {
            name: data.name, email: data.email, phone: data.phone, company: data.company, address: data.address,
            status: data.status, contract_value: rawValue, value: rawValue, // Mantendo compatibilidade com os dois campos
            contract_duration: duration,
            contract_start_date: data.contractStartDate, notes: data.notes
        };

        if (editingClient) {
            // EDITAR: Atualiza e Recalcula Futuro
            await supabase.from('clients').update(payload).eq('id', editingClient.id);
            
            // Limpa futuro pendente e recria
            const today = new Date().toISOString();
            await supabase.from('transactions').delete().eq('client_id', editingClient.id).eq('status', 'pending').gte('date', today);
            
            // Gera novos lançamentos a partir de hoje (simplificação de regra de negócio)
            // Se quiser recalcular desde o início, usaria data.contractStartDate, mas cuidado com duplicar passado pago.
            // Aqui assumimos que edição de contrato afeta o futuro.
            await generateFinancialRecords(editingClient.id, rawValue, duration, new Date().toISOString(), data.name);
            
            toast({ title: "Cliente atualizado", description: "Previsão financeira ajustada." });
        } else {
            // NOVO CLIENTE
            const { data: newClient, error } = await supabase.from('clients').insert(payload).select().single();
            if (error) throw error;
            if (newClient) {
                await generateFinancialRecords(newClient.id, rawValue, duration, data.contractStartDate, data.name);
            }
            toast({ title: "Cliente criado", description: "Financeiro gerado com sucesso." });
        }
        
        setIsModalOpen(false); fetchClients(); reset();
    } catch (error: any) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (client: any) => {
    setEditingClient(client); setActiveTab('dados');
    setValue('name', client.name); setValue('email', client.email); 
    setValue('phone', client.phone || ''); setValue('company', client.company || ''); setValue('address', client.address || '');
    setValue('status', client.status); 
    setValue('value', client.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    setValue('contractDuration', client.contract_duration?.toString() || '12');
    setValue('contractStartDate', client.contract_start_date?.split('T')[0] || new Date().toISOString().split('T')[0]);
    setValue('notes', client.notes || '');
    
    fetchClientDetails(client.id, client.contract_url); setIsModalOpen(true);
  };

  // --- NOVA FUNÇÃO DE CHURN (ENCERRAR) ---
  const handleChurn = async () => {
      if (!clientToChurn) return;
      try {
          await supabase.from('clients').update({ status: 'inactive' }).eq('id', clientToChurn.id);
          const today = new Date().toISOString();
          const { count } = await supabase.from('transactions').delete({ count: 'exact' }).eq('client_id', clientToChurn.id).eq('status', 'pending').gte('date', today);
          toast({ title: "Contrato Encerrado", description: `Cliente inativado e ${count} lançamentos futuros removidos.` });
          setIsChurnModalOpen(false); setClientToChurn(null); fetchClients();
      } catch (error) {
          toast({ title: "Erro", variant: "destructive" });
      }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ATENÇÃO: Excluir apagará TODO o histórico financeiro passado deste cliente. Para manter o histórico e parar cobranças futuras, use o botão "Encerrar Contrato" (ícone de pessoa com X). Deseja realmente excluir permanentemente?')) return;
    await supabase.from('clients').delete().eq('id', id);
    setClients(clients.filter(c => c.id !== id));
    toast({ title: "Cliente excluído permanentemente" });
  };

  // Formatação de Moeda no Input
  const handleCurrencyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value.replace(/\D/g, "");
      value = (Number(value) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      setValue('value', value);
  };

  // --- CÁLCULOS DO DASHBOARD DE CLIENTES ---
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

  // --- LOGICA DE ARQUIVOS (MANTIDA IGUAL) ---
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
            let folderName = 'Geral';
            let fileName = file.name;
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
    const targetFolder = currentFolder || 'Geral';
    setUploading(true);
    const file = e.target.files[0];
    try {
        const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const path = `client_${editingClient.id}/${targetFolder}___${cleanName}`;
        await supabase.storage.from('contracts').upload(path, file);
        const { data } = supabase.storage.from('contracts').getPublicUrl(path);
        setDocs([{ name: cleanName, folder: targetFolder, url: data.publicUrl, date: new Date().toISOString() }, ...docs]);
        await supabase.from('client_logs').insert({ client_id: editingClient.id, content: `Arquivo anexado em ${targetFolder}: ${file.name}`, type: 'file' });
        toast({ title: "Arquivo enviado!" });
    } catch { toast({ title: "Erro no upload", variant: "destructive" }); } finally { setUploading(false); }
  };

  const handleCreateFolder = () => {
      const name = prompt("Nome da pasta:");
      if(name && !DEFAULT_FOLDERS.includes(name) && !customFolders.includes(name)) setCustomFolders([...customFolders, name]);
  };
  const allFolders = [...DEFAULT_FOLDERS, ...customFolders];

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
        
        {/* --- DASHBOARD CLIENTES --- */}
        {/* MUDANÇA: Alterado para grid-cols-5 para caber o novo card */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><Users className="h-3 w-3"/> Clientes Ativos</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalActive}</p>
             </div>
             
             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-l-4 border-l-blue-500 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><DollarSign className="h-3 w-3"/> MRR (Mensal)</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.totalRevenue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
             </div>

             {/* NOVO CARD: TICKET MÉDIO */}
             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-l-4 border-l-purple-500 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><TrendingUp className="h-3 w-3"/> Ticket Médio</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.avgTicket.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
             </div>

             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-l-4 border-l-green-500 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><TrendingUp className="h-3 w-3"/> Maior Fee</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.maxFee.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
             </div>

             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-l-4 border-l-red-500 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><TrendingDown className="h-3 w-3"/> Menor Fee</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.minFee.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
             </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border dark:border-slate-800 flex justify-between gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input className="w-full pl-10 pr-4 py-2 border rounded-lg bg-transparent dark:text-white dark:border-slate-700" placeholder="Buscar clientes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
            </div>
            <Button onClick={() => { setEditingClient(null); reset(); setIsModalOpen(true); }} className="bg-slate-900 text-white dark:bg-white dark:text-slate-900"><Plus className="mr-2 h-4 w-4"/> Novo Cliente</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(client => (
                <div key={client.id} className={`p-5 rounded-xl border hover:shadow-md transition-shadow ${client.status === 'inactive' ? 'bg-slate-50 dark:bg-slate-900/50 opacity-70 border-slate-200' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">{client.name.charAt(0).toUpperCase()}</div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{client.name}</h3>
                                <p className="text-xs text-slate-500">{client.company || 'PF'}</p>
                            </div>
                        </div>
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                            {client.status === 'active' ? 'Ativo' : 'Encerrado'}
                        </div>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
                        <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-green-600"/> 
                            <span className="font-semibold">{client.value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} / mês</span>
                        </div>
                        <div className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-blue-500"/> {client.contract_duration} meses de contrato</div>
                    </div>
                    
                    <div className="flex gap-2 pt-2 border-t dark:border-slate-800">
                        <Button variant="outline" className="flex-1" onClick={() => handleEdit(client)}>Gerenciar</Button>
                        {client.status === 'active' ? (
                            <Button variant="ghost" size="icon" onClick={() => { setClientToChurn(client); setIsChurnModalOpen(true); }} title="Encerrar Contrato"><Users className="h-4 w-4 text-amber-500"/></Button>
                        ) : (
                            <Button variant="ghost" size="icon" disabled><Users className="h-4 w-4 text-slate-300"/></Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(client.id)} title="Excluir Histórico"><Trash2 className="h-4 w-4 text-red-400"/></Button>
                    </div>
                </div>
            ))}
        </div>

        {/* MODAL CLIENTE */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 rounded-xl max-w-4xl w-full h-[85vh] flex flex-col border dark:border-slate-800 shadow-2xl">
                    <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 rounded-t-xl">
                        <h2 className="text-xl font-bold dark:text-white">{editingClient ? editingClient.name : 'Novo Cliente'}</h2>
                        <div className="flex items-center gap-3">
                            {editingClient && (
                                <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                                    <button onClick={() => setActiveTab('dados')} className={`px-3 py-1 rounded-md text-sm font-medium ${activeTab === 'dados' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Dados</button>
                                    <button onClick={() => setActiveTab('historico')} className={`px-3 py-1 rounded-md text-sm font-medium ${activeTab === 'historico' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Histórico</button>
                                    <button onClick={() => {setActiveTab('docs'); setCurrentFolder(null)}} className={`px-3 py-1 rounded-md text-sm font-medium ${activeTab === 'docs' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Docs</button>
                                </div>
                            )}
                            <button onClick={() => setIsModalOpen(false)}><X/></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        {(!editingClient || activeTab === 'dados') && (
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-sm">Nome</label><Input {...register('name')} className="dark:bg-slate-900"/></div>
                                    <div><label className="text-sm">Email</label><Input {...register('email')} className="dark:bg-slate-900"/></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-sm">Telefone</label><Input {...register('phone')} className="dark:bg-slate-900"/></div>
                                    <div><label className="text-sm">Empresa</label><Input {...register('company')} className="dark:bg-slate-900"/></div>
                                </div>
                                
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border dark:border-slate-800">
                                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><DollarSign className="h-4 w-4"/> Dados do Contrato (Gera Financeiro)</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div><label className="text-xs uppercase font-bold text-slate-500">Valor Mensal</label><Input {...register('value')} onChange={handleCurrencyInput} className="dark:bg-slate-900 font-semibold text-green-600"/></div>
                                        <div><label className="text-xs uppercase font-bold text-slate-500">Duração (Meses)</label><Input {...register('contractDuration')} type="number" className="dark:bg-slate-900"/></div>
                                        <div><label className="text-xs uppercase font-bold text-slate-500">Início</label><Input {...register('contractStartDate')} type="date" className="dark:bg-slate-900"/></div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2">Ao salvar, as cobranças futuras serão geradas automaticamente no financeiro.</p>
                                </div>

                                <div><label className="text-sm">Obs</label><textarea {...register('notes')} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white" rows={3}></textarea></div>
                                <div className="flex justify-end pt-4"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin"/> : 'Salvar e Gerar Previsão'}</Button></div>
                            </form>
                        )}
                        {editingClient && activeTab === 'historico' && (
                            <div className="space-y-4">
                                {logs.length === 0 && <p className="text-sm text-slate-500">Sem histórico.</p>}
                                {logs.map(log => (
                                    <div key={log.id} className="border-l-2 pl-4 ml-2 border-slate-300">
                                        <p className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString()}</p>
                                        <p className="text-sm">{log.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {editingClient && activeTab === 'docs' && (
                            <div>
                                <div className="flex justify-between mb-4">
                                    <div className="flex items-center gap-2">{currentFolder && <button onClick={() => setCurrentFolder(null)}><ChevronLeft/></button>} <span className="font-bold">{currentFolder || 'Pastas'}</span></div>
                                    <div className="flex gap-2">
                                        {!currentFolder && <Button variant="outline" size="sm" onClick={handleCreateFolder}><FolderPlus className="h-4 w-4 mr-2"/> Pasta</Button>}
                                        {currentFolder && <div><input type="file" id="up" className="hidden" onChange={handleFileUpload} disabled={uploading}/><label htmlFor="up" className="bg-blue-600 text-white px-3 py-2 rounded text-sm cursor-pointer">{uploading ? '...' : 'Upload'}</label></div>}
                                    </div>
                                </div>
                                {!currentFolder ? (
                                    <div className="grid grid-cols-3 gap-4">
                                        {allFolders.map(f => (
                                            <div key={f} onClick={() => setCurrentFolder(f)} className="bg-slate-50 dark:bg-slate-900 p-4 rounded border cursor-pointer hover:border-blue-500 flex flex-col items-center">
                                                <Folder className="h-8 w-8 text-blue-300"/> <span className="mt-2 text-sm font-medium">{f}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {docs.filter(d => d.folder === currentFolder).map((doc, i) => (
                                            <div key={i} className="flex justify-between p-2 border rounded hover:bg-slate-50 dark:hover:bg-slate-900">
                                                <div className="flex items-center gap-2"><FileText className="h-4 w-4"/> <span className="truncate max-w-[200px]">{doc.name}</span></div>
                                                <a href={doc.url} target="_blank" className="p-1"><Download className="h-4 w-4"/></a>
                                            </div>
                                        ))}
                                        {docs.filter(d => d.folder === currentFolder).length === 0 && <p className="text-center text-sm text-slate-500">Pasta vazia.</p>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* MODAL DE CHURN (ENCERRAR CONTRATO) */}
        {isChurnModalOpen && clientToChurn && (
            <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border-l-4 border-red-500 shadow-2xl animate-in zoom-in">
                    <div className="flex items-start gap-4">
                        <div className="bg-red-100 p-3 rounded-full"><AlertTriangle className="h-6 w-6 text-red-600"/></div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Encerrar Contrato?</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                Você está prestes a inativar <strong>{clientToChurn.name}</strong>.
                            </p>
                            <ul className="text-xs text-slate-500 mt-3 list-disc pl-4 space-y-1">
                                <li>O status mudará para <strong>Inativo</strong>.</li>
                                <li>Todas as receitas <strong>futuras (não pagas)</strong> serão removidas do financeiro.</li>
                                <li>O histórico de pagamentos passados <strong>será mantido</strong>.</li>
                            </ul>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <Button variant="ghost" onClick={() => setIsChurnModalOpen(false)} className="flex-1">Cancelar</Button>
                        <Button onClick={handleChurn} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Confirmar Encerramento</Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

// ==================================================================================
// --- 2. VIEW TAREFAS (COM DASHBOARD COMPLETO) ---
// ==================================================================================

const taskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  priority: z.enum(['baixa', 'media', 'alta']),
  status: z.enum(['pendente', 'em_andamento', 'concluida', 'cancelada']),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
  clientId: z.string().optional(),
});
type TaskFormData = z.infer<typeof taskSchema>;
const STATUS_COLUMNS_TASKS = [
  { id: 'pendente', title: 'Pendente', color: 'bg-slate-400' },
  { id: 'em_andamento', title: 'Em Andamento', color: 'bg-blue-500' },
  { id: 'concluida', title: 'Concluída', color: 'bg-green-500' },
  { id: 'cancelada', title: 'Cancelada', color: 'bg-red-500' },
];
function TasksView() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false); // Adicionado filtro
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [searchTerm, setSearchTerm] = useState('');
  // Filtros
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const { register, handleSubmit, reset } = useForm<TaskFormData>({ resolver: zodResolver(taskSchema) });

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => {
    setLoading(true);
    const { data: c } = await supabase.from('clients').select('id, name');
    if (c) setClients(c);
    const { data: p } = await supabase.from('profiles').select('id, full_name, email');
    if (p) setTeamMembers(p);
    const { data: t } = await supabase.from('tasks').select('*, client:clients(name), assignee:profiles(full_name)').order('created_at', {ascending:false});
    if (t) setTasks(t.map((task: any) => ({ ...task, client_name: task.client?.name, assignee_name: task.assignee?.full_name })));
    setLoading(false);
  };
  const onSubmit = async (data: TaskFormData) => {
    const payload = {
        title: data.title, description: data.description, priority: data.priority, status: data.status,
        due_date: data.dueDate || null, client_id: data.clientId || null, assignee_id: data.assignedTo || null
    };
    if (editingTask) await supabase.from('tasks').update(payload).eq('id', editingTask.id);
    else await supabase.from('tasks').insert(payload);
    setIsModalOpen(false); fetchData(); reset(); toast({ title: "Tarefa salva" });
  };
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const newStatus = over.id as string;
    if (!['pendente', 'em_andamento', 'concluida', 'cancelada'].includes(newStatus)) return;
    if (active.data.current?.sortable.containerId === newStatus) return;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
  };

  const openEditModal = (task: any) => {
      setEditingTask(task);
      setActiveTab('details');
      reset({
          title: task.title, description: task.description || '', priority: task.priority, status: task.status,
          dueDate: task.due_date || '', assignedTo: task.assignee_id || '', clientId: task.client_id || ''
      });
      fetchComments(task.id);
      setIsModalOpen(true);
  };

  const fetchComments = async (taskId: string) => {
      const { data } = await supabase.from('task_comments').select('*, profiles(full_name)').eq('task_id', taskId).order('created_at');
      if (data) setComments(data);
  };

  const handleAddComment = async () => {
      if(!newComment.trim() || !user) return;
      await supabase.from('task_comments').insert({ task_id: editingTask.id, user_id: user.id, content: newComment });
      setNewComment(''); fetchComments(editingTask.id);
  };
  const filteredTasks = tasks.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      const matchClient = clientFilter === 'all' || t.client_id === clientFilter;
      const matchAssignee = assigneeFilter === 'all' || t.assignee_id === assigneeFilter;
      return matchSearch && matchPriority && matchClient && matchAssignee;
  });
  const tasksByStatus = filteredTasks.reduce((acc, t) => { acc[t.status] = acc[t.status] || []; acc[t.status].push(t); return acc; }, {} as any);
  const stats = {
      total: filteredTasks.length,
      pendente: filteredTasks.filter(t => t.status === 'pendente').length,
      em_andamento: filteredTasks.filter(t => t.status === 'em_andamento').length,
      concluida: filteredTasks.filter(t => t.status === 'concluida').length,
      cancelada: filteredTasks.filter(t => t.status === 'cancelada').length
  };
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'media': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'baixa': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
        {/* --- DASHBOARD DE TAREFAS --- */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold">Total</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
             </div>
             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-l-4 border-l-slate-400 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold">Pendentes</p>
                <p className="text-2xl font-bold text-slate-500">{stats.pendente}</p>
             </div>
             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-l-4 border-l-blue-500 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold">Em Andamento</p>
                <p className="text-2xl font-bold text-blue-500">{stats.em_andamento}</p>
             </div>
             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-l-4 border-l-green-500 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold">Concluídas</p>
                <p className="text-2xl font-bold text-green-500">{stats.concluida}</p>
             </div>
             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-l-4 border-l-red-500 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold">Canceladas</p>
                <p className="text-2xl font-bold text-red-500">{stats.cancelada}</p>
             </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex items-center gap-2 w-full md:w-auto flex-1">
                <Search className="h-4 w-4 text-slate-400"/>
                <input placeholder="Buscar tarefas..." className="bg-transparent outline-none dark:text-white w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setIsFilterModalOpen(true)} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
                  <Filter className="h-4 w-4" /> Filtros
                </button>
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded p-1">
                    <button onClick={() => setViewMode('kanban')} className={`p-2 rounded ${viewMode==='kanban' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}><LayoutGrid className="h-4 w-4"/></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode==='list' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}><List className="h-4 w-4"/></button>
                </div>
                <Button onClick={() => { setEditingTask(null); reset(); setIsModalOpen(true); }} className="bg-slate-900 text-white"><Plus className="mr-2 h-4 w-4"/> Nova Tarefa</Button>
            </div>
        </div>

        {viewMode === 'kanban' ? (
            <DndContext collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto min-h-[500px]">
                    {STATUS_COLUMNS_TASKS.map(col => (
                        <KanbanColumn key={col.id} id={col.id} title={col.title} color={col.color} tasks={tasksByStatus[col.id] || []}>
                            {(tasksByStatus[col.id] || []).map((task: any) => (
                                <SortableTaskCard 
                                    key={task.id} task={task} clientName={task.client_name} 
                                    getPriorityColor={getPriorityColor} 
                                    openEditModal={openEditModal} deleteTask={() => {}} 
                                />
                            ))}
                        </KanbanColumn>
                    ))}
                </div>
            </DndContext>
        ) : (
            <div className="space-y-2">
                {filteredTasks.map(t => (
                    <div key={t.id} className="p-4 bg-white dark:bg-slate-900 border rounded flex justify-between items-center">
                        <div>
                            <h4 className="font-bold">{t.title}</h4>
                            <p className="text-sm text-slate-500">{t.client_name} - {t.assignee_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(t.priority)}`}>{t.priority}</span>
                            <Button variant="outline" size="sm" onClick={() => openEditModal(t)}>Editar</Button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* MODAL DE TAREFA */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full flex flex-col border dark:border-slate-800 shadow-2xl">
                    <div className="p-6 border-b flex justify-between">
                        <h2 className="text-xl font-bold">{editingTask ? 'Editar' : 'Nova Tarefa'}</h2>
                        <button onClick={() => setIsModalOpen(false)}><X/></button>
                    </div>
                    {editingTask && (
                        <div className="flex border-b px-6">
                            <button onClick={() => setActiveTab('details')} className={`py-3 px-4 ${activeTab === 'details' ? 'border-b-2 border-blue-500 font-bold' : ''}`}>Dados</button>
                            <button onClick={() => setActiveTab('comments')} className={`py-3 px-4 ${activeTab === 'comments' ? 'border-b-2 border-blue-500 font-bold' : ''}`}>Observações</button>
                        </div>
                    )}
                    <div className="p-6">
                        <div className={activeTab === 'details' ? 'block' : 'hidden'}>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div><label className="text-sm">Título</label><Input {...register('title')}/></div>
                                <div><label className="text-sm">Descrição</label><textarea {...register('description')} className="w-full border rounded p-2" rows={3}></textarea></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm">Cliente</label>
                                        <select {...register('clientId')} className="w-full p-2 border rounded bg-transparent">
                                            <option value="">Selecione...</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm">Responsável</label>
                                        <select {...register('assignedTo')} className="w-full p-2 border rounded bg-transparent">
                                            <option value="">Selecione...</option>
                                            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-sm">Prioridade</label><select {...register('priority')} className="w-full p-2 border rounded bg-transparent"><option value="media">Média</option><option value="alta">Alta</option><option value="baixa">Baixa</option></select></div>
                                    <div><label className="text-sm">Prazo</label><Input type="date" {...register('dueDate')}/></div>
                                </div>
                                <div><label className="text-sm">Status</label><select {...register('status')} className="w-full p-2 border rounded bg-transparent"><option value="pendente">Pendente</option><option value="em_andamento">Em Andamento</option><option value="concluida">Concluída</option></select></div>
                                <Button className="w-full bg-slate-900 text-white mt-4" type="submit">Salvar</Button>
                            </form>
                        </div>
                        <div className={activeTab === 'comments' ? 'block space-y-4' : 'hidden'}>
                            <div className="h-48 overflow-y-auto space-y-2">
                                {comments.map(c => (
                                    <div key={c.id} className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
                                        <p className="text-xs font-bold text-blue-600">{c.profiles?.full_name}</p>
                                        <p className="text-sm">{c.content}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Comentário..." />
                                <Button onClick={handleAddComment}><Send className="h-4 w-4"/></Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL FILTROS */}
        {isFilterModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-6 border dark:border-slate-800">
                    <div className="flex justify-between mb-4"><h3 className="font-bold dark:text-white">Filtros</h3><button onClick={() => setIsFilterModalOpen(false)}><X /></button></div>
                    <div className="space-y-3">
                        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white dark:border-slate-700"><option value="all">Todas Prioridades</option><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></select>
                        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white dark:border-slate-700"><option value="all">Todos Clientes</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                        <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white dark:border-slate-700"><option value="all">Todos Responsáveis</option>{teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}</select>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button onClick={() => { setPriorityFilter('all'); setClientFilter('all'); setAssigneeFilter('all'); setIsFilterModalOpen(false); }} className="flex-1 py-2 border rounded hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white">Limpar</button>
                        <button onClick={() => setIsFilterModalOpen(false)} className="flex-1 py-2 bg-blue-600 text-white rounded">Aplicar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

// ==================================================================================
// --- 3. VIEW METAS (COM DASHBOARD) ---
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
  const [goals, setGoals] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any | null>(null);
  const [clientFilter, setClientFilter] = useState('all');
  
  const { register, handleSubmit, reset } = useForm<GoalFormData>({ resolver: zodResolver(goalSchema) });
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
      const savedGoals = localStorage.getItem('goals');
      if (savedGoals) setGoals(JSON.parse(savedGoals));
      const { data } = await supabase.from('clients').select('id, name');
      if (data) setClients(data);
  };
  // DASHBOARD CALCULADO
  const stats = {
      total: goals.length,
      completed: goals.filter(g => Number(g.currentValue) >= Number(g.targetValue)).length,
      inProgress: goals.filter(g => Number(g.currentValue) < Number(g.targetValue)).length
  };
  const onSubmit = (data: GoalFormData) => {
      const newGoal = {
          id: editingGoal?.id || Date.now().toString(),
          ...data,
          targetValue: parseFloat(data.targetValue.replace(',', '.')),
          currentValue: data.currentValue ? parseFloat(data.currentValue.replace(',', '.')) : 0,
          created_at: new Date().toISOString()
      };
      let updatedGoals;
      if (editingGoal) updatedGoals = goals.map(g => g.id === editingGoal.id ? newGoal : g);
      else updatedGoals = [newGoal, ...goals];
      setGoals(updatedGoals);
      localStorage.setItem('goals', JSON.stringify(updatedGoals));
      setIsModalOpen(false); reset(); toast({ title: "Meta salva!" });
  };
  const handleDelete = (id: string) => {
      if(!confirm("Excluir?")) return;
      const updated = goals.filter(g => g.id !== id);
      setGoals(updated);
      localStorage.setItem('goals', JSON.stringify(updated));
  }

  const filteredGoals = goals.filter(g => clientFilter === 'all' || g.clientId === clientFilter);
  return (
      <div className="space-y-6 animate-in fade-in zoom-in duration-300">
          
          {/* DASHBOARD METAS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><Target className="h-3 w-3"/> Total Metas</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
             </div>
             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-l-4 border-l-green-500 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><CheckSquare className="h-3 w-3"/> Atingidas</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
             </div>
             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-l-4 border-l-blue-500 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><Activity className="h-3 w-3"/> Em Andamento</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.inProgress}</p>
             </div>
          </div>

          <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold dark:text-white">Metas Globais</h3>
              <div className="flex gap-2">
                  <Button onClick={() => setIsFilterModalOpen(true)} variant="outline"><Filter className="h-4 w-4 mr-2"/> Filtros</Button>
                  <Button onClick={() => { setEditingGoal(null); reset(); setIsModalOpen(true); }} className="bg-slate-900 text-white"><Plus className="mr-2 h-4 w-4"/> Nova Meta</Button>
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredGoals.length === 0 && <p className="text-slate-500">Nenhuma meta encontrada.</p>}
              {filteredGoals.map(goal => {
                  const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
                  const clientName = clients.find(c => c.id === goal.clientId)?.name;
                  return (
                      <div key={goal.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 shadow-sm">
                          <div className="flex justify-between mb-2">
                              <h4 className="font-bold dark:text-white">{goal.title}</h4>
                              <div className="flex gap-1"><button onClick={() => {setEditingGoal(goal); reset({...goal, targetValue: goal.targetValue.toString(), currentValue: goal.currentValue.toString()}); setIsModalOpen(true)}}><Edit className="h-4 w-4 text-slate-400"/></button><button onClick={() => handleDelete(goal.id)}><Trash2 className="h-4 w-4 text-red-400"/></button></div>
                          </div>
                          {clientName && <p className="text-xs text-slate-500 mb-2">Cliente: {clientName}</p>}
                          <div className="flex justify-between text-sm mb-1 text-slate-700 dark:text-slate-300">
                              <span>Progresso</span>
                              <span className="font-bold">{goal.currentValue} / {goal.targetValue}</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full"><div className="bg-blue-600 h-2 rounded-full" style={{width: `${progress}%`}}></div></div>
                          {goal.deadline && <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><Calendar className="h-3 w-3"/> {new Date(goal.deadline).toLocaleDateString()}</p>}
                      </div>
                  );
              })}
          </div>

          {/* Modal Edição */}
          {isModalOpen && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-slate-900 rounded-lg max-w-md w-full p-6 border dark:border-slate-800">
                      <h2 className="text-xl font-bold mb-4 dark:text-white">{editingGoal ? 'Editar' : 'Nova Meta'}</h2>
                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                          <div><label className="text-sm dark:text-slate-300">Título</label><Input {...register('title')} className="dark:bg-slate-900"/></div>
                          <div><label className="text-sm dark:text-slate-300">Cliente</label><select {...register('clientId')} className="w-full p-2 border rounded bg-transparent dark:bg-slate-900 dark:text-white"><option value="">Selecione...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                          <div className="grid grid-cols-2 gap-4">
                              <div><label className="text-sm dark:text-slate-300">Alvo</label><Input {...register('targetValue')} className="dark:bg-slate-900"/></div>
                              <div><label className="text-sm dark:text-slate-300">Atual</label><Input {...register('currentValue')} className="dark:bg-slate-900"/></div>
                          </div>
                          <div><label className="text-sm dark:text-slate-300">Prazo</label><Input type="date" {...register('deadline')} className="dark:bg-slate-900"/></div>
                          <div><label className="text-sm dark:text-slate-300">Descrição</label><textarea {...register('description')} className="w-full p-2 border rounded bg-transparent dark:bg-slate-900 dark:text-white" rows={2}></textarea></div>
                          <div><label className="text-sm dark:text-slate-300">Observações</label><textarea {...register('notes')} className="w-full p-2 border rounded bg-transparent dark:bg-slate-900 dark:text-white" rows={2}></textarea></div>
                          
                          <div className="flex justify-end gap-2 mt-4">
                              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                              <Button type="submit" className="bg-slate-900 text-white dark:bg-white dark:text-slate-900">Salvar</Button>
                          </div>
                      </form>
                  </div>
              </div>
          )}

          {/* Modal Filtros */}
          {isFilterModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-6 border dark:border-slate-800">
                        <div className="flex justify-between mb-4"><h3 className="font-bold dark:text-white">Filtrar Metas</h3><button onClick={() => setIsFilterModalOpen(false)}><X /></button></div>
                        <div className="space-y-3">
                            <label className="text-sm">Cliente</label>
                            <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white dark:border-slate-700"><option value="all">Todos Clientes</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => { setClientFilter('all'); setIsFilterModalOpen(false); }} className="flex-1 py-2 border rounded hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white">Limpar</button>
                            <button onClick={() => setIsFilterModalOpen(false)} className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Aplicar</button>
                        </div>
                    </div>
                </div>
            )}
      </div>
  );
}

// ==================================================================================
// --- 4. VIEW ALERTAS (COM DASHBOARD) ---
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
        const { data } = await supabase.from('clients').select('id, name');
        if (data) setClients(data);
    };

    // DASHBOARD ALERTAS
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
            
            {/* DASHBOARD ALERTAS */}
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
                            
                            <div><label className="text-sm dark:text-slate-300">Cliente (Opcional)</label><select {...register('clientId')} className="w-full p-2 border rounded bg-transparent dark:bg-slate-900 dark:text-white"><option value="">Selecione...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                            
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
                            <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white dark:border-slate-700"><option value="all">Todos</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
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
// --- 5. VIEW PRODUTIVIDADE (COMPLETA) ---
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
        // Em produção, buscaria tasks e profiles do Supabase
        // Simulando com dados da view de tarefas (na prática, fazer fetch do supabase)
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
            const matchesMember = selectedMember === 'all' || t.assignee_id === selectedMember; // Ajuste conforme seu DB (assignee_id vs assignedTo)
            return matchesDate && matchesMember;
        });
    }, [tasks, selectedMonth, selectedYear, selectedMember]);
    const metrics = useMemo(() => {
        const totalTasks = filteredTasks.length;
        const concluded = filteredTasks.filter(t => t.status === 'concluida').length;
        const pending = filteredTasks.filter(t => t.status === 'pendente' || t.status === 'em_andamento').length;
        const today = new Date();
        const overdue = filteredTasks.filter(t => t.due_date && new Date(t.due_date) < today && t.status !== 'concluida' && t.status !== 'cancelada').length;
        const completionRate = totalTasks > 0 ? (concluded / totalTasks) * 100 : 0;
        
        // Mock Tempo Médio
        const averageTime = 2.5; // Em produção: calcular diff created_at vs completed_at

        const priorityDistribution = filteredTasks.reduce((acc, t) => { acc[t.priority] = (acc[t.priority] || 0) + 1; return acc; }, {} as any);
        const statusDistribution = filteredTasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {} as any);

        return { totalTasks, concluded, pending, overdue, completionRate, averageTime, priorityDistribution, statusDistribution };
    }, [filteredTasks]);

    return (
        <div className="space-y-8 animate-in fade-in zoom-in duration-300">
            {/* Filters */}
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
                        {[2024, 2025].map(y => <option key={y} value={y}>Ano: {y}</option>)}
                    </select>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-white dark:bg-slate-900 border dark:border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle><Info className="h-4 w-4 text-slate-500"/></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{metrics.totalTasks}</div><p className="text-xs text-slate-500">{metrics.pending} em aberto</p></CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-900 border dark:border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Concluídas</CardTitle><CheckSquare className="h-4 w-4 text-green-500"/></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{metrics.concluded}</div><p className="text-xs text-slate-500">Taxa: {metrics.completionRate.toFixed(1)}%</p></CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-900 border dark:border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Atrasadas</CardTitle><AlertTriangle className="h-4 w-4 text-red-500"/></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-red-600">{metrics.overdue}</div><p className="text-xs text-slate-500">Atenção imediata</p></CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-900 border dark:border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Tempo Médio</CardTitle><Clock className="h-4 w-4 text-blue-500"/></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{metrics.averageTime}</div><p className="text-xs text-slate-500">dias para conclusão</p></CardContent>
                </Card>
            </div>

            {/* Charts Row */}
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
            
            {/* MENU SUPERIOR DE NAVEGAÇÃO (TABS PRINCIPAIS) */}
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

          {/* RENDERIZAÇÃO CONDICIONAL DA SUB-PÁGINA */}
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