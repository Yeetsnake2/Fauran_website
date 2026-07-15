# Fauran — Waitlist Site

The public waitlist / marketing site for **Fauran**, Pakistan's bid-and-book services marketplace
("Ab Kam Hoga, Fauran"). This is a separate, lightweight static site — **not** the Flutter/Supabase app.

- **Stack:** Astro 7 (TypeScript strict) · Tailwind CSS v4 · Firestore (waitlist writes) · static output (Vercel/Netlify).
- **Design system:** see [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md). Copy source of truth: [`COPY_BRIEF.md`](./COPY_BRIEF.md).
- **Aesthetic:** a neomorphism + liquid-glass fusion in a sage-green Fauran identity. Mobile-first, built for
  mid-range Android on metered data — the performance budget is deliberate.

## Quick start

```bash
npm install
cp .env.example .env      # then fill in your Firebase Web config (see below)
npm run dev               # http://localhost:4321
npm run build             # static output → dist/
npm run preview           # serve the built site locally
```

## Environment / Firebase

The waitlist write is **client-side**, protected by create-only Firestore security rules — the Firebase Web
config is not a secret (access control is the rules, not key secrecy). All values come from `PUBLIC_*` env
vars; **nothing is hardcoded**. Copy `.env.example` → `.env` and fill in:

```
PUBLIC_FIREBASE_API_KEY, PUBLIC_FIREBASE_AUTH_DOMAIN, PUBLIC_FIREBASE_PROJECT_ID,
PUBLIC_FIREBASE_STORAGE_BUCKET, PUBLIC_FIREBASE_MESSAGING_SENDER_ID, PUBLIC_FIREBASE_APP_ID
```

If these are unset, the form fails gracefully with a friendly message (it does not crash).

### Firestore collection & rules

- The site writes **only** to a dedicated `waitlist_signups` collection. It never reads, writes, or references
  any app collection (`users`, `bookings`, …).
- Rules ([`firestore.rules`](./firestore.rules)) are **create-only** with strict field validation and a
  server-pinned timestamp. Read / update / delete are denied; every other collection is denied (defense in depth).

Deploy the rules to your project:

```bash
npm i -g firebase-tools     # once
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules
```

### Verifying the rules (create-only test)

A rules unit test lives in [`tests/firestore-rules.test.ts`](./tests/firestore-rules.test.ts). It requires the
Firestore emulator (Java + firebase-tools):

```bash
npx firebase emulators:exec --only firestore "npm run test:rules"
```

> ⚠️ This test could **not** be run in the build environment (no Java / firebase-tools there). Run it once
> against the emulator before launch to confirm create-only behavior end-to-end.

## Anti-spam

The form is protected by: a hidden **honeypot** field (`website`), a **time-to-submit** check (sub-second
submits are ignored), client-side **validation**, a lightweight per-browser **rate limit**, and the server-side
**create-only rules**. For production, also enable **Firebase App Check** (reCAPTCHA v3) on the project to block
automated writes at the API layer.

## Before launch — replace these `[PLACEHOLDER]`s

Search the repo for the literal string to find everything that needs real values:

```bash
grep -rn "\[PLACEHOLDER\]" --exclude-dir=node_modules --exclude-dir=dist .
```

Known placeholders: Firebase config (`.env`), footer contact (email, phone, socials), company registration,
privacy/terms links. Also replace `public/og.svg` with a **1200×630 raster** (PNG/JPG) social image, and update
the `site` URL in `astro.config.mjs` if the domain differs from `fauran.pk`.

## Deploy

Static output, host-agnostic:

- **Vercel:** framework preset "Astro", build `npm run build`, output `dist`. Add the `PUBLIC_FIREBASE_*` env vars.
- **Netlify:** build `npm run build`, publish `dist`. Add the env vars.

## Project structure

```
src/
  layouts/Base.astro            # <head>, SEO/OG, skip-link, scroll-reveal
  pages/index.astro             # assembles the sections
  styles/global.css             # design tokens (@theme) + recipe classes
  lib/
    firebase.ts                 # Firebase init from PUBLIC_ env (only waitlist.ts imports it)
    waitlist.ts                 # THE single backend abstraction — swap here for Supabase later
  components/
    primitives/                 # Logo, Icon, Section, NeoCard, GlassCard, Button
    Hero, Problem, Solution, Features, Trust, Waitlist, StickyCta, Faq, Footer
firestore.rules                 # create-only waitlist rules
tests/firestore-rules.test.ts   # rules unit test (needs emulator)
```

## Migration note

The Fauran app is migrating to Supabase; this site uses **Firestore for now**, isolated behind
`src/lib/waitlist.ts`. To switch, replace the `firestoreBackend` implementation in that one file — the form,
validation, and UI stay untouched.
