interface Point {
  seo: number;
  geo: number;
  label: string;
}

/** Betygens utveckling över körningarna, äldst till vänster. SEO och GEO som
 *  var sin linje på skalan 1–10. */
export default function TrendChart({ points }: { points: Point[] }) {
  if (points.length < 2) return <p className="text-sm text-gray-500">Kör fler audits för att se utvecklingen över tid.</p>;

  const W = 640;
  const H = 160;
  const PAD = 24;
  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - 1) / 9) * (H - PAD * 2);
  const line = (key: "seo" | "geo") => points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");

  return (
    <div className="bg-white p-5">
      <div className="flex gap-5 text-sm mb-3">
        <span className="flex items-center gap-2"><span className="w-4 h-1 bg-plum" /> SEO</span>
        <span className="flex items-center gap-2"><span className="w-4 h-1 bg-peach" /> GEO</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Betyg över tid">
        {[1, 5, 10].map((v) => (
          <g key={v}>
            <line x1={PAD} x2={W - PAD} y1={y(v)} y2={y(v)} className="stroke-gray-200" />
            <text x={0} y={y(v) + 4} className="fill-gray-400 text-[10px]">{v}</text>
          </g>
        ))}
        <path d={line("seo")} fill="none" strokeWidth={3} className="stroke-plum" />
        <path d={line("geo")} fill="none" strokeWidth={3} className="stroke-peach" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.seo)} r={4} className="fill-plum" />
            <circle cx={x(i)} cy={y(p.geo)} r={4} className="fill-peach" />
            <title>{`${p.label}: SEO ${p.seo}, GEO ${p.geo}`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}
