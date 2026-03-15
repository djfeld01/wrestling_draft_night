# Implementation Plan: Wrestling Draft

## Overview

Build a real-time wrestling draft application using Next.js 14+ (App Router), Tailwind CSS, Drizzle ORM, PostgreSQL (Neon), better-auth, and SSE. The implementation proceeds from project scaffolding and data layer through core draft logic, authentication, real-time sync, and finally the UI views and export functionality. All UI should follow a clean, minimalist aesthetic with a muted color scheme and very few icons.

## Tasks

- [x] 1. Project scaffolding and database setup
  - [x] 1.1 Initialize Next.js project with App Router, Tailwind CSS, and install dependencies
    - Run `create-next-app` with TypeScript and App Router
    - Install dependencies: `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`, `better-auth`, `fast-check` (dev), `papaparse`, `xlsx`
    - Configure `tailwind.config.ts` with a muted color palette (neutral grays, slate tones, minimal accent color)
    - Set up environment variables for `DATABASE_URL` (Neon connection string)
    - _Requirements: 1.1_

  - [x] 1.2 Define Drizzle schema and generate migrations
    - Create `db/schema.ts` with tables: `draftSessions`, `players`, `wrestlers`, `sessionWrestlers`, `picks` as specified in the design
    - Create `db/index.ts` with Neon serverless client and Drizzle instance
    - Configure `drizzle.config.ts` for Neon
    - Generate and apply initial migration with `drizzle-kit`
    - _Requirements: 1.1, 1.2, 11.5_

  - [x] 1.3 Implement CSV seed data parser and import endpoint
    - Create `lib/seed-parser.ts` to parse `seeds/Book1.csv` extracting: seed, name (from "Listed Name" or "Name"), team, record, weight class
    - Skip malformed rows and log warnings; skip unexpected weight class values; deduplicate by (seed, weight_class)
    - Create `app/api/seed/route.ts` POST handler that reads the CSV, parses it, and inserts into the `wrestlers` table
    - Validate exactly 33 wrestlers per weight class across 10 weight classes (330 total)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]\* 1.4 Write property test for CSV parsing (Property 20)
    - **Property 20: CSV parsing extracts required fields**
    - For any well-formed CSV row, parsing should extract non-empty seed, name, team, record, and weight class
    - **Validates: Requirements 11.2**

- [x] 2. Checkpoint - Ensure seed import and schema work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Session management and draft order logic
  - [x] 3.1 Implement session creation server action
    - Create `actions/session.ts` with `createSession(name, playerCount)` that validates `2 <= playerCount <= 16`, creates a `DraftSession` with status "setup", generates N players with unique 6-char alphanumeric auth codes, and populates 330 `sessionWrestlers` rows
    - _Requirements: 1.1, 1.2, 1.4, 2.2_

  - [ ]\* 3.2 Write property tests for session creation (Properties 1, 2, 4)
    - **Property 1: Session creation validates player count** — creating with n players succeeds iff 2 ≤ n ≤ 16
    - **Property 2: Session creation populates wrestlers** — new session has exactly 330 session wrestlers, 33 per weight class
    - **Property 4: Auth code uniqueness** — all N auth codes are distinct
    - **Validates: Requirements 1.1, 1.2, 2.2**

  - [x] 3.3 Implement session lifecycle transitions
    - Add `startSession(sessionId)` server action: transitions status from "setup" to "active"
    - Add logic to transition status to "completed" when all N×10 picks are made
    - Reject invalid transitions (e.g., starting an already active session)
    - _Requirements: 1.4, 1.5, 1.6_

  - [ ]\* 3.4 Write property test for session lifecycle (Property 3)
    - **Property 3: Session lifecycle state machine** — status transitions must follow setup → active → completed only
    - **Validates: Requirements 1.4, 1.5, 1.6**

  - [x] 3.5 Implement snake draft order calculation
    - Create `lib/draft-order.ts` with functions to calculate current player from global pick number and player count
    - Odd rounds: ascending (1→N), even rounds: descending (N→1)
    - Add `setDraftOrder(sessionId, order)` server action for organizer to assign pick positions
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]\* 3.6 Write property tests for snake draft order (Properties 7, 8)
    - **Property 7: Snake draft order correctness** — for any N (2–16) and round R (1–10), order is ascending for odd rounds, descending for even
    - **Property 8: Draft has exactly 10 rounds** — completed draft has N×10 picks across 10 rounds
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**

- [x] 4. Pick logic and validation
  - [x] 4.1 Implement makePick server action
    - Create `actions/draft.ts` with `makePick(sessionId, wrestlerId)` that:
      - Verifies it is the calling player's turn
      - Verifies the wrestler is available in the session
      - Verifies the player hasn't already picked from that weight class
      - Records the pick, marks wrestler unavailable, advances turn
      - Transitions session to "completed" if all picks are done
    - Return appropriate error messages for each validation failure per the design error handling table
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]\* 4.2 Write property tests for pick validation (Properties 9, 10, 11)
    - **Property 9: Picked wrestler becomes unavailable** — after a valid pick, the wrestler is unavailable and re-picking is rejected
    - **Property 10: Weight class uniqueness per player** — picking a second wrestler from the same weight class is rejected
    - **Property 11: Complete roster invariant** — completed draft gives each player exactly 10 picks, one per weight class
    - **Validates: Requirements 4.1, 4.2, 4.4, 4.5, 4.6, 5.3, 5.5**

- [x] 5. Pre-selection system
  - [x] 5.1 Implement pre-selection server actions
    - Create `actions/preselection.ts` with `setPreSelection(sessionId, wrestlerId)`, `clearPreSelection(sessionId)`, and `confirmPreSelection(sessionId)`
    - Store pre-selection in a lightweight store (database column on `players` table or in-memory per session)
    - Validate pre-selection is cleared if the wrestler is picked by another player
    - Confirming a pre-selection runs the same validation as `makePick`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]\* 5.2 Write property tests for pre-selection (Properties 14, 15, 16)
    - **Property 14: Pre-selection management** — player can set, change, remove pre-selection; at most one at a time
    - **Property 15: Pre-selection invalidation** — pre-selection cleared when wrestler is picked by another
    - **Property 16: Pre-selection confirmation becomes pick** — confirming a valid pre-selection records it as an official pick
    - **Validates: Requirements 6.1, 6.3, 6.4, 6.5**

- [x] 6. Authentication with better-auth
  - [x] 6.1 Configure better-auth and implement auth flows
    - Set up better-auth with Neon/PostgreSQL adapter in `lib/auth.ts`
    - Create `app/api/auth/[...all]/route.ts` for better-auth route handler
    - Implement `loginWithAuthCode(code)` server action that validates the code against the `players` table and creates a session via better-auth
    - Implement `requestMagicLink(email)` server action for magic link flow
    - Create Next.js middleware (`middleware.ts`) to check auth session on protected routes and redirect unauthenticated users to `/login`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]\* 6.2 Write property tests for auth (Properties 5, 6)
    - **Property 5: Auth code round trip** — submitting a valid auth code authenticates the correct player and session
    - **Property 6: Invalid auth code rejection** — submitting an unknown code results in failure
    - **Validates: Requirements 2.3, 2.4**

- [x] 7. Checkpoint - Ensure core draft logic and auth work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Real-time synchronization via SSE
  - [x] 8.1 Implement SSE endpoint and event broadcasting
    - Create `app/api/draft/[sessionId]/events/route.ts` with SSE stream
    - Implement an in-memory event bus (per-session subscriber list) that server actions push events to after DB writes
    - Support event types: `pick_made`, `pick_undone`, `pick_reassigned`, `draft_started`, `draft_completed`, `preselection_invalidated`, `turn_changed`
    - Support `Last-Event-ID` for reconnection
    - _Requirements: 7.3, 10.1, 10.3_

  - [x] 8.2 Implement client-side SSE hook and state management
    - Create `hooks/use-draft-events.ts` custom hook that opens an EventSource connection, parses SSE events, and updates local state
    - On `pick_made`: update wrestler availability, append to pick history, update turn indicator
    - On reconnect: fetch full draft state via REST and replace local state
    - Implement exponential backoff for connection failures (1s, 2s, 4s, max 30s)
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]\* 8.3 Write property tests for real-time state (Properties 17, 18, 19)
    - **Property 17: Pick history contains required fields** — each pick in history includes player name, wrestler name, weight class
    - **Property 18: Client state update on pick event** — applying a pick event updates availability, history, and turn without data loss
    - **Property 19: State restoration on reconnect** — fetched full state equals state from replaying all events
    - **Validates: Requirements 7.2, 10.2, 10.4**

- [x] 9. Admin screen and admin actions
  - [x] 9.1 Implement admin server actions
    - Add `makeProxyPick(sessionId, wrestlerId)` — same as `makePick` but executed by organizer on behalf of current player
    - Add `undoLastPick(sessionId)` — marks wrestler available, removes pick, reverts turn
    - Add `reassignPick(sessionId, pickId, newWrestlerId)` — validates same weight class, swaps wrestler availability and pick record
    - All admin actions broadcast SSE events
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [ ]\* 9.2 Write property tests for admin actions (Properties 21, 22, 23)
    - **Property 21: Proxy pick equivalence** — proxy pick produces identical state change as direct player pick
    - **Property 22: Undo pick round trip** — undoing last pick restores previous state
    - **Property 23: Reassign pick correctness** — reassignment swaps wrestlers correctly within same weight class
    - **Validates: Requirements 12.2, 12.3, 12.4, 12.5, 12.6, 12.7**

  - [x] 9.3 Build admin session management page
    - Create `app/admin/sessions/page.tsx` with session list, create session form (name + player count), and per-session controls (set draft order, start draft)
    - Clean, minimalist layout with muted colors; minimal iconography
    - _Requirements: 1.1, 1.4, 1.5, 3.1_

  - [x] 9.4 Build admin draft screen
    - Create `app/draft/[sessionId]/admin/page.tsx` showing full session state: players, picks, current round, current turn
    - Include proxy pick control (wrestler selector for current player's turn), undo button, reassign control
    - Clean, minimalist design; muted color scheme; very few icons
    - _Requirements: 12.1, 12.2, 12.4, 12.6_

- [x] 10. Checkpoint - Ensure admin actions and SSE work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Player views (mobile and desktop)
  - [x] 11.1 Build shared UI components
    - Create `WrestlerList` component: filterable table showing seed, name, team, record, weight class; unavailable wrestlers visually muted (not struck-through — use subtle opacity/color change)
    - Create `WeightClassFilter` dropdown: filters by weight class, shows locked classes for the player
    - Create `PickHistory` component: chronological pick list with player name, wrestler name, weight class
    - Create `TurnIndicator` component: shows current player's turn and round number
    - Create `PlayerRoster` component: player's drafted wrestlers organized by weight class
    - Create `PickConfirmation` component: prominent but clean confirm button when it's the player's turn
    - Create `PreSelectionControl` component: UI for setting/changing pre-selection when not the player's turn
    - All components use muted color scheme, minimal icons, clean typography
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.4, 7.2, 7.4, 7.5_

  - [ ]\* 11.2 Write property tests for wrestler display and filtering (Properties 12, 13)
    - **Property 12: Wrestler display contains required fields** — display includes seed, name, team, record, weight class
    - **Property 13: Weight class filter and sort** — filtering by weight class returns only matching wrestlers sorted by seed ascending
    - **Validates: Requirements 5.1, 5.2, 5.4**

  - [x] 11.3 Build player draft page with responsive layout
    - Create `app/draft/[sessionId]/page.tsx` as the main player view
    - Mobile layout (≤768px): stacked layout with wrestler list, weight class filter, pick confirmation, pre-selection control
    - Desktop layout (>768px): side-by-side layout with wrestler list on left, player roster and pick history on right
    - Wire up SSE hook for real-time updates
    - Clean, minimalist design; muted color scheme; very few icons
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]\* 11.4 Build weight class bracket view
  - Create a `BracketView` component that renders the NCAA tournament bracket for a selected weight class, showing seeded wrestlers in their bracket positions (1v33, 2v32, etc.)
  - Accessible from the player view and display screen via a "View Bracket" link or tab per weight class
  - Highlight drafted wrestlers within the bracket (show which player drafted them)
  - Read-only visualization — no pick interaction from the bracket view
  - Clean, minimalist bracket lines; muted color scheme consistent with the rest of the app

- [x] 12. Login page
  - [x] 12.1 Build login page
    - Create `app/login/page.tsx` with auth code input field and magic link request form (email input)
    - Display error messages for invalid codes and expired/used magic links
    - Clean, minimalist design; muted color scheme; very few icons
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 13. Display screen
  - [x] 13.1 Build display screen page
    - Create `app/draft/[sessionId]/display/page.tsx` as read-only view
    - Show `DraftBoard` component: all picks organized by player × weight class grid
    - Show available wrestlers grouped by weight class
    - Show pick history, current turn indicator, round number, and draft progress
    - Wire up SSE for real-time updates (updates within 2 seconds)
    - Optimized for large screen / TV display; clean layout with muted colors
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 14. Export functionality
  - [x] 14.1 Implement CSV and XLSX export endpoint
    - Create `app/api/draft/[sessionId]/export/route.ts` with GET handler
    - Accept `format` query param (`csv` or `xlsx`)
    - Validate session status is "completed" before allowing export
    - Generate file with columns: player name, wrestler seed, wrestler name, team, record, weight class
    - Return file as download with appropriate Content-Type and Content-Disposition headers
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]\* 14.2 Write property tests for export (Properties 24, 25, 26)
    - **Property 24: Export data completeness** — exported data has one entry per player per weight class with all required fields
    - **Property 25: CSV export round trip** — export to CSV then parse recovers all pick data
    - **Property 26: XLSX export round trip** — export to XLSX then parse recovers all pick data
    - **Validates: Requirements 13.2, 13.3, 13.4**

  - [x] 14.3 Add export button to admin screen
    - Add CSV and XLSX export buttons to `app/draft/[sessionId]/admin/page.tsx`, enabled only when session status is "completed"
    - Trigger browser file download on click
    - _Requirements: 13.1, 13.5_

- [x] 15. Landing page and navigation
  - [x] 15.1 Build landing page
    - Create `app/page.tsx` as the entry point with session list for organizers and a link to the login page for players
    - Clean, minimalist layout; muted color scheme
    - _Requirements: 1.3_

- [x] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All UI tasks should follow the user's preference: clean minimalist design, muted color scheme, very few icons
