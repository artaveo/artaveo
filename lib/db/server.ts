import 'server-only'
import { PostgrestClient } from '@supabase/postgrest-js'

import { serviceToken, serviceTokenConfigured } from './service-token'
import { createStorageClient, storageConfigFromEnv, type StorageClient } from './storage'
import { currentRequestId } from '@/lib/observability/context'
import { REQUEST_ID_HEADER } from '@/lib/observability/request-id'

/**
 * Server-only database client (roadmap § 9.2), on Neon since October 2026.
 *
 * Queries go through the Neon Data API — a PostgREST-compatible REST endpoint —
 * with the same query builder the app used against Supabase
 * (`@supabase/postgrest-js` is only the PostgREST client library; nothing in it
 * talks to Supabase the service). Each request carries the server's own
 * short-lived `service_role` JWT (`./service-token.ts`), so like the Supabase
 * service-role key it bypasses RLS: § 9.2 requires "inserts only through the
 * server", and there is no public insert policy anywhere. `.storage` is Neon
 * Object Storage behind the same small API (`./storage.ts`).
 *
 * The `server-only` import makes it a build error to ever import this from a
 * Client Component, so neither the signing key nor the storage secret can end
 * up in a browser bundle.
 *
 * Returns `null` when the Data API URL or the signing key is missing, so callers
 * can surface the honest "not configured" state (§ 2 principle 15: never fake
 * success, but also never crash the page over missing configuration).
 */
type Postgrest = PostgrestClient

export type DbClient = {
  from: Postgrest['from']
  rpc: Postgrest['rpc']
  storage: StorageClient
}

let cached: DbClient | null | undefined

/**
 * Phase 24: every request this client makes carries the id of the request that
 * caused it (`x-request-id`), when one is bound (`lib/observability/context.ts`).
 * It reads the id from an AsyncLocalStorage and never from `headers()`: this
 * client is also used while prerendering, and `headers()` there would make the
 * page dynamic.
 */
const authorizedFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${await serviceToken()}`)
  const requestId = currentRequestId()
  if (requestId) headers.set(REQUEST_ID_HEADER, requestId)
  return fetch(input, { ...init, headers })
}

const storageNotConfigured: StorageClient = {
  from() {
    const error = new Error('Object storage is not configured (NEON_STORAGE_ENDPOINT / NEON_STORAGE_ACCESS_KEY_ID / NEON_STORAGE_SECRET_ACCESS_KEY).')
    const fail = async () => ({ data: null, error })
    return {
      upload: fail,
      remove: fail,
      createSignedUrl: fail,
      list: fail,
      download: fail,
      getPublicUrl: () => {
        throw error
      },
    }
  },
}

export function getDbClient(): DbClient | null {
  if (cached !== undefined) {
    return cached
  }

  const url = process.env.NEON_DATA_API_URL
  if (!url || !serviceTokenConfigured()) {
    cached = null
    return cached
  }

  const postgrest: Postgrest = new PostgrestClient(url.replace(/\/+$/, ''), { fetch: authorizedFetch })
  const storageConfig = storageConfigFromEnv()

  cached = {
    from: postgrest.from.bind(postgrest),
    rpc: postgrest.rpc.bind(postgrest),
    storage: storageConfig ? createStorageClient(storageConfig) : storageNotConfigured,
  }
  return cached
}
