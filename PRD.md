# Founder's OS — Product Requirements Document (PRD)

## Overview
Founder's OS is an agency command center built with Next.js 14 (App Router), Supabase, and Tailwind CSS. It helps solo founders and agency owners manage their entire business from one dashboard.

**Base URL (local):** http://localhost:3000

---

## Authentication
- Login page at `/login`
- Uses Supabase Auth
- Successful login redirects to `/dashboard`
- Unauthenticated requests to `/dashboard/*` redirect to `/login`

---

## Modules & Pages

### 1. Home Dashboard (`/dashboard`)
- Shows personalized greeting based on time of day
- 6 KPI cards: Monthly Revenue, Pipeline Leads, Deliverables, Content This Week, Asset Vault, Team Members
- Alert banners appear when clients are at-risk or deliverables are overdue
- Today's Focus to-do section — add, check off, delete tasks — syncs with Supabase `daily_activities.focus_items`
- 8-tile module quick-access grid
- Recent Activity strip with leads, deliverables, content

### 2. Daily Tracker (`/dashboard/tracker`)
- Today's Focus checklist — add tasks, check off with strikethrough, delete
- Outreach Volume counters — Instagram, LinkedIn, WhatsApp with progress bars and +1 buttons
- Active Follow-up Triggers table — add new follow-ups (name, company, action, due time), mark as done (removes row)

### 3. CRM Pipeline (`/dashboard/pipeline`)
- Kanban board with stages: New, Contacted, Proposal, Negotiation, Won, Lost
- Drag-and-drop leads between columns
- "Add Lead" button opens dialog: name, company, email, phone, value, stage
- Click lead card to edit all fields

### 4. Financials (`/dashboard/financials`)
- MRR progress bar toward ₹10L goal
- Revenue breakdown table
- Invoice tracker

### 5. Deliverables (`/dashboard/deliverables`)
- List of active tasks across all clients
- Status toggle: pending → in-progress → completed
- Filter tabs by status
- Create new deliverables via dialog

### 6. Clients (`/dashboard/clients`)
- Client list with filter tabs: All, Active, At-Risk, Churned
- "New Client" button opens dialog: name, business, email, phone, MRR, status, service type
- Click client card to open detail modal with tabs: Overview, Deliverables, Communications, Financials

### 7. Content Calendar (`/dashboard/content`)
- Post cards with platform icon, status badge, content type
- Stats row: Total Posts, Scheduled, Published, High Performers
- Filter tabs by status: All, Idea, Draft, Scheduled, Published
- Inline status dropdown on each card
- Create/Edit/Delete posts via dialog: title, platform, status, content type, date, topic, caption, Canva link

### 8. Asset Vault (`/dashboard/vault`)
- AI Prompt cards with category badge, Proven Winner tag
- Filter tabs by category + Favorites tab
- One-click copy to clipboard
- Add/Edit/Delete prompts via dialog
- Custom category option in dropdown

### 9. Outreach Scripts (`/dashboard/outreach`)
- Scripts library with copy functionality
- Active campaigns view
- Follow-up queue

### 10. Team & Delegation (`/dashboard/team`)
- Member cards with avatar initials, role badge, task progress bar, quality score
- Stats row: Total Members, Active, On Leave, Monthly Cost
- Filter tabs by role: All, VA, Freelancer, Contractor, Founder
- Add/Edit/Delete members via dialog: name, role, email, phone, status, rate type, rate amount, tasks assigned/completed, quality score

---

## Key User Flows to Test

### Flow 1: New Client Creation
1. Navigate to `/dashboard/clients`
2. Click "New Client"
3. Fill in: name, email, MRR, status=active
4. Click Save — client appears in list

### Flow 2: CRM Lead Management
1. Navigate to `/dashboard/pipeline`
2. Click "Add Lead"
3. Fill form and save
4. Drag lead from "New" column to "Proposal"

### Flow 3: Vault Prompt Saved and Copied
1. Navigate to `/dashboard/vault`
2. Click "New Prompt"
3. Fill title, select category, write prompt text
4. Save → prompt card appears
5. Click Copy → toast shows "Prompt copied to clipboard!"

### Flow 4: Today's Focus Sync
1. Navigate to `/dashboard`
2. Add a task in "Today's Focus" widget
3. Navigate to `/dashboard/tracker`
4. Verify the task appears in "Today's Focus" section there too

### Flow 5: Content Post Creation
1. Navigate to `/dashboard/content`
2. Click "New Post"
3. Fill title, select platform=Instagram, status=Draft
4. Save → card appears in grid

### Flow 6: Team Member Added
1. Navigate to `/dashboard/team`
2. Click "Add Member"
3. Fill name, role=VA, email, rate=Fixed Monthly, amount
4. Save → member card appears with initials avatar

---

## Database Tables (Supabase)
- `users` — base user record
- `clients` — agency clients
- `leads` — CRM pipeline leads
- `deliverables` — project tasks
- `outreach_scripts` — scripts library
- `campaigns` — outreach campaigns
- `communications` — client comms log
- `ai_prompts` — vault prompts
- `content_posts` — content calendar
- `team_members` — team management
- `daily_activities` — daily tracker data (focus_items JSONB)

---

## Tech Stack
- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **State:** React useState/useEffect
- **Icons:** lucide-react
- **Toasts:** sonner
- **Dates:** date-fns
