import type { LocalizedText, ProcessPhase, QualityCommitment, WorkingLanguage } from '@/types/content'

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
    "Artaveo is one person: I plan, design, build and deploy every project myself, end to end. There is no account manager between you and the code, and no handoff between a “design team” and a “dev team” — the same person who scopes the database schema also polishes the last pixel of the interface.",
    'آرتاویو یک نفر است: من هر پروژه را از ابتدا تا انتها خودم برنامه‌ریزی، طراحی، می‌سازم و مستقر می‌کنم. هیچ مدیر حسابی میان تو و کد نیست، و هیچ تحویل‌گیری‌ای میان یک «تیم طراحی» و یک «تیم توسعه» وجود ندارد — همان کسی که طرح پایگاه‌داده را مشخص می‌کند، آخرین پیکسل رابط کاربری را هم صیقل می‌دهد.',
  ),
  tx(
    'That shape comes from two real products, not a portfolio exercise: a booking and operations platform for intercity bus companies, and a bilingual portal and CMS for an educational institute. Both are covered in full on the Work page — architecture, the decisions I made, the trade-offs I accepted and the mistakes a security review actually caught. I would rather show that thinking than describe it in adjectives.',
    'این شکل از کار، از دو محصول واقعی می‌آید، نه یک تمرین نمونه‌کار: یک پلتفرم رزرو و مدیریت عملیات برای شرکت‌های اتوبوس‌رانی بین‌شهری، و یک پورتال و CMS دوزبانه برای یک مؤسسه‌ی آموزشی. هر دو به‌طور کامل در صفحه‌ی نمونه‌کارها آمده‌اند — معماری، تصمیم‌هایی که گرفتم، مصالحه‌هایی که پذیرفتم و اشتباهاتی که یک بررسی امنیتی واقعاً پیدا کرد. ترجیح می‌دهم آن تفکر را نشان بدهم تا با صفت توصیفش کنم.',
  ),
  tx(
    "Working solo means every decision is scoped to what one person can build and actually maintain — which is why the same account, the same repository conventions and the same review habits run through everything I ship, rather than a different standard per project.",
    'تنها کارکردن یعنی هر تصمیم به چیزی محدود می‌ماند که یک نفر بتواند بسازد و واقعاً نگهداری کند — به همین دلیل یک حساب واحد، قراردادهای یکسان در ریپازیتوری، و همان عادت‌های بازبینی در همه‌ی چیزهایی که تحویل می‌دهم جاری است، نه یک استاندارد متفاوت برای هر پروژه.',
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
      'محتوای فارسی آرتاویو — از جمله همین جمله — مستقیم نوشته می‌شود، نه ترجمه‌ی ماشینی (§ ۱۶.۲).',
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
      'زیاد — این فاز بر پایه‌ی چیزی است که تو می‌گویی؛ هرچه گفت‌وگوی اولیه دقیق‌تر باشد، غافلگیری‌های بعدی کمتر می‌شود.',
    ),
    decisionsAndRisks: tx(
      'Risk: a vague goal here becomes a vague product later. If the scope is genuinely unclear, I recommend a paid Discovery Sprint (see engagement models) instead of guessing.',
      'ریسک: یک هدف مبهم در این‌جا، بعداً به یک محصول مبهم تبدیل می‌شود. اگر محدوده‌ی کار واقعاً روشن نیست، به‌جای حدس‌زدن، یک Discovery Sprint پولی (نگاه کن به مدل‌های همکاری) پیشنهاد می‌دهم.',
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
      'یک محدوده‌ی کار و برآورد نوشته‌شده که پیش از نوشتن هر خطی از کد آن را تأیید می‌کنی.',
    ),
    clientInvolvement: tx(
      'High — this is the last point where scope is easy to change; after approval, changes follow the change-request process.',
      'زیاد — این آخرین نقطه‌ای است که تغییر محدوده‌ی کار آسان است؛ پس از تأیید، تغییرات از روند درخواست تغییر عبور می‌کنند.',
    ),
    decisionsAndRisks: tx(
      'Risk: skipping this phase to "start coding sooner" is how scope creep and missed deadlines happen. I do not skip it, even under time pressure.',
      'ریسک: رد شدن از این فاز برای «سریع‌تر شروع به کدنویسی کردن»، دقیقاً همان چیزی است که باعث افزایش بی‌رویه‌ی محدوده‌ی کار و عقب‌افتادن مهلت می‌شود. حتی زیر فشار زمانی هم از آن رد نمی‌شوم.',
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
      tx('Drafting the data shapes each screen actually needs, before any UI polish', 'پیش‌نویس ساختار داده‌ای که هر صفحه واقعاً به آن نیاز دارد، پیش از هر جلاسازی رابط کاربری'),
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
      'ریسک: طراحی صفحات بدون مدل داده‌ی پشت آن‌ها، رابط‌هایی می‌سازد که ظاهرشان درست است ولی همان‌طور که نشان داده شده قابل‌ساخت نیستند. دقیقاً به همین دلیل هر دو با هم پیش‌نویس می‌شوند.',
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
      'یک schema و یک یادداشت معماری که نحوه‌ی کنار هم قرارگرفتن قطعات را توضیح می‌دهد.',
    ),
    clientInvolvement: tx(
      'Low — mostly technical; surfaced back to you only where it changes cost, timeline or what a feature can do.',
      'کم — بیشتر فنی است؛ فقط جایی به تو بازتاب داده می‌شود که روی هزینه، زمان‌بندی یا توان یک فیچر تأثیر بگذارد.',
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
      'متوسط — یک ریتم منظم گزارش‌دهی (طبق توافق‌نامه‌ی همکاری) به‌علاوه‌ی دمو در هر نقطه‌ی عطف؛ هیچ‌وقت بدون خبر منتظر نمی‌مانی.',
    ),
    decisionsAndRisks: tx(
      'Anything discovered mid-build that changes scope is raised immediately as a change request, priced and agreed before it is built — never absorbed silently or invoiced as a surprise.',
      'هرچیزی که در میانه‌ی ساخت کشف شود و محدوده‌ی کار را تغییر دهد، فوراً به‌عنوان یک درخواست تغییر مطرح، قیمت‌گذاری و توافق می‌شود پیش از ساخته‌شدن — هرگز بی‌صدا جذب یا به‌عنوان یک غافلگیری صورت‌حساب نمی‌شود.',
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
      tx('A migration or schema change is validated against real data inside a transaction that is rolled back — never tested only in theory', 'هر تغییر migration یا schema، درون یک تراکنش که در پایان rollback می‌شود، روی داده‌ی واقعی اعتبارسنجی می‌شود — هرگز فقط در تئوری'),
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
      'در حال حاضر روی هر پروژه یک مجموعه‌ی تست خودکار اختصاصی وجود ندارد — این محدودیت آشکارا بیان می‌شود، نه پنهان یا کم‌رنگ؛ در همین حین، مسیرهای حساس (پرداخت، رزرو، احراز هویت) بیشترین بررسی دستی و آگاهانه را می‌گیرند.',
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
      'متوسط — تأیید نهایی بررسی go/no-go؛ حساب‌های دامنه و هاست به‌نام تو ساخته می‌شوند (طبق توافق‌نامه‌ی همکاری)، نه به‌نام من.',
    ),
    decisionsAndRisks: tx(
      "Risk: launching without monitoring means the first sign of trouble is a client complaint. Monitoring and error visibility ship with the launch, not after the first incident.",
      'ریسک: راه‌اندازی بدون مانیتورینگ یعنی اولین نشانه‌ی مشکل، شکایت یک مشتری خواهد بود. مانیتورینگ و دیده‌بانی خطا همراه با خودِ راه‌اندازی می‌آید، نه بعد از اولین حادثه.',
    ),
  },
  {
    id: 'support',
    icon: 'Wrench',
    title: tx('Support', 'پشتیبانی'),
    purpose: tx(
      'Keep the product correct and current after the first launch, not disappear once it ships.',
      'درست و به‌روز نگه‌داشتن محصول پس از اولین راه‌اندازی، نه ناپدیدشدن به‌محض تحویل.',
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
      'بازه‌ی دقیق ضمانت، تعهد پاسخ‌گویی و قیمت‌گذاری درخواست‌های تغییر، به‌محض انتشار صفحه‌ی توافق‌نامه‌ی همکاری (فاز ۸.۲) در آن‌جا منتشر می‌شود — چیزی فراتر از آنچه آن صفحه به‌صورت مکتوب بیان خواهد کرد، این‌جا وعده داده نمی‌شود.',
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
      'اعتبارسنجی، بررسی دسترسی، محدودیت نرخ درخواست و ذخیره‌سازی، همه سمت سرور انجام می‌شوند؛ مرورگر فقط وضعیت را نمایش می‌دهد، هرگز آن را تولید نمی‌کند.',
    ),
  },
  {
    icon: 'Eye',
    title: tx('Accessibility as a target, not polish', 'دسترس‌پذیری به‌عنوان هدف، نه جلاسازی'),
    description: tx(
      'WCAG 2.2 AA is the standard aimed for on every project — keyboard use, focus order, labels and contrast checked, not assumed.',
      'WCAG 2.2 AA استانداردی است که در هر پروژه هدف قرار می‌گیرد — استفاده از صفحه‌کلید، ترتیب فوکوس، برچسب‌ها و کنتراست چک می‌شوند، نه فرض‌گرفته‌شده.',
    ),
  },
  {
    icon: 'Languages',
    title: tx('Both locales, both directions', 'هر دو زبان، هر دو جهت'),
    description: tx(
      'English and Persian are verified together, LTR and RTL, on every phase that touches a page a visitor can reach — not retrofitted at the end.',
      'انگلیسی و فارسی با هم اعتبارسنجی می‌شوند، هم LTR و هم RTL، در هر فازی که به صفحه‌ای قابل‌دسترس برای بازدیدکننده برسد — نه چیزی که در پایان کار اضافه شود.',
    ),
  },
  {
    icon: 'FlaskConical',
    title: tx('Data validated before it ships', 'اعتبارسنجی داده پیش از تحویل'),
    description: tx(
      'Any schema or migration change is checked against real production data inside a transaction that is rolled back afterward — never tested only in theory.',
      'هر تغییر schema یا migration، درون یک تراکنش که در پایان rollback می‌شود، روی داده‌ی واقعیِ تولید چک می‌شود — هرگز فقط در تئوری تست‌نشده.',
    ),
  },
  {
    icon: 'FileText',
    title: tx('Documented, handed over, not locked in', 'مستندسازی و تحویل، نه قفل‌کردن مشتری'),
    description: tx(
      'Code and IP transfer to you on payment; third-party accounts are created in your name. The full handover package is published on the Working Agreement page.',
      'کد و مالکیت معنوی پس از پرداخت به تو منتقل می‌شود؛ حساب‌های شخص‌ثالث به‌نام تو ساخته می‌شوند. بسته‌ی کامل تحویل در صفحه‌ی توافق‌نامه‌ی همکاری منتشر می‌شود.',
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
