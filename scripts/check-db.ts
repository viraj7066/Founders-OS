import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function main() {
    const { data, error } = await supabase.from('tasks').select('id, title, due_date, column_id').order('created_at', { ascending: false }).limit(5)
    console.dir(data, { depth: null })
}

main()
