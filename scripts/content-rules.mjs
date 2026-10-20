/**
 * The public-copy rules of roadmap § 16, as patterns (Phase 32.3).
 *
 * One list for everything that checks public words: `scripts/check-content.mjs`
 * (the build and CI gate) and `tests/unit/i18n.test.mjs`. A rule has the
 * language it applies to (`fa`, `en` or `any`), a pattern and the reason a
 * reader would see in the report. Whole words only: a Persian letter (or the
 * zero-width non-joiner) may not sit right next to a Persian match, so «قابلیت»
 * is not «بلیت» and «تور» is not «تو».
 */

const FA = '\\u0600-\\u06FF\\u200C'
/** A Persian word on its own — not part of a longer word. */
const faWord = (body) => new RegExp(`(?<![${FA}])(?:${body})(?![${FA}])`)
/** A Persian word start — the word may go on (plural, suffix). */
const faStart = (body) => new RegExp(`(?<![${FA}])(?:${body})`)

/**
 * § 16.3 "avoid" column — Iranian usage where Dari has its own word.
 * Matched at a word start, so suffixed forms («صندلی‌ها») are caught too.
 */
export const IRANIAN_WORDS = [
  'اتوبوس',
  'صندلی',
  'بلیت',
  'دلار',
  'مشاوره',
  'کامپیوتر',
  'اینترنت',
  'اطلاعات',
  'دانشجو',
  'دانشگاه',
  'سامانه',
  'آمریکا',
  'رزرو',
  'ناوگان',
  'ایده(?!‌آل)',
  'جلو می‌',
  'سادگی',
  'وابستگی',
  'رسیدگی',
  'اتوبوس‌رانی',
]
export const IRANIAN_RE = faStart(IRANIAN_WORDS.join('|'))

/** @typedef {{ id: string, lang: 'fa' | 'en' | 'any', re: RegExp, why: string }} ContentRule */

/** @type {ContentRule[]} */
export const CONTENT_RULES = [
  // § 16.6 — a draft placeholder never ships.
  { id: 'placeholder', lang: 'any', re: /\[[A-Z][A-Z0-9_]*\]/, why: 'unresolved placeholder (§ 16.6)' },

  // § 16.1 rule 6 — nothing internal: roadmap sections and phase numbers.
  { id: 'roadmap-section', lang: 'any', re: /§/, why: 'roadmap section sign (§ 16.1 rule 6)' },
  { id: 'phase-number', lang: 'en', re: /\bPhase\s+\d/i, why: 'roadmap phase number (§ 16.1 rule 6)' },
  { id: 'phase-number', lang: 'fa', re: faStart('فاز\\s*[0-9۰-۹]'), why: 'roadmap phase number (§ 16.1 rule 6)' },

  // § 16.1 rules 1 and 3 — no technology names, no backend vocabulary.
  {
    id: 'tech-name',
    lang: 'any',
    re: /\b(?:React|Next\.js|Supabase|PostgreSQL|Postgres|TypeScript|Tailwind|Node\.js|Neon Auth|Data API|PostgREST|GitHub|Vercel Analytics)\b/,
    why: 'technology name (§ 16.1 rule 3)',
  },
  {
    id: 'jargon',
    lang: 'any',
    re: /\b(?:CMS|API|APIs|MVP|PWA|RTL|LTR|SEO|RLS|CSV|WCAG|CI|QA|UI|UX|SaaS)\b/,
    why: 'jargon acronym (§ 16.1 rule 3)',
  },
  {
    id: 'jargon',
    lang: 'en',
    re: /\b(?:sitemap|robots\.txt|Core Web Vitals|schema|migrations?|endpoints?|back-?end|front-?end|full-?stack|row-level|state machine|service-role|server-side|client-side|database|caching|cache|async|offline-first|deploy(?:ed|ment)?|codebase|tech stack|Discovery Sprint|Care Plan|engagement model)\b/i,
    why: 'backend or freelancer vocabulary (§ 16.1 rules 1 and 3)',
  },
  {
    id: 'jargon',
    lang: 'fa',
    re: faStart(
      [
        'پایگاه[ \\u200C]?داده',
        'دیتابیس',
        'سرور',
        'بک[ \\u200C]?اند',
        'فرانت[ \\u200C]?اند',
        'فول[ \\u200C]?استک',
        'مایگریشن',
        'کش(?![ا-ی])',
        'ریسپانسیو',
        'ویوپورت',
        'رندر',
        'کلاینت',
        'اسکیما',
        'دیپلوی',
      ].join('|'),
    ),
    why: 'backend vocabulary (§ 16.1 rules 1 and 3)',
  },

  // § 16.1 rules 5 and 6 — no number that makes Artaveo look small; languages never the headline.
  { id: 'two-languages', lang: 'fa', re: faStart('دو[ \\u200C]?زبانه'), why: '«دوزبانه» — say «چندزبانه», never a headline (§ 16.1 rule 5)' },
  { id: 'two-languages', lang: 'en', re: /\bbilingual\b/i, why: '"bilingual" — say "multilingual", never a headline (§ 16.1 rule 5)' },
  { id: 'one-person', lang: 'fa', re: faWord('یک نفر|به[ \\u200C]?تنهایی|توسعه[ \\u200C]?دهنده(?:ی مستقل)?|غیرتوسعه[ \\u200C]?دهنده'), why: '"one person" or developer framing (§ 16.1 rule 6, D-15)' },
  {
    id: 'one-person',
    lang: 'en',
    re: /\b(?:one person|one-person|solo|sole developer|independent developer|freelancer?|non-developer)\b/i,
    why: '"one person" or freelancer framing (§ 16.1 rule 6, D-15)',
  },

  // § 16.2 — the brand is the subject, the customer is «شما»; never «من» or «تو».
  { id: 'voice-i', lang: 'fa', re: faWord('من|مرا|برایم|خودم'), why: 'first person «من» (§ 16.2)' },
  { id: 'voice-i', lang: 'fa', re: new RegExp(`(?<![${FA}])می‌[${FA}]*[^ی${'\\u200C'}]م(?![${FA}])`), why: 'first-person verb (§ 16.2)' },
  { id: 'voice-you', lang: 'fa', re: faWord('تو|تُو'), why: 'informal «تو» — the customer is «شما» (§ 16.2)' },
  { id: 'voice-you', lang: 'fa', re: new RegExp(`(?<![${FA}])می‌[${FA}]*[^ی${'\\u200C'}]ی(?![${FA}])`), why: 'informal second-person verb — «شما» (§ 16.2)' },
  {
    id: 'voice-you',
    lang: 'fa',
    re: faWord(
      [
        // singular imperatives
        'کن|بکن|بنویس|بخوان|ببین|بگو|برگرد|بزن|بده|بفرست|بگیر|بپرس|بیا|بمان|نگهش دار',
        // singular "you" verbs and pronoun endings
        'داری|هستی|بودی|کردی|خواستی|گذاشتی|خواسته‌ای|کرده‌ای|داده‌ای|برایت|خودت|نظرت|رضایتت|هویتت|دستگاهت|ایمیلت|اتصالت|تغییرهایت',
      ].join('|'),
    ),
    why: 'informal «تو» form — the customer is «شما» (§ 16.2)',
  },
  { id: 'voice-you', lang: 'fa', re: new RegExp(`\\u200Cات(?![${FA}])`), why: 'informal «…‌ات» (your) — «… شما» (§ 16.2)' },
  { id: 'voice-i', lang: 'en', re: /(?:^|[^A-Za-z'])(?:I|I'm|I've|I'll|I'd|my|My|myself)(?![A-Za-z'])/, why: 'first person "I" (§ 16.2)' },

  // § 16.1 rule 7 — no defensive tone.
  { id: 'defensive', lang: 'fa', re: /[،,]\s*نه\s/, why: 'defensive «…، نه …» contrast (§ 16.1 rule 7)' },
  { id: 'defensive', lang: 'fa', re: faStart('صادقانه|نه با حدس'), why: 'defensive wording (§ 16.1 rule 7)' },
  { id: 'defensive', lang: 'en', re: /\b(?:honest(?:ly)?|not a static|not just)\b/i, why: 'defensive wording (§ 16.1 rule 7)' },

  // § 16.2 — banned without evidence.
  {
    id: 'unproven-claim',
    lang: 'en',
    re: /\b(?:world-class|top 1 ?%|10x|trusted by|industry-leading|team of experts|years of experience)\b/i,
    why: 'claim without evidence (§ 16.2, § 16.7)',
  },
  { id: 'unproven-claim', lang: 'fa', re: faStart('کلاس جهانی|سال‌ها تجربه|تیم متخصص'), why: 'claim without evidence (§ 16.2, § 16.7)' },

  // § 16.3 — Dari, not Iranian Persian.
  { id: 'iranian-word', lang: 'fa', re: IRANIAN_RE, why: 'Iranian usage — use the Dari word (§ 16.3)' },
]

/** Is this a Dari string (any Persian letter)? Strings without one are checked as English. */
export const isPersian = (text) => /[؀-ۿ]/.test(text)

/**
 * Every rule a string breaks. `lang` is the language the string belongs to
 * (`fa` / `en`); when unknown, it is guessed from the letters.
 */
export function findViolations(text, lang = isPersian(text) ? 'fa' : 'en') {
  if (typeof text !== 'string' || text.trim() === '') return []
  const hits = []
  for (const rule of CONTENT_RULES) {
    if (rule.lang !== 'any' && rule.lang !== lang) continue
    // English rules also run on the Latin words inside a Dari string («یک CMS اختصاصی»).
    const match = text.match(rule.re)
    if (match) hits.push({ id: rule.id, why: rule.why, match: match[0].trim() })
  }
  if (lang === 'fa') {
    const latinOnly = /\b(?:database|backend|frontend|full-stack|server|cache|offline-first|state machine|service-role|migration|rollback|developer|sandbox)\b/i
    const m = text.match(latinOnly)
    if (m) hits.push({ id: 'jargon', why: 'English backend term in Dari copy (§ 16.1 rule 3)', match: m[0] })
  }
  return hits
}
