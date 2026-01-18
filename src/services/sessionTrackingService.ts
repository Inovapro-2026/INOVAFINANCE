import { supabase } from "@/integrations/supabase/client";

let currentSessionId: string | null = null;
let activityInterval: NodeJS.Timeout | null = null;

export async function startSession(matricula: number, userName?: string): Promise<string | null> {
  try {
    // End any existing online sessions for this user
    await supabase
      .from('user_sessions')
      .update({ is_online: false, session_end: new Date().toISOString() })
      .eq('user_matricula', matricula)
      .eq('is_online', true);

    // Create new session
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        user_matricula: matricula,
        user_name: userName || null,
        is_online: true,
        session_start: nowIso,
        last_activity: nowIso
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error starting session:', error);
      return null;
    }

    currentSessionId = data.id;

    // Update activity every 30 seconds
    activityInterval = setInterval(() => {
      updateActivity();
    }, 30000);

    // Listen for page unload to end session
    window.addEventListener('beforeunload', handlePageUnload);

    return currentSessionId;
  } catch (error) {
    console.error('Error in startSession:', error);
    return null;
  }
}

export async function updateActivity(): Promise<void> {
  if (!currentSessionId) return;

  try {
    await supabase
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', currentSessionId);
  } catch (error) {
    console.error('Error updating activity:', error);
  }
}

export async function endSession(): Promise<void> {
  if (!currentSessionId) return;

  try {
    await supabase
      .from('user_sessions')
      .update({ 
        is_online: false, 
        session_end: new Date().toISOString() 
      })
      .eq('id', currentSessionId);

    if (activityInterval) {
      clearInterval(activityInterval);
      activityInterval = null;
    }

    window.removeEventListener('beforeunload', handlePageUnload);
    currentSessionId = null;
  } catch (error) {
    console.error('Error ending session:', error);
  }
}

function handlePageUnload(): void {
  if (currentSessionId) {
    // Use sendBeacon for reliable unload tracking
    const url = `${import.meta.env.VITE_SUPABASE_URL || 'https://pahvovxnhqsmcnqncmys.supabase.co'}/rest/v1/user_sessions?id=eq.${currentSessionId}`;
    const body = JSON.stringify({ 
      is_online: false, 
      session_end: new Date().toISOString() 
    });
    
    navigator.sendBeacon(url, body);
  }
}

// Admin functions
export async function getAccessStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Get online users count
  const { data: onlineData, error: onlineError } = await supabase
    .from('user_sessions')
    .select('id, user_matricula, user_name, last_activity')
    .eq('is_online', true)
    .gte('last_activity', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Active in last 5 minutes

  // Get today's unique access count
  const { data: todayData } = await supabase
    .from('user_sessions')
    .select('user_matricula')
    .gte('session_start', todayStart);

  // Get this week's unique access count
  const { data: weekData } = await supabase
    .from('user_sessions')
    .select('user_matricula')
    .gte('session_start', weekStart);

  // Get this month's unique access count
  const { data: monthData } = await supabase
    .from('user_sessions')
    .select('user_matricula')
    .gte('session_start', monthStart);

  // Get unique users
  const todayUnique = new Set(todayData?.map(s => s.user_matricula) || []).size;
  const weekUnique = new Set(weekData?.map(s => s.user_matricula) || []).size;
  const monthUnique = new Set(monthData?.map(s => s.user_matricula) || []).size;

  // Get total sessions
  const todayTotal = todayData?.length || 0;
  const weekTotal = weekData?.length || 0;
  const monthTotal = monthData?.length || 0;

  return {
    online: {
      count: onlineData?.length || 0,
      users: onlineData || []
    },
    today: {
      uniqueUsers: todayUnique,
      totalSessions: todayTotal
    },
    week: {
      uniqueUsers: weekUnique,
      totalSessions: weekTotal
    },
    month: {
      uniqueUsers: monthUnique,
      totalSessions: monthTotal
    }
  };
}

// Get hourly access data for charts
export async function getHourlyAccessData() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const { data } = await supabase
    .from('user_sessions')
    .select('session_start, user_matricula')
    .gte('session_start', todayStart);

  // Group by hour (unique users)
  const hourlyUsers: Record<number, Set<number>> = {};
  for (let i = 0; i < 24; i++) {
    hourlyUsers[i] = new Set<number>();
  }

  (data || []).forEach((session) => {
    const hour = new Date(session.session_start).getHours();
    hourlyUsers[hour].add(session.user_matricula);
  });

  return Object.entries(hourlyUsers).map(([hour, users]) => ({
    hour: `${hour}h`,
    acessos: users.size
  }));
}

// Get daily access data for the last 7 days
export async function getDailyAccessData() {
  const now = new Date();
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const result = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString();

    const { data } = await supabase
      .from('user_sessions')
      .select('user_matricula')
      .gte('session_start', dayStart)
      .lt('session_start', dayEnd);

    const uniqueUsers = new Set(data?.map(s => s.user_matricula) || []).size;

    result.push({
      day: days[date.getDay()],
      date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      acessos: data?.length || 0,
      usuarios: uniqueUsers
    });
  }

  return result;
}
