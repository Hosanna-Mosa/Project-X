# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

This is **not** a single app — it's 5 independently-managed projects living side by side in one repo, each with its own `package.json`/lockfile and no shared workspace tooling (no turborepo/nx/lerna, no root `package.json`). Always `cd` into the relevant folder before running any command.

| Folder | What it is | Stack |
|---|---|---|
| `backend/` | REST + Socket.IO API used by all four clients below | Express 5 + TypeScript (commonjs), MongoDB/Mongoose, Redis + BullMQ, Socket.IO |
| `app/` | Customer mobile app — branded "Flavour" (rides, package delivery, food/meat ordering, chat, support) | Expo Router 6, React Native 0.81, React 19, Zustand, TanStack Query |
| `driver/` | Driver mobile app — branded "Flavour Driver" (KYC onboarding, live jobs, earnings, chat) | Same Expo/RN stack as `app/` |
| `admin/` | One SPA serving **three roles** (admin / support / vendor) gated by separate `localStorage` tokens (`admin_token`, `support_token`, `vendor_token`) — see `RootRedirect` in `admin/src/App.tsx` | React 18 + Vite + shadcn/ui (Radix) + Tailwind 3, TanStack Query |
| `frontend/` | Public partner website — vendor sign-up/onboarding + restaurant menu preview | React 19 + Vite + Tailwind 4, react-router-dom v7 |

The production API is `https://x-api.triozen.tech` (see `app/eas.json` / `driver/eas.json` build profiles).

## Commands

### backend
```
cd backend
npm run dev     # nodemon + ts-node, watches src/, entry: src/index.ts
npm run build    # rimraf dist && tsc
npm start        # node dist/index.js (run build first)
```
There is no real test suite (`npm test` just exits with an error) and no lint script. Needs MongoDB + Redis running locally, and a `.env` populated from `.env.example` (PORT, MONGODB_URI, JWT_SECRET, Google Maps, Razorpay, Cloudinary, Surepass, SMTP, DigiLocker, Gemini keys). On boot the server calls `seedDatabase()` before mounting routes.

### admin (port 8080)
```
cd admin
npm run dev          # vite dev server
npm run build        # vite build
npm run lint         # eslint .
npm test             # vitest run
npm run test:watch   # vitest watch
npx playwright test  # e2e (playwright.config.ts uses createLovableConfig — this app was scaffolded via Lovable.dev)
```
Only one placeholder unit test exists (`src/test/example.test.ts`) — there is no real coverage yet.

### frontend (partner website)
```
cd frontend
npm run dev      # vite dev server
npm run build    # tsc && vite build
npm run lint      # eslint .
npm run format    # prettier --write .
```
No test setup.

### app / driver (Expo)
```
cd app   # or driver
npx expo start --tunnel   # app: `npm start`; driver: `npm run dev`
npm run typecheck          # tsc --noEmit
npm run lint                # app only — driver has no lint script
npm run android / ios       # native builds via `expo run:*`
```
Both are built/distributed via **EAS** (`eas.json` has `development`/`preview`/`production` profiles). No automated test setup in either.

There are no Dockerfiles and no CI workflows (no `.github/workflows`) anywhere in the repo — running/building/deploying is done manually via the commands above.

## Backend architecture

Routes are versioned under `/api/v1/*` and mounted in `backend/src/index.ts`. Each domain lives under `backend/src/modules/<name>/` and consistently follows:
```
<name>.routes.ts       # express Router, wires middleware + controller
<name>.controller.ts   # req/res handling
<name>.service.ts       # business logic, DB access
<name>.validation.ts    # Zod schemas
```
Modules: `auth, users, drivers, orders, admin, places, routing, payments, vendors, food, meat, onboarding, zones, notifications, support, reviews, banners, delivery, pricing`.

Cross-cutting pieces:
- `backend/src/database/models/` — Mongoose models (User, Driver, Order, Vendor, FoodItem, MeatItem/MeatCenter, Zone, Coupon, Review, SupportTicket, Notification, etc.)
- `backend/src/services/dispatch.manager.ts` + `queue.service.ts` (BullMQ) — driver matching/dispatch logic; this is the most stateful, complex part of the backend
- `backend/src/sockets/socket.manager.ts` — Socket.IO setup for live order/driver tracking and chat
- `backend/src/middleware/auth.middleware.ts` — JWT auth (`authenticateToken`) and role gating (`authorizeRole([...])`); tokens carry `{ userId, role }` (also accepts `id` as an alias for `userId`)
- `backend/src/services/invoice.service.ts` + `puppeteer-core` — server-side PDF invoice generation from the `compiled_*_invoice.html` templates at the backend root
- External integrations: Cloudinary (media), Razorpay (payments), Google Maps (geo/routing), DigiLocker + Surepass (driver Aadhaar/PAN KYC), Gemini API (OCR), Nodemailer (email)

The `backend/` root also has ~40 ad-hoc one-off scripts (`check_*.ts`, `fix_*.ts`, `scratch-*.ts`) and committed debug logs (`debug.log`, `debug_helper.txt`) left over from manual debugging sessions — these aren't part of the app runtime, just be aware they exist when searching the codebase.

## Client conventions

- All four clients read the backend URL from an env var: `EXPO_PUBLIC_API_URL` (app/driver) or `VITE_API_URL` (admin/frontend), documented per-app in each `.env.example`.
- `admin/src/lib/api-client.ts` and `frontend/src/lib/api-client.ts` centralize HTTP calls to the backend; `admin/src/lib/socketService.ts` centralizes Socket.IO client setup.
- `admin` and `frontend` share the same shadcn/ui component style (`components.json`, `src/components/ui/`) but are on different major versions of React/Tailwind — don't assume code ports directly between them.
- `app` and `driver` share near-identical Expo project structure/config (Expo Router file-based routing under `app/`, same native module set) since they were scaffolded from the same template.
