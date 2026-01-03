
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navItems = [
    { path: '/', label: 'Visão Geral', icon: 'fa-chart-pie' },
    { path: '/transactions', label: 'Movimentações', icon: 'fa-exchange-alt' },
    { path: '/card', label: 'Cartão Black', icon: 'fa-credit-card' },
    { path: '/ai', label: 'AI Voice', icon: 'fa-robot' },
    { path: '/goals', label: 'Metas', icon: 'fa-bullseye' },
    { path: '/profile', label: 'Perfil', icon: 'fa-user' },
  ];

  return (
    <aside className="w-64 h-full bg-slate-900/40 backdrop-blur-md border-r border-white/10 p-6 flex flex-col gap-8">
      <div className="py-4">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-4 mb-6">Módulos</div>
        <nav className="flex flex-col gap-3">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-4 rounded-2xl transition-all duration-500 group relative overflow-hidden
                ${isActive 
                  ? 'bg-gradient-to-r from-[#7A5CFA] to-[#4A90FF] text-white shadow-lg shadow-[#7A5CFA]/20' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <i className={`fas ${item.icon} text-lg transition-transform group-hover:scale-110`}></i>
              <span className="font-bold tracking-tight">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      
      <div className="mt-auto p-4 bg-white/5 rounded-2xl border border-white/5">
        <p className="text-[9px] font-black text-[#4A90FF] uppercase tracking-widest mb-1">Status do Sistema</p>
        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
           <span className="text-[10px] text-slate-300 font-bold uppercase">
             {isOnline ? 'IA Online & Sincronizada' : 'Modo Offline Ativo'}
           </span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
