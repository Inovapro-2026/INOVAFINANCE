-- Tabela para lembretes e eventos da agenda
CREATE TABLE public.agenda_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_matricula INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'lembrete', -- lembrete | evento
  notificacao_minutos INTEGER DEFAULT 15,
  concluido BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para rotinas diárias recorrentes
CREATE TABLE public.rotinas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_matricula INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  dias_semana TEXT[] NOT NULL DEFAULT '{}', -- array de dias: segunda, terca, quarta, quinta, sexta, sabado, domingo
  hora TIME NOT NULL,
  ativo BOOLEAN DEFAULT true,
  notificacao_minutos INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para registrar conclusão de rotinas por dia
CREATE TABLE public.rotina_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rotina_id UUID NOT NULL REFERENCES public.rotinas(id) ON DELETE CASCADE,
  user_matricula INTEGER NOT NULL,
  data_conclusao DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(rotina_id, data_conclusao)
);

-- Enable RLS
ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotina_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agenda_items
CREATE POLICY "Users can view their own agenda items"
  ON public.agenda_items FOR SELECT
  USING (user_matricula = (
    SELECT matricula FROM public.users_matricula 
    WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create their own agenda items"
  ON public.agenda_items FOR INSERT
  WITH CHECK (user_matricula = (
    SELECT matricula FROM public.users_matricula 
    WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their own agenda items"
  ON public.agenda_items FOR UPDATE
  USING (user_matricula = (
    SELECT matricula FROM public.users_matricula 
    WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their own agenda items"
  ON public.agenda_items FOR DELETE
  USING (user_matricula = (
    SELECT matricula FROM public.users_matricula 
    WHERE id = auth.uid()
  ));

-- RLS Policies for rotinas
CREATE POLICY "Users can view their own rotinas"
  ON public.rotinas FOR SELECT
  USING (user_matricula = (
    SELECT matricula FROM public.users_matricula 
    WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create their own rotinas"
  ON public.rotinas FOR INSERT
  WITH CHECK (user_matricula = (
    SELECT matricula FROM public.users_matricula 
    WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their own rotinas"
  ON public.rotinas FOR UPDATE
  USING (user_matricula = (
    SELECT matricula FROM public.users_matricula 
    WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their own rotinas"
  ON public.rotinas FOR DELETE
  USING (user_matricula = (
    SELECT matricula FROM public.users_matricula 
    WHERE id = auth.uid()
  ));

-- RLS Policies for rotina_completions
CREATE POLICY "Users can view their own rotina completions"
  ON public.rotina_completions FOR SELECT
  USING (user_matricula = (
    SELECT matricula FROM public.users_matricula 
    WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create their own rotina completions"
  ON public.rotina_completions FOR INSERT
  WITH CHECK (user_matricula = (
    SELECT matricula FROM public.users_matricula 
    WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their own rotina completions"
  ON public.rotina_completions FOR DELETE
  USING (user_matricula = (
    SELECT matricula FROM public.users_matricula 
    WHERE id = auth.uid()
  ));

-- Triggers for updated_at
CREATE TRIGGER update_agenda_items_updated_at
  BEFORE UPDATE ON public.agenda_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rotinas_updated_at
  BEFORE UPDATE ON public.rotinas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for better performance
CREATE INDEX idx_agenda_items_user_matricula ON public.agenda_items(user_matricula);
CREATE INDEX idx_agenda_items_data ON public.agenda_items(data);
CREATE INDEX idx_rotinas_user_matricula ON public.rotinas(user_matricula);
CREATE INDEX idx_rotina_completions_rotina_id ON public.rotina_completions(rotina_id);
CREATE INDEX idx_rotina_completions_data ON public.rotina_completions(data_conclusao);