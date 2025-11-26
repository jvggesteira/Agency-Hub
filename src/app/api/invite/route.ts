import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  console.log("🚀 Iniciando rota API Invite...");

  // 1. Verificação de Segurança das Variáveis
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ ERRO CRÍTICO: Variáveis de ambiente ausentes.");
    console.error("URL:", supabaseUrl ? "Definida" : "Ausente");
    console.error("KEY:", serviceRoleKey ? "Definida (Oculta)" : "Ausente");
    
    return NextResponse.json(
      { error: "Configuração do servidor incompleta. Verifique os Logs da Vercel." },
      { status: 500 }
    );
  }

  try {
    // 2. Parsing do Body com segurança
    const body = await req.json().catch(() => null);
    
    if (!body) {
      return NextResponse.json({ error: "Corpo da requisição inválido ou vazio." }, { status: 400 });
    }

    const { email, name, role, permissions } = body;
    console.log(`📩 Tentando convidar: ${email} (${name})`);

    // 3. Conecta com Supabase Admin
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 4. Envia o convite
    // IMPORTANTE: Adicionei redirectTo para garantir que o link de email funcione
    const { data: authData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { name: name },
      redirectTo: `${new URL(req.url).origin}/auth/callback` // Ou apenas a URL base do site
    });

    if (inviteError) {
      console.error('❌ Erro Supabase Invite:', inviteError);
      return NextResponse.json({ error: `Erro no Supabase: ${inviteError.message}` }, { status: 400 });
    }

    console.log("✅ Convite enviado. ID do usuário:", authData.user?.id);

    // 5. Cria/Atualiza Perfil
    if (authData.user) {
      // Verifica perfil existente
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', authData.user.id)
        .maybeSingle(); // Use maybeSingle para evitar erro se não existir
      
      if (!existingProfile) {
        console.log("👤 Criando novo perfil...");
        const { error: profileError } = await supabaseAdmin.from('profiles').insert({
          id: authData.user.id,
          email: email,
          name: name,
          role: role || 'collaborator',
          permissions: permissions || {},
          created_at: new Date().toISOString()
        });

        if (profileError) {
          console.error('⚠️ Erro ao salvar perfil (Convite foi enviado):', profileError);
          // Não retornamos erro fatal aqui, pois o email já foi enviado
        }
      } else {
        console.log("👤 Atualizando perfil existente...");
        await supabaseAdmin.from('profiles').update({
            permissions: permissions || {},
            role: role || 'collaborator',
            name: name
        }).eq('id', authData.user.id);
      }
    }

    return NextResponse.json({ success: true, message: 'Convite enviado com sucesso!' });

  } catch (error: any) {
    console.error('🔥 EXCEÇÃO NO SERVIDOR:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}