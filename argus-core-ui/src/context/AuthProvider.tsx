import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getSupabase } from '../services/supabaseClient'

type User = { id: string; email?: string | null } | null

interface AuthContextValue {
  user: User
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>(null)
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<any>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const supabase = await getSupabase()
      setClient(supabase)
      try {
        // Try to get current session/user (v2 API)
        if (supabase && supabase.auth && supabase.auth.getUser) {
          const res = await supabase.auth.getUser()
          if (mounted) setUser(res.data?.user ? { id: (res.data.user as any).id, email: (res.data.user as any).email } : null)
        }
      } catch (e) {
        // ignore
      }

      // subscribe to auth changes
      try {
        if (supabase && supabase.auth && supabase.auth.onAuthStateChange) {
          const { data } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            const u = session?.user ?? null
            setUser(u ? { id: u.id, email: u.email } : null)
          })
          // cleanup
          return () => {
            mounted = false
            data?.unsubscribe && data.unsubscribe()
          }
        }
      } catch (e) {
        // ignore
      }

      if (mounted) setLoading(false)
    })()

    return () => {
      mounted = false
    }
  }, [])

  const signOut = async () => {
    if (!client) {
      console.warn('Supabase client not ready')
      return
    }
    try {
      await client.auth.signOut()
      setUser(null)
    } catch (e) {
      console.warn('signOut failed', e)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
