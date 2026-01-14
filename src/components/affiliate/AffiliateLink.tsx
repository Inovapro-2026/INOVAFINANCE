import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Link2, 
  Copy, 
  Check, 
  Share2, 
  MessageCircle,
  Send,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AffiliateLinkProps {
  userId: number;
}

export function AffiliateLink({ userId }: AffiliateLinkProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const affiliateCode = `INV-${userId}`;
  const affiliateLink = `https://inovafinance.app/subscribe?ref=${userId}`;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(affiliateCode);
      setCopiedCode(true);
      toast.success('Código copiado!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error('Erro ao copiar código');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(affiliateLink);
      setCopiedLink(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Erro ao copiar link');
    }
  };

  const shareWhatsApp = () => {
    const message = `🚀 Conheça o INOVAFINANCE - seu gestor financeiro inteligente!\n\nUse meu link e ganhe desconto na assinatura:\n${affiliateLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareTelegram = () => {
    const message = `🚀 Conheça o INOVAFINANCE - seu gestor financeiro inteligente!`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(affiliateLink)}&text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareGeneric = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'INOVAFINANCE - Indique e Ganhe',
          text: 'Conheça o INOVAFINANCE - seu gestor financeiro inteligente!',
          url: affiliateLink,
        });
      } catch {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Meu Link de Divulgação</h1>
        <p className="text-gray-400">Compartilhe seu link exclusivo e ganhe comissões por cada assinatura</p>
      </div>

      {/* Commission Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 rounded-2xl p-6 border border-emerald-500/30"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Comissão de 50%</h3>
            <p className="text-gray-300 text-sm">
              Todas as assinaturas feitas através do seu link geram automaticamente 50% de comissão para você!
            </p>
          </div>
        </div>
      </motion.div>

      {/* Affiliate Code */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#222222] rounded-2xl p-6 border border-gray-800 shadow-xl"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <span className="text-blue-500 font-bold">1</span>
          </div>
          <h2 className="text-lg font-bold text-white">Seu Código de Afiliado</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-xl px-6 py-4">
            <p className="text-3xl font-bold text-emerald-500 tracking-widest text-center">
              {affiliateCode}
            </p>
          </div>
          <Button
            onClick={copyCode}
            size="lg"
            className="h-16 w-16 bg-emerald-500 hover:bg-emerald-600"
          >
            {copiedCode ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
          </Button>
        </div>
      </motion.div>

      {/* Affiliate Link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#222222] rounded-2xl p-6 border border-gray-800 shadow-xl"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <span className="text-purple-500 font-bold">2</span>
          </div>
          <h2 className="text-lg font-bold text-white">Seu Link Exclusivo</h2>
        </div>
        
        <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-4 mb-4">
          <p className="text-sm font-mono text-emerald-400 break-all">
            {affiliateLink}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button
            onClick={copyLink}
            variant="outline"
            className="border-gray-700 hover:border-emerald-500 hover:bg-emerald-500/10"
          >
            {copiedLink ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            Copiar
          </Button>
          <Button
            onClick={shareWhatsApp}
            className="bg-green-600 hover:bg-green-700"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>
          <Button
            onClick={shareTelegram}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Send className="w-4 h-4 mr-2" />
            Telegram
          </Button>
          <Button
            onClick={shareGeneric}
            variant="outline"
            className="border-gray-700 hover:border-purple-500 hover:bg-purple-500/10"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Mais
          </Button>
        </div>
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#222222] rounded-2xl p-6 border border-gray-800 shadow-xl"
      >
        <h2 className="text-lg font-bold text-white mb-4">💡 Dicas para Aumentar suas Vendas</h2>
        <ul className="space-y-3 text-gray-300 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-emerald-500">•</span>
            Compartilhe seu link em grupos de finanças e investimentos
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500">•</span>
            Mostre os benefícios do INOVAFINANCE para amigos e família
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500">•</span>
            Use as redes sociais para ampliar seu alcance
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500">•</span>
            Destaque a IA financeira exclusiva e o controle completo de gastos
          </li>
        </ul>
      </motion.div>
    </div>
  );
}
