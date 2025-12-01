import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://xgraxcgavqeyqfwimbwt.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isProduction = process.env.NODE_ENV === 'production';

// In production, SUPABASE_SERVICE_ROLE_KEY is required
if (isProduction && !supabaseServiceKey) {
  console.error('[Supabase] ERROR: SUPABASE_SERVICE_ROLE_KEY is required in production');
  process.exit(1);
}

// In development, warn but continue with mock data
if (!isProduction && !supabaseServiceKey) {
  console.warn('[Supabase] Warning: SUPABASE_SERVICE_ROLE_KEY not set - using mock data for development');
}

// Create client with service key (will be empty string in dev without key, but that's handled by error handlers)
export const supabase = createClient(supabaseUrl, supabaseServiceKey || 'mock-key-for-development', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Flag to check if Supabase is properly configured
export const isSupabaseConfigured = !!supabaseServiceKey;

export type PersonaType = 'sweet_supportive' | 'playful_flirty' | 'bold_confident' | 'calm_mature';
export type GenderType = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type SessionType = 'chat' | 'call';
export type MessageRole = 'user' | 'ai';
export type PlanType = 'daily' | 'weekly';
export type PaymentStatus = 'pending' | 'success' | 'failed';

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

export interface Session {
  id: string;
  user_id: string;
  type: SessionType;
  started_at: string;
  ended_at?: string;
  partner_type_one_liner?: string;
  top_3_traits_you_value?: string[];
  what_you_might_work_on?: string[];
  next_time_focus?: string[];
  love_language_guess?: string;
  communication_fit?: string;
  confidence_score?: number;
  persona_snapshot?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  user_id: string;
  role: MessageRole;
  tag: 'general' | 'evaluation';
  text: string;
  created_at: string;
}

export interface UsageStats {
  user_id: string;
  total_messages: number;
  total_call_seconds: number;
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
    greeting: 'Hi… main Riya hoon. Tumse milkar accha laga. Tumhara naam kya hai?',
    traits: ['Soft', 'Gentle', 'Empathetic', 'Non-judgmental'],
    style: 'warm and nurturing',
    hindiMix: 0.4
  },
  playful_flirty: {
    name: 'Meera',
    description: 'The Light-Hearted Best Friend',
    greeting: 'Hiii! Main Meera. Pehle toh batao… tumhara naam kya hai, mister?',
    traits: ['Fun', 'Teasing', 'Energetic', 'Humorous'],
    style: 'playful and flirty',
    hindiMix: 0.35
  },
  bold_confident: {
    name: 'Aisha',
    description: 'The Independent Girl',
    greeting: "Hey, main Aisha hoon. Let's start simple — tumhara naam kya hai?",
    traits: ['Strong', 'Straightforward', 'Expressive', 'Motivating'],
    style: 'bold and direct',
    hindiMix: 0.3
  },
  calm_mature: {
    name: 'Kavya',
    description: 'The Understanding Soul',
    greeting: 'Namaste… main Kavya. Tumhara naam jaanna chahti hoon, bataoge?',
    traits: ['Slow', 'Thoughtful', 'Grounding', 'Emotionally stable'],
    style: 'calm and wise',
    hindiMix: 0.45
  }
};

export default supabase;
