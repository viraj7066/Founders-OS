-- Phase 32 Migration: Task Calendar Timed Views & Bi-directional Sync
-- This migration adds time fields for the Calendar views and sets up
-- intelligent triggers to keep the Kanban board and Calendar perfectly in sync.

-- 1. Add new columns to tasks
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;

-- 2. Create the Trigger Function for Auto-Sync
-- This keeps the Kanban column assignment perfectly synced with the Calendar Date assignment
CREATE OR REPLACE FUNCTION sync_task_date_and_column()
RETURNS TRIGGER AS $$
DECLARE
    kanban_col TEXT;
    today_date DATE := CURRENT_DATE;
    task_date DATE;
BEGIN
    -- Scenario A: Task Date was changed explicitly (via Calendar / Edit Modal)
    IF NEW.due_date IS DISTINCT FROM OLD.due_date AND NEW.due_date IS NOT NULL THEN
        task_date := NEW.due_date::DATE;
        
        -- Override manual column moves if a strict date was just set
        IF task_date = today_date THEN
            NEW.column_id := 'Today';
        ELSIF task_date = today_date + INTERVAL '1 day' THEN
            NEW.column_id := 'Tomorrow';
        ELSIF task_date > today_date + INTERVAL '1 day' AND task_date <= today_date - EXTRACT(DOW FROM today_date)::INTEGER + 7 THEN
            -- In the future but still this current week (assuming week ends on Sunday)
            NEW.column_id := 'This Week';
        ELSIF task_date < today_date THEN
            -- Date is in the past, keep it where it is or move to Backlog depending on preference, 
            -- but let's assume if they set it to the past intentionally, they know what they are doing.
            -- Actually, let's force overdue stuff to 'Today' so they see it.
            IF NEW.completed_at IS NULL THEN
                NEW.column_id := 'Today';
            END IF;
        ELSE
            -- Way in the future
            NEW.column_id := 'Backlog';
        END IF;

    -- Scenario B: Task Column was changed explicitly (dragged in Kanban board)
    -- We only update date if it was dragged to a relative column like Today/Tomorrow
    ELSIF NEW.column_id IS DISTINCT FROM OLD.column_id THEN
        IF NEW.column_id = 'Today' THEN
            -- If it has a time, keep it. If not, just set the date to today.
            IF NEW.due_date IS NULL OR NEW.due_date::DATE <> today_date THEN
                NEW.due_date := today_date::TIMESTAMPTZ;
            END IF;
        ELSIF NEW.column_id = 'Tomorrow' THEN
            IF NEW.due_date IS NULL OR NEW.due_date::DATE <> today_date + INTERVAL '1 day' THEN
                NEW.due_date := (today_date + INTERVAL '1 day')::TIMESTAMPTZ;
            END IF;
        ELSIF NEW.column_id = 'Backlog' OR NEW.column_id = 'This Week' THEN
            -- If it was dragged back, we could clear the date, but it's safer to leave future dates intact.
            -- Only clear the date if it was originally strictly "Today" or "Tomorrow" to reflect the demotion.
            IF OLD.due_date::DATE = today_date OR OLD.due_date::DATE = today_date + INTERVAL '1 day' THEN
                 NEW.due_date := NULL;
                 NEW.start_time := NULL;
                 NEW.end_time := NULL;
            END IF;
        END IF;
    END IF;

    -- Scenario C: Task was moved to Done
    IF NEW.column_id = 'Done' AND OLD.column_id != 'Done' THEN
        IF NEW.completed_at IS NULL THEN
            NEW.completed_at := NOW();
        END IF;
    -- Scenario D: Task was moved Out of Done
    ELSIF NEW.column_id != 'Done' AND OLD.column_id = 'Done' THEN
        NEW.completed_at := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach trigger to tasks table
DROP TRIGGER IF EXISTS tasks_sync_trigger ON tasks;
CREATE TRIGGER tasks_sync_trigger
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION sync_task_date_and_column();
