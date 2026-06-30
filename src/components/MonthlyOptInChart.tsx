"use client";

import type { MonthlyOptInPoint } from "@/lib/data";

/**
 * Dependency-free inline-SVG line chart of the monthly blended opt-in rate,
 * with the 2.5% target drawn as a dashed reference line and the latest month
 * called out. On-brand navy/blue (no green).
 */
export default function MonthlyOptInChart({
  points,
  targetRate,
}: {
  points: MonthlyOptInPoint[];
  targetRate: number;
}) {
  const W = 520;
  const H = 200;
  const padL = 40;
  const padR = 16;
  const padT = 18;
  const padB = 34;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const rates = points.map((p) => p.rate);
  // Scale to comfortably include the target line and a little headroom.
  const maxVal = Math.max(...rates, targetRate) * 1.15;
  const x = (i: number) =>
    points.length <= 1 ? padL + innerW / 2 : padL + (i / (points.length - 1)) * innerW;
  const y = (v: number) => padT + innerH - (v / maxVal) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.rate).toFixed(1)}`)
    .join(" ");

  // Area fill under the line.
  const areaPath =
    `${linePath} L ${x(points.length - 1).toFixed(1)} ${(padT + innerH).toFixed(1)}` +
    ` L ${x(0).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;

  const targetY = y(targetRate);
  const last = points[points.length - 1];
  const lastX = x(points.length - 1);
  const lastY = y(last.rate);

  const fmt = (v: number) => `${(v * 100).toFixed(2)}%`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Monthly opt-in rate trend"
        className="overflow-visible"
      >
        {/* Y gridlines at 0, target, and max */}
        {[0, targetRate, maxVal].map((v, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(v)}
              y2={y(v)}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#5b6577">
              {fmt(v)}
            </text>
          </g>
        ))}

        {/* Target reference line (dashed, accent blue) */}
        <line
          x1={padL}
          x2={W - padR}
          y1={targetY}
          y2={targetY}
          stroke="#0A86CB"
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
        <text x={W - padR} y={targetY - 5} textAnchor="end" fontSize="9" fontWeight="600" fill="#0A86CB">
          Target {fmt(targetRate)}
        </text>

        {/* Area + line */}
        <path d={areaPath} fill="#0A86CB" fillOpacity={0.08} />
        <path d={linePath} fill="none" stroke="#001A5C" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

        {/* Points */}
        {points.map((p, i) => {
          const isLast = i === points.length - 1;
          return (
            <g key={i}>
              <circle
                cx={x(i)}
                cy={y(p.rate)}
                r={isLast ? 5 : 3.5}
                fill={isLast ? "#0A86CB" : "#001A5C"}
                stroke="#fff"
                strokeWidth={isLast ? 2 : 1.5}
              >
                <title>{`${p.label}: ${fmt(p.rate)}`}</title>
              </circle>
              <text
                x={x(i)}
                y={H - padB + 16}
                textAnchor="middle"
                fontSize="9"
                fill="#5b6577"
              >
                {p.label}
              </text>
            </g>
          );
        })}

        {/* Latest-month callout */}
        <text
          x={lastX}
          y={lastY - 12}
          textAnchor={points.length > 1 ? "end" : "middle"}
          fontSize="11"
          fontWeight="700"
          fill="#001A5C"
        >
          {fmt(last.rate)}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted">
          Latest:{" "}
          <span className="font-semibold text-navy">{last.label}</span> at{" "}
          <span className="font-semibold text-navy">{fmt(last.rate)}</span>
        </span>
        <span className="text-muted">
          Target <span className="font-semibold text-accent">{fmt(targetRate)}</span>
        </span>
      </div>
    </div>
  );
}
