
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkPolicies() {
    const { data, error } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'users');

    // Note: pg_policies is a system view. accessing it via API might fail unless exposed.
    // Usually it's NOT exposed.

    if (error) {
        console.log("Cannot read pg_policies via API (Expected). Error:", error);
    } else {
        console.log("Policies:", data);
    }
}

// Alternative: Check if we can select from 'users' as 'anon' (should fail) vs 'service_role' (succeeds).
async function checkAccess() {
    console.log("Checking Service Role Access...");
    const { data: sData, error: sError } = await supabase.from('users').select('*').limit(1);
    if (sError) console.error("Service Role Error:", sError);
    else console.log("Service Role Success:", sData?.length, "rows");

    // Try creating a client with Anon Key (if available in env, usually not in backend env vars?)
    // I can use the one from client/lib/supabase.ts if I knew it.
    // I'll skip anon check for now.
}

checkAccess();
