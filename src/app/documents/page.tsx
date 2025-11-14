'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { Header } from '@/components/custom/header';
import { FolderOpen, Plus, Upload, Search, Filter, Edit, Trash2, FileText, Calendar, Download } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const documentSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  type: z.string().min(1, 'Tipo é obrigatório'),
  client: z.string().optional(),
  url: z.string().optional(),
  notes: z.string().optional(),
});

type DocumentFormData = z.infer<typeof documentSchema>;

interface Document {
  id: string;
  title: string;
  description?: string;
  type: string;
  client?: string;
  url?: string;
  notes?: string;
  created_at: string;
  file?: {
    name: string;
    size: number;
    type: string;
    data: string;
  };
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = () => {
    try {
      const savedDocuments = localStorage.getItem('documents');
      if (savedDocuments) {
        setDocuments(JSON.parse(savedDocuments));
      }
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveDocuments = (documentsList: Document[]) => {
    try {
      localStorage.setItem('documents', JSON.stringify(documentsList));
    } catch (error) {
      console.error('Erro ao salvar documentos:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const onSubmit = async (data: DocumentFormData) => {
    let fileData = editingDocument?.file;

    if (selectedFile) {
      const reader = new FileReader();
      const filePromise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      });

      const base64Data = await filePromise;
      fileData = {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        data: base64Data,
      };
    }

    const newDocument: Document = {
      id: editingDocument?.id || Date.now().toString(),
      ...data,
      file: fileData,
      created_at: editingDocument?.created_at || new Date().toISOString(),
    };

    if (editingDocument) {
      const updatedDocuments = documents.map(doc =>
        doc.id === editingDocument.id ? newDocument : doc
      );
      setDocuments(updatedDocuments);
      saveDocuments(updatedDocuments);
    } else {
      const updatedDocuments = [newDocument, ...documents];
      setDocuments(updatedDocuments);
      saveDocuments(updatedDocuments);
    }

    setIsModalOpen(false);
    setEditingDocument(null);
    setSelectedFile(null);
    reset();
  };

  const deleteDocument = (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    const updatedDocuments = documents.filter(doc => doc.id !== id);
    setDocuments(updatedDocuments);
    saveDocuments(updatedDocuments);
  };

  const openEditModal = (document: Document) => {
    setEditingDocument(document);
    reset({
      title: document.title,
      description: document.description || '',
      type: document.type,
      client: document.client || '',
      url: document.url || '',
      notes: document.notes || '',
    });
    setIsModalOpen(true);
  };

  const downloadFile = (doc: Document) => {
    if (doc.file) {
      const link = document.createElement('a');
      link.href = doc.file.data;
      link.download = doc.file.name;
      link.click();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.client?.toLowerCase().includes(searchTerm.toLowerCase())
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
                <h1 className="text-3xl font-bold text-slate-900">Documentos</h1>
                <p className="text-slate-600 mt-1">Organize arquivos por cliente</p>
              </div>
              <button
                onClick={() => {
                  setEditingDocument(null);
                  setSelectedFile(null);
                  reset();
                  setIsModalOpen(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Upload className="h-5 w-5" />
                Adicionar Documento
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar documentos..."
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
                <p className="text-slate-600 mt-4">Carregando documentos...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum documento cadastrado</h3>
                <p className="text-slate-600 mb-6">Faça upload de contratos, briefings e criativos</p>
                <button
                  onClick={() => {
                    setEditingDocument(null);
                    setSelectedFile(null);
                    reset();
                    setIsModalOpen(true);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all inline-flex items-center gap-2"
                >
                  <Upload className="h-5 w-5" />
                  Adicionar Documento
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredDocuments.map((doc) => (
                  <div key={doc.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{doc.title}</h3>
                          <p className="text-sm text-slate-600">{doc.type}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {doc.file && (
                          <button
                            onClick={() => downloadFile(doc)}
                            className="p-1 text-slate-400 hover:text-green-600 transition-colors"
                            title="Baixar arquivo"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(doc)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {doc.description && (
                        <p className="text-sm text-slate-600">{doc.description}</p>
                      )}
                      {doc.client && (
                        <p className="text-sm text-slate-600">Cliente: {doc.client}</p>
                      )}
                      {doc.file && (
                        <p className="text-sm text-slate-600">
                          📎 {doc.file.name} ({formatFileSize(doc.file.size)})
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar className="h-4 w-4" />
                        {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingDocument ? 'Editar Documento' : 'Novo Documento'}
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Título *
                  </label>
                  <input
                    {...register('title')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome do documento"
                  />
                  {errors.title && (
                    <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tipo *
                  </label>
                  <input
                    {...register('type')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Contrato, Briefing, Criativo"
                  />
                  {errors.type && (
                    <p className="text-red-600 text-sm mt-1">{errors.type.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Cliente
                  </label>
                  <input
                    {...register('client')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome do cliente"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Arquivo do Documento
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload className="h-8 w-8 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {selectedFile ? selectedFile.name : 'Clique para fazer upload'}
                      </span>
                      {selectedFile && (
                        <span className="text-xs text-slate-500">
                          {formatFileSize(selectedFile.size)}
                        </span>
                      )}
                      {editingDocument?.file && !selectedFile && (
                        <span className="text-xs text-green-600">
                          Arquivo atual: {editingDocument.file.name}
                        </span>
                      )}
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Formatos aceitos: PDF, DOC, DOCX, TXT, JPG, PNG
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    URL/Link (opcional)
                  </label>
                  <input
                    {...register('url')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Link do documento online"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Descrição do documento"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Observações adicionais"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingDocument(null);
                      setSelectedFile(null);
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
                    {editingDocument ? 'Atualizar' : 'Salvar'}
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
