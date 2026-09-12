import { Skeleton } from '@/components/ui/data-display'
import { LoadingState } from '@/components/ui/states'

/**
 * § 5.2: "loading … per locale, designed (not default)". Deliberately NOT
 * translated via `next-intl`, despite the roadmap wording — verified by
 * build: `loading.tsx` does not receive `params` in this Next.js version
 * (confirmed by testing — `params` arrives `undefined`), and calling
 * `next-intl/server`'s `getTranslations()`/`getLocale()` without an
 * explicit locale pulls in a request-scoped API that forces the *entire*
 * `/en` and `/fa` routes to stop being statically generated (`●` SSG
 * became `ƒ` dynamic in `next build`'s route table — confirmed by
 * removing this file and rebuilding). Losing static generation for every
 * page to translate a screen that a fully static site almost never shows
 * is the wrong trade. Kept shell-free (no header/footer) for the same
 * reason `error.tsx` is: this replaces `<SiteShell>`'s own content while
 * still resolving, so a header here would just duplicate once the real
 * page mounts. Revisit once real dynamic routes exist (§ 6+, case studies)
 * and this screen is actually likely to be seen.
 */
export default function LocaleLoading() {
  return (
    <LoadingState label="Loading…" className="min-h-screen">
      <div className="container-page flex min-h-screen flex-col justify-center gap-6 py-24">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full max-w-xl" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    </LoadingState>
  )
}
