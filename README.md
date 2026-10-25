# Car Dealership Inventory System

A full-stack inventory app for a car dealership, built as a TDD kata. Shoppers sign up, search the stock and buy a vehicle;
admins add, edit, restock and delete vehicles.

- **Backend:** Node.js, TypeScript, Express 5, PostgreSQL 16, JWT authentication
- **Frontend:** React 19, TypeScript, Tailwind CSS 4, Vite
- **Tests:** Jest (backend), Vitest + Testing Library (frontend), Playwright (end to end) — 442 tests, all passing

> **Status:** feature-complete for the kata brief. Known limitations are listed [below](#known-limitations).

## Screenshots

Placeholders — capture each screen and save it under `docs/screenshots/` with the name shown, then replace the placeholder text with an image link such as `![Sign in](docs/screenshots/sign-in.png)`.

| Screen | Save as |
|--------|---------|
| _[screenshot: sign-in page]_ | `docs/screenshots/sign-in.png` |
| _[screenshot: vehicle list with search, filters and a sold-out vehicle]_ | `docs/screenshots/shop.png` |
| _[screenshot: admin vehicle table with Edit, Restock and Delete]_ | `docs/screenshots/admin-list.png` |
| _[screenshot: add-vehicle form showing validation errors]_ | `docs/screenshots/admin-form.png` |

## Features

**Shoppers**
- Register and sign in (JWT, 1 hour)
- Search by make, model, category and price range; 12 vehicles per page
- Buy a vehicle: stock goes down by one; the button is disabled and reads "Sold out" at zero stock and "Reserved" for reserved cars
- If two shoppers race for the last unit, exactly one wins and the other sees "Not enough stock available"

**Admins** (a regular user cannot reach these screens or endpoints)
- Add a vehicle with full validation (VIN, year, mileage, price, category, starting stock)
- Edit a vehicle (only changed fields are sent; stock is read-only there)
- Restock (adds units; a sold-out vehicle becomes available again) and delete (with in-place confirmation)

## Quick start

### Prerequisites

| Tool | Version used | Notes |
|------|--------------|-------|
| Node.js | 24.14 | developed and tested on this version only |
| PostgreSQL | 16 | running on `localhost:5432` |
| Google Chrome | any recent | only for the end-to-end tests (`E2E_CHANNEL=msedge` uses Edge instead) |

### 1. Create the databases

```sql
CREATE DATABASE car_dealership;
CREATE DATABASE car_dealership_test;
```

> **`car_dealership_test` is wiped** (its `public` schema is dropped) by the backend test suite and by the end-to-end run. Never point `TEST_DATABASE_URL` at data you want to keep. Both refuse to run unless the URL ends in `car_dealership_test`.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
# edit .env: set the database password, a JWT_SECRET, and the admin email and password
npm run seed:admin          # applies the migrations and creates (or promotes) the admin user
npm run dev                 # API on http://localhost:3000
```

The server also applies any pending migrations when it starts.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

The dev server forwards `/api` to the backend on port 3000, so the browser only ever talks to one origin and no CORS setup is needed.

Open <http://localhost:5173>, register an account to shop, or sign in with the admin email and password from `backend/.env` to manage vehicles.

## Configuration

`backend/.env` (copy of `backend/.env.example`; the real file is git-ignored):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string for the app |
| `TEST_DATABASE_URL` | Connection string for `car_dealership_test` (wiped by the tests) |
| `PORT` | API port, default `3000` |
| `JWT_SECRET` | Signs login tokens. In production (`NODE_ENV=production`) it must be at least 32 characters or the server refuses to start |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Used by `npm run seed:admin`. Re-running it promotes an existing user with that email and resets their password |

Frontend (optional environment variables for `npm run dev`): `PORT` (default `5173`) and `API_PROXY_TARGET` (default `http://localhost:3000`).

### Production build

```bash
cd backend  && npm run build && NODE_ENV=production npm start
cd frontend && npm run build        # static files in frontend/dist
```

The backend does not serve the frontend. Host `frontend/dist` behind a reverse proxy that serves the files and forwards `/api` to the backend on the same origin (the API has no CORS configuration). If the proxy sits in front of the API, set Express's `trust proxy` first, otherwise the login rate limiter sees every user as one address.

## API

All endpoints are under `/api`. Errors are `{ "error": "message" }`. Endpoints marked 🔒 need `Authorization: Bearer <token>`.

| Method and path | Who | Description |
|-----------------|-----|-------------|
| `POST /auth/register` | anyone | `{ email, password }` → `201 { id, email }`. Password 8 characters to 72 bytes; email is case-insensitive and unique (`409`) |
| `POST /auth/login` | anyone | → `{ token, user }`. Same `401` for an unknown email and a wrong password; 10 failed attempts per IP per 15 minutes, then `429` |
| `GET /auth/me` 🔒 | any user | `{ id, email, role }` |
| `GET /admin/users` 🔒 | admin | All users (`403` for others) |
| `GET /cars` 🔒 | any user | Filters `make`, `model`, `category`, `status`, `minYear`, `maxYear`, `minPrice`, `maxPrice` (cents), `limit` (1–100, default 20), `offset`. Newest first. → `{ items, total, limit, offset }` |
| `GET /cars/:id` 🔒 | any user | One vehicle, or `404` |
| `POST /cars` 🔒 | admin | Create. `409` if the VIN exists |
| `PATCH /cars/:id` 🔒 | admin | Change any subset of fields |
| `DELETE /cars/:id` 🔒 | admin | `204` |
| `POST /cars/:id/purchase` 🔒 | any user | Optional `{ quantity }` (default 1). One atomic statement checks stock and decrements it, so concurrent buyers cannot oversell. Buying the last unit marks the car `sold`. `409` if there is not enough stock or the car is not `available` |
| `POST /cars/:id/restock` 🔒 | admin | `{ quantity }` (1–1,000,000). A `sold` car becomes `available`. `409` past 1,000,000 units |

**Vehicle fields:** `vin` (17 characters, letters and digits except I, O and Q, stored upper-case), `make`, `model`, `year` (1886 to next year), `mileage` (0 to 10,000,000), `priceCents` (whole cents, up to 2,000,000,000), `category` (`sedan`, `suv`, `truck`, `hatchback`, `coupe`, `convertible`, `van`), `quantity` (0 to 1,000,000), `status` (`available`, `reserved`, `sold`).

## Project structure

```
backend/    Express API
  src/routes/        HTTP only: parse input, call a repository, map results to status codes
  src/cars/          schemas.ts (validation) and carRepository.ts (all SQL for cars, behind an interface)
  src/users/         userRepository.ts (all SQL for users)
  src/middleware/    requireAuth (JWT + user lookup) and requireRole
  migrations/        numbered .sql files, applied once each inside a transaction
  tests/             Jest + Supertest against a real PostgreSQL
frontend/   React app
  src/api/           typed API client (no React) and the ApiError type
  src/auth/          session, token storage, AuthProvider, password rules
  src/cars/          search hook, filters, list/card/form components
  src/pages/         one component per screen
e2e/        Playwright tests; starts its own backend (:3101) and frontend (:5174)
docs/       TEST_REPORT.md
PROMPTS.md  raw AI chat log (see "My AI Usage")
```

Design choices worth knowing:

- **Layering and dependency injection.** Routes depend on repository interfaces, and `createApp({ dependencies })` accepts fakes, so the HTTP layer is tested with no database. The frontend does the same with an `ApiClient` interface.
- **Money is whole cents everywhere** (never floats); the UI converts to and from dollars.
- **The server is the authority.** The frontend validates with the same rules for fast feedback, but every rule is enforced again by the API and, for the important ones, by database `CHECK` constraints.
- **No oversell.** Stock changes are single conditional `UPDATE`s, proven by a 10-way concurrency test and a two-browser end-to-end test.
- **Stock is not editable in the edit form.** It changes only through restock and purchase, so an admin saving a stale form cannot overwrite sales made in the meantime.

## Testing

```bash
cd backend  && npm test                  # 225 tests; add :coverage for the coverage table
cd frontend && npm test                  # 195 tests; add :coverage for the coverage table
cd e2e      && npm install && npm test   # 22 browser tests, about 45 seconds
cd e2e      && npm run report            # open the HTML report (traces and screenshots of failures)
```

Run the three suites one after another, not at the same time: they share `car_dealership_test`.

The full results — per-suite coverage, the end-to-end scenario table, a check that the tests really fail when the app is broken, and known gaps — are in [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md).

## Known limitations

- Purchases are not recorded: there is no orders table, so there is no purchase history or receipt.
- Login throttling is per IP and held in memory (it resets on restart and is not shared between instances).
- The session token is kept in `localStorage`, and logging out only forgets it locally: the backend has no token revocation, so a copied token works until it expires (1 hour).
- The category and status lists exist in three places (database, API schema, frontend); adding a category means editing all three.
- The frontend is not served by the backend (see [Production build](#production-build)).
- There is no CI workflow; the suites run locally.
- The end-to-end tests cover Chrome only. There are no load tests or automated accessibility audit.

## My AI Usage

This project was built with **Claude** (Anthropic): the kata brief was written in a claude.ai chat, and all implementation was done in the Claude Code desktop app with Claude Sonnet 5.5. **GitHub Copilot was not used.** Claude wrote essentially all of the code, tests, migrations and documentation; I directed it and decided what to do next.

**How the work was run**

- **Phased plan, one approval at a time.** The brief set four phases (setup, backend, frontend, deliverables). I answered "yes, do X next" at each step, and Claude did not push, open pull requests or change the PR description without that go-ahead.
- **Strict red-green-refactor.** For each behavior Claude wrote a failing test, watched it fail for the right reason, committed it on its own, then wrote the minimum code to pass. About 40 of this branch's roughly 100 commits are `test:` commits (`git log --format=%s | grep -c '^test'`), and the history shows each failing-test commit directly before its implementation commit. Refactors are separate `refactor:` commits with no behavior change and unchanged tests.
- **A code review before every implementation commit.** Claude ran a code-review pass on each change and reported its findings. Many were fixed immediately, test-first: for example login accepted passwords longer than 72 bytes (bcrypt ignores the rest, so a longer string matched), a transient `/me` failure wiped a valid session, paging unmounted the Next button and dropped keyboard focus, and the edit form kept the previous vehicle when the id in the address changed. Findings not fixed were recorded in the PR description.
- **A whole-codebase review.** After the backend was done, a SOLID and clean-code review of all of `backend/` led to seven separate refactor commits (user repository, injectable app, password hasher, one error helper, typed domain values, declarative filters, testable startup with graceful shutdown). A final audit before submission added security headers (helmet) and a minimum production JWT secret length.
- **Every commit carries the co-author trailer**, added by a git hook: `Co-authored-by: Claude <AI@users.noreply.github.com>`.

**How the output was verified rather than trusted**

- Coverage was measured and the gaps closed with real tests (backend 100%, frontend 99.6%).
- The application was run in a real browser against the real backend several times (register, search, buy, add, restock, delete).
- The end-to-end suite was checked by deliberately breaking the app (a UI label, then the purchase stock guard) and confirming the tests failed; one of those breaks went *un*noticed by the browser tests (the backend suite covers it), and the report says so.
- The end-to-end tests found a real bug the unit tests had missed: pressing Search with unchanged filters sent no request.

**Where the AI got things wrong** (found by tests, review or running the app, then fixed)

- It installed TypeScript 7, which `ts-jest` does not support, and had to pin version 5.
- It named a React component `CarForm.tsx` beside a helper `carForm.ts`; the two differ only in letter case, which Windows treats as one file. Renamed.
- It seeded test cars with VINs containing the letter I, which the API correctly rejected.
- A few commands ran in the wrong directory (so a test run picked up the wrong suite, and two stray empty folders were left behind until the final audit). A few shell commands mangled template strings and wrote broken files; most were caught before committing, but one reached a commit and was repaired in the next one (`fix(frontend): restore the car fake's VIN template literal`).
- It first described the frontend's uncovered lines from memory and got two wrong; checking the code revealed two untested behaviors, which now have tests.

**Limits of this record.** [`PROMPTS.md`](PROMPTS.md) is the raw chat log, written by a hook (`.claude/hooks/log-prompts.mjs`). The kata brief itself was written in claude.ai before the hook existed and is pasted at the top. The hook did not capture every turn of the later session, so 11 prompts and 14 replies were **backfilled** afterwards from the Claude Code session transcript. Each backfilled entry is labelled `(backfilled from the session transcript)` in the file, they sit in time order among the live entries, and the live entries were not altered. Two caveats: a reply is recorded as the final message of its turn (as the hook does), not the intermediate tool calls and test output; and the author's local database password, which appeared in the log twice, was replaced with `[REDACTED-DB-PASSWORD]` (the password still exists in the git history of the earliest commits on this branch, and the author is rotating it). The public share link for the claude.ai chat is a placeholder at the top of `PROMPTS.md` for the author to fill in.
