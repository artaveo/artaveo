import { SectionHeader } from '@/components/home/section-header'
import { getProcessSteps } from '@/lib/home-content'
import { cn } from '@/lib/utils'
import { t } from '@/types/content'

export function Process() {
  const processSteps = getProcessSteps()

  return (
    <section aria-labelledby="process-title" className="section-y">
      <div className="container-page">
        <SectionHeader
          id="process-title"
          eyebrow="Process"
          title="A clear path from first call to launch"
          description="Seven defined stages, each with a visible result, so you always know where the project stands."
          action={{ href: '/process', label: 'See the full process' }}
        />

        {/* Vertical timeline below lg, single horizontal track from lg up. */}
        <ol className="grid gap-8 lg:grid-cols-7 lg:gap-6">
          {processSteps.map((step, index) => {
            const isFirst = index === 0
            const isLast = index === processSteps.length - 1
            return (
              <li key={step.id} className="relative ps-8 lg:ps-0 lg:pt-10">
                <span
                  aria-hidden
                  className={cn(
                    'absolute start-0 top-1 size-[11px] rounded-full lg:top-0',
                    isFirst ? 'bg-brand' : 'border-2 border-brand bg-background',
                  )}
                />
                {!isLast ? (
                  <span
                    aria-hidden
                    className="absolute start-[5px] top-5 -bottom-[31px] w-px bg-border lg:start-[15px] lg:-end-[20px] lg:top-[5px] lg:bottom-auto lg:h-px lg:w-auto"
                  />
                ) : null}

                <span className="font-mono text-xs text-brand-text">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-1 font-semibold tracking-tight">{t(step.title)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                  {t(step.description)}
                </p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
