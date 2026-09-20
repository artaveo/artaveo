import type { AdminActionCode } from '@/types/consultation'

/** `Admin.<key>` for every way an owner action can fail — one mapping for all three forms. */
export function adminActionMessageKey(code: AdminActionCode): string {
  switch (code) {
    case 'forbidden':
      return 'errorForbidden'
    case 'not-configured':
      return 'consultationErrorNotConfigured'
    case 'not-found':
      return 'consultationErrorNotFound'
    case 'invalid-transition':
      return 'consultationErrorInvalidTransition'
    case 'conflict':
      return 'consultationErrorConflict'
    case 'invalid':
      return 'consultationErrorInvalid'
    case 'in-the-past':
      return 'consultationErrorInPast'
    case 'not-finished':
      return 'consultationErrorNotFinished'
    case 'invalid-timezone':
      return 'consultationErrorZone'
    case 'window-nonexistent':
      return 'consultationErrorNonexistent'
    default:
      return 'consultationErrorGeneric'
  }
}
