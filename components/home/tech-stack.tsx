import { Icon } from '@/components/icon'
import { SectionHeader } from '@/components/home/section-header'
import { Badge } from '@/components/ui/badge'
import { getTechStack } from '@/lib/home-content'
import { t } from '@/types/content'

/**
 * Proof-Linked Expertise Matrix (roadmap § 4.5/4.6, Contra B-03), layout
 * pass only — replaces the old plain divided-list "Tech Stack" block with
 * a denser matrix of skill chips grouped by category. The evidence-count
 * wiring itself ("shown only if linked to ≥ 1 project/service/article")
 * is Phase 7–8 data work; nothing here invents a count or a link, since
 * that proof doesn't exist as structured data yet — the honest, currently
 * true statement below (case studies further down this page) stands in
 * for it until then.
 */
export function TechStack() {
  const techStack = getTechStack()

  return (
    <section
      aria-labelledby="stack-title"
      className="border-y border-border bg-elevated section-y"
    >
      <div className="container-page">
        <SectionHeader
          id="stack-title"
          eyebrow="Expertise"
          title="A focused, modern stack"
          description="Proven tools chosen for type safety, performance and long-term maintainability. Every one of them is used in the real work further down this page."
        />

        <div className="overflow-hidden rounded-xl border border-border">
          {techStack.map((category, index) => (
            <div
              key={category.id}
              className={
                'flex flex-col gap-4 bg-card p-6 sm:flex-row sm:items-baseline sm:gap-8 md:p-8' +
                (index > 0 ? ' border-t border-border' : '')
              }
            >
              <h3 className="flex shrink-0 items-center gap-2.5 text-sm font-semibold sm:w-40">
                <Icon
                  name={category.icon}
                  aria-hidden
                  className="size-4 text-brand-text"
                />
                {t(category.title)}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {category.items.map((item) => (
                  <li key={item}>
                    <Badge variant="outline" className="py-1 text-[0.8rem] font-normal">
                      {item}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
