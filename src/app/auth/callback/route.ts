import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  
  // No nosso template, 'code' carrega o Token Hash
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const type = searchParams.get('type') as EmailOtpType | null;

  console.log(`🔄 Callback iniciado. Tipo: ${type || 'OAuth'}, Code presente? ${!!code}`);

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
              console.warn("Erro de Cookie:", err);
            }
          },
        },
      }
    );
    
    let error = null;

    // LÓGICA INTELIGENTE:
    // Se for convite ou recuperação de senha, usamos verifyOtp (não precisa de PKCE)
    if (type === 'invite' || type === 'recovery') {
        console.log("📧 Processando fluxo de E-mail (Invite/Recovery)...");
        const { error: otpError } = await supabase.auth.verifyOtp({
            type: type,
            token_hash: code, // Aqui usamos o código como hash
        });
        error = otpError;
    } 
    // Se for login social ou outro, usamos a troca de código padrão
    else {
        console.log("🌐 Processando fluxo OAuth/Code...");
        const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
        error = codeError;
    }
    
    if (!error) {
      console.log("✅ Sucesso! Redirecionando para:", next);
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error("❌ Erro na autenticação:", error.message);
      
      // Mostra o erro na tela para facilitar o debug
      return new NextResponse(
        JSON.stringify({ 
          status: "Erro de Autenticação", 
          type: type || "oauth",
          message: error.message 
        }, null, 2), 
        { status: 400 }
      );
    }
  }

  return NextResponse.redirect(`${origin}/login?error=no_code`);
}