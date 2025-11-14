'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona para a página de dashboard/equipe
    router.push('/team');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-4xl font-bold">Carregando...</h1>
      <p className="text-xl text-gray-600">
        Redirecionando para o sistema...
      </p>
    </div>
  );
}
