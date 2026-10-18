import {
  AppWindow,
  ArrowRight,
  Globe,
  Laptop,
  LayoutDashboard,
  LifeBuoy,
  type LucideIcon,
  type LucideProps,
  Monitor,
  Package,
  Smartphone,
  TabletSmartphone,
  WifiOff,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ProjectPlatform, ServiceKind } from '@/types/content'

/**
 * Phase 28.5 — one icon per kind of software and per platform, so the mega
 * menu, the platforms strip, service cards and portfolio rows always show the
 * same picture for the same thing. Technology names never appear (§ 14.0
 * "Platforms Strip: no technology names").
 */
export const PLATFORM_ICONS: Record<ProjectPlatform, LucideIcon> = {
  web: Globe,
  android: Smartphone,
  ios: TabletSmartphone,
  windows: Monitor,
  mac: Laptop,
  offline: WifiOff,
}

export const SERVICE_KIND_ICONS: Record<ServiceKind, LucideIcon> = {
  website: Globe,
  'web-system': LayoutDashboard,
  'mobile-app': Smartphone,
  'desktop-software': Monitor,
  'offline-system': WifiOff,
  support: LifeBuoy,
  other: AppWindow,
}

export function ServiceKindIcon({ kind, ...props }: { kind?: ServiceKind } & LucideProps) {
  const Icon = (kind && SERVICE_KIND_ICONS[kind]) || Package
  return <Icon aria-hidden="true" {...props} />
}

/** "Forward" in reading order — points left on Dari pages (§ 4.1.3 mirroring list). */
export function ForwardArrow({ className, ...props }: LucideProps) {
  return <ArrowRight aria-hidden="true" className={cn('rtl:rotate-180', className)} {...props} />
}
