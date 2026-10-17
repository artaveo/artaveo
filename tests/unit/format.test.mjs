/**
 * Locale formatting (lib/format.ts). D-03 (revision 45): the Dari site uses the
 * SOLAR HIJRI calendar with AFGHAN month names (حمل … حوت, never the Iranian
 * فروردین … اسفند) and Persian digits; the English site uses Gregorian.
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
  it('fa: Solar Hijri date with the Afghan month name, in Persian digits', () => {
    assert.equal(formatDate('2026-10-17T12:00:00Z', 'fa', UTC), '۲۵ میزان ۱۴۰۵')
    const out = formatDate('2026-09-10T12:00:00Z', 'fa', UTC)
    assert.ok(!out.includes('۲۰۲۶'), `Gregorian year leaked into "${out}"`)
    assert.ok(!LATIN_DIGITS.test(out), `Latin digits in Persian output "${out}"`)
  })
  it('fa: all twelve months are the Afghan names, and «سنبله» carries no ezafe mark', () => {
    const AFGHAN = ['حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله', 'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت']
    // The 10th of each Solar Hijri month, 1405 (Hamal 1 = 21 March 2026).
    const tenth = [30, 30, 31, 32, 32, 32, 31, 30, 30, 30, 30, 30].reduce((acc, _len, i) => {
      const prev = i === 0 ? Date.UTC(2026, 2, 30) : acc[i - 1] + [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29][i - 1] * 86_400_000
      acc.push(prev)
      return acc
    }, [])
    tenth.forEach((ms, i) => {
      const month = formatDate(new Date(ms).toISOString(), 'fa', { ...UTC, day: undefined, year: undefined, month: 'long' })
      assert.equal(month, AFGHAN[i])
    })
    assert.ok(!formatDate('2026-09-10T12:00:00Z', 'fa', { ...UTC, month: 'long' }).includes('ٔ'))
  })
  it('fa: never the Iranian month names or the Gregorian ones', () => {
    const IRANIAN = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
    for (const iso of ['2026-04-10T12:00:00Z', '2026-09-10T12:00:00Z', '2027-01-10T12:00:00Z']) {
      const month = formatDate(iso, 'fa', { ...UTC, day: undefined, year: undefined, month: 'long' })
      assert.ok(!IRANIAN.includes(month), `Iranian month "${month}"`)
      assert.ok(!/سپتامبر|ژانویه|آوریل/.test(month), `Gregorian month "${month}"`)
    }
  })
  it('fa: Dari order — weekday, day, month, year, then the time after «، » (no Latin comma)', () => {
    assert.equal(
      formatDate('2026-09-24T10:00:00Z', 'fa', { ...UTC, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      'پنجشنبه ۲ میزان ۱۴۰۵',
    )
    assert.equal(formatDate('2026-09-24T10:00:00Z', 'fa', { ...UTC, hour: 'numeric', minute: 'numeric' }), '۲ میزان ۱۴۰۵، ۱۰:۰۰')
    assert.equal(formatDate('2026-09-10T12:00:00Z', 'fa', { ...UTC, month: 'long', day: undefined }), 'سنبله ۱۴۰۵')
  })
  it('the same instant lands on the same day in both locales', () => {
    assert.equal(formatDate('2026-01-31T23:00:00Z', 'en', { ...UTC, month: 'numeric' }), '1/31/2026')
    assert.equal(formatDate('2026-01-31T23:00:00Z', 'fa', { ...UTC, month: 'numeric' }), '۱۴۰۴/۱۱/۱۱')
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
  it('fa: Afghani and dollars are written as words after the amount (D-21)', () => {
    assert.equal(formatCurrency(15000, 'fa', 'AFN'), '۱۵٬۰۰۰ افغانی')
    assert.equal(formatCurrency(1500, 'fa', 'USD'), '۱٬۵۰۰ دالر')
    assert.ok(!LATIN_DIGITS.test(formatCurrency(1500, 'fa', 'EUR')))
  })
  it('en keeps the currency symbol or code', () => {
    assert.match(formatCurrency(15000, 'en', 'AFN'), /^AFN\s15,000$/)
  })
  it('options override the default fraction digits', () => {
    assert.equal(formatCurrency(12.5, 'en', 'USD', { maximumFractionDigits: 2, minimumFractionDigits: 2 }), '$12.50')
  })
})
