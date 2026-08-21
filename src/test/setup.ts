import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Components read prefers-reduced-motion; jsdom has no matchMedia.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
})

// framer-motion's scroll and in-view helpers need these.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo

class MockIntersectionObserver {
  root = null
  rootMargin = ''
  thresholds: readonly number[] = []
  callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }

  disconnect() {}

  // Report elements as visible immediately so Reveal-wrapped content renders.
  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target, intersectionRatio: 1 } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }

  unobserve() {}

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}
window.IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
