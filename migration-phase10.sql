-- ==============================================================================
-- Founders OS: Phase 10 Hotfix & Feature Expansion
-- ==============================================================================

-- 1. Graceful error handling for missing/deleted columns in follow_ups
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'follow_ups') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='follow_ups' AND column_name='action') THEN
            ALTER TABLE public.follow_ups ADD COLUMN action TEXT NOT NULL DEFAULT 'Follow-up';
        END IF;
    ELSE
        -- Create table if somehow deleted
        CREATE TABLE public.follow_ups (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            company TEXT NOT NULL,
            name TEXT NOT NULL,
            action TEXT NOT NULL DEFAULT 'Follow-up',
            due TEXT NOT NULL,
            completed BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can manage their follow_ups" ON public.follow_ups FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- 2. Graceful error handling for expenses table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expenses') THEN
        CREATE TABLE public.expenses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
            category TEXT NOT NULL CHECK (category IN ('Software', 'Marketing', 'Payroll', 'Contractors', 'Office', 'Other')),
            description TEXT,
            date DATE NOT NULL DEFAULT CURRENT_DATE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        -- Enable RLS
        ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can manage their own expenses" ON public.expenses FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- 3. Notify postgREST to reload schema cache so the UI doesn't break
NOTIFY pgrst, 'reload schema';
