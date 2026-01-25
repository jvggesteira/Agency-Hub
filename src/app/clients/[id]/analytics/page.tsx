import Link from 'next/link';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

export default async function ClientAnalyticsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        
        {/* CABEÇALHO ATUALIZADO COM O BOTÃO */}
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Relatório de Performance</h1>
            
            <Link href={`/clients/${id}/analytics/add`}>
                <button className="bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 text-sm font-medium">
                    + Inserir Dados Manuais
                </button>
            </Link>
        </div>

        <AnalyticsDashboard clientId={id} />
      </div>
    </div>
  );
}