import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // Atualizado para Next.js 15
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { margin } = body; // O front manda 0.30 (já dividido)

    console.log(`Recebido para salvar - Cliente: ${id}, Margem: ${margin}`);

    // Atualiza no banco
    const updatedClient = await prisma.clients.update({
      where: { id },
      data: { 
        margin_percent: Number(margin) 
      }
    });

    return NextResponse.json({ success: true, newMargin: updatedClient.margin_percent });
    
  } catch (error) {
    console.error("Erro ao salvar margem:", error);
    return NextResponse.json({ error: "Erro ao atualizar margem" }, { status: 500 });
  }
}