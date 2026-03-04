-- Create Life Goals table
CREATE TABLE IF NOT EXISTS public.life_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    impact TEXT, -- Vision/Impact statement
    status TEXT DEFAULT 'in_progress', -- 'in_progress', 'achieved', 'pending'
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
    target_date DATE,
    progress_percent INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.life_goals ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Users can manage own life goals" ON public.life_goals
    FOR ALL USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_life_goals_updated_at
    BEFORE UPDATE ON public.life_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
