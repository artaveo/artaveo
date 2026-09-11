import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { Check, ChevronRight } from 'lucide-react'
import type * as React from 'react'

import { cn } from '@/lib/utils'

const DropdownMenu = MenuPrimitive.Root
const DropdownMenuTrigger = MenuPrimitive.Trigger
const DropdownMenuGroup = MenuPrimitive.Group
const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup
const DropdownMenuSub = MenuPrimitive.SubmenuRoot

function DropdownMenuContent({
  className,
  children,
  sideOffset = 6,
  align = 'start',
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Popup> &
  Pick<React.ComponentProps<typeof MenuPrimitive.Positioner>, 'sideOffset' | 'align'>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner sideOffset={sideOffset} align={align} className="z-dropdown outline-none">
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            'min-w-40 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none',
            'origin-[var(--transform-origin)] transition-[transform,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            className,
          )}
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Item> & {
  inset?: boolean
  variant?: 'default' | 'destructive'
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        'flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground outline-none select-none',
        "[&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        'data-[highlighted]:bg-muted data-[highlighted]:text-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        inset && 'ps-8',
        variant === 'destructive' &&
          'text-destructive-text data-[highlighted]:bg-destructive/10 [&_svg]:text-destructive-text',
        className,
      )}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        'relative flex cursor-default items-center gap-2 rounded-md py-1.5 ps-8 pe-2 text-sm text-foreground outline-none select-none',
        'data-[highlighted]:bg-muted data-[highlighted]:text-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute start-2 flex size-3.5 items-center justify-center">
        <MenuPrimitive.CheckboxItemIndicator>
          <Check className="size-3.5" aria-hidden="true" />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.RadioItem>) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        'relative flex cursor-default items-center gap-2 rounded-md py-1.5 ps-8 pe-2 text-sm text-foreground outline-none select-none',
        'data-[highlighted]:bg-muted data-[highlighted]:text-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute start-2 flex size-3.5 items-center justify-center">
        <MenuPrimitive.RadioItemIndicator>
          <span className="block size-1.5 rounded-full bg-current" />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.GroupLabel> & { inset?: boolean }) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      className={cn('px-2 py-1.5 text-xs font-medium text-muted-foreground', inset && 'ps-8', className)}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  )
}

function DropdownMenuSubTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.SubmenuTrigger>) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-submenu-trigger"
      className={cn(
        'flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground outline-none select-none',
        'data-[highlighted]:bg-muted data-[highlighted]:text-foreground data-[popup-open]:bg-muted',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRight
        aria-hidden="true"
        className="ms-auto size-4 shrink-0 text-muted-foreground rtl:rotate-180"
      />
    </MenuPrimitive.SubmenuTrigger>
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
}
