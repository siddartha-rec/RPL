# RPL — System Architecture

**Recykal Premier League (RPL)** is a live, broadcast-style cricket auction
platform. This document describes how the pieces fit together: what runs
where, how a click on a screen ends up on every other screen in the room,
and where to look in the code when something breaks.

It is meant to be readable by anyone — a teammate, a manager, a future
engineer. Where a technical name matters, it is mentioned in parentheses
so an engineer can map it to the code.

---

## 1. The Three Boxes

At the highest level, RPL is three things talking to each other: a browser,
a server, and a database. The browser is what people look at. The server
holds all the rules. The database holds all the data.

```
+----------------------------+        +----------------------------+        +----------------------+
|                            |        |                            |        |                      |
|   Browser (React PWA)      |        |   API Server (Spring Boot) |        |   Database (MySQL)   |
|                            |        |                            |        |                      |
|   - Login screen           | HTTPS  |   - Receives clicks        |  JDBC  |   - leagues          |
|   - Dashboard              | -----> |   - Checks permissions     | -----> |   - teams            |
|   - Auction live page      |  JSON  |   - Runs auction rules     |        |   - players          |
|   - Admin controls         |        |   - Talks to MySQL         | <----- |   - auctions         |
|                            | <----- |                            |        |   - bids             |
|   localhost:3000 (dev)     |  JSON  |   localhost:8080           |        |   - audit_logs       |
|                            |        |                            |        |   localhost:3306     |
|                            |        |                            |        |   db: rpl_auction    |
|                            | <===== |                            |        |                      |
|                            |  SSE   |                            |        +----------------------+
|                            | (push) |                            |
+----------------------------+        +----------------------------+
```

Two things to notice in that picture.

**The thick arrow on top (HTTPS / JSON)** is normal request-and-reply.
Browser asks "give me the dashboard," server answers. Browser says "place
this bid," server says "ok, here's the new state."

**The dashed arrow at the bottom (SSE)** is different. SSE stands for
**Server-Sent Events**. Once the browser opens an auction page, it tells
the server "keep me updated about auction 5" and the server holds that
connection open forever, pushing little messages whenever anything happens
("BID_PLACED," "PLAYER_SOLD," etc). The browser is not asking — the server
is broadcasting. This is what makes every screen update at the same time.

---

## 2. The Token (How The Server Knows Who You Are)

The browser proves who you are with a **JWT** (JSON Web Token). It looks
like a long random string, but it actually carries your user ID, your
roles, and an expiry, signed by the server.

```
              Login                                Subsequent requests
   +-------------------------+              +----------------------------+
   |                         |              |                            |
   | POST /api/auth/login    |              | GET /api/auctions/5        |
   | { user, password }      |              | Authorization: Bearer xxx  |
   |                         |              |                            |
   +-----------+-------------+              +-------------+--------------+
               |                                          |
               v                                          v
   +-------------------------+              +----------------------------+
   |                         |              |                            |
   |   Spring Boot           |              |   Spring Security          |
   |   - check password      |              |   - verify signature       |
   |   - issue access token  |              |   - read user + roles      |
   |     (1 hour)            |              |   - allow / deny           |
   |   - issue refresh token |              |                            |
   |     (7 days, rotating)  |              |                            |
   +-------------------------+              +----------------------------+
```

When the 1-hour access token expires, the browser quietly trades the
refresh token for a new access token (the **axios** interceptor in
`frontend/src/api/client.ts` does this on a 401). The user never sees a
forced logout mid-auction.

A default admin (`admin / admin123`) is seeded on first boot so the system
isn't locked out of itself.

---

## 3. Inside The Server (Layers)

The Spring Boot backend is organised in the classic three-layer style:
controllers at the front door, services holding the rules, repositories
talking to MySQL.

```
                  HTTP request comes in
                          |
                          v
   +------------------------------------------------+
   |            Controller layer                    |
   |   AuctionController, TeamController, ...       |
   |   - parses request                             |
   |   - validates input shape                      |
   |   - returns ApiResponse<T>                     |
   +------------------------+-----------------------+
                            |
                            v
   +------------------------------------------------+
   |            Service layer (the brain)           |
   |                                                |
   |        +-------------------------------+       |
   |        |    AuctionService (centre)    |       |
   |        |    - state machine            |       |
   |        |    - bid validation           |       |
   |        |    - SSE broadcasts           |       |
   |        +-------------------------------+       |
   |          ^         ^         ^         ^      |
   |          |         |         |         |      |
   |     +--------+ +--------+ +-------+ +--------+ |
   |     |  Auth  | |  RBAC  | | Audit | |History | |
   |     | login  | |perms   | | log   | |player  | |
   |     +--------+ +--------+ +-------+ +--------+ |
   |          ^         ^         ^         ^      |
   |     +--------+ +--------+ +-------+ +--------+ |
   |     | League | |  Team  | |Player | | User   | |
   |     +--------+ +--------+ +-------+ +--------+ |
   +------------------------+-----------------------+
                            |
                            v
   +------------------------------------------------+
   |          Repository layer (Spring Data JPA)    |
   |   AuctionRepository, BidRepository, ...        |
   |   - turns method names into SQL                |
   +------------------------+-----------------------+
                            |
                            v
                       MySQL 8.0
                       db: rpl_auction
```

The package layout mirrors this picture. Each module
(`auction`, `audit`, `auth`, `common`, `config`, `history`, `league`,
`player`, `rbac`, `team`, `user`) has its own `controller/`, `service/`,
`repository/`, `entity/`, and `dto/` folders.

The **AuctionService** sits in the middle because almost everything else
exists to support it: auth says who is allowed to bid, RBAC says what
each role can do, audit records what happened, history records who ended
up on which team, and league/team/player provide the things the auction
operates on.

---

## 4. A Bid, From Click To Every Screen

This is the most important sequence in the whole system. When the
auctioneer clicks "Bid for Team A," what happens between that click and
every other person in the room seeing it?

```
   +-----------+        +------------------+      +-----------------+      +---------+
   | Admin's   |        | Spring Boot      |      | AuctionService  |      | MySQL   |
   | Browser   |        | Controller       |      | (the rules)     |      |         |
   +-----+-----+        +--------+---------+      +--------+--------+      +----+----+
         |                       |                         |                    |
         |  POST /api/auctions/  |                         |                    |
         |    5/bid              |                         |                    |
         |  { teamId: 12 }       |                         |                    |
         |---------------------->|                         |                    |
         |                       |  placeBid(5, request)   |                    |
         |                       |------------------------>|                    |
         |                       |                         |                    |
         |                       |                         |  load auction      |
         |                       |                         |  load team         |
         |                       |                         |  load league       |
         |                       |                         |------------------->|
         |                       |                         |<-------------------|
         |                       |                         |                    |
         |                       |             check status == LIVE             |
         |                       |             check player on the block        |
         |                       |             check team has budget            |
         |                       |             check team isn't already top     |
         |                       |                         |                    |
         |                       |                         |  INSERT bid row    |
         |                       |                         |  UPDATE auction    |
         |                       |                         |  (highestBidId,    |
         |                       |                         |   timer reset)     |
         |                       |                         |------------------->|
         |                       |                         |                    |
         |                       |                         |  broadcast         |
         |                       |                         |  "BID_PLACED"      |
         |                       |                         |  via SseService    |
         |                       |                         |---+                |
         |                       |                         |   |                |
         |                       |                         |   | (to every      |
         |                       |                         |   |  subscribed    |
         |                       |                         |<--+  browser)      |
         |                       |                         |                    |
         |                       |  BidResponse            |                    |
         |                       |<------------------------|                    |
         |  200 OK + JSON        |                         |                    |
         |<----------------------|                         |                    |
```

While that one HTTP call is happening, **every other browser** that
opened the auction page has a separate, persistent SSE connection
(`GET /api/auctions/{id}/stream`). The moment the service calls
`broadcastEvent(...)`, an event named `BID_PLACED` lands in every one of
those connections at once. Each browser's `useSse` hook
(`frontend/src/hooks/useSse.ts`) catches it, the React state updates, and
the screen redraws — all within ~100ms.

### The full event vocabulary

`AuctionService` broadcasts these events (the constants live as plain
strings in the service):

| Event | When it fires | What the UI does |
| ----- | ------------- | ---------------- |
| `AUCTION_STARTED` | admin clicks Start (auction enters RETENTION) | flips dashboard chip to "in progress" |
| `AUCTION_LIVE` | retention done, bidding begins | shows the live auction page |
| `PLAYER_UP` | auctioneer puts a player on the block | flashes player nameplate, starts timer |
| `BID_PLACED` | a team bids | updates highest bid, resets timer |
| `BID_UNDONE` | admin undoes the last bid | rolls back highest bid |
| `PLAYER_SOLD` | auction sold to highest bidder | confetti + "SOLD!" overlay |
| `PLAYER_UNSOLD` | mark unsold / no bids | "UNSOLD" overlay |
| `PLAYER_RETAINED` | retention pick made | adds to team roster strip |
| `PLAYER_DRAFTED` | draft pick made | adds to team roster strip |
| `BUDGET_UPDATE` | a team's spent budget changed | updates the purse panel |
| `AUCTION_PAUSED` | admin pauses | freezes timer, dims controls |
| `AUCTION_RESUMED` | admin resumes | timer ticks again |
| `DRAFT_STARTED` | switched to draft phase | swaps live UI for draft picker |
| `AUCTION_COMPLETED` | admin completes (or force-completes) | shows final results banner |
| `TIMER_TICK` | (reserved for periodic timer pushes) | updates the countdown ring |

Every one of these events is also written to the **audit log** by the
same service, so even if a browser was disconnected when something
happened, there is a permanent record of it server-side.

---

## 5. The Auction State Machine

An auction is a small finite state machine. It can only ever be in one
of these states, and it can only move along the arrows.

```
                 +-----------+
                 |           |
                 |  PENDING  |   "I exist but no one has hit start yet"
                 |           |
                 +-----+-----+
                       |
                       | start()
                       v
                 +-----------+         +--------------+
                 |           |         |              |
                 |   SETUP   |-------->|  RETENTION   |   pre-auction:
                 |           |         |              |   captains lock in
                 +-----+-----+         +------+-------+   their picks
                       |                      |
                       |                      | advanceToLive()
                       |                      v
                       |               +--------------+
                       |               |              |
                       +-------------->|     LIVE     |<------+
                                       |              |       | resume()
                                       +--+--------+--+       |
                                          |   ^    |          |
                                          |   |    |          |
                                  pause() |   |    | switchToDraft()
                                          v   |    v
                                    +--------+ |  +--------------+
                                    |        | |  |              |
                                    | PAUSED |-+  |    DRAFT     |   leftover-budget
                                    |        |    |              |   pre-pick round
                                    +--------+    +------+-------+
                                          |              |
                                          |              |
                                          |   complete() |
                                          v              v
                                    +-----------------------+
                                    |                       |
                                    |      COMPLETED        |   terminal
                                    |                       |
                                    +-----------------------+
```

Notes:

- `RETENTION` and `DRAFT` are the two **side-channel** modes. Retention
  runs *before* live bidding (each team locks in its captain or pre-pick
  at a fixed cost). Draft runs *during/after* live bidding for teams with
  leftover budget who want to lock in extras.
- `PAUSED` is the only state that can return to `LIVE`. Everything else
  is one-way.
- `COMPLETED` is terminal. The only way past it is to start a new auction
  (typically a new league/season).
- `complete()` has a `force` parameter. Without force, the server checks
  every team meets the league's minimums (min players, min women); with
  force, it skips the check and stamps `forced: true` in the audit log.

---

## 6. The Frontend (What People See)

The React app is a single-page app served on **port 3000** in dev. Every
page lives behind login. There is no public page.

```
   +------------------------------------------------------------------+
   |                        <Layout>                                  |
   |                                                                  |
   |   +----------+   +--------------------------------------------+  |
   |   |          |   |                <TopBar>                    |  |
   |   |          |   +--------------------------------------------+  |
   |   |          |   |                                            |  |
   |   |          |   |                                            |  |
   |   | Sidebar  |   |             <page content>                 |  |
   |   |          |   |                                            |  |
   |   |          |   |                                            |  |
   |   |          |   |                                            |  |
   |   +----------+   +--------------------------------------------+  |
   +------------------------------------------------------------------+

   Routes (all wrapped by <Layout>, except Login):

      /login                LoginPage          (public; everything else
                                                redirects here if no JWT)
      /                     DashboardPage      (everyone)
      /teams                TeamsPage          (everyone)
      /teams/:id            TeamDetailPage     (everyone)
      /players              PlayersPage        (everyone)
      /auction              AuctionPage        (everyone watches; only
                                                admins see Bid / Pause /
                                                Resume / Complete)
      /admin                AdminPage          (admin only)
      /admin/audit          AuditLogsPage      (admin only)
      /history              HistoryPage        (everyone)
      /results              ResultsPage        (everyone)
```

Stack on the frontend:

- **React 19** + **TypeScript** + **Vite 8** — the build chain.
- **Material UI v7** — component library and theme.
- **React Query** — caches list/detail GETs, auto-refetches on focus.
- **axios** — HTTP client, with interceptors for the JWT and the silent
  refresh-on-401.
- **react-router** — routing.
- **PWA** — installable on phones.

The single file that ties live bidding together on the client is
`frontend/src/pages/AuctionPage.tsx`. It opens the SSE stream via the
`useSse` hook, dispatches each incoming event into local state, and
renders the player nameplate, timer, bid feed, and team purses.

---

## 7. Concurrency — Two People Click Bid At The Same Instant

Auction night is the one time when two clicks really can land on the
server in the same millisecond. The system handles this without explicit
locks, by leaning on three things that work together:

1. **`@Transactional` on every mutating service method.** Every method in
   `AuctionService` that changes state (`placeBid`, `soldPlayer`,
   `markUnsold`, `undoLastBid`, `pause`, `resume`, `complete`, the draft
   and retention picks) is wrapped in a database transaction. The two
   bids run in two separate transactions; whichever commits first wins
   the writes; the other one's read of `currentHighestBidId` is from
   *before* the first commit, so when it tries to insert its bid
   referencing the old highest, the second transaction's update of the
   auction row will conflict with the now-newer row state.
2. **MySQL's row-level locks at commit time.** Both transactions
   `UPDATE auctions SET current_highest_bid_id = ?` on the same row.
   InnoDB serialises those updates: one waits for the other. By the time
   the second transaction's update runs, it has the latest committed
   state of the auction row.
3. **Re-validation inside the transaction.** Inside `placeBid`, the
   service re-reads the auction, the team, and the league *inside the
   transactional method*, then re-computes the next bid amount from
   `currentHighestBidId`, and re-checks the team's available budget
   against `team.budget - team.budgetSpent`. If the first transaction
   already drove the price past what the second team can afford, the
   second transaction throws `BadRequestException` ("Insufficient
   budget") rather than silently overwriting.

There is no explicit `@Lock(PESSIMISTIC_WRITE)`, no `synchronized`
keyword, and no application-level mutex. The correctness comes from
"every change is a transaction, the database orders concurrent writes
on the same row, and the service re-checks invariants before saving."

The downside of this approach is that a **truly simultaneous** pair of
bids may both succeed if neither violates the invariants — e.g. they're
both valid increments computed from the same starting point. In practice
this hasn't bitten us because the timer + admin gating means bids arrive
serially during a real auction. If it ever does, the fix is to add a
`@Version` field on the `Auction` entity (optimistic locking), so the
second transaction would fail with an optimistic-lock exception and the
client could retry.

The audit log captures the truth either way: every accepted bid has its
own row with a timestamp, so reconstructing what happened is always
possible.

---

## 8. Deployment Shape (Dev)

In development, everything runs on one laptop:

```
   +------------------------+      +------------------------+
   |   Vite dev server      |      |   Spring Boot          |
   |   localhost:3000       | ---> |   localhost:8080       |
   |   (hot reload)         |      |   (mvn spring-boot:run)|
   +------------------------+      +-----------+------------+
                                               |
                                               v
                                   +------------------------+
                                   |   MySQL 8.0            |
                                   |   localhost:3306       |
                                   |   db: rpl_auction      |
                                   +------------------------+
```

Vite proxies `/api/*` calls and the `/api/auctions/*/stream` SSE channel
through to `localhost:8080` so the browser sees one origin.

Swagger UI is available at `http://localhost:8080/swagger-ui.html` for
poking at the API directly.

---

## 9. Where To Look (Reading Order For An Engineer)

If someone joins tomorrow and wants to be productive the next day, point
them at these five files in order:

1. **`backend/src/main/java/com/rpl/auction/auction/service/AuctionService.java`**
   — the engine. The state machine, bid validation, and every SSE
   broadcast lives here. If you read one file, read this one.

2. **`backend/src/main/java/com/rpl/auction/auction/controller/AuctionController.java`**
   — the API surface. Every endpoint the frontend hits, in one place.
   Maps HTTP routes to service methods.

3. **`frontend/src/pages/AuctionPage.tsx`** — the live screen on the
   client. Where the SSE events get translated into pixels.

4. **`frontend/src/hooks/useSse.ts`** — the tiny custom hook that opens
   the `EventSource`, registers listeners for every event type, and
   reconnects on disconnect.

5. **`backend/src/main/java/com/rpl/auction/config/SecurityConfig.java`**
   — the auth wiring. Which routes are public, how the JWT filter is
   installed, where roles are checked.

Reading those five in an afternoon is enough to understand the whole
system end-to-end.
