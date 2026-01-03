
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Transaction } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';

const COLORS = {
  ganho: '#4A90FF',
  Mercado: '#7A5CFA',
  Serviços: '#4A90FF',
  'Lazer/Delivery': '#C084FC',
  Outros: '#64748b'
};

const Dashboard: React.FC<{ userId: string }> = ({ userId }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [initialBalance, setInitialBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const txData = await db.transactions.where('userId').equals(userId).reverse().toArray();
      const profile = await db.profiles.get(userId);
      setTransactions(txData);
      setInitialBalance(profile?.initialBalance || 0);
      setIsLoading(false);
    };
    loadData();
  }, [userId]);

  const totalGanhos = transactions.filter(t => t.type === 'ganho').reduce((acc, t) => acc + t.amount, 0);
  const totalGastos = transactions.filter(t => t.type === 'gasto').reduce((acc, t) => acc + t.amount, 0);
  const currentBalance = initialBalance + totalGanhos - totalGastos;

  const pieData = transactions.filter(t => t.type === 'gasto').reduce((acc: any[], t) => {
    const cat = t.category || 'Outros';
    const existing = acc.find(item => item.name === cat);
    if (existing) existing.value += t.amount;
    else acc.push({ name: cat, value: t.amount });
    return acc;
  }, []);

  const evolutionData = (() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    let runningBalance = initialBalance + transactions.filter(t => new Date(t.date) < sevenDaysAgo).reduce((acc, t) => acc + (t.type === 'ganho' ? t.amount : -t.amount), 0);

    return days.map(dayStr => {
      const dayNet = transactions.filter(t => t.date.startsWith(dayStr)).reduce((acc, t) => acc + (t.type === 'ganho' ? t.amount : -t.amount), 0);
      runningBalance += dayNet;
      return {
        date: new Date(dayStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        saldo: runningBalance
      };
    });
  })();

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="w-12 h-12 border-4 border-[#7A5CFA]/20 border-t-[#7A5CFA] rounded-full animate-spin"></div>
      <p className="text-[#7A5CFA] font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Sincronizando Ecossistema...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 py-6 pb-24">
      {/* AI Intelligence Header */}
      <div className="reveal-card stagger-1 bg-gradient-to-r from-[#7A5CFA] via-[#4A90FF] to-[#7A5CFA] bg-[length:200%_100%] animate-gradient p-8 rounded-[40px] shadow-2xl text-white flex items-center justify-between relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.5em] opacity-80">IA Engine Online</span>
          </div>
          <h3 className="text-3xl font-black tracking-tighter mb-1">
            {currentBalance >= 0 ? 'Gestão Otimizada' : 'Atenção Necessária'}
          </h3>
          <p className="text-sm font-bold opacity-70">
            {totalGastos > totalGanhos 
              ? "Seus gastos mensais superaram as entradas. Analise agora." 
              : "Excelente performance! Seu patrimônio segue em trajetória de alta."}
          </p>
        </div>
        <i className="fas fa-brain text-9xl opacity-10 absolute -right-6 -bottom-6 rotate-12"></i>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="reveal-card stagger-1 tech-card glow-purple p-8 h-48 flex flex-col justify-between">
          <div>
            <span className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em]">Saldo Total</span>
            <h2 className={`text-4xl font-black mt-2 tracking-tighter ${currentBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
              R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[9px] text-[#7A5CFA] font-black uppercase tracking-widest">
            <i className="fas fa-check-double"></i>
            <span>Dados Sincronizados</span>
          </div>
        </div>

        <div className="reveal-card stagger-2 tech-card glow-blue p-8 h-48 flex flex-col justify-between">
          <div>
            <span className="text-[#4A90FF] font-black text-[10px] uppercase tracking-[0.3em]">Entradas</span>
            <h2 className="text-4xl font-black mt-2 text-white tracking-tighter">
              + R$ {totalGanhos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#4A90FF] h-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        <div className="reveal-card stagger-3 tech-card glow-purple p-8 h-48 flex flex-col justify-between">
          <div>
            <span className="text-[#7A5CFA] font-black text-[10px] uppercase tracking-[0.3em]">Saídas</span>
            <h2 className="text-4xl font-black mt-2 text-white tracking-tighter">
              - R$ {totalGastos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#7A5CFA] h-full" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="reveal-card tech-card p-10 min-h-[450px]">
          <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7A5CFA]/20 flex items-center justify-center text-[#7A5CFA]">
              <i className="fas fa-chart-pie"></i>
            </div>
            Mix de Categorias
          </h3>
          {pieData.length > 0 ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={pieData} 
                    innerRadius={85} 
                    outerRadius={125} 
                    paddingAngle={10} 
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-700 font-black opacity-30">
              <i className="fas fa-database text-6xl mb-4"></i>
              <p className="uppercase tracking-widest text-xs">Sem dados no período</p>
            </div>
          )}
        </div>

        <div className="reveal-card tech-card p-10 min-h-[450px]">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#4A90FF]/20 flex items-center justify-center text-[#4A90FF]">
                <i className="fas fa-wave-square"></i>
              </div>
              Projeção de Saldo
            </h3>
            <span className="text-[9px] font-black text-[#4A90FF] border border-[#4A90FF]/30 px-4 py-2 rounded-full uppercase tracking-widest">7 Dias</span>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData}>
                <defs>
                  <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7A5CFA" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#7A5CFA" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 9, fontWeight: 900, fill: '#64748b'}} 
                  dy={15} 
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="saldo" 
                  stroke="#7A5CFA" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorSaldo)" 
                  animationDuration={2000} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 8s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
