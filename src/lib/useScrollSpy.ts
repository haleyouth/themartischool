import { useEffect, useState } from 'react'

/** Anchor ids for the one-page public site. */
export const SECTION_IDS = {
  home: 'home',
  about: 'about',
  programs: 'classes',
  register: 'register',
} as const

/**
 * Tracks which section is currently in view so the navbar can highlight it.
 *
 * Uses scroll position rather than IntersectionObserver: sections vary a lot
 * in height, and "the last section whose top has passed the header" matches
 * what a reader perceives as the current section far better than intersection
 * ratios do.
 */
export function useScrollSpy(ids: string[], offset = 100): string | null {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null)

  useEffect(() => {
    let frame = 0

    const update = () => {
      frame = 0

      // At the very bottom the last section may never cross the offset line.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      if (atBottom) {
        setActiveId(ids[ids.length - 1] ?? null)
        return
      }

      let current: string | null = ids[0] ?? null
      for (const id of ids) {
        const element = document.getElementById(id)
        if (!element) continue
        if (element.getBoundingClientRect().top <= offset) current = id
      }
      setActiveId(current)
    }

    const onScroll = () => {
      // Coalesce scroll events into one measurement per frame.
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [ids, offset])

  return activeId
}
