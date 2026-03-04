-- RUN THIS SNIPPET IN YOUR SUPABASE SQL EDITOR TO FIX THE OUTREACH SCRIPT SAVE ERROR

-- 1. First, make sure both columns actually exist so the trigger doesn't crash
ALTER TABLE public.outreach_scripts ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.outreach_scripts ADD COLUMN IF NOT EXISTS script_text TEXT;

-- 2. Update the trigger to safely check for nulls
CREATE OR REPLACE FUNCTION populate_outreach_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle Title/Name sync
  IF NEW.title IS NOT NULL AND NEW.name IS NULL THEN
    NEW.name := NEW.title;
  ELSIF NEW.name IS NOT NULL AND NEW.title IS NULL THEN
    NEW.title := NEW.name;
  END IF;
  
  -- Handle Content/Script_Text sync
  IF NEW.content IS NOT NULL AND NEW.script_text IS NULL THEN
    NEW.script_text := NEW.content;
  ELSIF NEW.script_text IS NOT NULL AND NEW.content IS NULL THEN
    NEW.content := NEW.script_text;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger is already attached, but replacing the function above fixes the logic.
