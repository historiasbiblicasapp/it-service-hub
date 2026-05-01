CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view expense_categories" ON public.expense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert expense_categories" ON public.expense_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update expense_categories" ON public.expense_categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete expense_categories" ON public.expense_categories FOR DELETE TO authenticated USING (true);

CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update expenses" ON public.expenses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete expenses" ON public.expenses FOR DELETE TO authenticated USING (true);

INSERT INTO public.expense_categories (name, icon) VALUES
  ('Aluguel', 'home'),
  ('Energia', 'zap'),
  ('Internet', 'wifi'),
  ('Material de Escritório', 'file-text'),
  ('Software/Licenças', 'key'),
  ('Marketing', 'megaphone'),
  ('Transporte', 'car'),
  ('Alimentação', 'utensils-crossed'),
  ('Manutenção de Equipamentos', 'wrench'),
  ('Impostos', 'calculator'),
  ('Outros', 'ellipsis');