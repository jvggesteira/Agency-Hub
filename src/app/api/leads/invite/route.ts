import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, role, permissions } = body;

    // Conecta com permissão de Super Admin (Service Role)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, 
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. Envia o convite por email (Magic Link)
    const { data: authData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { name: name } // Salva o nome nos metadados
    });

    if (inviteError) {
      console.error('Erro Supabase Invite:', inviteError);
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    // 2. Cria o perfil na tabela 'profiles' para guardar permissões
    if (authData.user) {
      // Verifica se já existe perfil para não dar erro
      const { data: existingProfile } = await supabaseAdmin.from('profiles').select('id').eq('id', authData.user.id).single();
      
      if (!existingProfile) {
        const { error: profileError } = await supabaseAdmin.from('profiles').insert({
          id: authData.user.id,
          email: email,
          name: name,
          role: role || 'collaborator',
          permissions: permissions || {}, // Suas permissões JSON
          created_at: new Date().toISOString()
        });

        if (profileError) {
          console.error('Erro ao criar perfil:', profileError);
          // Não retornamos erro aqui para não invalidar o convite que já foi enviado
        }
      } else {
        // Se já existe, atualiza as permissões
        await supabaseAdmin.from('profiles').update({
            permissions: permissions || {},
            role: role || 'collaborator',
            name: name
        }).eq('id', authData.user.id);
      }
    }

    return NextResponse.json({ success: true, message: 'Convite enviado com sucesso!' });

  } catch (error: any) {
    console.error('Erro API Invite:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}