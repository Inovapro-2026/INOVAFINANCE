import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Bell, 
  X,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  show_popup: boolean;
  created_at: string;
}

const typeConfig = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
  success: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
};

export function AnnouncementPopup() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (user?.userId) {
      loadUnreadAnnouncements();
    }
  }, [user?.userId]);

  const loadUnreadAnnouncements = async () => {
    if (!user?.userId) return;

    try {
      // Get all active announcements that should show popup
      const { data: allAnnouncements, error: annError } = await supabase
        .from('admin_announcements')
        .select('*')
        .eq('is_active', true)
        .eq('show_popup', true)
        .order('created_at', { ascending: false });

      if (annError) throw annError;

      // Get user's read announcements
      const { data: reads, error: readsError } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_matricula', user.userId);

      if (readsError) throw readsError;

      const readIds = new Set((reads || []).map(r => r.announcement_id));

      // Filter to only unread, non-expired announcements
      const unreadAnnouncements = (allAnnouncements || []).filter(ann => {
        if (readIds.has(ann.id)) return false;
        if (ann.expires_at && new Date(ann.expires_at) < new Date()) return false;
        return true;
      });

      if (unreadAnnouncements.length > 0) {
        setAnnouncements(unreadAnnouncements as Announcement[]);
        setCurrentIndex(0);
        setShowPopup(true);
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

  const markAsRead = async (announcementId: string) => {
    if (!user?.userId) return;

    try {
      await supabase
        .from('announcement_reads')
        .insert({
          announcement_id: announcementId,
          user_matricula: user.userId
        });
    } catch (error) {
      console.error('Error marking announcement as read:', error);
    }
  };

  const handleDismiss = async () => {
    const currentAnnouncement = announcements[currentIndex];
    if (currentAnnouncement) {
      await markAsRead(currentAnnouncement.id);
    }

    if (currentIndex < announcements.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowPopup(false);
    }
  };

  const handleDismissAll = async () => {
    // Mark all as read
    for (const ann of announcements) {
      await markAsRead(ann.id);
    }
    setShowPopup(false);
  };

  if (!showPopup || announcements.length === 0) return null;

  const currentAnnouncement = announcements[currentIndex];
  const config = typeConfig[currentAnnouncement.type] || typeConfig.info;
  const IconComponent = config.icon;

  return (
    <Dialog open={showPopup} onOpenChange={setShowPopup}>
      <DialogContent className={`bg-slate-900 ${config.border} border-2 text-white max-w-md`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center`}>
              <IconComponent className={`w-4 h-4 ${config.color}`} />
            </div>
            <span>{currentAnnouncement.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-slate-300 whitespace-pre-wrap">{currentAnnouncement.message}</p>
          
          <p className="text-xs text-slate-500 mt-4">
            {new Date(currentAnnouncement.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        {announcements.length > 1 && (
          <div className="flex items-center justify-center gap-2 pb-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => prev - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-400">
              {currentIndex + 1} de {announcements.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentIndex === announcements.length - 1}
              onClick={() => setCurrentIndex(prev => prev + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          {announcements.length > 1 && (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleDismissAll}
            >
              Dispensar todos
            </Button>
          )}
          <Button 
            className="flex-1"
            onClick={handleDismiss}
          >
            {currentIndex < announcements.length - 1 ? 'Próximo' : 'Entendido'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Banner component for persistent notification at top of pages
export function AnnouncementBanner() {
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (user?.userId) {
      loadLatestAnnouncement();
    }
  }, [user?.userId]);

  const loadLatestAnnouncement = async () => {
    if (!user?.userId) return;

    try {
      const { data, error } = await supabase
        .from('admin_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Check if expired
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          return;
        }
        setAnnouncement(data as Announcement);
      }
    } catch (error) {
      console.error('Error loading announcement:', error);
    }
  };

  if (!announcement || dismissed) return null;

  const config = typeConfig[announcement.type] || typeConfig.info;
  const IconComponent = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`${config.bg} ${config.border} border rounded-lg p-3 mb-4 flex items-center gap-3`}
      >
        <IconComponent className={`w-5 h-5 ${config.color} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${config.color}`}>{announcement.title}</p>
          <p className="text-xs text-slate-300 line-clamp-1">{announcement.message}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white flex-shrink-0"
          onClick={() => setDismissed(true)}
        >
          <X className="w-4 h-4" />
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}

// Bell icon with notification count for navbar
export function NotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showList, setShowList] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    if (user?.userId) {
      loadUnreadCount();
    }
  }, [user?.userId]);

  const loadUnreadCount = async () => {
    if (!user?.userId) return;

    try {
      const { data: allAnnouncements } = await supabase
        .from('admin_announcements')
        .select('id')
        .eq('is_active', true);

      const { data: reads } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_matricula', user.userId);

      const readIds = new Set((reads || []).map(r => r.announcement_id));
      const unreadAnnouncements = (allAnnouncements || []).filter(ann => !readIds.has(ann.id));
      
      setUnreadCount(unreadAnnouncements.length);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const { data } = await supabase
        .from('admin_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      setAnnouncements((data || []) as Announcement[]);
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

  const handleClick = () => {
    if (!showList) {
      loadAnnouncements();
    }
    setShowList(!showList);
  };

  const markAsRead = async (announcementId: string) => {
    if (!user?.userId) return;

    try {
      await supabase
        .from('announcement_reads')
        .upsert({
          announcement_id: announcementId,
          user_matricula: user.userId
        });
      
      loadUnreadCount();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={handleClick}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {showList && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden"
          >
            <div className="p-3 border-b border-slate-700">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                Notificações
              </h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {announcements.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">
                  Nenhuma notificação
                </div>
              ) : (
                announcements.map((ann) => {
                  const config = typeConfig[ann.type] || typeConfig.info;
                  const IconComponent = config.icon;
                  
                  return (
                    <div 
                      key={ann.id}
                      className="p-3 border-b border-slate-700/50 hover:bg-slate-700/50 cursor-pointer transition-colors"
                      onClick={() => markAsRead(ann.id)}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-6 h-6 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <IconComponent className={`w-3 h-3 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{ann.title}</p>
                          <p className="text-xs text-slate-400 line-clamp-2">{ann.message}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(ann.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
