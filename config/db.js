const { createClient } = require('@supabase/supabase-js');

// Check if environment variables exist
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error(
    'Supabase URL and Key must be provided in environment variables'
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    auth: {
      persistSession: false // Recommended for server-side usage
    }
  }
);

module.exports = supabase;




// const { createClient } = require('@supabase/supabase-js');

// const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseKey = process.env.SUPABASE_KEY;

// const supabase = createClient(supabaseUrl, supabaseKey);

// module.exports = supabase;