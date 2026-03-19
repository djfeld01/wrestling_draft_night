import { NextRequest, NextResponse } from "next/server";
import { parseScoreCSV } from "../../../../../lib/score-parser";
import { uploadScores } from "../../../../../actions/scores";
import { auth } from "../../../../../lib/auth";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  // Check auth
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum 5MB." },
        { status: 400 },
      );
    }

    const csvText = await file.text();
    const parseResult = parseScoreCSV(csvText);

    if (parseResult.error) {
      return NextResponse.json(
        { success: false, error: parseResult.error },
        { status: 400 },
      );
    }

    const result = await uploadScores(parseResult.scores, session.user.email);

    // Merge parser warnings with upload warnings
    if (result.success) {
      const allWarnings = [...parseResult.warnings, ...result.warnings];
      return NextResponse.json({
        ...result,
        warnings: allWarnings,
      });
    }

    return NextResponse.json(result, { status: 400 });
  } catch (error) {
    console.error("Score upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process upload." },
      { status: 500 },
    );
  }
}
