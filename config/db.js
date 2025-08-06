// config/db.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;

// Use service role key for admin operations
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Changed from regular key

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false // Recommended for server-side usage
  }
});

module.exports = supabase;




// const { createClient } = require('@supabase/supabase-js');

// const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseKey = process.env.SUPABASE_KEY;

// const supabase = createClient(supabaseUrl, supabaseKey);

// module.exports = supabase;