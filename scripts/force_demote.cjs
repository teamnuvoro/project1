const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; 
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseKey);

const userId = "2fca5118-c5fd-4bd7-87e2-4f3b7f208153";

async function forceDemote() {
  console.log("📉 FORCE DEMOTING USER...");

  // 1. Set flags to FALSE and expiry to ANCIENT HISTORY
  const { error } = await supabase
    .from('users')
    .update({ 
        premium_user: false,
        subscription_expiry: '2000-01-01T00:00:00Z', 
        subscription_plan: 'free'
    })
    .eq('id', userId);

  if (error) {
    console.error("❌ Demotion failed:", error.message);
  } else {
    console.log("✅ SUCCESS: User demoted to Free.");
  }
  
  // 2. Verify State
  const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
  console.log("�� Verification State:", {
      premium_user: user.premium_user,
      expiry: user.subscription_expiry,
      plan: user.subscription_plan
  });
}

forceDemote();
