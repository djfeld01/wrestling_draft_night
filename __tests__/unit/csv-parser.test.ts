import { describe, it, expect } from "vitest";
import { parseSeedCSV } from "../../lib/seed-parser";

const HEADER =
  "Seed,Listed Name,Team,Grade,Record,Scoring,Weight,Last Name,First Name,Name,Wgt-Seed,Full Listing,Points";

function makeRow(overrides: Partial<Record<string, string>> = {}): string {
  const defaults: Record<string, string> = {
    seed: "1",
    listedName: '"Lilledahl, Luke"',
    team: "Penn State",
    grade: "",
    record: "20-0",
    scoring: "Yes",
    weight: "125",
    lastName: "Lilledahl",
    firstName: "Luke",
    name: "Luke Lilledahl",
    wgtSeed: "125lbs-1",
    fullListing: "#1 Luke Lilledahl (PSU) 20-0",
    points: "0",
  };
  const merged = { ...defaults, ...overrides };
  return [
    merged.seed,
    merged.listedName,
    merged.team,
    merged.grade,
    merged.record,
    merged.scoring,
    merged.weight,
    merged.lastName,
    merged.firstName,
    merged.name,
    merged.wgtSeed,
    merged.fullListing,
    merged.points,
  ].join(",");
}

describe("parseSeedCSV", () => {
  it("parses a well-formed row correctly", () => {
    const csv = `${HEADER}\n${makeRow()}`;
    const result = parseSeedCSV(csv);

    expect(result.wrestlers).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);

    const w = result.wrestlers[0];
    expect(w.seed).toBe(1);
    expect(w.name).toBe("Luke Lilledahl");
    expect(w.team).toBe("Penn State");
    expect(w.record).toBe("20-0");
    expect(w.weightClass).toBe(125);
    expect(w.grade).toBeNull();
    expect(w.scoring).toBe("Yes");
  });

  it("falls back to Listed Name when Name column is empty", () => {
    const csv = `${HEADER}\n${makeRow({ name: "", firstName: "", lastName: "" })}`;
    const result = parseSeedCSV(csv);

    expect(result.wrestlers).toHaveLength(1);
    expect(result.wrestlers[0].name).toBe("Lilledahl, Luke");
  });

  it("skips rows with empty seed", () => {
    const csv = `${HEADER}\n${makeRow({ seed: "" })}`;
    const result = parseSeedCSV(csv);

    expect(result.wrestlers).toHaveLength(0);
  });

  it("skips rows with non-numeric seed", () => {
    const csv = `${HEADER}\n${makeRow({ seed: "abc" })}`;
    const result = parseSeedCSV(csv);

    expect(result.wrestlers).toHaveLength(0);
  });

  it("skips rows with unexpected weight class", () => {
    const csv = `${HEADER}\n${makeRow({ weight: "999" })}`;
    const result = parseSeedCSV(csv);

    expect(result.wrestlers).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("unexpected weight class 999");
  });

  it("skips rows with missing team", () => {
    const csv = `${HEADER}\n${makeRow({ team: "" })}`;
    const result = parseSeedCSV(csv);

    expect(result.wrestlers).toHaveLength(0);
    expect(result.warnings[0]).toContain("missing team");
  });

  it("skips rows with missing record", () => {
    const csv = `${HEADER}\n${makeRow({ record: "" })}`;
    const result = parseSeedCSV(csv);

    expect(result.wrestlers).toHaveLength(0);
    expect(result.warnings[0]).toContain("missing record");
  });

  it("deduplicates by (seed, weight_class)", () => {
    const row = makeRow();
    const csv = `${HEADER}\n${row}\n${row}`;
    const result = parseSeedCSV(csv);

    expect(result.wrestlers).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("duplicate");
  });

  it("skips trailing empty rows", () => {
    const csv = `${HEADER}\n${makeRow()}\n,,,,,,,,,,,,,\n,,,,,,,,,,,,,`;
    const result = parseSeedCSV(csv);

    expect(result.wrestlers).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);
  });

  it("preserves Excel-mangled date records as-is", () => {
    const csv = `${HEADER}\n${makeRow({ record: "8-Dec" })}`;
    const result = parseSeedCSV(csv);

    expect(result.wrestlers).toHaveLength(1);
    expect(result.wrestlers[0].record).toBe("8-Dec");
  });

  it("parses grade when present", () => {
    const csv = `${HEADER}\n${makeRow({ grade: "Sr." })}`;
    const result = parseSeedCSV(csv);

    expect(result.wrestlers[0].grade).toBe("Sr.");
  });

  it("parses the actual CSV file correctly", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const csvPath = path.join(process.cwd(), "seeds", "Book1.csv");
    const csvText = await fs.readFile(csvPath, "utf-8");

    const result = parseSeedCSV(csvText);

    expect(result.wrestlers).toHaveLength(330);

    // Verify 33 per weight class
    const counts = new Map<number, number>();
    for (const w of result.wrestlers) {
      counts.set(w.weightClass, (counts.get(w.weightClass) || 0) + 1);
    }

    const validWeights = [125, 133, 141, 149, 157, 165, 174, 184, 197, 285];
    for (const wc of validWeights) {
      expect(counts.get(wc)).toBe(33);
    }
  });
});
