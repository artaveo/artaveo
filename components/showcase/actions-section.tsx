import { Bold, Copy, Italic, Underline } from 'lucide-react'

import { Section, Subhead } from '@/components/showcase/section'
import { ButtonGroup, ButtonGroupSeparator, IconButton, Kbd, Link } from '@/components/ui/actions'

export function ActionsSection() {
  return (
    <Section
      id="actions"
      index="07 — Actions"
      title="Links, icon buttons &amp; grouping"
      description="Beyond the Button primitive: inline and standalone links, icon-only buttons, joined button groups, and keyboard-shortcut labels."
      className="flex flex-col gap-10"
    >
      <div>
        <Subhead>Links</Subhead>
        <div className="flex flex-col gap-3 text-sm">
          <p className="max-w-md text-muted-foreground">
            An inline link sits inside a sentence, like{' '}
            <Link href="/work">this one pointing to the work page</Link>.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/contact" variant="standalone">
              Start a project
            </Link>
            <Link href="https://github.com/artaveo" variant="standalone">
              View on GitHub
            </Link>
          </div>
        </div>
      </div>

      <div>
        <Subhead>Icon buttons</Subhead>
        <div className="flex flex-wrap items-center gap-3">
          <IconButton aria-label="Copy" variant="outline">
            <Copy />
          </IconButton>
          <IconButton aria-label="Copy" variant="secondary" size="sm">
            <Copy />
          </IconButton>
          <IconButton aria-label="Copy" variant="ghost" size="xs">
            <Copy />
          </IconButton>
          <IconButton aria-label="Copy" disabled>
            <Copy />
          </IconButton>
        </div>
      </div>

      <div>
        <Subhead>Button group</Subhead>
        <ButtonGroup>
          <IconButton aria-label="Bold" variant="outline">
            <Bold />
          </IconButton>
          <IconButton aria-label="Italic" variant="outline">
            <Italic />
          </IconButton>
          <ButtonGroupSeparator />
          <IconButton aria-label="Underline" variant="outline">
            <Underline />
          </IconButton>
        </ButtonGroup>
      </div>

      <div>
        <Subhead>Keyboard shortcut</Subhead>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>Open the command palette with</span>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </div>
      </div>
    </Section>
  )
}
