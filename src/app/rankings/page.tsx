import rankings from "../../../lib/auto-draft-rankings.json";

const WEIGHT_CLASSES = [125, 133, 141, 149, 157, 165, 174, 184, 197, 285];

type Ranking = (typeof rankings)[number] & {
  floRank?: number;
  p4pRank?: number;
  team?: string;
};

export default function RankingsPage() {
  const data = rankings as Ranking[];

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Auto-Draft Rankings</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Composite ranking based on Flo P4P, Flo weight class rankings, NCAA
        seeds, and weight class depth.
      </p>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-border text-left">
            <th className="py-2 px-3 w-12">#</th>
            <th className="py-2 px-3">Wrestler</th>
            <th className="py-2 px-3">Team</th>
            <th className="py-2 px-3 w-16">Wt</th>
            <th className="py-2 px-3 w-14">Seed</th>
            <th className="py-2 px-3 w-14">Flo</th>
            <th className="py-2 px-3 w-14">P4P</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr
              key={i}
              className={`border-b border-border/50 ${i % 2 === 1 ? "bg-muted/30" : ""}`}
            >
              <td className="py-1.5 px-3 font-medium text-muted-foreground">
                {r.draftPriority}
              </td>
              <td className="py-1.5 px-3">{r.name}</td>
              <td className="py-1.5 px-3 text-muted-foreground">{r.team}</td>
              <td className="py-1.5 px-3">{r.weightClass}</td>
              <td className="py-1.5 px-3">({r.seed})</td>
              <td className="py-1.5 px-3 text-muted-foreground">
                {r.floRank ? `#${r.floRank}` : "—"}
              </td>
              <td className="py-1.5 px-3">
                {r.p4pRank ? (
                  <span className="text-success font-medium">#{r.p4pRank}</span>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
