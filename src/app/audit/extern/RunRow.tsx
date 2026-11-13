"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import CheckGroups from "@/components/audit/CheckGroups";
import type { Check } from "@/lib/audit/types";

export interface RunRowData {
  id: string;
  final_url: string;
  score: number;
  seo_score: number;
  geo_score: number;
  time: string;
  pageCount: number;
  emails: string[];
  checks: Check[];
}

/** En granskning i listan. Raden fälls ut till samma brist-lista som besökaren fick. */
export default function RunRow({ run }: { run: RunRowData }) {
  const [open, setOpen] = useState(false);
  const panel = `run-${run.id}`;

  return (
    <>
      <tr className="border-b border-gray-100">
        <td className="py-2 px-3 whitespace-nowrap tabular-nums">{run.time}</td>
        <td className="py-2 px-3 max-w-xs truncate">
          <a href={run.final_url} target="_blank" rel="noreferrer" className="hover:text-milou-500">
            {run.final_url}
          </a>
        </td>
        <td className="py-2 px-3 max-w-xs truncate">
          {run.emails.length ? run.emails.join(", ") : <span className="text-gray-300">–</span>}
        </td>
        <td className="py-2 px-3 text-right tabular-nums font-bold">{run.score}</td>
        <td className="py-2 px-3 text-right tabular-nums">{run.seo_score}</td>
        <td className="py-2 px-3 text-right tabular-nums">{run.geo_score}</td>
        <td className="py-2 px-3 text-right tabular-nums">{run.pageCount}</td>
        <td className="py-2 px-3 text-right">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={panel}
            className="inline-flex items-center gap-1 font-bold hover:text-milou-500 whitespace-nowrap"
          >
            Brister
            <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-gray-100 bg-gray-50">
          <td colSpan={8} className="p-6">
            <CheckGroups id={panel} checks={run.checks} seoScore={run.seo_score} geoScore={run.geo_score} />
          </td>
        </tr>
      )}
    </>
  );
}
