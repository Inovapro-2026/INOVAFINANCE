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
// Uses both Realtime Presence AND database polling for reliability
export function useAdminOnlineMonitor() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch from database (more reliable)
  const fetchFromDatabase = async () => {
    try {
      // Get users active in the last 2 minutes
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('user_sessions')
        .select('id, user_matricula, user_name, last_activity')
        .eq('is_online', true)
        .gte('last_activity', twoMinutesAgo);

      if (error) {
        console.error('Error fetching online users:', error);
        return;
      }

      if (data) {
        const users: OnlineUser[] = data.map(session => ({
          matricula: session.user_matricula,
          name: session.user_name || `Usuário ${session.user_matricula}`,
          online_at: session.last_activity
        }));

        // Remove duplicates by matricula, keeping most recent
        const uniqueUsers = users.reduce((acc, user) => {
          const existing = acc.find(u => u.matricula === user.matricula);
          if (!existing || new Date(user.online_at) > new Date(existing.online_at)) {
            return [...acc.filter(u => u.matricula !== user.matricula), user];
          }
          return acc;
        }, [] as OnlineUser[]);

        // Sort by most recent
        uniqueUsers.sort((a, b) => new Date(b.online_at).getTime() - new Date(a.online_at).getTime());

        setOnlineUsers(uniqueUsers);
        setOnlineCount(uniqueUsers.length);
      }
    } catch (error) {
      console.error('Error in fetchFromDatabase:', error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchFromDatabase();

    // Poll every 30 seconds for updates
    const pollInterval = setInterval(fetchFromDatabase, 30000);

    // Also subscribe to Realtime Presence for instant updates
    const channel = supabase.channel('online-users');
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        // Refetch from database on any presence change
        fetchFromDatabase();
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
        fetchFromDatabase();
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
        fetchFromDatabase();
      })
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      channel.unsubscribe();
    };
  }, []);

  return { onlineUsers, onlineCount, refetch: fetchFromDatabase };
}
