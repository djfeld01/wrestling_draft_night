import { getScoreHistory } from "../../../../actions/scores";
import { ScoreUploadClient } from "./score-upload-client";

export const dynamic = "force-dynamic";

export default async function ScoresPage() {
  const history = await getScoreHistory();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-foreground">
            Tournament Scores
          </h1>
          <a
            href="/admin/sessions"
            className="text-xs text-accent hover:underline"
          >
            ← Back to Sessions
          </a>
        </div>
        <ScoreUploadClient initialHistory={history} />
      </div>
    </div>
  );
}
