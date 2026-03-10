const fs = require('fs');
const path = require('path');

const pageTitles = {
    'src/app/page.tsx': 'Venture Deck',
    'src/app/login/page.tsx': 'Login',
    'src/app/dashboard/page.tsx': 'Dashboard',
    'src/app/dashboard/calendar/page.tsx': 'Task Calendar',
    'src/app/dashboard/clients/page.tsx': 'Client Management',
    'src/app/dashboard/content/page.tsx': 'Content Calendar',
    'src/app/dashboard/contracts/page.tsx': 'Contracts',
    'src/app/dashboard/deliverables/page.tsx': 'Deliverables',
    'src/app/dashboard/financials/page.tsx': 'Financials',
    'src/app/dashboard/inspiration/page.tsx': 'Moodboard',
    'src/app/dashboard/invoices/page.tsx': 'Invoices',
    'src/app/dashboard/outreach/page.tsx': 'Outreach Tracking',
    'src/app/dashboard/pipeline/page.tsx': 'CRM Pipeline',
    'src/app/dashboard/settings/page.tsx': 'Settings',
    'src/app/dashboard/skills/page.tsx': 'Skills Tracker',
    'src/app/dashboard/team/page.tsx': 'Team Directory',
    'src/app/dashboard/tracker/page.tsx': 'Daily Tracker',
    'src/app/dashboard/vault/page.tsx': 'Vault',
};

// 1. Static Metadata Updates
for (const [filePath, title] of Object.entries(pageTitles)) {
    const fullPath = path.resolve(__dirname, filePath);
    if (!fs.existsSync(fullPath)) {
        console.warn(`File not found: ${fullPath}`);
        continue;
    }

    let content = fs.readFileSync(fullPath, 'utf-8');

    // If already has metadata, replace title
    if (content.includes('export const metadata = {') || content.includes('export const metadata: Metadata = {') || content.includes('export const metadata:')) {
        content = content.replace(/title:\s*['"`].*?['"`]/, `title: '${title}'`);
    } else {
        // Find last import
        const lines = content.split('\n');
        let lastImportIdx = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('import ') && !lines[i].includes('export ')) {
                lastImportIdx = i;
            }
        }

        const metadataBlock = `\nexport const metadata = {\n  title: '${title}',\n}\n`;

        if (lastImportIdx !== -1) {
            lines.splice(lastImportIdx + 1, 0, metadataBlock);
            content = lines.join('\n');
        } else {
            content = metadataBlock + content;
        }
    }

    // Remove Description if it exists (since user said just module name)
    content = content.replace(/\n\s*description:\s*['"`].*?['"`],?/g, '');

    fs.writeFileSync(fullPath, content);
    console.log(`Updated static metadata for: ${filePath}`);
}

// 2. Dynamic Metadata Update for Moodboard Detail
const dynamicPath = path.resolve(__dirname, 'src/app/dashboard/inspiration/[boardId]/page.tsx');
if (fs.existsSync(dynamicPath)) {
    let content = fs.readFileSync(dynamicPath, 'utf-8');
    if (!content.includes('generateMetadata')) {
        const metadataBlock = `
export async function generateMetadata({ params }: { params: { boardId: string } }) {
    const supabase = await createClient();
    const { data } = await supabase.from('moodboards').select('name').eq('id', params.boardId).single();
    return {
        title: data?.name || 'Moodboard'
    };
}
`;
        // Insert after imports
        const lines = content.split('\n');
        let lastImportIdx = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('import ') && !lines[i].includes('export ')) {
                lastImportIdx = i;
            }
        }
        lines.splice(lastImportIdx + 1, 0, metadataBlock);
        fs.writeFileSync(dynamicPath, lines.join('\n'));
        console.log(`Updated dynamic metadata for: src/app/dashboard/inspiration/[boardId]/page.tsx`);
    } else {
        // Just verify it uses data?.name || 'Moodboard' -- mostly unlikely to exist based on grep
    }
}

// 3. Document.title in TaskCalendarModule
const calendarModulePath = path.resolve(__dirname, 'src/components/tasks/task-calendar-module.tsx');
if (fs.existsSync(calendarModulePath)) {
    let content = fs.readFileSync(calendarModulePath, 'utf-8');
    if (!content.includes('document.title =')) {
        // Insert inside the component 
        // We know it has `const [activeTab, setActiveTab]`
        content = content.replace(
            /const \[(activeTab.*?)\] = useState.*?\n/s,
            `$&    useEffect(() => {\n        document.title = activeTab === 'Kanban' ? 'Task Calendar' : 'Calendar';\n    }, [activeTab]);\n`
        );
        fs.writeFileSync(calendarModulePath, content);
        console.log(`Updated client document.title for TaskCalendarModule`);
    }
}
