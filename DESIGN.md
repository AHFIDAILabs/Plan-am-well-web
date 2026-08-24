# PlanAmWell Web — Design System

This documents the reconciled web design system after aligning the app with the "Empathetic Modernism" design brief and Stitch mockups. It describes the result as shipped, not the source brief.

## Design tokens

Tokens live in `src/app/globals.css`, wired through Tailwind v4's `@theme inline`. The brief's full Material-3-style token set (~35 keys, including `-fixed`/`-fixed-dim` pairs for light/dark switching) was **deliberately collapsed** to a smaller set: this app is a single, fixed light theme with no dark mode, so `fixed`/`fixed-dim` pairs would just be duplicate values under two names — collapsing them removes a false-choice trap for future edits.

| Token | Hex | Use |
|---|---|---|
| `--color-primary` | `#b10045` | Primary actions, links, active nav |
| `--color-primary-dark` | `#8f0037` | Primary hover state |
| `--color-on-primary` | `#ffffff` | Text/icons on primary |
| `--color-primary-container` | `#d81e5b` | Primary-tinted containers |
| `--color-secondary` | `#835500` | Secondary actions |
| `--color-on-secondary` | `#ffffff` | Text on secondary |
| `--color-secondary-container` | `#feae2c` | Amber accent containers |
| `--color-tertiary` | `#0058a4` | "Medical blue" — tertiary actions, informational accents |
| `--color-on-tertiary` | `#ffffff` | Text on tertiary |
| `--color-tertiary-container` | `#0b71cd` | Tertiary-tinted containers |
| `--color-error` / `--color-on-error` / `--color-error-container` | `#ba1a1a` / `#ffffff` / `#ffdad6` | Errors, Quick Exit |
| `--color-heading` / `--color-body` / `--color-muted` | `#1c1b1b` / `#5b4043` / `#7a6265` | Text tiers |
| `--color-page-bg` / `--color-card-bg` / `--color-input-bg` | `#fcf9f8` / `#ffffff` / `#f0eded` | Surfaces |
| `--color-border` / `--color-outline` | `#e3bdc2` / `#8f6f73` | Borders/outlines |
| `--color-accent-{pink,amber,gray,blue}-{bg,fg}` | — | Category-tinted chips/badges, repointed onto the new palette's fixed containers |
| `--radius-card` (`rounded-card`) | `28px` | Standard card radius |
| `--shadow-atmospheric` (`shadow-atmospheric`) | `0 4px 20px rgba(0,0,0,0.04)` | Soft diffused card shadow — no heavy borders/drop shadows |

Buttons and inputs are pill-shaped (`rounded-full`, `h-14`). Cards use `rounded-card` + `shadow-atmospheric` with no border. Modals/overlays use glassmorphism (`bg-card-bg/90 backdrop-blur-xl`).

## Component inventory (`src/components/ui/`)

| Component | Notes |
|---|---|
| `Button` | Variants: `primary`, `secondary`, `tertiary`, `outline`, `ghost`. Pill-shaped, 56px tall. |
| `Input` | Pill-shaped, 56px tall, label/error props. |
| `Select` | Native `<select>` under pill styling with a chevron icon. Use instead of a raw `<select>`. |
| `Textarea` | Softer rectangle radius (not pill — textareas don't take the 56px pill shape). |
| `Card` | `rounded-card bg-card-bg shadow-atmospheric`, optional `padding` prop. Use instead of hand-rolling the old `rounded-xl border border-border bg-card-bg shadow-sm` pattern. |
| `Modal` | Fixed overlay + glassmorphic centered panel. Used by the Community Hub RSVP flow. |
| `Badge` | Pill label using the accent-bg/fg token pairs. |

Every existing page was swept to use `rounded-card`/`shadow-atmospheric` in place of the old bordered-card pattern, and all raw `<select>`/`<textarea>` elements were converted to `Select`/`Textarea`.

## Layout conventions

- **`PortalShell`** (`src/components/layout/PortalShell.tsx`) is the single shared sidebar layout for both the patient (`/app/*`) and doctor (`/provider/*`) portals. Nav active-state uses a pill (`rounded-full`).
- **`GuestGate`** (`src/components/auth/GuestGate.tsx`) gates a feature behind having a real (non-anonymous) account, rendering an upfront "create an account" prompt instead of letting a request 401.
- **`BiometricGate`** (`src/components/records/BiometricGate.tsx`) wraps Medical Records with an optional WebAuthn re-auth challenge. **Hard safety rule: every early-return/error path must resolve to showing children ("fail open"), never stay locked.** This is deliberate — the gate is a convenience layer in front of an already-working feature, not a hard requirement. Do not "fix" any of its branches to fail closed.
- **`QuickExitButton`** (`src/components/safety/QuickExitButton.tsx`) performs a hard `window.location.href` navigation to a neutral external site — deliberately not a Next.js client-side route change, so it actually leaves the app. It lives in `PortalShell`'s sidebar footer (both portals get it for free) and in the header/corner of the four marketing/auth pages that don't share that layout.

## Pseudonym system (display-layer only)

Users get an auto-generated, stable pseudonym (e.g. `MoonLight`, `StarJumper`) — generated once server-side on first profile fetch (`backend/src/controllers/userController.ts`'s `getUserProfile`, using `backend/src/util/pseudonym.ts`) and persisted on `User.pseudonym`. It is a friendly display label only.

**Allowed surfaces** (the only places it may ever be shown or used as a default):
- Ask AmWell AI chat attribution (`src/app/app/ask-amwell/page.tsx`)
- The patient portal's own sidebar badge (`PortalShell`, patient role only)
- Community Hub RSVP's "Chosen name" field, as an editable pre-filled default (`src/app/app/community/[id]/page.tsx`)

**Hard rule — never show or rely on it in:** appointments, messages, medical records, orders, checkout, or anywhere in the doctor portal (`/provider/**`). Real name (`User.name`) remains the sole identity for all of those. Doctors do not get a pseudonym at all.

## Known gaps

**Discreet Billing** (a generic merchant name like "PAW Services" on the customer's bank statement) is **not implemented**. The checkout flow proxies to a third-party Partner API for payment initiation and passes no merchant-statement-descriptor field today — a generic statement name is a payment-processor/merchant-account configuration matter, not something this codebase can control. Do not add UI copy implying this is guaranteed without an actual partner-side descriptor configuration in place.
