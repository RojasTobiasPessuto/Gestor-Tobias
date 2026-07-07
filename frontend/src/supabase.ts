import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  // Ayuda a detectar env vars faltantes en desarrollo
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el .env del frontend');
}

export const supabase = createClient(url, anonKey);
