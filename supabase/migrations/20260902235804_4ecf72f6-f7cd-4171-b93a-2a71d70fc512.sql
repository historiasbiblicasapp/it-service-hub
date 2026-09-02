CREATE TABLE public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  rate_percent numeric NOT NULL DEFAULT 0,
  expected_return numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view investments" ON public.investments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert investments" ON public.investments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update investments" ON public.investments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete investments" ON public.investments FOR DELETE TO authenticated USING (true);

CREATE TABLE public.investment_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id uuid NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  withdrawal_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_withdrawals TO authenticated;
GRANT ALL ON public.investment_withdrawals TO service_role;
ALTER TABLE public.investment_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view withdrawals" ON public.investment_withdrawals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert withdrawals" ON public.investment_withdrawals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update withdrawals" ON public.investment_withdrawals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete withdrawals" ON public.investment_withdrawals FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON public.investments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_investment_withdrawals_updated_at BEFORE UPDATE ON public.investment_withdrawals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();