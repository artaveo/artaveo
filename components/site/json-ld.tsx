/**
 * Renders one JSON-LD `<script>` tag. `</script>` (and the less-common
 * `<!--` opener) are escaped inside the JSON string so a value containing
 * either sequence can never break out of the script tag — none of our
 * content is user-supplied HTML, but this costs nothing and removes the
 * concern entirely.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return (
    // eslint-disable-next-line react/no-danger
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  )
}
