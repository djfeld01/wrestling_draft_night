# Requirements Document

## Introduction

This feature adds tournament scoring capabilities to the wrestling draft application. It enables the organizer to upload wrestler tournament scores from CSV files, track score history across multiple uploads, and display a live scoreboard showing player standings within each draft session. Scores are global (attached to the master wrestlers table) and apply uniformly across all draft sessions. The scoreboard provides per-session standings with expandable breakdowns showing individual wrestler contributions to each player's total.

## Glossary

- **Organizer**: The authenticated admin user who manages draft sessions and uploads scores
- **Score_Uploader**: The component responsible for parsing and processing score CSV files
- **Score_History_Tracker**: The system that maintains a log of all score uploads with timestamps
- **Scoreboard**: The UI component displaying player standings and wrestler score breakdowns
- **Tournament_Points**: The cumulative points a wrestler has earned in the real tournament
- **Player_Team**: The collection of wrestlers a player has drafted in a session
- **Score_Upload**: A single CSV import event containing wrestler scores

## Requirements

### Requirement 1: Score Data Storage

**User Story:** As an organizer, I want wrestler tournament scores stored globally, so that scores are consistent across all draft sessions.

#### Acceptance Criteria

1. THE Database SHALL store tournament points as a numeric field on the wrestlers table
2. WHEN a wrestler's score is updated, THE Database SHALL apply the new score globally across all sessions
3. THE Database SHALL default tournament points to zero for all wrestlers

### Requirement 2: CSV Score Upload

**User Story:** As an organizer, I want to upload wrestler scores from a CSV file, so that I can efficiently update scores as the tournament progresses.

#### Acceptance Criteria

1. WHEN the organizer uploads a CSV file, THE Score_Uploader SHALL parse the file and extract wrestler identifiers and tournament points
2. WHEN a valid CSV is processed, THE Score_Uploader SHALL update the tournament points for each matched wrestler
3. IF a CSV row contains an unrecognized wrestler identifier, THEN THE Score_Uploader SHALL skip that row and include it in a warnings list
4. IF a CSV row contains invalid or non-numeric points, THEN THE Score_Uploader SHALL skip that row and include it in a warnings list
5. WHEN a CSV upload completes, THE Score_Uploader SHALL return a summary showing wrestlers updated, rows skipped, and any warnings
6. THE Score_Uploader SHALL accept CSV files with columns for wrestler name (or identifier) and points scored
7. WHEN scores are uploaded, THE Score_Uploader SHALL replace existing scores with the new values (cumulative totals, not deltas)

### Requirement 3: Score Upload History

**User Story:** As an organizer, I want to see a history of score uploads, so that I can track when scores changed and audit any discrepancies.

#### Acceptance Criteria

1. WHEN a score upload completes successfully, THE Score_History_Tracker SHALL create a history record with timestamp, upload summary, and organizer identifier
2. THE Score_History_Tracker SHALL store the count of wrestlers updated in each upload record
3. THE Organizer_Interface SHALL display a list of past score uploads with timestamps and summaries
4. WHEN viewing upload history, THE Organizer_Interface SHALL show uploads in reverse chronological order (most recent first)

### Requirement 4: Session Scoreboard Display

**User Story:** As a user, I want to see a scoreboard showing player standings in my draft session, so that I can track who is winning.

#### Acceptance Criteria

1. THE Scoreboard SHALL display all players in a session ranked by total tournament points
2. THE Scoreboard SHALL calculate each player's total by summing tournament points of their drafted wrestlers
3. WHEN wrestler scores are updated, THE Scoreboard SHALL reflect the new totals
4. THE Scoreboard SHALL display each player's team name and total points
5. THE Scoreboard SHALL indicate rank position for each player (1st, 2nd, 3rd, etc.)
6. WHEN two or more players have equal points, THE Scoreboard SHALL display them with the same rank

### Requirement 5: Expandable Score Breakdown

**User Story:** As a user, I want to expand a player's score to see individual wrestler contributions, so that I can understand where points came from.

#### Acceptance Criteria

1. WHEN a user clicks on a player row in the Scoreboard, THE Scoreboard SHALL expand to show that player's wrestler breakdown
2. THE Wrestler_Breakdown SHALL display each drafted wrestler's name, weight class, and tournament points
3. THE Wrestler_Breakdown SHALL sort wrestlers by points scored (highest first)
4. WHEN a wrestler has zero points, THE Wrestler_Breakdown SHALL still display that wrestler with zero points
5. THE Wrestler_Breakdown SHALL show the sum total matching the player's displayed score

### Requirement 6: Scoreboard Access

**User Story:** As an organizer, I want the scoreboard accessible from the session management area, so that I can easily view standings.

#### Acceptance Criteria

1. THE Session_Card SHALL include a link to view the scoreboard for that session
2. THE Scoreboard_Page SHALL be accessible at a URL path including the session ID
3. WHEN a session has no picks yet, THE Scoreboard SHALL display a message indicating no scores to show
4. THE Scoreboard SHALL be viewable by any authenticated user with access to the session

### Requirement 7: Score Upload Interface

**User Story:** As an organizer, I want a dedicated interface to upload scores, so that I can manage tournament scoring separately from draft management.

#### Acceptance Criteria

1. THE Score_Upload_Page SHALL provide a file input accepting CSV files
2. THE Score_Upload_Page SHALL display upload results including success count and any warnings
3. IF an upload contains errors, THEN THE Score_Upload_Page SHALL display the error details without applying partial updates
4. THE Score_Upload_Page SHALL be accessible only to authenticated organizers
5. WHEN an upload succeeds, THE Score_Upload_Page SHALL display a confirmation with the number of wrestlers updated

### Requirement 8: CSV Format Flexibility

**User Story:** As an organizer, I want flexible CSV column matching, so that I can use exports from different sources.

#### Acceptance Criteria

1. THE Score_Uploader SHALL match wrestlers by name (case-insensitive)
2. THE Score_Uploader SHALL support CSV files with a header row
3. THE Score_Uploader SHALL accept common column names for wrestler identification (name, wrestler, wrestler_name)
4. THE Score_Uploader SHALL accept common column names for points (points, score, tournament_points)
5. IF the CSV lacks recognizable column headers, THEN THE Score_Uploader SHALL return an error indicating required columns
