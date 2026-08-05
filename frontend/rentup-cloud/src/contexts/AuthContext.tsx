import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type AuthActionType = 'invite' | 'recovery' | null

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  authAction: AuthActionType
  clearAuthAction: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authAction, setAuthAction] = useState<AuthActionType>(() => {
    const hash = window.location.hash || ''
    const search = window.location.search || ''
    if (hash.includes('type=invite') || search.includes('type=invite')) {
      return 'invite'
    }
    if (hash.includes('type=recovery') || search.includes('type=recovery')) {
      return 'recovery'
    }
    return null
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'PASSWORD_RECOVERY') {
        setAuthAction('recovery')
      } else {
        // Kontrola url při prvotním přihlášení z e-mailu
        const hash = window.location.hash || ''
        const search = window.location.search || ''
        if (hash.includes('type=invite') || search.includes('type=invite')) {
          setAuthAction('invite')
        } else if (hash.includes('type=recovery') || search.includes('type=recovery')) {
          setAuthAction('recovery')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const clearAuthAction = useCallback(() => {
    setAuthAction(null)
  }, [])

  const signOut = async () => { await supabase.auth.signOut() }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, authAction, clearAuthAction, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
