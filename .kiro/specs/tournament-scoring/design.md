# Design Document: Tournament Scoring

## Overview

This design adds tournament scoring capabilities to the wrestling draft application. The feature enables organizers to upload wrestler tournament scores via CSV, tracks upload history, and displays a live scoreboard showing player standings within each draft session.

The architecture follows the existing patterns in the codebase:

- Server actions in `actions/` for data mutations
- API routes in `src/app/api/` for file uploads
- React components with Tailwind CSS using theme-aware classes
- Drizzle ORM with Neon PostgreSQL

Scores are stored globally on the wrestlers table and apply uniformly across all draft sessions. The scoreboard calculates per-session standings by summing the tournament points of each player's drafted wrestlers.

## Architecture

```mermaid
flowchart TB
    subgraph UI["Frontend"]
        UP[Score Upload Page]
        SB[Scoreboard Page]
        SC[Session Card]
    end

    subgraph Actions["Server Actions"]
        USA[uploadScores]
        GSH[getScoreHistory]
        GSB[getScoreboard]
    end

    subgraph API["API Routes"]
        CSV[/api/scores/upload]
    end

    subgraph DB["Database"]
        W[(wrestlers)]
        SUH[(score_uploads)]
    end

    UP -->|POST multipart| CSV
    CSV -->|parse & validate| USA
    USA -->|update| W
    USA -->|insert| SUH

    UP -->|fetch| GSH
    GSH -->|query| SUH

    SB -->|fetch| GSB
    GSB -->|join picks + wrestlers| W

    SC -->|link| SB
```

The data flow:

1. Organizer uploads CSV via the Score Upload Page
2. API route receives the file, parses with papaparse
3. Server action validates and updates wrestler scores
4. Score upload history record is created
5. Scoreboard queries picks joined with wrestlers to calculate totals

## Components and Interfaces

### Score Parser (`lib/score-parser.ts`)

```typescript
export interface ParsedScore {
  wrestlerName: string;
  points: number;
}

export interface ScoreParseResult {
  scores: ParsedScore[];
  warnings: string[];
  error?: string;
}

export function parseScoreCSV(csvText: string): ScoreParseResult;
```

The parser:

- Uses papaparse (already in project) with header mode
- Detects column names case-insensitively: `name|wrestler|wrestler_name` for wrestler, `points|score|tournament_points` for points
- Returns error if required columns not found
- Skips rows with invalid/non-numeric points, adding to warnings
- Trims whitespace from wrestler names

### Server Actions (`actions/scores.ts`)

```typescript
export type UploadScoresResult =
  | { success: true; updated: number; skipped: number; warnings: string[] }
  | { success: false; error: string };

export async function uploadScores(
  scores: ParsedScore[],
  organizerEmail: string,
): Promise<UploadScoresResult>;

export type ScoreUploadRecord = {
  id: string;
  uploadedAt: Date;
  organizerEmail: string;
  wrestlersUpdated: number;
  summary: string;
};

export async function getScoreHistory(): Promise<ScoreUploadRecord[]>;

export type ScoreboardEntry = {
  playerId: string;
  playerName: string;
  totalPoints: number;
  rank: number;
  wrestlers: {
    wrestlerId: string;
    name: string;
    weightClass: number;
    points: number;
  }[];
};

export async function getScoreboard(
  sessionId: string,
): Promise<ScoreboardEntry[]>;
```

### API Route (`src/app/api/scores/upload/route.ts`)

```typescript
// POST /api/scores/upload
// Content-Type: multipart/form-data
// Body: file (CSV)
// Returns: UploadScoresResult
```

Handles file upload, calls parseScoreCSV, then uploadScores action.

### Score Upload Page (`src/app/admin/scores/page.tsx`)

- File input accepting `.csv` files
- Upload button with loading state
- Results display: success count, warnings list
- Score upload history table (reverse chronological)
- Protected route (organizer only via middleware)

### Scoreboard Page (`src/app/scoreboard/[sessionId]/page.tsx`)

- Displays players ranked by total tournament points
- Each row shows: rank, player name, total points
- Expandable rows showing wrestler breakdown
- Handles ties by showing same rank
- Shows "No scores yet" message when session has no picks

### Session Card Enhancement

Add a "Scoreboard" link to the existing SessionCard component for sessions with status `active` or `completed`.

## Data Models

### Schema Changes (`db/schema.ts`)

Add `tournamentPoints` column to wrestlers table:

```typescript
export const wrestlers = pgTable("wrestlers", {
  // ... existing columns
  tournamentPoints: integer("tournament_points").default(0).notNull(),
});
```

Add new `scoreUploads` table:

```typescript
export const scoreUploads = pgTable("score_uploads", {
  id: uuid("id").defaultRandom().primaryKey(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  organizerEmail: varchar("organizer_email", { length: 255 }).notNull(),
  wrestlersUpdated: integer("wrestlers_updated").notNull(),
  summary: varchar("summary", { length: 1000 }).notNull(),
});
```

### Migration

```sql
ALTER TABLE wrestlers ADD COLUMN tournament_points INTEGER NOT NULL DEFAULT 0;

CREATE TABLE score_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  organizer_email VARCHAR(255) NOT NULL,
  wrestlers_updated INTEGER NOT NULL,
  summary VARCHAR(1000) NOT NULL
);
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: CSV score parsing round trip

_For any_ valid CSV string containing a header row with recognized column names and data rows with wrestler names and numeric points, parsing the CSV should produce a list of `ParsedScore` objects where each entry's `wrestlerName` and `points` match the corresponding row in the input.

**Validates: Requirements 2.1, 2.6**

### Property 2: Score upload replaces existing values

_For any_ wrestler with an existing tournament score and any new score value, uploading a CSV containing that wrestler's name with the new score should result in the wrestler's `tournamentPoints` equaling exactly the new uploaded value (not the sum of old + new).

**Validates: Requirements 2.2, 2.7**

### Property 3: Invalid rows produce warnings without affecting valid rows

_For any_ CSV containing a mix of valid rows (recognized wrestler names with numeric points) and invalid rows (unrecognized names or non-numeric points), the upload result should include all invalid rows in the warnings list, and only valid rows should update wrestler scores.

**Validates: Requirements 2.3, 2.4, 2.5**

### Property 4: Upload history record matches upload result

_For any_ successful score upload, a corresponding history record should exist with `wrestlersUpdated` equal to the number of wrestlers actually updated, and the `organizerEmail` matching the uploader.

**Validates: Requirements 3.1, 3.2**

### Property 5: Upload history is reverse chronological

_For any_ sequence of score uploads, querying the upload history should return records sorted by timestamp descending (most recent first).

**Validates: Requirements 3.4**

### Property 6: Scoreboard entries are ranked by total points

_For any_ session with drafted wrestlers, the scoreboard should return all players sorted by total tournament points descending, with sequential rank numbers starting from 1. Players with equal totals should share the same rank.

**Validates: Requirements 4.1, 4.4, 4.5, 4.6**

### Property 7: Player total equals sum of wrestler points

_For any_ player on the scoreboard, their `totalPoints` should equal the sum of `tournamentPoints` for all wrestlers they have drafted in that session.

**Validates: Requirements 4.2, 4.3, 5.5**

### Property 8: Wrestler breakdown is ordered and complete

_For any_ player's wrestler breakdown in the scoreboard, the list should contain all drafted wrestlers (including those with zero points), each with name, weight class, and points, sorted by points descending.

**Validates: Requirements 5.2, 5.3, 5.4**

### Property 9: Failed uploads do not modify wrestler scores

_For any_ CSV that fails validation (e.g., missing required column headers), no wrestler scores in the database should be changed after the upload attempt.

**Validates: Requirements 7.3**

### Property 10: Case-insensitive wrestler name matching

_For any_ wrestler name and any case variation of that name in a CSV, the score uploader should match the wrestler and update their score identically to a case-exact match.

**Validates: Requirements 8.1**

### Property 11: Flexible column name recognition

_For any_ CSV using any of the recognized column name variants (`name`/`wrestler`/`wrestler_name` for wrestler, `points`/`score`/`tournament_points` for points), the parser should correctly identify and extract the data.

**Validates: Requirements 8.3, 8.4**

### Property 12: Unrecognized headers produce an error

_For any_ CSV where the header row contains no recognized wrestler column name or no recognized points column name, the parser should return an error indicating the required columns.

**Validates: Requirements 8.5**

## Error Handling

| Scenario                                  | Handling                                                |
| ----------------------------------------- | ------------------------------------------------------- |
| CSV file is empty or unreadable           | Return error from parser, display on upload page        |
| CSV has no recognizable headers           | Return error with message listing accepted column names |
| CSV row has non-numeric points            | Skip row, add to warnings list                          |
| CSV row has unrecognized wrestler name    | Skip row, add to warnings list                          |
| All CSV rows are invalid                  | Return success with 0 updated, all rows in warnings     |
| Database error during score update        | Return error, no partial updates (transaction rollback) |
| Unauthenticated user accesses upload page | Redirect to login via existing middleware               |
| Session not found for scoreboard          | Show 404 page                                           |
| Session has no picks                      | Show "No scores to show" message                        |
| File upload exceeds size limit            | Return error from API route                             |

Score updates should be wrapped in a database transaction so that either all matched wrestlers are updated or none are (atomicity). The upload history record is created within the same transaction.

## Testing Strategy

### Unit Tests

Unit tests cover specific examples and edge cases:

- Parse a known CSV string and verify extracted scores
- Parse CSV with mixed valid/invalid rows
- Parse CSV with no valid header → error
- Parse empty CSV → error
- Scoreboard with no picks → empty message
- Scoreboard with tied players → same rank
- Wrestler breakdown includes zero-point wrestlers
- Upload history returns empty list when no uploads exist

### Property-Based Tests

Property-based tests use `fast-check` (already in devDependencies) with minimum 100 iterations per property. Each test references its design document property.

Each correctness property (1–12) maps to a single property-based test:

- **Properties 1, 3, 11, 12**: Test the `parseScoreCSV` function directly with generated CSV strings
- **Properties 2, 10**: Test the `uploadScores` server action with generated score data against a test database
- **Property 4**: Test that upload history records match upload results
- **Property 5**: Test ordering of history records with generated timestamps
- **Properties 6, 7, 8**: Test the `getScoreboard` function with generated session/player/pick/score data
- **Property 9**: Test that failed uploads leave database unchanged

Tag format for each test: `Feature: tournament-scoring, Property {N}: {title}`

The parser properties (1, 3, 10, 11, 12) can be tested as pure functions without database access. The scoreboard properties (6, 7, 8) can be tested with in-memory data structures representing the computation logic, then verified with integration tests against the database.
