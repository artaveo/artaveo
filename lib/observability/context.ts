import 'server-only'
import { AsyncLocalStorage } from 'node:async_hooks'
import { headers } from 'next/headers'
import { unstable_rethrow } from 'next/navigation'

import { requestIdFrom } from '@/lib/observability/request-id'

/**
 * Per-request context for server code that is not handed a request: the
 * logger, the database client's outgoing header, the notification writer.
 *
 * Two ways to have an id, on purpose:
 *
 *  - `runWithRequestId(id, fn)` — for code that OWNS its entry point (a route
 *    handler, the cron run, `instrumentation`'s error hook). Everything called
 *    inside `fn`, however deep and however many awaits later, sees the id.
 *
 *  - `getRequestId()` — for code that runs inside a Server Action or a route
 *    handler and needs the id once (an insert, an audit row): it reads the
 *    `x-request-id` header `proxy.ts` set.
 *
 * WHY THE LOGGER DOES NOT CALL `headers()` ITSELF. Reading request headers
 * opts a route out of static rendering. The logger and the database client are
 * used by prerendered pages too (`generateStaticParams`, the content queries), so
 * a `headers()` call inside them would make the public site dynamic — or throw
 * during the build. `getRequestId()` is therefore for dynamic entry points only;
 * a test (`tests/unit/observability-static.test.mjs`) pins where it may be called.
 */

type Store = { requestId: string }

const storage = new AsyncLocalStorage<Store>()

export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  return storage.run({ requestId }, fn)
}

/** The id bound by `runWithRequestId`, if any. Synchronous and safe anywhere — including prerendering. */
export function currentRequestId(): string | undefined {
  return storage.getStore()?.requestId
}

/**
 * Binds the id for the REST OF THE CURRENT ASYNC CALL CHAIN — for a Server Action
 * that cannot be wrapped in `runWithRequestId` (its body is the reviewed unit, see
 * `tests/unit/security-static.test.mjs`). Call it as the first statement of the
 * exported action, in the action's own frame — never from a helper that has already
 * awaited, whose binding would not reach its caller:
 *
 *     export async function submitInquiry(...) {
 *       bindRequestId(await getRequestId())
 *
 * A request handler is its own async resource in Node, so the binding lasts for
 * that request only. `undefined` (no header, e.g. a script) binds nothing.
 */
export function bindRequestId(requestId: string | undefined): void {
  if (requestId) storage.enterWith({ requestId })
}

/**
 * The id of the request being handled. Only for dynamic contexts (Server
 * Actions, route handlers, the cron run) — see the note above. Returns
 * `undefined` when there is none (a script, a test without headers) instead of
 * inventing one: an id that no other record carries is worse than no id.
 */
export async function getRequestId(): Promise<string | undefined> {
  const bound = currentRequestId()
  if (bound) return bound
  try {
    const h = await headers()
    return requestIdFrom((name) => h.get(name))
  } catch (err) {
    // Next signals "this page is dynamic" and "redirect" by throwing; swallowing that would break them.
    unstable_rethrow(err)
    return undefined
  }
}

/*
 * Route handlers under `/api` are outside `proxy.ts`'s matcher, so nothing has
 * overwritten a client-supplied `x-request-id` there. They make their own id —
 * `runWithRequestId(newRequestId(), …)` — and never read the incoming header:
 * anyone could send the id of somebody else's request and have their own
 * activity filed under it.
 */
