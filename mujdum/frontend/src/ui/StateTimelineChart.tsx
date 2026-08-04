import {
  formatAxisTime,
  stateColorForLabel,
  toStateLabel,
  type MetricHistoryPoint
} from "./dashboardMetricChartUtils.js";

type Props = Readonly<{
  points: MetricHistoryPoint[];
  windowMinutes: number;
  variant?: "default" | "modal";
}>;

/** Původní SVG timeline pro diskrétní / výčtové hodnoty (on/off, text). */
export default function StateTimelineChart({ points, windowMinutes, variant = "default" }: Props) {
  const svgHeight = variant === "modal" ? 120 : 88;
  const times = points.map((p) => Date.parse(p.ts));
  const hasTimes = times.every((t) => Number.isFinite(t));
  const t0 = hasTimes ? Math.min(...times) : 0;
  const t1 = hasTimes ? Math.max(...times) : points.length - 1;
  const span = Math.max(1, t1 - t0);

  const w = 760;
  const h = 88;
  const pad = 12;

  const stateForIdx = (i: number) => toStateLabel(points[i]?.value);

  const segs: Array<{ from: number; to: number; state: string }> = [];
  let curState = stateForIdx(0);
  let curFrom = 0;
  for (let i = 1; i < points.length; i++) {
    const s = stateForIdx(i);
    if (s === curState) continue;
    segs.push({ from: curFrom, to: i, state: curState });
    curState = s;
    curFrom = i;
  }
  segs.push({ from: curFrom, to: points.length - 1, state: curState });

  const uniqStates = Array.from(new Set(segs.map((s) => s.state)));

  const xForTime = (t: number) => pad + ((t - t0) / span) * (w - 2 * pad);
  const xForIdx = (i: number) =>
    pad + (i / Math.max(1, points.length - 1)) * (w - 2 * pad);

  const xAt = (i: number) => {
    if (!hasTimes) return xForIdx(i);
    const time = times[i];
    return time === undefined ? xForIdx(i) : xForTime(time);
  };

  const xStart = pad;
  const xEnd = w - pad;
  const y = 24;
  const barH = 26;

  return (
    <div className="stateTimelineChart">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={svgHeight} aria-label="Timeline stavů">
        <rect
          x={xStart}
          y={y}
          width={xEnd - xStart}
          height={barH}
          rx={10}
          fill="rgba(255,255,255,0.06)"
          stroke="rgba(255,255,255,0.12)"
        />
        {segs.map((s) => {
          const x1 = xAt(s.from);
          const x2 = s.to >= points.length - 1 ? xEnd : xAt(s.to + 1);
          const width = Math.max(2, x2 - x1);
          return (
            <rect
              key={`${s.from}-${s.to}-${s.state}`}
              x={x1}
              y={y}
              width={width}
              height={barH}
              rx={10}
              fill={stateColorForLabel(s.state)}
            />
          );
        })}
        {hasTimes ? (
          <>
            <text
              x={xStart}
              y={h - 4}
              fill="rgba(218,226,253,0.6)"
              fontSize="11"
              textAnchor="start"
            >
              {formatAxisTime(t0, windowMinutes)}
            </text>
            <text
              x={xEnd}
              y={h - 4}
              fill="rgba(218,226,253,0.6)"
              fontSize="11"
              textAnchor="end"
            >
              {formatAxisTime(t1, windowMinutes)}
            </text>
          </>
        ) : null}
      </svg>
      <div className="muted stateTimelineLegend">
        {uniqStates.slice(0, 8).map((s) => (
          <span key={s} className="stateTimelineLegendItem">
            <span
              className="stateTimelineLegendDot"
              style={{ background: stateColorForLabel(s) }}
            />
            <span>{s}</span>
          </span>
        ))}
        {uniqStates.length > 8 ? <span>…</span> : null}
      </div>
    </div>
  );
}
