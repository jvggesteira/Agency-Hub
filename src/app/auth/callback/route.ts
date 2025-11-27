import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  
  const code = searchParams.get('code');
  // Forçamos o redirecionamento para update-password se não vier especificado
  const next = searchParams.get('next') ?? '/update-password';

  console.log(`🔄 Callback Acionado. Código recebido: ${code ? 'Sim' : 'Não'}`);

  if (code) {
    const cookieStore = await cookies();
    
    // Configuração do cliente Supabase para Next.js 15
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch (err) { console.warn("Cookie error:", err) }
          },
        },
      }
    );

    // --- ESTRATÉGIA DE FORÇA BRUTA (Tenta abrir todas as portas) ---

    // 1. TENTATIVA: Recuperação de Senha (Recovery)
    // Prioridade 1: Resolve o caso do "Reset Password"
    const { error: recoveryError } = await supabase.auth.verifyOtp({
        type: 'recovery',
        token_hash: code,
    });

    if (!recoveryError) {
        console.log("✅ Sucesso: Era Recuperação de Senha.");
        return NextResponse.redirect(`${origin}/update-password`);
    }

    // 2. TENTATIVA: Convite (Invite)
    // Prioridade 2: Resolve o caso do "Accept Invite" (mesmo sem &type na URL)
    const { error: inviteError } = await supabase.auth.verifyOtp({
        type: 'invite',
        token_hash: code,
    });

    if (!inviteError) {
        console.log("✅ Sucesso: Era um Convite.");
        return NextResponse.redirect(`${origin}/update-password`);
    }

    // 3. TENTATIVA: Magic Link (Caso use no futuro)
    const { error: magicError } = await supabase.auth.verifyOtp({
        type: 'magiclink',
        token_hash: code,
    });

    if (!magicError) {
        console.log("✅ Sucesso: Era Magic Link.");
        return NextResponse.redirect(`${origin}/dashboard`);
    }

    // 4. TENTATIVA: Login Padrão (OAuth)
    // Último recurso. Se chegar aqui, é porque nenhum dos anteriores funcionou.
    const { error: oauthError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!oauthError) {
        console.log("✅ Sucesso: Era OAuth.");
        return NextResponse.redirect(`${origin}/dashboard`);
    }

    // SE TUDO FALHAR: Mostra o erro na tela para sabermos o que houve
    return new NextResponse(JSON.stringify({ 
        status: "ERRO FATAL - Nenhuma validação funcionou", 
        detalhes: {
            recovery: recoveryError?.message,
            invite: inviteError?.message,
            oauth: oauthError?.message
        }
    }, null, 2), { status: 400 });
  }

  return NextResponse.redirect(`${origin}/login?error=no_code`);
}