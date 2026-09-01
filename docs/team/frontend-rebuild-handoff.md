# Frontend rebuild handoff

## Visual system — source of truth

MinBack uses an **Academic Editorial** interface. It should read like a precise learning record, not a generic dashboard: paper surfaces, ink typography, thin rules and a restrained brass accent.

| Token | Value | Use |
|---|---|---|
| `--paper` | `#F6F3EB` | Primary canvas |
| `--paper-raised` | `#FFFEFA` | Cards, forms and dialogs |
| `--ink` | `#18333D` | Standard text |
| `--ink-deep` | `#10262E` | Heading, primary action and emphasis |
| `--muted` | `#687579` | Secondary copy |
| `--rule` | `#D9D4C8` | Borders and ledger lines |
| `--brass` | `#D29A32` | Small visual accent and active state |
| `--brass-soft` | `#F6E8C5` | Soft highlight/status background |

Status tokens are `--success` `#417A61`, `--warning` `#A96818`, `--danger` `#B55249`, and `--info` `#47778B`.

- `src/app/globals.css` is the sole visual-token source; feature modules must not introduce brand-color literals.
- Lora is display typography; Be Vietnam Pro is body copy; IBM Plex Mono is limited to codes, identifiers and compact metadata.
- Controls use 8px radius, standard cards 12px and dialogs 16px. Pills are reserved for concise status.
- Use borders and paper contrast for depth. Shadows are light and never replace a border.
- Do not reintroduce Navy–Amber styles, full-height sidebars, or repeated decorative offset cards.

## Shells and routes

- All authenticated workspaces use `WorkspaceHeader`, a top navigation with a keyboard-dismissible mobile menu. Desktop has no sidebar.
- Student navigation: Overview, Assignments, Submissions, Grades and Notifications under `/class/:code/*`.
- Teacher navigation: Overview, Classes and Settings under `/admin/*`. A ClassSection page provides its own contextual links to Students, Assignments and Gradebook.
- Public/auth routes keep their existing URLs and never render the authenticated header.
- Routes, API requests, server services, session/authentication behavior, privacy scope and business rules are not presentation-layer concerns and must stay unchanged.

## Content rules

- Start every view with current context and one sentence that helps the user decide their next action.
- Dashboards surface an overview ledger, a compact metric band and an action-oriented list. Full data stays on its dedicated route.
- Tables look like ledgers: tight rows, visible rule lines, muted headers in mono type, and action buttons only where relevant.
- Empty, loading and error states must preserve page structure and state the next usable action.
- Use only backend-supported features. Do not add calendar, help, task, or notification capabilities that do not exist in MinBack.

## Responsive and accessibility

- Content width is 1240px maximum; desktop gutters are 24px and mobile gutters 12–16px.
- At 800px, primary navigation becomes a menu panel; Escape closes it and focus remains visible.
- Wide tables scroll horizontally within their own bordered region.
- Use semantic controls, visible focus rings, text labels alongside meaning-critical icons, and reduced motion when requested.

## Verification

- Check active header navigation, class-code canonical redirect, logout, Student submission refresh, notification polling, Teacher class navigation and legacy query redirects.
- Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`.
- Inspect public/auth, Student and Teacher at 1440px, tablet and 390px mobile, including keyboard-only flow and empty/loading/error states.
