/**
 * Snake draft order calculation utilities.
 *
 * For N players, the pick order within a round:
 * - Odd rounds (1, 3, 5, ...): positions 1, 2, ..., N (ascending)
 * - Even rounds (2, 4, 6, ...): positions N, N-1, ..., 1 (descending)
 *
 * Formula (from design doc):
 *   globalPickIndex = current_pick_number - 1
 *   round = floor(globalPickIndex / N) + 1
 *   positionInRound = globalPickIndex % N
 *   if round is odd: draftOrderPosition = positionInRound + 1
 *   if round is even: draftOrderPosition = N - positionInRound
 */

const TOTAL_ROUNDS = 10;

export interface DraftPosition {
  /** 1-based round number */
  round: number;
  /** 0-based index within the round */
  positionInRound: number;
  /** 1-based draft order position of the player whose turn it is */
  draftOrderPosition: number;
}

/**
 * Given a 1-based global pick number and player count N,
 * returns the round, position in round, and draft order position.
 */
export function getCurrentDraftPosition(
  pickNumber: number,
  playerCount: number,
): DraftPosition {
  const globalPickIndex = pickNumber - 1;
  const round = Math.floor(globalPickIndex / playerCount) + 1;
  const positionInRound = globalPickIndex % playerCount;

  let draftOrderPosition: number;
  if (round % 2 === 1) {
    // Odd round: ascending
    draftOrderPosition = positionInRound + 1;
  } else {
    // Even round: descending
    draftOrderPosition = playerCount - positionInRound;
  }

  return { round, positionInRound, draftOrderPosition };
}

/**
 * Returns the total number of picks in a draft (playerCount × 10 rounds).
 */
export function getTotalPicks(playerCount: number): number {
  return playerCount * TOTAL_ROUNDS;
}

/**
 * Returns true if the given pick number is the last pick of its round.
 */
export function isRoundComplete(
  pickNumber: number,
  playerCount: number,
): boolean {
  return pickNumber % playerCount === 0;
}

/**
 * Returns the next sequential pick number.
 */
export function getNextPickNumber(currentPickNumber: number): number {
  return currentPickNumber + 1;
}
