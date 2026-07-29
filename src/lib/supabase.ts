import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[PlanningPoker] Supabase credentials not found (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).\n' +
    'The app will work in single-tab mode. To enable multiplayer, add a .env.local file.'
  );
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
