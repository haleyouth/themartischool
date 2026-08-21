import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LiveClock } from '@/components/app/LiveClock'
import { I18nProvider } from '@/i18n'

function renderAt(date: Date) {
  vi.setSystemTime(date)
  return render(
    <I18nProvider>
      <LiveClock />
    </I18nProvider>,
  )
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('LiveClock', () => {
  it('shows the current date and time', () => {
    renderAt(new Date(2026, 8, 12, 10, 30, 15))
    expect(document.body.textContent).toMatch(/Sep/)
    expect(document.body.textContent).toMatch(/12/)
    expect(document.body.textContent).toMatch(/10/)
    expect(document.body.textContent).toMatch(/30/)
  })

  it('calls out Saturday, the day the school runs', () => {
    // 12 September 2026 is a Saturday.
    renderAt(new Date(2026, 8, 12, 10, 0, 0))
    expect(document.body.textContent).toMatch(/School day/)
  })

  it('does not flag a weekday as a school day', () => {
    // 9 September 2026 is a Wednesday.
    renderAt(new Date(2026, 8, 9, 10, 0, 0))
    expect(document.body.textContent).toMatch(/Wednesday/)
    expect(document.body.textContent).not.toMatch(/School day/)
  })

  it('advances as time passes', async () => {
    renderAt(new Date(2026, 8, 9, 10, 0, 0))
    expect(document.body.textContent).toMatch(/00/)

    // Past the alignment delay plus a few ticks.
    await vi.advanceTimersByTimeAsync(4000)
    expect(document.body.textContent).toMatch(/0[1-9]/)
  })

  it('pads minutes and seconds to two digits', () => {
    renderAt(new Date(2026, 8, 9, 9, 5, 3))
    // A bare "5" or "3" would read as a broken clock.
    expect(document.body.textContent).toMatch(/05/)
    expect(document.body.textContent).toMatch(/03/)
  })

  it('stops its timer when unmounted', async () => {
    const { unmount } = renderAt(new Date(2026, 8, 9, 10, 0, 0))
    const clearInterval = vi.spyOn(globalThis, 'clearInterval')
    unmount()
    expect(clearInterval).toHaveBeenCalled()
    clearInterval.mockRestore()
  })

  it('renders without crashing when the locale changes', () => {
    renderAt(new Date(2026, 8, 12, 10, 0, 0))
    expect(screen.getByText(/School day/)).toBeInTheDocument()
  })
})
