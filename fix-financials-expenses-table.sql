-- Run this in your Supabase SQL Editor
-- Creates the expenses table for the Financial Engine module

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'Miscellaneous',
  date DATE DEFAULT CURRENT_DATE,
  recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can manage expenses" ON public.expenses;
CREATE POLICY "Public can manage expenses" ON public.expenses FOR ALL USING (true);
