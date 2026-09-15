You are working on the Artaveo website repository.

Your task is NOT to redesign the website and NOT to change its visual identity.

The goal of this task is to improve the website's COPY SYSTEM and LANGUAGE PRESENTATION so that both Persian and English feel naturally written, easy to scan, visually balanced, and professionally polished.

This is a language/localization refinement pass across the ENTIRE website, not only the Case Study pages.

## Core problem

The current English copy is generally strong and professional, but some sections are too dense and technical for a general client.

The Persian copy has a more noticeable problem:

- some sentences feel translated from English rather than naturally written in Persian
- some sentences are unnecessarily formal or literary
- sentence order sometimes feels unnatural
- long sentences contain too many ideas
- punctuation and spacing sometimes feel awkward
- Persian wording can require rereading
- some headings do not have the same visual rhythm as their English counterparts
- some headings look visually awkward because the Persian version inherits the same line structure as English
- the Persian page can feel "heavier" even when the underlying design is strong
- English and Persian are currently treated too much like the same sentence structure translated into two languages

The most important principle for this task is:

LANGUAGE PARITY DOES NOT MEAN SENTENCE PARITY.

English and Persian should communicate the same meaning and intent, but they do NOT need to use the same sentence structure, line breaks, word order, punctuation pattern, or number of words.

Persian must read like natural professional Persian.
English must read like natural professional English.

Do NOT mechanically translate one language from the other.

---

# 1. First: inspect the existing implementation before editing

Before changing anything:

1. Inspect the repository structure.
2. Inspect `messages/en.json` and `messages/fa.json`.
3. Inspect `lib/home-content.ts`.
4. Inspect all major content-bearing page/component files.
5. Inspect shared typography/header components such as:
   - PageHeader
   - SectionHeader
   - Hero
   - CaseStudy
   - CTA sections
   - service page headers
   - work/portfolio headers
6. Inspect how RTL/LTR is currently applied.
7. Inspect how heading line breaks are currently controlled.
8. Inspect whether headings use shared keys such as `titleLine1` / `titleLine2`.
9. Identify every place where the English structure is implicitly forcing the Persian structure.

Do not start rewriting immediately.

First understand the current content architecture.

---

# 2. Fix the ROOT architectural problem: locale-specific composition

Do NOT assume that one English heading split should also be used for Persian.

For example, if the English hero is conceptually:

"Full-stack products,"
"built end to end."

the Persian version does NOT need to preserve that exact two-line semantic split.

It may instead be:

"محصولات فول‌استک"
"از ایده تا محصول نهایی."

or another natural Persian construction that preserves the same meaning and tone.

Therefore:

## Allow each locale to have its own:

- title line composition
- sentence length
- paragraph length
- line rhythm
- wording
- punctuation
- CTA wording
- eyebrow wording

Do NOT change the visual design system just to achieve this.

Use the existing design system, but make the content flexible enough to work naturally in each language.

---

# 3. Persian writing principles

Rewrite Persian copy using these rules:

### Natural Persian first

Write as a professional Persian-speaking technology freelancer would naturally write.

Do not use unnecessarily literary or bureaucratic Persian.

Avoid wording that feels like:

- machine translation
- direct English translation
- corporate bureaucracy
- academic paper language
- overly formal marketing language

The goal is:

professional + clear + modern + natural

NOT:

literary + complicated + impressive-sounding

---

### Shorter sentences

Prefer:

One sentence = one main idea.

When a sentence contains multiple independent ideas, split it.

For example, instead of:

"سایت عمومی و پنل مدیریت از یک مسیر مشترک برای دریافت داده استفاده می‌کنند که باعث می‌شود هر دو بخش از یک منبع حقیقت واحد استفاده کنند و از ایجاد مسیرهای موازی و ناسازگار جلوگیری شود."

prefer something closer to:

"سایت عمومی و پنل مدیریت از یک مسیر مشترک برای دریافت داده استفاده می‌کنند. در نتیجه، هر دو بخش از یک منبع داده استفاده می‌کنند و احتمال ناسازگاری کاهش می‌یابد."

Do not blindly use this exact example; apply the principle throughout the website.

---

### Prefer direct verbs

Prefer:

"این بخش داده‌ها را از دیتابیس می‌گیرد."

over:

"داده‌ها توسط این بخش از دیتابیس دریافت می‌شوند."

Prefer:

"پنل مدیریت محتوا را کنترل می‌کند."

over:

"محتوا از طریق پنل مدیریت قابل کنترل است."

Use active, direct language whenever it sounds natural.

---

### Reduce unnecessary abstraction

Avoid unnecessarily abstract phrases such as:

- "در یک روند کاری واحد"
- "مرزهای شفاف میان..."
- "به‌صورت پیش‌فرض"
- "یکپارچگی..."
- "پیش از اولین تماس..."
- "نگاه بلندمدت"
- "رویکرد..."
- "ساخته‌شده..."

when a simpler sentence communicates the same thing more clearly.

Do not remove technical meaning.

Simplify the wording, not the substance.

---

# 4. Persian punctuation and spacing

Perform a consistency pass across all Persian content.

Pay attention to:

- Persian comma: `،`
- Persian question mark where appropriate
- periods and sentence endings
- colon spacing
- parentheses
- em dash usage
- spaces around English technical terms
- Persian half-space
- Persian plural/attached forms
- correct spacing between Latin terms and Persian words

Examples:

Wrong:
`Supabaseرا`

Correct:
`Supabase را`

Wrong:
`پایگاه داده,`

Correct:
`پایگاه داده،`

Wrong:
`ReactوVite`

Correct:
`React و Vite`

Use نیم‌فاصله where standard Persian typography requires it, for example:

`واکنش‌گرا`
`پایگاه‌داده`
`داده‌ها`
`نمونه‌کار`
`توسعه‌دهنده`

Do not overuse half-spaces where normal Persian spacing is correct.

---

# 5. Heading / hero composition is a special priority

This is one of the most important parts of the task.

English and Persian headings currently do not always have the same visual quality.

Do NOT solve this by changing:

- font sizes globally
- spacing scale
- colors
- layout
- card design
- overall visual identity

Instead:

## Improve the copy composition first.

For each major heading:

1. Check the semantic meaning.
2. Check sentence rhythm.
3. Check where the visual break occurs.
4. Check whether the phrase before/after the break is grammatically complete.
5. Check whether the two lines feel intentionally designed.
6. Check whether the second line visually complements the first.
7. Check whether Persian needs a different line split from English.

A Persian heading should look intentionally composed, not like an English heading that happened to wrap in RTL.

If a title is currently split using two translation keys such as:

`titleLine1`
`titleLine2`

keep that architecture if it is useful, but allow the Persian values to be independently composed.

Do NOT force identical line lengths.

The objective is not equal word count.

The objective is equal visual quality and semantic strength.

---

# 6. English copy refinement

Do NOT rewrite the English unnecessarily.

The English is generally stronger than the Persian.

Keep the professional tone, but improve places where:

- sentences are too long
- multiple ideas are packed together
- technical details interrupt the main message
- wording feels too engineering-centric for a client
- paragraphs are difficult to scan

Use modern professional product/freelance English.

Think:

clear senior engineer speaking to a client

not:

academic technical paper

and not:

generic marketing copy.

---

# 7. Case Study copy

The Case Study is especially important.

Keep the existing information architecture:

- Context
- Problem & Goals
- Constraints
- My Role & Scope
- Architecture
- Key Decisions
- Engineering Highlight
- Data Integrity & Security
- Responsive & RTL
- Quality
- Current Status & Next
- Lessons Learned

Do NOT remove valuable technical information just to make the page shorter.

Instead:

## Separate information density from sentence complexity.

Technical depth should remain.

But the reader should understand the core point on the first pass.

A useful pattern is:

Heading
→ one clear statement
→ short supporting explanation
→ technical detail where needed

When a paragraph contains 4–5 logical ideas, split it into smaller paragraphs or clearly structured sentences.

---

# 8. Client-friendly first, technical depth second

Remember that the Artaveo website serves different readers:

1. potential clients
2. technical clients / CTOs
3. developers
4. professors / technical reviewers

The first layer should be understandable to a client.

Technical depth should remain available for technical readers.

Do not turn every section into a developer-only explanation.

For example:

Instead of leading with:

"fail-closed allow-list"

lead with the actual problem/result, then explain the implementation:

"The Department Admin can only change explicitly permitted settings. This access is enforced with a fail-closed allow-list in the database."

This is easier to understand while remaining technically accurate.

---

# 9. Do a full-site pass, not only Case Study

Inspect and improve all major content areas, including:

- Hero
- Featured Work
- Work page
- Case Studies
- Why Artaveo
- Services
- Service detail pages
- Process
- About
- Insights
- Final CTA
- navigation descriptions
- footer microcopy
- buttons / CTA labels
- badges
- status labels
- form helper text
- empty states
- error/loading states
- metadata text where visible to users

Do not only fix long paragraphs.

Short UI labels must also feel natural.

---

# 10. Preserve meaning and truthfulness

This is a copy refinement task, NOT permission to invent information.

Do NOT invent:

- clients
- metrics
- testimonials
- revenue
- users
- performance numbers
- dates
- business outcomes
- project claims
- technologies
- features

All rewritten content must remain faithful to the existing verified project data.

If the source information is uncertain, keep the uncertainty rather than inventing clarity.

---

# 11. Preserve technical terminology where it is genuinely useful

Do not translate technical terms just for the sake of translating them.

Terms such as:

- React
- Next.js
- Supabase
- PostgreSQL
- API
- PWA
- RLS
- RTL
- Edge Function
- Service Worker
- localStorage
- cache

can remain in English where that is the natural professional usage.

But integrate them naturally into Persian sentences.

Example:

Good:
"این بخش از Supabase Storage برای مدیریت تصاویر استفاده می‌کند."

Bad:
"این بخش از ذخیره‌سازی فوق‌العاده‌ی Supabase برای..."

Do not create awkward Persian equivalents for universally used technical terms.

---

# 12. Do not flatten the brand voice

Artaveo should still feel:

- technical
- premium
- calm
- confident
- modern
- independent
- precise

Do NOT make the language:

- childish
- overly casual
- generic
- exaggerated
- salesy
- full of buzzwords

The goal is "clearer", not "simpler in a cheap way."

---

# 13. Important: do not alter visual design unnecessarily

This task is primarily about content and language presentation.

Do NOT redesign:

- color system
- typography scale
- cards
- buttons
- spacing system
- layouts
- navigation structure
- page architecture

Only make small component changes when they are REQUIRED to support proper locale-specific content composition.

Examples of acceptable structural changes:

- allowing separate line composition per locale
- adjusting a heading wrapper so Persian can wrap naturally
- preventing awkward forced line breaks
- correcting RTL/LTR text behavior
- fixing inline punctuation/technical-term rendering

Do NOT use this task as an excuse for a visual redesign.

---

# 14. Required workflow

Do the work in this order:

### Phase A — Audit

Inspect the full site content and identify:

- unnatural Persian
- overly formal Persian
- English-like sentence structure in Persian
- long sentences
- awkward punctuation
- bad line breaks
- headings that do not compose well in RTL
- English passages that are unnecessarily dense
- inconsistent terminology

### Phase B — Define the language style

Establish a consistent copy style:

Persian:
Natural professional Persian, clear and modern.

English:
Natural professional English, concise and technical where appropriate.

### Phase C — Rewrite content

Rewrite the actual localized content.

Do not just tweak random words.

Rewrite complete sentences where necessary so the flow becomes natural.

### Phase D — Fix composition

Check:

- headings
- hero lines
- section titles
- descriptions
- CTA copy
- line breaks
- punctuation

for both locales.

### Phase E — Verify

Build the project.

Check all major pages in both:

`/fa/...`

and

`/en/...`

Verify:

- no text overflow
- no awkward line breaks
- no punctuation mistakes
- no RTL/LTR direction problems
- no mixed-script spacing problems
- no broken headings
- no UI regressions

---

# 15. Very important examples of what NOT to do

Do NOT simply translate:

English:
"One developer. One workflow. The whole product."

into a mechanically equivalent Persian sentence.

Instead, create Persian copy that has the same impact and rhythm.

The same principle applies to every hero, heading, CTA, and Case Study section.

Also do NOT force a Persian title to occupy the same two conceptual lines as English.

The two versions should feel like they were written intentionally for their own language.

---

# 16. Acceptance criteria

I will consider this task successful only if:

### Persian

- reads naturally on the first pass
- does not feel machine-translated
- does not feel unnecessarily literary
- uses clean modern Persian
- has short, understandable sentences
- uses correct Persian punctuation
- uses correct spacing and نیم‌فاصله
- has visually balanced headings
- does not look like English translated into RTL

### English

- remains professional
- becomes easier to scan
- removes unnecessary sentence density
- retains technical credibility
- does not become generic marketing copy

### Both

- communicate the same meaning and level of honesty
- may use different wording and structure
- have independent heading composition when needed
- preserve the existing visual identity
- preserve all verified technical meaning

---

# 17. Do not stop after rewriting the text

After editing the copy, inspect the rendered result.

The goal is not:

"the Persian sentence is grammatically correct."

The goal is:

"the Persian page looks and reads like a professionally written Persian product website."

Judge the actual visual composition:

- line lengths
- heading balance
- whitespace
- rhythm between eyebrow/title/description
- paragraph density
- CTA appearance
- mixed Persian/English terms
- RTL punctuation behavior

The final result should feel intentional in BOTH languages.

---

# Final instruction

Do a complete, careful language/localization refinement pass across Artaveo.

Do not redesign the site.

Do not remove technical depth.

Do not invent claims.

Do not mechanically translate.

Treat Persian and English as two first-class editorial versions of the same website.

Most importantly:

MAKE THE COPY CLEARER, MORE NATURAL, MORE SCANNABLE, AND MORE VISUALLY BALANCED — especially in Persian — while preserving Artaveo's premium technical identity.