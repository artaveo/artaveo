Phase 4.3 (a+b+c) — Missing Primitives
========================================

این زیپ همه‌ی فایل‌های تغییریافته/جدید فازهای 4.3a + 4.3b + 4.3c رو داره.
ساختار پوشه‌ها دقیقاً مثل ریشه‌ی ریپو آرتاوئو هست.

نحوه‌ی جاگذاری:
1. محتوای این زیپ رو extract کن.
2. کل پوشه‌های app/ و components/ و docs/ رو روی ریشه‌ی ریپوی artaveo بریز و
   جایگزین (overwrite) کن — همه‌ی فایل‌ها یا کاملاً جدیدن یا فقط اضافه‌شده
   (هیچ فایل موجودی به‌صورت مخرب تغییر نکرده، فقط 3 فایل زیر ویرایش شدن):
   - app/design-system/page.tsx
   - components/showcase/showcase-header.tsx
   - docs/phases/PHASE-4-README.md
3. npm install (یا pnpm install) رو دوباره بزن — پکیج @base-ui/react از قبل
   تو package.json هست، چیز جدیدی اضافه نشده.

فایل‌های جدید (primitives):
  components/ui/actions.tsx          — Link, IconButton, ButtonGroup, Kbd
  components/ui/form-controls.tsx    — Field, FormMessage, Checkbox, RadioGroup, Switch
  components/ui/select.tsx
  components/ui/segmented-control.tsx
  components/ui/file-input.tsx
  components/ui/dialog.tsx
  components/ui/sheet.tsx
  components/ui/popover.tsx
  components/ui/tooltip.tsx
  components/ui/dropdown-menu.tsx
  components/ui/toast.tsx
  components/ui/tabs.tsx
  components/ui/accordion.tsx
  components/ui/data-display.tsx     — Progress, Avatar, Separator, Skeleton
  components/ui/tag.tsx              — Tag, StatusBadge
  components/ui/table.tsx
  components/ui/pagination.tsx
  components/ui/stepper.tsx
  components/ui/content.tsx          — Callout, CodeBlock, Blockquote
  components/ui/prose.tsx

  components/showcase/actions-section.tsx
  components/showcase/form-controls-section.tsx
  components/showcase/overlays-section.tsx
  components/showcase/disclosure-section.tsx
  components/showcase/data-content-section.tsx

  docs/phases/PHASE-4.3-README.md

تأیید شده: tsc --noEmit پاک، next build کامل موفق (با استاب موقت فونت
به خاطر محدودیت شبکه‌ی سندباکس، خود لایوت واقعی دست‌نخورده مونده).

---
ADDENDUM: این نسخه شامل ROAD-MAP-ARTAVEO.md آپدیت‌شده هم هست (revision 8) —
جایگزین نسخه‌ی فعلی توی ریشه‌ی ریپو کن. فقط status markerهای Phase 4 عوض
شدن (بلاک Document status بالای فایل، §8.3، هدر Phase 4، و §4.1/4.2/4.3) —
هیچ محتوای دیگه‌ای دست نخورده.
