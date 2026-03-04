-- Founders OS Migration Phase 11
-- Resolves silent upsert failures for Daily Activities (Outreach Volume & Focus Tasks)
-- Resolves missing 'completed' column on follow_ups table if any

DO $$ 
BEGIN
  -- 1. Ensure daily_activities has a unique constraint on user_id and date to allow upsert to work
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_activities_user_id_date_key'
  ) THEN
    -- First, remove any duplicates if they exist, keeping the latest one
    DELETE FROM public.daily_activities a USING (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, date ORDER BY updated_at DESC) as rn
      FROM public.daily_activities
    ) b WHERE a.id = b.id AND b.rn > 1;

    -- Then add the unique constraint
    ALTER TABLE public.daily_activities ADD CONSTRAINT daily_activities_user_id_date_key UNIQUE (user_id, date);
  END IF;

  -- 2. Verify if 'completed' column exists in follow_ups, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='follow_ups' AND column_name='completed'
  ) THEN
    ALTER TABLE public.follow_ups ADD COLUMN completed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
