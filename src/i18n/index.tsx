import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import en from './en.json'
import tr from './tr.json'
import type { Locale } from '@/types/models'

const dictionaries = { en, tr } as const

const STORAGE_KEY = 'marti.locale'

type Dict = Record<string, unknown>

function lookup(dict: Dict, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Dict)[key]
    return undefined
  }, dict)
  return typeof value === 'string' ? value : undefined
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in vars ? String(vars[key]) : match,
  )
}

interface I18nValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
  t: (key: string, vars?: Record<string, string | number>) => string
  /** BCP-47 tag for Intl formatting. */
  intlLocale: string
}

const I18nContext = createContext<I18nValue | null>(null)

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'tr') return stored
  // Turkish-speaking visitors get Turkish automatically; everyone else English.
  return navigator.language?.toLowerCase().startsWith('tr') ? 'tr' : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    try {
      window.localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // Private browsing can block storage; the choice just won't persist.
    }
  }, [locale])

  const setLocale = useCallback((next: Locale) => setLocaleState(next), [])
  const toggleLocale = useCallback(
    () => setLocaleState((prev) => (prev === 'en' ? 'tr' : 'en')),
    [],
  )

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const value = lookup(dictionaries[locale], key) ?? lookup(dictionaries.en, key)
      if (value === undefined) {
        if (import.meta.env.DEV) console.warn(`[i18n] Missing key: ${key}`)
        return key
      }
      return interpolate(value, vars)
    },
    [locale],
  )

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t,
      intlLocale: locale === 'tr' ? 'tr-TR' : 'en-US',
    }),
    [locale, setLocale, toggleLocale, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider')
  return ctx
}

/** Convenience hook when only the translate function is needed. */
export function useT() {
  return useI18n().t
}
