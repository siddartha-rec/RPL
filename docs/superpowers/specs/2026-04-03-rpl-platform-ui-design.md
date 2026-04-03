# RPL Platform — Full UI & Feature Design

**Date:** 2026-04-03
**Scope:** React frontend (PWA) + backend extensions for teams, players, auction, league management, and season history

---

## 1. Overview

RPL (Real Premier League) is a cricket auction platform for 5 teams with 85+ players. This design covers:

- **Team/Player Directory** — Browse teams, rosters, player profiles
- **Live Auction Platform** — IPL-style bidding with SSE real-time updates
- **League Management Dashboard** — Admin controls for seasons, teams, players, auctions

The platform serves 4 user roles: Super Admin, League Admin/Auctioneer, Team Owner, and Spectator.

---

## 2. Architecture

### Two-Service Architecture

| Service | Tech Stack | Port |
|---------|-----------|------|
| Frontend | Vite + React 18 + TypeScript (PWA) | 3000 |
| Backend | Spring Boot 3.4.3 (Java 21) | 8080 |
| Database | MySQL 8.0 | 3306 |

- Frontend communicates with backend via REST (JSON) + SSE (live auction events)
- CORS already configured for `http://localhost:3000`
- PWA enabled via `vite-plugin-pwa` + Workbox for cross-device access

### Frontend Stack

- **UI Framework:** MUI v5 with custom sports theme (bold team colors, energetic but clean)
- **State Management:** TanStack Query v5 (server state + SSE event integration)
- **Routing:** React Router v6 with role-based route guards
- **Real-time:** EventSource API for SSE subscription
- **PWA:** vite-plugin-pwa with Workbox (offline shell, install prompt)

---

## 3. Data Model

### Existing Entities (from Sub-project 1)

- **User** — id, username, passwordHash, displayName, email, isActive, permissionGroups
- **PermissionGroup** — id, name, description, leagueId, permissions
- **Permission** — id, module, name, description
- **Module** — id, name, description
- **RefreshToken** — id, userId, tokenHash, expiresAt, revoked
- **AuditLog** — id, userId, action, entityType, entityId, details, ipAddress, createdAt

### New Entities

#### League
- id (PK, auto-increment)
- name (varchar 100, e.g., "RPL 2025")
- season (varchar 20, e.g., "2025")
- status (enum: SETUP, ACTIVE, COMPLETED)
- teamBudget (decimal — default purse per team)
- maxPlayersPerTeam (int)
- maxRetentionsPerTeam (int)
- retentionCost (decimal — fixed cost per retention pick)
- bidIncrement (decimal — fixed bid increment during auction)
- timerSeconds (int — countdown timer per player, e.g., 30)
- createdAt, updatedAt

#### Team
- id (PK, auto-increment)
- name (varchar 100, e.g., "Tribe of Titans")
- shortName (varchar 10, e.g., "TOT")
- color (varchar 7, hex code for branding, e.g., "#FF5722")
- logoUrl (varchar 255, nullable)
- captainId (FK → Player, nullable)
- ownerId (FK → User)
- leagueId (FK → League)
- budget (decimal — remaining purse)
- budgetSpent (decimal)
- createdAt, updatedAt
- Unique constraint: (name, leagueId)

#### Player
- id (PK, auto-increment)
- name (varchar 100)
- playerNumber (int — from spreadsheet, 1-85)
- category (enum: CRICKET, OTHER)
- role (varchar 50, nullable — e.g., BATSMAN, BOWLER, ALL_ROUNDER)
- basePrice (decimal)
- teamId (FK → Team, nullable — null if unsold/available)
- leagueId (FK → League)
- status (enum: AVAILABLE, RETAINED, SOLD, UNSOLD)
- createdAt, updatedAt

#### Auction
- id (PK, auto-increment)
- leagueId (FK → League)
- status (enum: NOT_STARTED, RETENTION, LIVE, PAUSED, DRAFT, COMPLETED)
- currentPlayerId (FK → Player, nullable)
- currentBasePrice (decimal, nullable)
- currentHighestBidId (FK → Bid, nullable)
- timerSeconds (int — current countdown value)
- currentPickTeamId (FK → Team, nullable — whose turn in retention/draft)
- createdAt, updatedAt

#### Bid
- id (PK, auto-increment)
- auctionId (FK → Auction)
- playerId (FK → Player)
- teamId (FK → Team)
- amount (decimal)
- bidOrder (int — sequence number)
- isWinning (boolean)
- createdAt

#### DraftPick
- id (PK, auto-increment)
- auctionId (FK → Auction)
- playerId (FK → Player)
- teamId (FK → Team)
- roundNumber (int)
- pickOrder (int)
- pickType (enum: RETENTION, DRAFT)
- cost (decimal)
- createdAt

#### PlayerHistory
- id (PK, auto-increment)
- playerId (FK → Player)
- leagueId (FK → League — represents the season)
- teamId (FK → Team)
- acquisitionType (enum: RETAINED, AUCTIONED, DRAFTED)
- soldPrice (decimal, nullable — null for draft/retention with fixed cost)
- createdAt

#### TeamStanding
- id (PK, auto-increment)
- teamId (FK → Team)
- leagueId (FK → League)
- rank (int)
- points (int, nullable)
- notes (varchar 255, nullable — e.g., "Champions", "Runners-up")
- createdAt, updatedAt
- Unique constraint: (teamId, leagueId)

---

## 4. Auction Flow

### Phase 1: Retention (Round-Robin)

1. Admin configures retention settings on the league (maxRetentionsPerTeam, retentionCost)
2. Admin starts auction → status moves to RETENTION
3. Teams pick in fixed order: Titans → Samurais → Champions → Gladiators → Fighters → repeat
4. When it's a team's turn (`currentPickTeamId`), the team owner selects a player from the available pool
5. Server validates pick, deducts retentionCost from team budget, creates DraftPick (pickType=RETENTION), updates player status to RETAINED
6. SSE broadcasts the pick to all clients
7. Continues until all teams have used their retention slots or passed
8. Admin advances auction to LIVE phase — remaining players become the auction pool

### Phase 2: Live Auction (IPL-Style)

1. Auctioneer puts up a player → SSE: PLAYER_UP with name, category, basePrice
2. Timer starts (configurable, e.g., 30s) → SSE: TIMER_TICK every second
3. Team owners click BID → POST /api/auctions/{id}/bid
   - Server validates: budget sufficient, auction is LIVE, correct player, bid = currentPrice + increment
   - Creates Bid record, updates auction state
   - SSE: BID_PLACED with team name, amount; timer resets
4. Timer expires with no new bids:
   - If bids exist → SOLD to highest bidder. Player status = SOLD, team budget deducted, PlayerHistory created. SSE: PLAYER_SOLD
   - If no bids → UNSOLD. Player status = UNSOLD. SSE: PLAYER_UNSOLD
5. Auctioneer loads next player or pauses
6. Auctioneer can PAUSE/RESUME at any time

### Phase 3: Draft (Round-Robin for Remaining)

1. Auctioneer switches auction to DRAFT mode
2. Pick order: reverse of budget spent (team that spent least picks first)
3. Teams pick from unsold player pool at a fixed price
4. SSE: DRAFT_PICK broadcast for each selection
5. Continues until rosters are full or pool is exhausted
6. Auctioneer marks auction as COMPLETED

### SSE Event Types

| Event | Payload | When |
|-------|---------|------|
| AUCTION_STARTED | auctionId, leagueId, status | Auction begins |
| PLAYER_UP | playerId, name, category, basePrice, timer | New player on block |
| BID_PLACED | bidId, teamId, teamName, amount, timerReset | Bid accepted |
| PLAYER_SOLD | playerId, teamId, soldPrice, teamBudgetLeft | Timer expired, has bids |
| PLAYER_UNSOLD | playerId, name | Timer expired, no bids |
| AUCTION_PAUSED | auctionId | Auctioneer pauses |
| AUCTION_RESUMED | auctionId | Auctioneer resumes |
| DRAFT_PICK | playerId, teamId, pickOrder, round | Draft selection made |
| BUDGET_UPDATED | teamId, budgetRemaining, budgetSpent | After any purchase |
| TIMER_TICK | secondsRemaining | Every second during bidding |
| RETENTION_PICK | playerId, teamId, pickOrder | Retention selection made |
| AUCTION_COMPLETED | auctionId, summary | Auction ends |

---

## 5. UI Pages

### Auth Pages

0. **Login Page** — Username/password login, JWT token stored in memory (access) + httpOnly cookie or localStorage (refresh)

### Public / Spectator Pages

1. **Home Dashboard** — League overview, current season status, upcoming/live auction indicator, quick team cards
2. **Teams Directory** — All 5 teams as cards with team color, name, captain, budget remaining, player count
3. **Team Detail** — Full roster split by Cricket/Other, captain badge, acquisition type tags (retained/auctioned/drafted), budget breakdown
4. **Players Directory** — All players table/grid, filter by team/category/status, search by name
5. **Player Detail** — Player info, current team, season-by-season history (which team, how acquired, price)
6. **Live Auction (Spectator)** — Current player card, bid history stream, team purse tracker, timer, sold/unsold feed
7. **Auction Results** — Post-auction summary: all players sorted by team, sold prices, unsold list
8. **Season History** — Past seasons list, team standings per season, rosters per season

### Team Owner Pages (+ all public)

9. **My Team Dashboard** — Own team's budget, roster, retention slots remaining
10. **Live Auction (Bidder)** — Same as spectator + BID button (disabled when budget insufficient or not their turn), budget tracker, bid confirmation dialog
11. **Retention Picks** — Active during retention phase: available player pool, pick button (enabled only on their turn)

### Admin / Auctioneer Pages (+ all above)

12. **League Management** — Create/edit seasons, set budgets, max players, retention rules, bid increments
13. **Team Management** — Create/edit teams, assign colors, assign owners (link to User accounts)
14. **Player Management** — Add/edit players, bulk import (seed from spreadsheet data), set base prices, assign categories
15. **Auction Control Panel** — Start/pause/resume auction, put up next player, switch to draft mode, manual overrides, complete auction
16. **Retention Management** — Configure retention round, set pick order, monitor retention progress
17. **User & Role Management** — Create users, assign to permission groups (leverages existing RBAC)
18. **Season History Admin** — Enter/edit past team standings, archive seasons
19. **Audit Logs** — View all system activity (leverages existing AuditLog entity)

### Navigation

- **Sidebar:** Collapsible, role-based sections. Public items always visible. Owner section visible for Team Owner+. Admin section visible for League Admin+.
- **Top Bar:** League name + season badge, live auction pulsing indicator, notification bell, user menu with role badge.

---

## 6. API Endpoints

### League APIs
- `POST /api/leagues` — Create league/season (Admin)
- `GET /api/leagues` — List all seasons (Public)
- `GET /api/leagues/{id}` — League detail (Public)
- `PUT /api/leagues/{id}` — Update league settings (Admin)
- `DELETE /api/leagues/{id}` — Delete league (Super Admin)

### Team APIs
- `POST /api/leagues/{leagueId}/teams` — Create team (Admin)
- `GET /api/leagues/{leagueId}/teams` — List teams with budget info (Public)
- `GET /api/teams/{id}` — Team detail with roster (Public)
- `PUT /api/teams/{id}` — Update team (Admin)
- `DELETE /api/teams/{id}` — Delete team (Super Admin)

### Player APIs
- `POST /api/leagues/{leagueId}/players` — Add player (Admin)
- `POST /api/leagues/{leagueId}/players/import` — Bulk import players (Admin)
- `GET /api/leagues/{leagueId}/players` — List players with filters (Public)
- `GET /api/players/{id}` — Player detail with history (Public)
- `PUT /api/players/{id}` — Update player (Admin)
- `DELETE /api/players/{id}` — Delete player (Super Admin)

### Auction APIs
- `POST /api/leagues/{leagueId}/auctions` — Create auction (Admin)
- `GET /api/auctions/{id}` — Auction state (Public)
- `PUT /api/auctions/{id}/start` — Start auction (Admin)
- `PUT /api/auctions/{id}/pause` — Pause (Admin)
- `PUT /api/auctions/{id}/resume` — Resume (Admin)
- `PUT /api/auctions/{id}/complete` — End auction (Admin)
- `PUT /api/auctions/{id}/next-player` — Put up next player (Admin)
- `POST /api/auctions/{id}/bid` — Place bid (Team Owner)
- `GET /api/auctions/{id}/stream` — SSE event stream (Public)

### Retention & Draft APIs
- `POST /api/auctions/{id}/retention/pick` — Make retention pick (Team Owner, on their turn)
- `GET /api/auctions/{id}/retention` — Retention status/progress (Public)
- `POST /api/auctions/{id}/draft/pick` — Make draft pick (Team Owner, on their turn)
- `GET /api/auctions/{id}/draft` — Draft status/progress (Public)

### History APIs
- `GET /api/players/{id}/history` — Player season-by-season history (Public)
- `POST /api/leagues/{leagueId}/standings` — Enter team standings (Admin)
- `GET /api/leagues/{leagueId}/standings` — Get standings (Public)

---

## 7. Seed Data (from RPL 2025 Spreadsheet)

### 5 Teams

| Team | Short | Captain | Color |
|------|-------|---------|-------|
| Tribe of Titans | TOT | Sukesh Pasupuleti | #FF5722 (Deep Orange) |
| Squad of Samurais | SOS | Shreyas | #2196F3 (Blue) |
| Clan of Champions | COC | Pranay | #4CAF50 (Green) |
| Gang of Gladiators | GOG | Anurag | #9C27B0 (Purple) |
| Force of Fighters | FOF | Sai Teja | #F44336 (Red) |

### 85 Players (Cricket Team)

#### Tribe of Titans (1-17)
1. Abhay, 2. Sukesh Pasupuleti (C), 3. Manoj, 4. Sravanthi, 5. Lakshmi Hemalatha, 6. Sai Kumar Kappala, 7. Subhasis Saha, 8. Bramhendra Reddy, 9. G.Tarakredy, 10. Harsh khandelwal, 11. sai nitin, 12. Nanda Kishore Reddy Mummadi, 13. Rohith Basupally, 14. Swaroop, 15. SuryaAkhilesh, 16. Rajesh Dharavath, 17. Naresh Kadiga

#### Squad of Samurais (18-34)
18. Sujan, 19. Shreyas (C), 20. Ram, 21. Ramya potla, 22. Ankita Naik, 23. Bishal, 24. Alokesh Sinha, 25. Ayansh, 26. Jamirul, 27. Vivek, 28. Ravi, 29. Uttej Patange, 30. Ajay Vunyale, 31. Nehaal, 32. Shubham Dnyaneshwar Kale, 33. K Nageshwar Rao, 34. Sasi Pedapudi

#### Clan of Champions (35-51)
35. Vikram, 36. Pranay (C), 37. Praveen, 38. Sirivalli Sambaraju, 39. Josna Theresa Gigo, 40. Suraj Ragineni, 41. Y Siddartha Reddy, 42. Dheeraj, 43. vamsi chirumamilla, 44. Anoj S K, 45. Aditya Sarkar, 46. Aryadipta, 47. Purandhar, 48. Raja Rohith, 49. Naredla Hari Gopal Reddy, 50. Venkata Siva Prasad, 51. Anthony Joseph

#### Gang of Gladiators (52-68)
52. Abhishek, 53. Anurag (C), 54. Madhu, 55. Aruna Shanmugam, 56. Annada Shukla, 57. Chetan Baregar, 58. Rounak, 59. Parth Mishra, 60. Satyam Kumar, 61. Prakhar Maroo, 62. Arun Pillai, 63. Koushik, 64. Hari Prasad P, 65. Sourya Bhattacharjee, 66. Priteesh M, 67. Nagaraj Patil, 68. Gourav Sharma

#### Force of Fighters (69-85)
69. Vijay, 70. Sai Teja (C), 71. Varun, 72. Arya Deshpande, 73. Dhaanyashree G, 74. Hemalatha, 75. V Sampath Kumar, 76. Vinod Mylavarapu, 77. Hemanth.Alahari, 78. G Ramesh, 79. Gowtham Naidu, 80. SURAJ VAIBHAV REDDY, 81. Chaithanya, 82. GONI VIVEK VARDHAN, 83. Naveen Ranga, 84. Prince Pandey, 85. Swapnil patil

### Other Players (per team)

#### Tribe of Titans
SANTHOSH KUMAR NIMMALAPUDI, Sanket Waghmare, Chandra Mouli E, srihita, Kalyan Y, Penchala Nikitha, Sneha, Varshitha, Varshine, Kousihk Maji, Satya Ranjan, Risabh Basin, P. Nithish Reddy, Shantanu Pathak, Saurav Gaonkar, Pramod Hembrom, Janni Eswara Rao, Yamika Raina

#### Squad of Samurais
Vaishnavi, Sanjay Banerjee, Naveen Goud, Shubham Pathak, Sai Chaitanya, Arempula Chandu, Jagajjeeban Pati, Yogendra Majjari, RAVEENDRA BABU G, Gopanagar Srinivas Reddy, Jyoti Ranjan Barik, Anand M V, Pradyumn Yadav, Priyance Sarda, Kranthi Kumar, Mohammed Afrith

#### Clan of Champions
Shruti Totla, Janga Saikrishna, Nagesh Golla, Srinath S, GantiSuryaKushal, Shyam Kumar Bellam, Santhosh M, Gamidi Jadidiah Kingson, Arun Maharana, Kirananand Karamchetu, Likhil, Sreeja Guduri, Hari Kiran K, Samyuktha Vajja, Prashanth R, Sreeya Tipirisetty, Ravi, Venkata shiva

#### Gang of Gladiators
Abhishek Kumar, Pavan Manoj P, Prashanth Goud, Nagaraju, Pratap, Vamsi Krishna Ayila, suneel pradeep, Suresh behera, AJIJ JAMADAR, Dinesh Bandela, Dwaipayan Biswas, Apratim Kumar Singh, Pallavi, Sandeep Dillerao, p. shalin, Nupur Ashturkar

#### Force of Fighters
Anil Kumar K, Raghunandana, Saganti.Akhil, Prateek Rathi, Kalagiri Rakesh, Revanth Rallabandi, mohankumar kodi, Modi sreenath, Vishal kotwani, P Vijayasri, Aditya Th, Sree, NAGARAJU BANDI, K pavan sai, G Keerthi, Anurag Mishra, Atharva patil

---

## 8. Design Theme

**Style:** Sports/Tournament theme with clean structure. Bold team colors, dynamic auction cards, but clean typography and well-organized layouts. Think CricBuzz meets Linear.

**Team Branding:** Each team has its own primary color used for cards, badges, borders, and auction bid indicators. Team colors provide visual identity throughout the app.

**Key UI Patterns:**
- Pulsing red indicator when auction is live
- Animated bid cards sliding in during live auction
- Team-colored bid buttons for team owners
- Countdown timer with urgency color shift (green → yellow → red)
- Confetti/highlight animation on SOLD
- Card-based layouts for teams and players
- Responsive sidebar navigation (collapses on mobile for PWA)
