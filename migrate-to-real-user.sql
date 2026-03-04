-- ROBUST DATA RECOVERY SCRIPT
-- This script moves all "test data" from the fallback account to your real logged-in account.
-- It handles conflicts and ensures foreign keys are satisfied.

DO $$ 
DECLARE 
    real_user_id UUID;
    real_user_email TEXT;
    r RECORD;
BEGIN
    -- 1. Find the first real user (your authenticated account)
    SELECT id, email INTO real_user_id, real_user_email FROM auth.users ORDER BY created_at LIMIT 1;
    
    -- If no user is found, don't do anything
    IF real_user_id IS NULL THEN
        RAISE NOTICE 'No real user found in auth.users. Please log in first.';
        RETURN;
    END IF;

    RAISE NOTICE 'Syncing user to public table: % (%)', real_user_email, real_user_id;

    -- 2. SYNC to public.users first to satisfy foreign keys
    INSERT INTO public.users (id, email, created_at)
    VALUES (real_user_id, real_user_email, now())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

    RAISE NOTICE 'Migrating data to user: %', real_user_id;

    -- 3. Update Focus Tasks
    UPDATE public.focus_tasks 
    SET user_id = real_user_id
    WHERE user_id = '00000000-0000-0000-0000-000000000000';

    -- 4. Map Daily Activities (Requires merging due to unique constraint)
    FOR r IN (SELECT * FROM public.daily_activities WHERE user_id = '00000000-0000-0000-0000-000000000000') LOOP
        INSERT INTO public.daily_activities (user_id, date, instagram_sent, linkedin_sent, whatsapp_sent, updated_at)
        VALUES (real_user_id, r.date, r.instagram_sent, r.linkedin_sent, r.whatsapp_sent, r.updated_at)
        ON CONFLICT (user_id, date) DO UPDATE SET
            instagram_sent = public.daily_activities.instagram_sent + EXCLUDED.instagram_sent,
            linkedin_sent = public.daily_activities.linkedin_sent + EXCLUDED.linkedin_sent,
            whatsapp_sent = public.daily_activities.whatsapp_sent + EXCLUDED.whatsapp_sent,
            updated_at = EXCLUDED.updated_at;

        -- Extract any focus_items from legacy and move them to focus_tasks
        INSERT INTO public.focus_tasks (user_id, text, completed, created_at)
        SELECT 
            real_user_id, 
            (item->>'text')::text, 
            COALESCE((item->>'completed')::boolean, false), 
            r.created_at
        FROM 
            jsonb_array_elements(CASE WHEN jsonb_typeof(r.focus_items) = 'array' THEN r.focus_items ELSE '[]'::jsonb END) AS item
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Delete old activities after merging
    DELETE FROM public.daily_activities WHERE user_id = '00000000-0000-0000-0000-000000000000';

    -- 5. Update Leads
    UPDATE public.leads 
    SET user_id = real_user_id
    WHERE user_id = '00000000-0000-0000-0000-000000000000';

    -- 6. Update Clients
    UPDATE public.clients 
    SET user_id = real_user_id
    WHERE user_id = '00000000-0000-0000-0000-000000000000';

    -- 7. Update other tables that might have legacy data
    UPDATE public.deliverables SET user_id = real_user_id WHERE user_id = '00000000-0000-0000-0000-000000000000';
    UPDATE public.expenses SET user_id = real_user_id WHERE user_id = '00000000-0000-0000-0000-000000000000';
    UPDATE public.invoices SET user_id = real_user_id WHERE user_id = '00000000-0000-0000-0000-000000000000';
    UPDATE public.outreach_scripts SET user_id = real_user_id WHERE user_id = '00000000-0000-0000-0000-000000000000';
    UPDATE public.content_posts SET user_id = real_user_id WHERE user_id = '00000000-0000-0000-0000-000000000000';
    UPDATE public.team_members SET user_id = real_user_id WHERE user_id = '00000000-0000-0000-0000-000000000000';
    UPDATE public.ai_prompts SET user_id = real_user_id WHERE user_id = '00000000-0000-0000-0000-000000000000';

END $$;
