ALTER TABLE public.paid_bills
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deduct_from text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS installment_group uuid,
  ADD COLUMN IF NOT EXISTS installment_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS installment_total integer NOT NULL DEFAULT 1;

ALTER TABLE public.paid_bills ALTER COLUMN payment_date DROP NOT NULL;

ALTER TABLE public.paid_bills
  ADD CONSTRAINT paid_bills_deduct_from_check CHECK (deduct_from IN ('none','saldo','propria'));

ALTER TABLE public.paid_bills
  ADD CONSTRAINT paid_bills_installments_check CHECK (installment_total BETWEEN 1 AND 60 AND installment_number BETWEEN 1 AND installment_total);

CREATE INDEX IF NOT EXISTS paid_bills_due_date_idx ON public.paid_bills (due_date);
CREATE INDEX IF NOT EXISTS paid_bills_group_idx ON public.paid_bills (installment_group);