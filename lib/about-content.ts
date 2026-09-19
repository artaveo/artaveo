import type {
  LocalizedText,
  ProcessPhase,
  QualityCommitment,
  WorkingAgreementItem,
  WorkingLanguage,
} from '@/types/content'

/**
 * About, Process & Quality baseline content (roadmap § 8.1).
 *
 * Same rules as `lib/home-content.ts`: only real, verifiable facts, shaped
 * so this can move onto `site_settings` / a dedicated table at Phase 12
 * without changing the pages or components that read it. Story paragraphs
 * intentionally avoid the banned claims in § 16.5 (no years-of-experience
 * count, no client list, no invented outcomes) — the proof lives on
 * `/work`, not here.
 */

function tx(en: string, fa: string): LocalizedText {
  return { en, fa }
}

/**
 * About page story — "not a CV" (§ 8.1). Paragraphs, not a bullet
 * timeline; every sentence is either a description of how the work is
 * done (verifiable against `/work`) or an already-resolved decision
 * (D-02, D-08) — nothing here is a new claim.
 */
const storyData: LocalizedText[] = [
  tx(
    "Artaveo is one person. I plan, design, build and deploy each project myself. There is no account-manager handoff between you and the code; the same person who designs the database also works through the interface details.",
    'آرتاویو یک نفر است. هر پروژه را از ابتدا تا انتها خودم برنامه‌ریزی، طراحی، می‌سازم و مستقر می‌کنم. واسطه‌ای بین تو و کد نیست و کار بین «تیم طراحی» و «تیم توسعه» دست‌به‌دست نمی‌شود. همان کسی که دیتابیس را طراحی می‌کند، جزئیات رابط کاربری را هم اصلاح می‌کند.',
  ),
  tx(
    'This approach comes from two real products, not a portfolio exercise: an intercity bus booking and operations platform, and a bilingual portal and CMS for an educational institute. The Work page documents their architecture, key decisions and security findings. I would rather show that work than dress it up with adjectives.',
    'این شکل از کار از دو محصول واقعی می‌آید، نه یک تمرین نمونه‌کار: یک پلتفرم رزرو و مدیریت عملیات برای شرکت‌های اتوبوس‌رانی بین‌شهری و یک پورتال و CMS دوزبانه برای یک مؤسسه‌ی آموزشی. در صفحه‌ی نمونه‌کارها معماری، تصمیم‌ها و یافته‌های بررسی امنیتی را مستند کرده‌ام. ترجیح می‌دهم این‌ها را نشان بدهم، نه با چند صفت توصیف کنم.',
  ),
  tx(
    "Working solo means every decision has to fit what one person can build and maintain. That is why the same coding conventions and review habits carry across the projects I ship.",
    'تنها کارکردن یعنی هر تصمیم باید چیزی باشد که یک نفر بتواند بسازد و بعد هم نگهداری کند. برای همین، قراردادهای کدنویسی و عادت‌های بازبینی را در همه‌ی پروژه‌ها یکسان نگه می‌دارم.',
  ),
]

/**
 * Languages worked in. `note` states the checkable fact — this site's own
 * two content languages — rather than a self-rated proficiency level
 * (roadmap § 16.5 bans invented, unverifiable metrics).
 */
const languagesData: WorkingLanguage[] = [
  {
    name: tx('Dari / Persian', 'دری / فارسی'),
    note: tx(
      "Artaveo's Persian content — including this sentence — is written directly, not machine-translated (§ 16.2).",
      'محتوای فارسی آرتاویو، از جمله همین متن، مستقیم نوشته می‌شود و ترجمه‌ی ماشینی نیست.',
    ),
  },
  {
    name: tx('English', 'انگلیسی'),
    note: tx(
      'Used for code, documentation, and every English page of this site.',
      'برای کد، مستندات و تمام صفحات انگلیسی این سایت استفاده می‌شود.',
    ),
  },
]

/**
 * The canonical 8-phase process (§ 8.1). Each phase carries the five
 * dimensions the roadmap asks for. Written as an honest description of
 * method, not a claim requiring external evidence — the method itself is
 * what a client is agreeing to when they start a project.
 */
const processPhasesData: ProcessPhase[] = [
  {
    id: 'discover',
    icon: 'Compass',
    title: tx('Discover', 'شناخت'),
    purpose: tx(
      'Understand the real problem before any solution is proposed.',
      'فهم مسئله‌ی واقعی، پیش از پیشنهاد دادن هر راه‌حلی.',
    ),
    activities: [
      tx('A written or call-based intake covering goals, users and constraints', 'یک گفت‌وگوی نوشتاری یا تماس درباره‌ی هدف‌ها، کاربران و محدودیت‌ها'),
      tx('Reviewing any existing system, content or brand material that already exists', 'بررسی هر سیستم، محتوا یا مواد برندی که از قبل وجود دارد'),
      tx('Naming constraints out loud: budget, deadline, team, infrastructure', 'نام‌بردن صریح محدودیت‌ها: بودجه، مهلت زمانی، تیم، زیرساخت'),
    ],
    output: tx(
      'A one-page problem statement both sides agree describes the real goal.',
      'یک بیانیه‌ی مسئله‌ی یک‌صفحه‌ای که هر دو طرف روی توصیف‌کردنش از هدف واقعی توافق دارند.',
    ),
    clientInvolvement: tx(
      'High — this phase runs on what you tell me; the better the intake, the fewer surprises later.',
      'زیاد — این فاز بر اطلاعاتی که تو می‌دهی بنا می‌شود. هرچه گفت‌وگوی اولیه دقیق‌تر باشد، ابهام و تغییرات بعدی کمتر می‌شود.',
    ),
    decisionsAndRisks: tx(
      'Risk: a vague goal here becomes a vague product later. If the scope is genuinely unclear, I recommend a paid Discovery Sprint (see engagement models) instead of guessing.',
      'ریسک: هدف مبهم خیلی زود به محصول مبهم تبدیل می‌شود. اگر محدوده روشن نباشد، به‌جای حدس‌زدن، یک Discovery Sprint پولی پیشنهاد می‌دهم.',
    ),
  },
  {
    id: 'define',
    icon: 'Radar',
    title: tx('Define', 'تعریف'),
    purpose: tx(
      'Turn the problem statement into a concrete, scoped plan.',
      'تبدیل بیانیه‌ی مسئله به یک برنامه‌ی مشخص و محدودشده.',
    ),
    activities: [
      tx('Breaking the goal into features and prioritizing what actually needs to exist for launch', 'شکستن هدف به فیچرها و اولویت‌بندی آنچه واقعاً برای راه‌اندازی لازم است'),
      tx('Choosing the engagement model that fits — fixed-scope, productized package, or ongoing', 'انتخاب مدل همکاری متناسب — محدوده‌ی ثابت، پکیج آماده، یا همکاری مستمر'),
      tx('Writing the estimate: timeline range and what would change it', 'نوشتن برآورد: بازه‌ی زمانی و چیزهایی که می‌توانند آن را تغییر دهند'),
    ],
    output: tx(
      'A written scope and estimate you approve before any code is written.',
      'یک محدوده‌ی کار و برآورد نوشته‌شده که پیش از شروع کدنویسی تأیید می‌کنی.',
    ),
    clientInvolvement: tx(
      'High — this is the last point where scope is easy to change; after approval, changes follow the change-request process.',
      'زیاد — این آخرین نقطه‌ای است که تغییر محدوده آسان است. بعد از تأیید، تغییرات وارد روند درخواست تغییر می‌شوند.',
    ),
    decisionsAndRisks: tx(
      'Risk: skipping this phase to "start coding sooner" is how scope creep and missed deadlines happen. I do not skip it, even under time pressure.',
      'ریسک: ردکردن این فاز برای شروع سریع‌تر کدنویسی معمولاً به افزایش محدوده و عقب‌افتادن زمان تحویل منجر می‌شود. حتی زیر فشار زمانی هم از آن عبور نمی‌کنم.',
    ),
  },
  {
    id: 'design',
    icon: 'Palette',
    title: tx('Design', 'طراحی'),
    purpose: tx(
      'Shape the interface and the data model together, not in separate silos.',
      'شکل‌دادن هم‌زمان رابط کاربری و مدل داده، نه در جعبه‌های جدا از هم.',
    ),
    activities: [
      tx('Wireframes or low-fidelity layouts for the key screens', 'وایرفریم یا چیدمان‌های اولیه برای صفحات کلیدی'),
      tx('Drafting the data shapes each screen actually needs, before any UI polish', 'پیش‌نویس ساختار داده‌ای که هر صفحه واقعاً به آن نیاز دارد، پیش از پرداخت نهایی رابط کاربری'),
      tx('A short review round so direction is confirmed before full builds begin', 'یک دور بازبینی کوتاه تا مسیر پیش از شروع ساخت کامل تأیید شود',),
    ],
    output: tx(
      'Approved screens (or a design-system extension, for internal tools) and a settled data shape.',
      'صفحات تأییدشده (یا گسترش سیستم طراحی، برای ابزارهای داخلی) و یک ساختار داده‌ی مشخص‌شده.',
    ),
    clientInvolvement: tx(
      'Medium — one or two review rounds; async written feedback works as well as a call.',
      'متوسط — یک یا دو دور بازبینی؛ بازخورد نوشتاری async هم به‌اندازه‌ی یک تماس کارساز است.',
    ),
    decisionsAndRisks: tx(
      'Risk: designing screens without the data model behind them produces interfaces that look right and cannot actually be built as shown. Both are drafted together for exactly this reason.',
      'ریسک: ممکن است صفحه در ظاهر درست باشد، اما مدل داده از ساخت آن پشتیبانی نکند. برای همین، ساختار داده و صفحه‌های کلیدی را از ابتدا کنار هم بررسی می‌کنم.',
    ),
  },
  {
    id: 'architect',
    icon: 'Blocks',
    title: tx('Architect', 'معماری'),
    purpose: tx(
      'Decide the system boundaries before writing the code that depends on them.',
      'تعیین مرزهای سیستم، پیش از نوشتن کدی که به آن‌ها وابسته است.',
    ),
    activities: [
      tx('Database schema, relationships and row-level security policy design', 'طرح پایگاه‌داده، روابط و طراحی سیاست‌های row-level security'),
      tx('Deciding what runs on the server versus the client, and where every mutation is validated', 'تعیین این‌که چه‌چیزی سمت سرور اجرا شود و چه‌چیزی سمت کلاینت، و هر تغییر کجا اعتبارسنجی می‌شود'),
      tx('Choosing provider abstractions for email, storage, auth and payments so nothing is hard-wired to one vendor', 'انتخاب لایه‌های انتزاعی برای ایمیل، ذخیره‌سازی، احراز هویت و پرداخت تا چیزی مستقیم به یک تأمین‌کننده وصل نشود'),
    ],
    output: tx(
      'A schema and an architecture note describing how the pieces fit together.',
      'یک schema و یادداشت معماری که ارتباط بین بخش‌های اصلی سیستم را توضیح می‌دهد.',
    ),
    clientInvolvement: tx(
      'Low — mostly technical; surfaced back to you only where it changes cost, timeline or what a feature can do.',
      'کم — این بخش عمدتاً فنی است و فقط وقتی روی هزینه، زمان‌بندی یا امکان‌پذیری یک feature اثر بگذارد با تو مرور می‌شود.',
    ),
    decisionsAndRisks: tx(
      'This is where "the browser is never the source of truth" (a hard rule, not a preference) gets decided concretely — e.g. what a database trigger enforces versus what the app layer checks.',
      'دقیقاً همین‌جا است که «مرورگر هرگز منبع حقیقت نیست» (یک قانون سخت، نه یک ترجیح) به‌شکل مشخص تصمیم‌گیری می‌شود — مثلاً چه‌چیزی را یک تریگر دیتابیس اجرا می‌کند و چه‌چیزی را لایه‌ی اپ چک می‌کند.',
    ),
  },
  {
    id: 'build',
    icon: 'Code',
    title: tx('Build', 'ساخت'),
    purpose: tx(
      'Develop in small, reviewable increments rather than one long silent stretch.',
      'توسعه در گام‌های کوچک و قابل‌بازبینی، نه یک بازه‌ی طولانی و بی‌خبر.',
    ),
    activities: [
      tx('Feature-by-feature implementation against the approved scope', 'پیاده‌سازی فیچربه‌فیچر بر اساس محدوده‌ی کار تأییدشده'),
      tx('Regular written progress updates — what shipped, what is next', 'گزارش پیشرفت نوشتاری منظم — چه چیزی تحویل شد، بعدی چیست'),
      tx('Demos at each milestone rather than only at the very end', 'دمو در هر نقطه‌ی عطف، نه فقط در انتهای کار'),
    ],
    output: tx(
      'Working, demoable increments landing on the agreed milestone schedule.',
      'گام‌های کاری و قابل‌دمو که طبق برنامه‌ی نقاط عطف توافق‌شده تحویل داده می‌شوند.',
    ),
    clientInvolvement: tx(
      'Medium — a standing update cadence (Working Agreement) plus a demo per milestone; you are never left waiting without word.',
      'متوسط — گزارش‌های منظم و یک دمو در پایان هر نقطه‌ی عطف. قرار نیست پروژه بی‌خبر جلو برود.',
    ),
    decisionsAndRisks: tx(
      'Anything discovered mid-build that changes scope is raised immediately as a change request, priced and agreed before it is built — never absorbed silently or invoiced as a surprise.',
      'هر چیزی که در میانه‌ی ساخت دامنه را تغییر دهد، به‌عنوان درخواست تغییر مطرح می‌شود. قبل از اجرا درباره‌ی محدوده و قیمت توافق می‌کنیم.',
    ),
  },
  {
    id: 'test',
    icon: 'FlaskConical',
    title: tx('Test', 'آزمایش'),
    purpose: tx(
      'Check behavior against reality, not just against the happy path.',
      'بررسی رفتار در برابر واقعیت، نه فقط مسیر خوش‌بینانه.',
    ),
    activities: [
      tx('Manual verification of loading, empty, error and edge states', 'بررسی دستی حالت‌های بارگذاری، خالی، خطا و لبه‌ای'),
      tx('Cross-device, cross-browser, both-locale and both-theme checks (§ 17 Definition of Done)', 'بررسی روی چند دستگاه، چند مرورگر، هر دو زبان و هر دو تم (طبق § ۱۷ تعریف انجام‌شده)'),
      tx('A migration or schema change is validated against real data inside a transaction that is rolled back — never tested only in theory', 'هر تغییر migration یا schema روی داده‌ی واقعی و داخل تراکنشی که در پایان rollback می‌شود اعتبارسنجی می‌شود؛ این تغییرها فقط در تئوری تست نمی‌شوند.'),
    ],
    output: tx(
      'A verification checklist attached to the build, not a verbal "it works on my machine."',
      'یک چک‌لیست اعتبارسنجی همراه با تحویل، نه یک ادعای شفاهیِ «روی سیستم من کار می‌کند».',
    ),
    clientInvolvement: tx(
      'Low, unless user-acceptance testing is agreed as part of the scope — in which case you get a clear checklist to test against.',
      'کم، مگر این‌که تست پذیرش کاربر بخشی از محدوده‌ی کار توافق‌شده باشد — در آن صورت یک چک‌لیست روشن برای تست‌کردن دریافت می‌کنی.',
    ),
    decisionsAndRisks: tx(
      'There is no dedicated automated test suite on every project today — a limitation stated openly rather than implied away; critical flows (payments, bookings, auth) get the most deliberate manual scrutiny in the meantime.',
      'در حال حاضر هر پروژه مجموعه‌ی تست خودکار اختصاصی ندارد. این محدودیت را صریح می‌گویم و در عوض مسیرهای حساس مثل پرداخت، رزرو و احراز هویت را با دقت دستی بررسی می‌کنم.',
    ),
  },
  {
    id: 'launch',
    icon: 'Rocket',
    title: tx('Launch', 'راه‌اندازی'),
    purpose: tx(
      'Deploy to production in a way that is repeatable and observable, not a one-off manual scramble.',
      'استقرار روی محیط تولید به‌شکلی تکرارپذیر و قابل‌رصد، نه یک تلاش دستی و یک‌باره.',
    ),
    activities: [
      tx('Environment and configuration audit before flipping the switch', 'بازبینی محیط و تنظیمات پیش از فعال‌سازی نهایی'),
      tx('A go/no-go content and functionality check against the approved scope', 'بررسی نهایی محتوا و عملکرد در برابر محدوده‌ی کار تأییدشده، پیش از تصمیم قطعی راه‌اندازی'),
      tx('Deploying with monitoring in place from the first minute, not added afterward', 'استقرار همراه با مانیتورینگ از همان دقیقه‌ی اول، نه اضافه‌شده در ادامه'),
    ],
    output: tx(
      'A live product, plus a short record of what was deployed and when.',
      'یک محصول زنده، به‌علاوه‌ی یک ثبت کوتاه از این‌که چه‌چیزی و چه‌زمانی مستقر شد.',
    ),
    clientInvolvement: tx(
      'Medium — sign-off on the go/no-go check; domain and hosting accounts are created in your name (Working Agreement), not mine.',
      'متوسط — تو تصمیم نهایی go/no-go را تأیید می‌کنی. حساب‌های دامنه و هاست هم طبق توافق‌نامه به نام تو ساخته می‌شوند.',
    ),
    decisionsAndRisks: tx(
      "Risk: launching without monitoring means the first sign of trouble is a client complaint. Monitoring and error visibility ship with the launch, not after the first incident.",
      'ریسک: بدون مانیتورینگ، ممکن است مشکل را دیر بفهمیم. در جاهایی که دامنه‌ی پروژه اجازه دهد، مانیتورینگ و گزارش خطا را از زمان راه‌اندازی در نظر می‌گیرم.',
    ),
  },
  {
    id: 'support',
    icon: 'Wrench',
    title: tx('Support', 'پشتیبانی'),
    purpose: tx(
      'Keep the product correct and current after the first launch, not disappear once it ships.',
      'محصول بعد از راه‌اندازی هم قابل نگهداری و به‌روزرسانی بماند؛ تحویل پایان ارتباط نیست.',
    ),
    activities: [
      tx('Fixing defects inside the published warranty window (Working Agreement)', 'رفع نقص‌ها در بازه‌ی ضمانت منتشرشده (طبق توافق‌نامه‌ی همکاری)'),
      tx('Scoping and pricing change requests and new features as they come up', 'تعیین محدوده و قیمت‌گذاری درخواست‌های تغییر و فیچرهای تازه به‌محض مطرح‌شدن'),
      tx('An optional Care Plan for ongoing monitoring, small changes and backups checks', 'یک Care Plan اختیاری برای مانیتورینگ مستمر، تغییرات کوچک و بررسی پشتیبان‌گیری‌ها'),
    ],
    output: tx(
      'A product that keeps working — and a clear, published path for what happens when something needs to change.',
      'محصولی که همچنان کار می‌کند — و یک مسیر روشن و منتشرشده برای زمانی که چیزی نیاز به تغییر دارد.',
    ),
    clientInvolvement: tx(
      'As needed — driven by you reporting an issue or requesting a change, through the same direct channel used during the build.',
      'در صورت نیاز — با گزارش یک مشکل یا درخواست یک تغییر از سوی تو، از همان کانال مستقیمی که در طول ساخت استفاده می‌شد.',
    ),
    decisionsAndRisks: tx(
      'The exact warranty window, response commitment and change-request pricing are published on the Working Agreement page once it ships (Phase 8.2) — nothing here is promised beyond what that page will state in writing.',
      'بازه‌ی دقیق ضمانت، تعهد پاسخ‌گویی و قیمت‌گذاری درخواست‌های تغییر در صفحه‌ی توافق‌نامه‌ی همکاری منتشر می‌شود. اینجا چیزی بیشتر از آنچه مکتوب خواهد شد وعده نمی‌دهم.',
    ),
  },
]

/**
 * Quality baseline (§ 8.1) — every entry traces to a standard already
 * written into this roadmap (§ 2, § 3, § 17) or to practice already
 * demonstrated in a shipped case study (`lib/home-content.ts`), never a
 * new promise invented for this page.
 */
const qualityCommitmentsData: QualityCommitment[] = [
  {
    icon: 'Code',
    title: tx('Typed code end to end', 'کد تایپ‌شده از ابتدا تا انتها'),
    description: tx(
      'TypeScript across frontend and backend, checked with `tsc --noEmit` before anything ships — not caught only at runtime.',
      'TypeScript در سراسر فرانت‌اند و بک‌اند، پیش از هر تحویلی با `tsc --noEmit` چک می‌شود — نه چیزی که فقط در زمان اجرا کشف شود.',
    ),
  },
  {
    icon: 'ShieldCheck',
    title: tx('Server-enforced mutations', 'اجرای هر تغییر در سمت سرور'),
    description: tx(
      'Validation, authorization, rate limiting and persistence happen server-side; the browser only ever displays state, never originates it.',
      'اعتبارسنجی، بررسی دسترسی، rate limit و ذخیره‌سازی سمت سرور انجام می‌شوند. مرورگر فقط وضعیت را نمایش می‌دهد؛ تصمیم حساس را تولید نمی‌کند.',
    ),
  },
  {
    icon: 'Eye',
    title: tx('Accessibility as a target, not polish', 'دسترس‌پذیری یک هدف است، نه مرحله‌ی آخر'),
    description: tx(
      'WCAG 2.2 AA is the standard aimed for on every project — keyboard use, focus order, labels and contrast checked, not assumed.',
      'WCAG 2.2 AA استاندارد هدف است. استفاده با صفحه‌کلید، ترتیب فوکوس، برچسب‌ها و کنتراست را بررسی می‌کنم؛ نه این‌که فرض بگیرم درست هستند.',
    ),
  },
  {
    icon: 'Languages',
    title: tx('Both locales, both directions', 'هر دو زبان، هر دو جهت'),
    description: tx(
      'English and Persian are verified together, LTR and RTL, on every phase that touches a page a visitor can reach — not retrofitted at the end.',
      'انگلیسی و فارسی در کنار LTR و RTL در طول ساخت بررسی می‌شوند؛ زبان و راست‌چین‌بودن چیزی نیست که در پایان اضافه شود.',
    ),
  },
  {
    icon: 'FlaskConical',
    title: tx('Data validated before it ships', 'اعتبارسنجی داده پیش از تحویل'),
    description: tx(
      'Any schema or migration change is checked against real production data inside a transaction that is rolled back afterward — never tested only in theory.',
      'هر تغییر schema یا migration روی داده‌ی واقعی تولید و داخل یک تراکنش rollback‌شونده بررسی می‌شود؛ فقط روی داده‌ی فرضی آزمایش نمی‌کنم.',
    ),
  },
  {
    icon: 'FileText',
    title: tx('Documented, handed over, not locked in', 'مستندسازی و تحویل، نه قفل‌کردن مشتری'),
    description: tx(
      'Code and IP transfer to you on payment; third-party accounts are created in your name. The full handover package is published on the Working Agreement page.',
      'بعد از پرداخت، کد و مالکیت معنوی طبق توافق به تو منتقل می‌شود. حساب‌های شخص‌ثالث هم به نام تو ساخته می‌شوند؛ جزئیات بسته‌ی تحویل در توافق‌نامه‌ی همکاری می‌آید.',
    ),
  },
]

/**
 * Working Agreement — "How we'll work" (roadmap § 8.2). Per D-13, no
 * sitewide deposit percentage or warranty day-count is invented: payment
 * split and warranty length are stated as a mechanism (agreed per
 * engagement, during Define) rather than one fixed figure applied to
 * every project regardless of size. Everything else here quotes a
 * commitment already written into this roadmap (ownership, handover,
 * response commitment/D-08) — nothing new is promised beyond what the
 * roadmap itself already states.
 */
const workingAgreementItemsData: WorkingAgreementItem[] = [
  {
    id: 'communication',
    icon: 'MessagesSquare',
    title: tx('Communication & cadence', 'ارتباط و ریتم گزارش‌دهی'),
    summary: tx(
      'Direct contact with me, on a predictable rhythm — not silence until the very end.',
      'ارتباط مستقیم و منظم؛ قرار نیست تا روز تحویل بی‌خبر بمانی.',
    ),
    points: [
      tx(
        'A short written update at least once a week while a project is active',
        'یک گزارش نوشتاری کوتاه، دست‌کم هفته‌ای یک‌بار تا زمانی که پروژه فعال است',
      ),
      tx(
        'A demo at the end of every milestone (§ Process — Build), not only at final delivery',
        'یک دمو در پایان هر نقطه‌ی عطف، نه فقط در تحویل نهایی',
      ),
      tx(
        'No account manager and no hand-off — you talk to the person who made the last decision on your project',
        'واسطه‌ای در میان نیست؛ مستقیم با کسی صحبت می‌کنی که روی پروژه‌ات تصمیم می‌گیرد',
      ),
    ],
  },
  {
    id: 'response',
    icon: 'Clock',
    title: tx('Response commitment', 'تعهد پاسخ‌گویی'),
    summary: tx(
      'Replies within a few hours, same day (D-08) — published, and tracked once the admin lead pipeline ships (Phase 14).',
      'پاسخ‌گویی در همان روز، طی چند ساعت (D-08) — منتشرشده، و پس از راه‌اندازی پایپ‌لاین سرنخ‌های ادمین (فاز ۱۴) ردیابی می‌شود.',
    ),
  },
  {
    id: 'payment',
    icon: 'Wallet',
    title: tx('Payment, milestones & deposits', 'پرداخت، نقاط عطف و پیش‌پرداخت'),
    summary: tx(
      'Payment follows the schedule of the engagement model you start under (§ Process — Define), not one number applied to every project alike.',
      'پرداخت از برنامه‌ی مدل همکاری‌ای که با آن شروع می‌کنی پیروی می‌کند (§ روند کار — تعریف)، نه یک عدد یکسان برای همه‌ی پروژه‌ها.',
    ),
    points: [
      tx(
        'Discovery Sprint: fixed price, paid upfront for a fixed deliverable',
        'Discovery Sprint: قیمت ثابت، پیش‌پرداخت کامل برای یک خروجی مشخص',
      ),
      tx(
        'Fixed-scope Project: billed by milestone, agreed during Define — larger projects split across more milestones instead of one lump sum',
        'پروژه با محدوده‌ی ثابت: صورت‌حساب بر اساس نقطه‌ی عطف، توافق‌شده در فاز تعریف — پروژه‌های بزرگ‌تر بین نقاط عطف بیشتری تقسیم می‌شوند، نه یک مبلغ یک‌جا',
      ),
      tx(
        'Productized Service: package price plus any add-ons, due per that package\u2019s own delivery timeline',
        'سرویس پکیج‌شده: قیمت پکیج به‌علاوه‌ی هر add-on، طبق زمان‌بندی تحویل همان پکیج',
      ),
      tx(
        'Care Plan / Long-term Part-time: billed monthly, in advance',
        'Care Plan / همکاری پاره‌وقت بلندمدت: صورت‌حساب ماهانه، پیش از شروع ماه',
      ),
      tx(
        'A deposit is due before work begins on any new engagement; the exact split is written into that project\u2019s own agreement during Define, sized to the project rather than fixed sitewide (D-13)',
        'برای هر همکاری تازه، پیش از شروع کار یک پیش‌پرداخت لازم است؛ نسبت دقیق آن در قرارداد همان پروژه، در فاز تعریف مشخص می‌شود — متناسب با پروژه، نه یک عدد ثابت برای همه (D-13)',
      ),
      tx(
        'No online payment gateway is wired into this site yet (Phase 9); invoices are sent and paid through the channel agreed during Define',
        'هنوز هیچ درگاه پرداخت آنلاینی به این سایت وصل نیست (فاز ۹)؛ فاکتورها از طریق کانالی که در فاز تعریف توافق می‌شود ارسال و پرداخت می‌شوند',
      ),
    ],
  },
  {
    id: 'ownership',
    icon: 'KeyRound',
    title: tx('Ownership', 'مالکیت'),
    summary: tx(
      'Code and intellectual property transfer to you on payment — nothing is held back as leverage.',
      'کد و مالکیت معنوی پس از پرداخت به تو منتقل می‌شود؛ چیزی برای نگه‌داشتن اهرم فشار نزد من نمی‌ماند.',
    ),
    points: [
      tx(
        'Every deliverable\u2019s source code and IP transfers to you once it\u2019s paid for',
        'کد منبع و مالکیت معنوی هر خروجی، بعد از پرداخت به تو منتقل می‌شود',
      ),
      tx(
        'Third-party accounts your project depends on — domain registrar, hosting, database, analytics — are created in your name from the start, not mine',
        'حساب‌های شخص‌ثالثی که پروژه‌ات به آن‌ها وابسته است — ثبت دامنه، هاست، پایگاه‌داده، آنالیتیکس — از همان ابتدا به‌نام تو ساخته می‌شوند، نه به‌نام من',
      ),
      tx(
        'If an account genuinely has to be created under my name first for a technical reason, ownership transfers to you as part of handover — not left running under my account indefinitely',
        'اگر یک حساب به دلیل فنی واقعاً ابتدا باید به‌نام من ساخته شود، مالکیتش بخشی از فرایند تحویل به تو منتقل می‌شود — نه این‌که تا ابد زیر حساب من باقی بماند',
      ),
    ],
  },
  {
    id: 'handover',
    icon: 'FileText',
    title: tx('Handover package', 'بسته‌ی تحویل'),
    summary: tx(
      'A complete, working handover — not a code drop with no instructions.',
      'یک تحویل کامل و قابل‌استفاده؛ نه فقط تحویل یک کد خام.',
    ),
    points: [
      tx('The full repository, with commit history intact', 'کل ریپازیتوری، با تاریخچه‌ی کامل commitها'),
      tx(
        'Documentation covering what was built and how it fits together (§ Quality baseline)',
        'مستنداتی که توضیح می‌دهد چه چیزی ساخته شده و بخش‌های اصلی چطور به هم وصل‌اند (§ خط پایه‌ی کیفیت)',
      ),
      tx(
        'An environment template (`.env.example`) so the project can be set up on a clean machine without guessing which variables it needs',
        'یک الگوی محیط (`.env.example`) تا پروژه روی یک سیستم تازه، بدون حدس‌زدن متغیرهای لازم، راه‌اندازی شود',
      ),
      tx(
        'A short runbook: how to deploy, how to roll back, who to contact if something breaks',
        'یک راهنمای کوتاه اجرایی: چطور دیپلوی کنیم، چطور rollback کنیم، در صورت مشکل با چه‌کسی تماس بگیریم',
      ),
      tx(
        'Credentials transfer for anything still under my access, coordinated during Launch and Support (§ Process)',
        'انتقال اطلاعات دسترسی برای هرچیزی که هنوز زیر دسترسی من است، هماهنگ‌شده در فازهای راه‌اندازی و پشتیبانی (§ روند کار)',
      ),
    ],
  },
  {
    id: 'warranty',
    icon: 'ShieldCheck',
    title: tx('Warranty & change requests', 'ضمانت و درخواست‌های تغییر'),
    summary: tx(
      'A warranty window covers defects after delivery; anything beyond the agreed scope is a change request, priced before it\u2019s built.',
      'یک بازه‌ی ضمانت، نقص‌های پس از تحویل را پوشش می‌دهد؛ هرچیز فراتر از محدوده‌ی توافق‌شده، یک درخواست تغییر است که پیش از ساخته‌شدن قیمت‌گذاری می‌شود.',
    ),
    points: [
      tx(
        'A specific warranty length is written into every project\u2019s own agreement during Define — not one blanket number here, since a landing page and a payment platform carry very different risk (D-13)',
        'طول دقیق بازه‌ی ضمانت در قرارداد همان پروژه، در فاز تعریف مشخص می‌شود — نه یک عدد یکسان اینجا، چون یک صفحه‌ی فرود و یک پلتفرم پرداخت ریسک بسیار متفاوتی دارند (D-13)',
      ),
      tx(
        'A defect is something that doesn\u2019t match the agreed scope; a change request is something new or different from what was agreed — the distinction is made explicit before work starts, not argued about after',
        'نقص یعنی چیزی که با محدوده‌ی توافق‌شده مطابقت ندارد. درخواست تغییر یعنی چیزی تازه یا متفاوت از توافق. این تفاوت را قبل از شروع روشن می‌کنیم.',
      ),
      tx(
        'Change requests are scoped and quoted the same way the original engagement was (§ Process — Define) before they\u2019re built — never silently absorbed or invoiced as a surprise',
        'درخواست‌های تغییر هم قبل از اجرا محدوده‌بندی و قیمت‌گذاری می‌شوند؛ چیزی بی‌صدا به پروژه اضافه نمی‌شود.',
      ),
    ],
  },
  {
    id: 'confidentiality',
    icon: 'Lock',
    title: tx('Confidentiality', 'محرمانگی'),
    summary: tx(
      'An NDA is available on request, signed before Discover begins, if your project needs one.',
      'در صورت نیاز پروژه‌ات، یک توافق‌نامه‌ی محرمانگی (NDA) پیش از شروع فاز شناخت، بنا به درخواست تو قابل‌امضا است.',
    ),
  },
]

export function getAboutStory(): LocalizedText[] {
  return storyData
}

export function getWorkingLanguages(): WorkingLanguage[] {
  return languagesData
}

export function getProcessPhases(): ProcessPhase[] {
  return processPhasesData
}

export function getQualityCommitments(): QualityCommitment[] {
  return qualityCommitmentsData
}

export function getWorkingAgreementItems(): WorkingAgreementItem[] {
  return workingAgreementItemsData
}
