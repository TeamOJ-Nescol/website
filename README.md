# Dartz Website

Next.js frontend for the Dartz platform. Lets users sign up, start a darts match (501 / 301 / cricket), point a camera at the board, and watch live dart detection scores roll in over a WebSocket from the [inference service](../inference). Game state is persisted via the [Auth API](../Auth).

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript 5.9
- **Styling:** Tailwind CSS 4 + shadcn/ui (`radix-mira` style, olive base)
- **Icons:** Huge Icons (`@hugeicons/react`)
- **Data:** TanStack React Query · TanStack React Table · Axios · Zod
- **UX bits:** next-themes, sonner, vaul, @dnd-kit, recharts

## Repository layout

```
app/
├── layout.tsx              # Providers: QueryClient, theme, tooltips
├── page.tsx                # Landing (Hero, About, Team, Promo)
├── login/ · signup/        # Auth pages
└── dashboard/
    ├── layout.tsx          # AuthProvider + Sidebar + Header (auth gate)
    ├── page.tsx            # Dashboard home: stats + recent games
    ├── test/               # Dart-detection debug surface
    └── games/
        ├── page.tsx        # New game — add players
        ├── pick-mode/      # Choose 501 / 301 / cricket
        └── live/           # Core live-scoring screen
            ├── page.tsx
            ├── use-dart-stream.ts   # WebSocket hook → inference service
            ├── video-feed.tsx       # Canvas capture + overlay rendering
            ├── countdown-panel.tsx  # 501/301 panel
            ├── cricket-panel.tsx    # Cricket panel
            ├── checkouts.ts         # Checkout suggestions
            └── types.ts

components/
├── ui/                     # shadcn/ui primitives (button, card, sidebar, …)
├── login-form.tsx · signup-form.tsx
├── app-sidebar.tsx · site-header.tsx · nav-*.tsx
├── data-table.tsx · chart-area-interactive.tsx · section-cards.tsx
├── hero.tsx · about.tsx · team.tsx · promo.tsx
└── theme-provider.tsx

hooks/
├── useAuth.tsx             # /auth/check session context
├── useGames.tsx            # React Query CRUD for /games
└── use-mobile.ts

lib/
├── api.ts                  # axios instance (withCredentials)
├── config.ts               # APP_NAME, API_BASE, INFRENCE_API, capture dims
└── utils.ts                # cn() Tailwind merge

public/                     # Dartboard hero/background images
```

## Getting started

### Prerequisites
- Node.js 20+
- pnpm
- The [Auth API](../Auth) running at `http://localhost:4000`
- The [Inference service](../inference) running at `ws://localhost:8000` (only needed for live scoring)

### Install & run

```bash
pnpm install
pnpm dev          # http://localhost:3000 (Turbopack)
```

### Production build

```bash
pnpm build
pnpm start
```

## Configuration

Endpoints are hard-coded in `lib/config.ts` for the project context:

```ts
APP_NAME: "Dartz"
API_BASE: "http://localhost:4000"        // Auth + games REST
INFRENCE_API: "ws://localhost:8000/ws"   // Inference WebSocket
game: { CAPTURE_WIDTH: 640, CAPTURE_HEIGHT: 480, VIDEO_SOURCE_ID: "__video__" }
```

Update these values to point at deployed environments.

## Backend integration

### Auth (REST, cookie session)
- `POST /users/create`, `POST /users/login`, `POST /users/logout`
- `GET /auth/check` — used by `useAuth()` to gate `/dashboard/*`
- All requests use `axios` with `withCredentials: true`

### Games (REST)
React Query hooks in `hooks/useGames.tsx`:
- `useGames()`, `useGame(id)`, `useGameStats()`
- `useCreateGame()`, `useUpdateGameState()`, `useFinishGame()`, `useDeleteGame()`

### Inference (WebSocket)
`app/dashboard/games/live/use-dart-stream.ts` opens a WebSocket to `INFRENCE_API`, captures frames from the selected camera/video source on a canvas at 640×480, and streams JPEG frames upstream. Two reply types are handled:
- **Binary** — annotated JPEG drawn on the live `<canvas>`
- **JSON** — `{ type: "scores", scores: [[value, label], ...] }` fed into the active game panel

## Scripts

| Command       | Purpose                          |
| ------------- | -------------------------------- |
| `pnpm dev`    | Dev server (Turbopack)           |
| `pnpm build`  | Production build                 |
| `pnpm start`  | Serve production build           |
| `pnpm lint`   | ESLint                           |
| `pnpm format` | Prettier write                   |
| `pnpm typecheck` | `tsc --noEmit`                |

## Adding shadcn/ui components

```bash
npx shadcn@latest add <component>
```

Components are placed under `components/ui/`. Project config lives in `components.json` (style: `radix-mira`, RSC enabled, `@/*` aliases, Huge Icons).

## Theming

- CSS variables live in `app/globals.css` (light + dark, sidebar palette, chart palette).
- Fonts: Nunito Sans (sans) and Geist Mono (mono) via `next/font/google`.
- Dark mode is provided through `next-themes` in `components/theme-provider.tsx`.
