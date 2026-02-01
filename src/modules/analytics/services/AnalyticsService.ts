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

    // Fee Manual (vem do banco)
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

    // Retorna TODAS as métricas para o Dashboard Rico
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

  // --- Lógica de Gráficos (MANTIDA) ---
  async getHistoryChart(clientId: string, range: DateRange, groupBy: 'day' | 'week' | 'month' = 'day') {
    const dailyData = await prisma.funnel_data.groupBy({
      by: ['date'],
      where: {
        cohorts: { client_id: clientId },
        date: { gte: range.startDate, lte: range.endDate }
      },
      _sum: { revenue: true, leads: true }
    });

    if (groupBy === 'day') {
        return dailyData.map(day => {
            const d = new Date(day.date);
            return {
                date: d.toISOString(),
                shortDate: d.toISOString().split('T')[0],
                humanDate: format(d, 'dd/MM'),
                revenue: Number(day._sum.revenue || 0),
                leads: day._sum.leads || 0
            };
        }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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

  // --- Dashboard Geral ---
  async getGeneralPerformance(range: DateRange) {
      // (Lógica inalterada para o Dashboard Geral, mantendo a consistência)
      // ... (código existente que já mandei anteriormente)
      // Vou incluir apenas para garantir que não quebre, mas o foco é o individual
      const clients = await prisma.clients.findMany({ where: { status: 'active' }, select: { id: true, margin_percent: true } });
      let totalRevenue = 0, totalInvested = 0, totalGrossProfit = 0, totalLeads = 0, totalSales = 0, totalImpressions = 0, totalClicks = 0;

      for (const client of clients) {
          const funnel = await prisma.funnel_data.aggregate({ where: { cohorts: { client_id: client.id }, date: { gte: range.startDate, lte: range.endDate } }, _sum: { revenue: true, leads: true, sales: true, impressions: true, clicks: true } });
          const costs = await prisma.marketing_costs.aggregate({ where: { client_id: client.id, date: { gte: range.startDate, lte: range.endDate } }, _sum: { ad_spend: true, agency_fee: true } });
          const revenue = Number(funnel._sum.revenue || 0);
          const invested = Number(costs._sum.ad_spend || 0) + Number(costs._sum.agency_fee || 0);
          const margin = Number(client.margin_percent || 0);
          totalRevenue += revenue; totalInvested += invested; totalGrossProfit += (revenue * margin);
          totalLeads += Number(funnel._sum.leads || 0); totalSales += Number(funnel._sum.sales || 0); totalImpressions += Number(funnel._sum.impressions || 0); totalClicks += Number(funnel._sum.clicks || 0);
      }
      const totalNetProfit = totalGrossProfit - totalInvested;
      const generalRoi = totalInvested > 0 ? (totalNetProfit / totalInvested) * 100 : 0;
      const generalRoas = totalInvested > 0 ? totalRevenue / totalInvested : 0;
      const generalCac = totalSales > 0 ? totalInvested / totalSales : 0;
      const generalTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const convLead = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0;
      const convSales = totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0;

      return {
          financial: { revenue: totalRevenue, invested: totalInvested, netProfit: totalNetProfit, roi: generalRoi, roas: generalRoas, cac: generalCac, ticket: generalTicket },
          funnel: { impressions: totalImpressions, clicks: totalClicks, leads: totalLeads, sales: totalSales, cpl: totalLeads > 0 ? totalInvested / totalLeads : 0, ctr, convLead, convSales }
      };
  }
  async getGeneralHistory(range: DateRange, groupBy: 'day' | 'week' | 'month' = 'day') { return this.getHistoryChart('', range, groupBy); } // Reusa lógica
}