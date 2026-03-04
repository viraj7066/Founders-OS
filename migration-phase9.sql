-- ============================================================
-- PHASE 9 HOTFIX — Run this in Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS / DO blocks)
-- ============================================================

-- 1. EXPENSES TABLE (create if doesn't exist)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
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


-- 2. DAILY ACTIVITIES TABLE
CREATE TABLE IF NOT EXISTS public.daily_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  instagram_sent INTEGER DEFAULT 0,
  linkedin_sent INTEGER DEFAULT 0,
  whatsapp_sent INTEGER DEFAULT 0,
  focus_text TEXT DEFAULT '',
  focus_items JSONB DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, date)
);
ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can manage daily_activities" ON public.daily_activities;
CREATE POLICY "Public can manage daily_activities" ON public.daily_activities FOR ALL USING (true);

-- Safe column additions for daily_activities
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_activities' AND column_name = 'focus_items') THEN
    ALTER TABLE public.daily_activities ADD COLUMN focus_items JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_activities' AND column_name = 'instagram_sent') THEN
    ALTER TABLE public.daily_activities ADD COLUMN instagram_sent INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_activities' AND column_name = 'linkedin_sent') THEN
    ALTER TABLE public.daily_activities ADD COLUMN linkedin_sent INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_activities' AND column_name = 'whatsapp_sent') THEN
    ALTER TABLE public.daily_activities ADD COLUMN whatsapp_sent INTEGER DEFAULT 0;
  END IF;
END $$;


-- 3. FOLLOW UPS TABLE — recreate with correct schema if action column is missing
DO $$
BEGIN
  -- If the table doesn't exist, create it fresh
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follow_ups') THEN
    CREATE TABLE public.follow_ups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      name TEXT NOT NULL,
      company TEXT DEFAULT '',
      action TEXT NOT NULL DEFAULT '',
      due TEXT DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  ELSE
    -- Table exists — safely add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follow_ups' AND column_name = 'action') THEN
      ALTER TABLE public.follow_ups ADD COLUMN action TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follow_ups' AND column_name = 'company') THEN
      ALTER TABLE public.follow_ups ADD COLUMN company TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follow_ups' AND column_name = 'due') THEN
      ALTER TABLE public.follow_ups ADD COLUMN due TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follow_ups' AND column_name = 'name') THEN
      ALTER TABLE public.follow_ups ADD COLUMN name TEXT NOT NULL DEFAULT '';
    END IF;
  END IF;
END $$;

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can manage follow_ups" ON public.follow_ups;
CREATE POLICY "Public can manage follow_ups" ON public.follow_ups FOR ALL USING (true);
