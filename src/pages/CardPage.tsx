
import React, { useState, useEffect } from 'react';
import { db } from '@/db';

const CardPage: React.FC<{ userId: string }> = ({ userId }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardData, setCardData] = useState({
    name: '',
    number: '',
    validity: '',
    cvv: '',
    balance: 0
  });

  useEffect(() => {
    const generateNumber = () => {
      let num = "";
      for (let i = 0; i < 4; i++) {
        num += Math.floor(1000 + Math.random() * 9000) + (i < 3 ? " " : "");
      }
      return num;
    };

    const generateValidity = () => {
      const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
      const year = String(new Date().getFullYear() + Math.floor(Math.random() * 5) + 1).slice(-2);
      return `${month}/${year}`;
    };

    const loadData = async () => {
        // Busca o perfil para pegar o nome real do usuário
        const profile = await db.profiles.get(userId);
        const displayName = profile?.fullName?.toUpperCase() || `CLIENTE ${userId}`;

        // Busca o saldo atual do DB para dar realismo total
        const txs = await db.transactions.where('userId').equals(userId).toArray();
        const current = (profile?.initialBalance || 0) + 
                        txs.filter(t => t.type === 'ganho').reduce((acc, t) => acc + t.amount, 0) -
                        txs.filter(t => t.type === 'gasto').reduce((acc, t) => acc + t.amount, 0);
        
        setCardData({
            name: displayName,
            number: generateNumber(),
            validity: generateValidity(),
            cvv: String(Math.floor(100 + Math.random() * 900)),
            balance: current // Saldo real do usuário, conforme solicitado
        });
    };

    loadData();
  }, [userId]);

  return (
    <div className="h-full flex flex-col items-center justify-center py-10 animate-fadeIn">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-gray-800 tracking-tighter uppercase">INOVAFINANCE <span className="text-[#7A5CFA]">BLACK</span></h2>
        <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.3em] mt-1">Toque para girar e ver detalhes</p>
      </div>

      <div 
        className="card-container relative w-full max-w-[400px] aspect-[1.58/1] cursor-pointer perspective-1000 group active:scale-95 transition-transform"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className="card-glow"></div>
        
        <div className={`card-inner w-full h-full ${isFlipped ? 'card-flip' : ''}`}>
          
          {/* FRENTE DO CARTÃO */}
          <div className="card-face card-front bg-gradient-to-br from-[#121212] via-[#242424] to-[#000000] p-8 flex flex-col justify-between shadow-2xl border border-white/10">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-white text-lg font-black tracking-tighter">INOVAFINANCE <span className="text-[#7A5CFA]">BANK</span></span>
                <div className="w-10 h-1 mt-1 bg-gradient-to-r from-[#7A5CFA] to-transparent rounded-full"></div>
              </div>
              <div className="w-14 h-10 bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center shadow-inner">
                 <div className="grid grid-cols-2 gap-1 opacity-40">
                    <div className="w-3 h-3 border border-black/20 rounded-sm"></div>
                    <div className="w-3 h-3 border border-black/20 rounded-sm"></div>
                    <div className="w-3 h-3 border border-black/20 rounded-sm"></div>
                    <div className="w-3 h-3 border border-black/20 rounded-sm"></div>
                 </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="text-white text-2xl font-bold tracking-[0.15em] drop-shadow-md">
                {cardData.number || '0000 0000 0000 0000'}
              </div>

              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Titular</span>
                  <span className="text-white font-bold tracking-wider truncate max-w-[200px]">{cardData.name || 'CARREGANDO...'}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Validade</span>
                  <span className="text-white font-bold">{cardData.validity || '00/00'}</span>
                </div>
              </div>
            </div>
            
            {/* Efeito Tech Overlay */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none rounded-[1.5rem]"></div>
          </div>

          {/* VERSO DO CARTÃO */}
          <div className="card-face card-back bg-[#1a1a1a] flex flex-col shadow-2xl overflow-hidden border border-white/5">
            <div className="w-full h-12 bg-[#000000] mt-6"></div>
            
            <div className="px-8 pt-6 flex-1 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 h-10 bg-gray-200/90 rounded-md flex items-center justify-end px-4 text-gray-800 font-black italic text-sm tracking-widest">
                  {cardData.cvv}
                </div>
                <div className="w-12 h-8 bg-gray-800 rounded flex items-center justify-center">
                    <i className="fas fa-shield-halved text-gray-500 text-xs"></i>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex flex-col">
                    <span className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em]">Nome Completo</span>
                    <span className="text-white text-xs font-bold uppercase truncate">{cardData.name}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="flex flex-col">
                        <span className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em]">Matrícula ID</span>
                        <span className="text-[#7A5CFA] text-xs font-black">{userId}</span>
                   </div>
                   <div className="flex flex-col text-right">
                        <span className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em]">Tipo de Conta</span>
                        <span className="text-white text-[10px] font-black italic uppercase">Black Premium</span>
                   </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                   <div className="flex flex-col">
                        <span className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em]">Saldo Disponível</span>
                        <span className={`text-2xl font-black ${cardData.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          R$ {cardData.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                   </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-black/40 text-[8px] text-gray-600 font-bold uppercase tracking-widest flex justify-between">
              <span>Banco INOVAFINANCE S.A.</span>
              <span className="text-white/20 tracking-tighter">FUTURE TECH INC.</span>
            </div>
          </div>

        </div>
      </div>

      <div className="mt-12 max-w-sm text-center px-4">
        <div className="bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-lg">
           <i className="fas fa-gem text-[#7A5CFA] text-2xl mb-3"></i>
           <h4 className="font-black text-gray-800 text-sm">BENEFÍCIOS EXCLUSIVOS</h4>
           <p className="text-gray-500 text-[11px] font-medium leading-relaxed mt-2">
             Acesso a salas VIP, Cashback de 2.5% em todas as compras e suporte prioritário com IA em tempo real.
           </p>
        </div>
      </div>
    </div>
  );
};

export default CardPage;
