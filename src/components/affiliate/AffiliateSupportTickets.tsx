import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Plus, 
  Send, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AffiliateSupportTicketsProps {
  userId: number;
}

interface Ticket {
  id: string;
  ticket_number: number;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  last_message_at: string | null;
}

interface Message {
  id: string;
  message: string;
  sender_type: string;
  created_at: string;
}

const statusConfig = {
  open: { label: 'Aberto', icon: AlertCircle, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  in_progress: { label: 'Em andamento', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  closed: { label: 'Finalizado', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
};

export function AffiliateSupportTickets({ userId }: AffiliateSupportTicketsProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // New ticket form
  const [newSubject, setNewSubject] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadTickets();
  }, [userId]);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_matricula', userId)
        .eq('category', 'affiliate')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets((data || []) as Ticket[]);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Erro ao carregar tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (ticketId: string) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as Message[]);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSelectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    await loadMessages(ticket.id);
  };

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newContent.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsCreating(true);
    try {
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_matricula: userId,
          subject: newSubject.trim(),
          category: 'affiliate',
          status: 'open',
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      const { error: messageError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticket.id,
          message: newContent.trim(),
          sender_type: 'user',
          sender_matricula: userId,
        });

      if (messageError) throw messageError;

      toast.success('Ticket criado com sucesso!');
      setShowNewTicket(false);
      setNewSubject('');
      setNewContent('');
      await loadTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Erro ao criar ticket');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          message: newMessage.trim(),
          sender_type: 'user',
          sender_matricula: userId,
        });

      if (error) throw error;

      await supabase
        .from('support_tickets')
        .update({ 
          last_message_at: new Date().toISOString(),
          last_message_by: 'user',
        })
        .eq('id', selectedTicket.id);

      setNewMessage('');
      await loadMessages(selectedTicket.id);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (selectedTicket) {
    const config = statusConfig[selectedTicket.status as keyof typeof statusConfig] || statusConfig.open;
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setSelectedTicket(null)}
            className="text-gray-400 hover:text-white"
          >
            ← Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">#{selectedTicket.ticket_number}</h1>
            <p className="text-gray-400 text-sm">{selectedTicket.subject}</p>
          </div>
          <div className={cn("px-3 py-1 rounded-full text-xs font-semibold", config.bg, config.color)}>
            {config.label}
          </div>
        </div>

        {/* Messages */}
        <div className="bg-[#222222] rounded-2xl border border-gray-800 shadow-xl overflow-hidden">
          <div className="h-[400px] overflow-y-auto p-4 space-y-4">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[80%] p-4 rounded-2xl",
                    msg.sender_type === 'user'
                      ? "ml-auto bg-emerald-500/20 text-white"
                      : "mr-auto bg-[#1a1a1a] text-gray-300"
                  )}
                >
                  <p className="text-sm">{msg.message}</p>
                  <p className="text-xs text-gray-500 mt-2">{formatDate(msg.created_at)}</p>
                </div>
              ))
            )}
          </div>

          {/* Message Input */}
          {selectedTicket.status !== 'closed' && (
            <div className="p-4 border-t border-gray-800">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="bg-[#1a1a1a] border-gray-700 text-white"
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isSending || !newMessage.trim()}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Suporte</h1>
          <p className="text-gray-400">Tire suas dúvidas com nossa equipe</p>
        </div>
        <Button
          onClick={() => setShowNewTicket(true)}
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Ticket
        </Button>
      </div>

      {/* Tickets List */}
      <div className="bg-[#222222] rounded-2xl p-6 border border-gray-800 shadow-xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Nenhum ticket aberto</p>
            <p className="text-gray-500 text-sm">Clique em "Novo Ticket" para criar um</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => {
              const config = statusConfig[ticket.status as keyof typeof statusConfig] || statusConfig.open;
              const Icon = config.icon;
              return (
                <motion.button
                  key={ticket.id}
                  onClick={() => handleSelectTicket(ticket)}
                  className="w-full bg-[#1a1a1a] rounded-xl p-4 border border-gray-800 hover:border-emerald-500/50 transition-colors text-left"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", config.bg)}>
                        <Icon className={cn("w-5 h-5", config.color)} />
                      </div>
                      <div>
                        <p className="text-white font-medium">#{ticket.ticket_number} - {ticket.subject}</p>
                        <p className="text-gray-500 text-xs">{formatDate(ticket.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn("px-3 py-1 rounded-full text-xs font-semibold", config.bg, config.color)}>
                        {config.label}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      <AnimatePresence>
        {showNewTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowNewTicket(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg bg-[#1a1a1a] rounded-2xl border border-gray-800 shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Novo Ticket</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowNewTicket(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </Button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Assunto</Label>
                  <Input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Qual é o assunto?"
                    className="bg-[#222222] border-gray-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Mensagem</Label>
                  <Textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Descreva sua dúvida ou problema..."
                    className="bg-[#222222] border-gray-700 text-white min-h-[120px]"
                  />
                </div>

                <Button
                  onClick={handleCreateTicket}
                  disabled={isCreating || !newSubject.trim() || !newContent.trim()}
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Ticket
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
