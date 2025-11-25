import { redirect } from 'next/navigation';

// Redireciona a rota raiz para o Dashboard
export default function Home() {
  redirect('/dashboard');
}