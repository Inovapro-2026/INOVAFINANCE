import { motion } from 'framer-motion';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight
} from 'lucide-react';
import type { AffiliateData, AffiliateView } from '@/pages/AffiliatePanel';

interface AffiliateOverviewProps {
  data: AffiliateData;
  onNavigate: (view: AffiliateView) => void;
}

export function AffiliateOverview({ data, onNavigate }: AffiliateOverviewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const mainCards = [
    {
      title: 'Total de Indicados',
      value: data.totalInvites.toString(),
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-500',
    },
    {
      title: 'Total Faturado',
      value: formatCurrency(data.totalRevenue),
      icon: TrendingUp,
      color: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-500',
    },
    {
      title: 'Comissão Acumulada',
      value: formatCurrency(data.totalCommission),
      icon: DollarSign,
      color: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-500',
    },
    {
      title: 'Saldo Disponível',
      value: formatCurrency(data.availableBalance),
      icon: Wallet,
      color: 'from-amber-500 to-amber-600',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-500',
      action: () => onNavigate('withdraw'),
    },
  ];

  const statusCards = [
    {
      label: 'Pendentes',
      value: data.pendingInvites,
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Aprovados',
      value: data.approvedInvites,
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Rejeitados',
      value: data.rejectedInvites,
      icon: XCircle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Visão Geral</h1>
        <p className="text-gray-400">Acompanhe seu desempenho como afiliado INOVAFINANCE</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mainCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={card.action}
              className={`bg-[#222222] rounded-2xl p-6 border border-gray-800 shadow-xl ${card.action ? 'cursor-pointer hover:border-emerald-500/50 transition-colors' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium mb-2">{card.title}</p>
                  <p className="text-3xl font-bold text-white">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
              </div>
              {card.action && (
                <div className="mt-4 flex items-center text-emerald-500 text-sm font-medium">
                  <span>Solicitar saque</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Status Breakdown */}
      <div className="bg-[#222222] rounded-2xl p-6 border border-gray-800 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4">Status das Indicações</h2>
        <div className="grid grid-cols-3 gap-4">
          {statusCards.map((status, index) => {
            const Icon = status.icon;
            return (
              <motion.div
                key={status.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className={`${status.bg} rounded-xl p-4 text-center`}
              >
                <Icon className={`w-8 h-8 ${status.color} mx-auto mb-2`} />
                <p className={`text-2xl font-bold ${status.color}`}>{status.value}</p>
                <p className="text-gray-400 text-sm">{status.label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#222222] rounded-2xl p-6 border border-gray-800 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate('link')}
            className="flex items-center gap-3 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
          >
            <TrendingUp className="w-5 h-5" />
            <span className="font-medium">Ver Meu Link de Divulgação</span>
          </button>
          <button
            onClick={() => onNavigate('history')}
            className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-500 hover:bg-blue-500/20 transition-colors"
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Ver Histórico Completo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
