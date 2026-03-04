-- Phase 23: Life Goals Tags Feature

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='life_goals' AND column_name='tags') THEN
        ALTER TABLE public.life_goals ADD COLUMN tags TEXT; -- Comma separated or just plain text for simplicity
    END IF;
END $$;
