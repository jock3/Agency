"use client";

import { useEffect, useId, useState } from "react";

export interface FormField {
  key: string;
  label: string;
  type?: "text" | "date" | "number";
  placeholder?: string;
  hint?: string;
  required?: boolean;
  initial?: string;
  maxLength?: number;
}

const ERRORS: Record<string, string> = {
  DUPLICATE: "Det namnet finns redan. Välj ett annat.",
  INVALID_NAME: "Skriv ett namn (högst 120 tecken).",
  INVALID_PERIOD: "Startdatumet kan inte vara efter slutdatumet.",
  INVALID_YEAR: "Välj ett år mellan 2000 och 2100.",
};

/** Liten ruta för att skapa eller byta namn på kund, projekt och kampanj. */
export default function FormModal({ title, intro, fields, submitLabel, onSubmit, onClose }: {
  title: string;
  intro?: React.ReactNode;
  fields: FormField[];
  submitLabel: string;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  onClose: () => void;
}) {
  const titleId = useId();
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, f.initial ?? ""])));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const missing = fields.find((f) => f.required && !values[f.key]?.trim());
    if (missing) return setError(`Fyll i ${missing.label.toLowerCase()}.`);
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setError(ERRORS[code] ?? "Något gick fel. Försök igen.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 grid place-items-center p-4" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={submit} className="bg-white w-full max-w-md p-5 shadow-2xl">
        <h2 id={titleId} className="font-bold text-lg">{title}</h2>
        {intro && <p className="text-sm text-gray-600 mt-1">{intro}</p>}
        <div className="flex flex-col gap-3 mt-4">
          {fields.map((f, i) => (
            <label key={f.key} className="block text-sm">
              <span className="block text-gray-700 font-medium mb-1">{f.label}{!f.required && <span className="font-normal text-gray-500"> (valfritt)</span>}</span>
              <input
                autoFocus={i === 0}
                type={f.type ?? "text"}
                value={values[f.key]}
                maxLength={f.maxLength ?? 120}
                placeholder={f.placeholder}
                onChange={(e) => { setValues((v) => ({ ...v, [f.key]: e.target.value })); setError(null); }}
                className="w-full border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-milou-500"
              />
              {f.hint && <span className="block text-xs text-gray-500 mt-1">{f.hint}</span>}
            </label>
          ))}
        </div>
        {error && <p role="alert" className="text-sm text-milou-600 mt-3">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} disabled={saving} className="h-9 px-3.5 border border-gray-300 bg-white text-sm hover:bg-gray-50">Avbryt</button>
          <button type="submit" disabled={saving} className="h-9 px-3.5 bg-milou-500 hover:bg-milou-600 disabled:opacity-60 text-white text-sm font-bold">{saving ? "Sparar…" : submitLabel}</button>
        </div>
      </form>
    </div>
  );
}
