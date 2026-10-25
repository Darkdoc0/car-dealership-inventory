# Test report

Generated 2026-10-25 from a fresh run of all three suites on `feat/backend-auth-register`.
All three pass: **527 tests, 0 failures, 0 skipped**.

| Suite | Tool | Tests | Result | Coverage (statements / branches / functions / lines) |
|-------|------|-------|--------|------------------------------------------------------|
| Backend (API, database, middleware) | Jest + Supertest, real PostgreSQL | 303 in 31 files | all passed (21 s) | 100% / 100% / 100% / 100% |
| Frontend (components, state, API client) | Vitest + Testing Library | 201 in 17 files | all passed (13 s) | 99.6% / 97.2% / 100% / 100% |
| End to end (real browser) | Playwright driving Chrome | 23 in 3 files | all passed (45 s) | not measured (see below) |

## How to run

Each suite is run from its own folder. They share the `car_dealership_test` database, so run them one after another, not at the same time.

```bash
cd backend  && npm test                 # or: npm run test:coverage
cd frontend && npm test                 # or: npm run test:coverage
cd e2e      && npm test                 # starts its own backend (:3101) and frontend (:5174)
cd e2e      && npm run report           # opens the HTML report with traces and screenshots of any failure
```

The end-to-end run resets `car_dealership_test`, seeds one admin user, and uses unique names for everything else it creates.
It drives the Chrome that is installed on the machine; set `E2E_CHANNEL=msedge` to use Edge instead.
A failing test keeps a screenshot and a trace under `e2e/test-results/`.

## Backend (303 tests, 100% coverage)

Built red-green-refactor: each feature has a failing-test commit before its implementation commit, and a code review ran before every implementation commit.
Covered: the demo seed (`npm run seed`: the logins, 15 vehicles in every category with exactly three at zero stock, the full reset, the production guards, and that the README lists the same logins), security headers (helmet), a minimum production JWT secret length, registration and login (hashing, validation, rate limiting, token expiry), the auth middleware (missing, malformed, forged, expired and `alg: none` tokens), roles (admin-only routes answer 403), the vehicles API (create, get, list and search with filters and paging, PUT/PATCH update, delete, price in dollars, optional VIN/year/mileage, the `/api/cars` alias), atomic purchase and restock (a 10-way concurrency test proves stock never oversells), migrations (tracking, rollback, locking), error handling, startup and shutdown.
Coverage is for every file Jest reports; the three-line `server.ts` and `seed.ts` entry files cannot be instrumented, and the logic they call (`bootstrap.ts`) is covered.

## Frontend (201 tests, 99.6% statements)

Covered: the API client (bearer auth, query building, error mapping, session expiry), token storage, auth state, the sign-in and register forms and their password rules, route guards, the vehicle list (search, filters, paging, out-of-order responses, purchase states), the admin list, the add and edit forms (validation, change detection, focus), and restock and delete.
Below 100%: only branches and a few statements, all of one kind: the `stale` / `cancelled` guards that ignore a response arriving after the component was replaced or unmounted (`useCarSearch`, `AuthContext`, `CarFormPage`), and one fallback in the API client for an error body that is JSON but has no message. Writing this report exposed two untested behaviors (what happens when loading the user fails right after a successful login, and changing a vehicle's status in the edit form); tests were added for them, along with the starting quantity in the add form, `messageFrom`, and `useApi` outside a provider.

## End to end (23 tests)

These run the real backend and the real frontend against a real database in a real browser, so they cover what the unit tests with fakes cannot: the proxy, the database, and the pieces working together.

| # | Spec | Scenario | Result | Time |
|---|------|----------|--------|------|
| 1 | admin | an admin sees the management link; a regular user does not and is turned away from /admin | passed | 2.4s |
| 2 | admin | an admin adds a vehicle, it appears in the admin list, and shoppers can then find it | passed | 1.6s |
| 2a | admin | a vehicle can be added with only make, model, category and price | passed | 1.3s |
| 3 | admin | the add form lists every problem at once and puts the cursor in the first bad field | passed | 1.3s |
| 4 | admin | reusing a VIN is refused by the server and the form stays open | passed | 1.6s |
| 5 | admin | editing a vehicle changes its price everywhere | passed | 1.6s |
| 6 | admin | restocking adds to the stock, and reopens a sold-out vehicle for sale | passed | 2.3s |
| 7 | admin | restock refuses a zero or fractional quantity before contacting the server | passed | 1.4s |
| 8 | admin | delete asks first (Cancel keeps the vehicle), then removes it from the admin list and the shop | passed | 1.5s |
| 9 | auth | a visitor is sent to the sign-in page and can reach the registration form | passed | 0.7s |
| 10 | auth | a new user registers, lands on the vehicle list signed in, and can sign out and back in | passed | 1.7s |
| 11 | auth | the session survives a page reload | passed | 1.4s |
| 12 | auth | a wrong password shows the server message and keeps the user on the sign-in page | passed | 1.1s |
| 13 | auth | registering an email that already exists is refused with a clear message | passed | 1.1s |
| 14 | auth | the registration form catches a short password before contacting the server | passed | 0.8s |
| 15 | auth | a session the server rejects signs the user out, both on reload and in the middle of use | passed | 1.6s |
| 16 | auth | a signed-in user is redirected away from the sign-in page, and signing out protects the shop again | passed | 1.7s |
| 17 | shop | searching by make shows only that make and says so when nothing matches | passed | 1.5s |
| 18 | shop | category and price range narrow the results, and Clear brings everything back | passed | 1.8s |
| 19 | shop | a long result list is paged: 12 per page with working Previous and Next | passed | 2.8s |
| 20 | shop | each purchase takes one unit from stock, the last one makes the button Sold out, and it survives a reload | passed | 1.7s |
| 21 | shop | a vehicle with no stock, and a reserved one, cannot be bought | passed | 1.4s |
| 22 | shop | when two shoppers race for the last unit, one wins and the other is told it is gone | passed | 2.7s |

### Do the end-to-end tests catch breakage?

I broke the application on purpose and checked that the suite noticed:

| Deliberate break | Caught? |
|------------------|---------|
| The "Sold out" button label changed to "Gone" in the UI | Yes: 2 tests failed |
| The purchase query's `quantity >= requested` check removed | No: buying the last unit already marks the car sold, and that guard alone blocks the second shopper. The backend suite has a test for this exact check |
| The purchase query's whole stock guard removed | Yes: the two-shoppers race test failed (it got "Internal server error" instead of "Not enough stock available") |

## Found by the end-to-end tests

Pressing **Search** with unchanged filters sent no request, so stock changed by other shoppers stayed hidden.
It was fixed with a failing unit test first (`fix(frontend): pressing Search with unchanged filters loads fresh results`).

## Known gaps

- No cross-browser run: the end-to-end suite uses Chrome only.
- No load or performance tests, and no automated accessibility audit (focus handling and labels are tested; contrast and screen-reader output are not).
- The end-to-end suite does not cover every unit-tested edge case (for example the 72-byte password limit or the VIN character rules); the unit tests do.
- Rate limiting is tested with a small limit in the backend suite only.
