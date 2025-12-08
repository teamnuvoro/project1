const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; 
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseKey);

const userId = "2fca5118-c5fd-4bd7-87e2-4f3b7f208153";

async function demote() {
  console.log("📉 DEMOTING USER TO FREE TIER...");

  const { error } = await supabase
    .from('users')
    .update({ 
        premium_user: false,
        subscription_expiry: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        subscription_plan: 'free'
    })
    .eq('id', userId);

  if (error) {
    console.error("❌ Demotion failed:", error.message);
  } else {
    console.log("✅ SUCCESS: User is now FREE tier.");
    console.log("   Next refresh should trigger Paywall because count is > 20.");
  }
}

demote();
