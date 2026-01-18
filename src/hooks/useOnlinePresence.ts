import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface OnlineUser {
  matricula: number;
  name: string;
  online_at: string;
}

export function useOnlinePresence() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase.channel('online-users');
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];
        
        Object.values(state).forEach((presences: unknown) => {
          (presences as OnlineUser[]).forEach((presence) => {
            users.push({
              matricula: presence.matricula,
              name: presence.name,
              online_at: presence.online_at
            });
          });
        });

        setOnlineUsers(users);
        setOnlineCount(users.length);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const trackPresence = async (matricula: number, name: string) => {
    if (!channelRef.current) return;

    await channelRef.current.track({
      matricula,
      name,
      online_at: new Date().toISOString()
    });
  };

  return { onlineUsers, onlineCount, trackPresence };
}

// Admin-specific hook for monitoring all online users
export function useAdminOnlineMonitor() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase.channel('online-users');
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];
        
        Object.values(state).forEach((presences: unknown) => {
          (presences as OnlineUser[]).forEach((presence) => {
            users.push({
              matricula: presence.matricula,
              name: presence.name,
              online_at: presence.online_at
            });
          });
        });

        // Sort by most recent
        users.sort((a, b) => new Date(b.online_at).getTime() - new Date(a.online_at).getTime());

        setOnlineUsers(users);
        setOnlineCount(users.length);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return { onlineUsers, onlineCount };
}
