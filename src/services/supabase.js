import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Replace these with actual Supabase project credentials in production
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vpeucybxopjjhvliquwd.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_AYuGWiKljiVJrnPMz1_thQ_Iz3xRbC4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
