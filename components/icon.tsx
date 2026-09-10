import {
  Blocks,
  Boxes,
  Braces,
  Cloud,
  Code,
  Compass,
  Component,
  Database,
  Gauge,
  GitBranch,
  type LucideProps,
  Palette,
  Radar,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from 'lucide-react'

const registry = {
  Blocks,
  Boxes,
  Braces,
  Cloud,
  Code,
  Compass,
  Component,
  Database,
  Gauge,
  GitBranch,
  Palette,
  Radar,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
}

export type IconName = keyof typeof registry

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = registry[name as IconName] ?? Code
  return <Cmp {...props} />
}
