import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Bell, 
  Plus, 
  Trash2, 
  Edit2, 
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  Eye,
  EyeOff,
  Calendar,
  Users
} from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_active: boolean;
  show_popup: boolean;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
  read_count?: number;
}

const typeConfig = {
  info: { label: 'Informação', icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  warning: { label: 'Aviso', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  success: { label: 'Sucesso', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  error: { label: 'Urgente', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
};

export function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<'info' | 'warning' | 'success' | 'error'>('info');
  const [showPopup, setShowPopup] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  
  const { toast } = useToast();

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get read counts for each announcement
      const announcementsWithCounts = await Promise.all(
        (data || []).map(async (ann) => {
          const { count } = await supabase
            .from('announcement_reads')
            .select('*', { count: 'exact', head: true })
            .eq('announcement_id', ann.id);
          return { ...ann, read_count: count || 0 };
        })
      );

      setAnnouncements(announcementsWithCounts as Announcement[]);
    } catch (error) {
      console.error('Error loading announcements:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os avisos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setType('info');
    setShowPopup(true);
    setExpiresAt("");
    setEditingAnnouncement(null);
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setTitle(announcement.title);
    setMessage(announcement.message);
    setType(announcement.type);
    setShowPopup(announcement.show_popup);
    setExpiresAt(announcement.expires_at ? announcement.expires_at.split('T')[0] : "");
    setShowModal(true);
  };

  const saveAnnouncement = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha título e mensagem",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const announcementData = {
        title: title.trim(),
        message: message.trim(),
        type,
        show_popup: showPopup,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        is_active: true,
        created_by: 'admin'
      };

      if (editingAnnouncement) {
        const { error } = await supabase
          .from('admin_announcements')
          .update(announcementData)
          .eq('id', editingAnnouncement.id);

        if (error) throw error;
        toast({ title: "Aviso atualizado!" });
      } else {
        const { error } = await supabase
          .from('admin_announcements')
          .insert(announcementData);

        if (error) throw error;
        toast({ title: "Aviso enviado para todos os usuários!" });
      }

      setShowModal(false);
      resetForm();
      loadAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o aviso",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_announcements')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: isActive ? "Aviso desativado" : "Aviso ativado" });
      loadAnnouncements();
    } catch (error) {
      console.error('Error toggling announcement:', error);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este aviso?')) return;

    try {
      const { error } = await supabase
        .from('admin_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "Aviso excluído" });
      loadAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Stats
  const activeCount = announcements.filter(a => a.is_active).length;
  const totalReads = announcements.reduce((acc, a) => acc + (a.read_count || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Avisos e Notificações
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Envie avisos que aparecem para todos os usuários
          </p>
        </div>
        <Button onClick={openNewModal} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Aviso
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Total de Avisos</p>
            <p className="text-2xl font-bold text-blue-400">{announcements.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Avisos Ativos</p>
            <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Total de Visualizações</p>
            <p className="text-2xl font-bold text-purple-400">{totalReads}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Com Popup</p>
            <p className="text-2xl font-bold text-amber-400">
              {announcements.filter(a => a.show_popup && a.is_active).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        <AnimatePresence>
          {announcements.map((announcement, index) => {
            const config = typeConfig[announcement.type] || typeConfig.info;
            const IconComponent = config.icon;
            const isExpired = announcement.expires_at && new Date(announcement.expires_at) < new Date();

            return (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className={`border-slate-700 transition-colors ${
                  announcement.is_active && !isExpired 
                    ? 'bg-slate-800/50 hover:bg-slate-700/50' 
                    : 'bg-slate-800/30 opacity-60'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                        <IconComponent className={`w-5 h-5 ${config.color}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-white">{announcement.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                            {config.label}
                          </span>
                          {announcement.show_popup && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                              Popup
                            </span>
                          )}
                          {isExpired && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                              Expirado
                            </span>
                          )}
                          {!announcement.is_active && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400">
                              Inativo
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-300 line-clamp-2">{announcement.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(announcement.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {announcement.read_count || 0} visualizações
                          </span>
                          {announcement.expires_at && (
                            <span className="flex items-center gap-1">
                              Expira: {formatDate(announcement.expires_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(announcement.id, announcement.is_active)}
                          className="text-slate-400 hover:text-white"
                        >
                          {announcement.is_active ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(announcement)}
                          className="text-slate-400 hover:text-white"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAnnouncement(announcement.id)}
                          className="text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {announcements.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum aviso criado ainda.</p>
            <p className="text-sm">Clique em "Novo Aviso" para enviar uma notificação.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              {editingAnnouncement ? 'Editar Aviso' : 'Novo Aviso'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Manutenção programada"
                className="mt-1.5 bg-slate-700 border-slate-600"
              />
            </div>

            <div>
              <Label>Mensagem *</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreva o aviso..."
                className="mt-1.5 bg-slate-700 border-slate-600 min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger className="mt-1.5 bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="info">
                      <span className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-400" />
                        Informação
                      </span>
                    </SelectItem>
                    <SelectItem value="warning">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        Aviso
                      </span>
                    </SelectItem>
                    <SelectItem value="success">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Sucesso
                      </span>
                    </SelectItem>
                    <SelectItem value="error">
                      <span className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-400" />
                        Urgente
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Expira em (opcional)</Label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="mt-1.5 bg-slate-700 border-slate-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
              <Switch
                checked={showPopup}
                onCheckedChange={setShowPopup}
                id="show-popup"
              />
              <Label htmlFor="show-popup" className="cursor-pointer">
                Mostrar como popup (modal) ao abrir o app
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={saveAnnouncement} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {editingAnnouncement ? 'Atualizar' : 'Enviar Aviso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
