# Requirements Document

## Introduction

The Auto-Draft system allows the organizer to automatically complete remaining picks in a wrestling draft session. When a player's turn arrives and they are absent or the organizer wants to speed things up, the system selects the best available wrestler for that player based on seed ranking, respecting the one-wrestler-per-weight-class constraint. The organizer can auto-draft a single pick, all remaining picks for a specific player, or run the entire draft to completion automatically.

## Glossary

- **Auto_Draft_System**: The server-side logic responsible for automatically selecting and recording wrestler picks on behalf of players.
- **Organizer**: The user who created and manages the draft session via the admin page.
- **Player**: A participant in the draft session who has a draft order position and a roster of picked wrestlers.
- **Session**: A draft session containing players, wrestlers, and pick state.
- **Best_Available_Wrestler**: The highest-seeded (lowest seed number) available wrestler from a weight class the player has not yet drafted from.
- **Smart_Rankings**: A composite cross-weight-class ranking derived from Flo P4P rankings, Flo weight class rankings, NCAA seeds, and weight class depth analysis, stored in `lib/auto-draft-rankings.json`.
- **Draft_Mode**: The selection strategy used by the auto-draft system — either "By Seed" (simple lowest seed) or "Smart" (composite ranking from Smart_Rankings).
- **Pre_Selection**: A wrestler a player has pre-selected as their preferred next pick.
- **Weight_Class**: One of the 10 wrestling weight categories (125, 133, 141, 149, 157, 165, 174, 184, 197, 285).
- **Snake_Draft_Order**: The alternating pick order where odd rounds go 1→N and even rounds go N→1.
- **Proxy_Pick**: A pick made by the organizer on behalf of a player through the admin page.

## Requirements

### Requirement 1: Auto-Draft Single Pick

**User Story:** As an organizer, I want to auto-draft a single pick for the current player, so that I can keep the draft moving when a player is unavailable.

#### Acceptance Criteria

1. WHEN the Organizer triggers a single auto-draft pick, THE Auto_Draft_System SHALL select the Best_Available_Wrestler for the current-turn Player.
2. WHEN selecting the Best_Available_Wrestler, THE Auto_Draft_System SHALL choose the available wrestler with the lowest seed number from a Weight_Class the Player has not yet drafted from.
3. WHEN the current-turn Player has a valid Pre_Selection that is still available and from an undrafted Weight_Class, THE Auto_Draft_System SHALL use the Pre_Selection instead of the Best_Available_Wrestler.
4. WHEN the auto-draft pick is recorded, THE Auto_Draft_System SHALL broadcast the pick via SSE using the same event flow as a manual pick.
5. IF no available wrestler exists from any undrafted Weight_Class for the current-turn Player, THEN THE Auto_Draft_System SHALL return an error indicating no valid pick is available.

### Requirement 2: Auto-Draft Remaining Picks for a Player

**User Story:** As an organizer, I want to auto-draft all remaining picks for a specific player, so that I can fill their roster when they are absent for the rest of the draft.

#### Acceptance Criteria

1. WHEN the Organizer triggers auto-draft for a specific Player, THE Auto_Draft_System SHALL automatically make picks for that Player each time that Player's turn arrives until that Player's roster is complete.
2. WHILE auto-drafting for a specific Player, THE Auto_Draft_System SHALL skip turns belonging to other Players and only act on the specified Player's turns.
3. WHILE auto-drafting for a specific Player, THE Auto_Draft_System SHALL respect the Snake_Draft_Order and process picks in the correct sequence.
4. WHEN auto-draft is enabled for a Player, THE Auto_Draft_System SHALL display a visual indicator on the admin page showing that Player is set to auto-draft.
5. WHEN the Organizer disables auto-draft for a specific Player, THE Auto_Draft_System SHALL stop making automatic picks for that Player on subsequent turns.

### Requirement 3: Auto-Draft Entire Remaining Draft

**User Story:** As an organizer, I want to auto-draft all remaining picks for all players, so that I can quickly complete the draft.

#### Acceptance Criteria

1. WHEN the Organizer triggers a full auto-draft, THE Auto_Draft_System SHALL sequentially make picks for each remaining turn following the Snake_Draft_Order.
2. WHILE running a full auto-draft, THE Auto_Draft_System SHALL introduce a configurable delay between each pick to allow the display page to show pick announcements.
3. WHEN a full auto-draft is in progress, THE Auto_Draft_System SHALL allow the Organizer to pause or cancel the auto-draft process.
4. WHEN a full auto-draft completes all remaining picks, THE Auto_Draft_System SHALL mark the Session as completed.
5. WHILE running a full auto-draft, THE Auto_Draft_System SHALL honor any Player-specific Pre_Selections before falling back to Best_Available_Wrestler selection.

### Requirement 4: Best Available Wrestler Selection Logic

**User Story:** As an organizer, I want the auto-draft to make reasonable picks, so that players get competitive rosters even when auto-drafted.

#### Acceptance Criteria

1. THE Auto_Draft_System SHALL support two Draft_Modes: "By Seed" and "Smart".
2. WHEN Draft_Mode is "By Seed", THE Auto_Draft_System SHALL select the available wrestler with the lowest seed number from Weight_Classes the Player has not yet drafted from.
3. WHEN Draft_Mode is "Smart", THE Auto_Draft_System SHALL select the available wrestler with the lowest draftPriority from Smart_Rankings from Weight_Classes the Player has not yet drafted from.
4. WHEN multiple available wrestlers share the same priority across different Weight_Classes, THE Auto_Draft_System SHALL select the wrestler from the lowest Weight_Class numerically.
5. THE Auto_Draft_System SHALL verify that the selected wrestler is still available at the time of pick recording to prevent race conditions.
6. IF the selected wrestler becomes unavailable between selection and recording, THEN THE Auto_Draft_System SHALL re-evaluate and select the next best available wrestler.
7. THE Organizer SHALL be able to choose the Draft_Mode before starting auto-draft.

### Requirement 5: Auto-Draft Admin Controls

**User Story:** As an organizer, I want auto-draft controls on the admin page, so that I can manage the auto-draft process during the draft.

#### Acceptance Criteria

1. THE Admin_Page SHALL display an "Auto Pick" button for the current turn that triggers a single auto-draft pick.
2. THE Admin_Page SHALL display a toggle for each Player to enable or disable auto-draft for that Player.
3. WHILE a full auto-draft is running, THE Admin_Page SHALL display a "Pause" button and a "Cancel" button.
4. WHEN the Organizer undoes a pick that was made by the Auto_Draft_System, THE Auto_Draft_System SHALL handle the undo using the existing undo flow without additional logic.
5. WHILE auto-draft is active for any Player, THE Admin_Page SHALL visually distinguish auto-draft Players from manual-draft Players in the players list.

### Requirement 6: Auto-Draft and Real-Time Updates

**User Story:** As a player watching the draft, I want to see auto-draft picks appear in real time, so that I can follow the draft progress.

#### Acceptance Criteria

1. WHEN the Auto_Draft_System makes a pick, THE Session SHALL broadcast a pick_made SSE event identical to a manually made pick.
2. WHEN the Auto_Draft_System advances to the next turn, THE Session SHALL broadcast a turn_changed SSE event identical to a manual turn change.
3. WHEN a full auto-draft completes, THE Session SHALL broadcast a draft_completed SSE event.
4. THE Auto_Draft_System SHALL reuse the existing `makePick` or `makeProxyPick` server action to record picks so that all SSE broadcasting and state management remains consistent.
