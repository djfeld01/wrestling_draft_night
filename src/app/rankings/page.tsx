import rankings from "../../../lib/auto-draft-rankings.json";

const WEIGHT_CLASSES = [125, 133, 141, 149, 157, 165, 174, 184, 197, 285];

export default function RankingsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Auto-Draft Rankings</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Composite ranking based on Flo P4P, Flo weight class rankings, NCAA
        seeds, and weight class depth. Lower priority = picked first.
      </p>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-border text-left">
            <th className="py-2 px-3 w-16">#</th>
            <th className="py-2 px-3">Wrestler</th>
            <th className="py-2 px-3 w-20">Weight</th>
            <th className="py-2 px-3 w-16">Seed</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((r, i) => (
            <tr
              key={i}
              className={`border-b border-border/50 ${i % 2 === 1 ? "bg-muted/30" : ""}`}
            >
              <td className="py-1.5 px-3 font-medium text-muted-foreground">
                {r.draftPriority}
              </td>
              <td className="py-1.5 px-3">{r.name}</td>
              <td className="py-1.5 px-3">{r.weightClass}</td>
              <td className="py-1.5 px-3">({r.seed})</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-xl font-semibold mt-10 mb-4">By Weight Class</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {WEIGHT_CLASSES.map((wc) => {
          const wcRankings = rankings
            .filter((r) => r.weightClass === wc)
            .sort((a, b) => a.draftPriority - b.draftPriority);
          return (
            <div key={wc} className="border border-border rounded-lg p-3">
              <h3 className="text-sm font-bold mb-2 text-center border-b border-border pb-1">
                {wc} lbs
              </h3>
              <ol className="space-y-0.5">
                {wcRankings.map((r, i) => (
                  <li key={i} className="text-xs flex justify-between gap-1">
                    <span className="text-muted-foreground w-5 shrink-0">
                      {r.seed}.
                    </span>
                    <span className="flex-1 truncate">{r.name}</span>
                    <span className="text-muted-foreground shrink-0">
                      #{r.draftPriority}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
}
