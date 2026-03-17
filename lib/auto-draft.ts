import type {
  DraftState,
  DraftStateWrestler,
} from "../src/app/api/draft/[sessionId]/state/route";

export type DraftMode = "by-seed" | "smart";

export interface AutoDraftRanking {
  draftPriority: number;
  name: string;
  team: string;
  weightClass: number;
  seed: number;
  floRank?: number;
  p4pRank?: number;
}

/**
 * Given the current draft state, a player ID, and a draft mode,
 * returns the sessionWrestlerId of the best available wrestler,
 * or null if no valid pick exists.
 *
 * Pre-selections are checked first. If the player has a valid
 * pre-selection (available + undrafted weight class), it wins.
 */
export function selectBestWrestler(
  state: DraftState,
  playerId: string,
  mode: DraftMode,
  rankings: AutoDraftRanking[],
): string | null {
  // 1. Compute locked weight classes for this player
  const lockedWeightClasses = new Set<number>();
  for (const pick of state.picks) {
    if (pick.playerId === playerId) {
      lockedWeightClasses.add(pick.weightClass);
    }
  }

  // 2. Check pre-selection
  const player = state.players.find((p) => p.id === playerId);
  if (player?.preSelectedWrestlerId) {
    const preSelected = state.wrestlers.find(
      (w) =>
        w.sessionWrestlerId === player.preSelectedWrestlerId &&
        w.isAvailable &&
        !lockedWeightClasses.has(w.weightClass),
    );
    if (preSelected) {
      return preSelected.sessionWrestlerId;
    }
  }

  // 3. Filter available wrestlers from undrafted weight classes
  const candidates = state.wrestlers.filter(
    (w) => w.isAvailable && !lockedWeightClasses.has(w.weightClass),
  );

  if (candidates.length === 0) return null;

  // 4. Sort based on mode
  if (mode === "by-seed") {
    return selectBySeed(candidates);
  }

  return selectBySmart(candidates, rankings);
}

function selectBySeed(candidates: DraftStateWrestler[]): string {
  candidates.sort((a, b) => {
    if (a.seed !== b.seed) return a.seed - b.seed;
    return a.weightClass - b.weightClass;
  });
  return candidates[0].sessionWrestlerId;
}

function selectBySmart(
  candidates: DraftStateWrestler[],
  rankings: AutoDraftRanking[],
): string {
  // Build a lookup: "name|weightClass" -> draftPriority
  const rankMap = new Map<string, number>();
  for (const r of rankings) {
    rankMap.set(`${r.name}|${r.weightClass}`, r.draftPriority);
  }

  const MAX_PRIORITY = 9999;

  candidates.sort((a, b) => {
    const aPriority = rankMap.get(`${a.name}|${a.weightClass}`) ?? MAX_PRIORITY;
    const bPriority = rankMap.get(`${b.name}|${b.weightClass}`) ?? MAX_PRIORITY;

    // Ranked wrestlers first, then by priority
    if (aPriority !== bPriority) return aPriority - bPriority;
    // If both unranked, fall back to seed
    if (aPriority === MAX_PRIORITY && bPriority === MAX_PRIORITY) {
      if (a.seed !== b.seed) return a.seed - b.seed;
    }
    return a.weightClass - b.weightClass;
  });

  return candidates[0].sessionWrestlerId;
}
