import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Shared motion vocabulary.
 *
 * Everything here honours prefers-reduced-motion: transforms collapse to a
 * plain fade (or nothing at all) rather than being disabled inconsistently
 * across components.
 */

export const EASE = [0.22, 1, 0.36, 1] as const
export const EASE_SNAP = [0.16, 1, 0.3, 1] as const

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: EASE } },
}

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } },
}

export const slideRight: Variants = {
  hidden: { opacity: 0, x: -32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } },
}

export function staggerContainer(stagger = 0.08, delay = 0): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  }
}

/** Page-level transition used by the router. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.25, ease: 'easeIn' } },
}

interface RevealProps {
  children: ReactNode
  className?: string
  /** Seconds to wait before animating in. */
  delay?: number
  variants?: Variants
  once?: boolean
  amount?: number
  as?: 'div' | 'section' | 'li' | 'article' | 'header'
}

/** Animates its children in the first time they scroll into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  variants = fadeUp,
  once = true,
  amount = 0.2,
  as = 'div',
}: RevealProps) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once, amount })
  const reduced = useReducedMotion()
  // The tag is chosen at runtime, so the ref cannot be narrowed to one element
  // type; cast once here rather than making every caller pick a ref type.
  const MotionTag = motion[as] as typeof motion.div

  return (
    <MotionTag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={reduced ? fadeIn : variants}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  )
}

/** Wraps a list so children with `variants` animate in sequence. */
export function StaggerGroup({
  children,
  className,
  stagger = 0.08,
  delay = 0,
  amount = 0.15,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  stagger?: number
  delay?: number
  amount?: number
  as?: 'div' | 'ul' | 'section'
}) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, amount })
  const MotionTag = motion[as] as typeof motion.div

  return (
    <MotionTag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={staggerContainer(stagger, delay)}
    >
      {children}
    </MotionTag>
  )
}

/** A single item inside a StaggerGroup. */
export function StaggerItem({
  children,
  className,
  variants = fadeUp,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  variants?: Variants
  as?: 'div' | 'li' | 'article'
}) {
  const reduced = useReducedMotion()
  const MotionTag = motion[as]
  return (
    <MotionTag className={className} variants={reduced ? fadeIn : variants}>
      {children}
    </MotionTag>
  )
}

/**
 * Counts up to `value` when scrolled into view. Used for the stats band —
 * a static number reads as decoration, a counting one reads as a claim.
 */
export function CountUp({
  value,
  duration = 1600,
  suffix = '',
  prefix = '',
  className,
}: {
  value: number
  duration?: number
  suffix?: string
  prefix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (reduced) {
      setDisplay(value)
      return
    }

    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      // Ease-out cubic, so the number decelerates into its final value.
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(value * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, value, duration, reduced])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  )
}

/** Thin progress bar pinned to the top of the viewport. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-marti-500 via-marti-600 to-gold-500"
    />
  )
}

/** Translates its children as the page scrolls, for depth behind hero art. */
export function Parallax({
  children,
  offset = 60,
  className,
}: {
  children: ReactNode
  offset?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset])

  return (
    <div ref={ref} className={className}>
      <motion.div style={reduced ? undefined : { y }}>{children}</motion.div>
    </div>
  )
}

/**
 * Card that tilts slightly toward the cursor. Pointer-driven only, so it is
 * inert on touch devices and when reduced motion is requested.
 */
export function TiltCard({
  children,
  className,
  max = 6,
}: {
  children: ReactNode
  className?: string
  max?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  function handleMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType !== 'mouse' || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: -py * max * 2, y: px * max * 2 })
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      animate={{ rotateX: tilt.x, rotateY: tilt.y }}
      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      style={{ transformPerspective: 900 }}
      className={cn('will-change-transform', className)}
    >
      {children}
    </motion.div>
  )
}

/** Reveals each word in sequence — used once, on the hero headline. */
export function WordReveal({
  text,
  className,
  delay = 0,
  wordClassName,
}: {
  text: string
  className?: string
  delay?: number
  wordClassName?: string
}) {
  const reduced = useReducedMotion()
  const words = text.split(' ')

  if (reduced) return <span className={className}>{text}</span>

  return (
    <motion.span
      className={cn('inline-block', className)}
      initial="hidden"
      animate="visible"
      variants={staggerContainer(0.07, delay)}
    >
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden align-bottom">
          <motion.span
            className={cn('inline-block', wordClassName)}
            variants={{
              hidden: { y: '110%', opacity: 0 },
              visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: EASE } },
            }}
          >
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </motion.span>
  )
}

export { motion, useReducedMotion }
