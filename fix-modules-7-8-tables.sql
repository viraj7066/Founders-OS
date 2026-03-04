-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- This ensures the content_posts and team_members tables exist correctly

-- Content Posts Table (Module 7)
CREATE TABLE IF NOT EXISTS public.content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  platform TEXT,
  status TEXT DEFAULT 'Idea',
  
  caption TEXT,
  content_type TEXT,
  topic TEXT,
  canva_link TEXT,
  
  hashtags JSONB,
  target_audience TEXT,
  asset_links JSONB,
  
  reach INT,
  likes INT,
  comments INT,
  saves INT,
  dms_received INT,
  qualified_leads INT,
  engagement_rate DECIMAL(5,2),
  
  is_high_performer BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can manage content" ON public.content_posts;
CREATE POLICY "Public can manage content" ON public.content_posts FOR ALL USING (true);


-- Team Members Table (Module 8)
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'Active',
  
  rate_type TEXT,
  rate_amount DECIMAL(10,2) DEFAULT 0,
  
  tasks_assigned INT DEFAULT 0,
  tasks_completed INT DEFAULT 0,
  quality_score DECIMAL(3,2) DEFAULT 0,
  
  dashboard_access BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can manage team" ON public.team_members;
CREATE POLICY "Public can manage team" ON public.team_members FOR ALL USING (true);
