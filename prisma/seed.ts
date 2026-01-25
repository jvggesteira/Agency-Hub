import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // 1. Criar Cliente (Usando nomes em minúsculo conforme seu schema)
  const client = await prisma.clients.create({
    data: {
      name: "Empresa Teste LTDA",
      niche: "ECOMMERCE",
      margin_percent: 0.35, // 35% margem
      average_ticket: 150.00
    }
  });

  console.log(`✅ Cliente criado: ${client.name} (ID: ${client.id})`);

  // 2. Criar Cohort (Campanha de Fevereiro)
  const cohort = await prisma.cohorts.create({
    data: {
      client_id: client.id,
      name: "Fevereiro 2026 - Meta Ads",
      start_date: new Date("2026-02-01"),
      end_date: new Date("2026-02-28"),
      channel: "Meta Ads"
    }
  });

  // 3. Gerar 30 dias de dados simulados
  console.log("📊 Gerando dados diários...");
  
  for (let i = 0; i < 30; i++) {
    const date = new Date("2026-02-01");
    date.setDate(date.getDate() + i);

    // Simulação de números
    const spend = 200 + Math.random() * 100; // Gasta entre 200 e 300 por dia
    const clicks = Math.floor(spend / 1.5);  // CPC médio de 1.50
    const leads = Math.floor(clicks * 0.08); // 8% conversão LP
    const sales = Math.floor(leads * 0.15);  // 15% conversão venda
    const revenue = sales * 150;             // Ticket 150

    // Custos
    await prisma.marketing_costs.create({
      data: {
        client_id: client.id,
        cohort_id: cohort.id,
        date: date,
        ad_spend: spend,
        creative_cost: i === 0 ? 800 : 0, // Custo fixo no dia 1
        agency_fee: i === 0 ? 2000 : 0,   // Fee mensal no dia 1
      }
    });

    // Funil
    await prisma.funnel_data.create({
      data: {
        cohort_id: cohort.id,
        date: date,
        impressions: clicks * 15,
        clicks: clicks,
        leads: leads,
        sales: sales,
        revenue: revenue
      }
    });
  }

  console.log("🏁 Seed finalizado com sucesso!");
  console.log("------------------------------------------------");
  console.log(`👉 ID PARA TESTE: ${client.id}`);
  console.log("------------------------------------------------");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());