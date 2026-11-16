"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeleteReportButton({ id }: { id: string }) {
  const router = useRouter();
  async function remove() {
    if (!confirm("Ta bort rapporten? Det går inte att ångra.")) return;
    const res = await fetch(`/api/mediaplan/rapport/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/mediaplan/rapport");
    else alert("Något gick fel. Försök igen.");
  }
  return (
    <button onClick={remove} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-milou-600">
      <Trash2 className="w-4 h-4" aria-hidden /> Ta bort rapporten
    </button>
  );
}
