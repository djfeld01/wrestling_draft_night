import Papa from "papaparse";

const VALID_WEIGHT_CLASSES = [125, 133, 141, 149, 157, 165, 174, 184, 197, 285];

export interface ParsedWrestler {
  seed: number;
  name: string;
  team: string;
  record: string;
  weightClass: number;
  grade: string | null;
  scoring: string | null;
}

export interface ParseResult {
  wrestlers: ParsedWrestler[];
  warnings: string[];
}

export function parseSeedCSV(csvText: string): ParseResult {
  const warnings: string[] = [];
  const wrestlers: ParsedWrestler[] = [];
  const seen = new Set<string>();

  const parsed = Papa.parse(csvText, {
    header: false,
    skipEmptyLines: false,
  });

  const rows = parsed.data as string[][];

  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    // Skip empty/trailing rows where Seed is empty or not a number
    const rawSeed = row[0]?.trim();
    if (!rawSeed || isNaN(Number(rawSeed))) {
      continue;
    }

    const seed = Number(rawSeed);

    // Extract weight class
    const rawWeight = row[6]?.trim();
    if (!rawWeight || isNaN(Number(rawWeight))) {
      warnings.push(
        `Row ${rowNum}: invalid weight class "${rawWeight}", skipping`,
      );
      continue;
    }

    const weightClass = Number(rawWeight);
    if (!VALID_WEIGHT_CLASSES.includes(weightClass)) {
      warnings.push(
        `Row ${rowNum}: unexpected weight class ${weightClass}, skipping`,
      );
      continue;
    }

    // Extract name: prefer "Name" (col 9), fall back to "Listed Name" (col 1)
    const nameCol = row[9]?.trim();
    const listedNameCol = row[1]?.trim();
    const name = nameCol || listedNameCol;

    if (!name) {
      warnings.push(`Row ${rowNum}: missing name, skipping`);
      continue;
    }

    // Extract team
    const team = row[2]?.trim();
    if (!team) {
      warnings.push(`Row ${rowNum}: missing team, skipping`);
      continue;
    }

    // Extract record (store as-is, even Excel-mangled dates)
    const record = row[4]?.trim();
    if (!record) {
      warnings.push(`Row ${rowNum}: missing record, skipping`);
      continue;
    }

    // Optional fields
    const grade = row[3]?.trim() || null;
    const scoring = row[5]?.trim() || null;

    // Deduplicate by (seed, weight_class)
    const dedupeKey = `${seed}-${weightClass}`;
    if (seen.has(dedupeKey)) {
      warnings.push(
        `Row ${rowNum}: duplicate (seed=${seed}, weightClass=${weightClass}), skipping`,
      );
      continue;
    }
    seen.add(dedupeKey);

    wrestlers.push({ seed, name, team, record, weightClass, grade, scoring });
  }

  return { wrestlers, warnings };
}
