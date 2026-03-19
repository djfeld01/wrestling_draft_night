import Papa from "papaparse";

export interface ParsedScore {
  wrestlerName: string;
  points: number;
}

export interface ScoreParseResult {
  scores: ParsedScore[];
  warnings: string[];
  error?: string;
}

const NAME_COLUMNS = ["name", "wrestler", "wrestler_name"];
const POINTS_COLUMNS = ["points", "score", "tournament_points"];

export function parseScoreCSV(csvText: string): ScoreParseResult {
  const warnings: string[] = [];
  const scores: ParsedScore[] = [];

  if (!csvText.trim()) {
    return { scores: [], warnings: [], error: "CSV file is empty." };
  }

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
    return { scores: [], warnings: [], error: "CSV file has no headers." };
  }

  const headers = parsed.meta.fields;
  const headerLower = headers.map((h) => h.toLowerCase().trim());

  // Find wrestler name column
  const nameIdx = headerLower.findIndex((h) => NAME_COLUMNS.includes(h));
  const nameCol = nameIdx >= 0 ? headers[nameIdx] : null;

  // Find points column
  const pointsIdx = headerLower.findIndex((h) => POINTS_COLUMNS.includes(h));
  const pointsCol = pointsIdx >= 0 ? headers[pointsIdx] : null;

  if (!nameCol || !pointsCol) {
    const missing: string[] = [];
    if (!nameCol) missing.push(`wrestler name (${NAME_COLUMNS.join(", ")})`);
    if (!pointsCol) missing.push(`points (${POINTS_COLUMNS.join(", ")})`);
    return {
      scores: [],
      warnings: [],
      error: `Missing required columns: ${missing.join(" and ")}. Check your CSV headers.`,
    };
  }

  const rows = parsed.data as Record<string, string>[];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header row

    const name = row[nameCol]?.trim();
    if (!name) {
      warnings.push(`Row ${rowNum}: missing wrestler name, skipping`);
      continue;
    }

    const rawPoints = row[pointsCol]?.trim();
    if (!rawPoints || isNaN(Number(rawPoints))) {
      warnings.push(
        `Row ${rowNum}: invalid points "${rawPoints}" for "${name}", skipping`,
      );
      continue;
    }

    scores.push({ wrestlerName: name, points: Number(rawPoints) });
  }

  return { scores, warnings };
}
