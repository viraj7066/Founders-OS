-- FOUNDERS OS COMPLETE DATABASE MIGRATION (11 TABLES)
-- Run this entire script in your Supabase SQL Editor to set up all tables for all modules built so far.

-- 1. Create a public users table
-- We create this so foreign keys work. This is usually managed by Supabase Auth,
-- but we are creating a dummy user here so local development bypasses work.
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert the dummy local development user so foreign keys don't fail
INSERT INTO public.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000000', 'dev@example.com')
ON CONFLICT (id) DO NOTHING;

-- 2. Create Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'at-risk', 'churned'
  health_score INT DEFAULT 100, -- 0-100
  mrr DECIMAL(10,2) DEFAULT 0,
  
  email TEXT,
  phone TEXT,
  notes TEXT,
  
  onboarded_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can manage clients" ON public.clients;
CREATE POLICY "Public can manage clients" ON public.clients FOR ALL USING (true);


-- 3. Create Deliverables Table
CREATE TABLE IF NOT EXISTS public.deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  
  project_name TEXT NOT NULL,
  service_type TEXT,
  
  total_deliverables INT,
  completed_deliverables INT DEFAULT 0,
  deliverable_list JSONB, -- Array of {name, status, file_url}
  
  date_assigned DATE,
  due_date TIMESTAMP WITH TIME ZONE,
  
  assigned_to TEXT, -- You, VA, Contractor
  assignee_name TEXT,
  
  client_notes TEXT,
  
  title TEXT, -- Kept for backwards compatibility with earlier files if needed
  status TEXT DEFAULT 'pending', -- 'pending', 'in-progress', 'review', 'completed'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can manage deliverables" ON public.deliverables;
CREATE POLICY "Public can manage deliverables" ON public.deliverables FOR ALL USING (true);


-- 4. Create Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'new',
  value DECIMAL(10,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can manage leads" ON public.leads;
CREATE POLICY "Public can manage leads" ON public.leads FOR ALL USING (true);


-- 5. Create Outreach Scripts Table
CREATE TABLE IF NOT EXISTS public.outreach_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  title TEXT, -- from newer schemas
  name TEXT,  -- from older schemas
  category TEXT, 
  target_audience TEXT, 
  platform TEXT, 
  
  content TEXT, -- from newer schemas
  script_text TEXT, -- from older schemas
  images_to_attach JSONB, 
  
  times_sent INT DEFAULT 0,
  replies_received INT DEFAULT 0,
  reply_rate DECIMAL(5,2),
  conversions INT DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  revenue_generated DECIMAL(10,2),
  
  is_proven_winner BOOLEAN DEFAULT FALSE,
  last_ab_test_date DATE,
  best_performing_day TEXT,
  best_performing_time TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure we have fields populated if they exist in either variation
CREATE OR REPLACE FUNCTION populate_outreach_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.title IS NULL AND NEW.name IS NOT NULL THEN
    NEW.title := NEW.name;
  ELSIF NEW.name IS NULL AND NEW.title IS NOT NULL THEN
    NEW.name := NEW.title;
  END IF;
  
  IF NEW.content IS NULL AND NEW.script_text IS NOT NULL THEN
    NEW.content := NEW.script_text;
  ELSIF NEW.script_text IS NULL AND NEW.content IS NOT NULL THEN
    NEW.script_text := NEW.content;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_populate_outreach_fields ON public.outreach_scripts;
CREATE TRIGGER trg_populate_outreach_fields
BEFORE INSERT OR UPDATE ON public.outreach_scripts
FOR EACH ROW EXECUTE FUNCTION populate_outreach_fields();

ALTER TABLE public.outreach_scripts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can manage scripts" ON public.outreach_scripts;
CREATE POLICY "Public can manage scripts" ON public.outreach_scripts FOR ALL USING (true);


-- 6. Create Campaigns Table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed'
  target_audience TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can manage campaigns" ON public.campaigns;
CREATE POLICY "Public can manage campaigns" ON public.campaigns FOR ALL USING (true);


-- 7. Create Communications Table
CREATE TABLE IF NOT EXISTS public.communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL, -- 'email', 'linkedin', 'call', 'meeting'
  direction TEXT DEFAULT 'outbound', -- 'inbound', 'outbound'
  content TEXT, 
  
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can manage communications" ON public.communications;
CREATE POLICY "Public can manage communications" ON public.communications FOR ALL USING (true);


-- 8. Create AI Prompts Table (Module 6)
CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  category TEXT, -- Food, Fashion, Eyewear, etc.
  prompt_text TEXT NOT NULL,
  
  settings JSONB, -- {aspect_ratio, stylize, chaos, version, style}
  thumbnail_url TEXT,
  result_images JSONB, -- Array of URLs
  
  times_used INT DEFAULT 0,
  success_rate DECIMAL(5,2),
  avg_client_rating DECIMAL(3,2),
  last_used DATE,
  
  tags JSONB, -- Array of strings
  is_favorite BOOLEAN DEFAULT FALSE,
  is_proven_winner BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can manage prompts" ON public.ai_prompts;
CREATE POLICY "Public can manage prompts" ON public.ai_prompts FOR ALL USING (true);


-- 9. Create Content Posts Table (Module 7)
CREATE TABLE IF NOT EXISTS public.content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  platform TEXT, -- Instagram, LinkedIn, etc.
  status TEXT, -- Idea, Draft, Scheduled, Published
  
  caption TEXT,
  content_type TEXT, -- Single_Image, Carousel, Reel, etc.
  topic TEXT, -- Case_Study, Tutorial, etc.
  
  asset_links JSONB, -- Array of URLs
  canva_link TEXT,
  
  hashtags JSONB, -- Array of strings
  target_audience TEXT,
  
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


-- 10. Create Team Members Table (Module 8)
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  role TEXT, -- Founder, VA, Freelancer
  email TEXT,
  phone TEXT,
  status TEXT, -- Active, Inactive, On_Leave
  
  rate_type TEXT, -- Hourly, Per_Deliverable, Fixed_Monthly
  rate_amount DECIMAL(10,2),
  
  tasks_assigned INT DEFAULT 0,
  tasks_completed INT DEFAULT 0,
  quality_score DECIMAL(3,2),
  
  dashboard_access BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can manage team" ON public.team_members;
CREATE POLICY "Public can manage team" ON public.team_members FOR ALL USING (true);


-- 11. Create Follow Ups Table (Module 9)
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  
  follow_up_number INT, -- 1, 2, 3
  due_date DATE NOT NULL,
  status TEXT, -- Pending, Sent, Snoozed, Skipped
  sent_date TIMESTAMP WITH TIME ZONE,
  script_used UUID REFERENCES public.outreach_scripts(id),
  
  response_received BOOLEAN DEFAULT FALSE,
  response_text TEXT,
  next_action TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can manage followups" ON public.follow_ups;
CREATE POLICY "Public can manage followups" ON public.follow_ups FOR ALL USING (true);
