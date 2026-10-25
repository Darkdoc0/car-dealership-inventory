# Test-first evidence

This project was built red-green-refactor: for each behavior a failing test was committed on its own, then the code that makes it pass.
PR #1 and PR #2 were **squash-merged**, so `main` shows each as one commit and their step-by-step history lives behind the pull requests. PR #2 and PR #3 are also merged into `main`'s history without squashing (see below), so their red-green commits show in `git log`:

- [PR #1](https://github.com/Darkdoc0/car-dealership-inventory/pull/1): the backend, the frontend and the end-to-end tests
- [PR #2](https://github.com/Darkdoc0/car-dealership-inventory/pull/2): the demo seed, the `.env.example` files and CI

GitHub keeps every commit of a merged pull request reachable, even if its branch is deleted, so the links below keep working.

## The numbers

Generated on 2026-10-25 from the full history of both pull requests: 110 commits (the Phase 1 bootstrap commit, 100 commits behind PR #1 and 9 behind PR #2).

| Commit type | Count |
|-------------|-------|
| `test:` | 42 |
| `feat:` | 29 |
| `fix:` | 2 |
| `refactor:` | 11 |
| `chore:` | 18 |
| `docs:` | 7 |
| `ci:` | 1 |

- **Every feature and fix has a test commit before it.** 31 of 31 `feat:` and `fix:` commits have a `test:` commit among the three commits before them.
- **Every commit carries the AI co-author trailer.** 110 of 110 commits have `Co-authored-by: Claude <AI@users.noreply.github.com>`.
- **Refactors change no behavior.** 11 `refactor:` commits, each made with the full test suite green and the tests unchanged.

## Check it yourself

A plain clone of `main` contains the PR #2 and PR #3 commits but not PR #1's, so to reach the rest fetch the pull request commits: `git fetch origin "refs/pull/*/head:refs/remotes/origin/pr/*"`. Then pick any row from the table below and run:

```bash
git checkout <test-commit>        # the failing tests, before any implementation
cd backend && npm ci              # (frontend/ for the frontend rows)
TEST_DATABASE_URL=postgresql://postgres:<password>@localhost:5432/car_dealership_test \
  npx cross-env NODE_ENV=test jest --runInBand tests/<the-test-file>   # expect failures
git checkout <implementation-commit>
# run the same command again: expect it to pass
```

**One replay, done on 2026-10-25 for the login endpoint:**

| Commit | Result of `tests/auth.login.test.ts` |
|--------|--------------------------------------|
| `89cbe44` `test(auth): add failing tests for POST /api/auth/login` | 6 of 6 failed, each with "Expected 200/400/401, received 404" because the route did not exist yet |
| `6a96348` `feat(auth): implement POST /api/auth/login` | 7 of 7 passed (one more test was added in between, for the 72-byte password rule) |

Only this pair was replayed by hand for this document. The other rows are the commit history as recorded; the same replay works for any of them.

## Every test commit and the commit that implements it

| # | What was built | Failing tests | Implementation |
|---|----------------|---------------|----------------|
| 1 | implement POST /api/auth/register | [`9f6f035`](https://github.com/Darkdoc0/car-dealership-inventory/commit/9f6f035b300c1d36a5681f59182997f50d17b234) | [`814315f`](https://github.com/Darkdoc0/car-dealership-inventory/commit/814315f1d69231e9c55b6f1ee65fb22294e75688) |
| 2 | reject passwords longer than 72 bytes | [`038067e`](https://github.com/Darkdoc0/car-dealership-inventory/commit/038067ea64f6e4aed81df2dd859d3db8bb78e639) | [`f9d4dc2`](https://github.com/Darkdoc0/car-dealership-inventory/commit/f9d4dc2135e8b8a9550d15d98c315e4035dd356b) |
| 3 | normalize registration emails to lower case | [`e515c49`](https://github.com/Darkdoc0/car-dealership-inventory/commit/e515c49db97286ad1a08097b767446e080157c0a) | [`b4a2040`](https://github.com/Darkdoc0/car-dealership-inventory/commit/b4a204065e5710a55a46b0b9b270ee5766bd60bd) |
| 4 | return JSON for malformed bodies and unexpected errors | [`01e994b`](https://github.com/Darkdoc0/car-dealership-inventory/commit/01e994ba2d020f23a27e54b6e0748cbe2b162d12) | [`ab6df67`](https://github.com/Darkdoc0/car-dealership-inventory/commit/ab6df67703e48a4a4db0887b695e74da6f66c95f) |
| 5 | track applied migrations and run each in a transaction | [`076a916`](https://github.com/Darkdoc0/car-dealership-inventory/commit/076a9169da37a3391e4cdafff226735cdfc839e4) | [`81b3080`](https://github.com/Darkdoc0/car-dealership-inventory/commit/81b3080cbaca402d5a4f3c86f874c004ee7097d0) |
| 6 | implement POST /api/auth/login | [`6c9cf6f`](https://github.com/Darkdoc0/car-dealership-inventory/commit/6c9cf6f5610e38cb9493d18d4bcfe466e8c3e1e9) | [`6a96348`](https://github.com/Darkdoc0/car-dealership-inventory/commit/6a9634859b56edbff42084d183fbfcf5b11f6c78) |
| 7 | rate limit failed login attempts per IP | [`8ff3225`](https://github.com/Darkdoc0/car-dealership-inventory/commit/8ff3225b92a0e554b88c7d9f5d1143ae0669cc7c) | [`e626311`](https://github.com/Darkdoc0/car-dealership-inventory/commit/e62631173d5de74b9fc4cfaf7c7001fbb882cbab) |
| 8 | add requireAuth JWT middleware and GET /api/auth/me | [`dd0a0fb`](https://github.com/Darkdoc0/car-dealership-inventory/commit/dd0a0fbcb54a88eef726f1db242e57abac9591ea) | [`69fb367`](https://github.com/Darkdoc0/car-dealership-inventory/commit/69fb367acd793f1dff49ab2bf2c9a713ed3730bc) |
| 9 | add user roles, requireRole guard and GET /api/admin/users | [`a967a59`](https://github.com/Darkdoc0/car-dealership-inventory/commit/a967a59eb08b3f31fa683fb5151c1d3b5fc7e835) | [`e5afea5`](https://github.com/Darkdoc0/car-dealership-inventory/commit/e5afea54274f9f053a1137e8f804959073ff051b) |
| 10 | add idempotent admin seed script (npm run seed:admin) | [`f56c79c`](https://github.com/Darkdoc0/car-dealership-inventory/commit/f56c79ce358bbcb391da97f3cdfbd458b8712efc) | [`e2aad52`](https://github.com/Darkdoc0/car-dealership-inventory/commit/e2aad525b18776236e45c31fd5ff5203d03c9447) |
| 11 | add cars table and admin-only POST /api/cars | [`441172a`](https://github.com/Darkdoc0/car-dealership-inventory/commit/441172a990eff3efd5802158c8a313a2e57fbb44) | [`a95c088`](https://github.com/Darkdoc0/car-dealership-inventory/commit/a95c088a16b3e6cc7e22be24538c1902c54c7169) |
| 12 | add GET /api/cars/:id for authenticated users | [`6f33619`](https://github.com/Darkdoc0/car-dealership-inventory/commit/6f3361971f13a152c09239a8bfa36948dea8e24f) | [`d087f93`](https://github.com/Darkdoc0/car-dealership-inventory/commit/d087f9356b3cd41370bca3d640990cf755570d8d) |
| 13 | add GET /api/cars with filters and pagination | [`afd73f8`](https://github.com/Darkdoc0/car-dealership-inventory/commit/afd73f8f3b179f983fae8e1f917fb4853cf6c174) | [`c330113`](https://github.com/Darkdoc0/car-dealership-inventory/commit/c3301136943e800849f01cdcf6c79feafc98967d) |
| 14 | add admin-only PATCH /api/cars/:id | [`363a0d8`](https://github.com/Darkdoc0/car-dealership-inventory/commit/363a0d828ae1f63050a35d1c7ddf392792cf23b3) | [`83ffc90`](https://github.com/Darkdoc0/car-dealership-inventory/commit/83ffc90c387f6bd281e80f184ca0299eee6238b5) |
| 15 | add admin-only DELETE /api/cars/:id | [`d245e0a`](https://github.com/Darkdoc0/car-dealership-inventory/commit/d245e0a343a3d96ec752d9c8af25a29af39fa55e) | [`7be84ee`](https://github.com/Darkdoc0/car-dealership-inventory/commit/7be84eec48a8a07d3e639c14bb0f5aab858de4ee) |
| 16 | add category and stock quantity | [`4d71c68`](https://github.com/Darkdoc0/car-dealership-inventory/commit/4d71c68ff3cb743f20f14d19c249e5dc788968aa) | [`809f09c`](https://github.com/Darkdoc0/car-dealership-inventory/commit/809f09cb1fde7b0f55e02246ec89df4c273d82c8) |
| 17 | add atomic POST /api/cars/:id/purchase | [`ffb0693`](https://github.com/Darkdoc0/car-dealership-inventory/commit/ffb06936784577f24e49f0e805518fc01bbb82ac) | [`0a3aa7f`](https://github.com/Darkdoc0/car-dealership-inventory/commit/0a3aa7f90ae6ad3130db737f9af4db729d1074b9) |
| 18 | add admin-only atomic POST /api/cars/:id/restock | [`c59f43b`](https://github.com/Darkdoc0/car-dealership-inventory/commit/c59f43bf6ed15675239cd83bbecf8218be36acf5) | [`f1b6685`](https://github.com/Darkdoc0/car-dealership-inventory/commit/f1b668535073994ff45ce2d8944552a4bfcf80ca) |
| 19 | implement the typed API client | [`367e4fc`](https://github.com/Darkdoc0/car-dealership-inventory/commit/367e4fc77a9ef3bb3da1020c0c527cfdea3eb950) | [`bd9aaa5`](https://github.com/Darkdoc0/car-dealership-inventory/commit/bd9aaa560ebfb881150d631698f1d8f79acb4f5a) |
| 20 | session, auth state, sign-in/register pages and route guards | [`13b095a`](https://github.com/Darkdoc0/car-dealership-inventory/commit/13b095a9b64398a5f03e5405f83f2d3ad0344327) | [`e4ceaee`](https://github.com/Darkdoc0/car-dealership-inventory/commit/e4ceaee8c96a75b4cd0d4b312d716f199d113c85) |
| 21 | restore the car fake's VIN template literal | [`13b095a`](https://github.com/Darkdoc0/car-dealership-inventory/commit/13b095a9b64398a5f03e5405f83f2d3ad0344327) | [`d8a466f`](https://github.com/Darkdoc0/car-dealership-inventory/commit/d8a466f2765d9cc5f59d8fbf0393fb197d5fa471) |
| 22 | vehicle dashboard with search, filters, pagination and purchase | [`962ee9e`](https://github.com/Darkdoc0/car-dealership-inventory/commit/962ee9e1f1f31c752d47f4d1895b73350d3595b7) | [`50ec9d7`](https://github.com/Darkdoc0/car-dealership-inventory/commit/50ec9d7feb1ddd67424765824224e1667d1d8731) |
| 23 | admin-only vehicle management list | [`2599ab0`](https://github.com/Darkdoc0/car-dealership-inventory/commit/2599ab0b6cf1e06eae46b2900020346d9846435a) | [`f04a40d`](https://github.com/Darkdoc0/car-dealership-inventory/commit/f04a40d770c6fa98b749c9cf2918af21d8e15fa0) |
| 24 | car form parsing, validation and change detection | [`e7928d1`](https://github.com/Darkdoc0/car-dealership-inventory/commit/e7928d13eb058a96956a2f0cce81b1dc4c0b8976) | [`2cd3f0f`](https://github.com/Darkdoc0/car-dealership-inventory/commit/2cd3f0ffa8b2601bba7a7683dc036acd465ed51c) |
| 25 | add and edit vehicle pages | [`044d582`](https://github.com/Darkdoc0/car-dealership-inventory/commit/044d582c67db7fa9c5da8c45481023885931f402) | [`5852fb2`](https://github.com/Darkdoc0/car-dealership-inventory/commit/5852fb2f3bab2e69f1e91c7ffc171ce3f48c13be) |
| 26 | restock and delete vehicles from the admin list | [`d8e4e92`](https://github.com/Darkdoc0/car-dealership-inventory/commit/d8e4e9270a70ad1ace5dbb8d3220fb8335c01f49) | [`a00e943`](https://github.com/Darkdoc0/car-dealership-inventory/commit/a00e9433f6549bc5db20090e7355daf5da64903a) |
| 27 | pressing Search with unchanged filters loads fresh results | [`6f7e566`](https://github.com/Darkdoc0/car-dealership-inventory/commit/6f7e56654787c660198b89e34d2064036bf03c5a) | [`5ee2fe4`](https://github.com/Darkdoc0/car-dealership-inventory/commit/5ee2fe4a54f081369eef930692cedabd05df0bb6) |
| 28 | send security headers with helmet and drop X-Powered-By | [`ce988bf`](https://github.com/Darkdoc0/car-dealership-inventory/commit/ce988bf1a5ea3e84e2e3040625d4f954670a8953) | [`78d0bef`](https://github.com/Darkdoc0/car-dealership-inventory/commit/78d0befca162f9ea51a111333eba8fea52d4a261) |
| 29 | require a JWT secret of at least 32 characters in production | [`b29b3b6`](https://github.com/Darkdoc0/car-dealership-inventory/commit/b29b3b6523ca3e7b916ca2db7a8e56494c5ec7db) | [`35851c3`](https://github.com/Darkdoc0/car-dealership-inventory/commit/35851c31b19655861dc619310a66248f5084bad6) |
| 30 | read PORT and API_PROXY_TARGET from frontend/.env and add .env.example files | [`37e67cf`](https://github.com/Darkdoc0/car-dealership-inventory/commit/37e67cf8fa8c7350ec300bc701091237d5f220d3) | [`e273451`](https://github.com/Darkdoc0/car-dealership-inventory/commit/e273451781b7d5858678a7aac0c0a0068eeb9f77) |
| 31 | add npm run seed to reset the database and load demo data | [`37e67cf`](https://github.com/Darkdoc0/car-dealership-inventory/commit/37e67cf8fa8c7350ec300bc701091237d5f220d3) | [`01f4084`](https://github.com/Darkdoc0/car-dealership-inventory/commit/01f4084a20d4dff14b2982233d3eed67f73f13d7) |

Where one test commit appears in several rows, a single set of tests drove several small implementation steps.

## Aligning the API with the brief (PR #3), visible on `main`

The commits of [PR #2](https://github.com/Darkdoc0/car-dealership-inventory/pull/2) and [PR #3](https://github.com/Darkdoc0/car-dealership-inventory/pull/3) are part of `main`'s history through a merge commit that changes no files (`git merge -s ours`). Run `git log --oneline main` and each failing-test commit is followed by the commit that makes it pass. These are PR #3's pairs, in order; all 13 of its commits carry the co-author trailer.

| Behavior | Failing tests (red) | Implementation (green) |
|----------|---------------------|------------------------|
| `/api/vehicles` routes, `PUT /:id`, `GET /search`, `/api/cars` alias | `80912c8` (13 of 14 new tests failed) | `771b2fe` |
| `price` in dollars, dollar price filters | `087e037` (18 failed) | `7014662` |
| Optional `vin`, `year` and `mileage` | `dc020fe` (8 of 13 failed) | `ea32f89` |
| Frontend: new paths and verb, dollar filters, optional fields | `a2d73fb` (15 failed) | `dab1add` |

Not test-first: `230dce2` changes the end-to-end helper's path and adds one browser test in the same commit, written after the frontend worked. The rest of PR #3 is documentation (`7c144bb`, `4ea4da2`, `b212b93`, `2b5b05e`).

The history of [PR #1](https://github.com/Darkdoc0/car-dealership-inventory/pull/1) (the backend, frontend and first end-to-end tests) is deliberately **not** merged into `main`: its early commits contain the author's redacted local database password. It stays reachable through the PR #1 links above.

## Refactors

| Commit | Change |
|--------|--------|
| [`9b5f117`](https://github.com/Darkdoc0/car-dealership-inventory/commit/9b5f1170abe971c22be66c21f8ac732905e9fa4b) | accept an optional migrations directory |
| [`00d8010`](https://github.com/Darkdoc0/car-dealership-inventory/commit/00d801032ea4b0737e9ceed267175a1ba9f25fa1) | extract credential rules into credentials.ts |
| [`60fa189`](https://github.com/Darkdoc0/car-dealership-inventory/commit/60fa189bc7bce05b8576cc47e6354819bf9601b4) | split routes, schemas and SQL behind a CarRepository |
| [`cdd4764`](https://github.com/Darkdoc0/car-dealership-inventory/commit/cdd476448f0635e9a4e683a4fcbf905693afa94d) | extract UserRepository and make auth/admin/requireAuth factories |
| [`1f132be`](https://github.com/Darkdoc0/car-dealership-inventory/commit/1f132bed4ed231de1558a155cf64ddd647c21343) | let createApp take injected repositories |
| [`7fc831e`](https://github.com/Darkdoc0/car-dealership-inventory/commit/7fc831ec950911d6135fa95a900c1eee37d25e8c) | extract a PasswordHasher and drop hashSync at import |
| [`8183103`](https://github.com/Darkdoc0/car-dealership-inventory/commit/818310365190085132a0d19ed8f42259bceb4169) | centralize the error response shape in httpErrors |
| [`c4314a0`](https://github.com/Darkdoc0/car-dealership-inventory/commit/c4314a02698bc7b1fbd4136223e10c975a5455c4) | type Car.category and Car.status with the schema unions |
| [`dbab1c3`](https://github.com/Darkdoc0/car-dealership-inventory/commit/dbab1c36c86527c696395b032c3be700133ab1c2) | drive list filters from a declarative table |
| [`4409638`](https://github.com/Darkdoc0/car-dealership-inventory/commit/4409638997c470503ce7582671d0da8c25e6aa1b) | make startup and seeding testable, add graceful shutdown |
| [`4fcc55a`](https://github.com/Darkdoc0/car-dealership-inventory/commit/4fcc55afe68922904b94585c1b89ad1cdba1cbd8) | share search, paging and list states via useCarBrowser and CarResults |

## Limits of this evidence

- The pairing is mechanical: it matches each `feat:` or `fix:` commit to the nearest `test:` commit among the three before it, so it shows the order of commits, not that every test failed for the right reason. The login replay above shows what that looks like for one pair.
- A few tests were added after the code already worked, to close coverage gaps or to pin down an existing behavior. Those commits are named `test(...): cover ...` and appear as plain `test:` commits, not as "failing" ones.
- Some commits are infrastructure with no test of their own (`chore:` stubs that make a failing test compile, dependency changes, documentation).
