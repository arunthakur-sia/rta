export function DimensionBars({
  rows,
  max = 5,
  selected,
  onSelect,
}: {
  rows: { label: string; value: number | null; id?: string }[];
  max?: number;
  /** When set, each row becomes clickable and the matching row is highlighted — used to
   * filter the prioritised actions below to just this dimension. */
  selected?: string | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="space-y-3.5">
      {rows.map((row) => {
        const rowId = row.id ?? row.label;
        const isSelected = selected === rowId;
        const content = (
          <>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className={isSelected ? "font-medium text-ink-900" : "text-ink-600"}>{row.label}</span>
              <span className="font-medium text-ink-900">{row.value ?? "—"}/5</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-300 ${isSelected ? "bg-accent-600" : "bg-ink-700"}`}
                style={{ width: `${((row.value ?? 0) / max) * 100}%` }}
              />
            </div>
          </>
        );
        if (!onSelect) return <div key={rowId}>{content}</div>;
        return (
          <button
            key={rowId}
            type="button"
            onClick={() => onSelect(rowId)}
            className="w-full rounded-lg text-left transition-colors hover:bg-muted/60"
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
