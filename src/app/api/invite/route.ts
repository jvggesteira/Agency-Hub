import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!supabaseUrl || !serviceRoleKey || !gmailUser || !gmailPass) {
    return NextResponse.json({ error: "Configuração incompleta." }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { email, name, role, permissions } = body;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 1. Cria ou Atualiza Perfil
    let userId = '';
    const { data: existingUser } = await supabaseAdmin.from('profiles').select('id').eq('email', email).single();

    if (existingUser) {
        userId = existingUser.id;
        await supabaseAdmin.from('profiles').update({ name, role, permissions }).eq('id', userId);
    } else {
        const { data: createdData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: { full_name: name }
        });
        if (createError) throw createError;
        userId = createdData.user.id;

        await supabaseAdmin.from('profiles').insert({
            id: userId,
            email: email,
            name: name,
            role: role || 'collaborator',
            permissions: permissions || {},
            created_at: new Date().toISOString()
        });
    }

    // 2. Gera Link de Recuperação
    const origin = new URL(req.url).origin;
    
    // --- CORREÇÃO AQUI ---
    // O link agora aponta para o callback, que fará o login e depois enviará para /update-password
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
            redirectTo: `${origin}/auth/callback?next=/update-password`
        }
    });

    if (linkError) throw linkError;
    const actionLink = linkData.properties.action_link;

    // 3. Envia Email
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass }
    });

    await transporter.sendMail({
        from: `"GM Hub" <${gmailUser}>`,
        to: email,
        subject: 'Acesso ao GM Hub',
        html: `
          <div style="font-family: Arial; color: #333; padding: 20px;">
            <h2>Olá, ${name}!</h2>
            <p>Clique abaixo para entrar e definir sua senha:</p>
            <a href="${actionLink}" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Acessar Sistema
            </a>
          </div>
        `
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}