-- Run this in your Supabase SQL Editor
-- Creates the daily_activities and follow_ups tables for the Action Tracker module

CREATE TABLE IF NOT EXISTS public.daily_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  instagram_sent INTEGER DEFAULT 0,
  linkedin_sent INTEGER DEFAULT 0,
  whatsapp_sent INTEGER DEFAULT 0,
  focus_text TEXT,
  focus_items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  action TEXT NOT NULL,
  due TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- Create Policies
DROP POLICY IF EXISTS "Public daily activities" ON public.daily_activities;
CREATE POLICY "Public daily activities" ON public.daily_activities FOR ALL USING (true);

DROP POLICY IF EXISTS "Public follow ups" ON public.follow_ups;
CREATE POLICY "Public follow ups" ON public.follow_ups FOR ALL USING (true);
