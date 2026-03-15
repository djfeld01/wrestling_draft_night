# Requirements Document

## Introduction

A web-based wrestling draft application for the 2026 NCAA wrestling selection. The system supports 10–12 players drafting wrestlers in a snake draft format across 10 weight classes (330 total wrestlers). Built with Next.js (App Router), Tailwind CSS, and PostgreSQL (Neon), deployed on Vercel. The application provides a shared display screen for live viewing, plus mobile and desktop interfaces for individual players to make picks.

## Glossary

- **Draft_App**: The overall wrestling draft web application
- **Draft_Session**: A single instance of a draft game, containing its own set of players, picks, and state
- **Player**: A registered participant in a Draft_Session (10–12 per session)
- **Wrestler**: A collegiate wrestler available to be drafted, belonging to exactly one Weight_Class
- **Weight_Class**: One of the 10 wrestling weight categories: 125, 133, 141, 149, 157, 165, 174, 184, 197, 285
- **Pick**: A Player's selection of a Wrestler during the draft
- **Snake_Draft**: A draft format where pick order reverses each round (1→12, then 12→1, then 1→12, etc.)
- **Round**: One complete pass through all Players in a Draft_Session (10 rounds total, one per Weight_Class)
- **Pre_Selection**: A Player's queued preference for a Wrestler to be auto-picked when the Player's turn arrives
- **Display_Screen**: A read-only view intended for a shared monitor/TV showing live draft progress
- **Auth_Code**: A short alphanumeric code assigned to a Player for logging into a Draft_Session
- **Magic_Link**: A one-time authentication link sent via email or SMS to a Player
- **Seed_Data**: The CSV dataset of 330 wrestlers (33 per Weight_Class) loaded into the system
- **Admin_Screen**: A privileged view for the draft organizer to manage the Draft_Session, make proxy picks, and undo or reassign picks
- **Auth_Library**: An established third-party authentication library (such as next-auth or better-auth) used to manage sessions, tokens, and passwordless login flows

## Requirements

### Requirement 1: Draft Session Management

**User Story:** As a draft organizer, I want to create and manage multiple draft sessions, so that I can run separate drafts for different groups or events.

#### Acceptance Criteria

1. THE Draft_App SHALL allow creation of a new Draft_Session with a name and a configurable number of Players (between 2 and 16)
2. WHEN a Draft_Session is created, THE Draft_App SHALL populate the Draft_Session with all 330 Wrestlers from the Seed_Data
3. THE Draft_App SHALL support multiple Draft_Sessions existing in the system concurrently
4. WHEN a Draft_Session is created, THE Draft_App SHALL set the Draft_Session status to "setup" until the organizer starts the draft
5. WHEN the organizer starts a Draft_Session, THE Draft_App SHALL transition the Draft_Session status to "active"
6. WHEN all Rounds in a Draft_Session are complete, THE Draft_App SHALL transition the Draft_Session status to "completed"

### Requirement 2: Player Authentication

**User Story:** As a player, I want to log in to my draft session securely and simply, so that I can participate in the draft from my device.

#### Acceptance Criteria

1. THE Draft_App SHALL use an established authentication library (such as next-auth or better-auth) to manage authentication sessions and token handling
2. WHEN a Draft_Session is in "setup" status, THE Draft_App SHALL generate a unique Auth_Code for each Player in the Draft_Session, integrated with the authentication library's session management
3. WHEN a Player submits a valid Auth_Code, THE Draft_App SHALL authenticate the Player through the authentication library and associate the Player with the correct Draft_Session
4. IF a Player submits an invalid Auth_Code, THEN THE Draft_App SHALL display an error message indicating the code is invalid
5. THE Draft_App SHALL support Magic_Link authentication by sending a one-time login link to a Player's email address or phone number, using the authentication library's passwordless login flow
6. WHEN a Player clicks a valid Magic_Link, THE Draft_App SHALL authenticate the Player through the authentication library and redirect the Player to the Draft_Session
7. IF a Magic_Link has already been used or has expired, THEN THE Draft_App SHALL display an error message and prompt the Player to request a new link

### Requirement 3: Snake Draft Order

**User Story:** As a player, I want the draft to follow a snake draft format with an organizer-defined order, so that the pick order is fair and intentional across all rounds.

#### Acceptance Criteria

1. WHILE a Draft_Session is in "setup" status, THE Draft_App SHALL allow the organizer to manually assign a pick order position (1 through N) to each Player, where N is the number of Players
2. THE Draft_App SHALL execute odd-numbered Rounds in ascending order (position 1 to position N)
3. THE Draft_App SHALL execute even-numbered Rounds in descending order (position N to position 1)
4. WHEN a Pick is made, THE Draft_App SHALL advance the current turn to the next Player according to the Snake_Draft order
5. THE Draft_App SHALL conduct exactly 10 Rounds per Draft_Session (one Round per Weight_Class)

### Requirement 4: Pick Constraints and Validation

**User Story:** As a player, I want the system to enforce draft rules automatically, so that every pick is valid and fair.

#### Acceptance Criteria

1. WHEN a Player attempts to pick a Wrestler, THE Draft_App SHALL verify that the Wrestler has not already been picked by another Player in the same Draft_Session
2. WHEN a Player attempts to pick a Wrestler, THE Draft_App SHALL verify that the Player has not already picked a Wrestler from the same Weight_Class
3. IF a Player attempts an invalid Pick, THEN THE Draft_App SHALL reject the Pick and display a message explaining the reason
4. WHEN a Player makes a valid Pick, THE Draft_App SHALL record the Pick and mark the Wrestler as unavailable for all other Players in the Draft_Session
5. WHEN a Player makes a valid Pick, THE Draft_App SHALL lock the corresponding Weight_Class for that Player for the remainder of the Draft_Session
6. THE Draft_App SHALL ensure that each Player has exactly one Wrestler from each Weight_Class at the end of the Draft_Session

### Requirement 5: Wrestler Display and Filtering

**User Story:** As a player, I want to browse and filter available wrestlers by weight class, so that I can make informed draft picks.

#### Acceptance Criteria

1. THE Draft_App SHALL display each Wrestler's seed number, name, team abbreviation, record, and Weight_Class
2. THE Draft_App SHALL provide a Weight_Class dropdown filter that limits the displayed Wrestlers to the selected Weight_Class
3. WHEN a Wrestler is picked, THE Draft_App SHALL visually distinguish that Wrestler as unavailable in the wrestler list for all Players
4. THE Draft_App SHALL sort Wrestlers within each Weight_Class by seed number in ascending order
5. WHEN a Player has already picked from a Weight_Class, THE Draft_App SHALL visually indicate that the Weight_Class is locked for that Player in the filter dropdown

### Requirement 6: Pre-Selection

**User Story:** As a player, I want to pre-select my next pick before my turn, so that the draft moves quickly and I can plan ahead.

#### Acceptance Criteria

1. WHILE it is not a Player's turn, THE Draft_App SHALL allow the Player to select one Wrestler as a Pre_Selection
2. WHEN a Player's turn arrives and the Player has a valid Pre_Selection, THE Draft_App SHALL display the Pre_Selection to the Player for confirmation
3. IF a Pre_Selection becomes unavailable (the Wrestler is picked by another Player), THEN THE Draft_App SHALL clear the Pre_Selection and notify the Player
4. THE Draft_App SHALL allow a Player to change or remove a Pre_Selection at any time before the Player's turn
5. WHEN a Player confirms a Pre_Selection on the Player's turn, THE Draft_App SHALL record the Pre_Selection as the Player's official Pick

### Requirement 7: Real-Time Display Screen

**User Story:** As a draft organizer, I want a display screen view for a shared monitor, so that all participants can follow the draft in real time.

#### Acceptance Criteria

1. THE Display_Screen SHALL show the list of all available Wrestlers grouped by Weight_Class
2. THE Display_Screen SHALL show a pick history listing each Pick with the Player name, Wrestler name, and Weight_Class
3. WHEN a Pick is made, THE Display_Screen SHALL update within 2 seconds to reflect the new Pick
4. THE Display_Screen SHALL indicate which Player's turn it currently is
5. THE Display_Screen SHALL show the current Round number and overall draft progress

### Requirement 8: Mobile Player View

**User Story:** As a player on a phone, I want a mobile-optimized interface, so that I can browse wrestlers and make picks comfortably on a small screen.

#### Acceptance Criteria

1. THE Draft_App SHALL render a responsive mobile layout for viewports 768px wide and narrower
2. THE Draft_App mobile view SHALL display the available Wrestlers list with seed, name, team, and record
3. THE Draft_App mobile view SHALL provide a Weight_Class dropdown filter
4. WHEN it is the Player's turn, THE Draft_App mobile view SHALL display a prominent pick confirmation control
5. WHILE it is not the Player's turn, THE Draft_App mobile view SHALL allow the Player to set a Pre_Selection

### Requirement 9: Desktop Player View

**User Story:** As a player on a computer, I want a desktop-optimized interface, so that I can see more information at once and draft efficiently.

#### Acceptance Criteria

1. THE Draft_App SHALL render a desktop layout for viewports wider than 768px
2. THE Draft_App desktop view SHALL display the available Wrestlers list alongside the Player's current roster and pick history
3. THE Draft_App desktop view SHALL provide a Weight_Class filter
4. WHEN it is the Player's turn, THE Draft_App desktop view SHALL display a pick confirmation control
5. WHILE it is not the Player's turn, THE Draft_App desktop view SHALL allow the Player to set a Pre_Selection

### Requirement 10: Real-Time Synchronization

**User Story:** As a player, I want to see picks reflected in real time, so that I always have an accurate view of the draft state.

#### Acceptance Criteria

1. WHEN a Pick is made by any Player, THE Draft_App SHALL broadcast the Pick to all connected clients in the same Draft_Session within 2 seconds
2. WHEN a client receives a Pick update, THE Draft_App SHALL update the Wrestler availability list, pick history, and current turn indicator without requiring a page refresh
3. IF a client loses connection, THEN THE Draft_App SHALL attempt to reconnect and synchronize the full draft state upon reconnection
4. WHEN a client reconnects, THE Draft_App SHALL restore the complete current state of the Draft_Session

### Requirement 11: Seed Data Import

**User Story:** As a draft organizer, I want wrestler data pre-loaded from a CSV file, so that I don't have to enter 330 wrestlers manually.

#### Acceptance Criteria

1. THE Draft_App SHALL import Wrestler data from the CSV file located at seeds/Book1.csv
2. THE Draft_App SHALL parse each Wrestler record extracting: seed number, name, team abbreviation, record, and Weight_Class
3. IF the CSV file contains a malformed row, THEN THE Draft_App SHALL skip the malformed row and log a warning
4. THE Draft_App SHALL import exactly 33 Wrestlers per Weight_Class across all 10 Weight_Classes (330 total)
5. THE Draft_App SHALL store imported Wrestler data in the PostgreSQL database

### Requirement 12: Admin Screen

**User Story:** As a draft organizer, I want an admin screen to manage the draft session, so that I can oversee the draft, make picks on behalf of players, and correct mistakes.

#### Acceptance Criteria

1. THE Admin_Screen SHALL display the full current state of the Draft_Session including all Players, Picks, current Round, and current turn
2. THE Admin_Screen SHALL allow the organizer to make a Pick on behalf of the Player whose turn it currently is (proxy pick)
3. WHEN the organizer makes a proxy Pick, THE Draft_App SHALL record the Pick and advance the turn as if the Player had made the Pick directly
4. THE Admin_Screen SHALL allow the organizer to undo the most recent Pick in the Draft_Session
5. WHEN the organizer undoes a Pick, THE Draft_App SHALL mark the corresponding Wrestler as available, remove the Pick from the Player's roster, and revert the current turn to the Player whose Pick was undone
6. THE Admin_Screen SHALL allow the organizer to reassign the most recent Pick to a different Wrestler within the same Weight_Class
7. WHEN the organizer reassigns a Pick, THE Draft_App SHALL mark the previously picked Wrestler as available and record the new Wrestler as the Pick

### Requirement 13: Export Draft Results

**User Story:** As a draft organizer, I want to export the final draft results to a file, so that I can share and archive the results outside the application.

#### Acceptance Criteria

1. WHEN a Draft_Session status is "completed", THE Draft_App SHALL enable an export option on the Admin_Screen
2. WHEN the organizer requests an export, THE Draft_App SHALL generate a file containing each Player's name and the Player's drafted Wrestlers with seed number, name, team abbreviation, record, and Weight_Class
3. THE Draft_App SHALL support exporting results in CSV format
4. THE Draft_App SHALL support exporting results in Excel (XLSX) format
5. WHEN the export file is generated, THE Draft_App SHALL initiate a file download in the organizer's browser
