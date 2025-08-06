// const { createClient } = require('@supabase/supabase-js');

// const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseKey = process.env.SUPABASE_KEY;

// const supabase = createClient(supabaseUrl, supabaseKey);

// module.exports = supabase;


const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    db: {
      schema: 'public' // Explicitly set schema
    },
    auth: {
      persistSession: true
    }
  }
);