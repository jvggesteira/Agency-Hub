'use server';

import { createClient } from '@supabase/supabase-js';

export async function inviteUser(formData: FormData) {
  const email = formData.get('email') as string;
  const role = formData.get('role') as string;
  const fullName = formData.get('fullName') as string;

  // 1. Conecta ao Supabase com poder de ADMIN (usando a Service Role Key)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // 2. Envia o convite oficial por email
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName }, // Grava o nome nos dados do usuário
    // Onde o usuário vai cair quando clicar no link do email (ajuste se precisar)
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`,
  });

  if (error) {
    console.error('Erro ao convidar:', error);
    return { success: false, message: error.message };
  }

  // 3. Se o usuário foi criado, define o cargo dele na tabela 'profiles'
  if (data.user) {
    // Tenta atualizar o perfil que o gatilho (trigger) criou automaticamente
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ role: role })
      .eq('id', data.user.id);

    if (profileError) {
        console.error('Erro ao definir cargo:', profileError);
        // Não retornamos erro aqui porque o convite já foi enviado, apenas logamos
    }
  }

  return { success: true, message: 'Convite enviado com sucesso!' };
}