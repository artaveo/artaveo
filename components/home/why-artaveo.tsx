import { Icon } from '@/components/icon'
import { SectionHeader } from '@/components/home/section-header'
import { Badge } from '@/components/ui/badge'
import { getDifferentiators, getWorkflowStages } from '@/lib/home-content'
import { t } from '@/types/content'

export function WhyArtaveo() {
  const differentiators = getDifferentiators()

  return (
    <section aria-labelledby="why-title" className="section-y">
      <div className="container-page">
        <SectionHeader
          id="why-title"
          eyebrow="Why Artaveo"
          title={
            <>
              One developer. One workflow.{' '}
              <span className="text-muted-foreground">The whole product.</span>
            </>
          }
          description="Artaveo is not an agency with layers of handoffs. The same person carries a project from the first idea to production — so the architecture, the interface and the code stay consistent."
        />

        <WorkflowChain />

        <ul className="mt-16 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3">
          {differentiators.map((item) => (
            <li key={item.title.en} className="border-t border-border pt-6">
              <Icon
                name={item.icon}
                aria-hidden
                className="size-5 text-brand-text"
              />
              <h3 className="mt-4 font-semibold tracking-tight">{t(item.title)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                {t(item.description)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/**
 * Idea → … → Deployment. Vertical on small screens, a single horizontal
 * track on large screens. Node centres sit at (2k + 1) / 14 of the width,
 * so the connecting line runs from 1/14 to 13/14 — correct in LTR and RTL.
 */
function WorkflowChain() {
  const workflowStages = getWorkflowStages()

  return (
    <div className="rounded-xl border border-border bg-card p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 lg:mb-8">
        <p className="text-sm font-medium">From idea to deployment</p>
        <Badge variant="brand-soft">Handled by one developer</Badge>
      </div>

      <ol className="relative flex flex-col before:absolute before:start-[5px] before:top-4 before:bottom-4 before:w-px before:bg-border lg:flex-row lg:before:start-[calc(100%/14)] lg:before:end-[calc(100%/14)] lg:before:top-[5px] lg:before:bottom-auto lg:before:h-px lg:before:w-auto">
        {workflowStages.map((stage, index) => {
          const isEdge = index === 0 || index === workflowStages.length - 1
          return (
            <li
              key={stage.en}
              className="relative flex items-center gap-4 py-2.5 lg:flex-1 lg:flex-col lg:gap-4 lg:py-0"
            >
              <span
                aria-hidden
                className={
                  isEdge
                    ? 'relative size-[11px] shrink-0 rounded-full bg-brand'
                    : 'relative size-[11px] shrink-0 rounded-full border-2 border-brand bg-card'
                }
              />
              <span className="text-sm font-medium lg:text-center">{t(stage)}</span>
            </li>
          )
        })}
      </ol>

      <div
        aria-hidden
        className="mx-[calc(100%/14)] mt-6 hidden h-3 rounded-b-md border-x border-b border-brand/40 lg:block"
      />
      <p className="mt-6 text-sm text-muted-foreground text-pretty lg:mt-3 lg:text-center">
        No handoffs between designers, frontend and backend teams — every
        decision is made with the whole system in view.
      </p>
    </div>
  )
}
