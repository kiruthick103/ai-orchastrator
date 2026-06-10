const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "⚠️ SUPABASE_URL or SUPABASE_ANON_KEY not set. Database features will not work."
  );
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
}

module.exports = supabase;
