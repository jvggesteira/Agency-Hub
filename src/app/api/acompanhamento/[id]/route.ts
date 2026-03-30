import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clientId = Number(id);
  if (!clientId || isNaN(clientId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Client info (only safe fields)
    const { data: client, error: clientErr } = await supabase
      .from('disparo_clients')
      .select('id, name, company, status')
      .eq('id', clientId)
      .eq('is_active', true)
      .single();

    if (clientErr || !client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // Active packages (no price/cost info)
    const { data: packages } = await supabase
      .from('disparo_packages')
      .select('id, name, contracted_messages, refunded_messages, is_active')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // All dispatches
    const { data: dispatches } = await supabase
      .from('disparo_dispatches')
      .select('id, package_id, name, dispatch_date, sent_messages, delivered_messages')
      .eq('client_id', clientId)
      .order('dispatch_date', { ascending: false });

    // Results for dispatches
    const dispatchIds = (dispatches || []).map(d => d.id);
    let results: any[] = [];
    if (dispatchIds.length > 0) {
      const { data: res } = await supabase
        .from('disparo_results')
        .select('dispatch_id, leads_count, sales_count')
        .in('dispatch_id', dispatchIds);
      results = res || [];
    }

    // Calculate balances per package (no financial data)
    const allDisps = dispatches || [];
    const pkgBalances: Record<number, { contracted: number; delivered: number; balance: number; refunded: number }> = {};
    for (const pkg of packages || []) {
      const refunded = pkg.refunded_messages || 0;
      const billable = pkg.contracted_messages - refunded;
      const delivered = allDisps
        .filter(d => d.package_id === pkg.id)
        .reduce((s: number, d: any) => s + d.delivered_messages, 0);
      pkgBalances[pkg.id] = {
        contracted: pkg.contracted_messages,
        delivered,
        balance: billable - delivered,
        refunded,
      };
    }

    // Summary stats
    const totalContracted = (packages || []).reduce((s, p) => s + p.contracted_messages, 0);
    const totalRefunded = (packages || []).reduce((s, p) => s + (p.refunded_messages || 0), 0);
    const totalDelivered = allDisps.reduce((s: number, d: any) => s + d.delivered_messages, 0);
    const totalSent = allDisps.reduce((s: number, d: any) => s + d.sent_messages, 0);

    return NextResponse.json({
      client: { id: client.id, name: client.name, company: client.company, status: client.status },
      packages: (packages || []).map(p => ({
        id: p.id,
        name: p.name,
        ...pkgBalances[p.id],
      })),
      dispatches: allDisps.map(d => {
        const result = results.find(r => r.dispatch_id === d.id);
        return {
          id: d.id,
          packageId: d.package_id,
          name: d.name,
          date: d.dispatch_date,
          sent: d.sent_messages,
          delivered: d.delivered_messages,
          leads: result?.leads_count || 0,
          sales: result?.sales_count || 0,
        };
      }),
      summary: {
        totalContracted,
        totalRefunded,
        totalBillable: totalContracted - totalRefunded,
        totalDelivered,
        totalSent,
        totalBalance: (totalContracted - totalRefunded) - totalDelivered,
        totalDispatches: allDisps.length,
        deliveryRate: totalSent > 0 ? ((totalDelivered / totalSent) * 100) : 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
