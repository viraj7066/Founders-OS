export function getColumnForDate(dueDate: string | Date | null): 'Today' | 'Tomorrow' | 'This Week' | 'Backlog' | null {
    if (!dueDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Assuming week ends on Sunday or 7 days from now as per provided spec
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    if (due.getTime() === today.getTime()) return 'Today';
    if (due.getTime() === tomorrow.getTime()) return 'Tomorrow';
    if (due > today && due <= weekEnd) return 'This Week';
    if (due < today) return 'Backlog'; // overdue
    return 'Backlog'; // beyond this week
}
