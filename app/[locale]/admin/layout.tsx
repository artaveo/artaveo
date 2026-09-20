/**
 * Every admin page is rendered per request (Phase 23). Most already were — they
 * read the session cookie — but the sign-in and verification pages might not
 * have been, and the admin's Content Security Policy depends on it: its nonce is
 * generated per request (`proxy.ts`), so a page that was prerendered at build
 * time would carry no nonce and its scripts would be blocked. Stated once here so
 * a page cannot become static by accident.
 */
export const dynamic = 'force-dynamic'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
