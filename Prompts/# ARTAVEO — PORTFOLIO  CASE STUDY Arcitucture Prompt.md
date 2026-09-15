# ARTAVEO — PORTFOLIO / CASE STUDY STRUCTURE

## Phase: Media Architecture + Case Study Structure

## Projects: Transportation System + Pazhuhesh Portal

You are working with the `artaveo/artaveo` project.

This phase is ONLY about improving the **Portfolio / Work / Case Study structure and media architecture**.

Do NOT work on the separate Persian-language/copy improvement phase in this task. That will be handled later in a dedicated phase.

---

# 1. CRITICAL WORKFLOW — READ THIS FIRST

You have access to these real project repositories:

* `artaveo/Transportation-System`
* `artaveo/pezhohesh-portal`

You can inspect and analyze both repositories.

However, there is an important limitation:

**You must NOT assume that you can create screenshots from those repositories, upload image files into the Artaveo repository, commit them, or push them to GitHub yourself.**

The screenshot/image preparation step will be done manually by me.

Your responsibility is to:

1. deeply audit both project repositories
2. determine exactly which screenshots are required
3. determine exactly how many screenshots are required for each project
4. determine exactly which page/screen/section each screenshot must come from
5. determine the exact filename for every screenshot
6. determine the exact folder in the `artaveo/artaveo` repository where I must save each screenshot
7. wait for me to manually create and place those screenshots
8. wait for me to explicitly confirm that all required screenshots are in place
9. ONLY THEN implement the Portfolio / Case Study structure in code
10. use the exact filenames and paths you previously specified
11. after implementation, provide the modified project files as a ZIP package so I can copy/replace them in my local Artaveo project
12. do NOT assume that you can push the changes to GitHub or deploy them yourself

This sequencing is mandatory.

---

# 2. OVERALL GOAL

The goal is NOT to show every screen.

The goal is to show the **right amount of visual evidence** so that a professional client immediately understands:

1. what the project is
2. how it works
3. how substantial it is
4. what was actually built
5. how deep the system goes

The main Case Study must remain premium, editorial, and highly scannable.

Additional screenshots should be available through a Gallery rather than making the main Case Study excessively long.

---

# 3. DO NOT TREAT BOTH PROJECTS IDENTICALLY

These two projects have different visual stories.

## Transportation System

This is a full-stack transportation platform with two major sides:

### Passenger side

* trip search
* trip availability
* seat selection
* booking
* confirmation
* lookup/tracking
* account

### Operations side

* dashboard
* routes
* buses
* drivers
* trips
* bookings
* reports
* loyalty
* coupons
* payment-related operations

Its visual story is:

**Search → Trip → Seat → Booking → Operations**

The portfolio must make it obvious that this is much more than a simple bus-booking landing page.

---

## Pazhuhesh Portal

This is a bilingual educational/content platform with:

### Public experience

* homepage
* Study Lounge
* Academic Services
* Scholarships
* Achievements
* About

### Platform/system capabilities

* CMS
* image management
* Super Admin
* restricted Department Admin
* role-based access
* bilingual/RTL
* dark/light mode
* PWA/offline-first behavior

Its visual story is:

**Public Portal → Content System → CMS → Roles → Department Admin**

---

# 4. FIRST PHASE — DEEP REPOSITORY AUDIT

Before changing any Artaveo code, deeply inspect both real project repositories.

Do NOT rely only on README files.

Inspect actual:

* routes
* pages
* components
* admin screens
* responsive implementations
* image assets
* meaningful data states
* major workflows

---

# 5. TRANSPORTATION AUDIT

Inspect at minimum:

### Public / Passenger

* homepage
* search
* search results
* trip details
* seat selection
* checkout
* booking confirmation
* booking lookup/tracking
* passenger account/history

### Admin / Operations

* dashboard
* booking management
* trip management
* route management
* bus management
* driver management
* reports
* loyalty
* coupons
* payments or payment-management views

### Visual quality

Also inspect which screens are visually strongest and which screens would produce weak or repetitive portfolio images.

---

# 6. PAZHUHESH AUDIT

Inspect at minimum:

### Public

* homepage
* Study Lounge
* Academic Services
* Active Scholarships
* Achievements
* About

### Admin

* login/admin entry
* Super Admin dashboard
* Department Admin
* content management
* image/media management
* services/scholarship management

### Experience

Inspect:

* RTL
* English
* dark mode
* responsive/mobile
* PWA/offline-related visible UI where relevant

---

# 7. SCREENSHOT COUNT — MUST BE CURATED

Use the following as the default target after your repository audit.

Do NOT increase these counts simply because more screens exist.

Do NOT reduce them simply because fewer screens are easier to implement.

Only deviate when the actual repository provides a strong evidence-based reason.

---

# 8. TRANSPORTATION SCREENSHOT COUNT

## Main Case Study

**6 screenshots**

## Gallery

**6–8 additional screenshots**

## Total

Approximately **12–14 screenshots**

This is the correct target because Transportation is the more complex of the two systems and needs stronger visual evidence.

---

# 9. TRANSPORTATION — PRIMARY SCREENSHOTS

Determine the exact real screen for each item below.

I will manually create these screenshots.

You must give me the exact source page/screen and exact asset filename/path.

## 01 — Homepage / Product Overview

Source:
Transportation public homepage.

Filename:

`01-home-overview.png`

Destination:

```text
public/images/work/transportation-system/main/01-home-overview.png
```

Purpose:

* product identity
* primary cover
* overall quality
* main booking entry point

---

## 02 — Trip Search / Search Results

Source:
the strongest actual implemented trip-search/results screen.

Filename:

`02-trip-search-results.png`

Destination:

```text
public/images/work/transportation-system/main/02-trip-search-results.png
```

Purpose:

Show the beginning of the actual booking workflow.

---

## 03 — Seat Selection

Source:
actual seat-selection screen.

Filename:

`03-seat-selection.png`

Destination:

```text
public/images/work/transportation-system/main/03-seat-selection.png
```

Purpose:

Show one of the project's most distinctive features:

* seat map
* availability
* selection
* booking context

This MUST remain in the main Case Study.

---

## 04 — Booking Confirmation

Source:
actual booking confirmation screen.

Filename:

`04-booking-confirmation.png`

Destination:

```text
public/images/work/transportation-system/main/04-booking-confirmation.png
```

Purpose:

Prove the booking flow reaches a completed state.

Prefer this over making Checkout a separate primary screenshot.

---

## 05 — Admin Dashboard

Source:
actual operational dashboard.

Filename:

`05-admin-dashboard.png`

Destination:

```text
public/images/work/transportation-system/main/05-admin-dashboard.png
```

Purpose:

Show:

* bookings
* revenue
* occupancy
* trips
* operational overview

This is a critical main visual.

---

## 06 — Reports

Source:
actual Reports Dashboard.

Filename:

`06-admin-reports.png`

Destination:

```text
public/images/work/transportation-system/main/06-admin-reports.png
```

Purpose:

Show operational/business intelligence such as:

* revenue
* passengers
* occupancy
* trip reporting
* date/route reports
* export capability where visually relevant

---

# 10. TRANSPORTATION — GALLERY SCREENSHOTS

Prepare the following target set.

Again, I will manually create the screenshots.

## 07 — Booking Management

Filename:

`07-admin-bookings.png`

Destination:

```text
public/images/work/transportation-system/gallery/07-admin-bookings.png
```

---

## 08 — Trip Management

Filename:

`08-admin-trips.png`

Destination:

```text
public/images/work/transportation-system/gallery/08-admin-trips.png
```

---

## 09 — Route Management

Filename:

`09-admin-routes.png`

Destination:

```text
public/images/work/transportation-system/gallery/09-admin-routes.png
```

---

## 10 — Bus / Fleet Management

Filename:

`10-admin-buses.png`

Destination:

```text
public/images/work/transportation-system/gallery/10-admin-buses.png
```

---

## 11 — Driver Management

Filename:

`11-admin-drivers.png`

Destination:

```text
public/images/work/transportation-system/gallery/11-admin-drivers.png
```

---

## 12 — Booking Lookup / Tracking

Filename:

`12-booking-tracking.png`

Destination:

```text
public/images/work/transportation-system/gallery/12-booking-tracking.png
```

---

## 13 — Loyalty / Coupons

Filename:

`13-loyalty-coupons.png`

Destination:

```text
public/images/work/transportation-system/gallery/13-loyalty-coupons.png
```

Use whichever actual screen gives the strongest visual proof.

If the audit shows that one of these areas is visually too weak, you may recommend a replacement, but explain the reason before implementation.

---

## 14 — Responsive / Mobile Experience

Filename:

`14-responsive-mobile.png`

Destination:

```text
public/images/work/transportation-system/gallery/14-responsive-mobile.png
```

Use a genuine mobile/responsive implementation.

Do NOT tell me to make a fake cropped version of a desktop screenshot.

---

# 11. PAZHUHESH SCREENSHOT COUNT

## Main Case Study

**5 screenshots**

## Gallery

**5–6 additional screenshots**

## Total

Approximately **10–11 screenshots**

This project should NOT be forced to match Transportation's count.

---

# 12. PAZHUHESH — PRIMARY SCREENSHOTS

## 01 — Main Homepage

Filename:

`01-home-overview.png`

Destination:

```text
public/images/work/pazhuhesh-portal/main/01-home-overview.png
```

Purpose:

Primary cover / product overview.

---

## 02 — Study Lounge

Filename:

`02-study-lounge.png`

Destination:

```text
public/images/work/pazhuhesh-portal/main/02-study-lounge.png
```

Purpose:

Show the distinctive Study Lounge experience.

---

## 03 — Academic Services

Filename:

`03-academic-services.png`

Destination:

```text
public/images/work/pazhuhesh-portal/main/03-academic-services.png
```

Purpose:

Show the academic-services/content side of the product.

Do NOT make Scholarships a separate primary screenshot unless your audit finds a compelling visual reason.

Scholarships belong in the Gallery.

---

## 04 — Super Admin Dashboard

Filename:

`04-super-admin-dashboard.png`

Destination:

```text
public/images/work/pazhuhesh-portal/main/04-super-admin-dashboard.png
```

Purpose:

Prove that the public site is backed by a real CMS/admin system.

---

## 05 — Department Admin

Filename:

`05-department-admin.png`

Destination:

```text
public/images/work/pazhuhesh-portal/main/05-department-admin.png
```

Purpose:

Show restricted role-based administration.

This is a primary differentiator and must remain in the main Case Study.

---

# 13. PAZHUHESH — GALLERY SCREENSHOTS

## 06 — Active Scholarships

Filename:

`06-active-scholarships.png`

Destination:

```text
public/images/work/pazhuhesh-portal/gallery/06-active-scholarships.png
```

---

## 07 — About / Rich Content

Filename:

`07-about-content.png`

Destination:

```text
public/images/work/pazhuhesh-portal/gallery/07-about-content.png
```

---

## 08 — Achievements

Filename:

`08-achievements.png`

Destination:

```text
public/images/work/pazhuhesh-portal/gallery/08-achievements.png
```

---

## 09 — Admin Content / Media Management

Filename:

`09-admin-content-media.png`

Destination:

```text
public/images/work/pazhuhesh-portal/gallery/09-admin-content-media.png
```

Use the strongest actual CMS/media-management screen.

---

## 10 — Responsive / Mobile

Filename:

`10-responsive-mobile.png`

Destination:

```text
public/images/work/pazhuhesh-portal/gallery/10-responsive-mobile.png
```

---

## 11 — Theme / Bilingual / RTL Evidence

Filename:

`11-theme-or-bilingual.png`

Destination:

```text
public/images/work/pazhuhesh-portal/gallery/11-theme-or-bilingual.png
```

Choose the strongest actual screen that visually demonstrates one of:

* dark mode
* English
* RTL
* bilingual presentation

Do not invent a dedicated screen merely to fill this slot.

---

# 14. IMPORTANT — YOU MUST VERIFY EACH SCREEN AGAINST THE REPOSITORY

The list above is the target portfolio structure.

Your job is to verify:

* exact route
* exact page
* exact UI component
* exact state
* whether the screen really exists
* whether the screenshot should use another specific state for better evidence

If the repository implementation differs from the assumed screen:

**Do not blindly follow the assumption.**

Instead:

1. identify the correct actual screen
2. explain the deviation
3. provide the replacement screenshot name/path
4. only use the real implemented screen

---

# 15. YOUR OUTPUT BEFORE CODING

Before touching the Case Study implementation, provide me with a complete **Screenshot Manifest**.

Use this exact structure for every image:

```text
Project:
Priority:
Main / Gallery:
Filename:
Exact source repository:
Exact source route/page:
Exact screen/state to capture:
What the screenshot proves:
Destination path in Artaveo:
```

Example:

```text
Project: Transportation System
Priority: 03
Main
Filename: 03-seat-selection.png
Exact source repository: artaveo/Transportation-System
Exact source route/page: /trips/[tripId]/seats
Exact screen/state to capture: trip seat-selection view with meaningful available/selected seats
What it proves: live seat-selection workflow
Destination path in Artaveo:
public/images/work/transportation-system/main/03-seat-selection.png
```

Do this for EVERY required screenshot.

---

# 16. STOP HERE — MANUAL SCREENSHOT PHASE

After producing the Screenshot Manifest:

**DO NOT continue to implementation.**

I will manually open the two projects, capture the screenshots you specify, rename them exactly as specified, and place them into the Artaveo repository folders you specify.

Your job at this stage is only to give me the exact instructions.

Do NOT:

* create screenshot files yourself
* upload screenshot files
* push screenshot files
* commit screenshot files
* assume screenshots are present
* generate placeholder image files
* continue to Case Study implementation

Wait for my explicit confirmation that:

**"All screenshots have been placed in the specified Artaveo paths."**

---

# 17. AFTER I CONFIRM THE SCREENSHOTS ARE READY

Only after I explicitly confirm that every required screenshot exists:

Inspect the Artaveo repository and verify the expected paths/names.

Then implement the new Portfolio / Case Study structure.

---

# 18. CASE STUDY MEDIA STRUCTURE

The final Case Study should not remain a single-cover-image layout.

The target structure is:

```text
Case Study Header
↓
Project Snapshot
↓
Primary Cover / Hero Visual
↓
Context / Problem
↓
Selected Visual Evidence
↓
Architecture / Engineering
↓
Additional Selected Visuals where appropriate
↓
Technical / Product explanation
↓
Gallery CTA
↓
Gallery / full interface exploration
↓
Related project
```

Keep the current Artaveo design system.

Do not turn it into an image dump.

---

# 19. GALLERY

Introduce a proper Gallery experience.

The Gallery should support the larger screenshot set without making the main Case Study too long.

The Gallery should support:

* responsive layout
* image preview/lightbox
* meaningful labels/captions
* mobile support
* keyboard accessibility where appropriate
* return to Case Study
* clear separation between project and gallery context

Transportation may be grouped conceptually into:

* Passenger
* Operations
* Business
* Responsive

Pazhuhesh may be grouped into:

* Public
* Admin
* Content
* Responsive

Do not over-engineer categories if the final screenshot count does not justify them.

---

# 20. ROUTING

Preserve the existing Artaveo routing structure.

Keep:

```text
/fa/work
/en/work
/fa/work/[slug]
/en/work/[slug]
```

Do NOT rename `/work` to `/portfolio`.

Do not introduce unnecessary route complexity.

A gallery may be:

* an in-page experience
* a modal/lightbox system
* or a nested route

Choose the architecture that fits the current Artaveo codebase best.

---

# 21. ARCHITECTURE VISUALS

Architecture visuals are separate from UI screenshots.

Do NOT count architecture diagrams inside the screenshot counts.

If architecture visuals are implemented in this phase, base them strictly on the real repositories.

For Transportation, communicate the real relationship between:

* passenger app
* admin/operations
* Next.js
* server/API boundaries
* Supabase
* PostgreSQL
* Auth
* RLS

For Pazhuhesh, communicate the real relationship between:

* public portal
* data layer
* admin data
* Super Admin
* Department Admin
* Supabase/PostgreSQL/Storage

Do not invent architecture.

---

# 22. FUTURE ADMIN IMAGE MANAGEMENT

This is a requirement for the architecture, but it is NOT a request to build the admin system now.

Future phases must be able to manage the complete project media set.

That means the architecture should eventually support:

* replacing project cover image
* replacing main screenshots
* replacing gallery screenshots
* replacing responsive screenshots
* replacing theme/bilingual screenshots
* replacing architecture visuals
* reordering images
* changing captions
* changing alt text
* associating media with a project and section

Do not hardcode image references throughout unrelated components in a way that makes future management difficult.

The current implementation can remain file-based because the actual image files are being stored manually in the Artaveo repository.

But structure the data model/components so a future database-driven/admin-managed media system can be introduced cleanly.

---

# 23. IMPORTANT — CURRENT PHASE IS NOT CMS IMPLEMENTATION

Do NOT build:

* Supabase media tables
* upload dashboards
* storage management
* admin image editors
* production CMS

unless these already exist as part of the current Artaveo project architecture and the requested Case Study work naturally integrates with them.

This phase is about:

**Portfolio structure + real local media assets + Gallery architecture.**

---

# 24. CURRENT PROJECT DATA MODEL

The existing Artaveo `Project` model currently has a single `coverImage` field.

The Case Study component currently renders a single media image.

Extend this architecture only as much as needed to support:

* primary screenshot set
* gallery
* future manageable media metadata

Do not unnecessarily rewrite unrelated content models.

Prefer a clean, typed, data-driven solution.

---

# 25. DO NOT CHANGE THE UNDERLYING PROJECTS

Do not modify:

* Transportation System UI
* Pazhuhesh UI
* Transportation functionality
* Pazhuhesh functionality

The screenshots are only representations of the existing real products.

The Artaveo website is the thing being edited.

---

# 26. DO NOT REWRITE THE LANGUAGE SYSTEM IN THIS TASK

Do not perform the separate Persian-language improvement phase here.

Do not rewrite the existing Persian/English Case Study prose unless a tiny text adjustment is absolutely necessary for newly introduced Gallery controls or accessibility.

The language/copy phase is a separate task.

---

# 27. DESIGN CONSTRAINTS

Preserve the Artaveo visual identity:

* premium
* minimal
* technical
* editorial
* calm
* professional
* modern

Do not turn the Case Study into:

* endless masonry
* Behance-style image dumping
* flashy animation
* a Dribbble gallery
* generic portfolio templates

Use visual hierarchy and restraint.

---

# 28. IMPLEMENTATION QUALITY REQUIREMENTS

After I confirm all screenshots are present:

* use the exact provided asset names
* use the exact provided asset paths
* do not rename assets
* do not substitute placeholder paths
* ensure all images load in both `/fa` and `/en`
* preserve RTL/LTR
* preserve light/dark mode
* preserve current responsive behavior
* preserve existing design tokens
* avoid broken images
* avoid layout shift where reasonably possible
* use appropriate responsive image sizing
* keep accessibility in mind
* use meaningful alt text

---

# 29. FINAL OUTPUT AFTER IMPLEMENTATION

After the implementation is complete:

DO NOT assume you can push anything to GitHub.

Instead:

1. run the appropriate validation/build checks available in the Artaveo project
2. make sure the changed files are complete
3. package the changed/new project files into a ZIP
4. provide the ZIP to me
5. tell me exactly what changed
6. tell me which files were modified/added
7. tell me that I should copy/replace those files into my local Artaveo project
8. do NOT modify files that were not necessary
9. do NOT claim deployment is complete

I will then:

* copy the changed files into the local project
* replace the old versions
* keep unchanged files untouched
* run the project locally
* verify the Portfolio
* commit/push to GitHub
* redeploy to Vercel

---

# 30. FINAL IMPLEMENTATION ACCEPTANCE CRITERIA

## Transportation

Main:

**6 screenshots**

Gallery:

**6–8 screenshots**

The main page clearly communicates:

**Passenger booking + Operations**

---

## Pazhuhesh

Main:

**5 screenshots**

Gallery:

**5–6 screenshots**

The main page clearly communicates:

**Public portal + CMS + Role-based admin**

---

## Media

* all screenshots are real
* all screenshots were manually prepared by the user
* all screenshots were manually placed into the specified Artaveo paths
* implementation uses those exact files
* no fake placeholders remain
* no screenshot is silently renamed
* no image references are invented

---

## Workflow

The required sequence is:

```text
1. Deeply audit both GitHub repositories
        ↓
2. Determine exact screenshot list
        ↓
3. Give exact filenames + exact Artaveo paths
        ↓
4. STOP
        ↓
5. User manually captures screenshots
        ↓
6. User manually places screenshots into Artaveo
        ↓
7. User confirms screenshots are ready
        ↓
8. Inspect available assets
        ↓
9. Implement Portfolio / Case Study structure
        ↓
10. Validate
        ↓
11. Create ZIP of changed/new files
        ↓
12. Give ZIP to user
```

Do not skip the checkpoint.

---

# MOST IMPORTANT RULE

**You are responsible for analysis, planning, naming, path definition, and code implementation.**

**I am responsible for capturing the screenshots, placing the image files into the Artaveo repository, committing them to GitHub, and deploying the final project.**

Do not claim to have performed actions that you cannot actually perform.

The first response to this task should therefore be the **deep repository audit + exact Screenshot Manifest only**.

Stop after the manifest and wait for my confirmation.
