import { PROJECT_TYPE_IDS, type InquiryDraft, type ProductRequestDraft, type StepId } from '@/types/inquiry'

/**
 * Brief Builder validation (roadmap § 9.1, "per-step validation"). Plain
 * functions rather than a schema library — the Brief Builder is the only
 * consumer today and § 9.2's server-side re-validation (its own
 * requirement: "server re-validates everything") is a separate, later
 * implementation against the real insert path, not this file. No new
 * dependency added for a single form (§ 20, "don't add dependencies
 * without a reason").
 */

export type StepErrors = Record<string, string>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Validates one step against the current draft. Returns an empty object
 * when the step is valid. Field keys match the input `name`s the step
 * component uses, so `FieldError` can be attached directly.
 */
export function validateStep(step: StepId, draft: InquiryDraft): StepErrors {
  const errors: StepErrors = {}

  switch (step) {
    case 'service':
      // Entirely optional — a visitor may not know yet which service fits.
      break

    case 'project':
      if (!draft.projectType) {
        errors.projectType = 'required'
      } else if (!PROJECT_TYPE_IDS.includes(draft.projectType)) {
        // Phase 27.5: a closed set — the server sees whatever a client sends.
        errors.projectType = 'required'
      } else if (draft.projectType === 'buy-product' && !draft.productSlug) {
        errors.productSlug = 'required'
      }
      if (!draft.goal.trim()) {
        errors.goal = 'required'
      } else if (draft.goal.trim().length < 10) {
        errors.goal = 'tooShort'
      }
      break

    case 'scope':
      if (draft.featureTags.includes('other') && !draft.featureOtherNote.trim()) {
        errors.featureOtherNote = 'required'
      }
      break

    case 'timeline':
      if (!draft.timeline) {
        errors.timeline = 'required'
      }
      // Budget band is optional per § 9.1 spec — never required here.
      break

    case 'links':
      draft.links.forEach((link, index) => {
        if (link.url.trim() && !isValidUrl(link.url.trim())) {
          errors[`link-${index}`] = 'invalidUrl'
        }
      })
      break

    case 'contact':
      if (!draft.name.trim()) {
        errors.name = 'required'
      }
      if (!draft.email.trim()) {
        errors.email = 'required'
      } else if (!EMAIL_PATTERN.test(draft.email.trim())) {
        errors.email = 'invalidEmail'
      }
      if (draft.preferredChannel === 'whatsapp' && !draft.phone.trim()) {
        errors.phone = 'required'
      }
      if (!draft.consent) {
        errors.consent = 'required'
      }
      break

    case 'review':
      break

    default:
      break
  }

  return errors
}

/** Every data-entry step, in build/spec order — the `review` step is validated implicitly by the others already passing. */
export const dataSteps: StepId[] = ['service', 'project', 'scope', 'timeline', 'links', 'contact']

export function validateAllSteps(draft: InquiryDraft): boolean {
  return dataSteps.every((step) => Object.keys(validateStep(step, draft)).length === 0)
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Phase 27.5 — a product purchase or demo request. Same contact rules as the
 * Brief Builder's contact step; the product must be named; the message is
 * optional but capped. Whether the product, option and services exist and are
 * published is checked against the database by the action, not here.
 */
export function validateProductRequest(draft: ProductRequestDraft): StepErrors {
  const errors: StepErrors = {}
  if (!draft || typeof draft !== 'object') return { form: 'required' }
  if (draft.kind !== 'product-purchase' && draft.kind !== 'product-demo') errors.kind = 'required'
  if (typeof draft.productSlug !== 'string' || !SLUG.test(draft.productSlug)) errors.productSlug = 'required'
  if (draft.saleOptionId !== undefined && (typeof draft.saleOptionId !== 'string' || !UUID.test(draft.saleOptionId))) errors.saleOptionId = 'invalid'
  if (!Array.isArray(draft.productServiceIds) || draft.productServiceIds.length > 20 || draft.productServiceIds.some((id) => typeof id !== 'string' || !UUID.test(id))) {
    errors.productServiceIds = 'invalid'
  }
  if (typeof draft.message !== 'string' || draft.message.length > 4000) errors.message = 'tooLong'
  if (typeof draft.name !== 'string' || !draft.name.trim()) errors.name = 'required'
  if (typeof draft.email !== 'string' || !draft.email.trim()) errors.email = 'required'
  else if (!EMAIL_PATTERN.test(draft.email.trim())) errors.email = 'invalidEmail'
  if (typeof draft.phone !== 'string') errors.phone = 'required'
  else if (draft.preferredChannel === 'whatsapp' && !draft.phone.trim()) errors.phone = 'required'
  if (draft.preferredChannel !== 'email' && draft.preferredChannel !== 'whatsapp') errors.preferredChannel = 'required'
  if (draft.preferredLocale !== 'en' && draft.preferredLocale !== 'fa') errors.preferredLocale = 'required'
  if (draft.consent !== true) errors.consent = 'required'
  return errors
}
