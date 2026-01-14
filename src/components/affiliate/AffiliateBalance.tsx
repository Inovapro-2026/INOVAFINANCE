import { motion } from 'framer-motion';
import { 
  Wallet, 
  Clock, 
  CheckCircle2, 
  DollarSign,
  TrendingUp,
  Info
} from 'lucide-react';
import type { AffiliateData } from '@/pages/AffiliatePanel';

interface AffiliateBalanceProps {
  data: AffiliateData;
}

export function AffiliateBalance({ data }: AffiliateBalanceProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Saldo & Comissões</h1>
        <p className="text-gray-400">Acompanhe seus ganhos e saldo disponível</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#222222] rounded-2xl p-6 border border-gray-800 shadow-xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-emerald-500" />
            </div>
            <span className="text-gray-400 text-sm">Saldo Total</span>
          </div>
          <p className="text-3xl font-bold text-emerald-500">{formatCurrency(data.totalCommission)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#222222] rounded-2xl p-6 border border-gray-800 shadow-xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-blue-500" />
            </div>
            <span className="text-gray-400 text-sm">Disponível para Saque</span>
          </div>
          <p className="text-3xl font-bold text-blue-500">{formatCurrency(data.availableBalance)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#222222] rounded-2xl p-6 border border-gray-800 shadow-xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <span className="text-gray-400 text-sm">Saldo Pendente</span>
          </div>
          <p className="text-3xl font-bold text-amber-500">{formatCurrency(data.pendingBalance)}</p>
        </motion.div>
      </div>

      {/* Minimum Withdrawal Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6"
      >
        <div className="flex items-start gap-4">
          <Info className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-white font-semibold mb-1">Valor Mínimo para Saque</h3>
            <p className="text-gray-300 text-sm">
              O valor mínimo para solicitar saque é <span className="text-blue-400 font-bold">R$ 40,00</span>. 
              Continue indicando para alcançar este valor!
            </p>
          </div>
        </div>
      </motion.div>

      {/* Commission Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-[#222222] rounded-2xl p-6 border border-gray-800 shadow-xl"
      >
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-500" />
          Como Funciona a Comissão
        </h2>

        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-[#1a1a1a] rounded-xl">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-emerald-500 font-bold">1</span>
            </div>
            <div>
              <h4 className="text-white font-semibold">Comissão de 50%</h4>
              <p className="text-gray-400 text-sm">Você recebe 50% do valor de cada assinatura confirmada através do seu link.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-[#1a1a1a] rounded-xl">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-500 font-bold">2</span>
            </div>
            <div>
              <h4 className="text-white font-semibold">Liberação Automática</h4>
              <p className="text-gray-400 text-sm">A comissão é calculada e liberada automaticamente após o pagamento PIX ser confirmado.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-[#1a1a1a] rounded-xl">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-amber-500 font-bold">3</span>
            </div>
            <div>
              <h4 className="text-white font-semibold">Saque via PIX</h4>
              <p className="text-gray-400 text-sm">Ao atingir R$ 40,00, você pode solicitar saque para qualquer chave PIX.</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-2xl p-6 border border-emerald-500/20"
      >
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-6 h-6 text-emerald-500" />
          <h3 className="text-lg font-bold text-white">Resumo de Performance</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{data.totalInvites}</p>
            <p className="text-gray-400 text-sm">Indicados</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-500">{data.approvedInvites}</p>
            <p className="text-gray-400 text-sm">Aprovados</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-500">{data.pendingInvites}</p>
            <p className="text-gray-400 text-sm">Pendentes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-500">{formatCurrency(data.totalRevenue)}</p>
            <p className="text-gray-400 text-sm">Faturado</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
