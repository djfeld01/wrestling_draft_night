import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { db } from "../../../../db";
import { wrestlers } from "../../../../db/schema";
import { parseSeedCSV } from "../../../../lib/seed-parser";

const VALID_WEIGHT_CLASSES = [125, 133, 141, 149, 157, 165, 174, 184, 197, 285];
const EXPECTED_PER_WEIGHT_CLASS = 33;
const EXPECTED_TOTAL = EXPECTED_PER_WEIGHT_CLASS * VALID_WEIGHT_CLASSES.length;

export async function POST() {
  try {
    const csvPath = join(process.cwd(), "seeds", "Book1.csv");
    let csvText: string;

    try {
      csvText = await readFile(csvPath, "utf-8");
    } catch {
      return NextResponse.json(
        { error: "Seed data file not found." },
        { status: 500 },
      );
    }

    const { wrestlers: parsed, warnings } = parseSeedCSV(csvText);

    // Validate counts per weight class
    const countsByWeight = new Map<number, number>();
    for (const w of parsed) {
      countsByWeight.set(
        w.weightClass,
        (countsByWeight.get(w.weightClass) || 0) + 1,
      );
    }

    for (const wc of VALID_WEIGHT_CLASSES) {
      const count = countsByWeight.get(wc) || 0;
      if (count !== EXPECTED_PER_WEIGHT_CLASS) {
        return NextResponse.json(
          {
            error: `Expected ${EXPECTED_PER_WEIGHT_CLASS} wrestlers for weight class ${wc}, got ${count}`,
            warnings,
          },
          { status: 400 },
        );
      }
    }

    if (parsed.length !== EXPECTED_TOTAL) {
      return NextResponse.json(
        {
          error: `Expected ${EXPECTED_TOTAL} total wrestlers, got ${parsed.length}`,
          warnings,
        },
        { status: 400 },
      );
    }

    // Insert into database
    await db.insert(wrestlers).values(
      parsed.map((w) => ({
        seed: w.seed,
        name: w.name,
        team: w.team,
        record: w.record,
        weightClass: w.weightClass,
        grade: w.grade,
        scoring: w.scoring,
      })),
    );

    return NextResponse.json({
      message: `Successfully imported ${parsed.length} wrestlers`,
      count: parsed.length,
      warnings,
    });
  } catch (error) {
    console.error("Seed import error:", error);
    return NextResponse.json(
      { error: "Failed to import seed data" },
      { status: 500 },
    );
  }
}
