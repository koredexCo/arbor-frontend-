import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — auth will not work.'
  );
}

export const supabase = createClient(
  supabaseUrl ?? 'http://127.0.0.1:54321',
  supabaseAnonKey ?? 'dummy_key_to_prevent_crash'
);
