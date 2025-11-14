# Regras de Desenvolvimento e Stack Tecnológica

Este documento define a stack tecnológica e as regras de uso de bibliotecas para garantir a consistência, manutenibilidade e elegância do código.

## Stack Tecnológica (Visão Geral)

1.  **Framework:** Next.js (App Router) com TypeScript.
2.  **Estilização:** Tailwind CSS, utilizando as classes utilitárias e o sistema de cores Oklch definido em `src/app/globals.css`.
3.  **Componentes UI:** Shadcn/ui (baseado em Radix UI), importados de `src/components/ui/`.
4.  **Formulários e Validação:** React Hook Form (`react-hook-form`) e Zod (`zod`).
5.  **Ícones:** Lucide React (`lucide-react`).
6.  **Roteamento:** Next.js App Router (`next/navigation`).
7.  **Persistência de Dados (Mock):** Atualmente, a persistência é simulada usando `localStorage` em todas as páginas.
8.  **Notificações:** Utilize o sistema de Toast existente (`src/hooks/use-toast.ts` e `src/components/ui/toaster.tsx`).

## Regras de Uso de Bibliotecas

| Funcionalidade | Biblioteca Obrigatória | Regras de Uso |
| :--- | :--- | :--- |
| **Estilização** | Tailwind CSS | **Exclusivo.** Não use CSS modules ou inline styles complexos. Garanta que o design seja responsivo. |
| **Componentes UI** | Shadcn/ui (via `src/components/ui/`) | Use os componentes existentes. Se precisar de um componente customizado, crie-o em `src/components/custom/`. **Não modifique** os arquivos em `src/components/ui/`. |
| **Formulários** | `react-hook-form` | Use `useForm` para gerenciar o estado do formulário. |
| **Validação** | `zod` | Use `zod` para definir schemas e `zodResolver` para integração com `react-hook-form`. |
| **Ícones** | `lucide-react` | Use apenas ícones do pacote `lucide-react`. |
| **Notificações** | Sistema de Toast Shadcn | Use o hook `useToast` (ou a função `toast`) de `src/hooks/use-toast.ts` para feedback ao usuário. |
| **Estrutura de Arquivos** | Next.js App Router | Páginas em `src/app/`, Componentes em `src/components/`, Hooks em `src/hooks/`. |
| **Persistência** | `localStorage` (Mock) | Continue usando `localStorage` para simular o backend, a menos que o usuário solicite explicitamente a integração com o Supabase (que está configurado em `src/lib/supabase.ts`). |