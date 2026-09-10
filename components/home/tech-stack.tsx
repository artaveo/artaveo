import { Icon } from '@/components/icon'
import { SectionHeader } from '@/components/home/section-header'
import { getTechStack } from '@/lib/home-content'
import { t } from '@/types/content'

export function TechStack() {
  const techStack = getTechStack()

  return (
    <section
      aria-labelledby="stack-title"
      className="border-y border-border bg-elevated py-20 md:py-28"
    >
      <div className="container-page">
        <SectionHeader
          id="stack-title"
          eyebrow="Technology"
          title="A focused, modern stack"
          description="Proven tools chosen for type safety, performance and long-term maintainability. The stack follows the project — not the other way around."
        />

        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {techStack.map((category) => (
            <div key={category.id} className="bg-card p-6">
              <h3 className="flex items-center gap-2.5 text-sm font-semibold">
                <Icon
                  name={category.icon}
                  aria-hidden
                  className="size-4 text-brand"
                />
                {t(category.title)}
              </h3>
              <ul className="mt-5 divide-y divide-border border-t border-border">
                {category.items.map((item) => (
                  <li
                    key={item}
                    className="py-2.5 text-sm text-foreground/85"
                  >
                    {item}
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
