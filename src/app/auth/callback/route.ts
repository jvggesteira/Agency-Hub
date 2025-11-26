import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();
    
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
              console.warn("Erro de Cookie (ignorar se server-side):", err);
            }
          },
        },
      }
    );
    
    // Tenta trocar o código
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // SUCESSO: Redireciona
      const forwardedHost = request.headers.get('x-forwarded-host'); // Para Vercel
      const isLocal = origin.includes('localhost');
      
      // Garante que o redirecionamento vá para o domínio certo
      const baseUrl = isLocal ? origin : `https://${forwardedHost || 'agency-hub-eight.vercel.app'}`;
      
      return NextResponse.redirect(`${baseUrl}${next}`);
    } else {
      // ERRO: Mostra na tela
      return new NextResponse(
        JSON.stringify({ 
          status: "Erro Fatal no Callback", 
          message: error.message, 
          code_param: code 
        }, null, 2), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return new NextResponse("Erro: Nenhum código encontrado na URL.", { status: 400 });
}