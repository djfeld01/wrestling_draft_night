# Implementation Plan: Auto-Draft

## Overview

Implement the auto-draft feature in two layers: a pure selection function (`lib/auto-draft.ts`) and a React orchestration hook (`hooks/use-auto-draft.ts`), then wire the UI controls into the existing admin page. All picks flow through the existing `makeProxyPick` server action — no database or server-side changes needed.

## Tasks

- [x] 1. Implement the pure selection function
  - [x] 1.1 Create `lib/auto-draft.ts` with `selectBestWrestler` function
    - Export `DraftMode` type (`"by-seed" | "smart"`) and `AutoDraftRanking` interface
    - Implement selection algorithm: compute locked weight classes from player's picks, check pre-selection validity, filter available wrestlers from undrafted weight classes, sort by seed (by-seed mode) or draftPriority (smart mode) with weight class tiebreaker, return `sessionWrestlerId` or `null`
    - Wrestlers not found in Smart rankings fall back to seed-based ordering after all ranked wrestlers
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 4.1, 4.2, 4.3, 4.4_

  - [ ]\* 1.2 Write property test: Pre-selection takes priority
    - **Property 1: Pre-selection takes priority**
    - **Validates: Requirements 1.3, 3.5**

  - [ ]\* 1.3 Write property test: By Seed mode selects lowest seed from undrafted weight classes
    - **Property 2: By Seed mode selects the lowest seed from undrafted weight classes**
    - **Validates: Requirements 1.1, 1.2, 4.2, 4.4**

  - [ ]\* 1.4 Write property test: Smart mode selects lowest draftPriority from undrafted weight classes
    - **Property 3: Smart mode selects the lowest draftPriority from undrafted weight classes**
    - **Validates: Requirements 4.3, 4.4**

  - [ ]\* 1.5 Write property test: Selection never returns wrestler from already-drafted weight class
    - **Property 4: Selection never returns a wrestler from an already-drafted weight class**
    - **Validates: Requirements 1.2, 4.2, 4.3**

  - [ ]\* 1.6 Write property test: Selection returns null when no valid pick exists
    - **Property 5: Selection returns null when no valid pick exists**
    - **Validates: Requirements 1.5**

  - [ ]\* 1.7 Write unit tests for `selectBestWrestler` edge cases
    - Test by-seed mode with known state returns lowest seed wrestler
    - Test smart mode returns lowest draftPriority wrestler
    - Test player with 9 of 10 weight classes drafted only considers remaining class
    - Test all 10 weight classes drafted returns null
    - Test pre-selected wrestler from already-drafted weight class is skipped
    - Test pre-selected wrestler no longer available is skipped
    - Test tied seeds break by lowest weight class
    - Test wrestler not in Smart rankings sorts after ranked wrestlers
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 4.2, 4.3, 4.4_

- [x] 2. Checkpoint - Validate selection logic
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement the orchestration hook
  - [x] 3.1 Create `hooks/use-auto-draft.ts` with `useAutoDraft` hook
    - Import `selectBestWrestler` and rankings JSON
    - Manage `autoPlayers` set, `runStatus` (`idle`/`running`/`paused`), `draftMode`, `pickDelay` (default 2000ms), and `lastError` state
    - Implement `autoPickCurrent`: call `selectBestWrestler` for current turn player, then call `makeProxyPick` with the result; set `lastError` if selection returns null or proxy pick fails
    - Implement `toggleAutoPlayer`: add/remove player ID from `autoPlayers` set
    - Implement `startFullAutoDraft`, `pauseFullAutoDraft`, `cancelFullAutoDraft` to control run status
    - Use `useEffect` to watch draft state changes: if current turn player is in `autoPlayers` or `runStatus === "running"`, trigger `autoPickCurrent` after `pickDelay` ms delay
    - Handle race conditions: if `makeProxyPick` fails, re-evaluate with updated state and retry once; if retry fails, pause and surface error
    - Check `state.session.status === "active"` before each pick; stop if not active
    - Cleanup pending timeouts on unmount
    - _Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.3, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.5, 4.6, 6.4_

- [x] 4. Add auto-draft UI controls to admin page
  - [x] 4.1 Add Auto Pick button and draft mode selector to admin page
    - Add an "Auto Pick" button next to the current turn display that calls `autoPickCurrent`
    - Add a draft mode dropdown ("By Seed" / "Smart") that calls `setDraftMode`
    - Add a pick delay slider (1–5 seconds) for full auto-draft
    - Display `lastError` when present
    - _Requirements: 4.7, 5.1_

  - [x] 4.2 Add per-player auto-draft toggles to PlayersOverview
    - Add a toggle icon/button next to each player name that calls `toggleAutoPlayer`
    - Visually distinguish auto-draft players (e.g., robot icon or colored badge) when toggled on
    - _Requirements: 2.4, 5.2, 5.5_

  - [x] 4.3 Add full auto-draft controls to admin page
    - Add "Start Auto-Draft" button that calls `startFullAutoDraft`
    - When running, show "Pause" and "Cancel" buttons instead
    - Wire `useAutoDraft` hook into `AdminDraftClient` and pass state through
    - _Requirements: 3.3, 5.3_

  - [x] 4.4 Verify undo compatibility with auto-draft picks
    - Confirm existing undo flow works for auto-drafted picks without additional logic
    - _Requirements: 5.4_

- [x] 5. Checkpoint - Verify full integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Wire SSE event handling for auto-draft
  - [x] 6.1 Ensure auto-draft picks use existing SSE broadcast paths
    - Verify `makeProxyPick` triggers `pick_made`, `turn_changed`, and `draft_completed` SSE events identically to manual picks (already handled by reusing `makeProxyPick`)
    - No new SSE event types needed — confirm the hook stops auto-draft when `draft_completed` is received by checking session status
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests target the pure `selectBestWrestler` function using `fast-check`
- All auto-draft picks reuse `makeProxyPick` so SSE broadcasting is automatic
- No database schema changes are needed — all auto-draft state is ephemeral React state
