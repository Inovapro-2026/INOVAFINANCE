-- Drop existing permissive INSERT policies
DROP POLICY IF EXISTS "Users can create their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can create messages on their tickets" ON public.support_messages;

-- Recreate INSERT policy for support_tickets
-- Allow users to create tickets where user_matricula matches their auth
CREATE POLICY "Users can create their own tickets" 
ON public.support_tickets 
FOR INSERT 
WITH CHECK (
  user_matricula IN (
    SELECT matricula FROM users_matricula 
    WHERE id = auth.uid()
  )
);

-- Also allow admins to create tickets for any user
CREATE POLICY "Admins can create tickets for users" 
ON public.support_tickets 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Recreate INSERT policy for support_messages
-- Allow users to create messages on their own tickets
CREATE POLICY "Users can create messages on their tickets" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (
  ticket_id IN (
    SELECT id FROM support_tickets 
    WHERE user_matricula IN (
      SELECT matricula FROM users_matricula 
      WHERE id = auth.uid()
    )
  )
);

-- Allow admins to create messages on any ticket
CREATE POLICY "Admins can create messages on any ticket" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);