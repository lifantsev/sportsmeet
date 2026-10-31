# pickup: design handoff

Designs for **pickup**, a web app for finding, joining and hosting pickup games around UCLA and the Westside. CS 35L project, built with **React (frontend)** and **Node/Express (backend)**.

This folder is the source of truth for the UI. Build the app to match these screens.

---

## 1. What's in here

```
pickup-design-handoff/
├── HANDOFF.md          ← this file
├── sample-data.json    ← mock games, users and comments matching the screens
└── screens/            ← one file per screen, desktop + mobile
```

### How to read the `.dc.html` files

Each file is one screen, written as an HTML template. They won't open as normal web pages (they need the design tool's runtime). Read them as **specs**:

- **Inline `style="…"` attributes are the exact styles**: colors, sizes, spacing, radii, shadows. Copy the values.
- `{{name}}` is a placeholder filled from data. The data and logic are in the `<script type="text/x-dc">` block at the bottom of each file (`renderVals()` returns the values; `state` and `setState` show the interactive behavior).
- `<sc-for list="{{items}}" as="item">` is a loop, so it becomes `items.map(...)` in React.
- `<sc-if value="{{cond}}">` is a conditional, so it becomes `{cond && ...}` in React.
- `<dc-import name="Court" sport="Soccer" h="180px">` renders the shared **Court** component (`screens/Court.dc.html`). In React: `<Court sport="Soccer" height={180} />`.
- `<a href="Game.dc.html">` links show navigation between screens. Map them to the routes in section 4.

---

## 2. Design tokens

### Color

| Token | Hex | Use |
|---|---|---|
| `bg` | `#F8F8F7` | Page background (cool off-white) |
| `surface` | `#FFFFFF` | Cards, nav bar, inputs |
| `ink` | `#121316` | Primary text, primary buttons, active chips |
| `text-2` | `#4D5058` | Body copy |
| `muted` | `#63666E` | Secondary text, labels |
| `muted-2` | `#5C5F67` | Card meta text (park, time) |
| `border` | `#ECECEE` | Card borders, dividers |
| `border-2` | `#E2E2E6` | Chip and button borders |
| `input-border` | `#DFDFE3` | Form inputs |
| `fill` | `#F1F1F3` | Search bars, segmented controls, subtle fills |
| `accent` | `#2F62B0` | "X spots left" (when ≤ 2), links, avatar text |
| `live` | `#4C8DFF` | "Starting soon" dot |
| `success` | `#22663F` | "You're in" confirmation |
| `error` | `#A3263A` on `#FBEDEE` | Error state icon |

**Sport tag tints** (background / text): Basketball `#F3E6D8 / #7A4A1E` · Soccer `#E0F0E6 / #22663F` · Volleyball `#E3EEF7 / #24598C` · Tennis `#E3E9F5 / #2F62B0` · Ultimate `#DDEEE8 / #22594A` · Spikeball `#FBF0D4 / #7A5A0C`

**Avatar colors** (bg / text), cycled by user: `#E3E9F5/#2F62B0`, `#F3E6D8/#7A4A1E`, `#E0F0E6/#22663F`, `#EEE6F7/#5B3B8C`, `#F7E3E6/#9A2F45`, `#E6EEF2/#2D5A70`

### Type

Font: **Schibsted Grotesk** (Google Fonts, weights 400–800). Fallback: `system-ui, sans-serif`.

| Style | Size / line-height / weight / tracking |
|---|---|
| Page title (desktop) | 64px / 0.98 / 800 / -0.05em |
| Page title (mobile) | 34px / 1 / 800 / -0.05em |
| Detail title | 52px desktop, 32px mobile / 1 / 800 / -0.05em |
| Section heading | 24px / 700 / -0.035em |
| Card title | 21px / 1.18 / 800 / -0.035em |
| Body | 15–17px / 1.5 / 400 |
| Small / meta | 13–14px / 500–600 |
| Wordmark "pickup" | 26px / 800 / -0.05em (lowercase, text only, no icon) |

### Shape and spacing

- Radius: pills and buttons `999px`, game cards `26px`, big panels `28–30px`, inputs `14px`, tiles `16px`
- Page container: `max-width: 1280px`, side padding `32px` desktop / `20px` mobile
- Card grid: `repeat(auto-fit, minmax(min(340px, 100%), 1fr))`, gap `22px`
- Touch targets ≥ 44px
- Floating shadow: `0 10px 30px rgba(18,19,22,0.06–0.12)`. Cards mostly use a 1px border, not a shadow.
- Labels over court drawings: `background: rgba(18,19,22,0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.2); color: #fff`

### Breakpoint

- **≥ 768px:** top nav bar (Discover, Map, Create, Profile + "Host a game" button + avatar)
- **< 768px:** bottom tab bar (Discover, Map, **+ center create button**, My games, Profile). Create game and Game detail hide the tab bar and show a fixed bottom action button instead.

---

## 3. Shared components

| Component | Where it appears | Notes |
|---|---|---|
| `Nav` | Every desktop screen | White bar, bottom border. Active link is bold and underlined (2px, 8px offset). |
| `TabBar` | Mobile Discover, Map, Profile | Floating white pill, 72px tall, 14px from the edges, 18px from the bottom. Center "+" is a 62px black circle raised 30px. |
| `Court` | Card headers, game detail, sign-in, profile | **Top-down SVG drawing of the field for each sport.** See `screens/Court.dc.html` for the exact SVG. Uses `preserveAspectRatio="xMidYMid meet"` so it never crops; the background (wood planks or grass stripes) is a CSS repeating gradient that fills any size. Props: `sport`, `height`. *Planned: swap for real photos of each park later; keep it one component so that's a single change.* |
| `GameCard` | Discover, profile, create preview | Court header (180px) with distance pill top-right and sport and skill labels bottom-left/right → title → park (nav-arrow icon) → time (clock icon) → footer: host avatar + name, "X spots left" + players icon `joined/max`. The whole card links to the game. |
| `FeaturedGameCard` | Discover "Starting soon" | Court on the left (340px tall), details on the right, "Starts in N min" pill, avatar stack, "Join · N spots left" button. |
| `FilterChips` | Discover, Map | Pills, 42px tall. Active = black fill, white text. Sport chips have sport icons. |
| `SearchBar` | Discover, Map | Pill, 60px, search icon, placeholder "Search games, sports, or parks". |
| `SportIcon` | Chips, labels, map pins | Line icons for each sport, 48×48 viewBox, `stroke="currentColor"`. Copy from any screen file. |
| `Avatar` | Everywhere | Initials in a colored circle (colors above). Swap in profile photos when available. |
| `SegmentedControl` | Skill level (onboarding, create) | Pill track `#F1F1F3`, selected = black or white pill. |
| `EmptyState` / `LoadingState` / `ErrorState` | Discover | See section 5. |

---

## 4. Routes and screens

| Route | Desktop file | Mobile file |
|---|---|---|
| `/` (signed out) | `SignIn.dc.html` | `Mobile-SignIn.dc.html` |
| `/onboarding` | `Onboarding.dc.html` | `Mobile-Onboarding.dc.html` |
| `/discover` (home) | `Discover-E.dc.html` | `Mobile-Discover.dc.html` |
| `/map` | `Map.dc.html` | `Mobile-Map.dc.html` |
| `/games/:id` | `Game.dc.html` | `Mobile-Game.dc.html` |
| `/create` | `Create.dc.html` | `Mobile-Create.dc.html` |
| `/profile` (and `/users/:id`) | `Profile.dc.html` | `Mobile-Profile.dc.html` |
| Discover states | `Discover-Empty`, `Discover-Loading`, `Discover-Error` | `Mobile-States.dc.html` (all three side by side) |

---

## 5. Behavior

- **Discover:** search plus filters (sport, skill, date range, distance). The "Starting soon" card is the next game starting within ~1 hour. The grid below is sorted by start time.
  - **Loading:** spinner + "Finding games near you…" + pulsing skeleton cards.
  - **Empty:** active filters shown as removable chips, an empty-court drawing, "No games match these filters", buttons **Clear filters** and **Host a [sport] game**.
  - **Error:** wifi-off icon, "We couldn't load games", **Try again** button.
- **Map:** list on the left (desktop) or bottom sheet (mobile), map with sport-icon pins. **Clicking a pin selects it** (pin turns black and grows, its list row gets a black border, and a popup shows title, time, count and "View game"). Clicking a list row selects its pin. For the real map, consider Leaflet + OpenStreetMap (free, no API key) or Google Maps.
- **Game detail:** **Join / Leave** toggles your spot: the count, "N spots left", progress bar and roster update right away, and you appear as "You" in the roster. The button switches between black "Join game" and outlined "Leave game". When the game is full, disable Join. The comments thread puts the host's pinned announcement on top.
- **Create game:** sport tiles, title, location (search + suggestions + map pin), date, start time, duration, skill (All levels / Beginner / Intermediate / Advanced), max players stepper (2–30), notes. **The preview card updates live** as you edit. The host counts as player 1. "Post game" goes to the new game's detail page.
- **Onboarding:** photo, name, bio, home location ("Use my location"), favorite sports (toggle tiles), and a skill level for each selected sport. "Skip for now" is allowed.
- **Profile:** banner, avatar, name, location, bio, "Edit profile". Stats: games played, hosted, this month. Sports with skill levels. Match history timeline grouped by period, each entry tagged Played or Hosted (filter: All / Played / Hosted).

---

## 6. Suggested data model and API

These are a starting point; adjust them to fit your backend.

```ts
type Sport = 'Basketball' | 'Soccer' | 'Beach volleyball' | 'Tennis' | 'Ultimate' | 'Spikeball';
type Skill = 'All levels' | 'Beginner' | 'Intermediate' | 'Advanced';

User   { id, name, photoUrl?, bio, homeLocation: { label, lat, lng }, sports: { sport: Sport, skill: Skill }[] }
Game   { id, sport, title, skill, location: { name, address?, lat, lng }, startsAt, durationMin,
         maxPlayers, notes, hostId, playerIds: string[], createdAt }
Comment{ id, gameId, authorId, body, pinned: boolean, createdAt }
```

```
GET    /api/games?q=&sport=&skill=&from=&to=&lat=&lng=&radiusMi=
GET    /api/games/:id
POST   /api/games
POST   /api/games/:id/join
DELETE /api/games/:id/join
GET    /api/games/:id/comments
POST   /api/games/:id/comments
GET    /api/users/me          PUT /api/users/me
GET    /api/users/:id/history
Auth:  Google OAuth ("Continue with Google")
```

Derived on the client: `spotsLeft = maxPlayers - playerIds.length`, distance from the user's home location, "Starts in N min".

---

## 7. Placeholders to replace

- The **"G" on the Google button** is a stand-in. Use Google's official sign-in button and logo.
- **Sample data** (names, stats, comments) is made up. The Pauley Pavilion address and every lat/lng in `sample-data.json` are approximate: **check them before use**.
- **Court drawings** will be swapped for park photos later.

---

## 8. Suggested build order

1. Set up tokens: CSS variables or Tailwind theme, plus the Schibsted Grotesk font.
2. Shared components: `Nav`, `TabBar`, `Court`, `SportIcon`, `GameCard`, `FilterChips`, `SearchBar`, `Avatar`.
3. Discover page with `sample-data.json` (include loading, empty and error states).
4. Game detail with join/leave (local state first).
5. Create game with the live preview.
6. Map (list + pins, selection sync).
7. Profile, onboarding, sign-in.
8. Node/Express API + database, then replace the mock data.
9. Google sign-in.

### Prompt to start with in Claude Code

> Read `design/HANDOFF.md` and the files in `design/screens/`. Set up the design tokens and build the shared components (Nav, TabBar, Court, SportIcon, GameCard, FilterChips, SearchBar, Avatar) in React, matching the screens' styles exactly. Then build the Discover page at `/discover` using `design/sample-data.json`, with the loading, empty and error states. Make it responsive: top nav at 768px and up, bottom tab bar below. Don't build the backend yet.
