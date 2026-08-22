/**
 * Static marketing content for the public page.
 *
 * Values here are translation KEYS, not text, so EN and TR stay in sync.
 *
 * Organisation facts come from themarti.org. Tuition amounts are PLACEHOLDERS:
 * replace the `price` values in TUITION_PLANS with the school's real rates.
 */

export interface TuitionPlan {
  id: string
  nameKey: string
  descKey: string
  /** PLACEHOLDER: replace with the school's real monthly rate. */
  price: number
  featured: boolean
  featureKeys: string[]
}

export const TUITION_PLANS: TuitionPlan[] = [
  {
    id: 'standard',
    nameKey: 'tuition.planStandardName',
    descKey: 'tuition.planStandardDesc',
    price: 75,
    featured: false,
    featureKeys: [
      'tuition.featureWeeklyClass',
      'tuition.featureMaterials',
      'tuition.featureReports',
      'tuition.featurePortal',
    ],
  },
  {
    id: 'full',
    nameKey: 'tuition.planFullName',
    descKey: 'tuition.planFullDesc',
    price: 120,
    featured: true,
    featureKeys: [
      'tuition.featureWeeklyClass',
      'tuition.featureMaterials',
      'tuition.featureReports',
      'tuition.featurePortal',
      'tuition.featureCulture',
      'tuition.featureEvents',
    ],
  },
  {
    id: 'family',
    nameKey: 'tuition.planFamilyName',
    descKey: 'tuition.planFamilyDesc',
    price: 195,
    featured: false,
    featureKeys: [
      'tuition.featureWeeklyClass',
      'tuition.featureMaterials',
      'tuition.featureReports',
      'tuition.featurePortal',
      'tuition.featureCulture',
      'tuition.featureEvents',
      'tuition.featureSibling',
    ],
  },
]

export const WHY_FEATURES = [
  { emoji: '👩‍🏫', titleKey: 'home.why1Title', bodyKey: 'home.why1Body', accent: 'marti' as const },
  { emoji: '🎯', titleKey: 'home.why2Title', bodyKey: 'home.why2Body', accent: 'mint' as const },
  { emoji: '🪘', titleKey: 'home.why3Title', bodyKey: 'home.why3Body', accent: 'coral' as const },
  { emoji: '📈', titleKey: 'home.why4Title', bodyKey: 'home.why4Body', accent: 'sunshine' as const },
  { emoji: '📅', titleKey: 'home.why5Title', bodyKey: 'home.why5Body', accent: 'grape' as const },
  { emoji: '🤝', titleKey: 'home.why6Title', bodyKey: 'home.why6Body', accent: 'marti' as const },
]

export const HOW_STEPS = [
  { titleKey: 'home.how1Title', bodyKey: 'home.how1Body', emoji: '📝' },
  { titleKey: 'home.how2Title', bodyKey: 'home.how2Body', emoji: '🔍' },
  { titleKey: 'home.how3Title', bodyKey: 'home.how3Body', emoji: '🎫' },
  { titleKey: 'home.how4Title', bodyKey: 'home.how4Body', emoji: '🎉' },
]

/** Figures published by the organisation on themarti.org. */
export const SCHOOL_STATS = [
  { value: 168, labelKey: 'home.statStudents', suffix: '', emoji: '🎒' },
  { value: 25, labelKey: 'home.statTeachers', suffix: '', emoji: '👩‍🏫' },
  { value: 22, labelKey: 'home.statYears', suffix: '+', emoji: '🎂' },
  { value: 30, labelKey: 'home.statSaturdays', suffix: '', emoji: '📅' },
]

export const SATURDAY_SCHEDULE = [
  { time: '09:30', labelKey: 'calendar.time1', emoji: '👋' },
  { time: '10:00', labelKey: 'calendar.time2', emoji: '📖' },
  { time: '11:15', labelKey: 'calendar.time3', emoji: '🍎' },
  { time: '11:45', labelKey: 'calendar.time4', emoji: '🎨' },
  { time: '12:45', labelKey: 'calendar.time5', emoji: '🚗' },
]

/** Real organisation details, from themarti.org. */
export const SCHOOL_INFO = {
  orgName: 'Maryland Turkish-American Inhabitants',
  email: 'info@themarti.org',
  phone: '(410) 660-0501',
  addressLines: ['9115 Guilford Rd, Suite 200', 'Columbia, MD 21046'],
  foundedYear: 2003,
  website: 'https://www.themarti.org',
  social: {
    facebook: 'https://www.facebook.com/martimd',
    instagram: 'https://www.instagram.com/marti_youth',
    twitter: 'https://x.com/ATFAmd',
  },
}


export const US_STATES = ['MD', 'VA', 'DC', 'PA', 'DE', 'WV', 'NJ', 'NY', 'NC', 'Other']
