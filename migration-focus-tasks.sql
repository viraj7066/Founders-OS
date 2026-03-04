-- 1. Create table if not exists (base structure)
CREATE TABLE IF NOT EXISTS public.focus_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. DROP any existing foreign key constraint if it exists to avoid blocking inserts
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'focus_tasks_user_id_fkey') THEN
        ALTER TABLE public.focus_tasks DROP CONSTRAINT focus_tasks_user_id_fkey;
    END IF;
END $$;

-- 3. Migrate existing focus items from daily_activities (skips fallback user)
INSERT INTO public.focus_tasks (user_id, text, completed, created_at)
SELECT 
    user_id, 
    (item->>'text')::text, 
    COALESCE((item->>'completed')::boolean, false), 
    created_at
FROM 
    public.daily_activities, 
    jsonb_array_elements(CASE WHEN jsonb_typeof(focus_items) = 'array' THEN focus_items ELSE '[]'::jsonb END) AS item
WHERE
    user_id != '00000000-0000-0000-0000-000000000000'
ON CONFLICT DO NOTHING;

-- 4. Enable RLS
ALTER TABLE public.focus_tasks ENABLE ROW LEVEL SECURITY;

-- 5. Policies
DROP POLICY IF EXISTS "Public focus tasks" ON public.focus_tasks;
CREATE POLICY "Public focus tasks" ON public.focus_tasks FOR ALL USING (true);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
