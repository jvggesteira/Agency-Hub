import { NextResponse } from 'next/server';
import { AnalyticsService } from '@/modules/analytics/services/AnalyticsService';

const service = new AnalyticsService();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  
  // Datas e Filtros
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');
  const groupBy = searchParams.get('groupBy') as 'day' | 'week' | 'month' || 'day';

  if (!clientId) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  // Default: Últimos 30 dias se não passar data
  const endDate = endParam ? new Date(endParam) : new Date();
  const startDate = startParam ? new Date(startParam) : new Date();
  if (!startParam) startDate.setDate(endDate.getDate() - 30);

  // Ajuste do final do dia para garantir range completo
  endDate.setUTCHours(23, 59, 59, 999);

  try {
    const report = await service.getClientPerformance(clientId, { startDate, endDate });
    // Passa o groupBy para o serviço do gráfico
    const history = await service.getHistoryChart(clientId, { startDate, endDate }, groupBy);

    return NextResponse.json({ report, history });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}