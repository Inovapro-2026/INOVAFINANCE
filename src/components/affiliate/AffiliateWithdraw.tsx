import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Send, 
  Wallet, 
  AlertCircle,
  Loader2,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AffiliateWithdrawProps {
  userId: number;
  availableBalance: number;
  onSuccess: () => void;
}

const MIN_WITHDRAWAL = 40;

type PixKeyType = 'cpf' | 'email' | 'phone' | 'random';

export function AffiliateWithdraw({ userId, availableBalance, onSuccess }: AffiliateWithdrawProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>('cpf');

  const canWithdraw = availableBalance >= MIN_WITHDRAWAL;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleSubmit = async () => {
    if (!pixKey.trim()) {
      toast.error('Digite sua chave PIX');
      return;
    }

    if (!canWithdraw) {
      toast.error(`Saldo mínimo para saque é ${formatCurrency(MIN_WITHDRAWAL)}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: withdrawal, error } = await supabase
        .from('affiliate_withdrawals')
        .insert({
          affiliate_matricula: userId,
          amount: availableBalance,
          pix_key: pixKey.trim(),
          pix_key_type: pixKeyType,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      toast.info('Processando seu saque via PIX...');
      
      try {
        const response = await fetch(`https://pahvovxnhqsmcnqncmys.supabase.co/functions/v1/process-affiliate-withdrawal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ withdrawalId: withdrawal.id }),
        });

        const result = await response.json();
        
        if (result.success) {
          toast.success('🎉 Saque processado! PIX enviado para sua conta.');
        } else {
          toast.info('Saque registrado. Será processado em breve pelo administrador.');
        }
      } catch {
        toast.info('Saque registrado. Será processado manualmente.');
      }

      setPixKey('');
      onSuccess();
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      toast.error('Erro ao solicitar saque');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pixKeyTypes: { id: PixKeyType; label: string }[] = [
    { id: 'cpf', label: 'CPF' },
    { id: 'email', label: 'E-mail' },
    { id: 'phone', label: 'Celular' },
    { id: 'random', label: 'Aleatória' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Solicitar Saque</h1>
        <p className="text-gray-400">Receba suas comissões diretamente via PIX</p>
      </div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl p-8 border border-emerald-500/30"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-gray-300 text-sm">Saldo Disponível para Saque</p>
            <p className="text-4xl font-bold text-emerald-400">{formatCurrency(availableBalance)}</p>
          </div>
        </div>
        
        {!canWithdraw && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-amber-400 text-sm">
              Você precisa de mais {formatCurrency(MIN_WITHDRAWAL - availableBalance)} para solicitar saque
            </p>
          </div>
        )}
      </motion.div>

      {/* Withdrawal Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#222222] rounded-2xl p-6 border border-gray-800 shadow-xl"
      >
        <h2 className="text-lg font-bold text-white mb-6">Dados para Saque</h2>

        <div className="space-y-6">
          {/* PIX Key Type */}
          <div className="space-y-2">
            <Label className="text-gray-300">Tipo de Chave PIX</Label>
            <div className="grid grid-cols-4 gap-2">
              {pixKeyTypes.map((type) => (
                <Button
                  key={type.id}
                  variant={pixKeyType === type.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPixKeyType(type.id)}
                  className={
                    pixKeyType === type.id 
                      ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500' 
                      : 'border-gray-700 text-gray-400 hover:border-emerald-500/50'
                  }
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {/* PIX Key Input */}
          <div className="space-y-2">
            <Label className="text-gray-300">Chave PIX</Label>
            <Input
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder={
                pixKeyType === 'cpf' ? '000.000.000-00' :
                pixKeyType === 'email' ? 'seu@email.com' :
                pixKeyType === 'phone' ? '(00) 00000-0000' :
                'Chave aleatória'
              }
              className="bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 h-12"
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!canWithdraw || isSubmitting || !pixKey.trim()}
            className="w-full h-14 text-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Solicitar Saque de {formatCurrency(availableBalance)}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-gray-500">
            O saque será processado em até 48 horas úteis após aprovação do administrador.
          </p>
        </div>
      </motion.div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#222222] rounded-2xl p-6 border border-gray-800 shadow-xl"
      >
        <h2 className="text-lg font-bold text-white mb-4">ℹ️ Informações Importantes</h2>
        <ul className="space-y-3 text-gray-400 text-sm">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Valor mínimo para saque: <strong className="text-white">{formatCurrency(MIN_WITHDRAWAL)}</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>O saldo fica bloqueado até a aprovação do saque</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Após aprovação, o PIX é enviado instantaneamente</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Você pode acompanhar o status do saque no histórico</span>
          </li>
        </ul>
      </motion.div>
    </div>
  );
}
