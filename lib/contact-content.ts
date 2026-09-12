import type { HireChannel, LocalizedText } from '@/types/content'
import { siteConfig, socialLinks } from '@/lib/site'

/**
 * Contact & hire-channel content (roadmap § 8.3, page map § 15 —
 * `/contact` = "Direct contact + hire channels").
 *
 * Same rules as `lib/about-content.ts`: only real, verifiable facts, no
 * invented figures. `getHireChannels()` is the Hire Channel Selector's data
 * source (component inventory § 14: "Direct vs via platform, with
 * trade-offs" — "Only real profiles").
 *
 * ## D-05 disclosure
 *
 * The Decision Register (§ 7) lists D-05 ("Hire channels and which
 * external profiles are real") as still open — not yet marked "Resolved"
 * with a date, unlike D-02/D-08/D-12. Per § 7 and § 20 ("check the
 * Decision Register; if a needed decision is missing, stop that part and
 * mark it BLOCKED"), an agent must not invent this answer.
 *
 * This phase does not invent it. It implements D-05's own
 * **recommended default** — "Direct + one platform profile (Fiverr) for
 * clients who want buyer protection; list only profiles that exist" —
 * which is *already the exact configuration live in `lib/site.ts`'s
 * `socialLinks`* (GitHub, LinkedIn, Fiverr, WhatsApp — real profiles only,
 * no invented platforms) since Phase 5.2. Phase 8.3 doesn't pick a new
 * strategy; it surfaces the strategy the site has already been shipping,
 * as the comparison the roadmap calls for. Same reasoning Phase 8.2 used
 * for D-13: ship the honest, already-approved mechanism, and still ask
 * the owner to record the decision formally in `docs/decisions.md` (which
 * does not exist yet — pre-existing gap, noted since Phase 3, not fixed
 * here) rather than silently treat it as settled.
 */

function tx(en: string, fa: string): LocalizedText {
  return { en, fa }
}

const emailHref = `mailto:${siteConfig.email}`
const whatsappHref = socialLinks.find((link) => link.label === 'WhatsApp')?.href ?? ''
const fiverrHref = socialLinks.find((link) => link.label === 'Fiverr')?.href ?? ''

/** Direct contact channels shown on `/contact` alongside the Hire Channel Selector. */
export type DirectContactChannel = {
  id: string
  icon: string
  label: LocalizedText
  value: string
  href: string
}

export function getDirectContactChannels(): DirectContactChannel[] {
  const channels: DirectContactChannel[] = []

  if (siteConfig.email) {
    channels.push({
      id: 'email',
      icon: 'Send',
      label: tx('Email', 'ایمیل'),
      value: siteConfig.email,
      href: emailHref,
    })
  }

  if (whatsappHref) {
    channels.push({
      id: 'whatsapp',
      icon: 'MessagesSquare',
      label: tx('WhatsApp', 'واتس‌اپ'),
      value: '+93 79 068 5832',
      href: whatsappHref,
    })
  }

  return channels
}

/**
 * Hire Channel Selector data (§ 8.3 / D-05 default). Two real channels only
 * — no third "via Contra/Toptal" option, since no such profile exists
 * (§ 16.5 "never invent"; `ExternalProfileLinks` only ever renders
 * `socialLinks`).
 */
export function getHireChannels(): HireChannel[] {
  const channels: HireChannel[] = []

  if (emailHref) {
    channels.push({
      id: 'direct',
      kind: 'direct',
      icon: 'Handshake',
      title: tx('Direct', 'مستقیم'),
      summary: tx(
        'Work with me directly by email or WhatsApp — no platform fee, no intermediary, and the fastest path to a scoped conversation.',
        'مستقیم از طریق ایمیل یا واتس‌اپ با من کار کن — بدون کارمزد پلتفرم، بدون واسطه، و سریع‌ترین راه برای شروع یک گفتگوی مشخص.',
      ),
      points: [
        tx('No platform fee — the full budget goes to the work', 'بدون کارمزد پلتفرم — کل بودجه صرف خود کار می‌شود'),
        tx(
          'Direct relationship: the Working Agreement (see Process) governs payment, ownership and warranty',
          'رابطه‌ی مستقیم: توافق‌نامه‌ی همکاری (نگاه کنید به صفحه‌ی فرآیند) پرداخت، مالکیت و ضمانت را مشخص می‌کند',
        ),
        tx(
          'No built-in escrow or buyer protection — suited to clients comfortable agreeing terms directly',
          'بدون سپرده‌ی امانی یا محافظت خریدار داخلی — مناسب مشتریانی که راحت‌اند شرایط را مستقیماً توافق کنند',
        ),
      ],
      href: emailHref,
      ctaLabel: tx('Email me', 'برایم ایمیل بزن'),
    })
  }

  if (fiverrHref) {
    channels.push({
      id: 'platform',
      kind: 'platform',
      icon: 'ShieldCheck',
      title: tx('Via Fiverr', 'از طریق Fiverr'),
      summary: tx(
        'Hire through my verified Fiverr profile when you want the platform’s buyer protection, escrow and dispute process.',
        'از طریق پروفایل تأییدشده‌ام در Fiverr استخدام کن، وقتی محافظت خریدار، سپرده‌ی امانی و فرایند رسیدگی به اختلاف پلتفرم را می‌خواهی.',
      ),
      points: [
        tx('Payment held in escrow and released on delivery', 'پرداخت در سپرده‌ی امانی نگه‌داری و پس از تحویل آزاد می‌شود'),
        tx('Platform-mediated dispute resolution, if ever needed', 'حل اختلاف با میانجی‌گری پلتفرم، در صورت نیاز'),
        tx(
          'Platform fees and terms apply, and the site itself stays the canonical source — the Fiverr profile links back here',
          'کارمزد و قوانین پلتفرم اعمال می‌شود، و خودِ وب‌سایت همچنان مرجع اصلی است — پروفایل Fiverr به همین‌جا لینک می‌دهد',
        ),
      ],
      href: fiverrHref,
      ctaLabel: tx('View Fiverr profile', 'مشاهده‌ی پروفایل Fiverr'),
    })
  }

  return channels
}
