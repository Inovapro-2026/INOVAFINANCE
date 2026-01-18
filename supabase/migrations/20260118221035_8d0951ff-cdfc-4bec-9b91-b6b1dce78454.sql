-- Fix online/access stats for custom (non-Supabase-Auth) login by allowing anon client to write/read user_sessions.
-- SECURITY NOTE: This exposes online/access metadata to any client with the anon key.

-- Ensure RLS is enabled (in case it wasn't)
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Public can view user sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Public can create user sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Public can update user sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Public can delete user sessions" ON public.user_sessions;

-- Allow reading sessions (needed for admin dashboard online + access analytics)
CREATE POLICY "Public can view user sessions"
ON public.user_sessions
FOR SELECT
USING (true);

-- Allow creating sessions (login)
CREATE POLICY "Public can create user sessions"
ON public.user_sessions
FOR INSERT
WITH CHECK (true);

-- Allow updating sessions (heartbeat / logout)
CREATE POLICY "Public can update user sessions"
ON public.user_sessions
FOR UPDATE
USING (true);

-- (Optional) do NOT allow deletes from clients
DROP POLICY IF EXISTS "Public can delete user sessions" ON public.user_sessions;