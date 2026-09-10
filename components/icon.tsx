import {
  AppWindow,
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
  Globe,
  Layers,
  type LucideProps,
  MessagesSquare,
  Palette,
  PanelsTopLeft,
  Radar,
  Rocket,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Workflow,
  Wrench,
  Zap,
} from 'lucide-react'

const registry = {
  AppWindow,
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
  Globe,
  Layers,
  MessagesSquare,
  Palette,
  PanelsTopLeft,
  Radar,
  Rocket,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Workflow,
  Wrench,
  Zap,
}

export type IconName = keyof typeof registry

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = registry[name as IconName] ?? Code
  return <Cmp {...props} />
}
