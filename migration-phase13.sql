-- Phase 13 Migration: Add Service Field to Leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS service TEXT;
