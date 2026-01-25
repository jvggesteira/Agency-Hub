import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, date, metrics, costs } = body;
    
    // Define o range do dia exato (00:00 até 23:59)
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setUTCHours(23, 59, 59, 999);

    await prisma.$transaction(async (tx) => {
      
      // 1. LIMPEZA: Remove dados antigos DESTA data para permitir re-salvar (Edição)
      await tx.marketing_costs.deleteMany({
        where: { client_id: clientId, date: { gte: startDate, lte: endDate } }
      });
      
      // Precisamos achar os IDs dos funis dessa data para deletar
      // (O prisma não deixa deletar funnel_data direto filtrando por data e client via relation facilmente em deleteMany puro)
      const oldFunnelEntries = await tx.funnel_data.findMany({
        where: { 
            cohorts: { client_id: clientId },
            date: { gte: startDate, lte: endDate }
        },
        select: { id: true }
      });
      
      if (oldFunnelEntries.length > 0) {
          await tx.funnel_data.deleteMany({
            where: { id: { in: oldFunnelEntries.map(f => f.id) } }
          });
      }

      // 2. BUSCA/CRIAÇÃO DO GRUPO (COHORT)
      let cohort = await tx.cohorts.findFirst({
        where: { client_id: clientId, name: "Lançamento Manual" }
      });

      if (!cohort) {
        cohort = await tx.cohorts.create({
          data: { client_id: clientId, name: "Lançamento Manual", start_date: startDate }
        });
      }

      // 3. SALVAR NOVOS DADOS (Agora limpos)
      await tx.marketing_costs.create({
        data: {
          client_id: clientId,
          date: startDate,
          ad_spend: Number(costs.adSpend),
          agency_fee: Number(costs.agencyFee),
          creative_cost: 0, software_cost: 0, other_costs: 0
        }
      });

      await tx.funnel_data.create({
        data: {
          date: startDate,
          impressions: Number(metrics.impressions),
          clicks: Number(metrics.clicks),
          leads: Number(metrics.leads),
          appointments: Number(metrics.appointments),
          sales: Number(metrics.sales),
          revenue: Number(metrics.revenue),
          cohorts: { connect: { id: cohort.id } }
        }
      });
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Erro no servidor:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}