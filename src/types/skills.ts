export type SkillCategory = 'Tech' | 'Creative' | 'Soft Skill' | 'Other';
export type SkillStatus = 'Wishlist' | 'Learning' | 'Mastered';

export interface Skill {
    id: string;
    user_id: string;
    name: string;
    category: SkillCategory;
    status: SkillStatus;
    progress: number;
    primary_resource: string | null;
    next_action: string | null;
    time_goal: string | null;
    streak: number;
    last_practiced_at: string | null;
    created_at: string;
    updated_at: string;
}
