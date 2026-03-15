"use client";

const WEIGHT_CLASSES = [125, 133, 141, 149, 157, 165, 174, 184, 197, 285];

interface WeightClassFilterProps {
  value: number | "all";
  onChange: (val: number | "all") => void;
  lockedWeightClasses?: Set<number>;
}

export function WeightClassFilter({
  value,
  onChange,
  lockedWeightClasses,
}: WeightClassFilterProps) {
  return (
    <div>
      <label
        htmlFor="weight-class-filter"
        className="block text-xs text-muted-foreground mb-1"
      >
        Weight class
      </label>
      <select
        id="weight-class-filter"
        value={value}
        onChange={(e) =>
          onChange(e.target.value === "all" ? "all" : Number(e.target.value))
        }
        className="px-3 py-1.5 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
      >
        <option value="all">All</option>
        {WEIGHT_CLASSES.map((wc) => {
          const isLocked = lockedWeightClasses?.has(wc);
          return (
            <option key={wc} value={wc} disabled={isLocked}>
              {wc}
              {isLocked ? " (locked)" : ""}
            </option>
          );
        })}
      </select>
    </div>
  );
}
