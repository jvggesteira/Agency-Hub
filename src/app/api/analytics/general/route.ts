import { NextResponse } from 'next/server';
import { AnalyticsService } from '@/modules/analytics/services/AnalyticsService';

// IMPORTANTE: Instanciar a classe fora ou dentro do handler
const service = new AnalyticsService();

export const dynamic = 'force-dynamic'; // <--- OBRIGATÓRIO PARA NÃO TRAVAR O BUILD

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const groupBy = searchParams.get('groupBy') as 'day' | 'week' | 'month' || 'day';

    const endDate = endParam ? new Date(endParam) : new Date();
    const startDate = startParam ? new Date(startParam) : new Date();
    
    if (!startParam) {
        startDate.setDate(endDate.getDate() - 30);
    }
    
    // Ajuste de fuso horário simples
    endDate.setHours(23, 59, 59, 999);

    console.log(`[API General] Buscando de ${startDate.toISOString()} até ${endDate.toISOString()}`);

    const report = await service.getGeneralPerformance({ startDate, endDate });
    const history = await service.getGeneralHistory({ startDate, endDate }, groupBy);

    return NextResponse.json({ report, history });

  } catch (error: any) {
    console.error("[API ERROR] /api/analytics/general:", error);
    // Retorna o erro em JSON para o frontend ler
    return NextResponse.json(
        { error: error.message || 'Erro interno no servidor' }, 
        { status: 500 }
    );
  }
}