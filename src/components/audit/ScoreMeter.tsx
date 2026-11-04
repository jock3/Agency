/** Betyget som en mätare i tio raka segment, ett per poäng. */
export default function ScoreMeter({
  label,
  description,
  score,
  previous,
  tone,
}: {
  label: string;
  description: string;
  score: number | null;
  previous?: number;
  tone: string;
}) {
  const delta = score !== null && previous !== undefined ? score - previous : null;
  return (
    <div>
      <div className="flex items-end gap-4">
        <h2 className="font-display font-extrabold text-xl pb-2 w-14">{label}</h2>
        <p className="font-display font-extrabold text-[64px] leading-none tabular-nums">
          {score ?? "–"}
          <span className="text-2xl text-gray-500">/10</span>
        </p>
        {delta !== null && (
          <span
            className={`mb-2 text-sm font-bold tabular-nums px-2 py-0.5 ${
              delta > 0 ? "bg-[#C2EDE5] text-[#052D28]" : delta < 0 ? "bg-milou-500 text-white" : "bg-gray-800 text-gray-300"
            }`}
          >
            {delta > 0 ? `+${delta}` : delta === 0 ? "±0" : delta} sedan förra
          </span>
        )}
      </div>
      <div className="mt-4 grid grid-cols-10 gap-1" role="img" aria-label={`${label}: ${score ?? "inget"} av 10`}>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={`h-3 ${score !== null && i < score ? tone : "bg-gray-800"}`} />
        ))}
      </div>
      <p className="text-sm text-gray-400 mt-3">{score === null ? "Ingen granskning ännu." : description}</p>
    </div>
  );
}
