-- Run this in your Supabase SQL Editor
-- Creates tables for Invoice and Contract Generators

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  client_id_or_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Draft', -- 'Draft', 'Sent', 'Paid'
  items_json JSONB DEFAULT '[]'::jsonb,
  payment_details_json JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  client_id_or_name TEXT NOT NULL,
  title TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Draft', -- 'Draft', 'Sent', 'Signed'
  project_scope TEXT NOT NULL,
  terms_json JSONB DEFAULT '[]'::jsonb,
  amount DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can manage invoices" ON public.invoices;
CREATE POLICY "Public can manage invoices" ON public.invoices FOR ALL USING (true);

DROP POLICY IF EXISTS "Public can manage contracts" ON public.contracts;
CREATE POLICY "Public can manage contracts" ON public.contracts FOR ALL USING (true);
