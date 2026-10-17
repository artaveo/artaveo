/**
 * A `node:test` reporter that turns every failing test into a GitHub Actions error annotation
 * (file, the line of the failing assertion, test name and the first lines of the error). A red
 * CI run then says what failed on the run's summary page — job logs of this repository are
 * readable only by its admins, and the owner works from GitHub Desktop, not the log viewer.
 * Used in `.github/workflows/ci.yml` next to the normal `spec` reporter; locally it is never loaded.
 *
 * GitHub shows at most 10 error annotations per step, which is plenty to point at the cause.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Workflow-command escaping: a newline or "%" in the message must not end or corrupt the command.
const escapeData = (text) => String(text).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
const escapeProperty = (text) => escapeData(text).replace(/:/g, '%3A').replace(/,/g, '%2C')

// "    at Foo (file:///repo/tests/x.test.mjs:12:7)" or "    at file:///repo/tests/x.test.mjs:12:7"
const FRAME = /\(?((?:file:\/\/)?[^()\s]+?):(\d+):\d+\)?\s*$/

/** The line of the deepest stack frame that is inside the test file itself — the failing assertion. */
function assertionLine(stack, filePath) {
  if (typeof stack !== 'string' || !filePath) return null
  for (const frame of stack.split('\n')) {
    const m = frame.match(FRAME)
    if (!m) continue
    const framePath = m[1].startsWith('file:') ? fileURLToPath(m[1]) : m[1]
    if (path.resolve(framePath) === path.resolve(filePath)) return Number(m[2])
  }
  return null
}

export default async function* githubAnnotations(source) {
  for await (const event of source) {
    if (event.type !== 'test:fail') continue
    const { name, file, line, details } = event.data
    const error = details?.error
    // A suite "fails" because a test inside it did; that test has its own annotation.
    if (error?.failureType === 'subtestsFailed') continue
    const cause = error?.cause ?? error
    const message = String(cause?.message ?? cause ?? 'failed').split('\n').slice(0, 8).join('\n')
    const filePath = file ? (file.startsWith('file:') ? fileURLToPath(file) : file) : null
    const failedAt = assertionLine(cause?.stack, filePath) ?? line ?? 1
    const location = filePath
      ? `file=${escapeProperty(path.relative(process.cwd(), filePath).split(path.sep).join('/'))},line=${failedAt}`
      : ''
    yield `::error ${location}::${escapeData(`${name}: ${message}`)}\n`
  }
}
