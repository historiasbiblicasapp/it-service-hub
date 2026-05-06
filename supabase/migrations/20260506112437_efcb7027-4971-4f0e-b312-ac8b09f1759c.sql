CREATE TABLE public.moto_km (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  km_atual NUMERIC NOT NULL,
  km_anterior NUMERIC NOT NULL DEFAULT 0,
  km_rodado NUMERIC NOT NULL DEFAULT 0,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.moto_km ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view moto_km" ON public.moto_km FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert moto_km" ON public.moto_km FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update moto_km" ON public.moto_km FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete moto_km" ON public.moto_km FOR DELETE TO authenticated USING (true);