-- Phase 35: Asset Vault Folders + Files + Invoice Number
-- Run this ENTIRE block in your Supabase SQL editor

-- ─────────────────────────────────────────────────────────────
-- 1. Add invoice_number column to invoices
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- ─────────────────────────────────────────────────────────────
-- 2. Create asset_folders table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asset_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'asset',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.asset_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own asset folders" ON public.asset_folders;
CREATE POLICY "Users can manage their own asset folders"
    ON public.asset_folders FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 3. Create asset_files table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asset_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID NOT NULL REFERENCES public.asset_folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    size BIGINT,
    type TEXT,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.asset_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own asset files" ON public.asset_files;
CREATE POLICY "Users can manage their own asset files"
    ON public.asset_files FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 4. Create 'assets' Storage Bucket (if not exists)
-- ─────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ─────────────────────────────────────────────────────────────
-- 5. Storage RLS Policies for 'assets' bucket
-- ─────────────────────────────────────────────────────────────

-- Allow authenticated users to upload their own files
DROP POLICY IF EXISTS "Authenticated users can upload their vault files" ON storage.objects;
CREATE POLICY "Authenticated users can upload their vault files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'assets'
        AND (storage.foldername(name))[1] = 'vault'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

-- Allow users to read their own files
DROP POLICY IF EXISTS "Users can read their own vault files" ON storage.objects;
CREATE POLICY "Users can read their own vault files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'assets'
        AND (storage.foldername(name))[1] = 'vault'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

-- Allow public read (for public URLs to work)
DROP POLICY IF EXISTS "Public can read vault files" ON storage.objects;
CREATE POLICY "Public can read vault files"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'assets');

-- Allow users to delete their own files
DROP POLICY IF EXISTS "Users can delete their own vault files" ON storage.objects;
CREATE POLICY "Users can delete their own vault files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'assets'
        AND (storage.foldername(name))[1] = 'vault'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

-- Allow users to update their own files
DROP POLICY IF EXISTS "Users can update their own vault files" ON storage.objects;
CREATE POLICY "Users can update their own vault files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'assets'
        AND (storage.foldername(name))[1] = 'vault'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 36: Invoice Revenue Tracking — advance_collected column
-- Tracks whether the advance button was clicked for an invoice
-- Prevents double-counting when invoice is later marked as Paid
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS advance_collected BOOLEAN DEFAULT FALSE;

