import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { DateOfBirthField } from '@/components/ui/DateOfBirthField'
import { I18nProvider } from '@/i18n'

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <I18nProvider>
      <DateOfBirthField label="Date of birth" value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </I18nProvider>
  )
}

const day = () => screen.getByLabelText('Day')
const month = () => screen.getByLabelText('Month')
const year = () => screen.getByLabelText('Year')
const value = () => screen.getByTestId('value').textContent

describe('DateOfBirthField', () => {
  it('emits nothing until all three parts are chosen', async () => {
    render(<Harness />)
    await userEvent.selectOptions(day(), '12')
    expect(value()).toBe('')
    await userEvent.selectOptions(month(), '04')
    expect(value()).toBe('')
    await userEvent.selectOptions(year(), '2016')
    expect(value()).toBe('2016-04-12')
  })

  it('emits the canonical YYYY-MM-DD Firestore expects', async () => {
    render(<Harness />)
    await userEvent.selectOptions(year(), '2015')
    await userEvent.selectOptions(month(), '01')
    await userEvent.selectOptions(day(), '05')
    expect(value()).toBe('2015-01-05')
    expect(value()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('splits an existing value back into the three pickers', () => {
    render(<Harness initial="2014-07-23" />)
    expect((day() as HTMLSelectElement).value).toBe('23')
    expect((month() as HTMLSelectElement).value).toBe('07')
    expect((year() as HTMLSelectElement).value).toBe('2014')
  })

  it('only offers days that exist in the chosen month', async () => {
    render(<Harness />)
    await userEvent.selectOptions(year(), '2015') // not a leap year
    await userEvent.selectOptions(month(), '02')
    const options = Array.from(day().querySelectorAll('option')).map((o) => o.value)
    expect(options).toContain('28')
    expect(options).not.toContain('29')
    expect(options).not.toContain('31')
  })

  it('offers 29 February in a leap year', async () => {
    render(<Harness />)
    await userEvent.selectOptions(year(), '2016') // leap year
    await userEvent.selectOptions(month(), '02')
    const options = Array.from(day().querySelectorAll('option')).map((o) => o.value)
    expect(options).toContain('29')
    expect(options).not.toContain('30')
  })

  it('clamps the day when switching to a shorter month', async () => {
    render(<Harness />)
    await userEvent.selectOptions(year(), '2015')
    await userEvent.selectOptions(month(), '01')
    await userEvent.selectOptions(day(), '31')
    expect(value()).toBe('2015-01-31')

    // February cannot hold the 31st, so it must fall back rather than emit
    // an impossible date.
    await userEvent.selectOptions(month(), '02')
    expect(value()).toBe('2015-02-28')
  })

  it('shows the resulting age back to the parent', async () => {
    const thisYear = new Date().getFullYear()
    render(<Harness />)
    await userEvent.selectOptions(day(), '01')
    await userEvent.selectOptions(month(), '01')
    await userEvent.selectOptions(year(), String(thisYear - 10))
    // Born 1 January, so the child has already had this year's birthday.
    // The age chip swaps in through AnimatePresence, so wait for it. The
    // label also sits beside an icon, hence matching whole-body text.
    await waitFor(() => expect(document.body.textContent).toMatch(/10 years old/))
  })

  it('shows an error instead of the age when one is given', () => {
    render(<Harness initial="2016-04-12" />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    render(
      <I18nProvider>
        <DateOfBirthField
          label="Date of birth"
          value="2016-04-12"
          onChange={() => {}}
          error="Students need to be between 3 and 18"
        />
      </I18nProvider>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('between 3 and 18')
  })

  it('does not offer years outside the plausible range', () => {
    render(<Harness />)
    const years = Array.from(year().querySelectorAll('option'))
      .map((o) => Number(o.value))
      .filter(Boolean)
    const thisYear = new Date().getFullYear()
    expect(Math.max(...years)).toBeLessThanOrEqual(thisYear)
    expect(Math.min(...years)).toBeGreaterThan(thisYear - 30)
  })
})
