import { AnimatePresence, motion } from 'framer-motion'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  CircleAlert,
  Copy,
  GraduationCap,
  Send,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Reveal } from '@/components/motion'
import { Section, SectionHeading } from '@/components/public/Sections'
import { Button } from '@/components/ui/Button'
import { DateOfBirthField } from '@/components/ui/DateOfBirthField'
import { Checkbox, Input, Select, Textarea } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useI18n } from '@/i18n'
import { GRADE_LEVELS, SCHOOL_INFO, TUITION_PLANS, US_STATES } from '@/lib/content'
import { db } from '@/lib/firebase'
import { currentSchoolYear, formatSchoolYear } from '@/lib/schoolYear'
import { SECTION_IDS } from '@/lib/useScrollSpy'
import { useSiteSettings } from '@/lib/useSiteSettings'
import { cn } from '@/lib/utils'

type StepId = 'student' | 'guardian' | 'academic' | 'plan' | 'review'

const STEPS: { id: StepId; labelKey: string; icon: typeof UserRound }[] = [
  { id: 'student', labelKey: 'register.stepStudent', icon: UserRound },
  { id: 'guardian', labelKey: 'register.stepGuardian', icon: Users },
  { id: 'academic', labelKey: 'register.stepAcademic', icon: GraduationCap },
  { id: 'plan', labelKey: 'register.stepPlan', icon: Sparkles },
  { id: 'review', labelKey: 'register.stepReview', icon: BadgeCheck },
]

interface FormData {
  firstName: string
  lastName: string
  preferredName: string
  dateOfBirth: string
  gender: string
  guardianName: string
  guardianEmail: string
  guardianPhone: string
  secondGuardianName: string
  secondGuardianPhone: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  zip: string
  emergencyName: string
  emergencyPhone: string
  emergencyRelationship: string
  requestedGradeLevel: string
  turkishLevel: string
  priorSchooling: string
  medicalNotes: string
  allergies: string
  plan: string
  howHeardAboutUs: string
  photoConsent: boolean
  termsConsent: boolean
}

const EMPTY: FormData = {
  firstName: '',
  lastName: '',
  preferredName: '',
  dateOfBirth: '',
  gender: '',
  guardianName: '',
  guardianEmail: '',
  guardianPhone: '',
  secondGuardianName: '',
  secondGuardianPhone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: 'MD',
  zip: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyRelationship: '',
  requestedGradeLevel: '',
  turkishLevel: '',
  priorSchooling: '',
  medicalNotes: '',
  allergies: '',
  plan: 'full',
  howHeardAboutUs: '',
  photoConsent: false,
  termsConsent: false,
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function RegisterSection({ selectedPlan }: { selectedPlan?: string }) {
  const { t } = useI18n()
  const toast = useToast()
  const year = currentSchoolYear()
  const { settings, loading: settingsLoading } = useSiteSettings()

  const [stepIndex, setStepIndex] = useState(0)
  const [data, setData] = useState<FormData>({ ...EMPTY, plan: selectedPlan ?? EMPTY.plan })
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<{ reference: string; email: string } | null>(null)
  const [failed, setFailed] = useState(false)
  // Direction drives the slide animation so going back animates backwards.
  const [direction, setDirection] = useState(1)

  const step = STEPS[stepIndex]

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  /** Validates only the fields on the current step. */
  function validateStep(id: StepId): boolean {
    const next: Partial<Record<keyof FormData, string>> = {}
    const required = t('register.validRequired')

    if (id === 'student') {
      if (!data.firstName.trim()) next.firstName = required
      if (!data.lastName.trim()) next.lastName = required
      if (!data.dateOfBirth) {
        next.dateOfBirth = required
      } else {
        // Guard the age range here as well as in the rules, so a family gets a
        // helpful message rather than a permission error.
        const birth = new Date(`${data.dateOfBirth}T00:00:00`)
        const age = (Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000)
        if (Number.isNaN(age)) next.dateOfBirth = t('register.validDate')
        else if (age < 3 || age > 18) next.dateOfBirth = t('register.validAge')
      }
    }

    if (id === 'guardian') {
      if (!data.guardianName.trim()) next.guardianName = required
      if (!data.guardianEmail.trim()) next.guardianEmail = required
      else if (!EMAIL_RE.test(data.guardianEmail.trim()))
        next.guardianEmail = t('register.validEmail')
      if (!data.guardianPhone.trim()) next.guardianPhone = required
      else if (data.guardianPhone.replace(/\D/g, '').length < 7)
        next.guardianPhone = t('register.validPhone')
      if (!data.emergencyName.trim()) next.emergencyName = required
      if (!data.emergencyPhone.trim()) next.emergencyPhone = required
      if (!data.emergencyRelationship.trim()) next.emergencyRelationship = required
    }

    if (id === 'academic') {
      if (!data.requestedGradeLevel) next.requestedGradeLevel = required
      if (!data.turkishLevel) next.turkishLevel = required
    }

    if (id === 'review') {
      if (!data.termsConsent) next.termsConsent = t('register.validTerms')
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  function goNext() {
    if (!validateStep(step.id)) return
    setDirection(1)
    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1))
  }

  function goBack() {
    setDirection(-1)
    setStepIndex((prev) => Math.max(prev - 1, 0))
  }

  async function handleSubmit() {
    if (!validateStep('review')) return
    setSubmitting(true)
    setFailed(false)

    try {
      // The shape here must satisfy firestore.rules exactly: status/source
      // fixed, timestamps server-side, and no admin-only fields present.
      const payload = {
        status: 'pending' as const,
        source: 'web' as const,
        submittedAt: serverTimestamp(),
        termsAcceptedAt: serverTimestamp(),
        schoolYear: year,

        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        preferredName: data.preferredName.trim() || null,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender || null,

        guardianName: data.guardianName.trim(),
        guardianEmail: data.guardianEmail.trim().toLowerCase(),
        guardianPhone: data.guardianPhone.trim(),
        secondaryGuardian: data.secondGuardianName.trim()
          ? {
              name: data.secondGuardianName.trim(),
              phone: data.secondGuardianPhone.trim() || '',
            }
          : null,
        address: data.addressLine1.trim()
          ? {
              line1: data.addressLine1.trim(),
              line2: data.addressLine2.trim() || '',
              city: data.city.trim(),
              state: data.state,
              zip: data.zip.trim(),
            }
          : null,

        emergencyContact: {
          name: data.emergencyName.trim(),
          phone: data.emergencyPhone.trim(),
          relationship: data.emergencyRelationship.trim(),
        },
        medicalNotes: data.medicalNotes.trim() || null,
        allergies: data.allergies.trim() || null,

        turkishLevel: data.turkishLevel,
        priorSchooling: data.priorSchooling.trim() || null,
        requestedGradeLevel: data.requestedGradeLevel,
        howHeardAboutUs: data.howHeardAboutUs || null,
        plan: data.plan,

        photoConsent: data.photoConsent,
      }

      const ref = await addDoc(collection(db, 'registrations'), payload)
      setSubmitted({
        reference: ref.id.slice(0, 8).toUpperCase(),
        email: payload.guardianEmail,
      })
      toast.success(t('register.successTitle'))
    } catch (error) {
      console.error('Registration submit failed', error)
      setFailed(true)
      toast.error(t('register.errorTitle'), t('register.errorBody'))
    } finally {
      setSubmitting(false)
    }
  }

  const planOptions = useMemo(
    () =>
      TUITION_PLANS.map((plan) => ({
        ...plan,
        name: t(plan.nameKey),
        desc: t(plan.descKey),
      })),
    [t],
  )

  // A closed intake replaces the form entirely. Leaving it visible but inert
  // would let a family fill in five steps before discovering it is shut.
  if (!settingsLoading && !settings.registrationOpen) {
    return (
      <Section id={SECTION_IDS.register} tone="cream" className="scroll-mt-20">
        <div className="container-marti">
          <Reveal className="mx-auto max-w-2xl">
            <div className="rounded-5xl border-2 border-ink bg-white p-8 text-center shadow-pop sm:p-12">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-3xl">
                🔒
              </span>
              <h2 className="mt-6 font-display text-2xl font-extrabold text-ink">
                {t('register.closedTitle')}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-pretty leading-relaxed text-ink-600">
                {settings.registrationClosedMessage?.trim() || t('register.closedBody')}
              </p>
              <p className="mt-6 text-sm text-ink-500">
                {t('register.closedContact')}{' '}
                <a
                  href={`mailto:${SCHOOL_INFO.email}`}
                  className="font-bold text-marti-600 underline underline-offset-4 hover:text-marti-800"
                >
                  {SCHOOL_INFO.email}
                </a>
              </p>
            </div>
          </Reveal>
        </div>
      </Section>
    )
  }

  if (submitted) {
    return (
      <Section id={SECTION_IDS.register} tone="cream" className="scroll-mt-20">
        <div className="container-marti">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-2xl overflow-hidden rounded-5xl border-2 border-ink bg-white shadow-card ring-2 ring-teal-200"
          >
            <div className="bg-teal-50 px-8 py-12 text-center">
              <motion.span
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 240, damping: 16, delay: 0.15 }}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-500 text-white"
              >
                <CheckCircle2 className="h-8 w-8" aria-hidden />
              </motion.span>
              <h2 className="mt-6 font-display text-2xl font-bold text-ink">
                {t('register.successTitle')}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-600">
                {t('register.successBody', { email: submitted.email })}
              </p>

              <div className="mx-auto mt-6 inline-flex items-center gap-3 rounded-2xl bg-white px-5 py-3 shadow-soft ring-2 ring-ink-200">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                  {t('register.successReference')}
                </span>
                <code className="font-mono text-base font-bold text-marti-700">
                  {submitted.reference}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(submitted.reference)
                    toast.success(t('common.copied'))
                  }}
                  className="rounded-md p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                  aria-label={t('common.copy')}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-8">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink-500">
                {t('register.successNext')}
              </h3>
              <ol className="mt-5 space-y-4">
                {[
                  'register.successStep1',
                  'register.successStep2',
                  'register.successStep3',
                  'register.successStep4',
                ].map((key, index) => (
                  <motion.li
                    key={key}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.12 }}
                    className="flex gap-3.5 text-sm text-ink-700"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marti-100 text-xs font-bold text-marti-700">
                      {index + 1}
                    </span>
                    {t(key)}
                  </motion.li>
                ))}
              </ol>
            </div>
          </motion.div>
        </div>
      </Section>
    )
  }

  return (
    <Section id={SECTION_IDS.register} tone="cream" className="scroll-mt-20">
      <div className="container-marti">
        <SectionHeading
          eyebrow={t('nav.register')}
          title={t('register.title')}
          subtitle={t('register.subtitle', { year: formatSchoolYear(year) })}
        />

        <Reveal className="mx-auto mt-12 max-w-3xl">
          <div className="overflow-hidden rounded-5xl border-2 border-ink bg-white shadow-card">
            {/* Stepper */}
            <div className="border-b-2 border-ink-200 bg-cream-200 px-6 py-5">
              <ol className="flex items-center justify-between gap-1">
                {STEPS.map((item, index) => {
                  const Icon = item.icon
                  const done = index < stepIndex
                  const active = index === stepIndex
                  return (
                    <li key={item.id} className="flex flex-1 items-center gap-1 last:flex-none">
                      <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-2.5">
                        <motion.span
                          animate={{ scale: active ? 1.08 : 1 }}
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300',
                            done
                              ? 'bg-teal-500 text-white'
                              : active
                                ? 'bg-marti-600 text-white shadow-pop'
                                : 'bg-white text-ink-400 ring-1 ring-ink-200',
                          )}
                        >
                          {done ? (
                            <Check className="h-4 w-4" strokeWidth={3} />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </motion.span>
                        <span
                          className={cn(
                            'hidden text-xs font-semibold sm:block',
                            active ? 'text-marti-700' : done ? 'text-ink-600' : 'text-ink-400',
                          )}
                        >
                          {t(item.labelKey)}
                        </span>
                      </div>
                      {index < STEPS.length - 1 && (
                        <div className="mx-1.5 h-px flex-1 overflow-hidden bg-ink-200">
                          <motion.div
                            initial={false}
                            animate={{ scaleX: done ? 1 : 0 }}
                            transition={{ duration: 0.35 }}
                            className="h-full origin-left bg-teal-500"
                          />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ol>
            </div>

            {/* Step body */}
            <div className="relative overflow-hidden px-6 py-8 sm:px-8">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step.id}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -40 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  {step.id === 'student' && (
                    <div className="space-y-5">
                      <StepHeader
                        title={t('register.studentTitle')}
                        subtitle={t('register.studentSubtitle')}
                      />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Input
                          label={t('register.firstName')}
                          required
                          value={data.firstName}
                          onChange={(e) => set('firstName', e.target.value)}
                          error={errors.firstName}
                          maxLength={60}
                        />
                        <Input
                          label={t('register.lastName')}
                          required
                          value={data.lastName}
                          onChange={(e) => set('lastName', e.target.value)}
                          error={errors.lastName}
                          maxLength={60}
                        />
                      </div>
                      <Input
                        label={t('register.preferredName')}
                        hint={t('register.preferredNameHint')}
                        value={data.preferredName}
                        onChange={(e) => set('preferredName', e.target.value)}
                        maxLength={60}
                      />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <DateOfBirthField
                          label={t('register.dateOfBirth')}
                          value={data.dateOfBirth}
                          onChange={(next) => set('dateOfBirth', next)}
                          error={errors.dateOfBirth}
                        />
                        <Select
                          label={t('register.gender')}
                          value={data.gender}
                          onChange={(e) => set('gender', e.target.value)}
                        >
                          <option value="">{t('common.optional')}</option>
                          <option value="male">{t('register.genderMale')}</option>
                          <option value="female">{t('register.genderFemale')}</option>
                          <option value="prefer_not_to_say">
                            {t('register.genderPreferNot')}
                          </option>
                        </Select>
                      </div>
                    </div>
                  )}

                  {step.id === 'guardian' && (
                    <div className="space-y-5">
                      <StepHeader
                        title={t('register.guardianTitle')}
                        subtitle={t('register.guardianSubtitle')}
                      />
                      <Input
                        label={t('register.guardianName')}
                        required
                        value={data.guardianName}
                        onChange={(e) => set('guardianName', e.target.value)}
                        error={errors.guardianName}
                        maxLength={120}
                        autoComplete="name"
                      />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Input
                          label={t('register.guardianEmail')}
                          hint={t('register.guardianEmailHint')}
                          type="email"
                          required
                          value={data.guardianEmail}
                          onChange={(e) => set('guardianEmail', e.target.value)}
                          error={errors.guardianEmail}
                          autoComplete="email"
                        />
                        <Input
                          label={t('register.guardianPhone')}
                          type="tel"
                          required
                          value={data.guardianPhone}
                          onChange={(e) => set('guardianPhone', e.target.value)}
                          error={errors.guardianPhone}
                          autoComplete="tel"
                        />
                      </div>

                      <div className="rounded-3xl bg-cream-200 p-5">
                        <p className="text-sm font-semibold text-ink-800">
                          {t('register.secondGuardianTitle')}
                          <span className="ml-2 text-xs font-normal text-ink-500">
                            ({t('common.optional')})
                          </span>
                        </p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <Input
                            label={t('register.guardianName')}
                            value={data.secondGuardianName}
                            onChange={(e) => set('secondGuardianName', e.target.value)}
                          />
                          <Input
                            label={t('register.guardianPhone')}
                            type="tel"
                            value={data.secondGuardianPhone}
                            onChange={(e) => set('secondGuardianPhone', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="rounded-3xl border-2 border-ink p-5">
                        <p className="text-sm font-semibold text-ink-800">
                          {t('register.addressTitle')}
                          <span className="ml-2 text-xs font-normal text-ink-500">
                            ({t('common.optional')})
                          </span>
                        </p>
                        <div className="mt-4 space-y-4">
                          <Input
                            label={t('register.addressLine1')}
                            value={data.addressLine1}
                            onChange={(e) => set('addressLine1', e.target.value)}
                            autoComplete="address-line1"
                          />
                          <div className="grid gap-4 sm:grid-cols-3">
                            <Input
                              label={t('register.city')}
                              value={data.city}
                              onChange={(e) => set('city', e.target.value)}
                              autoComplete="address-level2"
                            />
                            <Select
                              label={t('register.state')}
                              value={data.state}
                              onChange={(e) => set('state', e.target.value)}
                              options={US_STATES.map((s) => ({ value: s, label: s }))}
                            />
                            <Input
                              label={t('register.zip')}
                              value={data.zip}
                              onChange={(e) => set('zip', e.target.value)}
                              autoComplete="postal-code"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-3xl border-2 border-magenta-200 bg-magenta-50 p-5">
                        <p className="text-sm font-semibold text-ink-800">
                          {t('register.emergencyTitle')}
                        </p>
                        <p className="mt-1 text-xs text-ink-600">
                          {t('register.emergencySubtitle')}
                        </p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                          <Input
                            label={t('register.emergencyName')}
                            required
                            value={data.emergencyName}
                            onChange={(e) => set('emergencyName', e.target.value)}
                            error={errors.emergencyName}
                          />
                          <Input
                            label={t('register.emergencyPhone')}
                            type="tel"
                            required
                            value={data.emergencyPhone}
                            onChange={(e) => set('emergencyPhone', e.target.value)}
                            error={errors.emergencyPhone}
                          />
                          <Input
                            label={t('register.emergencyRelationship')}
                            required
                            value={data.emergencyRelationship}
                            onChange={(e) => set('emergencyRelationship', e.target.value)}
                            error={errors.emergencyRelationship}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {step.id === 'academic' && (
                    <div className="space-y-5">
                      <StepHeader
                        title={t('register.academicTitle')}
                        subtitle={t('register.academicSubtitle')}
                      />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Select
                          label={t('register.requestedGrade')}
                          required
                          value={data.requestedGradeLevel}
                          onChange={(e) => set('requestedGradeLevel', e.target.value)}
                          error={errors.requestedGradeLevel}
                        >
                          <option value="">{t('common.none')}</option>
                          {GRADE_LEVELS.map((grade) => (
                            <option key={grade} value={grade}>
                              {grade}
                            </option>
                          ))}
                        </Select>
                        <Select
                          label={t('register.turkishLevel')}
                          required
                          value={data.turkishLevel}
                          onChange={(e) => set('turkishLevel', e.target.value)}
                          error={errors.turkishLevel}
                        >
                          <option value="">{t('common.none')}</option>
                          <option value="none">{t('register.turkishNone')}</option>
                          <option value="beginner">{t('register.turkishBeginner')}</option>
                          <option value="intermediate">
                            {t('register.turkishIntermediate')}
                          </option>
                          <option value="fluent">{t('register.turkishFluent')}</option>
                          <option value="heritage">{t('register.turkishHeritage')}</option>
                        </Select>
                      </div>
                      <Textarea
                        label={t('register.priorSchooling')}
                        hint={t('register.priorSchoolingHint')}
                        rows={3}
                        maxLength={2000}
                        value={data.priorSchooling}
                        onChange={(e) => set('priorSchooling', e.target.value)}
                      />

                      <div className="rounded-3xl border-2 border-ink p-5">
                        <p className="text-sm font-semibold text-ink-800">
                          {t('register.medicalTitle')}
                        </p>
                        <div className="mt-4 space-y-4">
                          <Textarea
                            label={t('register.medicalNotes')}
                            hint={t('register.medicalNotesHint')}
                            rows={3}
                            maxLength={2000}
                            value={data.medicalNotes}
                            onChange={(e) => set('medicalNotes', e.target.value)}
                          />
                          <Input
                            label={t('register.allergies')}
                            hint={t('register.allergiesHint')}
                            maxLength={2000}
                            value={data.allergies}
                            onChange={(e) => set('allergies', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {step.id === 'plan' && (
                    <div className="space-y-5">
                      <StepHeader
                        title={t('register.planTitle')}
                        subtitle={t('register.planSubtitle')}
                      />
                      <div className="space-y-3">
                        {planOptions.map((plan) => {
                          const active = data.plan === plan.id
                          return (
                            <button
                              key={plan.id}
                              type="button"
                              onClick={() => set('plan', plan.id)}
                              aria-pressed={active}
                              className={cn(
                                'flex w-full items-center gap-4 rounded-3xl border-2 p-5 text-left transition-all duration-200',
                                active
                                  ? 'border-marti-500 bg-marti-50 shadow-pop'
                                  : 'border-ink-200 bg-white hover:border-marti-300 hover:bg-marti-50/30',
                              )}
                            >
                              <span
                                className={cn(
                                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                                  active
                                    ? 'border-marti-600 bg-marti-600'
                                    : 'border-ink-300 bg-white',
                                )}
                              >
                                {active && (
                                  <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="h-2 w-2 rounded-full bg-white"
                                  />
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                  <span className="font-display text-base font-bold text-ink">
                                    {plan.name}
                                  </span>
                                  {plan.featured && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                                      {t('tuition.mostPopular')}
                                    </span>
                                  )}
                                </span>
                                <span className="mt-1 block text-sm text-ink-600">{plan.desc}</span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                      <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-700">
                        {t('register.feesNotice')}
                      </p>
                      <Select
                        label={t('register.howHeard')}
                        value={data.howHeardAboutUs}
                        onChange={(e) => set('howHeardAboutUs', e.target.value)}
                      >
                        <option value="">{t('common.optional')}</option>
                        <option value="friend">{t('register.howHeardFriend')}</option>
                        <option value="social">{t('register.howHeardSocial')}</option>
                        <option value="search">{t('register.howHeardSearch')}</option>
                        <option value="event">{t('register.howHeardEvent')}</option>
                        <option value="other">{t('register.howHeardOther')}</option>
                      </Select>
                    </div>
                  )}

                  {step.id === 'review' && (
                    <div className="space-y-5">
                      <StepHeader
                        title={t('register.reviewTitle')}
                        subtitle={t('register.reviewSubtitle')}
                      />

                      <ReviewBlock
                        title={t('reg.studentInfo')}
                        onEdit={() => setStepIndex(0)}
                        editLabel={t('register.editSection')}
                        rows={[
                          [
                            t('common.name'),
                            `${data.firstName} ${data.lastName}`.trim() || '-',
                          ],
                          [t('register.dateOfBirth'), data.dateOfBirth || '-'],
                          [t('register.preferredName'), data.preferredName || '-'],
                        ]}
                      />
                      <ReviewBlock
                        title={t('reg.guardianInfo')}
                        onEdit={() => setStepIndex(1)}
                        editLabel={t('register.editSection')}
                        rows={[
                          [t('common.name'), data.guardianName || '-'],
                          [t('common.email'), data.guardianEmail || '-'],
                          [t('common.phone'), data.guardianPhone || '-'],
                          [
                            t('register.emergencyTitle'),
                            data.emergencyName
                              ? `${data.emergencyName} · ${data.emergencyPhone}`
                              : '-',
                          ],
                        ]}
                      />
                      <ReviewBlock
                        title={t('reg.academicInfo')}
                        onEdit={() => setStepIndex(2)}
                        editLabel={t('register.editSection')}
                        rows={[
                          [t('register.requestedGrade'), data.requestedGradeLevel || '-'],
                          [
                            t('register.turkishLevel'),
                            data.turkishLevel
                              ? t(
                                  `register.turkish${
                                    data.turkishLevel.charAt(0).toUpperCase() +
                                    data.turkishLevel.slice(1)
                                  }`,
                                )
                              : '-',
                          ],
                        ]}
                      />
                      <ReviewBlock
                        title={t('register.stepPlan')}
                        onEdit={() => setStepIndex(3)}
                        editLabel={t('register.editSection')}
                        rows={[
                          [
                            t('tuition.choosePlan'),
                            planOptions.find((p) => p.id === data.plan)?.name ?? '-',
                          ],
                        ]}
                      />

                      <div className="space-y-3 rounded-3xl bg-cream-200 p-5">
                        <p className="text-sm font-semibold text-ink-800">
                          {t('register.consentTitle')}
                        </p>
                        <Checkbox
                          label={t('register.photoConsent')}
                          checked={data.photoConsent}
                          onChange={(e) => set('photoConsent', e.target.checked)}
                        />
                        <Checkbox
                          label={t('register.termsConsent')}
                          checked={data.termsConsent}
                          onChange={(e) => set('termsConsent', e.target.checked)}
                          error={errors.termsConsent}
                        />
                      </div>

                      {failed && (
                        <div className="flex gap-3 rounded-xl border border-magenta-200 bg-magenta-50 p-4">
                          <CircleAlert
                            className="mt-0.5 h-4.5 w-4.5 shrink-0 text-magenta-600"
                            aria-hidden
                          />
                          <div>
                            <p className="text-sm font-semibold text-magenta-900">
                              {t('register.errorTitle')}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-magenta-700">
                              {t('register.errorBody')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer navigation */}
            <div className="flex items-center justify-between gap-3 border-t-2 border-ink-200 bg-cream-200 px-6 py-5 sm:px-8">
              <Button
                variant="ghost"
                onClick={goBack}
                disabled={stepIndex === 0 || submitting}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                {t('common.back')}
              </Button>

              <span className="text-xs font-medium text-ink-500">
                {t('register.step')} {stepIndex + 1} {t('common.of')} {STEPS.length}
              </span>

              {stepIndex < STEPS.length - 1 ? (
                <Button onClick={goNext} rightIcon={<ArrowRight className="h-4 w-4" />}>
                  {t('common.next')}
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  loading={submitting}
                  rightIcon={<Send className="h-4 w-4" />}
                >
                  {submitting ? t('common.sending') : t('register.submitApplication')}
                </Button>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-2">
      <h3 className="font-display text-xl font-bold text-ink">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{subtitle}</p>
    </div>
  )
}

function ReviewBlock({
  title,
  rows,
  onEdit,
  editLabel,
}: {
  title: string
  rows: [string, string][]
  onEdit: () => void
  editLabel: string
}) {
  return (
    <div className="rounded-3xl border-2 border-ink p-5">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-ink">{title}</h4>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-semibold text-marti-600 transition-colors hover:text-marti-800"
        >
          {editLabel}
        </button>
      </div>
      <dl className="mt-3.5 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-sm">
            <dt className="shrink-0 text-ink-500">{label}</dt>
            <dd className="truncate text-right font-medium text-ink-800">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
