import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  
  // Captura os parâmetros novos
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/dashboard';
  
  // Captura o code antigo (caso algum link velho seja clicado)
  const code = searchParams.get('code');

  console.log(`🔄 Callback | Hash: ${!!token_hash} | Code: ${!!code} | Type: ${type}`);

  const cookieStore = await cookies();
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

  // CASO 1: Link Novo (Invite/Recovery sem cookie)
  if (token_hash && type) {
    console.log("🔑 Usando verifyOtp com token_hash...");
    
    const { error } = await supabase.auth.verifyOtp({
        type: type as any,
        token_hash: token_hash,
    });

    if (!error) {
        console.log("✅ Sucesso (verifyOtp)! Redirecionando...");
        return NextResponse.redirect(`${origin}${next}`);
    } else {
        console.error("❌ Erro verifyOtp:", error.message);
        return NextResponse.redirect(`${origin}/login?error=otp_failed`);
    }
  }

  // CASO 2: Login Social ou Link Padrão (Requer Cookie PKCE)
  if (code) {
    console.log("🌐 Usando exchangeCodeForSession...");
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    } else {
        // Se falhar o code normal, tenta um "resgate" assumindo que o code é um hash
        // Isso salva links antigos ou mal formatados
        console.warn("⚠️ Falha no code exchange. Tentando resgate como Invite/Recovery...");
        
        const { error: rescueError } = await supabase.auth.verifyOtp({
            token_hash: code,
            type: 'invite' // Tenta adivinhar que é convite
        });

        if (!rescueError) {
             return NextResponse.redirect(`${origin}${next}`);
        }
        
        // Se falhar, tenta recuperação
        const { error: rescueRecovery } = await supabase.auth.verifyOtp({
            token_hash: code,
            type: 'recovery'
        });

        if (!rescueRecovery) {
             return NextResponse.redirect(`${origin}${next}`);
        }
    }
  }

  // Falha Total
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}