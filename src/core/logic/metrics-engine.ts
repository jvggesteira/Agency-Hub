// src/core/logic/metrics-engine.ts

// 1. Tipos de Entrada (O que vem do banco)
export interface RawMetricsInput {
  adSpend: number;      // Gasto em Mídia (Ads)
  creativeCost: number; // Custo de Design/Vídeo
  agencyFee: number;    // Fee da Agência
  softwareCost: number; // Ferramentas
  otherCosts: number;   // Outros
  
  impressions: number;
  clicks: number;
  leads: number;
  appointments: number;
  sales: number;
  revenue: number;      // Receita Gerada
  
  marginPercent: number; // Margem do cliente (Ex: 0.30 para 30%)
}

// 2. Tipos de Saída (O que vai pro Gráfico)
export interface CalculatedMetrics {
  marketing: {
    ctr: number;      // Taxa de Cliques (%)
    cpc: number;      // Custo por Clique (R$)
    cpm: number;      // Custo por Mil Impressões (R$)
  };
  conversion: {
    cpl: number;            // Custo por Lead (R$)
    leadRate: number;       // Taxa de Conversão de Lead (%)
    closeRate: number;      // Taxa de Fechamento de Venda (%)
    appointmentRate: number; // Taxa de Agendamento (%)
  };
  financial: {
    totalCost: number;      // Custo Total (Ads + Fixo)
    cac: number;            // Custo de Aquisição de Cliente
    roas: number;           // Retorno sobre Spend de Mídia
    roi: number;            // Retorno sobre Investimento Total
    averageTicket: number;  // Ticket Médio Real
    grossProfit: number;    // Lucro Bruto (Margem de Contribuição)
    netProfit: number;      // Lucro Líquido (No bolso)
  };
}

// Helper para evitar divisão por zero (evita travar o sistema)
const safeDiv = (num: number, den: number): number => {
  return den === 0 ? 0 : num / den;
};

// --- A ENGINE ---
export const calculateMetrics = (input: RawMetricsInput): CalculatedMetrics => {
  // A. Consolidação de Custos
  const totalMarketingCost = 
    input.adSpend + input.creativeCost + input.agencyFee + input.softwareCost + input.otherCosts;

  // B. Métricas de Tráfego (Topo)
  const ctr = safeDiv(input.clicks, input.impressions) * 100;
  const cpc = safeDiv(input.adSpend, input.clicks);
  const cpm = safeDiv(input.adSpend, input.impressions) * 1000;

  // C. Métricas de Conversão (Meio/Fundo)
  const cpl = safeDiv(input.adSpend, input.leads);
  const leadRate = safeDiv(input.leads, input.clicks) * 100;
  const appointmentRate = safeDiv(input.appointments, input.leads) * 100;
  const closeRate = safeDiv(input.sales, input.leads) * 100;

  // D. Métricas Financeiras (O que importa pro dono)
  const averageTicket = safeDiv(input.revenue, input.sales);
  
  // CAC considera O CUSTO TOTAL, não só ads
  const cac = safeDiv(totalMarketingCost, input.sales);
  
  // ROAS olha apenas para a eficiência da mídia
  const roas = safeDiv(input.revenue, input.adSpend);
  
  // ROI olha para o negócio como um todo
  // (Receita - Custo) / Custo
  const roi = safeDiv(input.revenue - totalMarketingCost, totalMarketingCost) * 100;

  // E. Lucratividade Real
  // Gross Profit = Quanto sobra da venda para pagar o marketing?
  // Ex: Vendi 1000, margem é 30%, sobraram 300.
  const grossProfit = input.revenue * input.marginPercent;
  
  // Net Profit = Gross Profit - Custo de Marketing
  // Ex: Sobraram 300, mas gastei 200 de ads. Lucro = 100.
  const netProfit = grossProfit - totalMarketingCost;

  return {
    marketing: { ctr, cpc, cpm },
    conversion: { cpl, leadRate, closeRate, appointmentRate },
    financial: {
      totalCost: totalMarketingCost,
      cac,
      roas,
      roi,
      averageTicket,
      grossProfit,
      netProfit
    }
  };
};