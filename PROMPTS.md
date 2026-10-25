# PROMPTS

Raw, unedited AI chat log for this project.

> Session 1 (claude.ai, Claude Opus 5.5) began before the logging hook existed, so its opening prompt is pasted here verbatim. Public chat link: _TODO — add the share link for this conversation_.

---

### 🧑 User — 2026-10-23T17:47:00Z

Act as an Expert Full-Stack Developer and help me build the "Car Dealership Inventory System TDD Kata." I have several plugins enabled for this workspace: `test-driven-development`, `github`, `code-review`, `playwright`, and `claude-code-setup`. 

We will build this using Node.js/TypeScript with Express for the backend, PostgreSQL for the database, and React with Tailwind CSS for the frontend. 

Please execute this project step-by-step, strict adherence to the following guidelines:

### Phase 1: Environment & Compliance Setup
1. Use the `claude-code-setup` tool to initialize a local environment hook that will automatically log our entire chat history into a root `PROMPTS.md` file to fulfill the AI Usage Policy deliverables.
2. Initialize a Git repository using the `github` plugin.
3. Configure the `github` plugin to automatically append the required AI co-authorship trailer (`Co-authored-by: AI Tool Name <AI@users.noreply.github.com>`) to every commit message.

### Phase 2: Backend API (Strict TDD)
1. Use the `test-driven-development` plugin to enforce a strict "Red-Green-Refactor" cycle. 
2. Write failing tests FIRST for the following features, then implement the logic:
   - User Authentication (JWT-based Register/Login).
   - Protected Vehicle Endpoints (Add, List, Search by make/model/category/price, Update, Delete for Admin only).
   - Protected Inventory Endpoints (Purchase to decrease qty, Restock for Admin to increase qty).
3. Before committing any backend code, run the `code-review` plugin to ensure the code adheres to SOLID principles and clean coding practices. Commit frequently with descriptive narrative messages.

### Phase 3: Frontend SPA
1. Set up a React + Tailwind CSS single-page application.
2. Build the User Registration/Login forms, the Vehicle Dashboard, and the Search/Filter functionality. 
3. Implement the "Purchase" button logic (ensure it is disabled if quantity is zero) and the Admin UI for managing vehicles.
4. Use the `playwright` plugin to write and run automated browser tests for these critical UI workflows. Generate a final test suite report.

### Phase 4: Final Deliverables
1. Audit the entire codebase using the `code-review` plugin one last time.
2. Generate a comprehensive `README.md` that includes setup instructions, screenshots placeholders, and the mandatory "My AI Usage" section detailing how we used Copilot/Claude.
3. Verify that `PROMPTS.md` is populated, the test report is generated, and use the `github` plugin to push all final commits to the main branch.

Let's begin with Phase 1. Acknowledge these instructions and execute the repository and logging setup.

---

### 🧑 User — 2026-10-25T09:40:42.064Z

.claude/settings.json

---

### 🧑 User — 2026-10-25T09:43:24.300Z

Paste this as your first message in Claude Code:

> Phase 1 is done (repo, co-author git hook, PROMPTS.md logging hook, Playwright and GitHub plugins at project scope). Start Phase 2: backend in `backend/` with Express + TypeScript + PostgreSQL. Postgres 16 runs locally on Windows at localhost:5432, user `postgres`, password in `.env` (`NewPass123`), databases `car_dealership` and `car_dealership_test`. Use strict Red-Green-Refactor with a separate failing-test commit before each implementation commit, starting with `POST /api/auth/register`. Run a code review before each implementation commit.

---

### 🧑 User — 2026-10-25T11:51:00.249Z

ok lets start

---

### 🧑 User — 2026-10-25T11:51:53.549Z

before that Run the full backend suite with coverage and show me the uncovered lines. Add meaningful tests for any gaps, then run a code review of backend/ against SOLID and clean code, and fix what it finds in separate refactor: commits.

### 🤖 Claude — 2026-10-25T12:08:26.158Z

Backend coverage is now 100% for statements, branches, functions and lines. The suite went from 163 to 218 tests, all passing. The 9 new commits are on `feat/backend-auth-register` and not pushed, so PR #1 doesn't have them yet.

**Coverage**
The first run showed 96% statements and 92% branches. The gaps were nearly all failure paths:
- **Database errors:** the `requireAuth` lookup, login lookup and admin list had no tests for the database failing. Each now returns the generic JSON 500.
- **Pool errors:** an error on an idle connection is logged instead of crashing the process.
- **Migrations:** a failed migration rolls back, records nothing and releases its lock. The original error survives even if `ROLLBACK` also fails.
- **JWT edge cases:** a non-numeric subject, a string payload, and a missing secret.
- **Error handler:** the headers-already-sent branch, the other 4xx codes, and a new test for the 413 oversized-body response.
- **Smaller gaps:** `parseId` rejecting a 10-digit id that overflows int4, and the repository passing through unexpected database errors.
- **Startup scripts:** `server.ts` and `seed.ts` showed as 0% because Jest can't import them without starting a server. Refactor 7 below fixes that.

I also added `npm run test:coverage`. The tests went in as `test(backend): …` and a `chore` commit for the script.

**Review and fixes**
The whole-`backend/` review against SOLID and clean code found 8 issues. Each fix is its own `refactor:` commit, with all tests green after every one.
1. **UserRepository:** register, login, `/me` and the admin list no longer run SQL directly. They use the same repository pattern as cars.
2. **Injectable `createApp`:** it accepts fake repositories. A new test serves requests with no database at all and checks the pool is never touched.
3. **PasswordHasher:** hashing, verifying and the timing-equalizing dummy compare live in one place. The dummy hash is no longer computed at import time.
4. **`sendError`:** one place builds the `{ error }` body for every error response.
5. **Car types:** `Car.category` and `Car.status` use the schema unions instead of `string`.
6. **List filters:** the eight filters are rows in a table instead of an `if` chain.
7. **Bootstrap:** `server.ts` and `seed.ts` are thin files over `bootstrap.ts`.
   - Tests cover startup, port in use, missing `JWT_SECRET`, seeding and shutdown ordering.
   - The server now finishes in-flight requests and closes the database pool on SIGINT or SIGTERM.

I ran the real server and seed commands against the test database after the refactors: the server answered requests (401 without a login) and the seed created the admin. I could not trigger the shutdown with a real signal from this Windows shell, so shutdown is covered only by the unit tests.

The `server.ts` and `seed.ts` entry files still don't appear in Jest's coverage report. They're a few lines each and the logic they call is tested.

`PROMPTS.md` has uncommitted changes from the logging hook, which I left alone.

---

### 🧑 User — 2026-10-25T13:17:37.704Z

Yes, push to PR #1 and update its description with the new test count, 100% coverage, and the refactors.

### 🤖 Claude — 2026-10-25T13:18:27.605Z

I pushed the 9 new commits and updated PR #1's description. The PR now has 54 commits and is still open and ready for review (not a draft).

<pr-created>https://github.com/Darkdoc0/car-dealership-inventory/pull/1</pr-created>

I read the description back after editing, and it now has:
- **Testing:** 218 tests (replacing 163) and 100% coverage for statements, branches, functions and lines, via `npm run test:coverage`. It says plainly that the 3-line `server.ts` and `seed.ts` entry files aren't instrumented, and that the logic they call in `bootstrap.ts` is covered.
- **Layering:** the architecture bullet now covers the repositories, `PasswordHasher`, `sendError`, injectable `createApp`, and the thin entry files with graceful shutdown.
- **Refactors:** a new section lists the seven `refactor:` commits and the `test:` commit that closed the coverage gaps, with a note that behavior didn't change.
- **Reviewer notes:** I removed the line saying the users and auth routes still run SQL directly, since that's fixed. The other open items remain: purchases aren't recorded, `PATCH` can set an absolute quantity, and existing cars get the placeholder category `sedan`.

`PROMPTS.md` still has uncommitted changes from the logging hook, so it isn't in the PR. I'll commit it with the next real change unless you want it separate.

Next is Phase 3, the React + Tailwind frontend in `frontend/`. It will start with the login and register forms, with the Playwright setup later. Last time the branch question was declined, so tell me if you want a new branch such as `feat/frontend-spa` or the current one.

---

### 🧑 User — 2026-10-25T13:18:30.704Z

next
