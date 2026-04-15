-- Phase 34: Client Service Field
-- Adds a new service classification field to track specific deliverables

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS service TEXT;
