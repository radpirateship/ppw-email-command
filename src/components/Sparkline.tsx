"use client";

/** Tiny dependency-free bar chart for the monthly email-attributed revenue series. */
export default function Sparkline({
  data,
  labels,
}: {
  data: number[];
  labels: string[];
}) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height: 96 }}>
      {data.map((v, i) => {
        const h = (v / max) * 100;
        return (
          <div key={i} className="group flex flex-1 flex-col items-center justify-end">
            <div
              className="w-full rounded-t bg-accent/80 transition-colors group-hover:bg-accent"
              style={{ height: `${Math.max(h, 2)}%` }}
              title={`${labels[i] ?? ""}: $${v.toLocaleString()}`}
            />
          </div>
        );
      })}
    </div>
  );
}
