/**
 * Reads a request body as JSON with a hard size cap, for the two open reporting
 * endpoints. The cap is enforced on the bytes actually read, not on the
 * `Content-Length` header (which a client can omit or lie about). Returns
 * `undefined` for anything that is too large, not text, or not JSON — the caller
 * treats all three the same way: nothing to record.
 */
export async function readJsonBody(request: Request, maxBytes = 8 * 1024): Promise<unknown | undefined> {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) return undefined
  if (!request.body) return undefined

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        return undefined
      }
      chunks.push(value)
    }
  } catch {
    return undefined
  }

  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)))
  } catch {
    return undefined
  }
}
