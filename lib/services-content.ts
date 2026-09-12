import type {
  EngagementModel,
  FaqItem,
  LocalizedText,
  Price,
  Service,
  ServiceAddon,
  ServicePackage,
  ServiceProcessStep,
} from '@/types/content'

/**
 * Service catalogue (roadmap § 7.1).
 *
 * The seven curated services below replace the earlier ad hoc six-item list
 * that used to live in `lib/home-content.ts` — that list and this one were
 * drifting into two different service catalogues on the same site, which
 * violates § 2 principle 9 (one typed content shape, one source of truth).
 * The home page's "What Artaveo builds" preview now reads from
 * `getAllServices()` here as well (see `components/home/services.tsx`).
 *
 * Local data for now, shaped like the future `services` table so it can be
 * swapped for a real query at Phase 12 without changing the pages or
 * components that read it — only the selector functions at the bottom of
 * this file are ever imported directly.
 *
 * Packages, add-ons and pricing are intentionally not filled in here — that
 * is § 7.2's scope, gated by D-04 (pricing transparency, still open). Every
 * `Service` below stops at what § 7.1 owns: the catalogue entry and the
 * detail-blueprint fields. The blueprint's "Packages" section simply does
 * not render until those fields exist (§ "empty means hidden").
 */

function tx(en: string, fa: string): LocalizedText {
  return { en, fa }
}

function step(en: [string, string], fa: [string, string]): ServiceProcessStep {
  return { title: tx(en[0], fa[0]), description: tx(en[1], fa[1]) }
}

function faq(en: [string, string], fa: [string, string]): FaqItem {
  return { question: tx(en[0], fa[0]), answer: tx(en[1], fa[1]) }
}

/**
 * Every price in this file is `'quote'` (roadmap § 7.2): D-04 (pricing
 * transparency) is still an open owner decision, so no starting-from or
 * fixed figure has been approved to publish anywhere on the site. This
 * helper exists so that changes only ever in one place — the day D-04
 * resolves with real figures.
 */
function quote(): Price {
  return { type: 'quote' }
}

function pkg(input: Omit<ServicePackage, 'price'> & { price?: Price }): ServicePackage {
  return { ...input, price: input.price ?? quote() }
}

function addon(input: Omit<ServiceAddon, 'price'> & { price?: Price }): ServiceAddon {
  return { ...input, price: input.price ?? quote() }
}

function engagementModel(
  id: string,
  name: [string, string],
  whenItFits: [string, string],
  billing: [string, string],
): EngagementModel {
  return {
    id,
    name: tx(name[0], name[1]),
    whenItFits: tx(whenItFits[0], whenItFits[1]),
    billing: tx(billing[0], billing[1]),
  }
}

const servicesData: Service[] = [
  {
    id: 'business-website',
    slug: 'business-website',
    icon: 'Globe',
    type: 'productized',
    title: tx('Business Website', 'وب‌سایت تجاری'),
    tagline: tx(
      'A fast, credible website that structures content the way a CMS eventually will.',
      'یک وب‌سایت سریع و معتبر که محتوا را از همان اول به‌شکلی می‌چیند که یک CMS بعداً هم به همان شکل بخواند.',
    ),
    description: tx(
      'Marketing and informational sites with a CMS-ready content structure, real SEO fundamentals and an optional bilingual build.',
      'وب‌سایت‌های معرفی و اطلاع‌رسانی با ساختار محتوایی آماده برای CMS، اصول واقعی سئو و امکان ساخت دوزبانه.',
    ),
    forWhom: [
      tx('A business, practice or institute that needs a real online presence, not a template splash page', 'یک کسب‌وکار، مطب یا مؤسسه که به حضور آنلاین واقعی نیاز دارد، نه یک صفحه‌ی تک‌برگی قالبی'),
      tx('Someone who wants to publish and update content themselves later, without calling a developer for every text change', 'کسی که می‌خواهد بعداً خودش محتوا را منتشر و به‌روزرسانی کند، بدون این‌که برای هر تغییر متن به توسعه‌دهنده زنگ بزند'),
    ],
    notForWhom: [
      tx('A product that needs user accounts, dashboards or a database behind it — that is Web Application / MVP', 'محصولی که به حساب کاربری، داشبورد یا پایگاه داده‌ی پشتی نیاز دارد — آن خدمت «اپلیکیشن وب / MVP» است'),
    ],
    problem: tx(
      'Most small-business sites are either a rigid page builder that fights every custom request, or a one-off static page nobody can safely touch after launch. Neither gives an honest, fast, structured foundation.',
      'اکثر وب‌سایت‌های کسب‌وکارهای کوچک یا یک page-builder سفت‌وسخت‌اند که با هر درخواست سفارشی درگیر می‌شوند، یا یک صفحه‌ی استاتیک یک‌باره‌اند که بعد از راه‌اندازی هیچ‌کس نمی‌تواند بی‌خطر به آن دست بزند. هیچ‌کدام یک پایه‌ی صادق، سریع و ساختاریافته نمی‌دهند.',
    ),
    whatIDo: [
      tx('Design and build the site as typed, component-based content — the same shape a CMS record would later have', 'طراحی و ساخت سایت به‌عنوان محتوای تایپ‌شده و کامپوننت‌محور — دقیقاً همان شکلی که یک رکورد CMS بعداً خواهد داشت'),
      tx('Set up metadata, sitemaps and structured data so search engines can actually read the content', 'راه‌اندازی متادیتا، sitemap و داده‌ی ساختاریافته تا موتورهای جست‌وجو واقعاً بتوانند محتوا را بخوانند'),
      tx('Wire up analytics and a working contact path from day one', 'راه‌اندازی آنالیتیکس و یک مسیر تماس کارآمد از همان روز اول'),
    ],
    included: [
      tx('Up to the pages agreed in scope, each with its own metadata', 'به‌تعداد صفحاتی که در محدوده‌ی کار توافق شده، هرکدام با متادیتای خودشان'),
      tx('Responsive layout: mobile, tablet and desktop', 'چیدمان واکنش‌گرا: موبایل، تبلت و دسکتاپ'),
      tx('On-page SEO: titles, descriptions, headings, sitemap, robots.txt', 'سئوی درون‌صفحه‌ای: عنوان‌ها، توضیحات، عنوان‌بندی، sitemap و robots.txt'),
      tx('Contact form or a working contact path wired to a real inbox', 'فرم تماس یا یک مسیر تماس کارآمد که به یک صندوق ایمیل واقعی وصل است'),
      tx('Deployment to a production host', 'استقرار روی یک میزبان تولید'),
    ],
    notIncluded: [
      tx('Custom backend logic, user accounts or a database — see Web Application / MVP', 'منطق سفارشی بک‌اند، حساب کاربری یا پایگاه داده — بخش «اپلیکیشن وب / MVP» را ببینید'),
      tx('Ongoing content writing or photography', 'نوشتن محتوا یا عکاسی مستمر'),
      tx('Paid advertising or social-media management', 'تبلیغات پولی یا مدیریت شبکه‌های اجتماعی'),
    ],
    deliverables: [
      tx('Live, deployed website', 'وب‌سایت زنده و مستقرشده'),
      tx('Content structure ready for a CMS', 'ساختار محتوایی آماده برای CMS'),
      tx('Metadata and SEO setup', 'تنظیمات متادیتا و سئو'),
    ],
    process: [
      step(
        ['Content & structure', 'Confirm the real pages, sections and copy — nothing gets designed around placeholder text.'],
        ['محتوا و ساختار', 'تأیید صفحات، بخش‌ها و متن واقعی — چیزی روی متن جایگزین طراحی نمی‌شود.'],
      ),
      step(
        ['Design', 'A layout built on a real design system, reviewed before any page is coded.'],
        ['طراحی', 'چیدمانی ساخته‌شده روی یک سیستم طراحی واقعی، پیش از کدنویسی هر صفحه بازبینی می‌شود.'],
      ),
      step(
        ['Build', 'Component-based implementation, one reviewable page at a time.'],
        ['ساخت', 'پیاده‌سازی کامپوننت‌محور، هر بار یک صفحه‌ی قابل‌بازبینی.'],
      ),
      step(
        ['Launch', 'SEO checks, cross-device pass, deploy to production.'],
        ['راه‌اندازی', 'بررسی سئو، تست روی دستگاه‌های مختلف، استقرار روی محیط تولید.'],
      ),
    ],
    timeline: tx(
      '2–4 weeks for a standard site, depending on page count and how ready the content is when we start.',
      '۲ تا ۴ هفته برای یک سایت استاندارد، بسته به تعداد صفحات و آماده‌بودن محتوا در زمان شروع.',
    ),
    requirements: [
      tx('Final or near-final copy for each page', 'متن نهایی یا نزدیک‌به‌نهایی برای هر صفحه'),
      tx('Logo and brand assets, if they exist', 'لوگو و فایل‌های برند، اگر از قبل وجود دارند'),
      tx('Domain and hosting access, or a decision to set them up together', 'دسترسی به دامنه و هاست، یا تصمیم برای راه‌اندازی مشترک آن‌ها'),
    ],
    faq: [
      faq(
        ['Can I update the content myself after launch?', 'The content structure is built CMS-ready from day one, so moving to self-service editing later (Phase 15 on this roadmap) does not require rebuilding the site.'],
        ['آیا می‌توانم بعد از راه‌اندازی خودم محتوا را ویرایش کنم؟', 'ساختار محتوا از همان روز اول آماده برای CMS ساخته می‌شود، پس انتقال به ویرایش خودکار در آینده نیازی به بازسازی سایت ندارد.'],
      ),
      faq(
        ['Do you write the copy?', 'Not by default — content is scoped in Discover. Copywriting can be discussed as a separate add-on if needed.'],
        ['آیا خودتان متن را می‌نویسید؟', 'به‌طور پیش‌فرض نه — محتوا در مرحله‌ی «شناخت» مشخص می‌شود. کپی‌رایتینگ در صورت نیاز به‌عنوان یک افزونه‌ی جداگانه قابل‌بحث است.'],
      ),
    ],
    packages: [
      pkg({
        id: 'starter',
        name: tx('Starter', 'استارتر'),
        summary: tx(
          'A focused one-to-three page site to establish a credible presence quickly.',
          'یک سایت متمرکز با یک تا سه صفحه، برای ایجاد سریع یک حضور معتبر.',
        ),
        forWhom: tx(
          'A new business or solo practice that needs to exist online now, with room to grow later.',
          'یک کسب‌وکار تازه یا یک مطب مستقل که همین الان به وجود آنلاین نیاز دارد، با امکان رشد در آینده.',
        ),
        included: [
          tx('Up to 3 pages', 'حداکثر ۳ صفحه'),
          tx('Responsive layout', 'چیدمان واکنش‌گرا'),
          tx('Basic on-page SEO: titles, descriptions, sitemap', 'سئوی پایه‌ی درون‌صفحه‌ای: عنوان‌ها، توضیحات، sitemap'),
          tx('Contact form wired to a real inbox', 'فرم تماس متصل به یک صندوق ایمیل واقعی'),
        ],
        notIncluded: [
          tx('A blog or news section', 'بخش وبلاگ یا اخبار'),
          tx('Bilingual build (available as an add-on)', 'ساخت دوزبانه (به‌صورت افزونه در دسترس است)'),
        ],
        deliverables: [
          tx('Live, deployed website', 'وب‌سایت زنده و مستقرشده'),
          tx('Content structure ready for a CMS', 'ساختار محتوایی آماده برای CMS'),
        ],
        deliveryDays: { min: 7, max: 14 },
        revisions: 1,
        supportDays: 7,
      }),
      pkg({
        id: 'standard',
        name: tx('Standard', 'استاندارد'),
        summary: tx(
          'The full Business Website scope: more pages, a blog-ready structure and complete SEO setup.',
          'دامنه‌ی کامل «وب‌سایت تجاری»: صفحات بیشتر، ساختاری آماده برای وبلاگ و تنظیمات کامل سئو.',
        ),
        forWhom: tx(
          'A business that wants to publish and update content itself later, without calling a developer for every text change.',
          'یک کسب‌وکار که می‌خواهد بعداً خودش محتوا را منتشر و به‌روزرسانی کند، بدون تماس با یک توسعه‌دهنده برای هر تغییر متن.',
        ),
        included: [
          tx('Up to 8 pages, each with its own metadata', 'حداکثر ۸ صفحه، هرکدام با متادیتای خودشان'),
          tx('Blog-ready content structure', 'ساختار محتوایی آماده برای وبلاگ'),
          tx('Full on-page SEO: sitemap, robots.txt, structured data', 'سئوی کامل درون‌صفحه‌ای: sitemap، robots.txt، داده‌ی ساختاریافته'),
          tx('Contact form wired to a real inbox', 'فرم تماس متصل به یک صندوق ایمیل واقعی'),
          tx('Analytics setup', 'راه‌اندازی آنالیتیکس'),
        ],
        notIncluded: [
          tx('Custom backend logic, user accounts or a database', 'منطق سفارشی بک‌اند، حساب کاربری یا پایگاه داده'),
          tx('Bilingual build (available as an add-on)', 'ساخت دوزبانه (به‌صورت افزونه در دسترس است)'),
        ],
        deliverables: [
          tx('Live, deployed website', 'وب‌سایت زنده و مستقرشده'),
          tx('Content structure ready for a CMS', 'ساختار محتوایی آماده برای CMS'),
          tx('Metadata and SEO setup', 'تنظیمات متادیتا و سئو'),
        ],
        deliveryDays: { min: 14, max: 28 },
        revisions: 2,
        supportDays: 14,
      }),
      pkg({
        id: 'custom',
        name: tx('Custom', 'سفارشی'),
        summary: tx(
          'A larger or more specific site than Starter/Standard cover — scoped after a short discovery conversation, never guessed at.',
          'سایتی بزرگ‌تر یا با نیازهای خاص‌تر از آنچه استارتر/استاندارد پوشش می‌دهند — پس از یک گفت‌وگوی کوتاه شناختی دامنه‌بندی می‌شود، نه با حدس.',
        ),
        forWhom: tx(
          'A site with an unusual structure, a large number of pages, or specific integrations.',
          'سایتی با ساختار غیرمعمول، تعداد زیاد صفحات، یا اتصال‌های خاص.',
        ),
        included: [
          tx('Everything in Standard, plus whatever the discovery conversation scopes', 'هر آنچه در استاندارد است، به‌علاوه‌ی هر چیزی که گفت‌وگوی شناختی دامنه‌بندی می‌کند'),
        ],
        notIncluded: [],
        deliverables: [
          tx('Live, deployed website', 'وب‌سایت زنده و مستقرشده'),
        ],
      }),
    ],
    addOns: [
      addon({
        id: 'bilingual-build',
        title: tx('Bilingual build (English + Persian, RTL)', 'ساخت دوزبانه (انگلیسی + فارسی، RTL)'),
        description: tx(
          'The site is built and routed in both languages, with a correct right-to-left layout for Persian.',
          'سایت به هر دو زبان ساخته و مسیریابی می‌شود، همراه با چیدمان راست‌به‌چپ درست برای فارسی.',
        ),
        deliveryImpactDays: 5,
      }),
      addon({
        id: 'extra-page',
        title: tx('Extra page beyond the package', 'صفحه‌ی اضافه فراتر از بسته'),
        description: tx(
          'One additional page beyond the chosen package\u2019s page count, structured and optimized the same way.',
          'یک صفحه‌ی اضافه فراتر از تعداد صفحات بسته‌ی انتخابی، با همان ساختار و بهینه‌سازی.',
        ),
        deliveryImpactDays: 2,
      }),
      addon({
        id: 'copywriting',
        title: tx('Copywriting, up to 5 pages', 'کپی‌رایتینگ، تا ۵ صفحه'),
        description: tx(
          'Writing the on-page copy from a short brief, instead of you supplying final text.',
          'نوشتن متن صفحات از روی یک بریف کوتاه، به‌جای اینکه شما متن نهایی را تحویل دهید.',
        ),
        deliveryImpactDays: 5,
      }),
    ],
    whatDrivesCost: [
      tx('Number of pages', 'تعداد صفحات'),
      tx('Bilingual vs single-language build', 'ساخت دوزبانه در برابر تک‌زبانه'),
      tx('How much content is ready at kickoff', 'میزان آماده‌بودن محتوا در زمان شروع'),
      tx('Deadline pressure', 'فشردگی مهلت زمانی'),
    ],
    paymentScheduleNote: tx(
      'Smaller sites are typically half up front, half on delivery; larger scopes split across milestones. Full terms are confirmed before any work begins.',
      'سایت‌های کوچک‌تر معمولاً نیمی پیش‌پرداخت و نیمی هنگام تحویل‌اند؛ دامنه‌های بزرگ‌تر بین نقاط عطف تقسیم می‌شوند. شرایط کامل پیش از شروع هر کاری تأیید می‌شود.',
    ),
  },

  {
    id: 'web-application-mvp',
    slug: 'web-application-mvp',
    icon: 'AppWindow',
    type: 'custom',
    title: tx('Web Application / MVP', 'اپلیکیشن وب / MVP'),
    tagline: tx(
      'A full-stack product build, scoped through a Discovery Sprint before any commitment to a fixed price.',
      'ساخت یک محصول فول‌استک، که پیش از هرگونه تعهد به قیمت ثابت، از طریق یک Discovery Sprint دامنه‌بندی می‌شود.',
    ),
    description: tx(
      'Full-stack product builds — interface, API and database as one consistent system, starting with a Discovery Sprint.',
      'ساخت محصول فول‌استک — رابط کاربری، API و پایگاه داده به‌عنوان یک سیستم یکدست، با شروع از یک Discovery Sprint.',
    ),
    forWhom: [
      tx('A founder or business with a real product idea and unclear or evolving scope', 'یک بنیان‌گذار یا کسب‌وکار با ایده‌ی محصولی واقعی و دامنه‌ای نامشخص یا در‌حال‌شکل‌گیری'),
      tx('A team that needs user accounts, a database and real business logic — not just informational pages', 'تیمی که به حساب کاربری، پایگاه داده و منطق واقعی کسب‌وکار نیاز دارد — نه فقط صفحات اطلاع‌رسانی'),
    ],
    notForWhom: [
      tx('A simple informational site with no accounts or data workflows — see Business Website', 'یک سایت اطلاع‌رسانی ساده بدون حساب کاربری یا روند کار داده — بخش «وب‌سایت تجاری» را ببینید'),
    ],
    problem: tx(
      'Fixed-price quotes for a project with unclear scope are dishonest in one direction or the other — either padded to cover the unknowns, or cut corners once the real complexity shows up. Custom product work needs the scope defined before the price is.',
      'قیمت‌های ثابت برای پروژه‌ای با دامنه‌ی نامشخص، در یک جهت یا جهت دیگر صادقانه نیستند — یا برای پوشش مجهولات بادکرده‌اند، یا وقتی پیچیدگی واقعی خودش را نشان می‌دهد، از کیفیت کم می‌شود. کار محصول سفارشی نیاز دارد اول دامنه مشخص شود، بعد قیمت.',
    ),
    whatIDo: [
      tx('Run a fixed-price Discovery Sprint first: scope, architecture outline and an estimate you can act on', 'ابتدا یک Discovery Sprint با قیمت ثابت اجرا می‌کنم: دامنه، طرح‌کلی معماری و برآوردی که می‌توانید بر اساسش تصمیم بگیرید'),
      tx('Design and build the database schema, API and interface as one system, not three disconnected layers', 'طراحی و ساخت طرح پایگاه داده، API و رابط کاربری به‌عنوان یک سیستم واحد، نه سه لایه‌ی جدا از هم'),
      tx('Deliver in milestones you can see and review, not one opaque block at the end', 'تحویل در نقاط عطف قابل‌مشاهده و قابل‌بازبینی، نه یک بلوک مبهم در انتها'),
    ],
    included: [
      tx('Discovery Sprint: scoped problem statement, architecture outline, milestone plan and estimate', 'Discovery Sprint: بیان دقیق مسئله، طرح‌کلی معماری، برنامه‌ی نقاط عطف و برآورد'),
      tx('Database schema and server-side business logic — never trusting the browser with sensitive decisions', 'طرح پایگاه داده و منطق کسب‌وکار سمت سرور — هیچ‌وقت تصمیم‌های حساس به مرورگر سپرده نمی‌شود'),
      tx('Authentication and role-based access where the product needs it', 'احراز هویت و دسترسی بر پایه‌ی نقش، در جایی که محصول به آن نیاز دارد'),
      tx('Deployment to production with a documented handover', 'استقرار روی محیط تولید همراه با تحویل مستندشده'),
    ],
    notIncluded: [
      tx('A fixed total price before Discovery — the sprint is what makes an honest estimate possible', 'قیمت کل ثابت پیش از Discovery — همین اسپرینت است که یک برآورد صادقانه را ممکن می‌کند'),
      tx('Ongoing feature development after delivery — see Care Plan or Long-term Part-time', 'توسعه‌ی مستمر ویژگی‌ها پس از تحویل — بخش «برنامه‌ی نگهداری» یا «همکاری بلندمدت پاره‌وقت» را ببینید'),
      tx('Native mobile apps (iOS / Android) unless explicitly scoped', 'اپلیکیشن‌های موبایل بومی (iOS / Android) مگر اینکه صراحتاً در دامنه‌ی کار قرار گیرد'),
    ],
    deliverables: [
      tx('Frontend and backend', 'فرانت‌اند و بک‌اند'),
      tx('Database schema', 'طرح پایگاه داده'),
      tx('Deployment', 'استقرار'),
    ],
    process: [
      step(
        ['Discovery Sprint', 'Fixed price, fixed deliverable: a scoped problem statement, architecture outline and an estimate for the build.'],
        ['Discovery Sprint', 'قیمت ثابت، خروجی ثابت: بیان دقیق مسئله، طرح‌کلی معماری و برآورد برای مرحله‌ی ساخت.'],
      ),
      step(
        ['Architect', 'Data model, API surface and the state machines any sensitive workflow needs.'],
        ['معماری', 'مدل داده، سطح API و state machine هایی که هر روند کار حساس نیاز دارد.'],
      ),
      step(
        ['Build in milestones', 'Each milestone is a working, reviewable slice — not a black box until the end.'],
        ['ساخت در نقاط عطف', 'هر نقطه‌ی عطف یک تکه‌ی کاری و قابل‌بازبینی است — نه یک جعبه‌ی سیاه تا پایان کار.'],
      ),
      step(
        ['Launch & handover', 'Deploy, document, and hand over ownership per the Working Agreement.'],
        ['راه‌اندازی و تحویل', 'استقرار، مستندسازی، و تحویل مالکیت طبق «توافق‌نامه‌ی همکاری».'],
      ),
    ],
    timeline: tx(
      'Discovery Sprint: about a week. Build: scoped milestone-by-milestone at the end of Discovery — no total timeline is quoted before that.',
      'Discovery Sprint: حدود یک هفته. مرحله‌ی ساخت: در پایان Discovery و به‌ازای هر نقطه‌ی عطف دامنه‌بندی می‌شود — پیش از آن هیچ بازه‌ی زمانی کلی اعلام نمی‌شود.',
    ),
    requirements: [
      tx('A clear problem statement, even if the solution shape is still open', 'یک بیان روشن از مسئله، حتی اگر شکل راه‌حل هنوز باز باشد'),
      tx('A point of contact who can make product decisions during Discovery', 'یک نفر رابط که بتواند در طول Discovery تصمیم‌های محصول را بگیرد'),
    ],
    relatedProjectSlugs: ['transportation-system', 'pazhuhesh-portal'],
    faq: [
      faq(
        ['Why start with a paid Discovery Sprint instead of a free quote?', 'A free quote on an unscoped product is a guess. The sprint produces a real architecture outline and estimate you can hold me to — and you keep that outline even if we don\u2019t continue to the build.'],
        ['چرا با یک Discovery Sprint پولی شروع می‌شود، نه یک برآورد رایگان؟', 'برآورد رایگان روی یک محصول بدون دامنه‌بندی، یک حدس است. این اسپرینت یک طرح‌کلی معماری و برآورد واقعی تولید می‌کند که می‌توانید مرا نسبت به آن مسئول بدانید — و حتی اگر به مرحله‌ی ساخت نرویم، این طرح‌کلی برای خودتان می‌ماند.'],
      ),
      faq(
        ['Who owns the code?', 'Ownership and IP transfer terms are published on the Working Agreement page and confirmed before the build starts.'],
        ['مالکیت کد با کیست؟', 'شرایط مالکیت و انتقال IP در صفحه‌ی «توافق‌نامه‌ی همکاری» منتشر شده و پیش از شروع مرحله‌ی ساخت تأیید می‌شود.'],
      ),
    ],
  },

  {
    id: 'admin-dashboards',
    slug: 'admin-dashboards',
    icon: 'PanelsTopLeft',
    type: 'productized-custom',
    title: tx('Admin Dashboards & Internal Tools', 'داشبورد مدیریت و ابزارهای داخلی'),
    tagline: tx(
      'Role-based admin panels that make the data your team already has usable and safe to act on.',
      'پنل‌های مدیریت بر پایه‌ی نقش که داده‌ای را که تیم شما از قبل دارد، قابل‌استفاده و ایمن برای تصمیم‌گیری می‌کنند.',
    ),
    description: tx(
      'Role-based admin panels, reports and CSV exports for teams that need to manage real operational data.',
      'پنل‌های مدیریت بر پایه‌ی نقش، گزارش‌ها و خروجی CSV برای تیم‌هایی که نیاز به مدیریت داده‌ی عملیاتی واقعی دارند.',
    ),
    forWhom: [
      tx('A team currently running operations from spreadsheets, group chats or a system that doesn\u2019t enforce who can do what', 'تیمی که فعلاً عملیاتش را از طریق اکسل، گروه‌های چت، یا سیستمی که مشخص نمی‌کند چه‌کسی چه‌کاری می‌تواند بکند، اداره می‌کند'),
      tx('An existing product that needs a second, internal-only surface for staff', 'یک محصول موجود که به یک سطح دومِ فقط‌داخلی برای کارکنان نیاز دارد'),
    ],
    problem: tx(
      'Internal tools are often the least-invested-in part of a product, which is exactly where mistakes are most expensive — a limited admin with too much access, or a report that silently shows stale data, causes real operational harm.',
      'ابزارهای داخلی اغلب کم‌سرمایه‌گذاری‌شده‌ترین بخش یک محصول‌اند، درست همان‌جایی که اشتباه‌ها گران‌ترین‌اند — یک ادمین محدود با دسترسی بیش‌ازحد، یا گزارشی که بی‌صدا داده‌ی قدیمی نشان می‌دهد، آسیب عملیاتی واقعی وارد می‌کند.',
    ),
    whatIDo: [
      tx('Model roles and permissions explicitly, scoped per section rather than all-or-nothing', 'مدل‌سازی صریح نقش‌ها و سطوح دسترسی، به‌ازای هر بخش، نه به‌شکل همه‌یا‌هیچ'),
      tx('Build the tables, filters, reports and CSV exports your team actually works from all day', 'ساخت جدول‌ها، فیلترها، گزارش‌ها و خروجی‌های CSV که تیم شما واقعاً تمام روز با آن‌ها کار می‌کند'),
      tx('Enforce every sensitive action server-side, with an audit trail where the action matters', 'اجرای هر عمل حساس در سمت سرور، همراه با یک تاریخچه‌ی قابل‌بازبینی در جایی که عمل اهمیت دارد'),
    ],
    included: [
      tx('Role-based access, scoped per section of the admin', 'دسترسی بر پایه‌ی نقش، مشخص‌شده برای هر بخش از پنل ادمین'),
      tx('Data tables with filtering, sorting and pagination', 'جدول‌های داده با فیلتر، مرتب‌سازی و صفحه‌بندی'),
      tx('Reports and CSV export for the records your team needs offline', 'گزارش‌ها و خروجی CSV برای رکوردهایی که تیم شما به‌صورت آفلاین نیاز دارد'),
      tx('Server-side enforcement of every write — the admin UI is never the source of truth', 'اجرای سمت سرور برای هر عملیات نوشتن — رابط کاربری ادمین هیچ‌وقت منبع حقیقت نیست'),
    ],
    notIncluded: [
      tx('The public-facing product the admin manages, unless it is built as part of the same engagement', 'محصول عمومیِ رو‌به‌کاربر که ادمین آن را مدیریت می‌کند، مگر این‌که در همان قرارداد ساخته شود'),
      tx('Data migration from a legacy system beyond what is explicitly scoped', 'مهاجرت داده از یک سیستم قدیمی، فراتر از آنچه صراحتاً در دامنه‌ی کار مشخص شده'),
    ],
    deliverables: [
      tx('Authentication and roles', 'احراز هویت و نقش‌ها'),
      tx('Admin panels', 'پنل‌های مدیریت'),
      tx('Data-heavy interfaces', 'رابط‌های کاربری داده‌محور'),
    ],
    process: [
      step(
        ['Map the roles', 'Who does what, and what each role should never be able to touch.'],
        ['نقشه‌برداری نقش‌ها', 'چه‌کسی چه‌کاری انجام می‌دهد، و هر نقش هرگز نباید به چه چیزی دست بزند.'],
      ),
      step(
        ['Design the workflows', 'The screens and tables follow how the team actually works, not a generic admin template.'],
        ['طراحی روندهای کار', 'صفحات و جدول‌ها از نحوه‌ی کار واقعی تیم پیروی می‌کنند، نه یک قالب عمومی ادمین.'],
      ),
      step(
        ['Build & enforce', 'Server-side checks for every sensitive action, reviewed before launch.'],
        ['ساخت و اجرا', 'بررسی سمت سرور برای هر عمل حساس، پیش از راه‌اندازی بازبینی می‌شود.'],
      ),
      step(
        ['Handover & train', 'A short walkthrough so your team can use it confidently from day one.'],
        ['تحویل و آموزش', 'یک آموزش کوتاه تا تیم شما از همان روز اول با اطمینان از آن استفاده کند.'],
      ),
    ],
    timeline: tx(
      'Productized admin additions to an existing product: 1–3 weeks. A custom internal tool built from scratch follows a Discovery Sprint like Web Application / MVP.',
      'افزودن یک ماژول محصول‌محور ادمین به محصول موجود: ۱ تا ۳ هفته. یک ابزار داخلی سفارشی از صفر، مانند «اپلیکیشن وب / MVP» با یک Discovery Sprint شروع می‌شود.',
    ),
    requirements: [
      tx('A list of the roles that need access and what each one should be able to do', 'فهرستی از نقش‌هایی که به دسترسی نیاز دارند و هرکدام باید چه‌کاری بتوانند انجام دهند'),
      tx('Access to the existing database or API this admin will manage, if one already exists', 'دسترسی به پایگاه داده یا API موجودی که این پنل ادمین قرار است مدیریتش کند، اگر از قبل وجود دارد'),
    ],
    relatedProjectSlugs: ['transportation-system', 'pazhuhesh-portal'],
    faq: [
      faq(
        ['Can this connect to a database or product I already have?', 'Yes — this is often built against an existing schema. Access and read/write scope are confirmed during Discover.'],
        ['آیا می‌تواند به یک پایگاه داده یا محصولی که از قبل دارم وصل شود؟', 'بله — این خدمت اغلب روی یک schema موجود ساخته می‌شود. دسترسی و محدوده‌ی خواندن/نوشتن در مرحله‌ی «شناخت» تأیید می‌شود.'],
      ),
    ],
    packages: [
      pkg({
        id: 'starter',
        name: tx('Starter', 'استارتر'),
        summary: tx(
          'A single admin module — one section, one or two roles.',
          'یک ماژول ادمین — یک بخش، یک یا دو نقش.',
        ),
        forWhom: tx(
          'A product with one clear internal need: a single list or workflow that currently lives in a spreadsheet.',
          'محصولی با یک نیاز داخلی روشن: یک فهرست یا روند کار که فعلاً در یک اکسل زندگی می‌کند.',
        ),
        included: [
          tx('One admin section with role-based access', 'یک بخش ادمین با دسترسی بر پایه‌ی نقش'),
          tx('A data table with filtering, sorting and pagination', 'یک جدول داده با فیلتر، مرتب‌سازی و صفحه‌بندی'),
          tx('CSV export', 'خروجی CSV'),
        ],
        notIncluded: [
          tx('Multiple admin sections or roles beyond two', 'چند بخش ادمین یا نقش‌های بیش از دو'),
          tx('Custom reports', 'گزارش‌های سفارشی'),
        ],
        deliverables: [
          tx('Admin panel', 'پنل مدیریت'),
          tx('Role-based access', 'دسترسی بر پایه‌ی نقش'),
        ],
        deliveryDays: { min: 7, max: 14 },
        revisions: 1,
        supportDays: 7,
      }),
      pkg({
        id: 'standard',
        name: tx('Standard', 'استاندارد'),
        summary: tx(
          'A full admin surface: several sections, multiple roles, reports and exports.',
          'یک سطح کامل ادمین: چند بخش، چند نقش، گزارش‌ها و خروجی‌ها.',
        ),
        forWhom: tx(
          'A team currently running operations from spreadsheets or group chats and ready to move the whole workflow into one tool.',
          'تیمی که فعلاً عملیاتش را از طریق اکسل یا گروه‌های چت اداره می‌کند و آماده‌ی انتقال کل روند کار به یک ابزار است.',
        ),
        included: [
          tx('Role-based access, scoped per section of the admin', 'دسترسی بر پایه‌ی نقش، مشخص‌شده برای هر بخش'),
          tx('Multiple data tables with filtering, sorting and pagination', 'چند جدول داده با فیلتر، مرتب‌سازی و صفحه‌بندی'),
          tx('Reports and CSV export', 'گزارش‌ها و خروجی CSV'),
          tx('Server-side enforcement of every write', 'اجرای سمت سرور برای هر عملیات نوشتن'),
        ],
        notIncluded: [
          tx('The public-facing product this admin manages, unless bundled', 'محصول عمومیِ رو‌به‌کاربر، مگر این‌که همراه بسته شود'),
        ],
        deliverables: [
          tx('Admin panel', 'پنل مدیریت'),
          tx('Role-based access', 'دسترسی بر پایه‌ی نقش'),
          tx('Reports and exports', 'گزارش‌ها و خروجی‌ها'),
        ],
        deliveryDays: { min: 14, max: 28 },
        revisions: 2,
        supportDays: 14,
      }),
      pkg({
        id: 'custom',
        name: tx('Custom', 'سفارشی'),
        summary: tx(
          'A bespoke internal tool built alongside the product it manages — scoped through a Discovery Sprint like Web Application / MVP.',
          'یک ابزار داخلی سفارشی که همراه با محصولی که مدیریت می‌کند ساخته می‌شود — مانند «اپلیکیشن وب / MVP» از طریق یک Discovery Sprint دامنه‌بندی می‌شود.',
        ),
        forWhom: tx(
          'An internal tool complex enough to need its own architecture, not just an admin bolted onto an existing schema.',
          'ابزاری داخلی که به‌اندازه‌ای پیچیده است که به معماری خودش نیاز دارد، نه فقط یک ادمین که به یک schema موجود چسبانده شود.',
        ),
        included: [
          tx('Everything in Standard, plus custom workflows and data models scoped in Discovery', 'هر آنچه در استاندارد است، به‌علاوه‌ی روندهای کار و مدل‌های داده‌ی سفارشی که در Discovery دامنه‌بندی می‌شوند'),
        ],
        notIncluded: [],
        deliverables: [
          tx('Admin panel', 'پنل مدیریت'),
        ],
      }),
    ],
    addOns: [
      addon({
        id: 'extra-role',
        title: tx('Additional role beyond the package', 'نقش اضافه فراتر از بسته'),
        description: tx(
          'One more distinct permission level, scoped per section like the others.',
          'یک سطح دسترسی متمایز دیگر، مشخص‌شده برای هر بخش مانند بقیه.',
        ),
        deliveryImpactDays: 2,
      }),
      addon({
        id: 'audit-trail',
        title: tx('Audit trail on sensitive actions', 'تاریخچه‌ی قابل‌بازبینی برای عملیات حساس'),
        description: tx(
          'A recorded, reviewable history of who did what on the actions that matter most.',
          'یک تاریخچه‌ی ثبت‌شده و قابل‌بازبینی از اینکه چه‌کسی چه‌کاری روی مهم‌ترین عملیات انجام داده.',
        ),
        deliveryImpactDays: 3,
      }),
    ],
    whatDrivesCost: [
      tx('Number of roles and permission levels', 'تعداد نقش‌ها و سطوح دسترسی'),
      tx('Number of admin sections and tables', 'تعداد بخش‌ها و جدول‌های ادمین'),
      tx('Whether it connects to an existing database or one built alongside it', 'اینکه به یک پایگاه داده‌ی موجود وصل می‌شود یا همراه آن ساخته می‌شود'),
      tx('Deadline pressure', 'فشردگی مهلت زمانی'),
    ],
    paymentScheduleNote: tx(
      'Starter and Standard follow the same milestone split as Business Website; Custom follows the Web Application / MVP schedule. Full terms are confirmed before any work begins.',
      'استارتر و استاندارد از همان تقسیم نقاط عطف «وب‌سایت تجاری» پیروی می‌کنند؛ سفارشی از برنامه‌ی «اپلیکیشن وب / MVP» پیروی می‌کند. شرایط کامل پیش از شروع هر کاری تأیید می‌شود.',
    ),
  },

  {
    id: 'backend-api-database',
    slug: 'backend-api-database',
    icon: 'Database',
    type: 'custom',
    title: tx('Backend, API & Database', 'بک‌اند، API و پایگاه داده'),
    tagline: tx(
      'The server-side layer your product actually trusts: schema, authorization and integrations.',
      'لایه‌ی سمت سروری که محصول شما واقعاً به آن اعتماد می‌کند: طرح داده، دسترسی و اتصال به سرویس‌های دیگر.',
    ),
    description: tx(
      'Supabase / PostgreSQL schema design, authentication, row-level security and third-party integrations.',
      'طراحی schema در Supabase / PostgreSQL، احراز هویت، row-level security و اتصال به سرویس‌های شخص‌ثالث.',
    ),
    forWhom: [
      tx('A team with a frontend already in progress that needs a real, secure backend behind it', 'تیمی که یک فرانت‌اند در‌حال‌توسعه دارد و به یک بک‌اند واقعی و امن پشت آن نیاز دارد'),
      tx('A product where sensitive decisions currently live in client-side code and need to move to the server', 'محصولی که تصمیم‌های حساس آن فعلاً در کد سمت کلاینت زندگی می‌کند و باید به سرور منتقل شود'),
    ],
    problem: tx(
      'A frontend that talks directly to a database with no server-side authorization is not a security model — it is a promise that the client will behave, and clients don\u2019t always behave. This service exists to put real boundaries where the product currently has none.',
      'فرانت‌اندی که مستقیم با یک پایگاه داده بدون بررسی دسترسی سمت سرور صحبت می‌کند، یک مدل امنیتی نیست — یک وعده است که کلاینت درست رفتار می‌کند، و کلاینت‌ها همیشه درست رفتار نمی‌کنند. این خدمت برای این است که مرزهای واقعی جایی گذاشته شود که محصول فعلاً هیچ مرزی ندارد.',
    ),
    whatIDo: [
      tx('Design a relational schema that matches the real business rules, not just the current UI', 'طراحی یک schema رابطه‌ای که با قواعد واقعی کسب‌وکار همخوانی دارد، نه فقط با رابط کاربری فعلی'),
      tx('Apply row-level security and server-side authorization on every sensitive table and action', 'اعمال row-level security و بررسی دسترسی سمت سرور روی هر جدول و عمل حساس'),
      tx('Model sensitive state changes as explicit, auditable state machines where the risk justifies it', 'مدل‌سازی تغییرات وضعیت حساس به‌شکل state machine صریح و قابل‌بازبینی، جایی که ریسک آن را توجیه می‌کند'),
    ],
    included: [
      tx('Relational schema design and migrations', 'طراحی schema رابطه‌ای و migration ها'),
      tx('Authentication and row-level security policies', 'احراز هویت و سیاست‌های row-level security'),
      tx('API endpoints your frontend calls, with server-side validation', 'endpoint های API که فرانت‌اند شما فراخوانی می‌کند، همراه با اعتبارسنجی سمت سرور'),
      tx('A security review pass before handover', 'یک بررسی امنیتی پیش از تحویل'),
    ],
    notIncluded: [
      tx('The frontend that consumes this API, unless bundled as Web Application / MVP', 'فرانت‌اندی که این API را مصرف می‌کند، مگر این‌که همراه با «اپلیکیشن وب / MVP» بسته شود'),
      tx('Ongoing infrastructure/DevOps management after handover', 'مدیریت مستمر زیرساخت/DevOps پس از تحویل'),
    ],
    deliverables: [
      tx('API endpoints', 'endpointهای API'),
      tx('PostgreSQL data model', 'مدل داده‌ی PostgreSQL'),
      tx('Authorization rules', 'قواعد سطح دسترسی'),
    ],
    process: [
      step(
        ['Model the data', 'The schema follows the real business rules, checked against how the product actually needs to behave.'],
        ['مدل‌سازی داده', 'schema از قواعد واقعی کسب‌وکار پیروی می‌کند، در برابر نحوه‌ی رفتار واقعی موردنیاز محصول بررسی می‌شود.'],
      ),
      step(
        ['Secure it', 'Row-level security and server-side checks on every sensitive path — never left to the client.'],
        ['ایمن‌سازی', 'row-level security و بررسی‌های سمت سرور روی هر مسیر حساس — هرگز به کلاینت واگذار نمی‌شود.'],
      ),
      step(
        ['Build & test against real data', 'Migrations verified in a rolled-back transaction against real data before they ship.'],
        ['ساخت و تست روی داده‌ی واقعی', 'migration ها پیش از انتشار، در تراکنشی که در پایان rollback می‌شود، روی داده‌ی واقعی اعتبارسنجی می‌شوند.'],
      ),
      step(
        ['Handover', 'Schema documentation and a security review summary, so the next person can trust it too.'],
        ['تحویل', 'مستندسازی schema و خلاصه‌ی بررسی امنیتی، تا نفر بعدی هم بتواند به آن اعتماد کند.'],
      ),
    ],
    timeline: tx(
      'Depends heavily on schema complexity and the number of integrations — scoped after a short technical discovery, similar to the Web Application / MVP Discovery Sprint.',
      'به‌شدت به پیچیدگی schema و تعداد اتصال‌ها بستگی دارد — پس از یک Discovery فنی کوتاه، مشابه Discovery Sprint در «اپلیکیشن وب / MVP»، دامنه‌بندی می‌شود.',
    ),
    requirements: [
      tx('Access to the existing codebase and any current database, if one exists', 'دسترسی به کدبیس موجود و هر پایگاه داده‌ی فعلی، اگر وجود دارد'),
      tx('Credentials or sandbox access for any third-party service that needs integrating', 'اطلاعات دسترسی یا sandbox برای هر سرویس شخص‌ثالثی که نیاز به اتصال دارد'),
    ],
    relatedProjectSlugs: ['transportation-system', 'pazhuhesh-portal'],
    faq: [
      faq(
        ['Do you work with a database I already have, or only Supabase/PostgreSQL?', 'PostgreSQL (directly or through Supabase) is the primary stack. Working with a different existing database is discussed case by case during Discover.'],
        ['آیا با پایگاه داده‌ای که از قبل دارم کار می‌کنید، یا فقط Supabase/PostgreSQL؟', 'PostgreSQL (مستقیم یا از طریق Supabase) استک اصلی است. کار با یک پایگاه داده‌ی متفاوت موجود، در مرحله‌ی «شناخت» و به‌صورت مورد‌به‌مورد بررسی می‌شود.'],
      ),
    ],
  },

  {
    id: 'performance-accessibility-seo',
    slug: 'performance-accessibility-seo',
    icon: 'Gauge',
    type: 'productized',
    title: tx('Performance, Accessibility & SEO Fix', 'بهبود کارایی، دسترس‌پذیری و سئو'),
    tagline: tx(
      'An audit with real fixes behind it, and a before/after report that shows the difference.',
      'یک ارزیابی همراه با اصلاح‌های واقعی پشت آن، و یک گزارش پیش‌ازبعد که تفاوت را نشان می‌دهد.',
    ),
    description: tx(
      'A structured audit of an existing site or app, with the fixes implemented and a before/after report.',
      'ارزیابی ساختاریافته‌ی یک سایت یا اپلیکیشن موجود، همراه با اجرای اصلاح‌ها و یک گزارش پیش‌ازبعد.',
    ),
    forWhom: [
      tx('An existing site that feels slow, fails basic accessibility checks, or ranks poorly for reasons no one has diagnosed', 'سایتی موجود که کند به‌نظر می‌رسد، در بررسی‌های پایه‌ی دسترس‌پذیری رد می‌شود، یا به دلایلی که هیچ‌کس تشخیص نداده رتبه‌ی ضعیفی در جست‌وجو دارد'),
    ],
    notForWhom: [
      tx('A site that needs new features or a redesign — this service fixes what exists, it does not rebuild it', 'سایتی که به ویژگی‌های تازه یا بازطراحی نیاز دارد — این خدمت آنچه هست را اصلاح می‌کند، بازسازی نمی‌کند'),
    ],
    problem: tx(
      'Performance, accessibility and SEO problems are usually invisible to whoever built the site day-to-day, and expensive advice without implementation is common. This service pairs the audit with the actual fix.',
      'مشکلات کارایی، دسترس‌پذیری و سئو معمولاً برای کسی که روزبه‌روز روی سایت کار می‌کند نامرئی هستند، و مشاوره‌ی گران بدون اجرا هم رایج است. این خدمت ارزیابی را با اصلاح واقعی همراه می‌کند.',
    ),
    whatIDo: [
      tx('Measure real Core Web Vitals, accessibility violations and SEO fundamentals — not a guess', 'اندازه‌گیری واقعی Core Web Vitals، تخلفات دسترس‌پذیری و اصول سئو — نه یک حدس'),
      tx('Implement the fixes directly in the codebase, not just hand over a list', 'اجرای مستقیم اصلاح‌ها در کدبیس، نه فقط تحویل یک فهرست'),
      tx('Re-measure after the fix and document the before/after difference', 'اندازه‌گیری دوباره بعد از اصلاح و مستندسازی تفاوت پیش‌ازبعد'),
    ],
    included: [
      tx('A structured audit against WCAG 2.2 AA, Core Web Vitals and on-page SEO fundamentals', 'یک ارزیابی ساختاریافته در برابر WCAG 2.2 AA، Core Web Vitals و اصول سئوی درون‌صفحه‌ای'),
      tx('Implementation of the fixes found in the audit — not just a report', 'اجرای اصلاح‌های پیداشده در ارزیابی — نه فقط یک گزارش'),
      tx('A before/after report with the actual measurements', 'یک گزارش پیش‌ازبعد همراه با اندازه‌گیری‌های واقعی'),
    ],
    notIncluded: [
      tx('A full redesign or new features — this fixes what exists', 'بازطراحی کامل یا ویژگی‌های تازه — این خدمت آنچه هست را اصلاح می‌کند'),
      tx('Fixing issues rooted in a third-party platform or theme outside this codebase\u2019s control', 'رفع مشکلاتی که ریشه در یک پلتفرم یا قالب شخص‌ثالث خارج از کنترل این کدبیس دارند'),
    ],
    deliverables: [
      tx('Audit findings', 'یافته‌های ارزیابی'),
      tx('Implemented fixes', 'اصلاح‌های اجراشده'),
      tx('Before/after performance report', 'گزارش کارایی پیش‌ازبعد'),
    ],
    process: [
      step(
        ['Audit', 'Measure performance, accessibility and SEO against real standards, not opinion.'],
        ['ارزیابی', 'اندازه‌گیری کارایی، دسترس‌پذیری و سئو در برابر استانداردهای واقعی، نه نظر شخصی.'],
      ),
      step(
        ['Prioritize', 'Rank fixes by real impact versus effort — the highest-impact issues first.'],
        ['اولویت‌بندی', 'رتبه‌بندی اصلاح‌ها بر اساس تأثیر واقعی در برابر تلاش لازم — مشکلات پرتأثیرتر اول.'],
      ),
      step(
        ['Fix', 'Implement directly in the codebase, verified against the original measurements.'],
        ['اصلاح', 'اجرای مستقیم در کدبیس، اعتبارسنجی‌شده در برابر اندازه‌گیری‌های اولیه.'],
      ),
      step(
        ['Report', 'A before/after document with the real numbers, not a subjective summary.'],
        ['گزارش', 'یک سند پیش‌ازبعد با اعداد واقعی، نه یک خلاصه‌ی ذهنی.'],
      ),
    ],
    timeline: tx(
      '1–2 weeks for a standard audit-and-fix pass, depending on site size and the number of issues found.',
      '۱ تا ۲ هفته برای یک دورِ استاندارد ارزیابی و اصلاح، بسته به اندازه‌ی سایت و تعداد مشکلات پیداشده.',
    ),
    requirements: [
      tx('Read access to the live site and, ideally, the codebase or CMS behind it', 'دسترسی خواندن به سایت زنده و ترجیحاً کدبیس یا CMS پشت آن'),
      tx('Current analytics data, if available, to prioritize by real traffic', 'داده‌ی آنالیتیکس فعلی، در صورت وجود، برای اولویت‌بندی بر اساس ترافیک واقعی'),
    ],
    faq: [
      faq(
        ['Do I need to give you full access to my hosting?', 'Not necessarily — read access to the site and, where possible, a staging environment or repository is usually enough to audit and implement fixes safely.'],
        ['آیا باید دسترسی کامل به هاست را در اختیارتان بگذارم؟', 'نه لزوماً — دسترسی خواندن به سایت و در صورت امکان یک محیط staging یا مخزن کد، معمولاً برای ارزیابی و اجرای امن اصلاح‌ها کافی است.'],
      ),
    ],
    packages: [
      pkg({
        id: 'starter',
        name: tx('Starter', 'استارتر'),
        summary: tx('A single-page audit and fix — the page that matters most.', 'ارزیابی و اصلاح یک صفحه — همان صفحه‌ای که بیشترین اهمیت را دارد.'),
        forWhom: tx(
          'A specific page — usually the homepage or a landing page — that clearly underperforms.',
          'یک صفحه‌ی مشخص — معمولاً صفحه‌ی اصلی یا یک لندینگ‌پیج — که واضح ضعیف عمل می‌کند.',
        ),
        included: [
          tx('Audit of one page against Core Web Vitals, WCAG 2.2 AA and on-page SEO', 'ارزیابی یک صفحه در برابر Core Web Vitals، WCAG 2.2 AA و سئوی درون‌صفحه‌ای'),
          tx('Implementation of the fixes found', 'اجرای اصلاح‌های پیداشده'),
          tx('A before/after report for that page', 'یک گزارش پیش‌ازبعد برای همان صفحه'),
        ],
        notIncluded: [
          tx('Other pages on the site', 'سایر صفحات سایت'),
        ],
        deliverables: [
          tx('Audit findings', 'یافته‌های ارزیابی'),
          tx('Implemented fixes', 'اصلاح‌های اجراشده'),
        ],
        deliveryDays: { min: 5, max: 7 },
        revisions: 1,
        supportDays: 7,
      }),
      pkg({
        id: 'standard',
        name: tx('Standard', 'استاندارد'),
        summary: tx('A full-site audit and fix pass, up to 10 pages.', 'یک دورِ کامل ارزیابی و اصلاح برای کل سایت، تا ۱۰ صفحه.'),
        forWhom: tx(
          'An existing site that feels slow, fails basic accessibility checks, or ranks poorly for reasons no one has diagnosed.',
          'سایتی موجود که کند به‌نظر می‌رسد، در بررسی‌های پایه‌ی دسترس‌پذیری رد می‌شود، یا رتبه‌ی ضعیفی در جست‌وجو دارد.',
        ),
        included: [
          tx('A structured audit against WCAG 2.2 AA, Core Web Vitals and on-page SEO, up to 10 pages', 'ارزیابی ساختاریافته در برابر WCAG 2.2 AA، Core Web Vitals و سئو، تا ۱۰ صفحه'),
          tx('Implementation of the fixes found in the audit', 'اجرای اصلاح‌های پیداشده در ارزیابی'),
          tx('A before/after report with the actual measurements', 'یک گزارش پیش‌ازبعد همراه با اندازه‌گیری‌های واقعی'),
        ],
        notIncluded: [
          tx('A full redesign or new features', 'بازطراحی کامل یا ویژگی‌های تازه'),
        ],
        deliverables: [
          tx('Audit findings', 'یافته‌های ارزیابی'),
          tx('Implemented fixes', 'اصلاح‌های اجراشده'),
          tx('Before/after performance report', 'گزارش کارایی پیش‌ازبعد'),
        ],
        deliveryDays: { min: 7, max: 14 },
        revisions: 1,
        supportDays: 14,
      }),
      pkg({
        id: 'custom',
        name: tx('Custom', 'سفارشی'),
        summary: tx(
          'A larger site, an ongoing audit cadence, or a fix that touches infrastructure beyond the codebase — scoped after a short look.',
          'سایتی بزرگ‌تر، یک ریتم ارزیابی مستمر، یا اصلاحی که به زیرساخت فراتر از کدبیس می‌رسد — پس از یک نگاه کوتاه دامنه‌بندی می‌شود.',
        ),
        forWhom: tx(
          'A site large or complex enough that a per-page package underestimates the work.',
          'سایتی به‌اندازه‌ای بزرگ یا پیچیده که یک بسته‌ی مبتنی‌بر تعداد صفحه، حجم کار را کم‌تر از واقع نشان می‌دهد.',
        ),
        included: [
          tx('Everything in Standard, scaled to the real page count and scope', 'هر آنچه در استاندارد است، متناسب با تعداد صفحات و دامنه‌ی واقعی'),
        ],
        notIncluded: [],
        deliverables: [
          tx('Audit findings', 'یافته‌های ارزیابی'),
        ],
      }),
    ],
    addOns: [
      addon({
        id: 'extra-pages',
        title: tx('Additional pages beyond the package', 'صفحات اضافه فراتر از بسته'),
        description: tx('Auditing and fixing pages beyond the chosen package\u2019s count.', 'ارزیابی و اصلاح صفحات فراتر از تعداد بسته‌ی انتخابی.'),
        deliveryImpactDays: 2,
      }),
    ],
    whatDrivesCost: [
      tx('Number of pages', 'تعداد صفحات'),
      tx('How many issues the audit finds', 'تعداد مشکلاتی که ارزیابی پیدا می‌کند'),
      tx('Whether fixes touch infrastructure beyond the codebase', 'اینکه اصلاح‌ها به زیرساخت فراتر از کدبیس می‌رسند یا نه'),
    ],
    paymentScheduleNote: tx(
      'Starter and Standard are typically paid on delivery of the report; Custom follows a milestone split. Full terms are confirmed before any work begins.',
      'استارتر و استاندارد معمولاً هنگام تحویل گزارش پرداخت می‌شوند؛ سفارشی از یک تقسیم نقاط عطف پیروی می‌کند. شرایط کامل پیش از شروع هر کاری تأیید می‌شود.',
    ),
  },

  {
    id: 'bug-fix-rescue',
    slug: 'bug-fix-rescue',
    icon: 'Wrench',
    type: 'productized',
    title: tx('Bug Fix & Rescue', 'رفع باگ و نجات کدبیس'),
    tagline: tx(
      'Diagnose a real problem in a codebase that isn\u2019t mine, and fix it without breaking what already works.',
      'تشخیص یک مشکل واقعی در کدبیسی که مال من نیست، و رفع آن بدون خراب‌کردن چیزی که از قبل درست کار می‌کند.',
    ),
    description: tx(
      'Diagnosing and fixing a specific, defined problem in an existing codebase you did not build with me.',
      'تشخیص و رفع یک مشکل مشخص و تعریف‌شده در یک کدبیس موجود که با من ساخته نشده.',
    ),
    forWhom: [
      tx('A specific bug, outage or broken flow in a codebase that needs diagnosing and fixing', 'یک باگ، قطعی، یا روند شکسته‌ی مشخص در یک کدبیس که نیاز به تشخیص و رفع دارد'),
      tx('Someone whose original developer is unavailable and needs a second pair of eyes on a real problem', 'کسی که توسعه‌دهنده‌ی اصلی‌اش در دسترس نیست و به یک نگاه دوم روی یک مشکل واقعی نیاز دارد'),
    ],
    notForWhom: [
      tx('Ongoing, open-ended maintenance — that is the Care Plan', 'نگهداری مستمر و بدون‌محدوده — آن خدمت «برنامه‌ی نگهداری» است'),
    ],
    problem: tx(
      'A broken production flow doesn\u2019t wait for a full engagement to be scoped and signed. This service is for a defined, bounded problem: find the real cause and fix it, without a redesign of the whole codebase.',
      'یک روند شکسته در محیط تولید منتظر دامنه‌بندی و امضای یک قرارداد کامل نمی‌ماند. این خدمت برای یک مشکل مشخص و محدود است: پیداکردن علت واقعی و رفع آن، بدون بازطراحی کل کدبیس.',
    ),
    whatIDo: [
      tx('Reproduce the problem and find the real root cause, not just the symptom', 'بازتولید مشکل و پیداکردن علت اصلی واقعی، نه فقط علامت آن'),
      tx('Fix it with the smallest change that is actually correct, checked against the rest of the codebase', 'رفع آن با کوچک‌ترین تغییری که واقعاً درست است، بررسی‌شده در برابر بقیه‌ی کدبیس'),
      tx('Document what was wrong and what changed, so it doesn\u2019t become a mystery again later', 'مستندسازی اینکه مشکل چه بود و چه چیزی تغییر کرد، تا بعداً دوباره تبدیل به یک معما نشود'),
    ],
    included: [
      tx('Diagnosis of the specific, defined problem', 'تشخیص مشکل مشخص و تعریف‌شده'),
      tx('The fix, implemented and verified against the existing codebase', 'رفع مشکل، اجراشده و اعتبارسنجی‌شده در برابر کدبیس موجود'),
      tx('A short write-up of the cause and the fix', 'یک توضیح کوتاه از علت و اصلاح انجام‌شده'),
    ],
    notIncluded: [
      tx('A rewrite or redesign of the surrounding codebase', 'بازنویسی یا بازطراحی کدبیسِ اطراف مشکل'),
      tx('New features unrelated to the defined problem', 'ویژگی‌های تازه‌ای که به مشکل تعریف‌شده ربطی ندارند'),
      tx('Ongoing support after the fix — see Care Plan', 'پشتیبانی مستمر پس از رفع مشکل — بخش «برنامه‌ی نگهداری» را ببینید'),
    ],
    deliverables: [
      tx('Code review', 'بازبینی کد'),
      tx('Performance fixes', 'رفع مشکلات کارایی'),
      tx('A written diagnosis', 'یک تشخیص مکتوب'),
    ],
    process: [
      step(
        ['Reproduce', 'Confirm the problem reliably before touching any code.'],
        ['بازتولید', 'تأیید قابل‌اتکای مشکل، پیش از دست‌زدن به هر کدی.'],
      ),
      step(
        ['Diagnose', 'Trace it to the real root cause, not the first plausible explanation.'],
        ['تشخیص', 'ردیابی تا علت اصلی واقعی، نه اولین توضیح محتمل.'],
      ),
      step(
        ['Fix & verify', 'The smallest correct change, checked against the rest of the codebase before it ships.'],
        ['رفع و تأیید', 'کوچک‌ترین تغییر درست، پیش از انتشار در برابر بقیه‌ی کدبیس بررسی می‌شود.'],
      ),
    ],
    timeline: tx(
      'A few days to about a week for most defined problems, confirmed after a short look at the codebase.',
      'چند روز تا حدود یک هفته برای اکثر مشکلات تعریف‌شده، پس از یک نگاه کوتاه به کدبیس تأیید می‌شود.',
    ),
    requirements: [
      tx('Read access to the codebase and a way to reproduce the problem', 'دسترسی خواندن به کدبیس و راهی برای بازتولید مشکل'),
      tx('A clear description of what should happen versus what actually happens', 'توضیحی روشن از اینکه چه چیزی باید اتفاق بیفتد در برابر آنچه واقعاً اتفاق می‌افتد'),
    ],
    faq: [
      faq(
        ['What if the fix reveals a bigger underlying problem?', 'I will tell you honestly rather than quietly expanding scope — the bigger problem gets its own separate conversation and, if needed, its own engagement.'],
        ['اگر رفع مشکل، یک مشکل بزرگ‌تر و زیربنایی را آشکار کند چه؟', 'صادقانه به شما اطلاع می‌دهم، نه اینکه بی‌صدا دامنه‌ی کار را گسترش دهم — مشکل بزرگ‌تر گفت‌وگوی جداگانه‌ی خودش، و در صورت نیاز، قرارداد جداگانه‌ی خودش را می‌گیرد.'],
      ),
    ],
    packages: [
      pkg({
        id: 'starter',
        name: tx('Starter', 'استارتر'),
        summary: tx('One specific, defined bug.', 'یک باگ مشخص و تعریف‌شده.'),
        forWhom: tx('A single reproducible bug with a clear description of expected vs. actual behavior.', 'یک باگ واحد و قابل‌بازتولید با توضیحی روشن از رفتار موردانتظار در برابر رفتار واقعی.'),
        included: [
          tx('Diagnosis of the one defined problem', 'تشخیص همان یک مشکل تعریف‌شده'),
          tx('The fix, implemented and verified', 'رفع مشکل، اجراشده و اعتبارسنجی‌شده'),
          tx('A short write-up of the cause and the fix', 'یک توضیح کوتاه از علت و اصلاح انجام‌شده'),
        ],
        notIncluded: [
          tx('Additional, unrelated bugs found along the way', 'باگ‌های اضافه و بی‌ربطی که در این مسیر پیدا می‌شوند'),
        ],
        deliverables: [
          tx('A written diagnosis', 'یک تشخیص مکتوب'),
        ],
        deliveryDays: { min: 2, max: 5 },
        revisions: 1,
        supportDays: 3,
      }),
      pkg({
        id: 'standard',
        name: tx('Standard', 'استاندارد'),
        summary: tx('A small rescue: several related bugs, or one that touches more of the codebase.', 'یک نجات کوچک: چند باگ مرتبط، یا یک باگ که به بخش بیشتری از کدبیس می‌رسد.'),
        forWhom: tx('Someone whose original developer is unavailable, facing more than one broken flow that needs a second pair of eyes.', 'کسی که توسعه‌دهنده‌ی اصلی‌اش در دسترس نیست و با بیش از یک روند شکسته روبه‌روست که به یک نگاه دوم نیاز دارد.'),
        included: [
          tx('Diagnosis of up to 3 related problems', 'تشخیص تا ۳ مشکل مرتبط'),
          tx('The fixes, implemented and verified against the existing codebase', 'اصلاح‌ها، اجراشده و اعتبارسنجی‌شده در برابر کدبیس موجود'),
          tx('A written summary of causes and fixes', 'یک خلاصه‌ی مکتوب از علت‌ها و اصلاح‌ها'),
        ],
        notIncluded: [
          tx('A rewrite or redesign of the surrounding codebase', 'بازنویسی یا بازطراحی کدبیسِ اطراف'),
        ],
        deliverables: [
          tx('Code review', 'بازبینی کد'),
          tx('A written diagnosis', 'یک تشخیص مکتوب'),
        ],
        deliveryDays: { min: 5, max: 10 },
        revisions: 1,
        supportDays: 7,
      }),
      pkg({
        id: 'custom',
        name: tx('Custom', 'سفارشی'),
        summary: tx('A larger rescue — many issues, or a codebase in a state that needs a real look before any estimate.', 'یک نجات بزرگ‌تر — مشکلات زیاد، یا کدبیسی که پیش از هر برآوردی به یک نگاه واقعی نیاز دارد.'),
        forWhom: tx('A codebase with enough unknowns that a real look is needed before any estimate.', 'کدبیسی با مجهولات کافی که پیش از هر برآوردی به یک نگاه واقعی نیاز دارد.'),
        included: [
          tx('A short paid look at the codebase first, then a scoped estimate for the rescue', 'ابتدا یک نگاه کوتاه و پولی به کدبیس، سپس یک برآورد دامنه‌بندی‌شده برای نجات'),
        ],
        notIncluded: [],
        deliverables: [
          tx('A written diagnosis', 'یک تشخیص مکتوب'),
        ],
      }),
    ],
    whatDrivesCost: [
      tx('Number of distinct problems', 'تعداد مشکلات متمایز'),
      tx('How much of the codebase the problem touches', 'اینکه مشکل چه‌قدر از کدبیس را در بر می‌گیرد'),
      tx('How well-documented and reproducible the problem already is', 'اینکه مشکل از قبل چه‌قدر مستند و قابل‌بازتولید است'),
    ],
    paymentScheduleNote: tx(
      'Starter and Standard are typically paid on delivery of the fix; Custom starts with a paid look, billed separately from the rescue itself. Full terms are confirmed before any work begins.',
      'استارتر و استاندارد معمولاً هنگام تحویل اصلاح پرداخت می‌شوند؛ سفارشی با یک نگاه پولی شروع می‌شود که جدا از خودِ نجات صورت‌حساب می‌شود. شرایط کامل پیش از شروع هر کاری تأیید می‌شود.',
    ),
  },

  {
    id: 'care-plan',
    slug: 'care-plan',
    icon: 'ShieldCheck',
    type: 'monthly',
    title: tx('Care Plan (Maintenance)', 'برنامه‌ی نگهداری'),
    tagline: tx(
      'Ongoing updates, monitoring and small changes for a product that is already live.',
      'به‌روزرسانی‌های مستمر، مانیتورینگ و تغییرات کوچک برای محصولی که از قبل زنده است.',
    ),
    description: tx(
      'A monthly plan covering updates, monitoring, small changes and a backups check for a live product.',
      'یک برنامه‌ی ماهانه شامل به‌روزرسانی، مانیتورینگ، تغییرات کوچک و بررسی پشتیبان‌گیری برای محصولی زنده.',
    ),
    forWhom: [
      tx('A live product that needs someone keeping an eye on it between larger pieces of work', 'یک محصول زنده که بین کارهای بزرگ‌تر، به کسی نیاز دارد که مراقبش باشد'),
      tx('An owner who wants dependency and security updates to actually happen, not just get postponed', 'صاحب محصولی که می‌خواهد به‌روزرسانی‌های وابستگی و امنیت واقعاً انجام شوند، نه فقط به تعویق بیفتند'),
    ],
    notForWhom: [
      tx('A one-off, defined bug — that is Bug Fix & Rescue, without an ongoing monthly commitment', 'یک باگ یک‌باره و تعریف‌شده — آن خدمت «رفع باگ و نجات کدبیس» است، بدون تعهد ماهانه‌ی مستمر'),
    ],
    problem: tx(
      'Products that ship and then get no attention accumulate outdated dependencies, unnoticed errors and small annoyances that compound. Someone needs to actually be looking, on a schedule, not only when something breaks loudly.',
      'محصولاتی که راه‌اندازی می‌شوند و بعد هیچ توجهی نمی‌گیرند، وابستگی‌های قدیمی، خطاهای دیده‌نشده و ناراحتی‌های کوچکی جمع می‌کنند که روی هم انباشته می‌شوند. باید کسی طبق یک برنامه‌ی زمانی واقعاً نگاه کند، نه فقط وقتی چیزی با صدای بلند خراب می‌شود.',
    ),
    whatIDo: [
      tx('Apply dependency and security updates on a regular schedule', 'اعمال به‌روزرسانی‌های وابستگی و امنیت طبق یک برنامه‌ی زمانی منظم'),
      tx('Monitor for errors and confirm backups are actually running and restorable', 'مانیتور کردن خطاها و تأیید اینکه پشتیبان‌گیری‌ها واقعاً در حال اجرا و قابل‌بازیابی‌اند'),
      tx('Make the small changes that come up between larger engagements', 'انجام تغییرات کوچکی که بین قراردادهای بزرگ‌تر پیش می‌آیند'),
    ],
    included: [
      tx('Dependency and security updates on a monthly cadence', 'به‌روزرسانی وابستگی‌ها و امنیت با ریتم ماهانه'),
      tx('Error monitoring and a monthly health check', 'مانیتورینگ خطا و یک بررسی سلامت ماهانه'),
      tx('A pool of small-change time each month for minor fixes and content tweaks', 'مقداری زمان اختصاصی هر ماه برای اصلاح‌های جزئی و تغییرات کوچک محتوا'),
      tx('A monthly backups check — confirming a real backup exists and can be restored', 'یک بررسی ماهانه‌ی پشتیبان‌گیری — تأیید اینکه یک نسخه‌ی پشتیبان واقعی وجود دارد و قابل‌بازیابی است'),
    ],
    notIncluded: [
      tx('New features beyond the plan\u2019s small-change allowance — those are scoped and billed separately', 'ویژگی‌های تازه فراتر از سهمیه‌ی تغییرات کوچک برنامه — این‌ها جداگانه دامنه‌بندی و صورت‌حساب می‌شوند'),
      tx('24/7 incident response unless explicitly agreed', 'پاسخ‌گویی ۲۴ ساعته به حوادث مگر اینکه صراحتاً توافق شود'),
    ],
    deliverables: [
      tx('Ongoing updates', 'به‌روزرسانی‌های مستمر'),
      tx('Monthly health check', 'بررسی سلامت ماهانه'),
      tx('Backups verification', 'اعتبارسنجی پشتیبان‌گیری'),
    ],
    process: [
      step(
        ['Onboard', 'A short audit of the current product, dependencies and backup setup before the plan starts.'],
        ['شروع همکاری', 'یک ارزیابی کوتاه از محصول فعلی، وابستگی‌ها و وضعیت پشتیبان‌گیری، پیش از شروع برنامه.'],
      ),
      step(
        ['Monthly cycle', 'Updates, monitoring review and the small-change work happen on a set monthly cadence.'],
        ['چرخه‌ی ماهانه', 'به‌روزرسانی‌ها، بازبینی مانیتورینگ و کارهای تغییرات کوچک، طبق یک ریتم ماهانه‌ی مشخص انجام می‌شوند.'],
      ),
      step(
        ['Monthly report', 'A short summary of what was updated, checked and changed.'],
        ['گزارش ماهانه', 'یک خلاصه‌ی کوتاه از آنچه به‌روزرسانی، بررسی و تغییر داده شد.'],
      ),
    ],
    timeline: tx(
      'Ongoing, billed monthly. Either side can end the plan with the notice period set out in the Working Agreement.',
      'مستمر، با صورت‌حساب ماهانه. هر دو طرف می‌توانند برنامه را با دوره‌ی اطلاع قبلیِ ذکرشده در «توافق‌نامه‌ی همکاری» پایان دهند.',
    ),
    requirements: [
      tx('Access to the codebase, hosting and backup systems this plan is meant to cover', 'دسترسی به کدبیس، هاست و سیستم‌های پشتیبان‌گیریِ موردنظر این برنامه'),
    ],
    faq: [
      faq(
        ['What happens if something urgent comes up outside a scheduled cycle?', 'Urgent issues are triaged as they come in rather than held for the next cycle — the monthly cadence covers planned work, not a queue for emergencies.'],
        ['اگر بین دو چرخه‌ی برنامه‌ریزی‌شده، یک مسئله‌ی فوری پیش بیاید چه؟', 'مسائل فوری همان‌موقع بررسی می‌شوند، نه اینکه برای چرخه‌ی بعدی نگه داشته شوند — ریتم ماهانه برای کار برنامه‌ریزی‌شده است، نه یک صف برای موارد اضطراری.'],
      ),
    ],
    packages: [
      pkg({
        id: 'starter',
        name: tx('Starter', 'استارتر'),
        summary: tx('Updates and monitoring, no small-change hours included.', 'به‌روزرسانی و مانیتورینگ، بدون سهمیه‌ی زمانی برای تغییرات کوچک.'),
        forWhom: tx('A stable, low-change product that mainly needs someone keeping dependencies and backups healthy.', 'یک محصول پایدار و کم‌تغییر که عمدتاً به کسی نیاز دارد که وابستگی‌ها و پشتیبان‌گیری را سالم نگه دارد.'),
        included: [
          tx('Dependency and security updates on a monthly cadence', 'به‌روزرسانی وابستگی‌ها و امنیت با ریتم ماهانه'),
          tx('Error monitoring and a monthly health check', 'مانیتورینگ خطا و یک بررسی سلامت ماهانه'),
          tx('A monthly backups check', 'یک بررسی ماهانه‌ی پشتیبان‌گیری'),
        ],
        notIncluded: [
          tx('Small-change or content-tweak hours', 'ساعت‌های تغییرات کوچک یا اصلاح محتوا'),
        ],
        deliverables: [
          tx('Ongoing updates', 'به‌روزرسانی‌های مستمر'),
          tx('Monthly health check', 'بررسی سلامت ماهانه'),
        ],
        supportDays: 30,
      }),
      pkg({
        id: 'standard',
        name: tx('Standard', 'استاندارد'),
        summary: tx('Updates, monitoring and a pool of small-change hours each month.', 'به‌روزرسانی، مانیتورینگ و یک سهمیه‌ی ساعتی برای تغییرات کوچک هر ماه.'),
        forWhom: tx('A live product that needs small fixes and content tweaks to actually happen on a schedule, not pile up.', 'محصولی زنده که نیاز دارد اصلاح‌های کوچک و تغییرات محتوا طبق یک برنامه‌ی زمانی واقعاً انجام شوند، نه انباشته شوند.'),
        included: [
          tx('Everything in Starter', 'هر آنچه در استارتر است'),
          tx('A pool of small-change time each month for minor fixes and content tweaks', 'مقداری زمان اختصاصی هر ماه برای اصلاح‌های جزئی و تغییرات کوچک محتوا'),
        ],
        notIncluded: [
          tx('New features beyond the small-change allowance', 'ویژگی‌های تازه فراتر از سهمیه‌ی تغییرات کوچک'),
        ],
        deliverables: [
          tx('Ongoing updates', 'به‌روزرسانی‌های مستمر'),
          tx('Monthly health check', 'بررسی سلامت ماهانه'),
          tx('Backups verification', 'اعتبارسنجی پشتیبان‌گیری'),
        ],
        supportDays: 30,
      }),
      pkg({
        id: 'custom',
        name: tx('Custom', 'سفارشی'),
        summary: tx('A dedicated monthly block of hours for a product with ongoing development, not just maintenance.', 'یک بلوک ساعتی ماهانه‌ی اختصاصی برای محصولی با توسعه‌ی مستمر، نه فقط نگهداری.'),
        forWhom: tx('Ongoing product development — see the Long-term Part-time engagement model.', 'توسعه‌ی مستمر محصول — الگوی همکاری «بلندمدت پاره‌وقت» را ببینید.'),
        included: [
          tx('Everything in Standard, plus a larger, scoped monthly hours block', 'هر آنچه در استاندارد است، به‌علاوه‌ی یک بلوک ساعتی ماهانه‌ی بزرگ‌تر و دامنه‌بندی‌شده'),
        ],
        notIncluded: [],
        deliverables: [
          tx('Ongoing updates', 'به‌روزرسانی‌های مستمر'),
        ],
      }),
    ],
    whatDrivesCost: [
      tx('How many small-change hours are needed per month', 'چند ساعت تغییرات کوچک در ماه نیاز است'),
      tx('Number of integrations and services to monitor', 'تعداد اتصال‌ها و سرویس‌هایی که باید مانیتور شوند'),
      tx('Response-time expectations', 'انتظارات زمان پاسخ‌گویی'),
    ],
    paymentScheduleNote: tx(
      'Billed monthly, in advance. Either side can end the plan with the notice period set out in the Working Agreement.',
      'صورت‌حساب ماهانه، پیش‌پرداخت. هر دو طرف می‌توانند برنامه را با دوره‌ی اطلاع قبلیِ ذکرشده در «توافق‌نامه‌ی همکاری» پایان دهند.',
    ),
  },
]

const engagementModelsData: EngagementModel[] = [
  engagementModel(
    'discovery-sprint',
    ['Discovery Sprint', 'Discovery Sprint'],
    ['New or unclear projects — the low-risk first step', 'پروژه‌های تازه یا نامشخص — اولین قدم کم‌ریسک'],
    ['Fixed price, fixed deliverable: scope, architecture outline, estimate', 'قیمت ثابت، خروجی ثابت: دامنه، طرح‌کلی معماری، برآورد'],
  ),
  engagementModel(
    'fixed-scope-project',
    ['Fixed-scope Project', 'پروژه‌ی دامنه‌ثابت'],
    ['Clear scope after discovery', 'دامنه‌ی روشن پس از Discovery'],
    ['Milestones', 'نقاط عطف'],
  ),
  engagementModel(
    'productized-service',
    ['Productized Service', 'خدمت محصول‌محور'],
    ['Standard needs matching a package', 'نیازهای استاندارد که با یک بسته همخوانی دارند'],
    ['Package price + add-ons', 'قیمت بسته + افزونه‌ها'],
  ),
  engagementModel(
    'care-plan',
    ['Care Plan', 'برنامه‌ی نگهداری'],
    ['Live product needing ongoing care', 'محصول زنده‌ای که به مراقبت مستمر نیاز دارد'],
    ['Monthly', 'ماهانه'],
  ),
  engagementModel(
    'long-term-part-time',
    ['Long-term Part-time', 'بلندمدت پاره‌وقت'],
    ['Ongoing product development', 'توسعه‌ی مستمر محصول'],
    ['Monthly block of hours', 'بلوک ساعتی ماهانه'],
  ),
]

export function getAllServices(): Service[] {
  return servicesData
}

export function getServiceBySlug(slug: string): Service | undefined {
  return servicesData.find((service) => service.slug === slug)
}

export function getEngagementModels(): EngagementModel[] {
  return engagementModelsData
}
