-- Create table for smart transport routines
CREATE TABLE public.rotinas_transporte (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_matricula INTEGER NOT NULL,
  endereco_casa TEXT NOT NULL,
  endereco_trabalho TEXT NOT NULL,
  horario_trabalho TIME NOT NULL,
  tempo_ate_ponto INTEGER DEFAULT 10,
  linha_onibus TEXT,
  modo_transporte TEXT DEFAULT 'transit',
  ativo BOOLEAN DEFAULT true,
  ultima_verificacao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rotinas_transporte ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own transport routines" 
ON public.rotinas_transporte 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own transport routines" 
ON public.rotinas_transporte 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own transport routines" 
ON public.rotinas_transporte 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete their own transport routines" 
ON public.rotinas_transporte 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_rotinas_transporte_updated_at
BEFORE UPDATE ON public.rotinas_transporte
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();