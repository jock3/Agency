"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Download, Search } from "lucide-react";
import { CATEGORIES, RESOURCES, RESOURCE_TYPES, type Resource, type ResourceType } from "@/lib/resources/data";

const categoryTitle = (id: string) => CATEGORIES.find((c) => c.id === id)?.title ?? id;

/** Allt som går att söka eller filtrera på för en resurs. */
const tagsOf = (r: Resource) => [RESOURCE_TYPES[r.type], categoryTitle(r.category), ...r.tags];

const chip = (active: boolean) =>
  `h-8 px-3 text-sm font-bold border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-peach ${
    active ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300 hover:border-gray-900"
  }`;

export default function ResourceBrowser() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ResourceType | null>(null);
  const [tag, setTag] = useState<string | null>(null);

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return RESOURCES.filter((r) => {
      if (type && r.type !== type) return false;
      if (tag && !tagsOf(r).includes(tag)) return false;
      const hay = `${r.title} ${r.description} ${tagsOf(r).join(" ")}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [query, type, tag]);

  const groups = CATEGORIES.map((c) => ({ ...c, items: shown.filter((r) => r.category === c.id) })).filter((g) => g.items.length > 0);
  const filtered = query !== "" || type !== null || tag !== null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Sök bland resurser"
          placeholder="Sök på namn, beskrivning eller tagg"
          className="w-full h-11 pl-10 pr-3 border border-gray-300 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-peach"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrera på typ">
        <span className="text-sm text-gray-600 mr-1">Typ</span>
        <button type="button" aria-pressed={type === null} onClick={() => setType(null)} className={chip(type === null)}>
          Alla
        </button>
        {(Object.keys(RESOURCE_TYPES) as ResourceType[]).map((t) => (
          <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(type === t ? null : t)} className={chip(type === t)}>
            {RESOURCE_TYPES[t]}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrera på ämne">
        <span className="text-sm text-gray-600 mr-1">Ämne</span>
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button" aria-pressed={tag === c.title} onClick={() => setTag(tag === c.title ? null : c.title)} className={chip(tag === c.title)}>
            {c.title}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-gray-600" aria-live="polite">
        {shown.length} av {RESOURCES.length} resurser
        {filtered && (
          <>
            {" · "}
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setType(null);
                setTag(null);
              }}
              className="underline hover:text-gray-900"
            >
              Rensa filter
            </button>
          </>
        )}
      </p>

      {groups.length === 0 && <p className="mt-10 text-gray-600">Inga resurser matchar. Prova ett annat ord eller rensa filtren.</p>}

      {groups.map((g) => (
        <section key={g.id} aria-labelledby={`cat-${g.id}`} className="mt-10">
          <h2 id={`cat-${g.id}`} className="font-display font-extrabold text-xl">
            {g.title}
          </h2>
          <p className="mt-1 text-sm text-gray-600 max-w-[70ch]">{g.description}</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((r) => (
              <li key={r.id} className="bg-white border border-gray-200 p-4 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold">{r.title}</h3>
                  <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-gray-600">{RESOURCE_TYPES[r.type]}</span>
                </div>
                <p className="mt-2 text-sm text-gray-600 flex-1">{r.description}</p>
                {r.tags.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Taggar">
                    {r.tags.map((t) => (
                      <li key={t}>
                        <button type="button" onClick={() => setTag(t)} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 hover:bg-gray-200">
                          {t}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {r.download ? (
                  <a
                    href={r.url}
                    download={r.download}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-milou-500 hover:text-milou-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-peach"
                  >
                    <Download className="w-4 h-4" aria-hidden />
                    Ladda ner {r.download}
                  </a>
                ) : (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${r.title} (öppnas i ny flik)`}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-milou-500 hover:text-milou-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-peach"
                  >
                    Öppna
                    <ArrowUpRight className="w-4 h-4" aria-hidden />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
