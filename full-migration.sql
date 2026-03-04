-- FOUNDERS OS COMPLETE DATABASE MIGRATION
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
  
  title TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'in-progress', 'review', 'completed'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  due_date DATE,
  assigned_to TEXT,
  
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
  
  title TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'linkedin', 'email', 'whatsapp', 'instagram'
  content TEXT NOT NULL,
  category TEXT DEFAULT 'cold', -- 'cold', 'follow-up', 'inbound'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
