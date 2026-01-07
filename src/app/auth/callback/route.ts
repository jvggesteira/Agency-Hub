import { createServerClient } from '@supabase/ssr';
import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/dashboard';

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete('token_hash');
  redirectTo.searchParams.delete('type');
  redirectTo.searchParams.delete('next');

  if (token_hash && type) {
    const cookieStore = {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet: any[]) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
      },
    };

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: cookieStore,
      }
    );

    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    
    if (!error) {
      const response = NextResponse.redirect(redirectTo);
      // Hack necessário para persistir cookie no Next.js Server Components
      const newCookies = (cookieStore as any).cookiesToSet || [];
      newCookies.forEach(({ name, value, options }: any) => 
        response.cookies.set(name, value, options)
      );
      return response;
    }
  }

  // Erro? Manda pro login
  redirectTo.pathname = '/login';
  return NextResponse.redirect(redirectTo);
}