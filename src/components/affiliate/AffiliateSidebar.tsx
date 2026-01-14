import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Link2, 
  Wallet, 
  Send, 
  History, 
  MessageCircle,
  LogOut,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { AffiliateView } from '@/pages/AffiliatePanel';

interface AffiliateSidebarProps {
  currentView: AffiliateView;
  onViewChange: (view: AffiliateView) => void;
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

const menuItems: { id: AffiliateView; label: string; icon: any }[] = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'link', label: 'Meu Link', icon: Link2 },
  { id: 'balance', label: 'Saldo & Comissões', icon: Wallet },
  { id: 'withdraw', label: 'Solicitar Saque', icon: Send },
  { id: 'history', label: 'Histórico', icon: History },
  { id: 'support', label: 'Suporte', icon: MessageCircle },
];

export function AffiliateSidebar({ currentView, onViewChange, isOpen, onClose, userName }: AffiliateSidebarProps) {
  const navigate = useNavigate();

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: isOpen ? 0 : -280 }}
      className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-[#121212] border-r border-gray-800 flex flex-col",
        "lg:translate-x-0 lg:static lg:z-auto"
      )}
      style={{ transform: isOpen ? 'translateX(0)' : undefined }}
    >
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">
          <span className="text-emerald-500">INOVA</span>FINANCE
        </h1>
        <p className="text-xs text-gray-500 mt-1">Painel de Afiliados</p>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <User className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white truncate max-w-[140px]">{userName}</p>
            <p className="text-xs text-gray-500">Afiliado Ativo</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                    "text-sm font-medium",
                    isActive 
                      ? "bg-emerald-500/20 text-emerald-500 shadow-lg shadow-emerald-500/10" 
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all text-sm font-medium"
        >
          <LogOut size={20} />
          <span>Voltar ao App</span>
        </button>
      </div>
    </motion.aside>
  );
}
