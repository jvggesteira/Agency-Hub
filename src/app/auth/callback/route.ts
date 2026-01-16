import { createServerClient } from '@supabase/ssr';
import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Suporte a PKCE (O que o Invite Link usa agora)
  const code = searchParams.get('code');
  
  // Suporte legado (Magic Link direto)
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  
  const next = searchParams.get('next') ?? '/dashboard';
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  
  // Limpa parâmetros da URL final
  redirectTo.searchParams.delete('code');
  redirectTo.searchParams.delete('token_hash');
  redirectTo.searchParams.delete('type');
  redirectTo.searchParams.delete('next');

  const cookieStore = {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet: any[]) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
      },
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieStore }
  );

  // 1. Tenta trocar o código por sessão (Fluxo Principal)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  } 
  
  // 2. Tenta verificar via token hash (Fluxo Secundário)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  }

  // Se falhar tudo, manda pro login com erro
  redirectTo.pathname = '/login';
  redirectTo.searchParams.set('error', 'auth_failed');
  return NextResponse.redirect(redirectTo);
}