-- Fix Kanban Date Reconciliation Bug
-- Drop the trigger that forces CURRENT_DATE evaluations which conflict with local timezones.
-- The frontend 'getColumnForDate' utility now handles all chronolgoical sorting reliably.
DROP TRIGGER IF EXISTS tasks_sync_trigger ON tasks;
DROP FUNCTION IF EXISTS sync_task_date_and_column;
