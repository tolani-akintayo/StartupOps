# startup-capstone-api

Minimal Node.js/Express API standing in for a small startup's product. It exists to
be deployed, secured, monitored, and analyzed — not to be extended. Keep changes
to this app to a minimum so the three tracks are all working against a stable target.

## Run locally

```bash
cp .env.example .env
npm install
npm start
```

## Run via Docker

```bash
docker build -t startup-capstone-api .
docker run -p 3000:3000 \
  -v /var/log/app:/usr/src/app/logs \
  --env-file .env \
  startup-capstone-api
```

The `-v` bind mount is what lets the CloudWatch agent on the host read the app's
log files. Without it, logs stay inside the container and never reach CloudWatch.

## Endpoints

| Method | Path                | Auth | Notes |
|--------|---------------------|------|-------|
| GET    | `/health`           | none | liveness/readiness check |
| POST   | `/api/auth/register`| none | creates a user |
| POST   | `/api/auth/login`   | none | returns a JWT |
| GET    | `/api/products`     | none | product catalog |
| GET    | `/api/products/:id` | none | single product |
| GET    | `/api/orders`       | JWT  | current user's orders |
| POST   | `/api/orders`       | JWT  | create an order (`productId`, `quantity`) |
| GET    | `/api/users/:id`    | JWT  | fetch a user profile |
| GET    | `/api/admin/stats`  | none | business stats snapshot |

## Seeded accounts

| Username | Password         | Role  |
|----------|------------------|-------|
| alice    | Alice#2024       | user  |
| bob      | Bob#2024         | user  |
| carol    | Carol#2024       | user  |
| admin    | S3cur3AdminPass! | admin |

## Instructor notes — planted issues (do not share this section with students up front)

This app is deliberately imperfect so the Security track has real, discoverable
findings instead of a hypothetical checklist. Each is realistic and common in
production codebases, not contrived:

1. **Hardcoded backdoor credential** — `admin` / `admin123` authenticates
   successfully in `src/routes/auth.js`, bypassing the real password hash entirely.
2. **No rate limiting on `/api/auth/login`** — brute-forceable; detectable via
   `auth.log` volume from a single source.
3. **IDOR on `GET /api/users/:id`** — any authenticated user can read any other
   user's profile.
4. **Unauthenticated `/api/admin/stats`** — never had `requireAuth` wired up;
   leaks aggregate business metrics to anyone who finds it.
5. **Outdated dependency** — `lodash` is pinned to `4.17.15` in `package.json`
   specifically so a Trivy/`npm audit` scan returns a real, known finding
   rather than a synthetic one.

Expected flow: Security discovers these through log review and dependency
scanning (not by reading this file), documents them, and proposes/implements
fixes in weeks 3–4 of the sprint plan.
