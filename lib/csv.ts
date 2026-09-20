/**
 * CSV output that is safe to open in a spreadsheet (Phase 23).
 *
 * The inquiry export contains text strangers typed into a public form. A cell
 * that BEGINS with `=`, `+`, `-`, `@`, a tab or a carriage return is read by
 * Excel, LibreOffice and Google Sheets as a formula — `=HYPERLINK(...)` can
 * exfiltrate the sheet, `=cmd|...` has run programs through DDE. OWASP's
 * "CSV injection" guidance: prefix such a cell with a single quote so it is
 * text. One exception is kept on purpose: a value that is only digits and phone
 * punctuation (`+93 790 685 832`) cannot contain a function name, so it is left
 * alone — otherwise every international phone number would gain an apostrophe.
 */

const FORMULA_START = /^[=+\-@\t\r]/
const PLAIN_NUMBER_OR_PHONE = /^[+-]?[0-9][0-9 ().-]*$/

export function neutraliseFormula(value: string): string {
  if (!FORMULA_START.test(value)) return value
  if (PLAIN_NUMBER_OR_PHONE.test(value)) return value
  return `'${value}`
}

export function csvEscape(value: string): string {
  const safe = neutraliseFormula(value)
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`
  }
  return safe
}

export function toCsv(header: readonly string[], rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  const lines = [header.join(',')]
  for (const row of rows) {
    lines.push(row.map((value) => csvEscape(String(value ?? ''))).join(','))
  }
  return lines.join('\r\n')
}
