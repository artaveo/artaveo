import { localSearchProvider } from '@/lib/search/local-provider'
import type { SearchProvider } from '@/lib/search/types'

/**
 * The provider the palette uses. To move search to the server later, write
 * a `SearchProvider` that calls `GET /api/search?q=…&locale=…` (returning the
 * same `SearchResponse`) and change the one line below — no component knows
 * which implementation it is talking to.
 */
export const searchProvider: SearchProvider = localSearchProvider
