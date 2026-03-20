require('dotenv').config({ path: '../backend/.env' });
const fetch = require('node-fetch') || global.fetch; // Node 18+ has global fetch

async function checkHistory() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing supabase credentials", process.env.SUPABASE_URL);
        return;
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/generations?select=id,description,provider,estimated_cost,created_at,user_id,parent_id,org_id&order=created_at.desc&limit=5`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });

    const data = await res.json();
    console.log("Generations data:", JSON.stringify(data, null, 2));
}

checkHistory();
