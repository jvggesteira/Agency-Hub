import { NextResponse } from 'next/server';
import { AnalyticsService } from '@/modules/analytics/services/AnalyticsService';

const service = new AnalyticsService();

export const dynamic = 'force-dynamic'; 

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const groupBy = (searchParams.get('groupBy') as 'day' | 'week' | 'month') || 'day';

    const endDate = endParam ? new Date(endParam) : new Date();
    const startDate = startParam ? new Date(startParam) : new Date();
    
    if (!startParam) {
        startDate.setDate(endDate.getDate() - 30);
    }
    
    endDate.setHours(23, 59, 59, 999);

    // Buscamos o relatório consolidado
    // Nota: Certifique-se de que sua classe service.getGeneralPerformance
    // agora soma os 'value' da tabela de clientes onde status='active' e currency='BRL'
    const report = await service.getGeneralPerformance({ startDate, endDate });
    const history = await service.getGeneralHistory({ startDate, endDate }, groupBy);

    return NextResponse.json({ report, history });

  } catch (error: any) {
    console.error("[API ERROR] /api/analytics/general:", error);
    return NextResponse.json(
        { error: error.message || 'Erro interno no servidor' }, 
        { status: 500 }
    );
  }
}