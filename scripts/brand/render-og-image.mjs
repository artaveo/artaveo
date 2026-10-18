/**
 * Phase 28.6 — renders public/brand/og-image.png, the share card every page
 * falls back to, from the corrected mark (lib/brand/mark-path.ts) in Design
 * System 2.0's ink and gold. It replaces the last asset still drawn from the
 * old placeholder trace (ROAD-MAP-ARTAVEO.md § 4.1.2 debt).
 *
 * Uses the same renderer as app/api/og/route.tsx (next/og: Satori + resvg),
 * so the static card and the per-page cards cannot drift apart.
 *
 *   node --import ./scripts/register-ts-resolve.mjs scripts/brand/render-og-image.mjs
 */
import { writeFile } from 'node:fs/promises'

import { ImageResponse } from 'next/dist/compiled/@vercel/og/index.node.js'

import { OG_SIZE, ogBrandCard } from '../../lib/brand/og-card.ts'

const response = new ImageResponse(ogBrandCard(), OG_SIZE)
const png = Buffer.from(await response.arrayBuffer())
if (png.readUInt32BE(16) !== OG_SIZE.width || png.readUInt32BE(20) !== OG_SIZE.height) throw new Error('unexpected image size')
await writeFile(new URL('../../public/brand/og-image.png', import.meta.url), png)
console.log(`public/brand/og-image.png — ${OG_SIZE.width}×${OG_SIZE.height}, ${Math.round(png.length / 1024)} KB`)
