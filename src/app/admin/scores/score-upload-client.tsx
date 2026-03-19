"use client";

import { useState } from "react";
import type { ScoreUploadRecord } from "../../../../actions/scores";

type UploadResult = {
  success: boolean;
  updated?: number;
  skipped?: number;
  warnings?: string[];
  error?: string;
};

export function ScoreUploadClient({
  initialHistory,
}: {
  initialHistory: ScoreUploadRecord[];
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [history, setHistory] = useState(initialHistory);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/scores/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);

      if (data.success) {
        // Refresh history
        const histRes = await fetch("/api/scores/history");
        if (histRes.ok) {
          setHistory(await histRes.json());
        }
        setFile(null);
      }
    } catch {
      setResult({ success: false, error: "Upload failed." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload section */}
      <div className="border border-border rounded-lg bg-background">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Upload Scores</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            CSV with wrestler name and points columns
          </p>
        </div>
        <div className="p-4 space-y-3">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
            }}
            className="block w-full text-sm text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border file:text-sm file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/80"
          />
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {uploading ? "Uploading..." : "Upload Scores"}
          </button>

          {result && (
            <div
              className={`p-3 rounded-md text-sm ${
                result.success
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {result.success ? (
                <p>
                  Updated {result.updated} wrestler(s), skipped {result.skipped}
                  .
                </p>
              ) : (
                <p>{result.error}</p>
              )}
              {result.warnings && result.warnings.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  {result.warnings.map((w, i) => (
                    <li key={i}>⚠ {w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload history */}
      <div className="border border-border rounded-lg bg-background">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">
            Upload History
          </h2>
        </div>
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-4">
                  Date
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-4">
                  Updated
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-4">
                  Summary
                </th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="text-center text-xs text-muted-foreground py-4"
                  >
                    No uploads yet
                  </td>
                </tr>
              )}
              {history.map((h) => (
                <tr
                  key={h.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="py-1.5 px-4 text-muted-foreground">
                    {new Date(h.uploadedAt).toLocaleString()}
                  </td>
                  <td className="py-1.5 px-4 text-foreground">
                    {h.wrestlersUpdated}
                  </td>
                  <td className="py-1.5 px-4 text-muted-foreground">
                    {h.summary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
