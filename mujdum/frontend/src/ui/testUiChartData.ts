/** Ukázková časová řada pro srovnání knihoven v Test UI (teplota + výkon). */
export type DemoPoint = {
  ts: Date;
  label: string;
  tempC: number;
  powerW: number;
};

function buildDemoSeries(): DemoPoint[] {
  const now = Date.now();
  const points: DemoPoint[] = [];
  for (let i = 23; i >= 0; i -= 1) {
    const ts = new Date(now - i * 60 * 60 * 1000);
    const t = 23 - i;
    points.push({
      ts,
      label: ts.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
      tempC: Math.round((19.2 + Math.sin(t / 3.2) * 2.4 + Math.cos(t / 7) * 0.6) * 10) / 10,
      powerW: Math.round(900 + Math.sin(t / 2.5) * 550 + Math.cos(t / 5) * 120)
    });
  }
  return points;
}

export const DEMO_CHART_POINTS = buildDemoSeries();
