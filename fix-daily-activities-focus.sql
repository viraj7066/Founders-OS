-- Run this in your Supabase SQL Editor
-- Adds the focus_items JSONB column to daily_activities
-- so that Today's Focus tasks sync between the Daily Tracker and the Dashboard

ALTER TABLE public.daily_activities
  ADD COLUMN IF NOT EXISTS focus_items JSONB DEFAULT '[]'::jsonb;
