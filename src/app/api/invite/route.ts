import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  console.log("🚀 Iniciando rota API Invite (Via Gmail)...");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!supabaseUrl || !serviceRoleKey || !gmailUser || !gmailPass) {
    return NextResponse.json({ error: "Configuração do servidor incompleta." }, { status: 500 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Body inválido." }, { status: 400 });

    const { email, name, role, permissions } = body;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 1. Cria ou Atualiza Usuário
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

    // 2. Gera o Link Mágico
    // CORREÇÃO: Declarado apenas UMA vez
    const origin = new URL(req.url).origin;
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
            // Manda direto para a página de senha. Como desligamos o middleware, não vai ter loop.
            redirectTo: `${origin}/update-password`
        }
    });

    if (linkError) throw linkError;

    const actionLink = linkData.properties.action_link;

    // 3. Envia o E-mail
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass }
    });

    await transporter.sendMail({
        from: `"GM Hub" <${gmailUser}>`,
        to: email,
        subject: 'Bem-vindo ao GM Hub - Defina sua senha',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
            <h2 style="color: #0f172a;">Olá, ${name}!</h2>
            <p>Você foi convidado para acessar o <strong>GM Hub</strong>.</p>
            <p>Clique no botão abaixo para ativar sua conta e criar sua senha:</p>
            <br/>
            <div style="text-align: center;">
                <a href="${actionLink}" target="_blank" style="background-color: #0f172a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Criar Minha Senha
                </a>
            </div>
            <br/>
            <hr style="border: 0; border-top: 1px solid #e2e8f0;"/>
            <p style="font-size: 12px; color: #94a3b8;">Se o botão não funcionar: ${actionLink}</p>
          </div>
        `
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Erro invite:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}