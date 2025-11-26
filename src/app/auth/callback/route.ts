import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  console.log("🔄 Callback iniciado. Code presente?", !!code);

  if (code) {
    const cookieStore = await cookies();
    
    // Configuração correta usando @supabase/ssr para Next.js 15
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch (err) {
              // Ignora erro se for chamado de um Server Component
              console.warn("Erro ao definir cookies:", err);
            }
          },
        },
      }
    );
    
    // Tenta trocar o código pela sessão
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      console.log("✅ Sucesso! Redirecionando para:", next);
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error("❌ Erro na troca do código:", error.message);
    }
  } else {
    console.error("❌ Nenhum código encontrado na URL.");
  }

  // Se falhar, manda para o login com o erro visível
  return NextResponse.redirect(`${origin}/login?error=auth_code_error`);
}