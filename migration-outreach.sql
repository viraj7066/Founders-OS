-- Migration SQL for Module 9: Outreach System

-- 0. Create Leads Table (Dependency for Communications)
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


-- 1. Create Scripts Table
CREATE TABLE IF NOT EXISTS public.outreach_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'linkedin', 'email', 'whatsapp'
  content TEXT NOT NULL,
  category TEXT DEFAULT 'cold', -- 'cold', 'follow-up', 'inbound'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.outreach_scripts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can manage scripts" ON public.outreach_scripts;
CREATE POLICY "Public can manage scripts" ON public.outreach_scripts FOR ALL USING (true);


-- 2. Create Campaigns Table
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


-- 3. Create Communications Table (Logging Outreach)
CREATE TABLE IF NOT EXISTS public.communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE, -- Assuming leads table exists from CRM
  
  type TEXT NOT NULL, -- 'email', 'linkedin', 'call', 'meeting'
  direction TEXT DEFAULT 'outbound', -- 'inbound', 'outbound'
  content TEXT, -- Notes or actual message
  
  scheduled_at TIMESTAMP WITH TIME ZONE, -- For future follow-ups
  completed_at TIMESTAMP WITH TIME ZONE, -- If already done
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can manage communications" ON public.communications;
CREATE POLICY "Public can manage communications" ON public.communications FOR ALL USING (true);
