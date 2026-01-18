-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create their own agenda items" ON public.agenda_items;

-- Create a more permissive INSERT policy that checks user_matricula exists in users_matricula table
CREATE POLICY "Users can create their own agenda items" 
ON public.agenda_items 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users_matricula 
    WHERE users_matricula.matricula = user_matricula
  )
);

-- Also update the SELECT policy to allow reads without auth
DROP POLICY IF EXISTS "Users can view their own agenda items" ON public.agenda_items;
CREATE POLICY "Users can view own agenda items" 
ON public.agenda_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users_matricula 
    WHERE users_matricula.matricula = user_matricula
  )
);

-- Update the UPDATE policy
DROP POLICY IF EXISTS "Users can update their own agenda items" ON public.agenda_items;
CREATE POLICY "Users can update own agenda items" 
ON public.agenda_items 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM users_matricula 
    WHERE users_matricula.matricula = user_matricula
  )
);

-- Update the DELETE policy
DROP POLICY IF EXISTS "Users can delete their own agenda items" ON public.agenda_items;
CREATE POLICY "Users can delete own agenda items" 
ON public.agenda_items 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM users_matricula 
    WHERE users_matricula.matricula = user_matricula
  )
);

-- Also update rotinas table policies
DROP POLICY IF EXISTS "Users can create their own rotinas" ON public.rotinas;
DROP POLICY IF EXISTS "Users can view their own rotinas" ON public.rotinas;
DROP POLICY IF EXISTS "Users can update their own rotinas" ON public.rotinas;
DROP POLICY IF EXISTS "Users can delete their own rotinas" ON public.rotinas;

CREATE POLICY "Users can create own rotinas" 
ON public.rotinas 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users_matricula 
    WHERE users_matricula.matricula = user_matricula
  )
);

CREATE POLICY "Users can view own rotinas" 
ON public.rotinas 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users_matricula 
    WHERE users_matricula.matricula = user_matricula
  )
);

CREATE POLICY "Users can update own rotinas" 
ON public.rotinas 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM users_matricula 
    WHERE users_matricula.matricula = user_matricula
  )
);

CREATE POLICY "Users can delete own rotinas" 
ON public.rotinas 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM users_matricula 
    WHERE users_matricula.matricula = user_matricula
  )
);

-- Also update rotina_completions table policies
DROP POLICY IF EXISTS "Users can create their own completions" ON public.rotina_completions;
DROP POLICY IF EXISTS "Users can view their own completions" ON public.rotina_completions;
DROP POLICY IF EXISTS "Users can delete their own completions" ON public.rotina_completions;

CREATE POLICY "Users can create own completions" 
ON public.rotina_completions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users_matricula 
    WHERE users_matricula.matricula = user_matricula
  )
);

CREATE POLICY "Users can view own completions" 
ON public.rotina_completions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users_matricula 
    WHERE users_matricula.matricula = user_matricula
  )
);

CREATE POLICY "Users can delete own completions" 
ON public.rotina_completions 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM users_matricula 
    WHERE users_matricula.matricula = user_matricula
  )
);