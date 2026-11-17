"use client";

/** Steg 1–3 överst på sidorna, så att man ser var i flödet man är. */
export default function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Välj kund", "Välj projekt", "Årsplan och kampanjer"];
  return (
    <ol className="flex flex-wrap gap-x-6 gap-y-2 mb-6 text-sm" aria-label="Steg">
      {steps.map((s, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const state = n < current ? "done" : n === current ? "now" : "todo";
        return (
          <li key={s} className="flex items-center gap-2" aria-current={state === "now" ? "step" : undefined}>
            <span className={`w-6 h-6 grid place-items-center text-xs font-bold ${state === "now" ? "bg-milou-500 text-white" : state === "done" ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-600"}`}>{n}</span>
            <span className={state === "now" ? "font-bold text-gray-900" : "text-gray-600"}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
