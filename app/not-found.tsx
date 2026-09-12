import { ArtaveoMark } from '@/components/site/artaveo-mark'

/**
 * § 5.2: root-level fallback. `app/[locale]/not-found.tsx` handles the
 * normal case (a valid locale, an unmatched route beneath it) and is fully
 * translated. This one only fires when the dynamic `[locale]` segment
 * itself fails to match a real locale — at that point `next-intl`'s
 * request context was never established, so there's no locale to
 * translate into. Kept intentionally plain and neutral rather than
 * guessing a language.
 */
export default function RootNotFound() {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#fcfcfd] px-4 text-center font-sans text-[#333940]">
        <ArtaveoMark className="size-8" />
        <div>
          <p className="text-lg font-medium">Page not found</p>
          <p className="mt-1 text-sm text-[#333940]/70">
            The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.
          </p>
        </div>
        <a
          href="/en"
          className="rounded-md border border-[#333940]/20 px-4 py-2 text-sm font-medium transition-colors hover:bg-[#333940]/5"
        >
          Back to home
        </a>
      </body>
    </html>
  )
}
