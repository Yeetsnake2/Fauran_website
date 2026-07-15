# Fauran — Design System (LOCKED · Phase 1)

> This is the single visual source of truth. **Every component references these tokens and
> classes — no ad-hoc hex values, no one-off shadows, no other fonts.** Tokens live in
> `src/styles/global.css` (Tailwind v4 `@theme` + recipe classes). If you need something not
> here, it probably shouldn't exist — reuse a token.

---

## 0. The idea in one line

Fauran means **"immediately."** The site is **carved from a quiet, tactile surface** (neomorphism) and
**live marketplace elements float above it in glass** (liquid-glass-morphism). Neomorphism is the *material*;
glass is only for things that are *alive right now* — an arriving bid, the sticky CTA, a verified badge.
That single rule keeps the fusion coherent *and* caps expensive blur — which we must, for mid-range Android
on metered data in Pakistan.

**Signature element:** a **neomorphic phone in the hero** that crossfades through real Fauran app screens
(sign-in → home → post a task → offer → tasker view). Seeing the actual product *is* the pitch. The phone is
carved from the same surface as everything else and uses **no glass/backdrop-blur** (the screenshots are
opaque). Spend boldness here; keep everything else quiet. *(Superseded the earlier CSS "arriving bid card"
concept once real app screens became available — see §8.)*

---

## 1. Color (use token names, never raw hex)

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#E7EDE9` | Page background **and** the hue tiles are carved from (neomorphism needs one hue). |
| `surface` | `#EAF0EC` | Raised neomorphic tile fill. |
| `surface-sunken` | `#E0E7E2` | Pressed states, input wells. |
| `ink` | `#10201A` | Primary text (~13:1 on canvas). Never pure black. |
| `ink-soft` | `#384A42` | Secondary text / body (~7.4:1). |
| `ink-faint` | `#566C62` | Captions, meta — **≥14px only** (~4.8:1). |
| `forest` | `#1B6E3E` | **Primary** — CTA fill, links, labels. AA on canvas, AAA with white text. |
| `forest-deep` | `#14562F` | Pressed CTA. |
| `mint` | `#3AA961` | Logo green. Accents, borders, gradients — **graphic only, not text** (~3:1). |
| `mint-bright` | `#46C46F` | Gradient/glow top stop. |
| `marigold` | `#E7A02E` | **Reserved for money** — bids/prices/one hero spark. Fills only, not body text. |
| `marigold-deep` | `#8A5312` | Amber text on light if unavoidable (AA). |
| `danger` | `#C0392B` | Errors only. |

**Rules**
- Green is the brand + trust + "go" (and quietly, Pakistan). **Marigold appears only around bids and prices** —
  it's a structural signal ("money moves here"), not decoration. Do not sprinkle it elsewhere.
- Text contrast ≥ 4.5:1 always. If putting text on `mint`/`marigold`, use white on a `forest`/`marigold-deep`
  fill instead — never `mint` text on `canvas`.
- Tailwind utilities are generated from tokens: `bg-canvas`, `text-forest`, `border-line`, etc.

## 2. Typography (no Inter, no Roboto)

| Role | Family | Token | Notes |
|---|---|---|---|
| Display | **Bricolage Grotesque** (variable) | `font-display` | Headlines h1–h4. Weight 700, tight tracking (`-0.02em`), `line-height:1.04`. Set via base styles already. |
| Body / UI | **Hanken Grotesk** (variable) | `font-sans` | Everything running-text. 400/500/600. |
| Data | **Geist Mono** | `font-mono` / `.data` | **Only** for marketplace numbers: PKR amounts, distances (km), ETAs (min), the 4-digit code, `+92`. Tabular figures on. |

Fluid sizes (already classed): `.t-hero`, `.t-h2`, `.t-h3`, `.t-lead`. Use these for section headings/leads so
scale stays consistent. Body copy defaults to ~1rem/1.55.

**Do:** use `.data` on any number that represents live marketplace info.
**Don't:** use the mono for prose, or the display face below ~1.2rem.

## 3. Elevation vocabulary (the whole component kit)

Consume these classes — do not hand-roll shadows.

- **`.neo-raised` / `.neo-raised-sm` / `.neo-raised-lg`** — extruded tiles/cards. The default surface for
  structural content (feature cards, step tiles, the phone frame).
- **`.neo-inset`** — sunken well (inputs use `.field`, which is built on this).
- **`.glass` (+ optional `.glass-sheen`)** — translucent float. **Budget: ≤ 3 element *types* per page**
  (arriving bid card, sticky CTA, verified/trust badges). Never a full-width blurred bar. `.glass-sheen` adds
  the specular top edge — use on the bid card.
- Elevation pressed/hover transitions are built into `.btn`, `.btn-ghost`, `.chip`.

**Perf guardrails (non-negotiable):**
- `backdrop-filter` blur ≤ 14px, on small elements only. It is the most expensive thing on the page.
- Neomorphic shadows are multi-layer — reserve them for interactive/hero elements, not every `<div>`.
- Fallbacks already handled in CSS: `prefers-reduced-transparency` → solid; unsupported `backdrop-filter` →
  solid tint. Don't defeat them.

## 4. Radius, spacing, layout

- Radii tokens: `--radius-sm..xl`, `--radius-pill`. Cards use `lg`/`xl`; chips/buttons use `pill`; inputs `md`.
- Section wrapper: `.section` (vertical rhythm) + `.wrap` (max-width 72rem, fluid gutters). **Every section uses
  `<section class="section"><div class="wrap">…</div></section>`** so spacing/gutters are identical everywhere.
- **Mobile-first at 375px.** Design the single column first; reflow up at `sm 640` / `lg 1024` / `xl 1280` with
  Tailwind responsive prefixes. No horizontal scroll at any width — wide content scrolls inside its own box.
- Touch targets ≥ 44×44px (`.btn` min-height 3rem, `.chip` sized accordingly).

## 5. Interactive primitives

| Class | What | Press behavior |
|---|---|---|
| `.btn` | Primary green pill CTA, white text | lifts on hover, `forest-deep` on active |
| `.btn-ghost` | Neomorphic secondary (forest text on surface) | raises → pressed inset |
| `.chip` | Category/tag pill | springy lift; `data-active="true"` = inset |
| `.field` | Text/tel input (sunken well) | mint focus ring, 3px |
| `.eyebrow` | Mono section label with a rule | structural, states section identity |

There are also shared `.astro` primitives in `src/components/primitives/` — **prefer them**:
`Section.astro` (wraps `.section`+`.wrap` + eyebrow/heading), `NeoCard.astro`, `GlassCard.astro`,
`Button.astro`, `Logo.astro`, `Icon.astro`. Read them before writing markup.

## 6. Motion (lively but light)

- Easing tokens: `--ease-quint` (snappy decelerate, no overshoot), `--ease-out` (softer). **No bounce/elastic.**
- Utility animations: `.animate-rise` (section/content entrance), `.animate-bid` (the signature bid arrival —
  has a *subtle* settle, intentional, signature-only), `[data-stagger]` with `--i` for staggered lists.
- Keep motion to: one hero load sequence, hover/press micro-states, and scroll-reveal on entrance. Everything
  respects `prefers-reduced-motion` (globally disabled in CSS). Do not add JS animation libraries.
- Logo speed-lines may animate in on load (draw). ETA "pulse ring" (`pulse-ring` keyframe) is available for the
  live/proximity motif — use once, sparingly.

## 7. Iconography

- Inline SVG only (no icon font, no external requests). 1.5px–2px stroke, `currentColor`, rounded caps/joins,
  24px grid. Use `Icon.astro`. Keep the set tiny (trades, location pin, shield/check, chat, star, bolt).

## 8. Imagery

- **Hero app screens (the one intentional raster):** real Fauran app screenshots power the hero phone
  (`PhoneMockup.astro`, served from `public/screens/*.webp`). They are cropped (status bar/gesture pill
  trimmed), optimized WebP (~93 KB for all five), given explicit `width`/`height` (600×1252), and shown in a
  well with a reserved `aspect-ratio` so CLS stays < 0.1. Screen 1 loads eagerly; 2–5 are `fetchpriority="low"`.
  This is a deliberate exception to the site's otherwise CSS/SVG-only imagery — seeing the real product earns it.
- **No decorative raster photography elsewhere.** Anywhere else, prefer CSS/SVG. Any image added must be
  WebP/AVIF, lazy where below the fold, `width`/`height` set, sized per breakpoint, space reserved (CLS < 0.1).
- The logo ships as inline SVG (`Logo.astro`), recolored via `currentColor`/tokens.

> **Product-truth note:** the current app screens reflect an **hourly-rate + JazzCash/EasyPaisa escrow** model,
> which differs from the PRD-grounded body copy (fixed-price bids, prepaid wallet, CNIC+selfie, "cash paid
> directly"). Reconcile copy ⇄ product before launch — see COPY_BRIEF.md.

## 9. Voice (from COPY_BRIEF.md)

Confident, plain, warm, fast. PKR + Pakistani cities + the Urdu tagline used with pride. Sentence case. Active
voice on every control ("Join the waitlist", not "Submit"). No hype, no fake urgency, no unverifiable numbers.
**All product claims come from `COPY_BRIEF.md` — do not invent facts.** Unknown contact details = literal
`[PLACEHOLDER]`.

## 10. Definition-of-done hooks for every component

- Uses only tokens/classes above. `grep` your file for stray `#` hex — there should be none (except inside SVG
  brand paths where unavoidable, and even then prefer `currentColor`).
- Renders clean at 375 / 640 / 1024 / 1280. No horizontal overflow.
- Keyboard-focusable interactive elements show the focus ring. Contrast ≥ 4.5:1.
- Any number that is marketplace data wears `.data`.
- Motion respects reduced-motion; glass respects reduced-transparency (inherited from global CSS).
