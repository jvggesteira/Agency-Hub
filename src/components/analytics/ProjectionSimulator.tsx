'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calculator, Target, TrendingUp } from 'lucide-react';

export default function ProjectionSimulator() {
  const [activeMode, setActiveMode] = useState<'revenue' | 'investment' | 'roi'>('revenue');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* SELETOR DE MODO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ModeCard 
            id="revenue" 
            title="Projetar Faturamento" 
            icon={<TrendingUp className="h-5 w-5"/>} 
            desc="Dado um investimento, quanto posso faturar?"
            active={activeMode} setActive={setActiveMode}
        />
        <ModeCard 
            id="investment" 
            title="Calcular Investimento" 
            icon={<Target className="h-5 w-5"/>} 
            desc="Para atingir X de receita, quanto preciso investir?"
            active={activeMode} setActive={setActiveMode}
        />
        <ModeCard 
            id="roi" 
            title="Planejar Viabilidade (ROI)" 
            icon={<Calculator className="h-5 w-5"/>} 
            desc="Qual meu CAC e CPL teto para ter o ROI desejado?"
            active={activeMode} setActive={setActiveMode}
        />
      </div>

      {/* ÁREA DE CÁLCULO */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardContent className="p-8">
            {activeMode === 'revenue' && <RevenueCalculator />}
            {activeMode === 'investment' && <InvestmentCalculator />}
            {activeMode === 'roi' && <RoiCalculator />}
        </CardContent>
      </Card>
    </div>
  );
}

// --- CALCULADORA 1: PROJETAR FATURAMENTO ---
function RevenueCalculator() {
    const [inputs, setInputs] = useState({ investment: 5000, cpl: 10, closeRate: 10, ticket: 500 });
    
    // Logic: Investment / CPL = Leads -> Leads * CloseRate = Sales -> Sales * Ticket = Revenue
    const leads = inputs.cpl > 0 ? inputs.investment / inputs.cpl : 0;
    const sales = leads * (inputs.closeRate / 100);
    const revenue = sales * inputs.ticket;
    const roas = inputs.investment > 0 ? revenue / inputs.investment : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-700 border-b pb-2">1. Preencha os Dados</h3>
                <InputGroup label="Investimento Disponível (R$)" value={inputs.investment} onChange={(v: number) => setInputs({...inputs, investment: v})} />
                <InputGroup label="Custo por Lead (CPL Estimado)" value={inputs.cpl} onChange={(v: number) => setInputs({...inputs, cpl: v})} />
                <InputGroup label="Taxa de Fechamento (%)" value={inputs.closeRate} onChange={(v: number) => setInputs({...inputs, closeRate: v})} />
                <InputGroup label="Ticket Médio (R$)" value={inputs.ticket} onChange={(v: number) => setInputs({...inputs, ticket: v})} />
            </div>
            
            <div className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                <h3 className="text-lg font-bold text-slate-700 border-b pb-2">2. Resultado Projetado</h3>
                <ResultRow label="Leads Gerados" value={Math.floor(leads)} />
                <ResultRow label="Vendas Estimadas" value={Math.floor(sales)} highlight />
                <ResultRow label="Faturamento Projetado" value={formatMoney(revenue)} highlightColor="text-green-600" />
                <div className="pt-4 border-t">
                    <ResultRow label="ROAS Projetado" value={`${roas.toFixed(2)}x`} />
                </div>
            </div>
        </div>
    )
}

// --- CALCULADORA 2: DEFINIR META ---
function InvestmentCalculator() {
    const [inputs, setInputs] = useState({ targetRevenue: 50000, ticket: 500, closeRate: 10, cpl: 10 });

    // Logic: Revenue / Ticket = Sales -> Sales / CloseRate = Leads -> Leads * CPL = Investment
    const salesNeeded = inputs.ticket > 0 ? inputs.targetRevenue / inputs.ticket : 0;
    const leadsNeeded = inputs.closeRate > 0 ? salesNeeded / (inputs.closeRate / 100) : 0;
    const investmentNeeded = leadsNeeded * inputs.cpl;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-700 border-b pb-2">1. Defina sua Meta</h3>
                <InputGroup label="Meta de Faturamento (R$)" value={inputs.targetRevenue} onChange={(v: number) => setInputs({...inputs, targetRevenue: v})} />
                <InputGroup label="Ticket Médio (R$)" value={inputs.ticket} onChange={(v: number) => setInputs({...inputs, ticket: v})} />
                <InputGroup label="Taxa de Fechamento (%)" value={inputs.closeRate} onChange={(v: number) => setInputs({...inputs, closeRate: v})} />
                <InputGroup label="Custo por Lead (CPL Médio)" value={inputs.cpl} onChange={(v: number) => setInputs({...inputs, cpl: v})} />
            </div>
            
            <div className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                <h3 className="text-lg font-bold text-slate-700 border-b pb-2">2. O que você precisa fazer</h3>
                <ResultRow label="Vendas Necessárias" value={Math.ceil(salesNeeded)} />
                <ResultRow label="Leads Necessários" value={Math.ceil(leadsNeeded)} highlight />
                <div className="pt-4 border-t">
                    <p className="text-sm text-slate-500 mb-1">Investimento Necessário</p>
                    <p className="text-3xl font-bold text-blue-600">{formatMoney(investmentNeeded)}</p>
                </div>
            </div>
        </div>
    )
}

// --- CALCULADORA 3: VIABILIDADE (ROI) ---
function RoiCalculator() {
    const [inputs, setInputs] = useState({ ticket: 200, margin: 50, targetRoi: 300, closeRate: 10 });

    // Margem de Contribuição em R$
    const marginValue = inputs.ticket * (inputs.margin / 100);
    
    // ROI Input (ex: 300%) -> Decimal (3.0)
    const roiDecimal = inputs.targetRoi / 100;
    
    // Fórmula CAC Teto = MargemR$ / (ROI_Decimal + 1)
    const targetCac = marginValue / (roiDecimal + 1);
    
    // CPL Teto = CAC Teto * Taxa de Conversão
    const targetCpl = targetCac * (inputs.closeRate / 100);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-700 border-b pb-2">1. Estrutura de Custos</h3>
                <InputGroup label="Ticket Médio (R$)" value={inputs.ticket} onChange={(v: number) => setInputs({...inputs, ticket: v})} />
                <InputGroup label="Margem de Contribuição (%)" value={inputs.margin} onChange={(v: number) => setInputs({...inputs, margin: v})} />
                <InputGroup label="ROI Desejado (%)" value={inputs.targetRoi} onChange={(v: number) => setInputs({...inputs, targetRoi: v})} />
                <InputGroup label="Taxa de Fechamento Esperada (%)" value={inputs.closeRate} onChange={(v: number) => setInputs({...inputs, closeRate: v})} />
            </div>
            
            <div className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                <h3 className="text-lg font-bold text-slate-700 border-b pb-2">2. Limites de Eficiência</h3>
                <div className="p-4 bg-green-100 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800 font-bold mb-1">CAC Máximo (Custo por Venda)</p>
                    <p className="text-2xl font-bold text-green-700">{formatMoney(targetCac)}</p>
                    <p className="text-xs text-green-600 mt-1">Acima disso, seu ROI cai.</p>
                </div>
                
                <div className="p-4 bg-blue-100 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 font-bold mb-1">CPL Máximo (Custo por Lead)</p>
                    <p className="text-2xl font-bold text-blue-700">{formatMoney(targetCpl)}</p>
                    <p className="text-xs text-blue-600 mt-1">Seu lead não pode custar mais que isso.</p>
                </div>
            </div>
        </div>
    )
}

// --- COMPONENTES AUXILIARES ---

interface ModeCardProps {
    id: string; title: string; icon: React.ReactNode; desc: string; active: string; setActive: (id: any) => void;
}
function ModeCard({ id, title, icon, desc, active, setActive }: ModeCardProps) {
    return (
        <div 
            onClick={() => setActive(id)}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 ${active === id ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-[1.02]' : 'bg-white hover:border-slate-400 text-slate-600'}`}
        >
            <div className="flex items-center gap-2 font-bold">
                {icon} <span>{title}</span>
            </div>
            <p className={`text-xs ${active === id ? 'text-slate-300' : 'text-slate-400'}`}>{desc}</p>
        </div>
    )
}

interface InputGroupProps {
    label: string; value: number; onChange: (val: number) => void;
}
function InputGroup({ label, value, onChange }: InputGroupProps) {
    return (
        <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{label}</label>
            <Input 
                type="number" 
                value={value} 
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)} 
                className="font-semibold text-slate-900"
            />
        </div>
    )
}

function ResultRow({ label, value, highlight, highlightColor = 'text-slate-900' }: any) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200 last:border-0">
            <span className="text-sm text-slate-500 font-medium">{label}</span>
            <span className={`text-lg font-bold ${highlight ? highlightColor : 'text-slate-700'}`}>
                {value}
            </span>
        </div>
    )
}

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);