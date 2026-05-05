# Project Guide for AI Assistants

This file is the source of truth for code generation. Follow it strictly. When in doubt, copy the patterns shown here exactly — do not invent variants.

---

## 1. Tech Stack (exact versions)

| Library | Version | Notes |
|---|---|---|
| React | 18.3.x | Function components only, no class components |
| TypeScript | 5.6.x | `strict: true` enabled |
| Vite | 5.4.x | Build tool |
| TanStack Query | **v5** | Object-form API only. **No callbacks (`onSuccess`, `onError`) inside `useQuery`** — they were removed in v5 |
| TanStack Router | **v1** | **Code-based routing** (not file-based). No router plugin used |
| Zustand | **v5** | Use `create<T>()(...)` curried form. **No `setState` outside store actions** |

**Critical:** Do not mix v4 and v5 syntax. If unsure which version a snippet you remember belongs to, re-check against the patterns in section 6.

---

## 2. Commands

```bash
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build
npm run preview  # preview production build
```

No test runner, no ESLint, no Prettier configured yet. Do not add them unless explicitly requested.

---

## 3. Folder Structure

```
src/
├── app/                  # App shell: providers, root component
│   ├── App.tsx
│   ├── providers.tsx     # QueryClientProvider, RouterProvider
│   └── router.tsx        # router instance + route tree
├── features/             # Feature modules (domain-grouped)
│   └── <feature>/
│       ├── api/          # Query/mutation hooks + query keys
│       │   ├── keys.ts
│       │   ├── get-<entity>.ts
│       │   └── update-<entity>.ts
│       ├── components/   # Components used only in this feature
│       ├── hooks/        # Non-query hooks for this feature
│       ├── stores/       # Zustand stores scoped to this feature
│       ├── types.ts      # Feature-specific types
│       └── index.ts      # Public API (re-export only what other features need)
├── components/
│   └── ui/               # Reusable primitives (Button, Input, Modal)
├── stores/               # Global Zustand stores (auth, theme)
├── hooks/                # Global hooks
├── lib/                  # Framework-agnostic utilities
│   ├── api-client.ts     # fetch/axios wrapper
│   └── query-client.ts   # QueryClient instance + defaults
├── types/                # Shared types
└── main.tsx              # Entry point
```

### Folder rules (strict)

1. **Features must not import from other features.** Cross-feature dependencies indicate a missing `shared/` extraction.
2. **Components in `components/ui/` must be presentational only** — no data fetching, no Zustand, no business logic.
3. **No barrel files (`index.ts`) anywhere except `features/<feature>/index.ts`.** Barrels everywhere cause circular deps and bloated bundles.
4. **Path alias `@/` maps to `src/`.** Use it for imports crossing more than one folder up.

---

## 4. Naming Conventions

| Thing | Style | Example |
|---|---|---|
| Component file | `PascalCase.tsx` | `UserCard.tsx` |
| Hook file | `kebab-case.ts`, name `useThing` | `use-debounce.ts` exporting `useDebounce` |
| Query/mutation hook file | `kebab-case.ts` matching action | `get-users.ts`, `update-user.ts` |
| Store file | `kebab-case.ts` ending `-store` | `auth-store.ts` |
| Type file | `types.ts` (per feature) or `kebab-case.ts` | `user.types.ts` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_RETRIES` |
| Functions/variables | `camelCase` | `fetchUsers` |
| Types/interfaces | `PascalCase`, no `I` prefix | `User`, not `IUser` |

---

## 5. Imports

- Use `@/...` for anything outside the current folder.
- Use relative `./` only within the same folder.
- **Never** import from `features/foo/something` in `features/bar/`. Lift the shared piece to `lib/`, `components/ui/`, or `hooks/` instead.

---

## 6. Code Patterns (copy these exactly)

### 6.1 Entry point — `src/main.tsx`

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

### 6.2 QueryClient — `src/lib/query-client.ts`

```ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
```

### 6.3 API client — `src/lib/api-client.ts`

```ts
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export async function apiClient<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}
```

### 6.4 Providers — `src/app/providers.tsx`

```tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import { router } from './router'

export function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

### 6.5 Router — `src/app/router.tsx` (code-based)

```tsx
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <div>Home</div>,
})

const routeTree = rootRoute.addChildren([indexRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
```

**To add a route:** create `createRoute(...)` and add it to `rootRoute.addChildren([...])`. Do **not** create a separate router instance.

### 6.6 Query keys — `src/features/<feature>/api/keys.ts`

Always use a hierarchical factory. This makes invalidation predictable.

```ts
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: { search?: string }) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
}
```

### 6.7 Query hook — `src/features/users/api/get-users.ts`

```ts
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { User } from '../types'
import { userKeys } from './keys'

type Filters = { search?: string }

function fetchUsers(filters: Filters): Promise<User[]> {
  const params = new URLSearchParams(
    filters.search ? { search: filters.search } : {},
  )
  return apiClient<User[]>(`/users?${params}`)
}

export function useUsers(filters: Filters = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => fetchUsers(filters),
  })
}
```

**Rules:**
- One query hook per file.
- Fetch function lives in same file (not exported unless reused).
- Always type the return value of the fetch function.
- Never use `onSuccess`/`onError` on `useQuery` — they don't exist in v5. Use `useEffect` on the data, or move the side effect to a mutation.

### 6.8 Mutation hook — `src/features/users/api/update-user.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { User } from '../types'
import { userKeys } from './keys'

type UpdateUserInput = { id: string; name: string }

function updateUser(input: UpdateUserInput): Promise<User> {
  return apiClient<User>(`/users/${input.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: input.name }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateUser,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: userKeys.detail(variables.id) })
      qc.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}
```

**Rules:**
- Mutations may use `onSuccess`/`onError` (still supported in v5).
- Always invalidate the most specific keys that changed, plus the lists.
- Use `userKeys.lists()` (not `userKeys.all`) to avoid invalidating unrelated keys under the namespace.

### 6.9 Zustand store — `src/stores/auth-store.ts`

```ts
import { create } from 'zustand'

type User = { id: string; email: string }

type AuthState = {
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}))
```

**Rules:**
- Use the curried `create<T>()(...)` form. The empty `()` is required for v5 type inference.
- All state mutations happen inside actions defined in the store. Never call `useAuthStore.setState(...)` from a component.
- Select narrow slices in components: `const user = useAuthStore((s) => s.user)` — not the whole store.

### 6.10 Component using query + store

```tsx
import { useUsers } from '@/features/users/api/get-users'
import { useAuthStore } from '@/stores/auth-store'

export function UsersList() {
  const currentUserId = useAuthStore((s) => s.user?.id)
  const { data, isPending, isError } = useUsers()

  if (isPending) return <div>Loading...</div>
  if (isError) return <div>Failed to load users</div>

  return (
    <ul>
      {data.map((u) => (
        <li key={u.id}>
          {u.name} {u.id === currentUserId && '(you)'}
        </li>
      ))}
    </ul>
  )
}
```

**Rules:**
- Use `isPending` (not `isLoading`) for the initial load state in v5.
- Components never call `fetch`/`apiClient` directly — always go through a query/mutation hook.
- Components never read from a Zustand store with `getState()` during render — use the hook.

---

## 7. Anti-Patterns (do NOT do these)

| Don't | Why |
|---|---|
| `useQuery({ queryFn, onSuccess })` | `onSuccess` removed from `useQuery` in v5 |
| `useQuery(['users'], fetchUsers)` | v4 positional API; v5 requires object form |
| `create((set) => ...)` without `<Type>()` | Loses type inference in v5 |
| `useStore.setState(...)` from a component | Bypasses store actions, makes state changes untraceable |
| `useStore()` returning whole store | Causes unnecessary re-renders; select a slice |
| Importing across features | Couples features; lift to `shared`/`lib` instead |
| Adding `index.ts` to every folder | Circular deps, larger bundles |
| `axios` install when `fetch` is already wrapped | Don't add deps without need |
| Throwing in a query function without typed errors | Loses error info; throw `Error` with a message |
| Mixing route definitions in components | All routes belong in `app/router.tsx` |

---

## 8. How to Add a New Feature (step-by-step)

When asked to add a feature `posts`:

1. Create `src/features/posts/` with subfolders: `api/`, `components/`, `stores/` (only if state is needed), `hooks/` (only if needed).
2. Add `src/features/posts/types.ts` with the domain types.
3. Add `src/features/posts/api/keys.ts` using the factory pattern in 6.6.
4. Add one file per query/mutation in `src/features/posts/api/`.
5. Add components in `src/features/posts/components/`. Keep them dumb if possible — let a "page" component (in routes) wire data + UI.
6. Register a route in `src/app/router.tsx` per pattern 6.5.
7. Add `src/features/posts/index.ts` only if other features need to import from posts (rare).

**Do not** create files speculatively. If the feature has no client state, skip `stores/`. If it has no custom hooks, skip `hooks/`.

---

## 9. When You're Unsure

- Re-read the relevant pattern in section 6 and copy it verbatim, then adjust names.
- If a request conflicts with a rule here, surface the conflict to the user before generating code — do not silently break the convention.
- If a library version differs from section 1 (e.g., user upgrades TanStack Query), update this file first, then generate code.
