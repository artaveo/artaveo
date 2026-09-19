import type { LegalDocument, LegalSection, LocalizedText } from '@/types/content'
import { siteConfig } from '@/lib/site'

/**
 * Privacy Policy & Terms of Service content (roadmap § 11.2, gated by
 * D-07 — resolved 13 Sep 2026: Artaveo is operated from Afghanistan).
 *
 * ## Why this reads the way it does
 *
 * Afghanistan has no comprehensive, standalone data-protection statute
 * (verified via web search before writing this — IAPP and multiple legal
 * trackers confirm this as of 2025/2026; only narrow sectoral clauses
 * exist in telecom/banking law). That means nothing here is a claim of
 * legal compliance with a specific data-protection regime — every
 * commitment below (access, correction, deletion on request) is
 * voluntary, offered as good practice regardless of what the law
 * requires, not because D-07 makes GDPR or an equivalent mandatory. The
 * roadmap's own § 11.2 instruction ("if EU-based, GDPR-grade…") doesn't
 * apply, since Artaveo is not EU-based — this is the honest alternative
 * for the jurisdiction that *is* real.
 *
 * This is not legal advice, and Claude is not a lawyer — Zakir should
 * have this reviewed by one before relying on it as an enforceable
 * contract, particularly the Terms of Service's liability section.
 *
 * No imprint / "Impressum" page exists: that's a German/EU-specific
 * statutory requirement (TMG §5) with no Afghan equivalent found in the
 * same research pass — real identity/contact info already lives on
 * `/about` (D-02: real name) and in the footer, which is what an imprint
 * would otherwise duplicate.
 *
 * Every fact cited below (Supabase region, RLS posture, § 9.3's
 * notification status, the analytics package used) is pulled from the
 * actual current implementation — nothing here describes a system that
 * doesn't exist yet.
 */

function tx(en: string, fa: string): LocalizedText {
  return { en, fa }
}

function section(id: string, title: LocalizedText, paragraphs: LocalizedText[], list?: LocalizedText[]): LegalSection {
  return { id, title, paragraphs, list }
}

/** Kept separate: a change to one document must not re-date the other. */
const PRIVACY_LAST_UPDATED = '2026-09-19' // + local search history (Phase 18), + stored e-mail copies and delivery log (Phase 19), + recommenders' e-mail address (D-14)
const TERMS_LAST_UPDATED = '2026-09-13'

const privacySections: LegalSection[] = [
  section(
    'who',
    tx('Who this covers', 'این سند مربوط به کیست'),
    [
      tx(
        `${siteConfig.name} is the work of one independent developer, Zakir Naseri, operating from Afghanistan. This page explains what personal data this website collects, why, where it's stored, and what you can do about it.`,
        `${siteConfig.name} کار یک توسعه‌دهنده‌ی مستقل، زکریا نصری، است که از افغانستان فعالیت می‌کند. این صفحه توضیح می‌دهد این وب‌سایت چه داده‌ی شخصی‌ای جمع‌آوری می‌کند، چرا، کجا نگه‌داری می‌شود، و چه کاری می‌توانی درباره‌اش انجام دهی.`,
      ),
      tx(
        'Afghanistan does not currently have a comprehensive data-protection law of its own. Nothing on this page is a claim that a specific law (like the EU\'s GDPR) applies here — the commitments below are offered voluntarily, as good practice, regardless of what the law requires.',
        'افغانستان در حال حاضر یک قانون جامع حفاظت از داده ندارد. هیچ‌جای این صفحه ادعا نمی‌کند که قانون مشخصی (مثل GDPR اتحادیه‌ی اروپا) این‌جا اعمال می‌شود — تعهدات زیر داوطلبانه و به‌عنوان یک روش خوب ارائه می‌شوند، صرف‌نظر از این‌که قانون چه چیزی را الزامی می‌کند.',
      ),
    ],
  ),
  section(
    'what',
    tx('What is collected', 'چه چیزی جمع‌آوری می‌شود'),
    [
      tx(
        'The Brief Builder (/start) asks for your name, e-mail address, project type, the service or package you\'re interested in, your goals and key features, timeline, a self-reported budget range, any links or references you provide, your preferred language and contact channel, and your consent to be contacted. A few technical fields travel alongside your answers purely to stop spam: a random idempotency key (so a double-click can\'t create two entries), and a salted, one-way hash of your IP address — never the raw address itself.',
        'فرم Brief Builder (در /start) نام، آدرس ایمیل، نوع پروژه، سرویس یا پکیج مورد نظر، هدف‌ها و ویژگی‌های کلیدی، بازه‌ی زمانی، یک بازه‌ی بودجه‌ی خوداظهاری، هر لینک یا مرجعی که ارائه می‌دهی، زبان و کانال ترجیحی‌ات، و رضایتت برای تماس گرفتن را می‌پرسد. چند فیلد فنی هم فقط برای جلوگیری از اسپم همراه پاسخ‌هایت ارسال می‌شود: یک کلید تصادفی idempotency (تا یک دوبار-کلیک باعث ثبت دو ورودی نشود)، و یک هش یک‌طرفه و نمک‌دار از آدرس آی‌پی‌ات — نه خودِ آدرس خام.',
      ),
      tx(
        'If you e-mail or WhatsApp me directly instead, whatever you choose to send is between us — the website itself doesn\'t collect or log that.',
        'اگر به‌جای این کار مستقیم ایمیل یا واتساپ بزنی، هرچه بفرستی فقط بین ما می‌ماند — خودِ وب‌سایت آن را جمع‌آوری یا ثبت نمی‌کند.',
      ),
      tx(
        "If I've sent you a personal link to write a recommendation, that page asks for your name, your role and relationship to me, your statement, an optional profile link, and your explicit consent to publish it — nothing appears on the site without that consent and my review. If I typed your e-mail address in to send you that link, it's used for that and nothing else. I delete it, and the stored copies of those e-mails, once the request is finished: the link is revoked, your recommendation is approved or rejected, or the link expired unused. A link with no expiry that is never used or revoked keeps the address until I revoke it.",
        'اگر برای نوشتن توصیه‌نامه یک لینک اختصاصی برایت فرستاده‌ام، آن صفحه نام، نقش و نوع آشنایی‌ات با من، متن توصیه‌نامه، یک لینک پروفایل اختیاری و رضایت صریحت برای انتشار را می‌پرسد — بدون آن رضایت و بازبینی من، چیزی در سایت نمایش داده نمی‌شود. اگر نشانی ایمیلت را وارد کرده باشم تا آن لینک را برایت بفرستم، فقط برای همین کار استفاده می‌شود. وقتی درخواست تمام شد — لینک لغو شود، توصیه‌نامه‌ات تأیید یا رد شود، یا لینک بدون استفاده منقضی شود — آن را و نسخه‌های ذخیره‌شده‌ی آن ایمیل‌ها را حذف می‌کنم. لینکی که تاریخ انقضا ندارد و هرگز استفاده یا لغو نشود، نشانی را تا زمانی که لغوش کنم نگه می‌دارد.',
      ),
      tx(
        "Automatic, anonymized traffic data comes from Vercel Web Analytics, which doesn't use cookies and identifies visitors only by a short-lived hash derived from the request itself — never a persistent ID. It records aggregate page views and a handful of interaction events (a package tier switch, a CTA click, a language switch, and similar) with no name, e-mail, or message content ever included in any of them.",
        'داده‌ی ترافیک به‌صورت خودکار و ناشناس از Vercel Web Analytics می‌آید، که از کوکی استفاده نمی‌کند و بازدیدکننده را فقط با یک هش کوتاه‌مدت برگرفته از خود درخواست شناسایی می‌کند — نه یک شناسه‌ی دائمی. این ابزار بازدید صفحات به‌صورت تجمیعی و چند رویداد تعامل (تعویض پلن، کلیک روی دکمه‌ی فراخوان، تعویض زبان و مواردی مشابه) را ثبت می‌کند، بدون این‌که هیچ‌کدام حاوی نام، ایمیل یا محتوای پیام باشند.',
      ),
      tx(
        'One small, first-party cookie (`artaveo-locale`) remembers whether you\'re viewing the site in English or Persian. It\'s strictly functional — it isn\'t used to track you, and no other cookie is set by this site.',
        'یک کوکی کوچک و اول‌شخص (`artaveo-locale`) به‌خاطر می‌سپارد که سایت را به انگلیسی می‌بینی یا فارسی. این کوکی کاملاً کارکردی است — برای ردیابی تو استفاده نمی‌شود، و هیچ کوکی دیگری توسط این سایت تنظیم نمی‌شود.',
      ),
      tx(
        "Your own browser also keeps a few things locally, never sent anywhere: a light/dark theme preference, the last few things you searched for on the site (so the search box can offer them again — you can clear them there at any time), and — only if you start the Brief Builder while offline — a temporary local copy of your not-yet-sent answers, held only on your own device until you're back online and it sends automatically.",
        'مرورگر خودت هم چند چیز را به‌صورت محلی نگه می‌دارد که هیچ‌جا فرستاده نمی‌شود: یک ترجیح تم روشن/تاریک، چند جستجوی آخرِ تو در سایت (تا کادر جستجو دوباره پیشنهادشان بدهد؛ هر وقت خواستی همان‌جا پاکشان کن)، و — فقط اگر Brief Builder را در حالت آفلاین شروع کنی — یک نسخه‌ی موقت و محلی از پاسخ‌های هنوز-نفرستاده‌ات، که فقط روی دستگاه خودت می‌ماند تا وقتی دوباره آنلاین شوی و به‌صورت خودکار ارسال شود.',
      ),
    ],
  ),
  section(
    'why',
    tx('Why it\'s collected', 'چرا جمع‌آوری می‌شود'),
    [
      tx(
        "To read and respond to your project inquiry, to understand in aggregate how the site is being used so it can be improved, and to keep the Brief Builder reasonably free of spam.",
        'برای خواندن و پاسخ‌دادن به درخواست پروژه‌ات، برای فهم مجموع نحوه‌ی استفاده از سایت تا بتوان آن را بهبود داد، و برای این‌که Brief Builder تا حد معقولی عاری از اسپم بماند.',
      ),
    ],
  ),
  section(
    'where',
    tx('Where it\'s stored', 'کجا نگه‌داری می‌شود'),
    [
      tx(
        'Brief Builder submissions are stored in a Supabase-hosted PostgreSQL database (Southeast Asia region), behind Row Level Security with no public read policies — only server-side code with the service-role key can read it, never a public API.',
        'ارسالی‌های Brief Builder در یک پایگاه‌داده‌ی PostgreSQL میزبانی‌شده روی Supabase (منطقه‌ی جنوب‌شرق آسیا) نگه‌داری می‌شوند، پشت Row Level Security و بدون هیچ سیاست خواندن عمومی — فقط کد سمت سرور با کلید service-role می‌تواند آن را بخواند، هرگز یک API عمومی.',
      ),
      tx(
        "This site is hosted on Vercel, which also runs the anonymized analytics described above. No inquiry data is currently sent to any third-party e-mail-sending service — a confirmation e-mail is logged internally only, while real sending stays intentionally inactive pending a registered domain. This page will be updated to name the real provider once that changes. A copy of every e-mail the site generates for you (such as the confirmation of your brief) is stored in the same database, together with a log of each attempt to send it.",
        'این سایت روی Vercel میزبانی می‌شود، که همان تحلیل ناشناس توضیح‌داده‌شده در بالا را هم اجرا می‌کند. در حال حاضر هیچ داده‌ی درخواستی به هیچ سرویس ایمیل شخص‌ثالثی فرستاده نمی‌شود — یک ایمیل تأییدیه فقط به‌صورت داخلی ثبت می‌شود، در حالی‌که ارسال واقعی عمداً تا زمان ثبت یک دامنه‌ی واقعی غیرفعال نگه داشته شده. این صفحه با فعال‌شدن آن، برای معرفی سرویس واقعی به‌روزرسانی خواهد شد. یک نسخه از هر ایمیلی که سایت برای تو می‌سازد (مثل تأییدیه‌ی بریف) به‌همراه گزارش هر تلاش برای ارسال آن، در همان پایگاه‌داده نگه‌داری می‌شود.',
      ),
    ],
  ),
  section(
    'retention',
    tx('How long it\'s kept', 'چه‌مدت نگه‌داری می‌شود'),
    [
      tx(
        "There's no automatic deletion schedule in place yet — this is a known gap, tracked as future work, not a claim that one already exists. In practice, submissions are kept as long as needed to respond to you and for reasonable business record-keeping, and deleted on request (see Your choices below).",
        'در حال حاضر هیچ زمان‌بندی حذف خودکاری وجود ندارد — این یک کمبود شناخته‌شده است که به‌عنوان کار آینده ثبت شده، نه ادعایی که چنین چیزی از قبل وجود دارد. در عمل، ارسالی‌ها تا زمانی که برای پاسخ‌دادن به تو و نگه‌داری معقول سوابق کسب‌وکار لازم است نگه‌داری می‌شوند، و در صورت درخواست حذف می‌شوند (بخش «انتخاب‌های تو» را ببین).',
      ),
    ],
  ),
  section(
    'choices',
    tx('Your choices', 'انتخاب‌های تو'),
    [
      tx(
        `You can e-mail ${siteConfig.email} at any time to ask what's on file about you, ask for it to be corrected, or ask for it to be deleted. I'll respond within a reasonable time.`,
        `هر زمان می‌توانی به ${siteConfig.email} ایمیل بزنی تا بپرسی چه چیزی درباره‌ات ثبت شده، درخواست اصلاح آن را بدهی، یا درخواست حذفش را بدهی. در بازه‌ی زمانی معقولی پاسخ خواهم داد.`,
      ),
    ],
  ),
  section(
    'children',
    tx('Children', 'کودکان'),
    [
      tx(
        "This site is not directed at children, and personal data isn't knowingly collected from anyone under 18.",
        'این سایت برای کودکان طراحی نشده، و داده‌ی شخصی هیچ‌کس زیر ۱۸ سال آگاهانه جمع‌آوری نمی‌شود.',
      ),
    ],
  ),
  section(
    'changes',
    tx('Changes to this policy', 'تغییرات در این سیاست'),
    [
      tx(
        "This page may be updated as the site or its infrastructure changes — the date at the top always reflects the latest version.",
        'این صفحه ممکن است با تغییر سایت یا زیرساختش به‌روزرسانی شود — تاریخ بالای صفحه همیشه آخرین نسخه را نشان می‌دهد.',
      ),
    ],
  ),
]

const termsSections: LegalSection[] = [
  section(
    'scope',
    tx('What these terms cover', 'این شرایط چه چیزی را پوشش می‌دهند'),
    [
      tx(
        `These terms cover using this website. They don't cover the specific terms of a paid project — those are agreed in writing (scope and estimate) during the Define phase described on the Process page, following the working-agreement principles set out there (communication, payment, ownership, handover, warranty, confidentiality).`,
        'این شرایط استفاده از این وب‌سایت را پوشش می‌دهند. این‌ها شرایط مشخص یک پروژه‌ی پولی را پوشش نمی‌دهند — آن‌ها به‌صورت مکتوب (محدوده و برآورد) در فاز «تعریف» که در صفحه‌ی فرایند توضیح داده شده توافق می‌شوند، و از اصول توافق‌نامه‌ی کاری همان صفحه پیروی می‌کنند (ارتباط، پرداخت، مالکیت، تحویل، ضمانت، محرمانگی).',
      ),
    ],
  ),
  section(
    'law',
    tx('Governing law', 'قانون حاکم'),
    [
      tx(
        `${siteConfig.name} is operated from Afghanistan, and these terms are governed by Afghan law, without excluding any mandatory consumer-protection rights you may have under the law of your own country.`,
        `${siteConfig.name} از افغانستان فعالیت می‌کند، و این شرایط تابع قانون افغانستان است، بدون این‌که هیچ حق الزامی حمایت از مصرف‌کننده که ممکن است تحت قانون کشور خودت داشته باشی را نفی کند.`,
      ),
    ],
  ),
  section(
    'ip',
    tx('Intellectual property', 'مالکیت فکری'),
    [
      tx(
        'The text, design, and case-study write-ups on this site belong to Zakir Naseri / Artaveo — please don\'t copy or republish them without permission. The two real projects shown as case studies (the Transportation System and the Pezhohesh Complex Portal) are also Zakir Naseri\'s own, with publication approved for both.',
        'متن، طراحی و توضیحات نمونه‌کارهای این سایت متعلق به زکریا نصری / آرتاویو است — لطفاً بدون اجازه آن‌ها را کپی یا بازنشر نکن. دو پروژه‌ی واقعی نشان‌داده‌شده به‌عنوان نمونه‌کار (سیستم حمل‌ونقل و پورتال مجتمع پژوهش) هم متعلق به خودِ زکریا نصری هستند، و انتشار هر دو تأیید شده است.',
      ),
    ],
  ),
  section(
    'use',
    tx('Acceptable use', 'استفاده‌ی قابل‌قبول'),
    [
      tx(
        "Please don't try to break, scrape at scale, or abuse this site or the Brief Builder — including submitting spam or automated junk through it.",
        'لطفاً تلاش نکن این سایت یا Brief Builder را خراب کنی، در مقیاس بزرگ scrape کنی، یا از آن سوءاستفاده کنی — از جمله ارسال اسپم یا داده‌ی بی‌ارزش خودکار از طریق آن.',
      ),
    ],
  ),
  section(
    'warranty',
    tx('No warranty on the website itself', 'بدون ضمانت برای خودِ وب‌سایت'),
    [
      tx(
        "This website is provided on a best-effort basis, \"as is,\" with no guarantee of uninterrupted availability. (A specific project you engage Artaveo for is a separate matter, covered by that project's own written agreement, not this page.)",
        'این وب‌سایت به‌صورت تلاش‌بهترین («همان‌گونه که هست») ارائه می‌شود، بدون هیچ تضمینی برای در دسترس‌بودن بدون وقفه. (یک پروژه‌ی مشخص که برای آن آرتاویو را استخدام می‌کنی موضوع جداگانه‌ای است که تحت قرارداد مکتوب همان پروژه است، نه این صفحه.)',
      ),
    ],
  ),
  section(
    'liability',
    tx('Liability', 'مسئولیت'),
    [
      tx(
        "To the extent permitted by law, Artaveo isn't liable for indirect or consequential loss arising from your use of this website. This is general website-use language, not a substitute for a specific project's own contract — if you're about to sign one, it's worth having your own legal advisor look it over.",
        'تا حدی که قانون اجازه می‌دهد، آرتاویو مسئول خسارت غیرمستقیم یا تبعی ناشی از استفاده‌ات از این وب‌سایت نیست. این یک عبارت کلی درباره‌ی استفاده از وب‌سایت است، نه جایگزینی برای قرارداد مشخص یک پروژه — اگر می‌خواهی یکی را امضا کنی، بهتر است مشاور حقوقی خودت آن را بررسی کند.',
      ),
    ],
  ),
  section(
    'changes',
    tx('Changes to these terms', 'تغییرات در این شرایط'),
    [
      tx(
        'These terms may be updated as the site changes — the date at the top always reflects the latest version.',
        'این شرایط ممکن است با تغییر سایت به‌روزرسانی شوند — تاریخ بالای صفحه همیشه آخرین نسخه را نشان می‌دهد.',
      ),
    ],
  ),
  section(
    'contact',
    tx('Contact', 'تماس'),
    [
      tx(
        `Questions about these terms? E-mail ${siteConfig.email}.`,
        `سؤالی درباره‌ی این شرایط داری؟ به ${siteConfig.email} ایمیل بزن.`,
      ),
    ],
  ),
]

export function getPrivacyPolicy(): LegalDocument {
  return { lastUpdated: PRIVACY_LAST_UPDATED, sections: privacySections }
}

export function getTermsOfService(): LegalDocument {
  return { lastUpdated: TERMS_LAST_UPDATED, sections: termsSections }
}
