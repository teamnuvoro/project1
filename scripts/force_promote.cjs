const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; 
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseKey);

const userId = "2fca5118-c5fd-4bd7-87e2-4f3b7f208153"; // Your ID

async function forcePromote() {
  console.log("🚀 FORCE PROMOTING USER (Manual Admin Override)...");

  // Grant 7 Days Access
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const { error } = await supabase
    .from('users')
    .update({ 
        premium_user: true,
        subscription_expiry: nextWeek.toISOString(), 
        subscription_plan: 'weekly'
    })
    .eq('id', userId);

  if (error) {
    console.error("❌ Promotion failed:", error.message);
  } else {
    console.log("✅ SUCCESS: User promoted to PREMIUM (Weekly).");
    console.log("   Expiry set to:", nextWeek.toISOString());
  }
}

forcePromote();
