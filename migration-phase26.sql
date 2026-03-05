-- Phase 26: Inspiration Board Architecture

-- 1. Modify document_folders constraint to allow 'inspiration' type
ALTER TABLE public.document_folders DROP CONSTRAINT IF EXISTS document_folders_type_check;
ALTER TABLE public.document_folders ADD CONSTRAINT document_folders_type_check CHECK (type IN ('invoice', 'contract', 'inspiration'));

-- 2. Create inspiration_boards table
CREATE TABLE IF NOT EXISTS public.inspiration_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    canvas_state JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.inspiration_boards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can manage inspiration boards" ON public.inspiration_boards;
CREATE POLICY "Public can manage inspiration boards" ON public.inspiration_boards FOR ALL USING (true);

-- 3. Storage Bucket for Inspiration Assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('inspiration_assets', 'inspiration_assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Inspiration Assets Access" ON storage.objects;
CREATE POLICY "Public Inspiration Assets Access" ON storage.objects FOR ALL USING (bucket_id = 'inspiration_assets');
