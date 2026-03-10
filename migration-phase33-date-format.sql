-- Fix: Convert due_date from TIMESTAMP WITH TIME ZONE to literal DATE type
-- This enforces that standard strictly matching "YYYY-MM-DD" is returned by the Supabase API without automatic UTC mutations.

ALTER TABLE public.tasks 
ALTER COLUMN due_date TYPE DATE USING due_date::DATE;
