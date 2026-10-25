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
