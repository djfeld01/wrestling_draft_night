import { NextResponse } from "next/server";
import { getScoreHistory } from "../../../../../actions/scores";

export async function GET() {
  try {
    const history = await getScoreHistory();
    return NextResponse.json(history);
  } catch (error) {
    console.error("Failed to fetch score history:", error);
    return NextResponse.json(
      { error: "Failed to fetch score history." },
      { status: 500 },
    );
  }
}
