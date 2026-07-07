CREATE TABLE public.moto_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_type text NOT NULL,
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  km integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.moto_maintenance TO authenticated;
GRANT ALL ON public.moto_maintenance TO service_role;

ALTER TABLE public.moto_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view moto_maintenance"
  ON public.moto_maintenance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert moto_maintenance"
  ON public.moto_maintenance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update moto_maintenance"
  ON public.moto_maintenance FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete moto_maintenance"
  ON public.moto_maintenance FOR DELETE TO authenticated USING (true);