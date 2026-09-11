'use client'

import { Info, LogOut, Settings, SlidersHorizontal, User } from 'lucide-react'

import { Section, Subhead } from '@/components/showcase/section'
import { UsageNotes } from '@/components/showcase/usage-notes'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { IconButton } from '@/components/ui/actions'
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Toaster, ToastProvider, useToast } from '@/components/ui/toast'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

function ToastDemoButtons() {
  const toast = useToast()

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        onClick={() =>
          toast.add({
            title: 'Message sent',
            description: "I'll get back to you shortly.",
            type: 'success',
          })
        }
      >
        Show success toast
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.add({
            title: 'Something went wrong',
            description: 'Please try again in a moment.',
            type: 'destructive',
          })
        }
      >
        Show error toast
      </Button>
    </div>
  )
}

export function OverlaysSection() {
  return (
    <Section
      id="overlays"
      index="09 — Overlays"
      title="Dialogs, sheets &amp; floating surfaces"
      description="Every floating surface below shares the dropdown/overlay/modal z-index scale from §4.2 and the same rounded-lg + shadow-lg surface treatment."
      className="flex flex-col gap-10"
    >
      <div>
        <Subhead>Dialog &amp; sheet</Subhead>
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger render={<Button variant="outline">Open dialog</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start a project</DialogTitle>
                <DialogDescription>
                  Tell me a bit about what you&apos;re building — I&apos;ll follow up within a day.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost">Cancel</Button>
                <Button>Continue</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Sheet>
            <SheetTrigger render={<Button variant="outline">Open sheet</Button>} />
            <SheetContent side="end">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>Narrow down the work index by category and stack.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div>
        <Subhead>Popover, tooltip &amp; dropdown menu</Subhead>
        <div className="flex flex-wrap items-center gap-3">
          <Popover>
            <PopoverTrigger render={<IconButton aria-label="Filters" variant="outline"><SlidersHorizontal /></IconButton>} />
            <PopoverContent>
              <PopoverTitle>Quick filters</PopoverTitle>
              <PopoverDescription>Category and technology filters appear here once there are enough projects to need them.</PopoverDescription>
            </PopoverContent>
          </Popover>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<IconButton aria-label="Info" variant="ghost"><Info /></IconButton>} />
              <TooltipContent>Status badges reflect real project state</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline">Account</Button>} />
            <DropdownMenuContent>
              <DropdownMenuLabel>My account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div>
        <Subhead>Toast</Subhead>
        <ToastProvider>
          <ToastDemoButtons />
          <Toaster />
        </ToastProvider>
      </div>
      <UsageNotes
        dos={[
          "Use Dialog for content that blocks the page and Sheet/Drawer for a panel that slides in alongside it — they're not interchangeable.",
          'Let Toast auto-dismiss for confirmations; keep Dialog for anything that needs an explicit decision.',
        ]}
        donts={[
          "Don't build a custom modal with a raw fixed <div> — you'd have to reimplement focus trapping, Escape-to-close and scroll-lock, all already done here.",
          "Don't stack more than one Dialog at a time — nested overlays confuse both focus order and screen readers.",
        ]}
      />
    </Section>
  )
}
