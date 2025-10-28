import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase URL or ANON key not set. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
}

// Create a single Supabase client instance
const supabaseClient = SUPABASE_URL && SUPABASE_ANON_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

export const getSupabase = async () => {
  if (!supabaseClient) {
    throw new Error('Supabase URL or anon key is not set')
  }
  return supabaseClient
}

export const getSupabaseAdmin = async () => {
  if (!supabaseClient) {
    throw new Error('Supabase URL or anon key is not set')
  }
  return supabaseClient
}

export const signInWithEmail = async (email: string, password: string) => {
  const client = await getSupabase()
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return true
}

export const signOut = async () => {
  const client = await getSupabase()
  const { error } = await client.auth.signOut()
  if (error) throw new Error(error.message)
  return true
}

export const signUpWithEmail = async (email: string, password: string) => {
  const client = await getSupabase()
  const { error } = await client.auth.signUp({ email, password })
  if (error) throw new Error(error.message)
  return true
}

export const getUser = async () => {
  const client = await getSupabase()
  const { data, error } = await client.auth.getUser()
  if (error) throw new Error(error.message)
  return data
}