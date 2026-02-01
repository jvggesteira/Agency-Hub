import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const dateParam = searchParams.get('date'); // Vem no formato YYYY-MM-DD
    const action = searchParams.get('action'); 

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID obrigatório' }, { status: 400 });
    }

    // --- AÇÃO 1: ZERAR TUDO (NUCLEAR) ---
    if (action === 'reset_all') {
      // 1. Apaga custos
      await prisma.marketing_costs.deleteMany({
        where: { client_id: clientId }
      });

      // 2. Apaga funil (busca cohorts antes)
      const cohorts = await prisma.cohorts.findMany({
          where: { client_id: clientId },
          select: { id: true }
      });
      const cohortIds = cohorts.map(c => c.id);

      if (cohortIds.length > 0) {
          await prisma.funnel_data.deleteMany({
            where: { cohort_id: { in: cohortIds } }
          });
      }

      return NextResponse.json({ success: true, message: 'Histórico completo apagado.' });
    }

    // --- AÇÃO 2: APAGAR DATA ESPECÍFICA (CIRÚRGICO) ---
    if (action === 'single' && dateParam) {
      // CRIA O INTERVALO DE 24H (00:00 até 23:59:59.999)
      // Isso garante que encontra o registro independente da hora salva
      const startOfDay = new Date(`${dateParam}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateParam}T23:59:59.999Z`);

      // 1. Apaga Custos dentro desse intervalo
      await prisma.marketing_costs.deleteMany({
        where: { 
            client_id: clientId,
            date: {
                gte: startOfDay,
                lte: endOfDay
            }
        }
      });

      // 2. Apaga Funil dentro desse intervalo
      const cohorts = await prisma.cohorts.findMany({ 
          where: { client_id: clientId },
          select: { id: true }
      });
      const cohortIds = cohorts.map(c => c.id);
      
      if (cohortIds.length > 0) {
          await prisma.funnel_data.deleteMany({
            where: { 
                cohort_id: { in: cohortIds },
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
          });
      }

      return NextResponse.json({ success: true, message: 'Lançamento do dia apagado.' });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (error: any) {
    console.error("Erro CRÍTICO ao deletar:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}