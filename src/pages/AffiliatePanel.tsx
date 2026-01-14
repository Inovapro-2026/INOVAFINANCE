import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AffiliateSidebar } from '@/components/affiliate/AffiliateSidebar';
import { AffiliateOverview } from '@/components/affiliate/AffiliateOverview';
import { AffiliateLink } from '@/components/affiliate/AffiliateLink';
import { AffiliateBalance } from '@/components/affiliate/AffiliateBalance';
import { AffiliateWithdraw } from '@/components/affiliate/AffiliateWithdraw';
import { AffiliateHistory } from '@/components/affiliate/AffiliateHistory';
import { AffiliateSupportTickets } from '@/components/affiliate/AffiliateSupportTickets';
import { Loader2, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type AffiliateView = 'overview' | 'link' | 'balance' | 'withdraw' | 'history' | 'support';

export interface AffiliateData {
  totalInvites: number;
  pendingInvites: number;
  approvedInvites: number;
  rejectedInvites: number;
  totalRevenue: number;
  totalCommission: number;
  availableBalance: number;
  pendingBalance: number;
}

export default function AffiliatePanel() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<AffiliateView>('overview');
  const [isAffiliate, setIsAffiliate] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [affiliateData, setAffiliateData] = useState<AffiliateData>({
    totalInvites: 0,
    pendingInvites: 0,
    approvedInvites: 0,
    rejectedInvites: 0,
    totalRevenue: 0,
    totalCommission: 0,
    availableBalance: 0,
    pendingBalance: 0,
  });

  useEffect(() => {
    if (!authLoading) {
      checkAffiliateAccess();
    }
  }, [authLoading, user]);

  const checkAffiliateAccess = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users_matricula')
        .select('is_affiliate, affiliate_balance')
        .eq('matricula', user.userId)
        .single();

      if (error) throw error;

      if (!data?.is_affiliate) {
        toast.error('Sua conta não possui acesso ao painel de afiliados.');
        navigate('/');
        return;
      }

      setIsAffiliate(true);
      await loadAffiliateData();
    } catch (error) {
      console.error('Error checking affiliate access:', error);
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAffiliateData = async () => {
    if (!user) return;

    try {
      // Fetch invites
      const { data: invites, error: invitesError } = await supabase
        .from('affiliate_invites')
        .select('status')
        .eq('inviter_matricula', user.userId);

      if (invitesError) throw invitesError;

      // Fetch commissions
      const { data: commissions, error: commissionsError } = await supabase
        .from('affiliate_commissions')
        .select('amount, status')
        .eq('affiliate_matricula', user.userId);

      if (commissionsError) throw commissionsError;

      // Fetch pending withdrawals
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('affiliate_withdrawals')
        .select('amount, status')
        .eq('affiliate_matricula', user.userId)
        .eq('status', 'pending');

      if (withdrawalsError) throw withdrawalsError;

      // Fetch affiliate balance from user
      const { data: userData, error: userError } = await supabase
        .from('users_matricula')
        .select('affiliate_balance')
        .eq('matricula', user.userId)
        .single();

      if (userError) throw userError;

      const pending = invites?.filter(i => i.status === 'pending').length || 0;
      const approved = invites?.filter(i => i.status === 'approved').length || 0;
      const rejected = invites?.filter(i => i.status === 'rejected').length || 0;
      
      const totalCommission = commissions?.reduce((acc, c) => acc + Number(c.amount), 0) || 0;
      const releasedCommission = commissions
        ?.filter(c => c.status === 'released')
        .reduce((acc, c) => acc + Number(c.amount), 0) || 0;
      
      const pendingWithdrawals = withdrawals?.reduce((acc, w) => acc + Number(w.amount), 0) || 0;
      const availableBalance = (userData?.affiliate_balance || 0) - pendingWithdrawals;

      // Calculate total revenue (commission / 0.5 = original subscription value)
      const totalRevenue = totalCommission / 0.5;

      setAffiliateData({
        totalInvites: invites?.length || 0,
        pendingInvites: pending,
        approvedInvites: approved,
        rejectedInvites: rejected,
        totalRevenue,
        totalCommission,
        availableBalance: Math.max(0, availableBalance),
        pendingBalance: pendingWithdrawals,
      });
    } catch (error) {
      console.error('Error loading affiliate data:', error);
      toast.error('Erro ao carregar dados do afiliado');
    }
  };

  const handleViewChange = (view: AffiliateView) => {
    setCurrentView(view);
    setSidebarOpen(false);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!isAffiliate) {
    return null;
  }

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <AffiliateOverview data={affiliateData} onNavigate={handleViewChange} />;
      case 'link':
        return <AffiliateLink userId={user?.userId || 0} />;
      case 'balance':
        return <AffiliateBalance data={affiliateData} />;
      case 'withdraw':
        return <AffiliateWithdraw userId={user?.userId || 0} availableBalance={affiliateData.availableBalance} onSuccess={loadAffiliateData} />;
      case 'history':
        return <AffiliateHistory userId={user?.userId || 0} />;
      case 'support':
        return <AffiliateSupportTickets userId={user?.userId || 0} />;
      default:
        return <AffiliateOverview data={affiliateData} onNavigate={handleViewChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#1a1a1a] border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-white hover:bg-gray-800"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
        <h1 className="text-lg font-bold text-white">Painel de Afiliados</h1>
        <div className="w-10" />
      </div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AffiliateSidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={user?.fullName || 'Afiliado'}
      />

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
