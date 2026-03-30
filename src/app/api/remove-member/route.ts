import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function DELETE(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 });
  }

  try {
    // 1. Verifica se quem está chamando é admin/manager
    const supabaseAuth = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user: caller } } = await supabaseAuth.auth.getUser();
    if (!caller) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // Busca o perfil de quem está chamando para checar a role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, email')
      .eq('id', caller.id)
      .single();

    const isAdmin =
      callerProfile?.email === 'jvggesteira@gmail.com' ||
      callerProfile?.role === 'admin' ||
      callerProfile?.role === 'manager';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Sem permissão. Apenas administradores podem remover membros.' }, { status: 403 });
    }

    // 2. Pega o ID do membro a ser removido
    const body = await req.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json({ error: 'ID do membro é obrigatório.' }, { status: 400 });
    }

    // Impede que o admin se auto-remova
    if (memberId === caller.id) {
      return NextResponse.json({ error: 'Você não pode remover a si mesmo.' }, { status: 400 });
    }

    // 3. Remove o perfil da tabela profiles
    await supabaseAdmin.from('profiles').delete().eq('id', memberId);

    // 4. Remove o usuário do Supabase Auth (impede login definitivamente)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(memberId);

    if (authError) {
      console.error('Erro ao remover do Auth:', authError);
      return NextResponse.json({ error: `Perfil removido, mas erro no Auth: ${authError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Membro removido completamente.' });
  } catch (error: any) {
    console.error('Erro ao remover membro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
