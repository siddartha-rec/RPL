# RPL — Local Runbook

How to get the **Recykal Premier League (RPL)** auction platform running on
your laptop. Target: a cold clone to a logged-in browser session in under
fifteen minutes.

This is a runbook, not a tour. For *what* the system is and *why* it looks
the way it does, read `RPL_JOURNEY.md` first. Architecture lives in
`RPL_ARCHITECTURE.md`. Schema lives in `RPL_DATA_MODEL.md`.

---

## 1. TL;DR

```
# Prereqs: Java 21, Node 18+, Docker Desktop, git
cd backend && docker compose up -d                    # start MySQL
cd backend && ./mvnw spring-boot:run                  # start API on :8080
cd frontend && npm install && npm run dev             # start UI on :3000
open http://localhost:3000                            # log in: admin / admin123
```

If any of those four lines fails, read the rest.

---

## 2. Prerequisites

You need four things on the machine. Versions matter — the backend will
not compile on Java 17, and the frontend will not install cleanly on
Node 16.

### Java 21

The backend targets Java 21 (see `backend/pom.xml`, `<java.version>21`).
The recommended way on macOS is `sdkman`:

```
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk install java 21.0.5-tem
sdk use java 21.0.5-tem
java -version    # should print "21.x.x"
```

`brew` alternative:

```
brew install --cask temurin@21
```

### Node 18+ and npm

```
brew install node              # latest LTS, currently >= 20
node -v                         # should print v18 or higher
npm -v
```

If you manage Node versions, `nvm install 20 && nvm use 20` works fine.

### Docker Desktop

Used only to run MySQL locally. Install from
<https://www.docker.com/products/docker-desktop/> or:

```
brew install --cask docker
open -a Docker                  # start the daemon, wait for the whale icon
docker ps                       # should not error
```

### git

```
git --version                   # ships with Xcode CLT; brew install git if missing
```

---

## 3. First-Time Setup

### 3.1 Clone the repo

```
git clone <repo-url> RPL
cd RPL
```

### 3.2 Fix the MySQL password mismatch (read this — it bites everyone once)

The backend expects MySQL root password `root@123` (see
`backend/src/main/resources/application.yml`). The Docker compose file
ships with `MYSQL_ROOT_PASSWORD: root`. They do not match.

**Fix it by editing `backend/docker-compose.yml`** so the password matches
what the backend wants:

```
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root@123       # was: root
      MYSQL_DATABASE: rpl_auction
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
```

(The other direction works too — change `application.yml` to `password:
root` — but if you do that, don't commit it. The convention in this repo
is `root@123`.)

### 3.3 Start MySQL

```
cd backend
docker compose up -d
docker compose ps               # mysql should be "running" / "healthy"
docker compose logs -f mysql    # optional: watch it boot
```

If you ever changed the password after the volume was already created,
MySQL will keep using the old password baked into the volume. Reset:

```
docker compose down -v          # the -v deletes the data volume
docker compose up -d
```

### 3.4 Run the backend

From `backend/`:

```
./mvnw spring-boot:run
```

The first run downloads the entire Maven dependency tree (Spring Boot,
JPA, Security, MySQL driver, springdoc, JJWT, Testcontainers). On a fresh
machine this is **5-10 minutes** and looks like nothing is happening.
That is normal.

You're ready when you see roughly:

```
Started RplAuctionApplication in 12.483 seconds
```

The backend is now on `http://localhost:8080`. On first boot it will:

- Auto-create every table (`ddl-auto: update`).
- Seed the default admin (`admin / admin123`).
- Seed RPL 2025 league, teams, and players.

### 3.5 Run the frontend

In **a new terminal** (leave the backend running):

```
cd frontend
npm install                     # one-time, ~1-2 minutes
npm run dev
```

Vite prints `Local: http://localhost:3000/`. Open it.

### 3.6 Log in

```
Username: admin
Password: admin123
```

You should land on the dashboard with the seeded RPL 2025 data.

---

## 4. Day-to-Day Commands

| Task                          | Command                                             |
| ----------------------------- | --------------------------------------------------- |
| Run backend                   | `cd backend && ./mvnw spring-boot:run`              |
| Run backend tests             | `cd backend && ./mvnw test`                         |
| Build backend jar             | `cd backend && ./mvnw clean package`                |
| Run frontend (dev)            | `cd frontend && npm run dev`                        |
| Build frontend (prod)         | `cd frontend && npm run build`                      |
| Preview prod frontend         | `cd frontend && npm run preview`                    |
| Lint frontend                 | `cd frontend && npm run lint`                       |
| Start MySQL                   | `cd backend && docker compose up -d`                |
| Stop MySQL                    | `cd backend && docker compose stop`                 |
| Stop MySQL + remove container | `cd backend && docker compose down`                 |
| Wipe MySQL data (start fresh) | `cd backend && docker compose down -v`              |
| Tail MySQL logs               | `cd backend && docker compose logs -f mysql`        |
| Tail backend logs             | watch the `./mvnw spring-boot:run` terminal         |
| MySQL shell                   | `docker exec -it $(docker compose ps -q mysql) mysql -uroot -p'root@123' rpl_auction` |

The backend has no separate "tail logs" command because it logs to
stdout. If you want a log file, redirect: `./mvnw spring-boot:run >
backend.log 2>&1`.

---

## 5. Verifying It's Working

A quick four-step smoke test. Run these once after first boot, and any
time the system feels weird.

### 5.1 Swagger is up

```
open http://localhost:8080/swagger-ui.html
# or
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/swagger-ui.html
# expect: 200 (or 302 to the index)
```

API docs JSON:

```
curl -s http://localhost:8080/api-docs | head -c 200
```

### 5.2 Login returns a token

```
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

You should get back a JSON envelope with `success: true` and a
`data.accessToken` field. Grab the token:

```
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
echo "$TOKEN" | head -c 40 ; echo
```

### 5.3 Authenticated read works

```
curl -s http://localhost:8080/api/leagues \
  -H "Authorization: Bearer $TOKEN" | head -c 400
```

You should see at least the seeded **RPL 2025** league.

### 5.4 The UI talks to the API

Open `http://localhost:3000`, log in as `admin / admin123`, and confirm
the dashboard shows teams. If teams are visible, CORS, JWT, and the DB
are all wired correctly.

---

## 6. Common Problems & Fixes

Each entry: **symptom → cause → fix**.

### Backend logs `HikariPool` exhaustion / "connection is not available"
- **Cause:** SSE streams hold connections open. After many
  reconnect/disconnect cycles during dev (Vite HMR, browser refresh, etc.)
  the pool can fill up.
- **Fix:** restart the backend (`Ctrl-C` the `./mvnw` process and re-run).
  If it's repeatable, check that the page isn't opening multiple SSE
  subscriptions on every render.

### "Port 8080 already in use" on backend start
- **Cause:** an old backend process (or anything else) still bound to
  8080.
- **Fix:**
  ```
  lsof -ti :8080 | xargs kill -9
  ```

### "Port 3000 already in use" on frontend start
- **Cause:** a stale `vite` process.
- **Fix:**
  ```
  lsof -ti :3000 | xargs kill -9
  ```

### Backend startup fails: `Communications link failure` / "cannot connect to MySQL"
- **Cause:** MySQL isn't running, or the password doesn't match.
- **Fix:**
  1. `docker compose ps` — is `mysql` actually up?
  2. If yes, the password is wrong. Confirm `application.yml` has
     `password: root@123` and that `docker-compose.yml` has
     `MYSQL_ROOT_PASSWORD: root@123`. If you changed it after the volume
     was created, run `docker compose down -v && docker compose up -d`.
  3. If port 3306 is already taken by a local MySQL, stop it
     (`brew services stop mysql`) or change the published port.

### "Access denied for user 'root'@'localhost'"
- **Cause:** same as above — password mismatch baked into the MySQL
  volume.
- **Fix:** `docker compose down -v && docker compose up -d`.

### Login spins forever / "Network Error"
- **Cause:** one of: backend is not running, backend is on a different
  port, CORS is mis-set, or the username/password is wrong.
- **Fix:**
  1. `curl http://localhost:8080/api-docs` — does it answer? If no,
     start the backend.
  2. Check the browser DevTools → Network tab for the failed
     `/api/auth/login` request. A 401 means wrong credentials. A
     CORS error means the frontend isn't on `http://localhost:3000`
     (CORS is locked to that exact origin in `application.yml`).
  3. Confirm credentials: `admin / admin123`.

### First `./mvnw` run is taking forever
- **Cause:** Maven is downloading the dependency graph. This is a
  one-time cost.
- **Fix:** wait. Run it on wifi, not tethered. If you want to confirm
  it's working, `ls ~/.m2/repository/org/springframework` should be
  growing.

### `npm install` errors with peer-dep complaints
- **Cause:** old npm or stale `node_modules`.
- **Fix:**
  ```
  rm -rf node_modules package-lock.json
  npm install
  ```

### Frontend 401s after a long break
- **Cause:** access token expired (1 hour). The axios client refreshes
  automatically on 401, but if the refresh token also died (1 week)
  you're logged out.
- **Fix:** log in again.

### Docker compose says `unknown shorthand flag` or the command isn't found
- **Cause:** old `docker-compose` (v1, hyphenated). This repo assumes
  v2 (`docker compose`, with a space) which ships with Docker Desktop.
- **Fix:** update Docker Desktop.

---

## 7. Where Things Live

```
RPL/
├── backend/                    # Spring Boot 3.4 API (port 8080, Java 21)
│   ├── src/main/java/com/rpl/auction/
│   ├── src/main/resources/application.yml
│   ├── docker-compose.yml      # MySQL 8.0 only
│   ├── pom.xml
│   └── mvnw                    # use this, not a system maven
├── frontend/                   # React 19 + Vite (port 3000)
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── RPL_JOURNEY.md              # how the product was built, phase by phase
├── RPL_ARCHITECTURE.md         # system design
├── RPL_DATA_MODEL.md           # schema reference
├── RPL_RUNBOOK.md              # this file
└── ipl_auction_architecture_prompt.md   # the original brief
```

The two files most worth opening on day one:

- `backend/src/main/java/com/rpl/auction/auction/service/AuctionService.java`
  — the auction engine. Most of the real rules live here.
- `frontend/src/pages/AuctionPage.tsx` — the live broadcast screen.

---

## 8. Production Deployment

This section is intentionally short and honest. **The platform is not
deploy-ready as of this writing.** The gaps a real deploy would need to
close:

- **No Dockerfile for the apps themselves.** `backend/docker-compose.yml`
  only runs MySQL. There is no image for the Spring Boot service or the
  React build. A real deploy needs a multi-stage Dockerfile per app and
  a top-level compose (or Helm chart) that wires them together.
- **No CI/CD.** No GitHub Actions, no pipelines, no automated tests
  running on push. Tests exist (`./mvnw test`) but nothing enforces
  that they pass.
- **JWT secret is hardcoded** in `application.yml`. Acceptable for dev,
  unacceptable in prod. Move to an environment variable / secret store
  (`APP_JWT_SECRET`) before any non-local environment.
- **DB credentials are hardcoded** in `application.yml`. Same fix —
  externalize to env vars.
- **`ddl-auto: update`** is the local convenience setting. In prod this
  must move to `validate` (or `none`) and schema changes must go through
  a migration tool (Liquibase / Flyway).
- **CORS is hardcoded to `http://localhost:3000`.** Make it
  environment-driven.
- **No HTTPS / TLS** anywhere; the frontend talks to the backend on
  plain HTTP. A real deploy needs a reverse proxy (nginx, ALB, Cloud
  Run, etc.) terminating TLS.
- **No structured log shipping.** Backend logs to stdout. Fine for `docker
  logs`, not fine for production observability. Wire to whatever the
  org uses (Loki, ELK, CloudWatch).
- **No backups configured for MySQL.** The `mysql_data` Docker volume is
  not backed up to anything.
- **No rate limiting** on the auth endpoints. Login is currently a free
  brute-force target.
- **PWA service worker** is configured (`vite-plugin-pwa`) but not
  audited for prod cache strategy.
- **Default admin user** is seeded with a known password. First action
  on any real deploy: rotate that password (or replace the seed with
  an "admin must set password on first login" flow).

When that list shrinks, this section gets longer.
