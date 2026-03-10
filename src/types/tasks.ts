export type TaskPriority = 'High' | 'Medium' | 'Low';
export type TaskColumn = 'Backlog' | 'This Week' | 'Today' | 'In Progress' | 'Tomorrow' | 'Done';
export type RecurringFrequency = 'Daily' | 'Weekly' | 'Custom';

export interface Subtask {
    id: string;
    title: string;
    completed: boolean;
}

export interface Task {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    priority: TaskPriority;
    due_date: string | null;
    start_time: string | null;
    end_time: string | null;
    tags: string[];
    time_estimate: string | null;
    subtasks: Subtask[];
    is_recurring: boolean;
    recurring_frequency: RecurringFrequency | null;
    notes: string | null;
    column_id: TaskColumn;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface TaskStats {
    user_id: string;
    current_streak: number;
    highest_streak: number;
    last_completed_date: string | null;
    created_at: string;
    updated_at: string;
}
