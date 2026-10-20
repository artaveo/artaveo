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
 * Every fact cited below (Neon region, RLS posture, § 9.3's
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

/** Where a text names the contact address; replaced by `withEmail()` below. */
const EMAIL = '{email}'

/** Kept separate: a change to one document must not re-date the other. */
const PRIVACY_LAST_UPDATED = '2026-10-20' // + rewritten in plain words, «شما» and the brand's voice, the product demo and purchase form added (Phase 32), + the contact address from the admin's settings and Artaveo named with its founder (Phase 31), + storage moved from Supabase to Neon (Singapore), + encrypted daily backups (Phase 25), + failure records, event counts and security-policy reports (Phase 24), + local search history (Phase 18), + stored e-mail copies and delivery log (Phase 19), + recommenders' e-mail address (D-14), + consultation requests (Phase 20)
const TERMS_LAST_UPDATED = '2026-10-20' // + rewritten in plain words and «شما»; project terms point to the project's agreement, not the retired Process page (Phase 32); the contact address from the admin's settings, the founder's name corrected (Phase 31)

/**
 * Phase 32: both documents rewritten for the reader — the brand speaks («آرتاویو»,
 * never «من»), the reader is «شما», no technical terms. The facts are unchanged
 * and still describe the running site; only the processors a privacy policy must
 * name (Neon, Vercel) appear by name.
 */
const privacySections: LegalSection[] = [
  section(
    'who',
    tx('Who this covers', 'این صفحه درباره‌ی چیست'),
    [
      tx(
        `${siteConfig.name} was founded by Zakir Naseri and works from Afghanistan. This page explains what this website collects from you, why, where it is kept, and what you can ask for.`,
        `${siteConfig.name} را ذاکر ناصری بنیان گذاشته است و از افغانستان کار می‌کند. این صفحه می‌گوید این وب‌سایت چه معلوماتی از شما جمع می‌کند، برای چه، کجا نگه می‌دارد و شما چه چیزی می‌توانید بخواهید.`,
      ),
      tx(
        "Afghanistan does not yet have a general data-protection law. Artaveo does not claim that a particular law, such as the EU's GDPR, applies to this site; the commitments on this page are made by choice, because they are good practice.",
        'افغانستان هنوز قانون عمومی حفاظت از معلومات شخصی ندارد. آرتاویو ادعا نمی‌کند که قانون مشخصی، مثل GDPR اتحادیه‌ی اروپا، بر این سایت اعمال می‌شود؛ تعهدهای این صفحه را آرتاویو به خواست خود و به‌عنوان یک کار درست پذیرفته است.',
      ),
    ],
  ),
  section(
    'what',
    tx('What is collected', 'چه معلوماتی جمع می‌شود'),
    [
      tx(
        'The project form (Start a project) asks for your name, e-mail address, what you need, the service or package you are interested in, what the software should do, when you need it, a rough budget if you want to give one, any links or files you add, your preferred language and way of reply, and your agreement to be contacted. To stop spam, two technical values travel with your answers: a random number that keeps a double click from sending the form twice, and a one-way scrambled form of your IP address — never the address itself.',
        'فورم شروع پروژه نام، ایمیل، آنچه ضرورت دارید، خدمت یا بسته‌ای که می‌خواهید، کارهایی که نرم‌افزار باید انجام دهد، زمانی که به آن ضرورت دارید، بودجه‌ی تقریبی (اگر بخواهید بگویید)، لینک‌ها یا فایل‌هایی که اضافه می‌کنید، زبان و راه جواب دلخواه شما و موافقت شما برای تماس را می‌پرسد. برای جلوگیری از پیام‌های ناخواسته، دو مقدار فنی همراه جواب‌های شما فرستاده می‌شود: یک عدد تصادفی که نمی‌گذارد با دو بار کلیک، فورم دو بار فرستاده شود، و شکل رمزشده و یک‌طرفه‌ی نشانی IP شما — هرگز خود نشانی.',
      ),
      tx(
        'The demo and purchase form on a product page asks for your name, e-mail address, phone or WhatsApp number, how you would like the reply, the way of getting the product and any after-sales services you pick, an optional message and your agreement. It carries the same two anti-spam values as the project form.',
        'فورم درخواست دمو و خرید در صفحه‌ی هر محصول نام، ایمیل، شماره‌ی تلفن یا واتس‌اپ، راه جواب دلخواه، روش تهیه‌ی محصول و خدمات پس از فروشی که انتخاب می‌کنید، یک پیام اختیاری و موافقت شما را می‌پرسد. همان دو مقدار فنی فورم شروع پروژه همراه آن هم فرستاده می‌شود.',
      ),
      tx(
        'If you write to Artaveo directly by e-mail or WhatsApp, what you send stays in that conversation; the website itself does not collect or record it.',
        'اگر مستقیم با ایمیل یا واتس‌اپ به آرتاویو پیام بفرستید، آنچه می‌فرستید در همان گفتگو می‌ماند؛ خود وب‌سایت آن را جمع یا ثبت نمی‌کند.',
      ),
      tx(
        "If Artaveo has sent you a personal link to write a recommendation, that page asks for your name, your role, how you know Artaveo, your recommendation, an optional profile link and your agreement to publish it. Nothing appears on the site without that agreement and Artaveo's review. If Artaveo typed in your e-mail address to send you the link, it is used for that alone, and it is deleted — with the stored copies of those e-mails — once the request is finished: when the link is withdrawn, your recommendation is approved or declined, or the link expires unused. A link without an expiry date that is never used or withdrawn keeps the address until Artaveo withdraws it.",
        'اگر آرتاویو برای نوشتن توصیه‌نامه یک لینک خصوصی برای شما فرستاده باشد، آن صفحه نام، نقش، این‌که آرتاویو را از کجا می‌شناسید، متن توصیه‌نامه، یک لینک پروفایل اختیاری و موافقت شما برای نشر آن را می‌پرسد. بدون این موافقت و بدون بررسی آرتاویو، چیزی در سایت نشان داده نمی‌شود. اگر آرتاویو ایمیل شما را برای فرستادن آن لینک نوشته باشد، فقط برای همین کار استفاده می‌شود و وقتی درخواست تمام شد — لینک پس گرفته شد، توصیه‌نامه‌ی شما پذیرفته یا رد شد، یا لینک بدون استفاده کهنه شد — همراه با نسخه‌های نگه‌داشته‌ی آن ایمیل‌ها پاک می‌شود. لینکی که تاریخ ختم ندارد و هرگز استفاده یا پس گرفته نشود، ایمیل را تا وقتی آرتاویو آن را پس بگیرد نگه می‌دارد.',
      ),
      tx(
        'If you ask for a consultation call, the form asks for your name, e-mail address, an optional WhatsApp number, what you would like to talk about, the times you are free and your agreement. Your time zone is read from your browser to fill in the form, and you can change it; only its name is sent, with the times you offer. The request carries the same two anti-spam values as the project form and comes with a private link: an address no one can guess that shows the state of your call and lets you change the time or cancel. Anyone with that link can see the call, so keep it like a password. When Artaveo confirms a time, it adds how the call will happen (a meeting link or how you will be called) and sends you a calendar invitation; that detail shows on your private page only while the call is still on. The page closes 14 days after the call takes place or is cancelled; the request itself is kept until you ask for it to be deleted.',
        'اگر وقت مشوره بخواهید، فورم نام، ایمیل، یک شماره‌ی واتس‌اپ اختیاری، موضوعی که می‌خواهید درباره‌ی آن گفتگو شود، وقت‌هایی که فرصت دارید و موافقت شما را می‌پرسد. ساعت محل شما از مرورگر خوانده می‌شود تا فورم پر شود و شما می‌توانید آن را تغییر دهید؛ فقط نام آن همراه وقت‌هایی که پیشنهاد می‌کنید فرستاده می‌شود. همان دو مقدار فنی فورم شروع پروژه همراه این درخواست هم فرستاده می‌شود و یک لینک خصوصی برای شما ساخته می‌شود: نشانی‌ای که کسی نمی‌تواند حدس بزند، وضعیت تماس شما را نشان می‌دهد و با آن می‌توانید وقت را تغییر دهید یا تماس را لغو کنید. هر کسی که این لینک را داشته باشد تماس را می‌بیند؛ پس آن را مثل یک رمز نگه دارید. وقتی آرتاویو وقتی را تأیید می‌کند، روش تماس (لینک جلسه یا این‌که با شما چطور تماس گرفته می‌شود) را اضافه می‌کند و یک دعوت‌نامه‌ی تقویم برای شما می‌فرستد؛ این جزئیات فقط تا وقتی تماس برقرار است در صفحه‌ی خصوصی شما دیده می‌شود. این صفحه ۱۴ روز بعد از انجام یا لغو تماس بسته می‌شود؛ خود درخواست تا وقتی پاک کردن آن را نخواسته‌اید نگه داشته می‌شود.',
      ),
      tx(
        'Visit counts come from Vercel Web Analytics. It sets no cookies and tells visitors apart only by a short-lived code made from the visit itself, never by a lasting ID. It counts page views and a few actions — such as pressing a button or switching the language — and never records a name, e-mail address or message.',
        'شمار بازدیدها را Vercel Web Analytics می‌شمارد. این ابزار کوکی نمی‌گذارد و بازدیدکننده‌ها را فقط با یک کد کوتاه‌عمر که از خود بازدید ساخته می‌شود از هم جدا می‌کند، هرگز با یک شناسه‌ی دایمی. بازدید صفحه‌ها و چند کار — مثل زدن یک دکمه یا تغییر زبان — شمرده می‌شود و هیچ‌وقت نام، ایمیل یا متن پیامی ثبت نمی‌شود.',
      ),
      tx(
        'One small cookie from this site (`artaveo-locale`) remembers whether you read the site in English or Dari. It is only for that: it does not follow you, and the site sets no other cookie.',
        'یک کوکی کوچک از خود این سایت (`artaveo-locale`) به یاد می‌سپارد که سایت را به دری می‌خوانید یا انگلیسی. کار آن فقط همین است: شما را دنبال نمی‌کند و سایت هیچ کوکی دیگری نمی‌گذارد.',
      ),
      tx(
        "When something on the site goes wrong, a record of the error is kept for up to 90 days so it can be found and fixed: what went wrong, on what kind of page (private links are replaced by a placeholder and never stored), a random request number and, for errors in your browser, the error text your browser reports. E-mail addresses, phone-like numbers and long random-looking strings are removed from these records automatically. Artaveo never puts a name, e-mail address, IP address or form answers in them; an error text written by a browser could still contain a piece of the page, which is why the automatic removal is there. The site also keeps simple counts of what happened (for example, that a project form was sent — never what it said), and receives a report from your browser when the site's security settings block something on a page.",
        'وقتی در سایت مشکلی پیش می‌آید، ثبتی از آن خطا تا ۹۰ روز نگه داشته می‌شود تا پیدا و رفع شود: چه اتفاقی افتاد، در چه نوع صفحه‌ای (لینک‌های خصوصی با یک نشانه‌ی جایگزین عوض می‌شوند و هرگز نگه داشته نمی‌شوند)، یک شماره‌ی تصادفی درخواست و، برای خطاهای مرورگر، متن خطایی که مرورگر شما گزارش می‌کند. ایمیل‌ها، عددهای شبیه شماره‌ی تلفن و نوشته‌های درازِ تصادفی‌نما خودکار از این ثبت‌ها پاک می‌شوند. آرتاویو هیچ‌وقت نام، ایمیل، نشانی IP یا جواب‌های فورم را در آن‌ها نمی‌گذارد؛ متن خطایی که مرورگر می‌نویسد ممکن است تکه‌ای از صفحه را داشته باشد و پاک کردن خودکار برای همین است. سایت شمار ساده‌ی کارهایی را که انجام شده هم نگه می‌دارد (مثلاً این‌که یک فورم پروژه فرستاده شد — هرگز متن آن)، و وقتی تنظیمات امنیتی سایت چیزی را در یک صفحه ببندد، گزارش آن را از مرورگر شما می‌گیرد.',
      ),
      tx(
        'Your browser keeps a few things on your own device and sends them nowhere: your light or dark theme, your last few site searches (so the search box can offer them again — you can clear them there at any time) and, only if you fill in the project form while offline, a copy of your unsent answers, kept on your device until you are back online and it sends itself.',
        'مرورگر شما چند چیز را فقط روی دستگاه خود شما نگه می‌دارد و به جایی نمی‌فرستد: نمای روشن یا تاریک، چند جستجوی آخر شما در سایت (تا خانه‌ی جستجو دوباره آن‌ها را پیشنهاد کند — هر وقت خواستید همان‌جا پاکشان کنید) و، فقط اگر فورم پروژه را بدون انترنت پر کنید، نسخه‌ای از جواب‌های فرستاده‌نشده که تا وصل شدن دوباره‌ی انترنت روی دستگاه شما می‌ماند و بعد خودش فرستاده می‌شود.',
      ),
    ],
  ),
  section(
    'why',
    tx('Why it is collected', 'برای چه جمع می‌شود'),
    [
      tx(
        'To read and answer your project, product or call request, to see in total how the site is used so it can be improved, and to keep the forms free of spam.',
        'برای خواندن و جواب دادن به درخواست پروژه، محصول یا تماس شما، برای دیدن این‌که سایت روی‌هم‌رفته چطور استفاده می‌شود تا بهتر شود، و برای دور نگه داشتن فورم‌ها از پیام‌های ناخواسته.',
      ),
    ],
  ),
  section(
    'where',
    tx('Where it is kept', 'کجا نگه داشته می‌شود'),
    [
      tx(
        'Your requests are kept by Neon, a data-storage provider, in its Singapore region. They are private: only the website itself can read them, with its own key, and nothing is open to the public. Files you attach to a project form are kept in private storage with Neon and have no public address.',
        'درخواست‌های شما نزد Neon، یک شرکت نگه‌داری معلومات، در منطقه‌ی سنگاپور آن نگه داشته می‌شوند. این معلومات خصوصی است: فقط خود وب‌سایت با کلید خودش می‌تواند آن را بخواند و هیچ بخشی از آن برای عموم باز نیست. فایل‌هایی که به فورم پروژه پیوست می‌کنید هم در یک جای خصوصی نزد Neon نگه داشته می‌شوند و نشانی عمومی ندارند.',
      ),
      tx(
        'The site runs on Vercel, which also provides the visit counts above. For now the site sends no e-mail through an outside e-mail service: the confirmation e-mails it prepares are kept, not delivered, until sending is switched on — this page will name the e-mail service when that happens. A copy of every e-mail the site prepares for you (such as the confirmation of your request or the calendar invitation for your call) is kept with your request, together with a record of each attempt to send it.',
        'سایت روی Vercel کار می‌کند و شمار بازدیدهایی که در بالا آمد هم از همان‌جاست. فعلاً سایت از راه هیچ سرویس بیرونی ایمیل نمی‌فرستد: ایمیل‌های تأییدی که آماده می‌کند نگه داشته می‌شوند و تا روشن شدن فرستادن ایمیل، فرستاده نمی‌شوند — وقتی این کار روشن شود، نام سرویس ایمیل در همین صفحه نوشته می‌شود. نسخه‌ای از هر ایمیلی که سایت برای شما آماده می‌کند (مثل تأیید درخواست شما یا دعوت‌نامه‌ی تقویم تماس) همراه درخواست شما و با ثبت هر بار تلاش برای فرستادن آن نگه داشته می‌شود.',
      ),
    ],
  ),
  section(
    'retention',
    tx('How long it is kept', 'تا چه وقت نگه داشته می‌شود'),
    [
      tx(
        'Requests are kept for as long as they are needed to answer you and to keep reasonable business records, and are deleted when you ask (see Your choices below).',
        'درخواست‌ها تا وقتی برای جواب دادن به شما و نگه داشتن سوابق معمول کسب‌وکار ضرورت باشد نگه داشته می‌شوند و هر وقت بخواهید پاک می‌شوند (بخش «اختیار شما» را در پایین ببینید).',
      ),
      tx(
        'Everything is also copied once a day into an encrypted backup that is kept for about a month, so the site can recover from a real failure. Only Artaveo holds the key to read a backup. Deleting your details at your request does not remove them from a backup taken before the request; that backup expires on its own within the month.',
        'همه‌چیز روزی یک بار در یک نسخه‌ی پشتیبان رمزشده هم کاپی می‌شود که حدود یک ماه می‌ماند تا سایت بعد از یک خرابی واقعی دوباره کار کند. کلید خواندن نسخه‌ی پشتیبان فقط نزد آرتاویو است. پاک کردن معلومات شما به درخواست خودتان، آن را از نسخه‌ی پشتیبانی که پیش از درخواست گرفته شده پاک نمی‌کند؛ آن نسخه خودش در همان یک ماه از بین می‌رود.',
      ),
    ],
  ),
  section(
    'choices',
    tx('Your choices', 'اختیار شما'),
    [
      tx(
        `You can e-mail ${EMAIL} at any time to ask what Artaveo holds about you, to have it corrected or to have it deleted. Artaveo replies within a reasonable time.`,
        `هر وقت خواستید می‌توانید به ${EMAIL} ایمیل بزنید و بپرسید آرتاویو چه معلوماتی از شما دارد، یا بخواهید درست یا پاک شود. آرتاویو در مدت معقولی جواب می‌دهد.`,
      ),
    ],
  ),
  section(
    'children',
    tx('Children', 'کودکان'),
    [
      tx(
        'This site is not meant for children, and Artaveo does not knowingly collect personal details from anyone under 18.',
        'این سایت برای کودکان نیست و آرتاویو آگاهانه از هیچ کسی زیر ۱۸ سال معلومات شخصی جمع نمی‌کند.',
      ),
    ],
  ),
  section(
    'changes',
    tx('Changes to this page', 'تغییر این صفحه'),
    [
      tx(
        'This page is updated when the site changes; the date at the top always shows the latest version.',
        'هر وقت سایت تغییر کند، این صفحه هم به‌روز می‌شود؛ تاریخ بالای صفحه همیشه آخرین نسخه را نشان می‌دهد.',
      ),
    ],
  ),
]

const termsSections: LegalSection[] = [
  section(
    'scope',
    tx('What these terms cover', 'این شرایط درباره‌ی چیست'),
    [
      tx(
        "These terms cover the use of this website. A project you agree with Artaveo — its scope, price, payment, ownership, handover and support — is set out in that project's own written agreement.",
        'این شرایط فقط استفاده از این وب‌سایت را در بر می‌گیرد. پروژه‌ای که با آرتاویو توافق می‌کنید — کار آن، قیمت، پرداخت، مالکیت، تحویل و پشتیبانی — در قرارداد نوشته‌شده‌ی همان پروژه می‌آید.',
      ),
    ],
  ),
  section(
    'law',
    tx('Governing law', 'قانون حاکم'),
    [
      tx(
        `${siteConfig.name} works from Afghanistan, and these terms follow Afghan law. They do not take away any consumer rights the law of your own country gives you.`,
        `${siteConfig.name} از افغانستان کار می‌کند و این شرایط تابع قانون افغانستان است. این شرایط هیچ حقی را که قانون کشور خود شما به‌عنوان مصرف‌کننده به شما می‌دهد از شما نمی‌گیرد.`,
      ),
    ],
  ),
  section(
    'ip',
    tx('Intellectual property', 'مالکیت معنوی'),
    [
      tx(
        "The text, design and project write-ups on this site belong to Artaveo; please don't copy or republish them without permission. The projects shown on the site are Artaveo's own work, shown with their owners' approval.",
        'متن‌ها، طراحی و معرفی پروژه‌های این سایت مال آرتاویو است؛ لطفاً بدون اجازه آن‌ها را کاپی یا دوباره نشر نکنید. پروژه‌هایی که در سایت می‌بینید کار خود آرتاویو هستند و با تأیید صاحبان‌شان نشان داده می‌شوند.',
      ),
    ],
  ),
  section(
    'use',
    tx('Acceptable use', 'استفاده‌ی درست'),
    [
      tx(
        "Please don't try to break this site or its forms, copy it in bulk with automated tools, or send spam or automated junk through it.",
        'لطفاً نکوشید این سایت یا فورم‌های آن را از کار بیندازید، آن را با ابزارهای خودکار یک‌جا کاپی کنید یا از راه آن پیام ناخواسته و بی‌ارزش بفرستید.',
      ),
    ],
  ),
  section(
    'warranty',
    tx('No warranty on the website itself', 'تضمین خود وب‌سایت'),
    [
      tx(
        "The website is provided as it is, and Artaveo does not promise it will always be available. A project you agree with Artaveo is a different matter, covered by that project's own agreement.",
        'این وب‌سایت همان‌طور که هست در اختیار شما گذاشته می‌شود و آرتاویو تضمین نمی‌کند که همیشه در دسترس باشد. پروژه‌ای که با آرتاویو توافق می‌کنید جداست و قرارداد خودش را دارد.',
      ),
    ],
  ),
  section(
    'liability',
    tx('Liability', 'مسئولیت'),
    [
      tx(
        'As far as the law allows, Artaveo is not responsible for indirect or consequential loss arising from your use of this website. This covers the website only; before you sign a project agreement, it is worth having your own legal adviser read it.',
        'تا جایی که قانون اجازه می‌دهد، آرتاویو مسئول زیان غیرمستقیم یا پیامدی که از استفاده‌ی شما از این وب‌سایت پیش بیاید نیست. این حکم فقط درباره‌ی وب‌سایت است؛ پیش از امضای قرارداد یک پروژه، خوب است مشاور حقوقی خودتان آن را بخواند.',
      ),
    ],
  ),
  section(
    'changes',
    tx('Changes to these terms', 'تغییر این شرایط'),
    [
      tx(
        'These terms are updated when the site changes; the date at the top always shows the latest version.',
        'هر وقت سایت تغییر کند، این شرایط هم به‌روز می‌شود؛ تاریخ بالای صفحه همیشه آخرین نسخه را نشان می‌دهد.',
      ),
    ],
  ),
  section(
    'contact',
    tx('Contact', 'تماس'),
    [
      tx(
        `Questions about these terms? E-mail ${EMAIL}.`,
        `درباره‌ی این شرایط سؤالی دارید؟ به ${EMAIL} ایمیل بزنید.`,
      ),
    ],
  ),
]

/** Phase 31: the contact address is the one the owner set in the admin (`site_settings`), filled in where the texts say `{email}`. */
function withEmail(sections: LegalSection[], email: string): LegalSection[] {
  const fill = (text: LocalizedText): LocalizedText => ({ en: text.en.replaceAll(EMAIL, email), fa: text.fa.replaceAll(EMAIL, email) })
  return sections.map((item) => ({ ...item, paragraphs: item.paragraphs.map(fill), list: item.list?.map(fill) }))
}

export function getPrivacyPolicy(email: string = siteConfig.email): LegalDocument {
  return { lastUpdated: PRIVACY_LAST_UPDATED, sections: withEmail(privacySections, email) }
}

export function getTermsOfService(email: string = siteConfig.email): LegalDocument {
  return { lastUpdated: TERMS_LAST_UPDATED, sections: withEmail(termsSections, email) }
}
