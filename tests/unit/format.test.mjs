/**
 * Locale formatting (lib/format.ts). D-03: Persian pages use GREGORIAN dates
 * (a Phase 17 bug rendered Solar Hijri) and Persian digits in prose.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { formatCurrency, formatDate, formatNumber } from '../../lib/format.ts'

const PERSIAN_DIGITS = /[۰-۹]/
const LATIN_DIGITS = /[0-9]/
const UTC = { timeZone: 'UTC' }

describe('formatDate', () => {
  it('en: short US format', () => {
    assert.equal(formatDate('2026-09-10T12:00:00Z', 'en', UTC), 'Sep 10, 2026')
  })
  it('fa: Gregorian year in Persian digits — never the Solar Hijri year', () => {
    const out = formatDate('2026-09-10T12:00:00Z', 'fa', UTC)
    assert.ok(out.includes('۲۰۲۶'), `expected the Gregorian year ۲۰۲۶ in "${out}"`)
    assert.ok(!out.includes('۱۴۰۵') && !out.includes('۱۴۰۴'), `Solar Hijri year leaked into "${out}"`)
    assert.ok(!LATIN_DIGITS.test(out), `Latin digits in Persian output "${out}"`)
  })
  it('fa: Gregorian month names, not Persian-calendar month names', () => {
    const september = formatDate('2026-09-10T12:00:00Z', 'fa', { ...UTC, month: 'long' })
    assert.ok(!/شهریور|مهر/.test(september), `Solar Hijri month in "${september}"`)
  })
  it('the same instant lands on the same Gregorian day in both locales', () => {
    const day = (locale) => formatDate('2026-01-31T23:00:00Z', locale, { ...UTC, month: 'numeric' })
    assert.ok(/1/.test(day('en')))
    assert.ok(/۱/.test(day('fa')))
  })
  it('honours caller options', () => {
    assert.equal(formatDate('2026-09-10T12:00:00Z', 'en', { ...UTC, month: 'long', day: undefined }), 'September 2026')
  })
})

describe('formatNumber', () => {
  it('en uses Latin digits and comma grouping', () => {
    assert.equal(formatNumber(1234567, 'en'), '1,234,567')
  })
  it('fa uses Persian digits and no Latin digits', () => {
    const out = formatNumber(1234567, 'fa')
    assert.ok(PERSIAN_DIGITS.test(out))
    assert.ok(!LATIN_DIGITS.test(out))
    assert.equal(out.replace(/[^۰-۹]/g, ''), '۱۲۳۴۵۶۷')
  })
  it('zero and negatives', () => {
    assert.equal(formatNumber(0, 'en'), '0')
    assert.equal(formatNumber(-3, 'en'), '-3')
    assert.equal(formatNumber(0, 'fa').replace(/[^۰-۹]/g, ''), '۰')
  })
})

describe('formatCurrency', () => {
  it('en: whole dollars by default', () => {
    assert.equal(formatCurrency(1500, 'en', 'USD'), '$1,500')
  })
  it('fa: Persian digits, amount preserved', () => {
    const out = formatCurrency(1500, 'fa', 'USD')
    assert.equal(out.replace(/[^۰-۹]/g, ''), '۱۵۰۰')
    assert.ok(!LATIN_DIGITS.test(out))
  })
  it('options override the default fraction digits', () => {
    assert.equal(formatCurrency(12.5, 'en', 'USD', { maximumFractionDigits: 2, minimumFractionDigits: 2 }), '$12.50')
  })
})
