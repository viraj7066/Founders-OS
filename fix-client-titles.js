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

for (const [filePath, title] of Object.entries(pageTitles)) {
    const fullPath = path.resolve(__dirname, filePath);
    if (!fs.existsSync(fullPath)) continue;

    let content = fs.readFileSync(fullPath, 'utf-8');

    // If this is a client component AND it has our exported metadata...
    if (content.includes("'use client'") || content.includes('"use client"')) {
        if (content.includes('export const metadata = {') || content.includes('export const metadata:')) {

            // 1. Remove the metadata block
            const metaRegex = /export const metadata(?:.*?)\s*=\s*\{[\s\S]*?\}\s*(;?)/;
            content = content.replace(metaRegex, '');

            // 2. Make sure React.useEffect is imported if not React
            if (!content.includes('import React') && !content.includes('import { useEffect')) {
                content = content.replace(/(import .*?)(\n)/, `$1\nimport { useEffect } from 'react'\n`);
            }

            // 3. Insert useEffect inside the default export component
            // Assuming `export default function Something() {`
            const compRegex = /export default (?:async )?function\s+\w+\(.*?\)\s*\{/;
            content = content.replace(compRegex, (match) => {
                return match + `\n  useEffect(() => { document.title = '${title}'; }, [])\n`;
            });

            fs.writeFileSync(fullPath, content);
            console.log(`Migrated Use Client metadata for: ${filePath}`);
        }
    }
}
