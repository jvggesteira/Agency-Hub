import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Configuração inicial da resposta
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Criação do cliente Supabase no servidor
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. Verifica o usuário atual
  // ATENÇÃO: getUser() é mais seguro que getSession() para middleware
  const { data: { user } } = await supabase.auth.getUser()

  // 4. Definição de Rotas
  const url = request.nextUrl.clone()
  const isLoginPage = url.pathname === '/login'
  const isAuthRoute = url.pathname.startsWith('/auth') // Para callbacks e atualizações de senha
  const isPublicRoute = isLoginPage || isAuthRoute || url.pathname === '/' // Home pode ser pública ou não

  // 5. Lógica de Proteção (Redirecionamento)

  // CENÁRIO A: Usuário NÃO logado tentando acessar área restrita
  if (!user && !isPublicRoute) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // CENÁRIO B: Usuário LOGADO tentando acessar login
  if (user && isLoginPage) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Corresponde a todos os caminhos de solicitação, exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (arquivos de otimização de imagem)
     * - favicon.ico (ícone de favoritos)
     * - imagens públicas (svg, png, jpg, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}