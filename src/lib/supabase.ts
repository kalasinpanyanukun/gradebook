import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add both environment variables in Vercel and redeploy.'
    : null;

function createMissingSupabaseClient(): ReturnType<typeof createClient> {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(supabaseConfigError ?? 'Supabase is not configured.');
      },
    },
  ) as ReturnType<typeof createClient>;
}

export const supabase = supabaseConfigError
  ? createMissingSupabaseClient()
  : createClient(supabaseUrl, supabaseAnonKey);
