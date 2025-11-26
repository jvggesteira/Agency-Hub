import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  
  // Força a leitura como string para garantir a comparação
  const type = searchParams.get('type') as string | null;

  console.log(`🔄 Callback Acionado | Type: ${type} | Code: ${code ? 'Sim' : 'Não'}`);

  if (code) {
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

    // LÓGICA SIMPLIFICADA E ROBUSTA
    // Se tiver qualquer tipo explícito (invite, recovery, magiclink), usa verifyOtp
    if (type === 'invite' || type === 'recovery' || type === 'magiclink' || type === 'signup') {
        console.log(`📧 Fluxo E-mail detectado (${type}). Usando verifyOtp...`);
        
        const { error } = await supabase.auth.verifyOtp({
            type: type as any,
            token_hash: code,
        });

        if (!error) {
            console.log("✅ Sucesso (verifyOtp)! Redirecionando...");
            return NextResponse.redirect(`${origin}${next}`);
        } else {
            console.error("❌ Erro verifyOtp:", error.message);
            return new NextResponse(`Erro de Link: ${error.message}`, { status: 400 });
        }
    } 
    // Se não tiver type, assume que é OAuth (Google, Github, etc) ou Login normal
    else {
        console.log("🌐 Fluxo OAuth/Padrão. Usando exchangeCodeForSession...");
        
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (!error) {
            console.log("✅ Sucesso (exchangeCode)! Redirecionando...");
            return NextResponse.redirect(`${origin}${next}`);
        } else {
            console.error("❌ Erro exchangeCode:", error.message);
            // Retorna JSON para facilitar o seu diagnóstico na tela
            return new NextResponse(JSON.stringify({ 
                erro: "Falha na troca de código", 
                detalhe: error.message, 
                tipo_detectado: type || "nenhum (oauth assumido)" 
            }, null, 2));
        }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=no_code`);
}