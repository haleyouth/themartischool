import { motion } from 'framer-motion'
import { Home } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { useT } from '@/i18n'

export default function NotFound() {
  const t = useT()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-marti-50 to-white px-6 text-center">
      <div className="bg-dots absolute inset-0 opacity-40" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <Logo size="lg" />
        <p className="mt-10 font-display text-8xl font-extrabold text-marti-200">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">
          {t('notFound.title')}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-600">
          {t('notFound.body')}
        </p>
        <Button to="/" size="lg" className="mt-8" leftIcon={<Home className="h-4 w-4" />}>
          {t('notFound.home')}
        </Button>
      </motion.div>
    </div>
  )
}
