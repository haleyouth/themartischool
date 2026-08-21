import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { auth, db } from '@/lib/firebase'
import { normalizeStudentId, toShadowEmail } from '@/lib/studentId'
import { currentSchoolYear } from '@/lib/schoolYear'
import type { MartiClaims, Role, UserDoc } from '@/types/models'

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | {
      status: 'authenticated'
      user: User
      claims: MartiClaims
      profile: UserDoc | null
    }

interface AuthContextValue {
  status: AuthState['status']
  user: User | null
  claims: MartiClaims | null
  profile: UserDoc | null
  role: Role | null
  signInWithStudentId: (studentId: string, password: string) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshClaims: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Thrown for a student ID that cannot be parsed, before we hit the network. */
export class InvalidStudentIdError extends Error {
  constructor() {
    super('invalid-student-id')
    this.name = 'InvalidStudentIdError'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const unsubProfile = useRef<(() => void) | null>(null)

  const refreshClaims = useCallback(async () => {
    const current = auth.currentUser
    if (!current) return
    const token = await current.getIdTokenResult(true)
    setState((prev) =>
      prev.status === 'authenticated'
        ? { ...prev, claims: token.claims as unknown as MartiClaims }
        : prev,
    )
  }, [])

  useEffect(() => {
    // Sessions survive a browser restart; families should not sign in weekly.
    void setPersistence(auth, browserLocalPersistence)

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubProfile.current?.()
      unsubProfile.current = null

      if (!user) {
        setState({ status: 'unauthenticated' })
        return
      }

      // Use the cached token, forcing a refresh here costs a round trip on
      // every page load. Staleness is caught by the claimsVersion watcher below.
      const token = await user.getIdTokenResult()
      const claims = token.claims as unknown as MartiClaims

      if (!claims.role) {
        // An Auth user with no role means provisioning never finished. Fail closed.
        await fbSignOut(auth)
        setState({ status: 'unauthenticated' })
        return
      }

      const snap = await getDoc(doc(db, 'users', user.uid))
      const profile = snap.exists() ? (snap.data() as UserDoc) : null
      setState({ status: 'authenticated', user, claims, profile })

      // Watch our own user doc. When an admin changes a role, the Cloud
      // Function bumps claimsVersion; seeing a version newer than the token's
      // tells us to force-refresh, so permissions update within milliseconds
      // instead of waiting up to an hour for the token to expire.
      unsubProfile.current = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
        if (!docSnap.exists()) return
        const next = docSnap.data() as UserDoc
        const fresh = await user.getIdTokenResult()
        const tokenVersion = (fresh.claims.v as number) ?? 0

        if ((next.claimsVersion ?? 0) > tokenVersion) {
          const refreshed = await user.getIdTokenResult(true)
          setState({
            status: 'authenticated',
            user,
            claims: refreshed.claims as unknown as MartiClaims,
            profile: next,
          })
        } else {
          setState((prev) =>
            prev.status === 'authenticated' ? { ...prev, profile: next } : prev,
          )
        }
      })
    })

    return () => {
      unsubscribe()
      unsubProfile.current?.()
    }
  }, [])

  const markSignedIn = useCallback(async (user: User) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } catch {
      // A failed bookkeeping write must never block a successful sign-in.
    }
  }, [])

  const signInWithStudentId = useCallback(
    async (studentId: string, password: string) => {
      const canonical = normalizeStudentId(studentId, currentSchoolYear())
      if (!canonical) throw new InvalidStudentIdError()
      const credential = await signInWithEmailAndPassword(
        auth,
        toShadowEmail(canonical),
        password,
      )
      await markSignedIn(credential.user)
    },
    [markSignedIn],
  )

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
      await markSignedIn(credential.user)
    },
    [markSignedIn],
  )

  const signOut = useCallback(async () => {
    unsubProfile.current?.()
    unsubProfile.current = null
    await fbSignOut(auth)
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const authed = state.status === 'authenticated' ? state : null
    return {
      status: state.status,
      user: authed?.user ?? null,
      claims: authed?.claims ?? null,
      profile: authed?.profile ?? null,
      role: authed?.claims.role ?? null,
      signInWithStudentId,
      signInWithEmail,
      signOut,
      refreshClaims,
    }
  }, [state, signInWithStudentId, signInWithEmail, signOut, refreshClaims])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

export function isAdminRole(role: Role | null): boolean {
  return role === 'director' || role === 'principal'
}

export function isStaffRole(role: Role | null): boolean {
  return isAdminRole(role) || role === 'teacher'
}
