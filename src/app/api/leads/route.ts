import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Configuração do Cliente Supabase com PODERES DE ADMIN (Service Role)
// Isso é crucial para aceitar dados de fora sem login
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Função para lidar com requisições OPTIONS (CORS - Permite chamadas de outros sites)
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: Request) {
  try {
    // 1. Ler os dados recebidos
    const body = await request.json();
    
    // 2. Validação básica
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, email' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 3. Sanitização e Preparação dos dados
    // Mapeia o que vem de fora para o nosso padrão
    const newLead = {
      name: body.name,
      email: body.email,
      phone: body.phone || body.telephone || '',
      company: body.company || body.empresa || '',
      // Se vier 'orcamento', converte para string ou mantém.
      budget: body.budget || body.orcamento || '', 
      // Fonte: Se não vier, assume 'site' ou 'api'
      source: body.source || body.origem || 'site',
      // Notas: Junta mensagem ou observações
      notes: body.notes || body.message || body.mensagem || '',
      status: 'novo', // Todo lead externo entra como 'novo'
    };

    console.log("Recebendo Lead Externo:", newLead);

    // 4. Inserir no Supabase
    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert(newLead)
      .select()
      .single();

    if (error) {
      console.error("Erro Supabase:", error);
      return NextResponse.json(
        { error: 'Erro ao salvar no banco de dados' },
        { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 5. Sucesso
    return NextResponse.json(
      { success: true, message: 'Lead recebido com sucesso!', data },
      { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (error: any) {
    console.error("Erro API:", error);
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}