import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  History, 
  Users, 
  DollarSign, 
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  UserPlus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AffiliateHistoryProps {
  userId: number;
}

interface Invite {
  id: string;
  invited_matricula: number;
  status: string;
  created_at: string;
  invited_user: {
    full_name: string | null;
    matricula: number;
  } | null;
}

interface Commission {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  released_at: string | null;
  invited_matricula: number;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
  pix_key: string | null;
}

type TabType = 'invites' | 'commissions' | 'withdrawals';

const statusConfig = {
  pending: { label: 'Pendente', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  review: { label: 'Em Análise', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  approved: { label: 'Aprovado', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  rejected: { label: 'Rejeitado', icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  released: { label: 'Liberado', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  locked: { label: 'Bloqueado', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
};

export function AffiliateHistory({ userId }: AffiliateHistoryProps) {
  const [activeTab, setActiveTab] = useState<TabType>('invites');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [invitesRes, commissionsRes, withdrawalsRes] = await Promise.all([
        supabase
          .from('affiliate_invites')
          .select(`
            id,
            invited_matricula,
            status,
            created_at,
            invited_user:users_matricula!invited_matricula(full_name, matricula)
          `)
          .eq('inviter_matricula', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('affiliate_commissions')
          .select('*')
          .eq('affiliate_matricula', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('affiliate_withdrawals')
          .select('*')
          .eq('affiliate_matricula', userId)
          .order('requested_at', { ascending: false }),
      ]);

      if (invitesRes.error) throw invitesRes.error;
      if (commissionsRes.error) throw commissionsRes.error;
      if (withdrawalsRes.error) throw withdrawalsRes.error;

      setInvites((invitesRes.data || []) as Invite[]);
      setCommissions((commissionsRes.data || []) as Commission[]);
      setWithdrawals((withdrawalsRes.data || []) as Withdrawal[]);
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const tabs: { id: TabType; label: string; icon: any; count: number }[] = [
    { id: 'invites', label: 'Indicados', icon: Users, count: invites.length },
    { id: 'commissions', label: 'Comissões', icon: DollarSign, count: commissions.length },
    { id: 'withdrawals', label: 'Saques', icon: Send, count: withdrawals.length },
  ];

  const renderInvites = () => (
    <div className="space-y-3">
      {invites.length === 0 ? (
        <div className="text-center py-12">
          <UserPlus className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Nenhuma indicação ainda</p>
          <p className="text-gray-500 text-sm">Compartilhe seu link para começar a ganhar!</p>
        </div>
      ) : (
        invites.map((invite) => {
          const config = statusConfig[invite.status as keyof typeof statusConfig] || statusConfig.pending;
          const Icon = config.icon;
          return (
            <motion.div
              key={invite.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", config.bg)}>
                    <Icon className={cn("w-5 h-5", config.color)} />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {invite.invited_user?.full_name || `Matrícula ${invite.invited_matricula}`}
                    </p>
                    <p className="text-gray-500 text-xs">{formatDate(invite.created_at)}</p>
                  </div>
                </div>
                <div className={cn("px-3 py-1 rounded-full text-xs font-semibold", config.bg, config.color)}>
                  {config.label}
                </div>
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );

  const renderCommissions = () => (
    <div className="space-y-3">
      {commissions.length === 0 ? (
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Nenhuma comissão ainda</p>
          <p className="text-gray-500 text-sm">Suas comissões aparecerão aqui quando forem geradas</p>
        </div>
      ) : (
        commissions.map((commission) => {
          const config = statusConfig[commission.status as keyof typeof statusConfig] || statusConfig.pending;
          const Icon = config.icon;
          return (
            <motion.div
              key={commission.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", config.bg)}>
                    <Icon className={cn("w-5 h-5", config.color)} />
                  </div>
                  <div>
                    <p className="text-emerald-400 font-bold text-lg">{formatCurrency(commission.amount)}</p>
                    <p className="text-gray-500 text-xs">
                      {commission.released_at ? formatDate(commission.released_at) : formatDate(commission.created_at)}
                    </p>
                  </div>
                </div>
                <div className={cn("px-3 py-1 rounded-full text-xs font-semibold", config.bg, config.color)}>
                  {config.label}
                </div>
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );

  const renderWithdrawals = () => (
    <div className="space-y-3">
      {withdrawals.length === 0 ? (
        <div className="text-center py-12">
          <Send className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Nenhum saque solicitado</p>
          <p className="text-gray-500 text-sm">Seus saques aparecerão aqui</p>
        </div>
      ) : (
        withdrawals.map((withdrawal) => {
          const config = statusConfig[withdrawal.status as keyof typeof statusConfig] || statusConfig.pending;
          const Icon = config.icon;
          return (
            <motion.div
              key={withdrawal.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", config.bg)}>
                    <Icon className={cn("w-5 h-5", config.color)} />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">{formatCurrency(withdrawal.amount)}</p>
                    <p className="text-gray-500 text-xs">
                      PIX: {withdrawal.pix_key?.substring(0, 10)}... • {formatDate(withdrawal.requested_at)}
                    </p>
                  </div>
                </div>
                <div className={cn("px-3 py-1 rounded-full text-xs font-semibold", config.bg, config.color)}>
                  {config.label}
                </div>
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Histórico</h1>
        <p className="text-gray-400">Acompanhe todas as suas indicações, comissões e saques</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap",
                isActive 
                  ? "bg-emerald-500 text-white" 
                  : "bg-[#222222] text-gray-400 hover:bg-gray-800"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs",
                isActive ? "bg-white/20" : "bg-gray-700"
              )}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-[#222222] rounded-2xl p-6 border border-gray-800 shadow-xl min-h-[400px]"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            {activeTab === 'invites' && renderInvites()}
            {activeTab === 'commissions' && renderCommissions()}
            {activeTab === 'withdrawals' && renderWithdrawals()}
          </>
        )}
      </motion.div>
    </div>
  );
}
