import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xgraxcgavqeyqfwimbwt.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// In production, VITE_SUPABASE_ANON_KEY is required
if (import.meta.env.PROD && !supabaseAnonKey) {
  console.error('[Supabase] ERROR: VITE_SUPABASE_ANON_KEY is required in production');
}

// In development, use mock key if not provided
const anonKey = supabaseAnonKey || 'mock-anon-key-for-development';

export const supabase = createClient(supabaseUrl, anonKey);

// Flag to check if Supabase is properly configured
export const isSupabaseConfigured = !!supabaseAnonKey;

export type PersonaType = 'sweet_supportive' | 'playful_flirty' | 'bold_confident' | 'calm_mature';
export type GenderType = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface User {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  gender: GenderType;
  persona: PersonaType;
  persona_prompt?: Record<string, any>;
  premium_user: boolean;
  registration_date: string;
  locale: string;
  created_at: string;
  updated_at: string;
}

export interface UserSummaryLatest {
  user_id: string;
  partner_type_one_liner?: string;
  top_3_traits_you_value?: string[];
  what_you_might_work_on?: string[];
  next_time_focus?: string[];
  love_language_guess?: string;
  communication_fit?: string;
  confidence_score?: number;
  updated_at: string;
}

export const PERSONA_CONFIGS = {
  sweet_supportive: {
    name: 'Riya',
    description: 'The Caring Listener',
    tagline: 'Soft, gentle, empathetic, non-judgmental',
    greeting: 'Hi… main Riya hoon. Tumse milkar accha laga.',
    color: 'from-pink-400 to-rose-500',
    icon: '💕'
  },
  playful_flirty: {
    name: 'Meera',
    description: 'The Light-Hearted Best Friend',
    tagline: 'Fun, teasing, energetic, humorous',
    greeting: 'Hiii! Main Meera. Ready for some fun?',
    color: 'from-purple-400 to-pink-500',
    icon: '✨'
  },
  bold_confident: {
    name: 'Aisha',
    description: 'The Independent Girl',
    tagline: 'Strong, straightforward, expressive, motivating',
    greeting: "Hey, main Aisha hoon. Let's talk!",
    color: 'from-orange-400 to-red-500',
    icon: '💪'
  },
  calm_mature: {
    name: 'Kavya',
    description: 'The Understanding Soul',
    tagline: 'Thoughtful, grounding, emotionally stable',
    greeting: 'Namaste… main Kavya.',
    color: 'from-teal-400 to-cyan-500',
    icon: '🌿'
  }
};

export default supabase;
