-- Create table for admin announcements/notifications
CREATE TABLE public.admin_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, warning, success, error
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_popup BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Table to track which users have seen/dismissed announcements
CREATE TABLE public.announcement_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.admin_announcements(id) ON DELETE CASCADE,
  user_matricula INTEGER NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_matricula)
);

-- Enable RLS
ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- Everyone can view active announcements
CREATE POLICY "Anyone can view active announcements"
ON public.admin_announcements
FOR SELECT
USING (is_active = true);

-- Only admins can manage announcements
CREATE POLICY "Admins can manage announcements"
ON public.admin_announcements
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Users can insert their own reads
CREATE POLICY "Users can mark announcements as read"
ON public.announcement_reads
FOR INSERT
WITH CHECK (
  user_matricula IN (
    SELECT matricula FROM users_matricula 
    WHERE id = auth.uid()
  )
);

-- Users can view their own reads
CREATE POLICY "Users can view their own reads"
ON public.announcement_reads
FOR SELECT
USING (
  user_matricula IN (
    SELECT matricula FROM users_matricula 
    WHERE id = auth.uid()
  )
);

-- Admins can view all reads
CREATE POLICY "Admins can view all reads"
ON public.announcement_reads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create indexes
CREATE INDEX idx_announcements_active ON public.admin_announcements(is_active);
CREATE INDEX idx_announcements_created ON public.admin_announcements(created_at DESC);
CREATE INDEX idx_reads_user ON public.announcement_reads(user_matricula);
CREATE INDEX idx_reads_announcement ON public.announcement_reads(announcement_id);