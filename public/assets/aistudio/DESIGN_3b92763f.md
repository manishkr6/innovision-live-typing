---
name: INNOVISION 2026 Design System
colors:
  paper: '#FBF8F3'
  paper-deep: '#F3EDE3'
  ink: '#1C1917'
  ink-soft: '#3F3A36'
  ink-muted: '#5F5852'
  ink-line: '#E2D9CC'
  marigold-50: '#FFF4EC'
  marigold-100: '#FDE3D0'
  marigold-400: '#FB923C'
  marigold-500: '#C2410C'
  marigold-600: '#9A3412'
  marigold-700: '#7C2D12'
  flag-blue: '#2456A6'
  flag-red: '#C2412D'
  flag-green: '#2F7D4F'
  flag-yellow: '#D99A0B'
  flag-redText: '#9B2C1C'
  flag-greenText: '#24603D'
  night: '#17151F'
  cyber-dark: '#0B0F19'
  cyber-darker: '#07090E'
  cyber-card: '#0D111C'
  cyber-cardHover: '#131B2E'
  cyber-surface: '#111726'
  cyber-border: 'rgba(255, 255, 255, 0.08)'
  cyber-purple: '#6366F1'
  cyber-blue: '#3B82F6'
  cyber-cyan: '#38BDF8'
  cyber-pink: '#818CF8'
typography:
  display-hero:
    fontFamily: Bricolage Grotesque
    fontSize: 5rem
    fontWeight: '800'
    lineHeight: '0.9'
    letterSpacing: -0.04em
  display-hero-mobile:
    fontFamily: Bricolage Grotesque
    fontSize: 3.25rem
    fontWeight: '800'
    lineHeight: '0.9'
    letterSpacing: -0.03em
  headline-xl:
    fontFamily: Bricolage Grotesque
    fontSize: 3rem
    fontWeight: '800'
    lineHeight: '1.05'
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 2.25rem
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Bricolage Grotesque
    fontSize: 1.5rem
    fontWeight: '700'
    lineHeight: '1.25'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Bricolage Grotesque
    fontSize: 1.125rem
    fontWeight: '700'
    lineHeight: '1.35'
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: '1.75'
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0em
  label-caps:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.08em
  code-mono:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.04em
rounded:
  sm: 0.375rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  2xl: 2rem
  full: 9999px
spacing:
  section-py: 6rem
  section-py-mobile: 4.5rem
  container-max: 80rem
  gutter: 1.5rem
  gutter-mobile: 1rem
---

# INNOVISION 2026 — Design System & Specification

## 1. Brand Identity & Design Movement

**INNOVISION 2026** is the premier annual IT and cultural festival of the **Faculty of Science & Technology (FST)** at **The ICFAI University, Sikkim**, held in association with the **Institution’s Innovation Council (IIC)**, Ministry of Education, Government of India.

### Design Persona & Philosophy
- **Style Direction:** *Himalayan Warmth meets High-Voltage Tech & Collegiate Competition*.
- **Tactile Paper Substrate:** Grounded in a warm, physical, publication-grade paper substrate (`#FBF8F3` / `#F3EDE3`) paired with dense charcoal ink typography (`#1C1917`), moving away from clichéd dark-mode web templates while retaining maximum readability.
- **Deep Himalayan Saffron / Marigold:** Radiating ceremonial warmth, festivity, and intellectual energy through fiery saffron accents (`#C2410C` to `#FB923C`).
- **Prayer-Flag Track Colors:** Four distinct symbolic colors honoring local Sikkim culture, used to segment the fest's 12 competitions into recognizable tracks (Technical Blue, Strategy Yellow, Esports Red, Creative Green).
- **Night Arena (Esports & Hero):** An obsidian-indigo arena (`#17151F`) creating spatial drama for esports, keynote spotlights, and late-night stage events.
- **Micro-Interactions & Physics:** Tactile physics via Lenis smooth scrolling, Framer Motion staggered reveals, interactive 3D `TiltCard` components with specular glare, magnetic buttons, and confetti celebration triggers.

---

## 2. Color Palette & Tokens

### 2.1 The Paper & Ink Foundation (Light Mode / Editorial Substrate)
| Token | Hex / Value | WCAG Contrast / Usage |
| :--- | :--- | :--- |
| `paper` (DEFAULT) | `#FBF8F3` | Default application canvas background |
| `paper.deep` | `#F3EDE3` | Alternating section containers, card skeletons, badge backing |
| `ink` (DEFAULT) | `#1C1917` | Primary headlines, active tab buttons, high-contrast badges |
| `ink.soft` | `#3F3A36` | Narrative body paragraphs, descriptive copy (Contrast ≥ 11:1) |
| `ink.muted` | `#5F5852` | Subtitles, metadata labels, icon accents (Contrast ≥ 7:1) |
| `ink.line` | `#E2D9CC` | Subtle 1px structural dividing lines and card borders |

### 2.2 Saffron & Marigold Accent Suite
| Token | Hex | Role & Functional Application |
| :--- | :--- | :--- |
| `marigold.50` | `#FFF4EC` | Light alert boxes, notification panels |
| `marigold.100` | `#FDE3D0` | Text selection background (`selection:bg-marigold-100`), prize medal pills |
| `marigold.400` | `#FB923C` | Glowing accent highlights on dark surfaces (`#17151F`), hero subtitle |
| `marigold.500` | `#C2410C` | Primary CTA button background, marquee banner fill, logo emblem |
| `marigold.600` | `#9A3412` | Section kicker tags, link hovers, active arrow indicators |
| `marigold.700` | `#7C2D12` | High-contrast accent typography on paper surfaces (Contrast ≥ 7:1) |

### 2.3 Himalayan Prayer-Flag Track System
Used to categorize events across all grids, detail views, and pass tickets:
- **Track A — Technical:**
  - `flag.blue`: `#2456A6`
  - Chip Class: `bg-flag-blue/15 text-flag-blue`
- **Track B — Strategy:**
  - `flag.yellow`: `#D99A0B`
  - Chip Class: `bg-flag-yellow/25 text-marigold-700`
- **Track C — Esports:**
  - `flag.red`: `#C2412D`
  - `flag.redText`: `#9B2C1C`
  - Chip Class: `bg-flag-red/15 text-flag-redText`
- **Track D — Creative:**
  - `flag.green`: `#2F7D4F`
  - `flag.greenText`: `#24603D`
  - Chip Class: `bg-flag-green/15 text-flag-greenText`

### 2.4 Night Arena & Cyber Palette (Dark Mode Moments)
| Token | Hex / Value | Context |
| :--- | :--- | :--- |
| `night` | `#17151F` | Esports spotlight background, hero background, footer fill |
| `cyber.dark` | `#0B0F19` | Deepest dark backdrop layer |
| `cyber.card` | `#0D111C` | Elevated dark card background |
| `cyber.cardHover` | `#131B2E` | Hover state for dark cards |
| `cyber.border` | `rgba(255, 255, 255, 0.08)` | Translucent boundary line on dark surfaces |
| `cyber.cyan` | `#38BDF8` | Focus ring on dark surfaces, secondary cyber accent |
| `cyber.purple` | `#6366F1` | Electric gradient stop for title shimmer |

---

## 3. Typography Architecture

Loaded via Google Fonts: **Bricolage Grotesque**, **Inter**, **Bebas Neue**, **Anton**, **Space Grotesk**, and **JetBrains Mono**.

```
Display & Headings:   Bricolage Grotesque (opsz 12..96, 500/700/800)
Body Prose & Forms:   Inter (400/500/600/700)
Esports & Badges:     Bebas Neue / Anton
Technical Monospace:  JetBrains Mono (300/400/500/700)
```

### 3.1 Typographic Scale & Hierarchy
- **Hero Display (`display-hero`):**
  - Desktop: `font-heading font-extrabold text-8xl` (96px), `leading-[0.9]`, `tracking-tight`
  - Mobile: `text-[3.25rem]` (52px), `leading-[0.9]`, `tracking-tight`
- **Section Headlines (H2 / `headline-xl`):**
  - `font-heading font-extrabold text-4xl sm:text-5xl` (36px–48px), `leading-[1.05]`, `tracking-tight`
- **Component / Card Headings (H3 / `headline-md`):**
  - `font-heading font-bold text-2xl` (24px), `leading-tight`
- **Sub-Items & Accordion Titles (H4 / `headline-sm`):**
  - `font-heading font-bold text-lg sm:text-xl` (18px–20px)
- **Section Kicker / Overline:**
  - `text-xs sm:text-sm font-semibold uppercase tracking-wider text-marigold-600`
- **Body Standard:**
  - `font-sans text-sm sm:text-base text-ink-soft leading-relaxed`
- **Data & Telemetry:**
  - `font-mono text-xs sm:text-sm text-ink-muted` (IDs, time, coordinates, room numbers)

---

## 4. Spacing, Grid & Layout

- **Container Constraint:** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` (1280px standard container)
- **Vertical Section Rhythm:** `py-20 sm:py-28` (80px to 112px padding between page milestones)
- **Grid Layouts:**
  - **Hero:** Asymmetric split `grid lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-16 items-end`
  - **Events Catalog:** Responsive 3-column grid `grid sm:grid-cols-2 lg:grid-cols-3 gap-6`
  - **Esports Arena:** Equal 3-column card grid `grid md:grid-cols-3 gap-6`
  - **How to Take Part:** Asymmetric `grid lg:grid-cols-[1.3fr_1fr] gap-12 lg:gap-16`
  - **Footer:** 4-column asymmetric `grid md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_0.8fr] gap-10`

---

## 5. Shape, Border Radii & Elevation

### 5.1 Corner Geometry
- **Pill (`rounded-full` / 9999px):**
  - Primary & secondary action buttons (`px-7 py-3.5 rounded-full`)
  - Filter category tabs (`px-4 py-2 rounded-full`)
  - Search input box (`rounded-full`)
  - Status indicators & track badges (`px-3 py-1 rounded-full text-xs`)
- **Large Cards & Sections (`rounded-3xl` / 24px):**
  - Event cards, esports cards, countdown timer card, modal dialogue, section hero cards
- **Medium Panels (`rounded-2xl` / 16px):**
  - Metric counters, prize list tiles, rule accordion cards
- **Small Details (`rounded-xl` / 12px):**
  - Form inputs (`rounded-xl px-4 py-3`), brand logo monogram `IV` (`w-10 h-10 rounded-xl`)

### 5.2 Elevation & Borders
- **Paper Framing:** Defined by crisp 1px borders (`border border-ink-line`) rather than heavy drop shadows.
- **Subtle Elevation (`shadow-sm`, `shadow-xl`):** Soft, diffused ambient depth:
  - `shadow-sm`: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
  - `shadow-xl`: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)`
  - `shadow-2xl shadow-black/30`: Floating countdown timer and registration cards
- **Glassmorphism:**
  - Header: `bg-paper/95 backdrop-blur-md border-b border-ink-line`
  - Dark Glass: `background: rgba(13, 17, 28, 0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08);`

---

## 6. Component Specs & Patterns

### 6.1 Buttons & Interactive Triggers
- **Primary Action (Saffron Filled):**
  ```jsx
  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-marigold-500 hover:bg-marigold-600 text-white font-semibold shadow-lg shadow-black/20 transition-colors"
  ```
- **Secondary Action (Dark / Glassmorphic):**
  ```jsx
  className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-night/60 hover:bg-night/80 backdrop-blur border border-white/40 text-white font-semibold transition-colors"
  ```
- **Ink Action (Primary on Light Paper):**
  ```jsx
  className="inline-flex items-center justify-center gap-2 rounded-full bg-ink hover:bg-ink-soft text-white px-7 py-3.5 font-semibold transition-colors"
  ```
- **Button Shimmer Effect (`.btn-shimmer-sweep`):**
  Animated 45° angled white sheen sweeping across button surfaces at 4s intervals.

### 6.2 Filter Chips & Tab Bar
- Active Tab: `bg-ink text-white border-ink rounded-full px-4 py-2 text-sm font-medium`
- Inactive Tab: `bg-white text-ink-soft border-ink-line hover:border-ink-muted rounded-full px-4 py-2 text-sm font-medium`

### 6.3 Event Card Pattern
- 16:10 aspect ratio image container with smooth `scale-105` zoom on group hover.
- Track pill chip in top-left of content body (`bg-flag-blue/15 text-flag-blue`).
- Title in `font-heading font-bold text-2xl text-ink`.
- Location with `MapPin` icon in muted ink.
- Hairline bottom divider with team size pill (`Users` icon) and "Details →" CTA in `marigold-600`.

### 6.4 Marquee Strip
- Continuous infinite horizontal scrolling banner (`animate-marquee` 25s linear infinite).
- Pauses on user pointer hover (`hover:[animation-play-state:paused]`).
- Background in `bg-marigold-500`.
- Text in `font-heading font-bold text-white`.
- Separators cycle through four prayer-flag colors: `bg-flag-blue`, `bg-flag-red`, `bg-flag-green`, `bg-flag-yellow`.

### 6.5 Form Inputs & Validation
- Container: `rounded-xl bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:border-gray-900 transition-colors`.
- Error State: `border-rose-500 focus:border-rose-600` accompanied by an inline error notice with `AlertCircle`.
- Left icon adornment: Absolutely positioned Lucide icon (`pointer-events-none text-gray-400`).

---

## 7. Motion, Micro-Interactions & Physics

- **Smooth Scroll (Lenis):** Custom inertia scroll physics with header offset clearing.
- **Staggered Viewport Reveal (`Reveal.jsx`):**
  - Framer Motion animation: `initial={{ opacity: 0, y: 28 }}`, `whileInView={{ opacity: 1, y: 0 }}`, `transition={{ duration: 0.6, ease: 'easeOut' }}`.
- **3D Tilt (`TiltCard.jsx`):**
  - Spring-damped 3D perspective rotation tracking mouse cursor (`transformPerspective: 1000`, `damping: 20`, `stiffness: 200`).
  - Specular radial gradient glare layer following cursor position.
- **Magnetic Buttons (`MagneticButton.jsx`):**
  - Smooth spring cursor attraction (`damping: 15, stiffness: 150`).
- **Registration Celebration:**
  - Canvas confetti particle burst upon completed registration (`confetti({ particleCount: 80, colors: ['#C2410C', '#2456A6', '#2F7D4F', '#D99A0B'] })`).
- **Accessibility Safeguard:**
  - Complete `prefers-reduced-motion` compliance. All animated components instantly revert to static render states.

---

## 8. Accessibility & Ergonomics

1. **WCAG AA Compliance:**
   - White text on `marigold.500` (`#C2410C`) achieves a contrast ratio of **5.2:1**.
   - `marigold.600` (`#9A3412`) and `marigold.700` (`#7C2D12`) on `paper` (`#FBF8F3`) achieve contrast ratios **≥ 6.9:1**.
   - `marigold.400` (`#FB923C`) on `night` (`#17151F`) achieves a contrast ratio of **8:1**.
2. **Keyboard Navigation & Focus Visible:**
   - Globally styled focus outline: `outline: 2px solid #C2410C; outline-offset: 3px; border-radius: 6px;`.
   - On dark mode components: `outline: 2px solid #38BDF8; outline-offset: 2px;`.
3. **Screen Readers & ARIA:**
   - Anchor elements use semantic tags and `aria-label` / `aria-expanded` attributes.
   - Decorative elements (such as marquee tickers) use `aria-hidden="true"`.
   - Dynamic states (live ping, countdown timer, search query clearing) contain descriptive text for assistive technology.

