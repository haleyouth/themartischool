import { useCallback, useEffect, useState } from 'react'
import { AboutSection } from '@/components/sections/AboutSection'
import { CalendarSection } from '@/components/sections/CalendarSection'
import { ContactSection } from '@/components/sections/ContactSection'
import { HeroSection } from '@/components/sections/HeroSection'
import { ProgramsSection } from '@/components/sections/ProgramsSection'
import { RegisterSection } from '@/components/sections/RegisterSection'
import { TuitionSection } from '@/components/sections/TuitionSection'
import { SECTION_IDS } from '@/lib/useScrollSpy'

/**
 * The whole public site is one scrolling page; the navbar moves between
 * sections by anchor rather than by route.
 */
export default function LandingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string>('full')

  const scrollToRegister = useCallback((planId: string) => {
    setSelectedPlan(planId)
    const element = document.getElementById(SECTION_IDS.register)
    if (!element) return
    const top = element.getBoundingClientRect().top + window.scrollY - 72
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
  }, [])

  // Honour a deep link such as /#tuition on first paint.
  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    const element = document.getElementById(hash)
    if (!element) return
    window.requestAnimationFrame(() => {
      const top = element.getBoundingClientRect().top + window.scrollY - 72
      window.scrollTo({ top, behavior: 'instant' as ScrollBehavior })
    })
  }, [])

  return (
    <>
      <HeroSection />
      <AboutSection />
      <ProgramsSection />
      <TuitionSection onChoosePlan={scrollToRegister} />
      <CalendarSection />
      <RegisterSection selectedPlan={selectedPlan} />
      <ContactSection />
    </>
  )
}
