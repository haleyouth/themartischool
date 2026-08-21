import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Accordion } from '@/components/ui/Accordion'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox, Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/Feedback'
import { I18nProvider } from '@/i18n'

function wrap(ui: React.ReactNode) {
  return (
    <I18nProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </I18nProvider>
  )
}

describe('Button', () => {
  it('fires onClick', async () => {
    const onClick = vi.fn()
    render(wrap(<Button onClick={onClick}>Save</Button>))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not fire while loading', async () => {
    const onClick = vi.fn()
    render(wrap(<Button onClick={onClick} loading>Save</Button>))
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('does not fire when disabled', async () => {
    const onClick = vi.fn()
    render(wrap(<Button onClick={onClick} disabled>Save</Button>))
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders a link when given `to`', () => {
    render(wrap(<Button to="/login">Sign in</Button>))
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })
})

describe('Input', () => {
  it('associates the label with the control', async () => {
    render(wrap(<Input label="First name" />))
    const field = screen.getByLabelText('First name')
    await userEvent.type(field, 'Elif')
    expect(field).toHaveValue('Elif')
  })

  it('shows an error and marks the field invalid', () => {
    render(wrap(<Input label="Email" error="Enter a valid email address" />))
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows the hint when there is no error, and hides it when there is', () => {
    const { rerender } = render(wrap(<Input label="Email" hint="We will contact you here" />))
    expect(screen.getByText('We will contact you here')).toBeInTheDocument()

    rerender(wrap(<Input label="Email" hint="We will contact you here" error="Required" />))
    expect(screen.queryByText('We will contact you here')).not.toBeInTheDocument()
    expect(screen.getByText('Required')).toBeInTheDocument()
  })
})

describe('Select and Checkbox', () => {
  it('renders options and selects a value', async () => {
    render(
      wrap(
        <Select
          label="Grade"
          options={[
            { value: '1', label: 'Grade 1' },
            { value: '2', label: 'Grade 2' },
          ]}
        />,
      ),
    )
    await userEvent.selectOptions(screen.getByLabelText('Grade'), '2')
    expect(screen.getByLabelText('Grade')).toHaveValue('2')
  })

  it('toggles a checkbox', async () => {
    render(wrap(<Checkbox label="I accept the terms" />))
    const box = screen.getByRole('checkbox')
    expect(box).not.toBeChecked()
    await userEvent.click(box)
    expect(box).toBeChecked()
  })
})

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(wrap(<Modal open={false} onClose={vi.fn()} title="Approve">Body</Modal>))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders its content when open', () => {
    render(wrap(<Modal open onClose={vi.fn()} title="Approve">Body</Modal>))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Approve')).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    render(wrap(<Modal open onClose={onClose} title="Approve">Body</Modal>))
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})

describe('Tabs', () => {
  it('reports the selected tab and switches on click', async () => {
    function Harness() {
      const [value, setValue] = useState('a')
      return (
        <Tabs
          value={value}
          onChange={setValue}
          items={[
            { value: 'a', label: 'Pending' },
            { value: 'b', label: 'Approved' },
          ]}
        />
      )
    }
    render(wrap(<Harness />))

    expect(screen.getByRole('tab', { name: /Pending/ })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(screen.getByRole('tab', { name: /Approved/ }))
    expect(screen.getByRole('tab', { name: /Approved/ })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('Accordion', () => {
  it('opens and closes a panel', async () => {
    render(wrap(<Accordion items={[{ question: 'Is there a discount?', answer: 'Yes there is.' }]} />))

    const trigger = screen.getByRole('button', { name: /Is there a discount/ })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Yes there is.')).toBeInTheDocument()

    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('Badge', () => {
  it('maps domain statuses onto consistent tones', () => {
    expect(statusTone('approved')).toBe('success')
    expect(statusTone('present')).toBe('success')
    expect(statusTone('pending')).toBe('warning')
    expect(statusTone('draft')).toBe('warning')
    expect(statusTone('rejected')).toBe('danger')
    expect(statusTone('absent')).toBe('danger')
    expect(statusTone('something-unknown')).toBe('neutral')
  })

  it('renders its label', () => {
    render(wrap(<Badge tone="success">Active</Badge>))
    expect(screen.getByText('Active')).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('renders the title, description and action', () => {
    render(
      wrap(
        <EmptyState
          title="No applications"
          description="They will appear here."
          action={{ label: 'Refresh' }}
        />,
      ),
    )
    expect(screen.getByText('No applications')).toBeInTheDocument()
    expect(screen.getByText('They will appear here.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })
})

describe('LanguageSwitcher', () => {
  it('switches the document language between English and Turkish', async () => {
    render(wrap(<LanguageSwitcher />))

    const tr = screen.getByRole('button', { name: 'Türkçe' })
    await userEvent.click(tr)
    await waitFor(() => expect(document.documentElement.lang).toBe('tr'))

    await userEvent.click(screen.getByRole('button', { name: 'English' }))
    await waitFor(() => expect(document.documentElement.lang).toBe('en'))
  })
})
