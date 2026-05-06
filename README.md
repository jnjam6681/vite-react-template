# vite-react-template

Production-ready React template with TanStack Query, TanStack Router, and Zustand — structured for AI-assisted development via `CLAUDE.md`.

## Usage

```bash
npx degit jnjam6681/vite-react-template my-new-project
cd my-new-project
npm install
npm run dev
```

## Stack

| Library | Version |
|---|---|
| React | 19.x |
| TypeScript | 6.x |
| Vite | 8.x |
| TanStack Query | 5.x |
| TanStack Router | 1.x |
| Zustand | 5.x |

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server (http://localhost:5173) |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── app/                  # Providers, router, App shell
├── features/             # Feature modules (domain-grouped)
│   └── <feature>/
│       ├── api/          # TanStack Query hooks + query keys
│       ├── components/   # Feature-scoped components
│       ├── hooks/        # Feature-scoped hooks
│       ├── stores/       # Zustand stores for this feature
│       └── types.ts
├── components/ui/        # Reusable UI primitives
├── stores/               # Global Zustand stores (auth, theme)
├── lib/                  # API client, QueryClient config
├── hooks/                # Global hooks
├── types/                # Shared types
└── config/               # Constants, env flags
```

Full conventions and AI code-generation guide in [CLAUDE.md](./CLAUDE.md).

## Adding a New Feature

```
สร้าง feature "posts" ตาม CLAUDE.md — มี list page แสดง posts ทั้งหมด
```

## Key Conventions

- **TanStack Query v5** — object-form API only, no `onSuccess`/`onError` inside `useQuery`
- **TanStack Router** — code-based routing, all routes defined in `src/app/router.tsx`
- **Zustand v5** — curried `create<T>()()` form, state changes only via store actions
- **No cross-feature imports** — features must not import from each other
- **No barrel `index.ts`** — except `features/<feature>/index.ts` for public API
