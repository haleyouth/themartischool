import { useEffect } from 'react'
import { HeroSection } from '@/components/sections/HeroSection'
import { ProgramsSection } from '@/components/sections/ProgramsSection'
import { RegisterSection } from '@/components/sections/RegisterSection'
import { HEADER_HEIGHT } from '@/lib/useScrollSpy'

/**
 * The public site is one short scrolling page: a quick introduction to the
 * weekend school, the classes on offer, and the registration form. Everything
 * else lives behind the sign in.
 */
export default function LandingPage() {
  // Honour a deep link such as /#register on first paint.
  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    const element = document.getElementById(hash)
    if (!element) return
    window.requestAnimationFrame(() => {
      const top = element.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT
      window.scrollTo({ top, behavior: 'instant' as ScrollBehavior })
    })
  }, [])

  return (
    <>
      <HeroSection />
      <ProgramsSection />
      <RegisterSection />
    </>
  )
}
