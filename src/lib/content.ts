/**
 * Static marketing content for the public site.
 *
 * Values here are translation KEYS, not text — every string is resolved through
 * the i18n dictionary at render time so EN and TR stay in sync.
 *
 * NOTE FOR THE SCHOOL: tuition amounts below are PLACEHOLDERS. Replace the
 * `price` values in TUITION_PLANS with the school's real monthly rates.
 */

export interface ProgramContent {
  id: string
  nameKey: string
  ageKey: string
  descKey: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'heritage' | 'all'
  duration: string
  capacity: number
  icon: string
  accent: 'marti' | 'gold' | 'crimson' | 'emerald' | 'violet' | 'amber'
}

export const PROGRAMS: ProgramContent[] = [
  {
    id: 'little-sprouts',
    nameKey: 'programs.p1Name',
    ageKey: 'programs.p1Age',
    descKey: 'programs.p1Desc',
    level: 'beginner',
    duration: '1.5h',
    capacity: 12,
    icon: 'Sprout',
    accent: 'emerald',
  },
  {
    id: 'foundations',
    nameKey: 'programs.p2Name',
    ageKey: 'programs.p2Age',
    descKey: 'programs.p2Desc',
    level: 'beginner',
    duration: '3h',
    capacity: 16,
    icon: 'BookOpen',
    accent: 'marti',
  },
  {
    id: 'builders',
    nameKey: 'programs.p3Name',
    ageKey: 'programs.p3Age',
    descKey: 'programs.p3Desc',
    level: 'intermediate',
    duration: '3h',
    capacity: 18,
    icon: 'PenTool',
    accent: 'gold',
  },
  {
    id: 'young-voices',
    nameKey: 'programs.p4Name',
    ageKey: 'programs.p4Age',
    descKey: 'programs.p4Desc',
    level: 'advanced',
    duration: '3h',
    capacity: 18,
    icon: 'MessagesSquare',
    accent: 'violet',
  },
  {
    id: 'heritage',
    nameKey: 'programs.p5Name',
    ageKey: 'programs.p5Age',
    descKey: 'programs.p5Desc',
    level: 'heritage',
    duration: '3h',
    capacity: 16,
    icon: 'Home',
    accent: 'crimson',
  },
  {
    id: 'culture',
    nameKey: 'programs.p6Name',
    ageKey: 'programs.p6Age',
    descKey: 'programs.p6Desc',
    level: 'all',
    duration: '1.5h',
    capacity: 24,
    icon: 'Music',
    accent: 'amber',
  },
]

export interface TuitionPlan {
  id: string
  nameKey: string
  descKey: string
  /** PLACEHOLDER — replace with the school's real monthly rate. */
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
      'tuition.featureConference',
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
      'tuition.featurePriority',
    ],
  },
]

export const TUITION_FAQS = [
  { qKey: 'tuition.faq1Q', aKey: 'tuition.faq1A' },
  { qKey: 'tuition.faq2Q', aKey: 'tuition.faq2A' },
  { qKey: 'tuition.faq3Q', aKey: 'tuition.faq3A' },
  { qKey: 'tuition.faq4Q', aKey: 'tuition.faq4A' },
  { qKey: 'tuition.faq5Q', aKey: 'tuition.faq5A' },
  { qKey: 'tuition.faq6Q', aKey: 'tuition.faq6A' },
]

export const WHY_FEATURES = [
  { icon: 'GraduationCap', titleKey: 'home.why1Title', bodyKey: 'home.why1Body' },
  { icon: 'Layers', titleKey: 'home.why2Title', bodyKey: 'home.why2Body' },
  { icon: 'Drama', titleKey: 'home.why3Title', bodyKey: 'home.why3Body' },
  { icon: 'TrendingUp', titleKey: 'home.why4Title', bodyKey: 'home.why4Body' },
  { icon: 'CalendarDays', titleKey: 'home.why5Title', bodyKey: 'home.why5Body' },
  { icon: 'Users', titleKey: 'home.why6Title', bodyKey: 'home.why6Body' },
]

export const HOW_STEPS = [
  { titleKey: 'home.how1Title', bodyKey: 'home.how1Body', icon: 'FileText' },
  { titleKey: 'home.how2Title', bodyKey: 'home.how2Body', icon: 'Search' },
  { titleKey: 'home.how3Title', bodyKey: 'home.how3Body', icon: 'BadgeCheck' },
  { titleKey: 'home.how4Title', bodyKey: 'home.how4Body', icon: 'PartyPopper' },
]

/** Representative parent voices for the testimonials band. */
export const TESTIMONIALS = [
  {
    id: 't1',
    quoteEn:
      'My daughter went from refusing to speak Turkish to arguing with her grandmother on the phone. That is worth every Saturday morning.',
    quoteTr:
      'Kızım Türkçe konuşmayı reddederken şimdi telefonda anneannesiyle tartışıyor. Bu, her cumartesi sabahına değer.',
    nameEn: 'Ayşe D.',
    roleEn: 'Parent, Rockville',
    roleTr: 'Veli, Rockville',
  },
  {
    id: 't2',
    quoteEn:
      'The teachers actually know how to teach heritage kids. My son was bored everywhere else because he already spoke a little. Here he was placed properly on day one.',
    quoteTr:
      'Öğretmenler miras dili öğrencilerine nasıl öğreteceğini gerçekten biliyor. Oğlum biraz Türkçe bildiği için başka yerlerde sıkılıyordu. Burada ilk günden doğru sınıfa yerleştirildi.',
    nameEn: 'Mehmet K.',
    roleEn: 'Parent, Baltimore',
    roleTr: 'Veli, Baltimore',
  },
  {
    id: 't3',
    quoteEn:
      'We came for the language and stayed for the community. Our family found other Turkish families we now see every week.',
    quoteTr:
      'Dil için geldik, topluluk için kaldık. Ailemiz burada her hafta görüştüğümüz başka Türk aileler buldu.',
    nameEn: 'Zeynep A.',
    roleEn: 'Parent, Silver Spring',
    roleTr: 'Veli, Silver Spring',
  },
]

export const SCHOOL_STATS = [
  { value: 180, labelKey: 'home.statStudents', suffix: '+' },
  { value: 14, labelKey: 'home.statTeachers', suffix: '' },
  { value: 12, labelKey: 'home.statYears', suffix: '' },
  { value: 30, labelKey: 'home.statSaturdays', suffix: '' },
]

export const SATURDAY_SCHEDULE = [
  { time: '09:30', labelKey: 'calendar.time1' },
  { time: '10:00', labelKey: 'calendar.time2' },
  { time: '11:15', labelKey: 'calendar.time3' },
  { time: '11:45', labelKey: 'calendar.time4' },
  { time: '12:45', labelKey: 'calendar.time5' },
]

export const SCHOOL_INFO = {
  email: 'info@themartischool.org',
  phone: '(301) 555-0142',
  addressLines: ['Maryland Turkish American Inhabitants', 'Rockville, Maryland'],
  hoursKey: 'contact.hoursValue',
  officeKey: 'contact.officeValue',
}

export const GRADE_LEVELS = [
  'K',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
]

export const US_STATES = [
  'MD',
  'VA',
  'DC',
  'PA',
  'DE',
  'WV',
  'NJ',
  'NY',
  'NC',
  'Other',
]
