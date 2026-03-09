-- Phase 31: Task Calendar & Skills Tracker

-- 1. Tasks Table (Kanban Board)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT CHECK (priority IN ('High', 'Medium', 'Low')) DEFAULT 'Medium',
    due_date TIMESTAMP WITH TIME ZONE,
    tags TEXT[] DEFAULT '{}',
    time_estimate TEXT,
    subtasks JSONB DEFAULT '[]'::jsonb,
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency TEXT CHECK (recurring_frequency IN ('Daily', 'Weekly', 'Custom', NULL)),
    notes TEXT,
    column_id TEXT CHECK (column_id IN ('Backlog', 'This Week', 'Today', 'In Progress', 'Tomorrow', 'Done')) DEFAULT 'Backlog',
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;
CREATE POLICY "Users can manage their own tasks" ON public.tasks 
    FOR ALL USING (auth.uid() = user_id);

-- 2. Task Tracking Stats Function (Highest/Current Streaks run dynamically or securely via DB if needed)
CREATE TABLE IF NOT EXISTS public.task_stats (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    highest_streak INTEGER DEFAULT 0,
    last_completed_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for task_stats
ALTER TABLE public.task_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own task stats" ON public.task_stats;
CREATE POLICY "Users can manage their own task stats" ON public.task_stats 
    FOR ALL USING (auth.uid() = user_id);

-- 3. Skills Tracker Table
CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('Tech', 'Creative', 'Soft Skill', 'Other')) DEFAULT 'Other',
    status TEXT CHECK (status IN ('Wishlist', 'Learning', 'Mastered')) DEFAULT 'Wishlist',
    progress INTEGER CHECK (progress >= 0 AND progress <= 100) DEFAULT 0,
    primary_resource TEXT,
    next_action TEXT,
    time_goal TEXT,
    streak INTEGER DEFAULT 0,
    last_practiced_at DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for skills
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own skills" ON public.skills;
CREATE POLICY "Users can manage their own skills" ON public.skills 
    FOR ALL USING (auth.uid() = user_id);
