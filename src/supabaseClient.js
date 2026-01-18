
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Diagnostic logging (Length only, no secrets leaked)
console.log('🔍 Supabase URL present:', !!supabaseUrl, supabaseUrl ? `(Length: ${supabaseUrl.length})` : '');
console.log('🔍 Supabase Key present:', !!supabaseAnonKey, supabaseAnonKey ? `(Length: ${supabaseAnonKey.length})` : '');

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase credentials missing! Please check your Vercel Environment Variables.');
}

// Initialize with a fallback or empty strings to prevent uncaught constructor error
export const supabase = createClient(
    supabaseUrl || 'https://placeholder-url.supabase.co',
    supabaseAnonKey || 'placeholder-key'
)
