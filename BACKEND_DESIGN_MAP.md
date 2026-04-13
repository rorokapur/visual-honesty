# Backend Design Map

This map explains how requests move through the backend and where business logic lives.

## 1) System Shape

```text
Client Apps (study, ai-study, admin, contribute)
  -> Express API (server/server.ts)
    -> Middleware
      - CORS + JSON body parser
      - Session + Passport (admin routes)
      - Header session validator (participant/stimulus routes)
    -> Route Modules
      - /api/admin
      - /api/admin/agent
      - /api/participant
      - /api/stimulus
      - /api/contribute
      - /api/benchmarks/binned
    -> Postgres (pg pool)
      - tables (participants, sets, stimuli, responses, categories, admins, stats)
      - functions (create_participant, get_random_unseen_pair, submit_response, ...)
      - views (pair_stats, participant_category_benchmarks, ai_category_benchmarks)
```

## 2) Runtime Entry and Wiring

- Entry point is `server/server.ts`.
- `pool` from `server/db.ts` is the shared Postgres connection layer.
- Route wiring:
  - `/api/admin` and `/api/admin/agent` use session + Passport middleware.
  - `/api/participant`, `/api/stimulus`, and `/api/contribute` do not use admin session auth.
- Static files are served from `/uploads` for stimulus images.

## 3) Authentication and Session Model

### Admin authentication

- Implemented in `server/middleware/session.ts` with:
  - `express-session`
  - `connect-pg-simple` (session persistence in Postgres)
  - `passport-local` (email/password against `admins` table)
- Protected endpoints use `requireAdmin` from `server/middleware/auth.ts`.

### Participant session identity

- Participant endpoints rely on `X-Session-ID` header.
- `requireParticipant` stores this in `req.sessionId`.
- Validation is backed by SQL function `is_valid_participant(uuid)`.

## 4) Route Responsibilities

### `server/routes/participant.ts`

- `POST /api/participant`:
  - Calls DB function `create_participant(category, demographics)`.
  - Returns UUID used as session id.
- `GET /api/participant/validate`:
  - Calls `is_valid_participant(sessionId)`.
- `GET /api/participant/results`:
  - Calls `get_participant_results(sessionId)`.
- `GET /api/participant/category-comparison`:
  - Calls `get_participant_category_comparison(sessionId)`.

### `server/routes/stimulus.ts`

- `GET /api/stimulus/next`:
  - Calls `get_random_unseen_pair(sessionId)`.
  - DB chooses unseen enabled set, selects honest/deceptive pair, randomizes left-right, and creates or resumes a trial in `responses`.
- `POST /api/stimulus/submit`:
  - Calls `submit_response(sessionId, trialId, choice, frontendTime)`.
  - DB validates trial ownership and selected stimulus.

### `server/routes/admin.ts`

- Auth: login/logout/me.
- Content management:
  - Upload single stimulus or pair with `multer` into `/uploads`.
  - Create set if needed, insert stimuli rows.
  - Delete stimulus and clean file from disk.
  - Toggle set enabled state.
- Analytics/data:
  - Participants list.
  - Pair stats (`pair_stats` view).
  - Paginated responses joined with set/stimulus names.
  - Category CRUD with FK protection.

### `server/routes/contribute.ts`

- Public contribution ingestion.
- Uploads honest/deceptive pair.
- New sets from contributor flow default to `enabled=false` for review safety.

### `server/routes/agent.ts`

- Admin-only endpoint for creating AI participants (`is_ai=true`).

## 5) Core Data Model

### Main entities

- `participants`: session identity, `is_ai`, category, demographics.
- `sets`: logical stimulus set, category, enabled toggle.
- `stimuli`: images within a set, with `is_deceptive` truth label.
- `responses`: one trial per `(session_id, set_id)` pair, left/right options, selected choice, timing.
- `categories`: allowed set categories.
- `admins`: credentials for dashboard access.

### Derived analytics

- `participant_stats` and `ai_stats`: per participant per category aggregates.
- `pair_stats` view: pair-level performance metrics.
- `participant_category_benchmarks` and `ai_category_benchmarks` views: global category means.

## 6) Database Logic Ownership

The backend uses a "thin route, heavy SQL function" pattern for study behavior:

- Trial assignment logic: `get_random_unseen_pair`.
- Submission validation and idempotency: `submit_response`.
- Result computation and percentile logic: `get_participant_results`, `get_ai_results`.
- Category comparison payload: `get_participant_category_comparison`.
- Stats recompute/upsert: `upsert_participant_stats`, `upsert_ai_stats`.
- Benchmark bins: `get_binned_benchmarks`.

This means correctness is enforced centrally in Postgres, while Express mostly validates request presence and shapes response payloads.

## 7) End-to-End Request Flows

### Human study flow

1. Client creates participant via `POST /api/participant`.
2. Client stores returned UUID and sends it as `X-Session-ID`.
3. Client asks for next trial via `GET /api/stimulus/next`.
4. DB returns randomized left/right pair and trial id.
5. Client submits response via `POST /api/stimulus/submit`.
6. After completion, client requests results/comparisons from participant routes.

### Admin flow

1. Admin logs in via `POST /api/admin/login`.
2. Session cookie is stored in Postgres-backed session store.
3. Admin performs uploads/toggles/deletes/reads under `requireAdmin`.
4. Dashboard pulls analytics data from admin routes and SQL views.

### Contribution flow

1. Contributor uploads pair via `POST /api/contribute/upload`.
2. Files are written to `/uploads` and DB rows are inserted.
3. New set is created with `enabled=false` until admin reviews.

## 8) Operational Notes

- Migration runner: `server/scripts/migrate.ts` executes SQL files in `db/migrations` and tracks applied files in `migrations_log`.
- Admin creation script: `server/scripts/create-admin.ts` upserts credentials.
- CORS origin defaults to `VITE_CLIENT_URL` (or localhost fallback).
- API process starts only after a successful DB connectivity check.

## 9) Review Hotspots (Backend)

- Security:
  - Any hardcoded credentials in source should be removed.
  - Session cookie settings should be reviewed for production (`secure`, `sameSite`, `httpOnly` behavior).
- Consistency:
  - Benchmark route exists in both participant router and root API; ensure frontend uses intended path.
- Upload lifecycle:
  - Uploaded file rollback is handled on DB error; review for edge-case cleanup failures.
- DB ownership:
  - Because core logic is in SQL functions, migrations are the highest-risk change surface and should get the strongest review/tests.
