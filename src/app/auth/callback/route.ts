import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  // O Supabase agora vai nos entregar um 'code' limpo e validado
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  
  // O parametro 'next' virá automaticamente através do .ConfirmationURL
  const next = searchParams.get('next') ?? '/dashboard';

  console.log("🔄 Callback Padrão Iniciado. Code:", code ? "OK" : "Missing");

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
            } catch (err) { 
                // Ignora erro de setar cookie em Server Component
            }
          },
        },
      }
    );
    
    // Troca o código pela sessão (Login)
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      console.log("✅ Login realizado com sucesso! Redirecionando para:", next);
      return NextResponse.redirect(`${origin}${next}`);
    } else {
        console.error("❌ Erro ao trocar código:", error.message);
        // Se falhar, redireciona para login com erro
        return NextResponse.redirect(`${origin}/login?error=auth_exchange_failed`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=no_code`);
}