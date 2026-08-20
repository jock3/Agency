"use client";

import { Plus } from "lucide-react";

export default function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-6 flex flex-col gap-1.5" aria-hidden="true">
        <span className="block h-2.5 w-40 rounded-full bg-gray-200" />
        <span className="block h-2.5 w-28 rounded-full bg-gray-200" />
        <span className="block h-2.5 w-36 rounded-full bg-gray-200" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900">En tom tavla, full av möjligheter</h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        Skapa din första grupp och börja lägga in objekt — statusar, personer och tidslinjer följer
        med på köpet.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 flex items-center gap-2 rounded-xl bg-milou-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-milou-400"
      >
        <Plus size={16} strokeWidth={2.5} /> Skapa grupp
      </button>
    </div>
  );
}
