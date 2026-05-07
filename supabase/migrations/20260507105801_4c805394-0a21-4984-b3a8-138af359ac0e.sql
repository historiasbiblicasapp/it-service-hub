CREATE TABLE public.paid_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.paid_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view paid_bills" ON public.paid_bills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert paid_bills" ON public.paid_bills FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update paid_bills" ON public.paid_bills FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete paid_bills" ON public.paid_bills FOR DELETE TO authenticated USING (true);