-- Run this in your Supabase SQL Editor
-- Creates table for Agency Settings (Custom Logo)

CREATE TABLE IF NOT EXISTS public.agency_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    logo_base64 TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can manage agency settings" ON public.agency_settings;
CREATE POLICY "Public can manage agency settings" ON public.agency_settings FOR ALL USING (true);
