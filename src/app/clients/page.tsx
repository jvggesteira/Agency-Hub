'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { Users, Plus, Search, Filter, Edit, Trash2, Mail, Phone, Building, FileText, DollarSign, Calendar, Upload, X, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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

interface ClientDocument {
  id: string;
  name: string;
  type: string;
  url?: string;
  file?: File;
  uploadedAt: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  address?: string;
  notes?: string;
  contractValue?: string;
  contractDuration?: string;
  contractStartDate?: string;
  documents?: ClientDocument[];
  created_at: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClientForDocs, setSelectedClientForDocs] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [newDocument, setNewDocument] = useState({ name: '', type: '', url: '' });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
  });

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    // Verificar contratos próximos do vencimento
    const checkContractExpiration = () => {
      const today = new Date();
      clients.forEach(client => {
        if (client.contractStartDate && client.contractDuration) {
          const startDate = new Date(client.contractStartDate);
          const durationMonths = parseInt(client.contractDuration);
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + durationMonths);
          
          const daysUntilExpiration = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiration <= 30 && daysUntilExpiration > 0) {
            console.log(`⚠️ Contrato de ${client.name} expira em ${daysUntilExpiration} dias!`);
          }
        }
      });
    };

    checkContractExpiration();
  }, [clients]);

  const loadClients = () => {
    try {
      const savedClients = localStorage.getItem('clients');
      if (savedClients) {
        setClients(JSON.parse(savedClients));
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveClients = (clientsList: Client[]) => {
    try {
      localStorage.setItem('clients', JSON.stringify(clientsList));
    } catch (error) {
      console.error('Erro ao salvar clientes:', error);
    }
  };

  const onSubmit = (data: ClientFormData) => {
    const newClient: Client = {
      id: editingClient?.id || Date.now().toString(),
      ...data,
      documents: editingClient?.documents || [],
      created_at: editingClient?.created_at || new Date().toISOString(),
    };

    if (editingClient) {
      const updatedClients = clients.map(client =>
        client.id === editingClient.id ? newClient : client
      );
      setClients(updatedClients);
      saveClients(updatedClients);
    } else {
      const updatedClients = [newClient, ...clients];
      setClients(updatedClients);
      saveClients(updatedClients);
    }

    setIsModalOpen(false);
    setEditingClient(null);
    reset();
  };

  const deleteClient = (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    const updatedClients = clients.filter(client => client.id !== id);
    setClients(updatedClients);
    saveClients(updatedClients);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    reset({
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company || '',
      address: client.address || '',
      notes: client.notes || '',
      contractValue: client.contractValue || '',
      contractDuration: client.contractDuration || '',
      contractStartDate: client.contractStartDate || '',
    });
    setIsModalOpen(true);
  };

  const openDocumentsModal = (client: Client) => {
    setSelectedClientForDocs(client);
    setIsDocModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const addDocument = () => {
    if (!selectedClientForDocs || (!newDocument.url && !uploadedFile) || !newDocument.name) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    const document: ClientDocument = {
      id: Date.now().toString(),
      name: newDocument.name,
      type: newDocument.type || 'Outro',
      url: uploadedFile ? URL.createObjectURL(uploadedFile) : newDocument.url,
      uploadedAt: new Date().toISOString(),
    };

    const updatedClients = clients.map(client => {
      if (client.id === selectedClientForDocs.id) {
        return {
          ...client,
          documents: [...(client.documents || []), document],
        };
      }
      return client;
    });

    setClients(updatedClients);
    saveClients(updatedClients);
    setSelectedClientForDocs({
      ...selectedClientForDocs,
      documents: [...(selectedClientForDocs.documents || []), document],
    });
    setNewDocument({ name: '', type: '', url: '' });
    setUploadedFile(null);
  };

  const deleteDocument = (docId: string) => {
    if (!selectedClientForDocs) return;

    const updatedClients = clients.map(client => {
      if (client.id === selectedClientForDocs.id) {
        return {
          ...client,
          documents: client.documents?.filter(doc => doc.id !== docId) || [],
        };
      }
      return client;
    });

    setClients(updatedClients);
    saveClients(updatedClients);
    setSelectedClientForDocs({
      ...selectedClientForDocs,
      documents: selectedClientForDocs.documents?.filter(doc => doc.id !== docId) || [],
    });
  };

  const getContractStatus = (client: Client) => {
    if (!client.contractStartDate || !client.contractDuration) return null;

    const today = new Date();
    const startDate = new Date(client.contractStartDate);
    const durationMonths = parseInt(client.contractDuration);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + durationMonths);

    const daysUntilExpiration = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiration < 0) {
      return { status: 'expired', days: Math.abs(daysUntilExpiration), color: 'bg-red-100 text-red-700' };
    } else if (daysUntilExpiration <= 30) {
      return { status: 'expiring', days: daysUntilExpiration, color: 'bg-yellow-100 text-yellow-700' };
    } else {
      return { status: 'active', days: daysUntilExpiration, color: 'bg-green-100 text-green-700' };
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Clientes</h1>
                <p className="text-slate-600 mt-1">Gerencie seus clientes e contratos</p>
              </div>
              <button
                onClick={() => {
                  setEditingClient(null);
                  reset();
                  setIsModalOpen(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Novo Cliente
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar clientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                <Filter className="h-5 w-5 text-slate-600" />
                Filtros
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-slate-600 mt-4">Carregando clientes...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum cliente cadastrado</h3>
                <p className="text-slate-600 mb-6">Comece adicionando seu primeiro cliente</p>
                <button
                  onClick={() => {
                    setEditingClient(null);
                    reset();
                    setIsModalOpen(true);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all inline-flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Adicionar Cliente
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredClients.map((client) => {
                  const contractStatus = getContractStatus(client);
                  return (
                    <div key={client.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{client.name}</h3>
                            {client.company && (
                              <p className="text-sm text-slate-600 flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {client.company}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openDocumentsModal(client)}
                            className="p-1 text-slate-400 hover:text-green-600 transition-colors"
                            title="Documentos"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(client)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteClient(client.id)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="h-4 w-4" />
                          {client.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="h-4 w-4" />
                          {client.phone}
                        </div>
                        {client.contractValue && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <DollarSign className="h-4 w-4" />
                            R$ {client.contractValue}
                          </div>
                        )}
                        {contractStatus && (
                          <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${contractStatus.color}`}>
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

      {/* Modal Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nome *
                    </label>
                    <input
                      {...register('name')}
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nome do cliente"
                    />
                    {errors.name && (
                      <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email *
                    </label>
                    <input
                      {...register('email')}
                      type="email"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="cliente@email.com"
                    />
                    {errors.email && (
                      <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Telefone *
                    </label>
                    <input
                      {...register('phone')}
                      type="tel"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="(11) 99999-9999"
                    />
                    {errors.phone && (
                      <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Empresa
                    </label>
                    <input
                      {...register('company')}
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nome da empresa"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Endereço
                  </label>
                  <input
                    {...register('address')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Endereço completo"
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Informações do Contrato</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Valor do Contrato
                      </label>
                      <input
                        {...register('contractValue')}
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="5000.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Duração (meses)
                      </label>
                      <input
                        {...register('contractDuration')}
                        type="number"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="12"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Data de Início
                      </label>
                      <input
                        {...register('contractStartDate')}
                        type="date"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Observações sobre o cliente"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingClient(null);
                      reset();
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
                  >
                    {editingClient ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Documentos */}
      {isDocModalOpen && selectedClientForDocs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  Documentos - {selectedClientForDocs.name}
                </h2>
                <button
                  onClick={() => {
                    setIsDocModalOpen(false);
                    setSelectedClientForDocs(null);
                    setNewDocument({ name: '', type: '', url: '' });
                    setUploadedFile(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Adicionar Documento</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Nome do Documento *
                      </label>
                      <input
                        type="text"
                        value={newDocument.name}
                        onChange={(e) => setNewDocument({ ...newDocument, name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Contrato de Serviço"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Tipo
                      </label>
                      <select
                        value={newDocument.type}
                        onChange={(e) => setNewDocument({ ...newDocument, type: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione o tipo</option>
                        <option value="Contrato">Contrato</option>
                        <option value="Proposta">Proposta</option>
                        <option value="NDA">NDA</option>
                        <option value="Briefing">Briefing</option>
                        <option value="Relatório">Relatório</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Upload de Arquivo
                      </label>
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {uploadedFile && (
                        <p className="text-sm text-green-600 mt-1">Arquivo selecionado: {uploadedFile.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Ou URL/Link
                      </label>
                      <input
                        type="url"
                        value={newDocument.url}
                        onChange={(e) => setNewDocument({ ...newDocument, url: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://..."
                        disabled={!!uploadedFile}
                      />
                    </div>

                    <button
                      onClick={addDocument}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Adicionar Documento
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Documentos Cadastrados</h3>
                  {selectedClientForDocs.documents && selectedClientForDocs.documents.length > 0 ? (
                    <div className="space-y-2">
                      {selectedClientForDocs.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="font-medium text-slate-900">{doc.name}</p>
                              <p className="text-sm text-slate-600">{doc.type}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {doc.url && (
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-sm"
                              >
                                Abrir
                              </a>
                            )}
                            <button
                              onClick={() => deleteDocument(doc.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-600 text-center py-4">Nenhum documento cadastrado</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
