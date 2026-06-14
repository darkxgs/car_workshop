import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function deleteAllSuggestions() {
    console.log("Deleting all suggestions from the database...");
    
    // We can just delete where key is not null (which deletes all)
    const { data, error } = await supabase
        .from('suggestion_lists')
        .delete()
        .neq('key', 'nothing'); // Just a dummy condition to delete all rows

    if (error) {
        console.error("Error deleting suggestions:", error);
    } else {
        console.log("Successfully deleted all suggestions!");
    }
}

deleteAllSuggestions();
