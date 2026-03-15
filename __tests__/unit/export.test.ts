import { describe, it, expect } from "vitest";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface ExportRow {
  "Player Name": string;
  "Wrestler Seed": number;
  "Wrestler Name": string;
  Team: string;
  Record: string;
  "Weight Class": number;
}

function generateCSV(data: ExportRow[]): string {
  return Papa.unparse(data);
}

function generateXLSX(data: ExportRow[]): Buffer {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Draft Results");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

const sampleData: ExportRow[] = [
  {
    "Player Name": "Alice",
    "Wrestler Seed": 1,
    "Wrestler Name": "John Smith",
    Team: "PSU",
    Record: "30-0",
    "Weight Class": 125,
  },
  {
    "Player Name": "Alice",
    "Wrestler Seed": 3,
    "Wrestler Name": "Mike Jones",
    Team: "IOWA",
    Record: "25-5",
    "Weight Class": 133,
  },
  {
    "Player Name": "Bob",
    "Wrestler Seed": 2,
    "Wrestler Name": "Dan Lee",
    Team: "OSU",
    Record: "28-2",
    "Weight Class": 125,
  },
  {
    "Player Name": "Bob",
    "Wrestler Seed": 1,
    "Wrestler Name": "Tom Brown",
    Team: "MICH",
    Record: "32-1",
    "Weight Class": 133,
  },
];

describe("Export - CSV generation", () => {
  it("generates valid CSV with all columns", () => {
    const csv = generateCSV(sampleData);
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true });

    expect(parsed.data).toHaveLength(4);
    expect(parsed.meta.fields).toEqual([
      "Player Name",
      "Wrestler Seed",
      "Wrestler Name",
      "Team",
      "Record",
      "Weight Class",
    ]);
  });

  it("preserves data values in CSV round trip", () => {
    const csv = generateCSV(sampleData);
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true });

    expect(parsed.data[0]["Player Name"]).toBe("Alice");
    expect(parsed.data[0]["Wrestler Seed"]).toBe("1");
    expect(parsed.data[0]["Wrestler Name"]).toBe("John Smith");
    expect(parsed.data[0]["Team"]).toBe("PSU");
    expect(parsed.data[0]["Record"]).toBe("30-0");
    expect(parsed.data[0]["Weight Class"]).toBe("125");
  });

  it("handles empty data", () => {
    const csv = generateCSV([]);
    expect(csv).toBe("");
  });
});

describe("Export - XLSX generation", () => {
  it("generates valid XLSX with all columns", () => {
    const buffer = generateXLSX(sampleData);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets["Draft Results"];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    expect(rows).toHaveLength(4);
    expect(Object.keys(rows[0])).toEqual([
      "Player Name",
      "Wrestler Seed",
      "Wrestler Name",
      "Team",
      "Record",
      "Weight Class",
    ]);
  });

  it("preserves data values in XLSX round trip", () => {
    const buffer = generateXLSX(sampleData);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets["Draft Results"];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    expect(rows[0]["Player Name"]).toBe("Alice");
    expect(rows[0]["Wrestler Seed"]).toBe(1);
    expect(rows[0]["Wrestler Name"]).toBe("John Smith");
    expect(rows[0]["Team"]).toBe("PSU");
    expect(rows[0]["Record"]).toBe("30-0");
    expect(rows[0]["Weight Class"]).toBe(125);
  });

  it("handles empty data", () => {
    const buffer = generateXLSX([]);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets["Draft Results"];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    expect(rows).toHaveLength(0);
  });
});
