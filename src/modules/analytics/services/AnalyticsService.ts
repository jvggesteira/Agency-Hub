import prisma from '@/lib/prisma';
import { calculateMetrics, RawMetricsInput } from '@/core/logic/metrics-engine';
import { startOfWeek, startOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export class AnalyticsService {
  
  // --- MÉTODOS PRIVADOS (AUXILIARES) ---

  // Busca dados brutos de um período para um cliente específico
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

  // --- MÉTODOS PÚBLICOS (DASHBOARD INDIVIDUAL) ---

  async getClientPerformance(clientId: string, range: DateRange) {
    // 1. Dados Atuais e Anteriores
    const currentData = await this.getPeriodData(clientId, range);
    
    const duration = range.endDate.getTime() - range.startDate.getTime();
    const prevEndDate = new Date(range.startDate.getTime() - 86400000);
    const prevStartDate = new Date(prevEndDate.getTime() - duration);
    const prevData = await this.getPeriodData(clientId, { startDate: prevStartDate, endDate: prevEndDate });

    // 2. Margem
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { margin_percent: true, niche: true }
    });
    if (!client) throw new Error("Cliente não encontrado");

    // 3. Montar Objetos de Métricas Completos
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

    // 4. Função de Crescimento Genérica
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
        spend: calcGrowth(currentData.adSpend + currentData.agencyFee, prevData.adSpend + prevData.agencyFee),
        leads: calcGrowth(currentData.leads, prevData.leads),
        sales: calcGrowth(currentData.sales, prevData.sales),
        impressions: calcGrowth(currentData.impressions, prevData.impressions),
        clicks: calcGrowth(currentData.clicks, prevData.clicks),
        ctr: calcGrowth(metricsCurrent.marketing.ctr, metricsPrev.marketing.ctr),
        cpc: calcGrowth(metricsCurrent.marketing.cpc, metricsPrev.marketing.cpc),
        cpl: calcGrowth(metricsCurrent.conversion.cpl, metricsPrev.conversion.cpl),
        leadRate: calcGrowth(metricsCurrent.conversion.leadRate, metricsPrev.conversion.leadRate),
        closeRate: calcGrowth(metricsCurrent.conversion.closeRate, metricsPrev.conversion.closeRate),
        cac: calcGrowth(metricsCurrent.financial.cac, metricsPrev.financial.cac),
        ticket: calcGrowth(metricsCurrent.financial.averageTicket, metricsPrev.financial.averageTicket),
        roi: calcGrowth(metricsCurrent.financial.roi, metricsPrev.financial.roi),
        roas: calcGrowth(metricsCurrent.financial.roas, metricsPrev.financial.roas),
      }
    };
  }

  // GRÁFICO INTELIGENTE (Individual)
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
        return dailyData.map(day => ({
            date: format(day.date, 'dd/MM'),
            fullDate: day.date,
            revenue: Number(day._sum.revenue || 0),
            leads: day._sum.leads || 0
        })).sort((a,b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
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
            date: dateLabel,
            fullDate: vals.dateSort,
            revenue: vals.revenue,
            leads: vals.leads
        }))
        .sort((a,b) => a.fullDate.getTime() - b.fullDate.getTime());
  }

  // --- MÉTODOS PÚBLICOS (DASHBOARD GERAL / VISÃO AGÊNCIA) ---

  async getGeneralPerformance(range: DateRange) {
    // 1. Buscar todos os clientes ativos com suas margens
    const clients = await prisma.clients.findMany({
      where: { status: 'active' },
      select: { id: true, margin_percent: true, name: true }
    });

    let totalRevenue = 0;
    let totalInvested = 0;
    let totalGrossProfit = 0; // Lucro Bruto (Receita * Margem)
    let totalLeads = 0;
    let totalSales = 0;
    let totalImpressions = 0;
    let totalClicks = 0;

    // 2. Iterar e somar
    for (const client of clients) {
        const funnel = await prisma.funnel_data.aggregate({
            where: {
                cohorts: { client_id: client.id },
                date: { gte: range.startDate, lte: range.endDate }
            },
            _sum: { revenue: true, leads: true, sales: true, impressions: true, clicks: true }
        });

        const costs = await prisma.marketing_costs.aggregate({
            where: {
                client_id: client.id,
                date: { gte: range.startDate, lte: range.endDate }
            },
            _sum: { ad_spend: true, agency_fee: true }
        });

        const revenue = Number(funnel._sum.revenue || 0);
        const invested = Number(costs._sum.ad_spend || 0) + Number(costs._sum.agency_fee || 0);
        const margin = Number(client.margin_percent || 0); // Ex: 0.20

        totalRevenue += revenue;
        totalInvested += invested;
        totalGrossProfit += (revenue * margin); // O segredo: Lucro real individual somado
        
        totalLeads += Number(funnel._sum.leads || 0);
        totalSales += Number(funnel._sum.sales || 0);
        totalImpressions += Number(funnel._sum.impressions || 0);
        totalClicks += Number(funnel._sum.clicks || 0);
    }

    // 3. Calcular Médias Gerais
    const totalNetProfit = totalGrossProfit - totalInvested;
    
    // Evita divisão por zero e inconsistências
    const generalRoi = totalInvested > 0 ? (totalNetProfit / totalInvested) * 100 : 0;
    const generalRoas = totalInvested > 0 ? totalRevenue / totalInvested : 0;
    const generalCac = totalSales > 0 ? totalInvested / totalSales : 0;
    const generalCpl = totalLeads > 0 ? totalInvested / totalLeads : 0;
    const generalTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    const conversionLead = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0;
    const conversionSales = totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    return {
        financial: {
            revenue: totalRevenue,
            invested: totalInvested,
            netProfit: totalNetProfit,
            roi: generalRoi,
            roas: generalRoas,
            cac: generalCac,
            ticket: generalTicket
        },
        funnel: {
            impressions: totalImpressions,
            clicks: totalClicks,
            leads: totalLeads,
            sales: totalSales,
            cpl: generalCpl,
            ctr: ctr,
            convLead: conversionLead,
            convSales: conversionSales
        }
    };
  }

  // Gráfico Histórico Geral (Agência)
  async getGeneralHistory(range: DateRange, groupBy: 'day' | 'week' | 'month' = 'day') {
      // Busca dados de TODOS os clientes agrupados por data
      const dailyData = await prisma.funnel_data.groupBy({
        by: ['date'],
        where: {
          date: { gte: range.startDate, lte: range.endDate }
        },
        _sum: { revenue: true, leads: true }
      });

      if (groupBy === 'day') {
        return dailyData.map(day => ({
            date: format(day.date, 'dd/MM'),
            fullDate: day.date,
            revenue: Number(day._sum.revenue || 0),
            leads: day._sum.leads || 0
        })).sort((a,b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
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
            date: dateLabel,
            fullDate: vals.dateSort,
            revenue: vals.revenue,
            leads: vals.leads
        }))
        .sort((a,b) => a.fullDate.getTime() - b.fullDate.getTime());
  }
}