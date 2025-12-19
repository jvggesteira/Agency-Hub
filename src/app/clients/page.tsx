'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { Users, Plus, Search, Filter, Edit, Trash2, Mail, Phone, Building, AlertCircle, X, Loader2, DollarSign } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

// Schema de Validação
const clientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  company: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  contractValue: z.string().optional(),
  contractDuration: z.string().optional(),
  contractStartDate: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  address?: string;
  notes?: string;
  contract_value?: number; // Ajustado para snake_case do banco
  contract_duration?: number; // Ajustado para snake_case do banco
  contract_start_date?: string; // Ajustado para snake_case do banco
  created_at: string;
}

type ContractStatusFilter = 'all' | 'active' | 'expiring' | 'expired';

export default function ClientsPage() {
  // Removi o hook usePermission temporariamente para evitar bloqueios falsos enquanto configuramos
  // const { can } = usePermission();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contractFilter, setContractFilter] = useState<ContractStatusFilter>('all');

  const {
    register,
    handleSubmit,
    reset,
    setValue, // Importante para preencher o form na edição
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar clientes:', error);
      toast({ title: "Erro", description: error.message || "Falha ao carregar clientes.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ClientFormData) => {
    try {
      // 1. Preparar dados para o formato do Banco (snake_case e números)
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company || null,
        address: data.address || null,
        notes: data.notes || null,
        // Converte string para float/int, ou null se estiver vazio
        contract_value: data.contractValue ? parseFloat(data.contractValue.replace(',', '.')) : null,
        contract_duration: data.contractDuration ? parseInt(data.contractDuration) : null,
        contract_start_date: data.contractStartDate || null,
      };

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', editingClient.id);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Cliente atualizado." });
      } else {
        const { error } = await supabase
          .from('clients')
          .insert([payload]);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Novo cliente adicionado." });
      }

      setIsModalOpen(false);
      setEditingClient(null);
      reset();
      fetchClients();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast({ title: "Erro", description: error.message || "Erro ao salvar cliente.", variant: "destructive" });
    }
  };

  const deleteClient = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Excluído", description: "Cliente removido.", variant: "destructive" });
      setClients(clients.filter(c => c.id !== id));
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir cliente.", variant: "destructive" });
    }
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    // Popula o formulário convertendo números de volta para string
    setValue('name', client.name);
    setValue('email', client.email);
    setValue('phone', client.phone);
    setValue('company', client.company || '');
    setValue('address', client.address || '');
    setValue('notes', client.notes || '');
    setValue('contractValue', client.contract_value?.toString() || '');
    setValue('contractDuration', client.contract_duration?.toString() || '');
    setValue('contractStartDate', client.contract_start_date || '');
    
    setIsModalOpen(true);
  };

  // Função auxiliar segura para datas
  const getContractStatus = (client: Client) => {
    if (!client.contract_start_date || !client.contract_duration) {
        return { status: 'none', days: 0, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' };
    }

    try {
        const today = new Date();
        const startDate = new Date(client.contract_start_date);
        
        // Verifica se a data é válida
        if (isNaN(startDate.getTime())) return { status: 'none', days: 0, color: '' };

        const durationMonths = client.contract_duration;
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + durationMonths);

        const daysUntilExpiration = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiration < 0) {
            return { status: 'expired', days: Math.abs(daysUntilExpiration), color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
        } else if (daysUntilExpiration <= 30) {
            return { status: 'expiring', days: daysUntilExpiration, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
        } else {
            return { status: 'active', days: daysUntilExpiration, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
        }
    } catch (e) {
        return { status: 'none', days: 0, color: '' };
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (contractFilter === 'all') return true;
    const status = getContractStatus(client).status;
    return status === contractFilter;
  });

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Clientes</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Gerencie seus clientes e contratos</p>
            </div>
            <button
              onClick={() => {
                setEditingClient(null);
                reset({ name: '', email: '', phone: '', company: '', address: '', notes: '', contractValue: '', contractDuration: '', contractStartDate: '' });
                setIsModalOpen(true);
              }}
              className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 flex items-center gap-2 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 transition-all"
            >
              <Plus className="h-5 w-5" /> Novo Cliente
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar clientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white dark:placeholder-slate-500"
                />
              </div>
              <button 
                onClick={() => setIsFilterModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
              >
                <Filter className="h-5 w-5 text-slate-600" /> Filtros
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">Carregando clientes...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                    <Users className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Nenhum cliente encontrado</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">Adicione clientes manualmente ou importe do CRM.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredClients.map((client) => {
                  const contractStatus = getContractStatus(client);
                  return (
                    <div key={client.id} className="bg-slate-50 dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-900 dark:bg-slate-800 rounded-full flex items-center justify-center text-white font-semibold">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">{client.name}</h3>
                            {client.company && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1 truncate max-w-[150px]">
                                <Building className="h-3 w-3" /> {client.company}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditModal(client)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button onClick={() => deleteClient(client.id)} className="p-1 text-slate-400 hover:text-red-600 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Mail className="h-4 w-4" /> <span className="truncate">{client.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Phone className="h-4 w-4" /> {client.phone}
                        </div>
                        
                        {client.contract_value && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <DollarSign className="h-4 w-4" />
                            R$ {client.contract_value}
                          </div>
                        )}

                        {contractStatus.status !== 'none' && (
                          <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded mt-2 w-fit ${contractStatus.color}`}>
                            <AlertCircle className="h-3 w-3" />
                            {contractStatus.status === 'expired' && `Expirado há ${contractStatus.days} dias`}
                            {contractStatus.status === 'expiring' && `Expira em ${contractStatus.days} dias`}
                            {contractStatus.status === 'active' && `${contractStatus.days} dias restantes`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODAL (Conteúdo do Modal igual, apenas mapeado corretamente no onSubmit) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* ... Campos do formulário iguais ... */}
                 <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome *</label>
                    <input {...register('name')} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent dark:text-white" placeholder="Nome do cliente" />
                    {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                    <input {...register('email')} type="email" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent dark:text-white" placeholder="cliente@email.com" />
                    {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefone *</label>
                    <input {...register('phone')} type="tel" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent dark:text-white" placeholder="(11) 99999-9999" />
                    {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Empresa</label>
                    <input {...register('company')} type="text" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent dark:text-white" placeholder="Nome da empresa" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Endereço</label>
                  <input {...register('address')} type="text" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent dark:text-white" placeholder="Endereço completo" />
                </div>

                <div className="border-t dark:border-slate-800 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Informações do Contrato</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor</label>
                      <input {...register('contractValue')} type="text" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent dark:text-white" placeholder="5000.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duração (meses)</label>
                      <input {...register('contractDuration')} type="number" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent dark:text-white" placeholder="12" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Início</label>
                      <input {...register('contractStartDate')} type="date" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent dark:text-white" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Observações</label>
                  <textarea {...register('notes')} rows={3} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent dark:text-white" placeholder="Observações sobre o cliente" />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                    {isSubmitting ? 'Salvando...' : (editingClient ? 'Atualizar' : 'Salvar')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}