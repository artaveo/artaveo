# ROAD-MAP — ARTAVEO
# Premium Independent Full-Stack Developer & Freelance Business Platform

## STATUS

**Document Type:** Product + Design + Engineering Master Roadmap  
**Project:** Artaveo  
**Brand Type:** Independent Full-Stack Developer / Developer-Led Digital Product Studio  
**Primary Goal:** Build a production-grade personal business website that combines portfolio, technical credibility, services, lead generation, client onboarding, content publishing, and future business operations.  
**Initial Status:** PLANNED / IMPLEMENTATION-READY  
**Architecture Target:** Production-grade Full-Stack Web Application  
**Languages:** English + Persian / Farsi  
**Direction:** LTR + RTL  
**Themes:** Light + Dark  
**Deployment Target:** Production  
**Quality Target:** International-grade independent developer website

This document is the **master roadmap and implementation prompt** for Artaveo.

It combines:

- product strategy
- information architecture
- visual design system
- portfolio and case studies
- professional developer profile
- services and productized services
- recommendations / testimonials
- engagement models
- project inquiry and lead management
- consultation readiness
- CMS
- admin
- authentication
- database architecture
- localization
- SEO
- accessibility
- performance
- analytics
- security
- testing
- CI/CD
- observability
- backup/recovery
- documentation
- final production audit

Do not treat this as a simple landing-page prompt.

---

# 1. PRODUCT GOAL

Artaveo is a professional digital home for an independent full-stack developer.

The product must simultaneously serve five functions:

1. Personal / developer brand
2. Technical proof and portfolio
3. Service discovery and productized service selection
4. Client acquisition and qualification
5. Long-term content and business operations

A visitor should understand quickly:

- who Artaveo is
- who is behind it
- what can be built
- which technologies and capabilities are relevant
- what real projects exist
- how the developer approaches projects
- what services are available
- what collaboration models exist
- how to start a project

The site itself must demonstrate engineering quality.

It must NOT feel like:

- a student CV
- a generic portfolio template
- a fake agency
- a startup landing page without a clear service model
- a random collection of UI cards
- a visual-only Dribbble concept
- a marketplace clone
- an over-animated developer portfolio

---

# 2. CORE PRODUCT MODEL

Artaveo must be modeled as:

```text
PERSONAL BRAND
      ↓
EXPERTISE
      ↓
SELECTED WORK
      ↓
CASE STUDIES
      ↓
SERVICES
      ↓
ENGAGEMENT MODELS
      ↓
INQUIRY / CONSULTATION
      ↓
LEAD MANAGEMENT
      ↓
DELIVERY
      ↓
RECOMMENDATION / REPEAT WORK
```

The public site is the front door.

The admin/CMS is the operating layer.

The data model must connect both.

---

# 3. BRAND POSITIONING

Brand:

**ARTAVEO**

Positioning:

**Independent Full-Stack Web & Software Development Studio**

The positioning may evolve, but honesty must remain a hard constraint.

Artaveo is developer-led.

Do not imply:

- employees that do not exist
- departments that do not exist
- fake offices
- fake client logos
- fake enterprise partnerships
- fake awards
- fake revenue
- fake team size
- fake years of experience
- fake client counts
- fake ratings
- fake case-study results
- fake certifications
- fake testimonials

Artaveo should feel:

- professional
- modern
- technical
- reliable
- precise
- calm
- confident
- minimal
- international
- human
- trustworthy
- product-focused

---

# 4. CREDIBILITY STRATEGY

Because Artaveo is an emerging freelance brand, credibility must be built from real evidence rather than exaggerated claims.

Priority order:

```text
REAL PROJECTS
>
REAL TECHNICAL DETAIL
>
REAL REPOSITORIES / LIVE DEMOS
>
REAL PROCESS
>
REAL RECOMMENDATIONS
>
REAL VERIFIED METRICS
```

Use:

- real projects
- real GitHub links
- real live demos where available
- detailed case studies
- actual technical decisions
- transparent process
- clearly defined services
- real external profiles
- future verified recommendations
- future verified testimonials

Do not use fake social proof to compensate for limited experience.

---

# 5. BENCHMARK METHODOLOGY

The implementation must be informed by proven patterns from leading freelance and professional talent products.

Primary benchmark references:

## Contra

Use as the main benchmark for:

- freelancer portfolio structure
- projects
- services
- recommendations
- personal positioning
- work-with-me CTA
- conversion funnel
- portfolio-as-business concept

Observed patterns that should influence Artaveo:

- portfolio centered on work and services
- concise bio/tagline
- project-first credibility
- recommendations as social proof
- strong direct CTA
- contact information
- portfolio connected to business workflow

## Toptal

Use as the main benchmark for:

- professional developer presentation
- expertise taxonomy
- skill discovery
- availability
- professional summary
- hiring intent
- engagement models
- consultation/service positioning
- technical credibility

Observed patterns that should influence Artaveo:

- professional title
- expertise taxonomy
- structured professional profile
- availability signal
- clear hire CTA
- capability-driven discovery
- explicit engagement model
- professional process

## Upwork Project Catalog

Use selectively for productized-service mechanics:

- clear scope
- package tiers
- delivery timeframe
- deliverables
- add-ons
- requirements
- FAQs
- project steps
- side-by-side tier comparison

## Benchmark decision rule

Every borrowed pattern must become one of:

```text
ADOPT
ADAPT
REJECT WITH REASON
```

Never copy another company's visual identity.

Copy useful interaction and information patterns, then redesign them in Artaveo's own identity.

---

# 6. ARTAVEO-SPECIFIC BENCHMARK COMPONENTS

The following components must exist in the design system or page architecture.

## Identity Module

Contains:

- portrait / profile image
- name
- professional title
- short tagline
- concise positioning statement
- current availability state
- location/timezone when intentionally published

## Availability Indicator

Examples of conceptual states:

```text
AVAILABLE FOR SELECTED PROJECTS
LIMITED AVAILABILITY
CURRENTLY BOOKED
NOT ACCEPTING NEW PROJECTS
```

Never show an availability claim that is not true.

## Expertise Matrix

Present capabilities as structured expertise rather than an enormous logo wall.

Categories may include:

- Frontend
- Backend
- Databases
- APIs
- Authentication
- Infrastructure
- Testing
- DevOps
- Product Engineering

Every expertise item should be capable of linking to:

- related projects
- related services
- related articles

## Project Showcase

Project cards should include:

- image
- title
- summary
- role
- category
- technologies
- status
- case study CTA
- live CTA where available
- GitHub CTA where available

## Recommendations

The system must support real recommendations.

Until real recommendations exist:

- keep the component architecture ready
- do not invent content
- hide the section when empty or show a deliberate empty state only in admin/pre-production

## Services Showcase

Services must be more actionable than a feature list.

Each service should be able to support:

- target client
- problem
- scope
- deliverables
- process
- timeline
- technology
- packages
- add-ons
- FAQ
- related projects
- CTA

## Engagement Model Selector

Support:

- Custom Project
- Productized Service
- Consultation
- Maintenance
- Long-Term Development

## Work With Me / Start a Project

The main conversion action must remain consistently discoverable.

---

# 7. PRODUCT PRINCIPLES

1. Real proof is stronger than decoration.
2. Truth is more valuable than exaggerated credibility.
3. Every important claim must be supportable.
4. Projects are the core credibility mechanism.
5. Case studies demonstrate thinking, not screenshots alone.
6. Services must communicate business value.
7. Service packaging should reduce client uncertainty.
8. Every page must have a clear purpose.
9. Contact must always remain easy to find.
10. Navigation must remain simple.
11. The user must understand the offer without requiring a conversation.
12. The website must feel human without becoming amateur.
13. Technical complexity must be justified.
14. Backend logic must remain behind proper application boundaries.
15. Sensitive operations must be server-side.
16. Content must be structured and reusable.
17. Components must be reusable.
18. RTL must be first-class.
19. Accessibility must be part of the implementation, not an afterthought.
20. Performance must influence design decisions.
21. Every important workflow requires loading, success, empty and failure states.
22. Every sensitive workflow requires authorization and auditability.
23. Every phase needs verification before it can be marked complete.

---

# 8. ENGINEERING STANDARDS

Target standards:

- Security: OWASP ASVS principles
- Web security: OWASP Top 10
- Accessibility: WCAG 2.2 AA
- Semantic HTML: HTML5 semantics
- Validation: centralized schema validation
- Data: PostgreSQL-compatible architecture
- Observability: structured logs + errors + correlation IDs
- Privacy: data minimization
- Localization: locale-aware formatting
- RTL/LTR: full first-class support
- Performance: Core Web Vitals awareness
- SEO: semantic + metadata + structured data
- Testing: unit + integration + E2E
- CI/CD: repeatable quality gates
- Documentation: architecture + phase documents + runbooks

---

# 9. WEBSITE INFORMATION ARCHITECTURE

Public routes:

```text
/
/work
/work/[project]
/services
/services/[service]
/about
/process
/insights
/insights/[article]
/contact
/consultation
/search
/privacy
/terms
/404
```

Localized routes:

```text
/en/...
/fa/...
```

Future-ready routes:

```text
/availability
/uses
/now
/resume
```

Admin routes:

```text
/admin
/admin/dashboard
/admin/projects
/admin/services
/admin/articles
/admin/categories
/admin/tags
/admin/messages
/admin/consultations
/admin/media
/admin/testimonials
/admin/recommendations
/admin/navigation
/admin/localization
/admin/settings
/admin/analytics
/admin/audit-log
```

---

# 10. PHASE 1 — PRODUCT DISCOVERY & STRATEGIC FOUNDATION

## Goal

Define what Artaveo sells, who it serves, and what actions the website must generate.

## Tasks

- define target client profiles
- define ideal project categories
- define service hierarchy
- define positioning statement
- define tone of voice
- define credibility strategy
- define primary CTA
- define secondary CTAs
- define buyer objections
- define proof strategy
- define service boundaries
- define content boundaries
- define engagement models

## Visitor types

1. Potential client
2. Technical evaluator
3. Recruiter / collaborator
4. Existing client
5. Technical reader

## Primary CTA

Start a Project

## Secondary CTAs

View Work
Explore Services
Book a Consultation
GitHub
Fiverr
LinkedIn

## Deliverables

- audience model
- positioning
- content strategy
- conversion strategy
- initial sitemap
- engagement model

---

# 11. PHASE 2 — INFORMATION ARCHITECTURE & CONTENT MODEL

Define relationships:

```text
Project
→ Case Study
→ Technologies
→ Categories
→ Related Services
→ Related Articles

Service
→ Packages
→ Deliverables
→ Process
→ Related Projects
→ FAQ

Article
→ Category
→ Tags
→ Related Projects
→ Related Services

Recommendation
→ Person
→ Project / Service relation

Inquiry
→ Project Type
→ Service
→ Source
→ Status
→ Notes
→ Attachments
```

Define:

- navigation
- footer
- breadcrumbs
- contextual links
- related content rules
- page purpose
- CTA rules
- content ownership

Avoid duplicated hard-coded content where structured content is more appropriate.

---

# 12. PHASE 3 — TECHNICAL FOUNDATION

Preferred stack:

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui or equivalent maintainable primitives
PostgreSQL / Supabase
Server-side application boundaries
Schema validation
Secure admin authentication
Object storage for media
```

Conceptual architecture:

```text
app/
components/
features/
lib/
server/
services/
db/
hooks/
types/
content/
public/
tests/
scripts/
docs/
```

Separate:

- presentation
- business logic
- data access
- validation
- authorization
- content
- configuration

Never expose service-role keys or private secrets to the browser.

Do not create one giant component.

---

# 13. PHASE 4 — DATABASE & DATA MODEL FOUNDATION

Core entities:

```text
Project
ProjectMedia
ProjectTechnology
ProjectCategory
Technology
Service
ServicePackage
ServiceAddon
ServiceFAQ
Article
ArticleCategory
Tag
Recommendation
Testimonial
Inquiry
InquiryAttachment
Consultation
ConsultationSlot
MediaAsset
SiteSettings
NavigationItem
LanguageContent
AdminUser
AuditLog
Redirect
AnalyticsEvent
```

## Project

Minimum fields:

```text
id
slug
title
subtitle
excerpt
description
category
technologies
role
year
status
coverImage
gallery
liveUrl
githubUrl
featured
published
sortOrder
createdAt
updatedAt
```

## Service

Minimum fields:

```text
id
slug
title
shortDescription
description
category
targetClient
problem
scope
deliverables
technologies
packages
addons
faq
featured
published
sortOrder
createdAt
updatedAt
```

## Recommendation

```text
id
personName
personTitle
company
relationship
quote
avatar
sourceUrl
relatedProjectId
relatedServiceId
published
createdAt
```

## Inquiry

```text
id
name
email
company
projectType
serviceId
budgetRange
timeline
description
attachment
source
status
priority
followUpAt
createdAt
updatedAt
```

## Status model

Use explicit states.

Sensitive status changes must be auditable.

---

# 14. PHASE 5 — DATABASE SECURITY & ADMIN AUTHORIZATION

Implement real admin security.

Requirements:

- secure authentication
- role-based authorization
- server-side permission checks
- protected admin routes
- protected API/server actions
- secure sessions
- audit logging
- input validation
- rate limiting for public mutations
- spam/abuse protection

Never rely on hidden routes for authorization.

Never trust browser-provided permissions.

---

# 15. PHASE 6 — DESIGN SYSTEM & VISUAL LANGUAGE

Create the Artaveo design system.

Define:

- color tokens
- typography scale
- spacing system
- radius system
- border system
- surfaces
- shadows
- buttons
- links
- icon buttons
- form controls
- cards
- badges
- tags
- tables
- dialogs
- tooltips
- tabs
- accordions
- pagination
- loading states
- error states
- empty states

## Visual direction

Premium
Minimal
Editorial
Technical
Modern
Confident

Use:

- strong typography
- whitespace
- layout rhythm
- restrained motion
- visual hierarchy
- subtle surfaces

Avoid:

- excessive gradients
- excessive glassmorphism
- endless pills
- random blobs
- random floating cards
- heavy 3D
- excessive shadows
- neon overload
- meaningless parallax
- animation everywhere

The design must remain strong with animation disabled.

---

# 16. PHASE 7 — GLOBAL SHELL

Build:

- Header
- Mobile Navigation
- Footer
- Theme Switcher
- Language Switcher
- Search
- Breadcrumb
- Page Header
- Section Header
- CTA Section
- Page transition layer
- global loading/error boundaries

## Desktop navigation

Home
Work
Services
About
Process
Insights
Contact

## Right controls

Search
Language
Theme

## Primary CTA

Start a Project

## Header behavior

- transparent where appropriate
- solid on content pages
- sticky
- scroll-state transition
- keyboard accessible
- mobile optimized

Mobile navigation must be a polished overlay.

---

# 17. PHASE 8 — PROFESSIONAL IDENTITY SYSTEM

Create reusable profile/identity components inspired by strong independent-talent profiles.

Components:

- Profile Intro
- Professional Title
- Tagline
- Availability Indicator
- Expertise Summary
- Location / timezone when intentionally published
- External Profile Links
- Primary Hire CTA
- Consultation CTA

Profile hierarchy:

```text
NAME
↓
TITLE
↓
VALUE / SPECIALIZATION
↓
AVAILABILITY
↓
EXPERTISE
↓
WORK
↓
CTA
```

Do not force fake credentials into this section.

---

# 18. PHASE 9 — EXPERTISE & TECHNOLOGY SYSTEM

Do not use a huge uncontrolled logo wall.

Create structured expertise categories.

Example:

```text
FRONTEND
Next.js · React · TypeScript

BACKEND
Node.js · APIs · Authentication

DATA
PostgreSQL · SQL · Supabase

INFRASTRUCTURE
Git · GitHub · Vercel · Docker

ENGINEERING
Testing · Performance · Accessibility · Security
```

Every technology should support future relations to:

- projects
- services
- articles

Technology pages are optional future scope.

The first release must keep discovery simple.

---

# 19. PHASE 10 — HOMEPAGE

The homepage is the primary credibility and conversion surface.

Structure:

```text
01 Hero
02 Positioning / Capability Strip
03 Selected Work
04 Expertise
05 Services
06 Why Artaveo
07 Process
08 About Preview
09 Recommendations / Proof
10 Insights
11 Availability / Engagement
12 Final CTA
13 Footer
```

---

## 19.1 HERO

Hero must answer:

- Who are you?
- What do you build?
- What is your value?
- What should I do next?

Components:

- availability indicator when real
- profile identity
- strong headline
- concise supporting statement
- primary CTA
- secondary CTA
- GitHub / external proof links
- technical visual or project preview

Do not use fake metrics.

Do not force 3D.

Mobile hero must be deliberately redesigned.

---

## 19.2 POSITIONING / CAPABILITY STRIP

Possible content:

Full-Stack Development
Web Applications
Business Systems
Modern Interfaces
Backend & APIs
Performance
Deployment
Remote Collaboration

---

## 19.3 SELECTED WORK

Show real projects.

Initial project slots:

- Transportation System
- Second existing project

Future projects must be easy to add.

Each card:

- visual
- title
- concise summary
- category
- role
- technology tags
- case study
- live demo where available
- GitHub where available

---

## 19.4 EXPERTISE

Use concise expertise categories.

The homepage should communicate capability without becoming a technology directory.

---

## 19.5 SERVICES

Show a curated set of services.

Recommended:

- Business Websites
- Web Applications
- Full-Stack Development
- Admin Dashboards
- Backend / APIs
- Authentication
- Performance Optimization
- Redesign
- Maintenance
- Deployment

Each service should point to a deeper service page.

---

## 19.6 WHY ARTAVEO

Core concept:

```text
One developer
Direct communication
End-to-end ownership
Consistent technical workflow
```

Workflow visual:

```text
IDEA
↓
DISCOVERY
↓
PLANNING
↓
ARCHITECTURE
↓
DESIGN
↓
FRONTEND
↓
BACKEND
↓
DATABASE
↓
TESTING
↓
DEPLOYMENT
↓
SUPPORT
```

---

## 19.7 RECOMMENDATIONS / PROOF

Render only real evidence.

Possible component:

- quote
- person
- title
- company
- source
- related work

No fake testimonials.

---

## 19.8 AVAILABILITY / ENGAGEMENT

Provide a concise explanation of how clients can work with Artaveo.

Options:

Custom Project
Productized Service
Consultation
Maintenance
Long-Term Development

CTA:

Start a Project

---

## 19.9 FINAL CTA

Strong close:

Have a project in mind?

Let's build it.

Primary:

Start a Project

Secondary:

View Work

---

# 20. PHASE 11 — WORK / PORTFOLIO SYSTEM

Create a dedicated portfolio system.

Features:

- project grid
- featured projects
- categories
- technology filters
- optional search
- sorting
- case study links

Categories:

Websites
Web Applications
Full-Stack
Business Systems
Dashboards
Experiments

Responsive:

Mobile: 1 column
Tablet: 2 columns
Desktop: 2–3 columns as appropriate

Avoid over-engineered filtering.

---

# 21. PHASE 12 — CASE STUDY ENGINE

Case studies are the main proof mechanism.

Every case study must tell a story:

```text
CONTEXT
↓
PROBLEM
↓
CONSTRAINTS
↓
THINKING
↓
ARCHITECTURE
↓
IMPLEMENTATION
↓
RESULT
↓
LESSONS
```

Structure:

Project Hero
Project Summary
Role
Context
Challenge
Goals
Constraints
Approach
UX/UI
Architecture
Frontend
Backend
Database
Authentication
Key Features
Technical Decisions
Challenges
Solutions
Responsive Design
Performance
Testing
Deployment
Outcome
Lessons Learned
Links
Next Project

Metadata:

Client
Year
Duration
Role
Team
Industry
Status

Only display metadata that is true and available.

---

# 22. PHASE 13 — SERVICES CATALOG

Services must become an actual structured product layer.

Each service detail page should contain:

```text
SERVICE TITLE
↓
WHO IT IS FOR
↓
PROBLEM
↓
WHAT I DO
↓
WHAT IS INCLUDED
↓
WHAT IS NOT INCLUDED
↓
DELIVERABLES
↓
PROCESS
↓
TIMELINE
↓
TECHNOLOGY OPTIONS
↓
PACKAGES
↓
ADD-ONS
↓
RELATED PROJECTS
↓
FAQ
↓
START PROJECT
```

Core services may include:

- Web Development
- Full-Stack Development
- Web Applications
- Business Websites
- Admin Dashboards
- Backend / APIs
- Database Integration
- Authentication
- Performance Optimization
- Bug Fixing
- Redesign
- Deployment / DevOps
- Maintenance

---

# 23. PHASE 14 — PRODUCTIZED SERVICE PACKAGES

Support a service-package model inspired by mature freelance marketplaces.

Example tiers:

```text
STARTER
STANDARD
CUSTOM
```

Each package may support:

- scope
- deliverables
- timeline
- revisions
- starting price or contact-for-price
- requirements
- support period

Do not invent pricing.

Support future pricing fields:

```text
price
currency
billingType
deliveryDays
revisions
support
```

---

# 24. PHASE 15 — SERVICE ADD-ONS

Support optional add-ons.

Examples:

- additional page
- CMS
- authentication
- admin dashboard
- API integration
- deployment
- performance optimization
- maintenance
- additional revision round
- priority delivery

Add-ons must remain configurable.

Do not hard-code pricing into UI components.

---

# 25. PHASE 16 — ABOUT PAGE

The About page should tell a professional story rather than become a CV.

Sections:

About Artaveo
About the Developer
Technical Focus
Current Direction
Selected Technologies
Development Philosophy
Values
Learning
Remote Collaboration
Availability
External Profiles
CTA

Potential evidence:

GitHub
Fiverr
LinkedIn
Projects
Live Demos
Writing

---

# 26. PHASE 17 — PROCESS & ENGAGEMENT MODEL

Show:

01 Discover
02 Define
03 Plan
04 Design
05 Architect
06 Build
07 Test
08 Deploy
09 Support

For each:

- purpose
- activities
- output
- client involvement
- decisions
- risks

Also explain engagement models:

Custom Project
Productized Service
Consultation
Maintenance
Long-Term Development

---

# 27. PHASE 18 — INSIGHTS / BLOG

Create a real publishing system.

Main page:

- featured article
- latest articles
- categories
- tags
- search
- pagination

Article:

Hero
Title
Excerpt
Metadata
Author
Reading Time
Table of Contents
Content
Code Blocks
Images
Related Projects
Related Services
Related Articles
Share
Next Article

Statuses:

Draft
Review
Scheduled
Published
Archived

---

# 28. PHASE 19 — CONTACT / START A PROJECT

Create a professional multi-step inquiry workflow.

## Step 1 — Project Type

Website
Web Application
Full-Stack Application
Business Platform
Dashboard
E-Commerce
API / Backend
Redesign
Optimization
Bug Fix
Other

## Step 2 — Goal

What is the project trying to achieve?

## Step 3 — Timeline

ASAP
1–2 weeks
2–4 weeks
1–3 months
Flexible

## Step 4 — Budget

Optional.

## Step 5 — Project Details

## Step 6 — Contact Information

## Step 7 — Attachment

Optional.

## Step 8 — Consent

States:

Idle
Focused
Typing
Validation Error
Submitting
Server Error
Success
Rate Limited
Disabled

Successful flow:

```text
VALIDATE
↓
PERSIST
↓
AUDIT
↓
NOTIFY
↓
CONFIRM
```

Never fake success.

---

# 29. PHASE 20 — LEAD / INQUIRY MANAGEMENT

Inquiry lifecycle:

```text
NEW
↓
REVIEWED
↓
QUALIFIED
↓
CONTACTED
↓
DISCOVERY
↓
PROPOSAL
↓
WON / LOST
```

Support:

- internal notes
- tags
- priority
- follow-up date
- source attribution
- project relation
- service relation
- audit history

This is not a full enterprise CRM.

It is a focused freelancer lead-management layer.

---

# 30. PHASE 21 — CONSULTATION SYSTEM

Prepare a real consultation workflow.

Support:

- duration
- available slots
- timezone
- request
- confirmation
- cancellation
- rescheduling
- internal notes
- client notes

Use provider abstraction so calendar integration can be added later.

Do not tightly couple business logic to one provider.

---

# 31. PHASE 22 — GLOBAL SEARCH & COMMAND PALETTE

Shortcut:

Ctrl/Cmd + K

Search across:

Pages
Projects
Services
Articles
Technologies

Features:

- recent searches
- suggestions
- keyboard navigation
- loading
- no results
- highlighted matches

Architecture must support future server-side search.

---

# 32. PHASE 23 — INTERNATIONALIZATION

Languages:

English
Persian / Farsi

English:

LTR

Persian:

RTL

Requirements:

- locale-aware routes
- equivalent route switching
- translated metadata
- translated navigation
- translated validation
- correct direction
- correct mirroring
- locale-aware numbers
- locale-aware dates
- flexible typography

Never translate words while leaving the layout broken.

---

# 33. PHASE 24 — ACCESSIBILITY

Target:

WCAG 2.2 AA

Requirements:

Semantic HTML
Keyboard navigation
Visible focus
Accessible labels
Correct heading hierarchy
Reduced motion
Color contrast
Accessible forms
Accessible dialogs
Accessible errors
Screen-reader-friendly navigation
Meaningful alt text
Correct button semantics

Test:

- keyboard only
- screen reader
- zoom
- reduced motion
- mobile accessibility

Accessibility is a release requirement.

---

# 34. PHASE 25 — RESPONSIVE SYSTEM

Target:

Small Mobile
Large Mobile
Tablet
Laptop
Desktop
Large Desktop
Very Large Displays

Do not simply scale desktop down.

Explicitly validate:

- navigation
- hero composition
- CTA hierarchy
- typography
- card composition
- forms
- image crops
- case studies
- articles
- admin
- RTL

No horizontal overflow.

---

# 35. PHASE 26 — MEDIA SYSTEM

Support:

- hero image
- desktop screenshots
- mobile screenshots
- galleries
- architecture diagrams
- code screenshots
- video
- optional downloadable documents

Media entity:

```text
id
url
alt
caption
width
height
type
size
focalPoint
createdAt
```

Support:

- responsive rendering
- optimized sizes
- lazy loading
- appropriate priority
- modern image formats
- safe cropping

---

# 36. PHASE 27 — ADMIN / CMS

Admin sections:

Dashboard
Projects
Services
Service Packages
Articles
Categories
Tags
Messages
Consultations
Media
Testimonials
Recommendations
Navigation
Localization
Settings
Audit Log

## Project editor

Basic Information
SEO
Media
Technologies
Case Study Content
Links
Publishing
Ordering
Featured State

## Service editor

Basic Information
Audience
Problem
Scope
Deliverables
Packages
Add-ons
FAQ
Related Projects
SEO
Publishing

## Article editor

Draft
Preview
SEO
Category
Tags
Author
Content
Publishing

## Inquiry admin

New
Reviewed
Qualified
Contacted
Discovery
Proposal
Won
Lost
Archived

Never show fake business metrics.

---

# 37. PHASE 28 — RECOMMENDATIONS / TESTIMONIALS SYSTEM

Create support for two separate evidence types:

## Recommendation

A professional statement about working with the developer.

## Testimonial

A client statement tied to a project or service.

Support:

- draft
- moderation
- publish
- unpublish
- source URL
- relationship
- related work

Do not populate fake records.

---

# 38. PHASE 29 — NOTIFICATION SYSTEM

Provider abstraction:

Email
SMS
Future messaging providers

Events:

New Inquiry
Inquiry Confirmation
Consultation Request
Consultation Confirmation
Admin Notification
Article Published
System Error

Avoid provider lock-in.

---

# 39. PHASE 30 — SEO & DISCOVERABILITY

Support:

Metadata
Title
Description
Canonical URLs
Open Graph
Social metadata
Sitemap
Robots
Structured Data
hreflang
Breadcrumb schema
Article schema
Person schema where appropriate
WebSite schema
Project / portfolio schema where appropriate

Every important page must have unique metadata.

Do not keyword-stuff content.

---

# 40. PHASE 31 — ANALYTICS & PRIVACY

Track useful events only.

Examples:

page_view
project_view
service_view
cta_click
contact_start
contact_submit
consultation_start
consultation_booked
github_click
fiverr_click
article_view
search_used

Do not unnecessarily store sensitive form information.

Do not store passwords or payment credentials.

Create a privacy-conscious data strategy.

---

# 41. PHASE 32 — PERFORMANCE

Prefer:

- server-first rendering where appropriate
- minimal client JavaScript
- optimized media
- efficient caching
- lazy loading where appropriate
- efficient fonts
- minimal blocking resources
- careful third-party usage
- reusable components

Monitor:

LCP
CLS
INP
TTFB

Do not sacrifice performance for decorative effects.

---

# 42. PHASE 33 — SECURITY HARDENING

Review:

Authentication
Authorization
Validation
File Uploads
Rate Limiting
Spam Prevention
CSRF
XSS
SQL Injection
IDOR
Session Security
Secrets
Admin Access
Logging
Auditability

File upload requirements:

- validate type
- validate size
- safe naming
- storage boundary
- access policy
- scanning strategy where practical

Never trust browser-provided file metadata.

---

# 43. PHASE 34 — TESTING

## Unit

Validation
Formatters
Helpers
State transitions
Business rules

## Integration

Database
Contact submission
CMS mutations
Authorization
Media
Notifications

## E2E

Critical flows:

Homepage → Work → Case Study
Homepage → Services → Service
Homepage → Start Project → Submit
Language Switch
RTL Navigation
Theme Switch
Search
Admin Login
Create Project
Publish Article
Manage Inquiry

## Security

Unauthorized access
Invalid input
Rate limiting
File abuse
Authentication boundaries

---

# 44. PHASE 35 — CI/CD & RELEASE GATES

Pipeline:

```text
INSTALL
↓
TYPECHECK
↓
LINT
↓
UNIT TESTS
↓
INTEGRATION TESTS
↓
E2E CRITICAL FLOWS
↓
BUILD
↓
SECURITY CHECKS
↓
DEPLOY
```

A release must not proceed if critical gates fail.

Use preview environments where practical.

---

# 45. PHASE 36 — OBSERVABILITY

Implement:

- structured logging
- error tracking
- correlation IDs
- business event logging
- admin audit trail
- deployment visibility

Important events:

- inquiry submission
- consultation booking
- content publish
- admin mutations
- authentication events
- system failures

Errors must be diagnosable.

---

# 46. PHASE 37 — BACKUP & RECOVERY

Protect:

- database
- project data
- services
- articles
- recommendations
- settings
- media metadata

Create:

- backup policy
- restore procedure
- restore test
- rollback procedure
- recovery runbook

A backup that has never been restored must not be considered fully verified.

---

# 47. PHASE 38 — FINAL UX / DESIGN AUDIT

Audit every public and admin route.

Check:

Visual hierarchy
Typography
Spacing
Consistency
CTA clarity
Mobile behavior
RTL
Dark mode
Light mode
Accessibility
Motion
Empty states
Error states
Loading states
404
Search
Forms
Case studies
Services
Recommendations

Remove:

- dead interactions
- duplicated components
- visual inconsistencies
- fake content
- unused dependencies
- unnecessary effects

---

# 48. PHASE 39 — FINAL BUSINESS CONVERSION AUDIT

Ask:

Can a stranger understand Artaveo quickly?

Can they understand what is built?

Can they see real proof?

Can they understand expertise?

Can they understand services?

Can they compare service options?

Can they understand engagement models?

Can they understand the process?

Can they determine whether Artaveo is a fit?

Can they start a project easily?

Can they book a consultation when enabled?

Can they find GitHub?

Can they find Fiverr?

Can they find LinkedIn?

Can they use the site comfortably on mobile?

Can a Persian-speaking visitor use the complete system correctly?

If any critical answer is no:

The release is not complete.

---

# 49. PHASE 40 — FINAL SECURITY / PRODUCTION AUDIT

Review:

- auth boundaries
- authorization
- public mutation endpoints
- file uploads
- secret handling
- database access
- admin access
- audit logs
- privacy exposure
- rate limiting
- abuse controls
- dependencies
- headers / deployment configuration where relevant

Any critical unresolved issue blocks production release.

---

# 50. PHASE 41 — FINAL TECHNICAL / ARCHITECTURE AUDIT

Check:

- component boundaries
- domain boundaries
- service boundaries
- database relationships
- reusable types
- validation
- error handling
- state transitions
- external provider abstractions
- CMS extensibility
- localization architecture
- testing architecture
- deployment architecture

The system must be understandable by another professional developer without reverse engineering the entire product.

---

# 51. PHASE DEPENDENCY RULE

Dependency direction:

```text
Strategy
→ Information Architecture
→ Technical Foundation
→ Database
→ Security
→ Design System
→ Global Shell
→ Identity
→ Expertise
→ Homepage
→ Work
→ Case Studies
→ Services
→ Packages
→ Inquiry
→ Lead Management
→ Consultation
→ CMS
→ Localization
→ SEO
→ Performance
→ Testing
→ CI/CD
→ Observability
→ Recovery
→ Final Audit
```

Do not skip foundations because a later visual section is attractive.

Later phases may inform earlier design decisions, but they must not be used as an excuse to bypass core architecture.

---

# 52. HISTORICAL DEBT POLICY

Any issue discovered later must not silently rewrite previous history.

Classify new findings as:

BUG
TECHNICAL DEBT
ARCHITECTURAL DEBT
SECURITY DEBT
UX DEBT
CONTENT DEBT
PERFORMANCE DEBT
ACCESSIBILITY DEBT
HISTORICAL AUDIT FINDING

Do not change completed-phase status merely because a later audit reveals additional work.

---

# 53. DEFINITION OF DONE

No phase is complete because code exists.

Every phase must satisfy the relevant checks.

Minimum:

- implementation complete
- TypeScript passes
- lint passes
- tests appropriate to risk pass
- build passes
- smoke test passes
- responsive verification complete
- accessibility checked
- loading state checked
- empty state checked
- error state checked
- edge cases checked
- authorization checked where relevant
- security implications reviewed
- performance implications reviewed
- documentation updated
- known issues recorded
- architecture/tree updated where required
- roadmap status updated

For high-risk workflows also verify:

- concurrency
- idempotency
- retries
- failure recovery
- auditability

---

# 54. DOCUMENTATION ARCHITECTURE

```text
ROAD-MAP_ARTAVEO.md
  → overall direction, phases, standards, status, debt

README.md
  → project introduction, setup, architecture summary

docs/ADR-*.md
  → architectural decisions

docs/phases/PHASE-*.md
  → implementation and verification history

docs/runbooks/
  → deploy, rollback, backup, restore, operations

docs/testing.md
  → test strategy

docs/security.md
  → security model
```

The roadmap is the canonical planning document.

Phase documents preserve detailed implementation history.

---

# 55. REAL PROJECT STRATEGY

## Project 01

Transportation System

The case study must eventually expose the strongest real technical work without exaggeration.

Possible areas:

- booking
- operations
- database architecture
- authentication
- payments
- admin
- responsive design
- technical decisions
- challenges
- solutions
- repository
- live demo when available

## Project 02

Use the real existing second project.

Do not invent missing details.

Both projects should be presented as technical proof.

---

# 56. EXTERNAL CREDIBILITY SYSTEM

Support:

GitHub
Fiverr
LinkedIn
Other verified profiles

External links should reinforce the same narrative as the Artaveo website.

Do not invent activity counts, ratings, or endorsements.

Flow:

```text
ARTAVEO
→ WORK
→ CASE STUDY
→ GITHUB / LIVE DEMO
→ SERVICES
→ START PROJECT
```

---

# 57. FUTURE EXPANSION

Architecture should support future:

- more projects
- more services
- recommendations
- verified testimonials
- consultation booking
- proposal generation
- invoices
- payment integration
- client portal
- newsletter
- downloads
- technical resources
- public changelog
- availability page
- resume
- multilingual expansion
- calendar integration
- CRM integration
- email marketing
- advanced analytics

Do not implement all future capabilities immediately.

Prepare the architecture without prematurely increasing complexity.

---

# 58. RELEASE LEVELS

## LEVEL 1 — FOUNDATION

Brand
Design System
Global Shell
Home
Work
About
Services
Contact

## LEVEL 2 — PROFESSIONAL

Case Studies
Expertise System
Service Packages
Recommendations
Insights
Localization
Dark Mode
Search

## LEVEL 3 — FULL-STACK

Database
Authentication
Inquiry Management
Admin
CMS
Media
Notifications
Audit Trail

## LEVEL 4 — PRODUCTION

Security
Performance
SEO
Analytics
Testing
CI/CD
Monitoring
Backup
Recovery

## LEVEL 5 — INTERNATIONAL-GRADE

Consultation
Advanced content
CRM-ready workflows
Provider integrations
Advanced analytics
Scalability
Final audit

---

# 59. VISUAL QUALITY RULE

Premium quality should come from:

- typography
- spacing
- composition
- hierarchy
- content clarity
- interaction quality
- image quality
- restrained motion
- consistent design tokens

Not from:

- excessive gradients
- excessive glass
- endless rounded cards
- excessive 3D
- random animated shapes
- infinite marquee
- heavy parallax
- visual clutter

The site must remain premium without motion.

---

# 60. HONESTY / CONTENT SAFETY RULE

NEVER invent:

- clients
- reviews
- ratings
- years of experience
- awards
- team members
- enterprise partnerships
- revenue
- performance metrics
- customer counts
- project outcomes
- certifications

When data is missing, use an explicit placeholder or suppress the field.

Examples:

```text
[CLIENT_NAME]
[PROJECT_YEAR]
[PROJECT_RESULT]
[TESTIMONIAL]
[PROJECT_URL]
```

Never convert placeholder values into fictional production claims.

---

# 61. IMPLEMENTATION AGENT RULES

Work phase-by-phase.

For each phase:

1. inspect current state
2. identify dependencies
3. implement required scope
4. verify behavior
5. verify responsive behavior
6. verify accessibility where relevant
7. verify errors/empty/loading states
8. document result
9. record known issues
10. update roadmap
11. continue only after the phase is valid

Do not silently skip failed phases.

Do not mark unfinished functionality complete.

Do not replace required backend behavior with UI simulation.

When requirements conflict, prioritize:

1. data integrity
2. security
3. accessibility
4. maintainability
5. performance
6. UX polish

Benchmark decisions must remain explicit:

```text
ADOPT
ADAPT
REJECT WITH REASON
```

---

# 62. FINAL CREATIVE DIRECTION

Artaveo should feel like:

> A highly capable independent full-stack developer whose personal website has been engineered with the discipline of a serious digital product.

It should communicate:

WHO
WHAT
EXPERTISE
PROOF
SERVICES
PROCESS
ENGAGEMENT
HOW TO HIRE

without overwhelming the visitor.

The design must balance:

```text
PERSONAL
+
PROFESSIONAL
+
TECHNICAL
+
EDITORIAL
+
COMMERCIAL
```

Never become:

```text
CORPORATE
OR
GENERIC
OR
FAKE
```

---

# 63. FINAL SUCCESS CRITERIA

The project reaches final release only when:

> Artaveo presents a truthful, premium and internationally credible independent developer brand; real projects function as the strongest proof of capability; expertise is easy to understand; services are structured and actionable; productized service patterns are available where useful; recommendations and testimonials can be managed without fake evidence; engagement models are clear; potential clients can submit qualified inquiries safely; content can be managed through an appropriate CMS; English and Persian work correctly in LTR/RTL; light and dark themes are intentional; accessibility and performance meet the target standards; security boundaries are real; deployment is repeatable; failures are diagnosable; backup and recovery are verified; and another professional developer can understand, maintain and extend the application without reverse-engineering the entire system.

Final release decision:

**MANUAL APPROVAL REQUIRED.**

---

# 64. NON-NEGOTIABLE SUMMARY

```text
DO NOT BUILD A PRETTY PORTFOLIO ONLY.

BUILD A PROFESSIONAL FREELANCE BUSINESS PLATFORM.

USE REAL WORK AS PROOF.

MODEL EXPERTISE.

MODEL SERVICES.

MODEL PACKAGES.

MODEL ADD-ONS.

MODEL ENGAGEMENT.

MODEL INQUIRIES.

MODEL ADMIN.

MODEL CONTENT.

KEEP SECURITY REAL.

KEEP RTL REAL.

KEEP ACCESSIBILITY REAL.

KEEP PERFORMANCE REAL.

KEEP ALL CLAIMS TRUTHFUL.

USE BENCHMARKS AS PATTERNS,
NOT AS VISUAL COPYING.

EVERY PHASE MUST BE VERIFIED.
```


# 62. PHASE COMPLETION PROTOCOL & ARTIFACT DELIVERY

This section is mandatory for every implementation phase.

A phase is not considered closed until both the code work AND the phase handoff package are complete.

## 62.1 Required phase handoff

After completing each phase, the implementation agent MUST produce and preserve:

1. updated source code
2. tests relevant to the phase
3. phase verification results
4. updated roadmap status
5. a phase changelog / implementation record
6. a list of changed files
7. known issues / remaining debt
8. rollback notes where applicable
9. the final project tree/state summary
10. a distributable ZIP archive of the project state for that phase, excluding generated/dependency directories unless explicitly required

## 62.2 Master ROAD-MAP update rule

After every completed phase:

- update `ROAD-MAP_ARTAVEO.md`
- mark the exact phase/sub-phase status
- record completion date
- record what was implemented
- record verification performed
- record known limitations
- record newly discovered debt
- record the next recommended phase

Never leave the roadmap describing an older state after the phase has actually been completed.

Do NOT rewrite historical completed phases merely because later audits discover additional work.

## 62.3 Phase document rule

For every substantial phase, create or update:

`docs/phases/PHASE-X-README.md`

The phase document must contain:

- objective
- scope
- dependencies
- implementation summary
- architecture decisions
- changed files
- database changes
- migrations
- tests
- manual verification
- screenshots or verification evidence where useful
- known issues
- technical debt
- rollback considerations
- final status

## 62.4 ZIP delivery rule

At phase completion, create a clean archive representing the verified project state.

Naming convention:

`artaveo-phase-X-complete.zip`

For sub-phases:

`artaveo-phase-X-Y-complete.zip`

The archive SHOULD exclude:

- `node_modules/`
- `.next/`
- build caches
- temporary files
- local secrets
- `.env` files containing credentials
- editor/system junk

The archive SHOULD include everything required to reproduce the completed phase, including source code, migrations, configuration templates, documentation, tests, and public assets.

Never place secrets in the archive.

## 62.5 Completion report

For each phase, the implementation agent must finish with a structured completion report:

```text
PHASE: X
STATUS: COMPLETE / BLOCKED / PARTIAL

IMPLEMENTED:
- ...

VERIFIED:
- typecheck
- lint
- tests
- build
- smoke test
- responsive
- accessibility
- security review

FILES CHANGED:
- ...

DATABASE / MIGRATION CHANGES:
- ...

KNOWN ISSUES:
- ...

NEW DEBT:
- ...

ARTIFACT:
artaveo-phase-X-complete.zip

ROADMAP UPDATED:
YES

NEXT PHASE:
X+1
```

## 62.6 Blocked phase rule

If a phase cannot be completed because of:

- missing external credentials
- unavailable provider
- unresolved product decision
- infrastructure dependency
- stakeholder approval

the agent must mark the phase:

`BLOCKED`

and record:

- exact blocker
- impact
- what has already been completed safely
- required dependency
- next action

A blocked phase must never be falsely marked complete.

## 62.7 No destructive handoff

Before creating the phase archive:

- ensure the project builds from a clean state where practical
- ensure no secrets are included
- ensure temporary debug code is removed
- ensure generated junk is excluded
- ensure the roadmap and phase documentation match the delivered source state

The archive must represent the verified source state, not an unverified working directory.

