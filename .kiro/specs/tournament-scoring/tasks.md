# Implementation Plan: Tournament Scoring

## Overview

Add tournament scoring to the wrestling draft app: CSV score uploads, upload history tracking, and a per-session scoreboard with expandable wrestler breakdowns. Implementation follows existing patterns (server actions, API routes, Drizzle ORM, theme-aware Tailwind).

## Tasks

- [x] 1. Database schema and migration
  - [x] 1.1 Add `tournamentPoints` column to `wrestlers` table and create `scoreUploads` table in `db/schema.ts`
    - Add `tournamentPoints: integer("tournament_points").default(0).notNull()` to `wrestlers`
    - Add `scoreUploads` table with id, uploadedAt, organizerEmail, wrestlersUpdated, summary columns
    - _Requirements: 1.1, 1.3, 3.1, 3.2_
  - [x] 1.2 Generate and apply Drizzle migration
    - Run `npx drizzle-kit generate` to create migration SQL
    - Verify migration adds column with default 0 and creates new table
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. CSV score parser
  - [x] 2.1 Create `lib/score-parser.ts` with `parseScoreCSV` function
    - Use papaparse with header mode
    - Detect column names case-insensitively: `name|wrestler|wrestler_name` for wrestler, `points|score|tournament_points` for points
    - Return error if required columns not found
    - Skip rows with invalid/non-numeric points, adding to warnings
    - Trim whitespace from wrestler names
    - Return `ScoreParseResult` with scores array, warnings, and optional error
    - _Requirements: 2.1, 2.3, 2.4, 2.6, 8.1, 8.2, 8.3, 8.4, 8.5_
  - [ ]\* 2.2 Write property test: CSV score parsing round trip
    - **Property 1: CSV score parsing round trip**
    - **Validates: Requirements 2.1, 2.6**
  - [ ]\* 2.3 Write property test: Invalid rows produce warnings without affecting valid rows
    - **Property 3: Invalid rows produce warnings without affecting valid rows**
    - **Validates: Requirements 2.3, 2.4, 2.5**
  - [ ]\* 2.4 Write property test: Flexible column name recognition
    - **Property 11: Flexible column name recognition**
    - **Validates: Requirements 8.3, 8.4**
  - [ ]\* 2.5 Write property test: Unrecognized headers produce an error
    - **Property 12: Unrecognized headers produce an error**
    - **Validates: Requirements 8.5**

- [x] 3. Score upload server action and API route
  - [x] 3.1 Create `actions/scores.ts` with `uploadScores` server action
    - Accept parsed scores array and organizer email
    - Match wrestlers by name (case-insensitive) using `ilike` or lowered comparison
    - Update `tournamentPoints` for matched wrestlers within a transaction
    - Create `scoreUploads` history record in the same transaction
    - Return summary with updated count, skipped count, and warnings
    - _Requirements: 2.2, 2.3, 2.5, 2.7, 3.1, 3.2, 7.3, 8.1_
  - [x] 3.2 Create `src/app/api/scores/upload/route.ts` API route
    - Handle POST with multipart/form-data
    - Extract CSV file from request body
    - Call `parseScoreCSV` then `uploadScores`
    - Return JSON result with appropriate status codes
    - _Requirements: 2.1, 7.1_
  - [ ]\* 3.3 Write property test: Score upload replaces existing values
    - **Property 2: Score upload replaces existing values**
    - **Validates: Requirements 2.2, 2.7**
  - [ ]\* 3.4 Write property test: Case-insensitive wrestler name matching
    - **Property 10: Case-insensitive wrestler name matching**
    - **Validates: Requirements 8.1**
  - [ ]\* 3.5 Write property test: Failed uploads do not modify wrestler scores
    - **Property 9: Failed uploads do not modify wrestler scores**
    - **Validates: Requirements 7.3**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Score upload history
  - [x] 5.1 Add `getScoreHistory` server action to `actions/scores.ts`
    - Query `scoreUploads` table ordered by `uploadedAt` descending
    - Return array of `ScoreUploadRecord` objects
    - _Requirements: 3.3, 3.4_
  - [ ]\* 5.2 Write property test: Upload history record matches upload result
    - **Property 4: Upload history record matches upload result**
    - **Validates: Requirements 3.1, 3.2**
  - [ ]\* 5.3 Write property test: Upload history is reverse chronological
    - **Property 5: Upload history is reverse chronological**
    - **Validates: Requirements 3.4**

- [x] 6. Scoreboard server action
  - [x] 6.1 Add `getScoreboard` server action to `actions/scores.ts`
    - Join picks → sessionWrestlers → wrestlers to get each player's drafted wrestlers with points
    - Sum `tournamentPoints` per player
    - Sort by total descending, assign ranks with ties sharing the same rank
    - Include wrestler breakdown sorted by points descending
    - Include wrestlers with zero points in breakdown
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.2, 5.3, 5.4, 5.5_
  - [ ]\* 6.2 Write property test: Scoreboard entries are ranked by total points
    - **Property 6: Scoreboard entries are ranked by total points**
    - **Validates: Requirements 4.1, 4.4, 4.5, 4.6**
  - [ ]\* 6.3 Write property test: Player total equals sum of wrestler points
    - **Property 7: Player total equals sum of wrestler points**
    - **Validates: Requirements 4.2, 4.3, 5.5**
  - [ ]\* 6.4 Write property test: Wrestler breakdown is ordered and complete
    - **Property 8: Wrestler breakdown is ordered and complete**
    - **Validates: Requirements 5.2, 5.3, 5.4**

- [x] 7. Score upload page UI
  - [x] 7.1 Create `src/app/admin/scores/page.tsx` score upload page
    - File input accepting `.csv` files
    - Upload button with loading state
    - Results display: success count, warnings list
    - Score upload history table (reverse chronological) using `getScoreHistory`
    - Use theme-aware classes (bg-muted, text-foreground, etc.)
    - Protected route (organizer only, under `/admin` path handled by middleware)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 3.3, 3.4_

- [x] 8. Scoreboard page UI
  - [x] 8.1 Create `src/app/scoreboard/[sessionId]/page.tsx` scoreboard page
    - Display players ranked by total tournament points
    - Each row shows rank, player name, total points
    - Expandable rows showing wrestler breakdown (name, weight class, points)
    - Handle ties by showing same rank
    - Show "No scores yet" message when no picks exist
    - Add `/scoreboard` to public paths in `middleware.ts`
    - Use theme-aware classes
    - _Requirements: 4.1, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 6.2, 6.3, 6.4_

- [x] 9. Session card scoreboard link
  - [x] 9.1 Add "Scoreboard" link to `SessionCard` in `src/app/admin/sessions/session-manager.tsx`
    - Show link for sessions with status `active` or `completed`
    - Link to `/scoreboard/{sessionId}`
    - _Requirements: 6.1_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Score updates use database transactions for atomicity (all-or-nothing)
