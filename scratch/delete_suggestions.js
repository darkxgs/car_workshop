const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAllSuggestions() {
    console.log("Deleting all suggestions from the database...");
    
    // Select all IDs
    const { data, error } = await supabase.from('suggestion_lists').select('id');
    if (error) {
        console.error("Error fetching suggestions:", error);
        return;
    }

    if (data.length === 0) {
        console.log("Database is already empty.");
        return;
    }

    const ids = data.map(d => d.id);
    const { error: delError } = await supabase.from('suggestion_lists').delete().in('id', ids);

    if (delError) {
        console.error("Error deleting suggestions:", delError);
    } else {
        console.log(`Successfully deleted ${ids.length} lists of suggestions!`);
    }
}

deleteAllSuggestions();
