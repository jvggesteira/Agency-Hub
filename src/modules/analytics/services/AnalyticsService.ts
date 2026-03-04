import prisma from '@/lib/prisma';
import { calculateMetrics, RawMetricsInput } from '@/core/logic/metrics-engine';
import { startOfWeek, startOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export class AnalyticsService {
  
  private async getPeriodData(clientId: string, range: DateRange) {
    const funnel = await prisma.funnel_data.aggregate({
      where: {
        cohorts: { client_id: clientId },
        date: { gte: range.startDate, lte: range.endDate }
      },
      _sum: { impressions: true, clicks: true, leads: true, appointments: true, sales: true, revenue: true }
    });

    const costs = await prisma.marketing_costs.aggregate({
      where: {
        client_id: clientId,
        date: { gte: range.startDate, lte: range.endDate }
      },
      _sum: { ad_spend: true, agency_fee: true } 
    });

    return {
      revenue: Number(funnel._sum.revenue || 0),
      leads: Number(funnel._sum.leads || 0),
      sales: Number(funnel._sum.sales || 0),
      appointments: Number(funnel._sum.appointments || 0),
      impressions: Number(funnel._sum.impressions || 0),
      clicks: Number(funnel._sum.clicks || 0),
      adSpend: Number(costs._sum.ad_spend || 0),
      agencyFee: Number(costs._sum.agency_fee || 0), 
    };
  }

  async getClientPerformance(clientId: string, range: DateRange) {
    const currentData = await this.getPeriodData(clientId, range);
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { margin_percent: true, niche: true }
    });
    if (!client) throw new Error("Cliente não encontrado");

    const duration = range.endDate.getTime() - range.startDate.getTime();
    const prevEndDate = new Date(range.startDate.getTime() - 86400000);
    const prevStartDate = new Date(prevEndDate.getTime() - duration);
    const prevData = await this.getPeriodData(clientId, { startDate: prevStartDate, endDate: prevEndDate });

    const rawInputCurrent: RawMetricsInput = {
      ...currentData,
      creativeCost: 0, softwareCost: 0, otherCosts: 0,
      marginPercent: Number(client.margin_percent || 0)
    };
    
    const rawInputPrev: RawMetricsInput = {
        ...prevData,
        creativeCost: 0, softwareCost: 0, otherCosts: 0,
        marginPercent: Number(client.margin_percent || 0)
    };

    const metricsCurrent = calculateMetrics(rawInputCurrent);
    const metricsPrev = calculateMetrics(rawInputPrev);

    const calcGrowth = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return ((curr - prev) / prev) * 100;
    };

    return {
      period: range,
      raw: rawInputCurrent,
      metrics: metricsCurrent,
      niche: client.niche,
      growth: {
        revenue: calcGrowth(currentData.revenue, prevData.revenue),
        spend: calcGrowth(metricsCurrent.financial.totalCost, metricsPrev.financial.totalCost),
        leads: calcGrowth(currentData.leads, prevData.leads),
        sales: calcGrowth(currentData.sales, prevData.sales),
        roas: calcGrowth(metricsCurrent.financial.roas, metricsPrev.financial.roas),
        roi: calcGrowth(metricsCurrent.financial.roi, metricsPrev.financial.roi),
        cac: calcGrowth(metricsCurrent.financial.cac, metricsPrev.financial.cac),
        ticket: calcGrowth(metricsCurrent.financial.averageTicket, metricsPrev.financial.averageTicket),
        impressions: calcGrowth(currentData.impressions, prevData.impressions),
        clicks: calcGrowth(currentData.clicks, prevData.clicks),
        ctr: calcGrowth(metricsCurrent.marketing.ctr, metricsPrev.marketing.ctr),
        cpc: calcGrowth(metricsCurrent.marketing.cpc, metricsPrev.marketing.cpc),
        cpl: calcGrowth(metricsCurrent.conversion.cpl, metricsPrev.conversion.cpl),
        leadRate: calcGrowth(metricsCurrent.conversion.leadRate, metricsPrev.conversion.leadRate),
        closeRate: calcGrowth(metricsCurrent.conversion.closeRate, metricsPrev.conversion.closeRate),
      }
    };
  }

  async getHistoryChart(clientId: string, range: DateRange, groupBy: 'day' | 'week' | 'month' = 'day') {
    const dailyData = await prisma.funnel_data.groupBy({
      by: ['date'],
      where: {
        ...(clientId ? { cohorts: { client_id: clientId } } : {}),
        date: { gte: range.startDate, lte: range.endDate }
      },
      _sum: { revenue: true, leads: true }
    });

    if (groupBy === 'day') {
        return dailyData.map(day => ({
            date: day.date.toISOString(),
            shortDate: day.date.toISOString().split('T')[0],
            humanDate: format(day.date, 'dd/MM'),
            revenue: Number(day._sum.revenue || 0),
            leads: day._sum.leads || 0
        })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    const groupedMap = new Map<string, { revenue: number, leads: number, dateSort: Date }>();
    dailyData.forEach(item => {
        let key = '';
        let sortDate = new Date(item.date);
        if (groupBy === 'week') {
            const start = startOfWeek(item.date, { weekStartsOn: 1 });
            key = format(start, 'dd/MM', { locale: ptBR });
            sortDate = start;
        } else if (groupBy === 'month') {
            const start = startOfMonth(item.date);
            key = format(start, 'MMM/yy', { locale: ptBR });
            sortDate = start;
        }
        const current = groupedMap.get(key) || { revenue: 0, leads: 0, dateSort: sortDate };
        current.revenue += Number(item._sum.revenue || 0);
        current.leads += (item._sum.leads || 0);
        groupedMap.set(key, current);
    });

    return Array.from(groupedMap.entries())
        .map(([dateLabel, vals]) => ({
            date: vals.dateSort.toISOString(),
            shortDate: vals.dateSort.toISOString().split('T')[0],
            humanDate: dateLabel,
            revenue: vals.revenue,
            leads: vals.leads
        }))
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // --- Dashboard Geral de Performance GM ---
  async getGeneralPerformance(range: DateRange) {
  const allActiveClients = await prisma.clients.findMany({ 
    where: { status: 'active' }, 
    select: { id: true, value: true, margin_percent: true } 
  });

  let totalRevenue = 0;
  let totalAdSpend = 0;
  let totalFees = 0;
  let totalNetProfitSum = 0;
  let totalSales = 0;
  let totalLeads = 0;
  let totalClicks = 0;
  let totalImpressions = 0;

  for (const client of allActiveClients) {
    const data = await this.getPeriodData(client.id, range);
    
    // Ignora clientes sem movimentação no período para não poluir com Fees vazios
    if (data.revenue === 0 && data.adSpend === 0) continue;

    const rev = data.revenue;
    const ads = data.adSpend;
    const fee = Number(client.value || 0);
    const margin = Number(client.margin_percent || 0) / 100;

    // CÁLCULO DE LUCRO UNITÁRIO (Lógica à prova de falhas)
    // 1. Primeiro calculamos o saldo real: Receita - Mídia - Fee
    const operationalBalance = rev - ads - fee;

    // 2. Se houver margem (ex: 20%), aplicamos sobre a receita. 
    // Se a margem for 0 ou vazia, o lucro é o saldo operacional total.
    const clientNetProfit = margin > 0 ? (rev * margin) - ads - fee : operationalBalance;

    // ACUMULADORES
    totalRevenue += rev;
    totalAdSpend += ads;
    totalFees += fee;
    totalNetProfitSum += clientNetProfit;
    
    totalSales += data.sales;
    totalLeads += data.leads;
    totalClicks += data.clicks;
    totalImpressions += data.impressions;
  }

  // O Investimento Total para o ROI é a soma de Ads + Fees
  const totalInvested = totalAdSpend + totalFees;

  return {
    financial: { 
      revenue: totalRevenue, 
      invested: totalInvested, 
      netProfit: totalNetProfitSum, 
      roi: totalInvested > 0 ? (totalNetProfitSum / totalInvested) * 100 : 0, 
      roas: totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0, 
      cac: totalSales > 0 ? totalInvested / totalSales : 0, 
      ticket: totalSales > 0 ? totalRevenue / totalSales : 0 
    },
    funnel: { 
      impressions: totalImpressions, 
      clicks: totalClicks, 
      leads: totalLeads, 
      sales: totalSales, 
      cpl: totalLeads > 0 ? totalInvested / totalLeads : 0, 
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0, 
      convLead: totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0, 
      convSales: totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0 
    }
  };
}

  async getGeneralHistory(range: DateRange, groupBy: 'day' | 'week' | 'month' = 'day') { 
    return this.getHistoryChart('', range, groupBy); 
  }
}
