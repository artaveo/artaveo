/**
 * Promoted to `components/ui/patterns.tsx` per roadmap § 4.4 ("Section
 * Header — promote the Home one to a shared pattern"). This file stays as
 * a re-export so the six Home sections that already import from here don't
 * need a mechanical path change in the same pass that changed the
 * implementation; point new call sites at `@/components/ui/patterns`
 * directly.
 */
export { SectionHeader } from '@/components/ui/patterns'
