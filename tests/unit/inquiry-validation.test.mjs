/**
 * Brief Builder schema (lib/inquiry-validation.ts) — the one validation the
 * client AND the server run (`submitInquiry` re-validates, roadmap § 9.2).
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createEmptyInquiryDraft } from '../../types/inquiry.ts'
import { dataSteps, validateAllSteps, validateStep } from '../../lib/inquiry-validation.ts'

const valid = (extra = {}) => ({
  ...createEmptyInquiryDraft('en'),
  projectType: 'web-app-or-mvp',
  goal: 'Rebuild our booking system',
  timeline: '1-3-months',
  name: 'Ada Client',
  email: 'ada@example.com',
  consent: true,
  ...extra,
})

describe('validateStep — service', () => {
  it('is optional: an empty draft passes', () => {
    assert.deepEqual(validateStep('service', createEmptyInquiryDraft('en')), {})
  })
})

describe('validateStep — project', () => {
  it('requires a project type and a goal', () => {
    const errors = validateStep('project', createEmptyInquiryDraft('en'))
    assert.equal(errors.projectType, 'required')
    assert.equal(errors.goal, 'required')
  })
  it('treats a whitespace-only goal as missing', () => {
    assert.equal(validateStep('project', valid({ goal: '     ' })).goal, 'required')
  })
  it('a goal is "too short" up to 9 characters and fine at exactly 10 (after trimming)', () => {
    assert.equal(validateStep('project', valid({ goal: '123456789' })).goal, 'tooShort')
    assert.equal(validateStep('project', valid({ goal: '  123456789  ' })).goal, 'tooShort')
    assert.equal(validateStep('project', valid({ goal: '1234567890' })).goal, undefined)
  })
})

describe('validateStep — scope', () => {
  it('needs a note only when the "other" feature is ticked', () => {
    assert.deepEqual(validateStep('scope', valid({ featureTags: ['payments'] })), {})
    assert.equal(validateStep('scope', valid({ featureTags: ['other'], featureOtherNote: '  ' })).featureOtherNote, 'required')
    assert.deepEqual(validateStep('scope', valid({ featureTags: ['other'], featureOtherNote: 'SMS gateway' })), {})
  })
})

describe('validateStep — timeline', () => {
  it('requires a timeline; the budget band is never required', () => {
    assert.equal(validateStep('timeline', valid({ timeline: undefined })).timeline, 'required')
    assert.deepEqual(validateStep('timeline', valid({ budgetBand: undefined })), {})
  })
})

describe('validateStep — links', () => {
  const links = (...urls) => urls.map((url, i) => ({ id: String(i), url }))
  it('accepts http and https, and empty rows', () => {
    assert.deepEqual(validateStep('links', valid({ links: links('https://example.com', 'http://example.com/x?y=1', '', '   ') })), {})
  })
  it('rejects other schemes and non-URLs, keyed by row index', () => {
    const errors = validateStep('links', valid({ links: links('https://ok.example', 'javascript:alert(1)', 'ftp://example.com', 'not a url', 'example.com') }))
    assert.deepEqual(Object.keys(errors), ['link-1', 'link-2', 'link-3', 'link-4'])
    assert.ok(Object.values(errors).every((code) => code === 'invalidUrl'))
  })
})

describe('validateStep — contact', () => {
  it('requires name, e-mail and consent', () => {
    const errors = validateStep('contact', createEmptyInquiryDraft('en'))
    assert.deepEqual(Object.keys(errors).sort(), ['consent', 'email', 'name'])
  })
  it('e-mail: accepts ordinary addresses (trimmed), rejects malformed ones', () => {
    for (const email of ['a@b.co', '  ada@example.com  ', 'first.last+tag@sub.example.org']) {
      assert.equal(validateStep('contact', valid({ email })).email, undefined, email)
    }
    for (const email of ['ada', 'ada@', '@example.com', 'ada@example', 'a da@example.com', 'ada@exa mple.com']) {
      assert.equal(validateStep('contact', valid({ email })).email, 'invalidEmail', email)
    }
  })
  it('a phone number is required only for the WhatsApp channel', () => {
    assert.deepEqual(validateStep('contact', valid({ preferredChannel: 'email', phone: '' })), {})
    assert.equal(validateStep('contact', valid({ preferredChannel: 'whatsapp', phone: ' ' })).phone, 'required')
    assert.deepEqual(validateStep('contact', valid({ preferredChannel: 'whatsapp', phone: '+93 700 000 000' })), {})
  })
  it('consent must be exactly true', () => {
    assert.equal(validateStep('contact', valid({ consent: false })).consent, 'required')
  })
})

describe('validateAllSteps', () => {
  it('covers every data step, in order, and never the review step', () => {
    assert.deepEqual(dataSteps, ['service', 'project', 'scope', 'timeline', 'links', 'contact'])
  })
  it('accepts a complete draft', () => {
    assert.equal(validateAllSteps(valid()), true)
  })
  it('rejects an empty draft and a draft broken on any single step', () => {
    assert.equal(validateAllSteps(createEmptyInquiryDraft('en')), false)
    for (const broken of [
      { projectType: undefined },
      { goal: 'short' },
      { featureTags: ['other'], featureOtherNote: '' },
      { timeline: undefined },
      { links: [{ id: '1', url: 'javascript:1' }] },
      { email: 'nope' },
      { consent: false },
    ]) {
      assert.equal(validateAllSteps(valid(broken)), false, JSON.stringify(broken))
    }
  })
  it('the empty draft carries the visitor locale and sane defaults', () => {
    const draft = createEmptyInquiryDraft('fa')
    assert.equal(draft.preferredLocale, 'fa')
    assert.equal(draft.preferredChannel, 'email')
    assert.equal(draft.consent, false)
    assert.deepEqual([draft.links, draft.featureTags, draft.attachmentMediaIds], [[], [], []])
  })
})
