-- Run this in your Supabase SQL Editor
-- Creates table for Document Folders

CREATE TABLE IF NOT EXISTS public.document_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('invoice', 'contract')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can manage document folders" ON public.document_folders;
CREATE POLICY "Public can manage document folders" ON public.document_folders FOR ALL USING (true);

-- Add folder_id to invoices if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='folder_id') THEN
        ALTER TABLE public.invoices ADD COLUMN folder_id UUID REFERENCES public.document_folders(id) ON DELETE SET NULL;
    END IF;
END
$$;

-- Add folder_id to contracts if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contracts' AND column_name='folder_id') THEN
        ALTER TABLE public.contracts ADD COLUMN folder_id UUID REFERENCES public.document_folders(id) ON DELETE SET NULL;
    END IF;
END
$$;
