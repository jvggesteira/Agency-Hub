import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full min-h-[60vh] text-center p-6">
      <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full mb-4">
        <ShieldAlert className="h-12 w-12 text-red-600 dark:text-red-500" />
      </div>
      
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Acesso Negado
      </h2>
      
      <p className="text-slate-600 dark:text-slate-400 max-w-md mb-6">
        Você não tem permissão para visualizar esta página. Entre em contato com o administrador se acreditar que isso é um erro.
      </p>
      
      <Link href="/dashboard">
        <Button className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
          Voltar ao Dashboard
        </Button>
      </Link>
    </div>
  );
}