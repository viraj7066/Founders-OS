// Get today's date as YYYY-MM-DD in local timezone
export function getTodayString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Get tomorrow's date as YYYY-MM-DD in local timezone  
export function getTomorrowString(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Get end of current week as YYYY-MM-DD
export function getWeekEndString(): string {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Determine correct Kanban column for a due_date string
export function getColumnForDate(dueDateString: string | null): 'Today' | 'Tomorrow' | 'This Week' | 'Backlog' | 'Done' | 'In Progress' | null {
    if (!dueDateString) return 'Backlog';

    // Ensure we strip off any accidental ISO timestamps that might slip in through the DB
    const cleanDate = typeof dueDateString === 'string' ? dueDateString.split('T')[0] : getTodayString()

    const today = getTodayString();
    const tomorrow = getTomorrowString();
    const weekEnd = getWeekEndString();

    if (cleanDate === today) return 'Today';
    if (cleanDate === tomorrow) return 'Tomorrow';
    if (cleanDate > today && cleanDate <= weekEnd) return 'This Week';
    if (cleanDate < today) return 'Backlog'; // past date is treated as overdue/backlog in the math layer
    return 'Backlog'; // beyond this week
}

// Parse YYYY-MM-DD safely without timezone shift
export function parseLocalDate(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // local timezone, no UTC conversion
}
