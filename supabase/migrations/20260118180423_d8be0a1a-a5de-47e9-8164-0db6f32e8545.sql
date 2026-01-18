-- Relax RLS for support tables to work with app's custom (non-Supabase-Auth) login.
-- NOTE: This makes support tickets/messages accessible to any client with the anon key.

-- support_tickets policies
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can create their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can update their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can create tickets for users" ON public.support_tickets;

CREATE POLICY "Public can view support tickets"
ON public.support_tickets
FOR SELECT
USING (true);

CREATE POLICY "Public can create support tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can update support tickets"
ON public.support_tickets
FOR UPDATE
USING (true);

-- support_messages policies
DROP POLICY IF EXISTS "Users can view messages of their tickets" ON public.support_messages;
DROP POLICY IF EXISTS "Users can create messages on their tickets" ON public.support_messages;
DROP POLICY IF EXISTS "Admins can create messages on any ticket" ON public.support_messages;

CREATE POLICY "Public can view support messages"
ON public.support_messages
FOR SELECT
USING (true);

CREATE POLICY "Public can create support messages"
ON public.support_messages
FOR INSERT
WITH CHECK (true);
