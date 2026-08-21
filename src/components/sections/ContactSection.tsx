import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Clock, Mail, MapPin, Phone, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Reveal, slideLeft, slideRight } from '@/components/motion'
import { Section, SectionEyebrow, SectionHeading } from '@/components/public/Sections'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { useT } from '@/i18n'
import { SCHOOL_INFO } from '@/lib/content'
import { SECTION_IDS } from '@/lib/useScrollSpy'

export function ContactSection() {
  const t = useT()
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  /**
   * The contact form is presentational for now: it validates and confirms, but
   * does not deliver mail, because no email provider is configured yet. The
   * school's address and phone are shown alongside so nobody is left without a
   * way to reach a person.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true)
    await new Promise((resolve) => setTimeout(resolve, 700))
    setSending(false)
    setSent(true)
  }

  const contactRows = [
    {
      icon: MapPin,
      label: t('contact.addressLabel'),
      value: SCHOOL_INFO.addressLines.join(', '),
      href: null,
    },
    {
      icon: Mail,
      label: t('common.email'),
      value: SCHOOL_INFO.email,
      href: `mailto:${SCHOOL_INFO.email}`,
    },
    {
      icon: Phone,
      label: t('common.phone'),
      value: SCHOOL_INFO.phone,
      href: `tel:${SCHOOL_INFO.phone.replace(/[^0-9+]/g, '')}`,
    },
    {
      icon: Clock,
      label: t('contact.hoursLabel'),
      value: t('contact.hoursValue'),
      href: null,
    },
  ]

  return (
    <Section id={SECTION_IDS.contact} className="scroll-mt-20">
      <div className="container-marti">
        <SectionHeading
          eyebrow={t('nav.contact')}
          title={t('contact.title')}
          subtitle={t('contact.subtitle')}
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Form */}
          <Reveal variants={slideRight}>
            <div className="rounded-3xl border border-ink-100 bg-white p-7 shadow-card sm:p-8">
              <h3 className="font-display text-xl font-bold text-ink-950">
                {t('contact.formTitle')}
              </h3>

              <AnimatePresence mode="wait">
                {sent ? (
                  <motion.div
                    key="sent"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="mt-8 flex flex-col items-center rounded-2xl bg-emerald-50 px-6 py-12 text-center"
                  >
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white"
                    >
                      <CheckCircle2 className="h-7 w-7" aria-hidden />
                    </motion.span>
                    <h4 className="mt-5 font-display text-lg font-bold text-emerald-900">
                      {t('contact.successTitle')}
                    </h4>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-emerald-800">
                      {t('contact.successBody')}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-6"
                      onClick={() => setSent(false)}
                    >
                      {t('contact.sendButton')}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="mt-6 space-y-5"
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Input label={t('contact.nameLabel')} name="name" required autoComplete="name" />
                      <Input
                        label={t('contact.emailLabel')}
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                      />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Input
                        label={t('contact.phoneLabel')}
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                      />
                      <Select label={t('contact.subjectLabel')} name="subject" required>
                        <option value="enrollment">{t('contact.subjectEnrollment')}</option>
                        <option value="placement">{t('contact.subjectPlacement')}</option>
                        <option value="teaching">{t('contact.subjectTeaching')}</option>
                        <option value="volunteer">{t('contact.subjectVolunteer')}</option>
                        <option value="other">{t('contact.subjectOther')}</option>
                      </Select>
                    </div>
                    <Textarea label={t('contact.messageLabel')} name="message" rows={5} required />
                    <Button
                      type="submit"
                      size="lg"
                      fullWidth
                      loading={sending}
                      rightIcon={<Send className="h-4 w-4" />}
                    >
                      {sending ? t('common.sending') : t('contact.sendButton')}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </Reveal>

          {/* School info */}
          <Reveal variants={slideLeft}>
            <div className="rounded-3xl bg-marti-gradient p-7 text-white shadow-lift sm:p-8">
              <SectionEyebrow tone="dark">{t('contact.infoTitle')}</SectionEyebrow>
              <ul className="mt-7 space-y-6">
                {contactRows.map((row) => {
                  const Icon = row.icon
                  return (
                    <li key={row.label} className="flex gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                        <Icon className="h-4.5 w-4.5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-marti-200">
                          {row.label}
                        </p>
                        {row.href ? (
                          <a
                            href={row.href}
                            className="mt-1 block text-sm font-medium underline-offset-4 transition-colors hover:underline"
                          >
                            {row.value}
                          </a>
                        ) : (
                          <p className="mt-1 text-sm font-medium leading-relaxed">{row.value}</p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-8 rounded-2xl bg-white/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-marti-200">
                  {t('contact.officeLabel')}
                </p>
                <p className="mt-1.5 text-sm font-medium">{t('contact.officeValue')}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  )
}
