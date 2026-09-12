import { CircleCheck, CircleDashed, Clock } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

import { Link as IntlLink } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Link } from '@/components/ui/actions'
import { socialLinks } from '@/lib/site'
import { t, type Availability, type DeveloperProfile, type Locale } from '@/types/content'
import { cn } from '@/lib/utils'

/**
 * Identity components (roadmap § 4.5). All six read from a single
 * `DeveloperProfile` (see `lib/home-content.ts#getDeveloperProfile`) so the
 * owner edits one object, not six. Every field here is optional-safe: a
 * missing portrait, name, or availability degrades gracefully instead of
 * breaking layout — none of it should ever be invented client-side.
 */

/* -------------------------------------------------------------------------
 * Identity Header
 * ---------------------------------------------------------------------- */

type IdentityHeaderProps = {
  profile: DeveloperProfile
  title: string
  locale?: Locale
  size?: 'default' | 'compact'
  className?: string
}

/** Name, title, and portrait slot. Falls back to initials when no portrait exists yet. */
function IdentityHeader({
  profile,
  title,
  locale = 'en',
  size = 'default',
  className,
}: IdentityHeaderProps) {
  const initial = profile.name?.trim().charAt(0).toUpperCase()
  const portraitSize = size === 'compact' ? 'size-12' : 'size-20'

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div
        className={cn(
          'relative shrink-0 overflow-hidden rounded-full border border-border bg-muted',
          portraitSize,
        )}
      >
        {profile.portrait ? (
          <Image
            src={profile.portrait}
            alt={profile.name ? `Portrait of ${profile.name}` : 'Portrait'}
            fill
            sizes={size === 'compact' ? '3rem' : '5rem'}
            className="object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-full items-center justify-center font-mono text-muted-foreground"
          >
            {initial ?? '·'}
          </div>
        )}
      </div>
      <div className="min-w-0">
        {profile.name ? (
          <p
            className={cn(
              'truncate font-semibold tracking-tight text-foreground',
              size === 'compact' ? 'text-sm' : 'text-lg',
            )}
          >
            {profile.name}
          </p>
        ) : null}
        <p
          className={cn(
            'truncate text-muted-foreground',
            size === 'compact' ? 'text-xs' : 'text-sm',
          )}
        >
          {title}
        </p>
        {profile.timezone ? (
          <p className="mt-0.5 font-mono text-[0.7rem] tracking-wide text-muted-foreground/70 uppercase">
            {profile.timezone}
          </p>
        ) : null}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------
 * Availability — chip, card, and the response-commitment note both read from
 * ---------------------------------------------------------------------- */

/**
 * Visual metadata only — labels now come from `Availability.<state>` in
 * `messages/*.json` (§ 5.2), read inside `AvailabilityChip` below. They
 * used to be hardcoded English here; that was fine while this component
 * only rendered inside the internal English-only design-system demo, but
 * § 5.2 wires it into the real, live `StickyMobileCta`, so it now needs
 * to read correctly in `fa` too.
 */
const availabilityMeta: Record<
  Availability['state'],
  { icon: typeof CircleCheck; tone: string; dot: string }
> = {
  available: {
    icon: CircleCheck,
    tone: 'text-success-text',
    dot: 'bg-success',
  },
  limited: {
    icon: Clock,
    tone: 'text-warning-text',
    dot: 'bg-warning',
  },
  unavailable: {
    icon: CircleDashed,
    tone: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
}

function formatUpdatedAt(iso: string, locale: Locale) {
  try {
    return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

/** Small pill for headers / next to a CTA. */
function AvailabilityChip({
  availability,
  className,
}: {
  availability: Availability
  className?: string
}) {
  const t = useTranslations('Availability')
  const meta = availabilityMeta[availability.state]
  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium',
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', meta.dot)} />
      <span className={meta.tone}>{t(availability.state)}</span>
    </span>
  )
}

/** Standalone response-commitment line — used inside `AvailabilityCard`, or on its own near a contact form. */
function ResponseCommitmentNote({
  commitment,
  locale = 'en',
  className,
}: {
  commitment: Availability['responseCommitment']
  locale?: Locale
  className?: string
}) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>{t(commitment, locale)}</p>
  )
}

/** Fuller card for About / Contact — state, last-updated date, and the response commitment together. */
function AvailabilityCard({
  availability,
  locale = 'en',
  className,
}: {
  availability: Availability
  locale?: Locale
  className?: string
}) {
  const t = useTranslations('Availability')
  const meta = availabilityMeta[availability.state]
  const Icon = meta.icon

  return (
    <div
      role="status"
      className={cn('rounded-xl border border-border bg-card p-5', className)}
    >
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className={cn('size-4 shrink-0', meta.tone)} />
        <p className="font-medium text-foreground">{t(availability.state)}</p>
      </div>
      <ResponseCommitmentNote
        commitment={availability.responseCommitment}
        locale={locale}
        className="mt-2"
      />
      <p className="mt-3 font-mono text-[0.7rem] tracking-wide text-muted-foreground/70 uppercase">
        {t('updatedLabel')} {formatUpdatedAt(availability.updatedAt, locale)}
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------
 * External Profile Links
 * ---------------------------------------------------------------------- */

/** Renders verified real profiles only (`lib/site.ts#socialLinks`, D-05) — never invent a link. */
function ExternalProfileLinks({
  links = socialLinks,
  className,
}: {
  links?: typeof socialLinks
  className?: string
}) {
  if (links.length === 0) return null

  return (
    <ul className={cn('flex flex-wrap items-center gap-x-5 gap-y-2', className)}>
      {links.map((link) => (
        <li key={link.href}>
          <Link href={link.href} variant="standalone">
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

/* -------------------------------------------------------------------------
 * Hire / Consultation CTA — one component, two intents
 * ---------------------------------------------------------------------- */

type IdentityCtaVariant = 'hire' | 'consultation'

const identityCtaStyle: Record<IdentityCtaVariant, { variant: 'default' | 'outline' }> = {
  hire: { variant: 'default' },
  consultation: { variant: 'outline' },
}

/**
 * Both variants point at `/contact` for now — the Discovery Sprint /
 * consultation booking path itself is wired in a later phase (§ 7, § 20).
 * Labels resolve from `Common` (`startProject` / `bookConsultation`) so
 * this reads correctly in both `en` and `fa` — closes the "IdentityCta
 * labels stay English" debt noted in the Phase 5.1 README now that § 5.2
 * wires this into the real shell instead of only the design-system demo.
 */
function IdentityCta({
  variant,
  href = '/contact',
  size = 'default',
  className,
}: {
  variant: IdentityCtaVariant
  href?: string
  size?: 'default' | 'lg'
  className?: string
}) {
  const tCommon = useTranslations('Common')
  const style = identityCtaStyle[variant]
  return (
    <Button
      variant={style.variant}
      size={size}
      className={className}
      render={<IntlLink href={href} />}
    >
      {variant === 'hire' ? tCommon('startProject') : tCommon('bookConsultation')}
    </Button>
  )
}

/* -------------------------------------------------------------------------
 * Sticky Mobile CTA
 * ---------------------------------------------------------------------- */

/**
 * Fixed bottom bar, mobile only. Wired into `SiteShell` (§ 5.2) on every
 * content page except Home (which already has the Hero's own CTAs above
 * the fold) and the internal `/design-system` tool. See
 * `components/site/site-shell.tsx` for the exact rule and the availability
 * data source.
 */
function StickyMobileCta({
  availability,
  className,
}: {
  availability?: Availability
  className?: string
}) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-sm [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))] md:hidden',
        className,
      )}
    >
      {availability ? (
        <AvailabilityChip availability={availability} className="min-w-0 border-none bg-transparent px-0" />
      ) : (
        <span />
      )}
      <IdentityCta variant="hire" className="shrink-0" />
    </div>
  )
}

export {
  IdentityHeader,
  AvailabilityChip,
  AvailabilityCard,
  ResponseCommitmentNote,
  ExternalProfileLinks,
  IdentityCta,
  StickyMobileCta,
}
