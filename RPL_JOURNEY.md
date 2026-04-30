# RPL — From Idea to Working Platform

**Recykal Premier League (RPL)**
platform came together: what we wanted to build, how we planned it, and what
actually shipped, phase by phase.

This is meant to be readable by anyone — a teammate, an intern, a manager, a
future engineer. Where a technical name matters, it's mentioned in parentheses
so an engineer can map it to the code.

---

## 1. The Idea (The One-Pager)

> "We want to run an IPL-style player auction at Recykal — live, broadcast-
> quality, with real teams bidding for real employees. Build us the platform
> for it."

That was the brief. Strip it down and the platform has to do five things:

1. **Hold the data** — leagues, seasons, teams, players, budgets, retentions.
2. **Run the auction** — players go up one at a time, teams bid, a timer
   counts down, someone wins or the player goes unsold.
3. **Show it live** — every bid visible to everyone in the room within a
   blink. A timer everyone watches together. A scoreboard of team purses.
4. **Let admins control it** — start, pause, resume, undo, force-unsold,
   complete.
5. **Stay correct under pressure** — two people clicking "Bid" at the same
   instant must produce one valid result, not chaos.

We also agreed up-front on the tools:

- **Backend** — Java with Spring Boot, MySQL for storage. (Familiar, boring,
  reliable. Good for transactional rules.)
- **Frontend** — React + Vite + Material UI. PWA-capable so it could be
  installed on phones for owners.
- **Live updates** — Server-Sent Events (SSE), a one-way "the server pushes
  updates to your screen" channel. Simpler than WebSockets and enough for
  this use case.

Success looked like this: on auction day, three teams in a room, a host with
a mic, a big screen with the player on it, and bids landing on every screen
within half a second. No spreadsheets. No "wait, who bid?" moments.

---

## 2. The Plan (Before Writing Any Code)

The brief was big. We needed to slice it so each slice was useful on its
own — meaning if we stopped halfway, what we'd shipped would still work for
*something*.

The slicing rule we used: **each phase should leave the system in a demoable
state**.

Roughly, the order had to be:

| Slice | Why it goes here |
| ----- | ---------------- |
| Foundation (project skeleton, errors, logs) | Nothing else works without it. |
| Identity (login, roles, who-can-do-what) | Needed before any "admin only" feature is meaningful. |
| Domain (leagues, teams, players) | The auction has nothing to operate on otherwise. |
| Auction engine | The actual product. |
| Frontend skeleton | Something to *see*. |
| Core pages | One screen per real-world job (run auction, view teams, etc.). |
| Polish | Make it look like a broadcast, not a CRUD admin. |
| Refinements | Filters, pagination, fixes — only when we knew what real users wanted. |
| Lifecycle hardening | Pause/resume/complete and the safety nets around them. |

We deliberately kept "polish" *after* "core pages." Premature polish on a
half-built screen is wasted work — you redo it when the underlying data
shape changes.

---

## 3. What We Actually Built — Phase by Phase

Each phase below is grounded in real commits, in the order they happened.

### Phase 0 — Writing It Down (mid-March)

Before any code, we wrote the architecture prompt
(`ipl_auction_architecture_prompt.md`) — a structured brief that listed:
goals, fixed tech stack, functional areas, real-time requirements,
concurrency expectations, role types. Two more design specs followed.

**Outcome:** a shared mental model. Anyone joining could read three files
and know what the system was supposed to do.

**Lesson:** the time spent on the brief paid for itself. Every later
"should we do X?" was answered by reading what we'd already agreed to.

---

### Phase 1 — Backend Foundation (March 18)

We stood up the Java backend (Spring Boot) project itself. Just the
skeleton: it can start, talk to a database (MySQL), respond to HTTP, and
when something blows up it returns a clean JSON error instead of a stack
trace.

We added three boring-but-essential things:

- A **standard response envelope** (`ApiResponse`) — every API answer looks
  the same: success flag, message, data, errors, timestamp.
- **Custom exceptions** — `ResourceNotFoundException`, `BadRequestException`,
  etc. — so business rules can fail in a meaningful way.
- A **global exception handler** that turns those exceptions into the
  envelope above. No surprises for the frontend.

Also: Docker Compose for one-command local setup.

**Outcome:** an empty server that already follows the conventions every
later feature will use.

---

### Phase 2 — Who Are You, And What Can You Do? (March 18)

The auction needs an admin who can pause it, an owner who can bid for one
team, and viewers who can only watch. So before any of those screens exist,
we built the identity layer.

- **Users** with usernames, password hashes, display names.
- **Roles & permissions** (RBAC): we modelled it as Modules → Permissions →
  Permission Groups. A permission is something like `auction:BID` or
  `league:CREATE`. A group bundles them ("Admin," "Team Owner"). A user
  belongs to groups.
- **Audit log** — every meaningful action gets a row: who, what, when. Even
  if we never look at it during normal operation, the moment something goes
  wrong on auction night, this is the only thing that tells the truth.
- **JWT login** — short-lived access tokens + longer-lived refresh tokens
  with rotation. Standard, well-trodden.
- **Default admin** seeded on first boot so the system isn't locked out of
  itself.

**Outcome:** every later API can ask "is this caller allowed to do this?"
and get a real answer.

**Lesson:** building auth before features is annoying because you can't
demo anything yet, but retrofitting it later is much worse.

---

### Phase 3 — The Things The Auction Operates On (April 3)

Now the domain. We modelled what an auction *cares about*:

- **League** — the container. Has a season ("2025"), a per-team budget, a
  bid increment, a timer length, min/max players, etc.
- **Team** — belongs to a league, has a captain, an owner, a colour, a
  short name, a budget, and tracks how much it has spent.
- **Player** — belongs to a league, has a base price, a category (cricket /
  other), an optional role, a status (`AVAILABLE`, `RETAINED`, `SOLD`,
  `UNSOLD`).
- **Player history** — when a player moves to a team, we record it. Useful
  later for stats and "where did Player X play in 2025?"
- **Team standings** — placeholder for end-of-season rankings.

We also seeded real RPL 2025 data from a spreadsheet so the system had
something believable to look at.

**Outcome:** an admin could create leagues, teams, and players via API.
Nothing pretty yet — just data with rules.

---

### Phase 4 — The Auction Engine (April 3)

The crown jewel. This is where most of the rules live.

What it does:

- An auction belongs to a league and has a status:
  `PENDING → SETUP → LIVE → PAUSED → COMPLETED`. (Plus `DRAFT` and
  `RETENTION` modes for the special phases that come before live bidding.)
- An auctioneer "puts up" a player. The player's base price becomes the
  starting bid. The timer starts.
- Teams place bids. Each bid is the previous bid plus the league's bid
  increment. The system rejects bids the team can't afford, or that come
  while the auction is paused, or for a team that's already the highest
  bidder.
- The timer resets every time a bid lands.
- When the timer hits zero (or the auctioneer hits "Mark Sold"), the
  highest-bidding team wins, the player gets `SOLD`, the team's budget
  spent goes up, and a record lands in player history.
- "Force Unsold" is the auctioneer's escape hatch when no one bids.
- Every bid, sold, unsold, undo, pause, resume, and completion broadcasts
  an **SSE event** so every connected screen updates within ~100ms.
- Audit logs capture all of it.

We also built **retention** and **draft** picks — the mini-auctions before
live bidding starts, where a team can lock in a captain or use leftover
budget to pre-pick.

**Outcome:** a working auction, controllable entirely via API. No UI yet,
but a developer with curl could run a whole league.

**Lesson:** putting the engine before the UI was the right call. The
frontend ended up being mostly a presentation of state the engine already
knew how to expose.

---

### Phase 5 — A Browser Window That Knows How To Log In (April 3)

The frontend skeleton: React + TypeScript + Vite + Material UI, configured
as a PWA so it could be installed on phones.

We added:

- An **API client** (`axios`) with the auth token attached automatically,
  and a refresh-on-401 hook so logged-in users don't get bounced when their
  short-lived token expires.
- A **typed model** mirroring the backend (`League`, `Team`, `Player`,
  `Auction`, etc.) so the frontend can't accidentally read fields that
  don't exist.
- **Routing** with placeholder pages for every section we'd need: Login,
  Dashboard, Teams, Players, Auction, Admin.
- A **theme** — colours, gradients, typography — so the look would be
  consistent from day one.
- **Auth context** — the rest of the app reads "who is the current user
  and what can they do?" from a single place.

**Outcome:** you could log in, click around empty pages, and the URL
correctly told you where you were.

---

### Phase 6 — All Pages Get Wired Up (April 3)

In one big push we filled in every page so the app actually *did things*:

- **Login** — username + password.
- **Dashboard** — league summary, teams, quick stats.
- **Teams** — grid of teams; click into a team to see its roster.
- **Players** — searchable list, filterable by category and status.
- **Auction** — the live screen: current player, highest bid, timer,
  bidding controls.
- **Admin** — create leagues, teams, players; control the auction.

We also locked the whole app behind login (`dbfe418`): unauthenticated
visitors get redirected to `/login`. No public pages.

**Outcome:** a working end-to-end product. Ugly, but real.

---

### Phase 7 — Make It Look Like A Broadcast (April 3-4)

This is where we stopped looking like an internal admin tool and started
looking like a sports product.

Iterations included:

- A **premium sports theme** across every page — gradients, glassy cards,
  dramatic timer, animated SOLD!/UNSOLD! flashes, a confetti burst on
  sales, a live-pulsing "LIVE" badge.
- **Broadcast-quality dashboard** — hero banner, IPL-style team cards.
- **Broadcast-quality auction page** — big player nameplate, team-coloured
  bid panel, large countdown ring, live bid feed on the right.
- **Recykal branding** — replaced the cricket-ball logo with the official
  Recykal mark and stacked "Recykal Premier League" wordmark across the
  app.
- **Login redesign** — went through several rounds: split layout → 50/50 →
  centered card with auction-themed background → final banner-card-on-
  photo composition.

This phase was full of small visual commits — ten or fifteen "fix:" commits
tweaking padding, typography, and colour balance. That's normal. Premium
UI is iterative; you can't write it from a spec.

**Outcome:** screenshots that don't look like a CRUD app. The product felt
like an event.

**Lesson:** doing UI polish in tight feedback loops (change → reload →
look → change again) was way more effective than long sessions of "redo
the whole page."

---

### Phase 8 — Real-User Refinements (April 4)

Once the product was usable end-to-end, we noticed what was actually
painful:

- The Players page loaded *all* players. Fine for 50, awful for 500 — so
  we added **server-side pagination, search, and filters** (by category,
  status, team, season).
- League switching: we added a **season selector** to the dashboard, the
  teams page, and the players page so you can flip between RPL 2025 and
  RPL 2026 from one menu.
- Display: dropped the `₹` and "Lakh" formatting in favour of raw "CR"
  numbers (cleaner; matches what people say out loud during the auction).
- Team detail tables now show **incremental row numbers** instead of
  exposing internal database IDs.
- Lots of small layout fixes: 3 cards per row on dashboard, 2x2 stat
  grids on team cards, removed double margins between sidebar and content,
  removed counter badges that nobody read.

**Outcome:** the product stopped fighting its users.

**Lesson:** the difference between "we built it" and "people can use it"
is usually a hundred small fixes only real usage surfaces.

---

### Phase 9 — Auction Lifecycle, Properly (April 25)

The most recent phase. The engine had supported pause / resume / complete
since Phase 4, but the buttons weren't on the live page yet — admins had
been using the API directly. We fixed that, and added the safety nets
around completion.

What landed:

- **Pause / Resume / Complete buttons** on the live auction page, visible
  only to admins, with a confirm dialog on Complete.
- A **completion check** endpoint (`GET /api/auctions/{id}/completion-
  check`) that, without making any change, tells the UI: "can this auction
  be completed right now? If not, which teams are short on players or
  women, and by how many?"
- A **roster shortfall panel** that appears below the admin controls when
  the auction can't yet be completed. It lists every short team as a chip
  with its current vs. required count.
- A **Force Complete** button that appears next to the regular Complete
  button when validation would otherwise block. Clicking it shows a
  detailed confirm — exactly which rules are being bypassed and which
  player is on the block — then sends `?force=true` to the backend, which
  skips the check, completes the auction, and stamps the audit log with
  `forced: true`.
- **Cricket-themed decorations** added to the layout, sidebar, dashboard
  background, and login page — bats, balls, wickets, trophies as soft SVG
  watermarks. The white-on-white "is this still loading?" feel of earlier
  pages is gone.
- Cleaned up the team tiles on Dashboard and Teams pages — removed
  `TOT 0`-style badges that were noise, softened the watermark colour.

**Outcome:** auctions can now be run, paused, resumed, and ended entirely
from the UI. The "you can't complete because three teams are short"
problem is now visible in advance, and there's an explicit, audited
override for the cases where you genuinely want to bypass it (testing,
edge-case seasons).

**Lesson:** validation rules are good, but every validation rule eventually
needs an admin escape hatch with a paper trail. The right answer is rarely
"remove the rule" — it's "show the user why it fired, then let them
override on purpose."

---

## 4. What's Still Open

Documented here so a future session can pick up cleanly:

- **Configurable defaults** — `MIN_PLAYERS_PER_TEAM`, `MIN_WOMEN_PER_TEAM`,
  default budget, default bid increment should move into a `sys_config`
  table instead of being per-league overrides only.
- **Tiered bid increments** — increments grow as bids climb (e.g., +0.5
  CR up to 5 CR, +1 CR up to 10 CR, etc.).
- **Gender on player creation** — currently inferred or set elsewhere; the
  Add/Edit Player modal should accept it directly.
- **Min Players + Min Women** as fields on the Create League dialog.
- **CSV import** should accept a gender column.
- **Teams admin tab** — full CRUD with a season selector.
- **Auction Control season selector** — in the admin panel.
- **Bug** — `GET /api/leagues/{id}` returning null fields for league id=2.

---

## 5. Reading Order For A New Engineer

If someone joins tomorrow, point them at, in this order:

1. `ipl_auction_architecture_prompt.md` — the brief.
2. This document — the journey.
3. `backend/src/main/java/com/rpl/auction/auction/service/AuctionService.java`
   — the engine. Everything else is plumbing around it.
4. `frontend/src/pages/AuctionPage.tsx` — the live screen, where most
   real-time logic comes together on the client.

Reading those four in order, in an afternoon, is enough to be productive
the next day.
