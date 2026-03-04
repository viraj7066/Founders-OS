-- DEFINITIVE FIX MIGRATION
-- Fixes: follow_ups schema mismatch, daily_activities FK constraint, data persistence
-- Run this in Supabase SQL Editor

-- ═══════════════════════════════════════════════════
-- STEP 1: DROP & RECREATE follow_ups with correct schema
-- The old table has `due_date DATE NOT NULL` but the app sends `due TEXT`
-- ═══════════════════════════════════════════════════
DROP TABLE IF EXISTS public.follow_ups CASCADE;

CREATE TABLE public.follow_ups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID,                          -- NO FK constraint, just a plain UUID
  name       TEXT NOT NULL DEFAULT '',
  company    TEXT DEFAULT '',
  action     TEXT NOT NULL DEFAULT 'Follow-up',
  due        TEXT DEFAULT '',               -- plain text date string, nullable
  completed  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public follow ups" ON public.follow_ups;
CREATE POLICY "Public follow ups" ON public.follow_ups FOR ALL USING (true);


-- ═══════════════════════════════════════════════════
-- STEP 2: Fix daily_activities - drop FK on user_id
-- ═══════════════════════════════════════════════════

-- Drop and recreate daily_activities without FK constraints
DROP TABLE IF EXISTS public.daily_activities CASCADE;

CREATE TABLE public.daily_activities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL,           -- NO FK constraint, just a plain UUID
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  instagram_sent   INTEGER DEFAULT 0,
  linkedin_sent    INTEGER DEFAULT 0,
  whatsapp_sent    INTEGER DEFAULT 0,
  focus_text       TEXT DEFAULT '',
  focus_items      JSONB DEFAULT '[]'::jsonb,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE (user_id, date)
);

ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public daily activities" ON public.daily_activities;
CREATE POLICY "Public daily activities" ON public.daily_activities FOR ALL USING (true);


-- ═══════════════════════════════════════════════════
-- STEP 3: Confirm the dummy user still exists (no change needed)
-- ═══════════════════════════════════════════════════
INSERT INTO public.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000000', 'dev@example.com')
ON CONFLICT (id) DO NOTHING;


-- Done! Both tables now accept any UUID for user_id, including real Supabase Auth UIDs.
