-- Phase 21 & 22 Enhancements

-- Update Life Goals to support categories
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='life_goals' AND column_name='category') THEN
        ALTER TABLE public.life_goals ADD COLUMN category TEXT DEFAULT 'General';
    END IF;
END $$;

-- Update Invoices to support folders and advance payments
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='folder_id') THEN
        ALTER TABLE public.invoices ADD COLUMN folder_id UUID REFERENCES public.document_folders(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='advance_received') THEN
        ALTER TABLE public.invoices ADD COLUMN advance_received BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='advance_amount') THEN
        ALTER TABLE public.invoices ADD COLUMN advance_amount DECIMAL DEFAULT 0;
    END IF;
END $$;
