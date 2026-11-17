"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MediaPlan } from "@/lib/types";
import { getPlanReportLinks } from "@/lib/api/plan-reports";
import ReportCompanyPicker from "./ReportCompanyPicker";

/**
 * "Skapa rapport" / "Se rapport" på plankorten. Ger props till PlanCard och
 * ett element (felruta och företagsval) att rendera en gång på sidan.
 */
export function usePlanReports() {
  const router = useRouter();
  const [reports, setReports] = useState<{ links: Record<string, string>; companies: { id: string; name: string }[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pickFor, setPickFor] = useState<MediaPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlanReportLinks().then(setReports).catch(() => setReports({ links: {}, companies: [] }));
  }, []);

  const create = async (plan: MediaPlan, companyId: string) => {
    setBusy(plan.id);
    setError(null);
    try {
      const res = await fetch("/api/mediaplan/rapport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, planId: plan.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error === "REPORT_EXISTS" ? "Planen har redan en rapport i ett företag du inte är medlem i." : "Rapporten kunde inte skapas. Försök igen.");
        setBusy(null);
        return;
      }
      router.push(`/mediaplan/rapport/${data.id}`);
    } catch {
      setError("Rapporten kunde inte skapas. Försök igen.");
      setBusy(null);
    }
  };

  const open = (plan: MediaPlan) => {
    const existing = reports?.links[plan.id];
    if (existing) return router.push(`/mediaplan/rapport/${existing}`);
    const companies = reports?.companies ?? [];
    if (companies.length === 0) return setError("Du är inte medlem i något företag än. Be en admin lägga till dig under Social media → Annonsverktyg.");
    if (companies.length === 1) return void create(plan, companies[0].id);
    setPickFor(plan);
  };

  const reportProps = (plan: MediaPlan) => ({
    reportReady: reports !== null,
    reportId: reports?.links[plan.id] ?? null,
    reportBusy: busy === plan.id,
    onReport: () => open(plan),
  });

  const reportUi = (
    <>
      {error && (
        <p role="alert" className="mb-4 bg-white border-l-4 border-milou-500 px-4 py-3 text-sm flex justify-between gap-4">
          {error}
          <button onClick={() => setError(null)} className="text-gray-500 hover:text-gray-800" aria-label="Stäng">✕</button>
        </p>
      )}
      {pickFor && reports && (
        <ReportCompanyPicker
          planName={pickFor.campaign_name}
          companies={reports.companies}
          onPick={(id) => { const p = pickFor; setPickFor(null); void create(p, id); }}
          onClose={() => setPickFor(null)}
        />
      )}
    </>
  );

  return { reportProps, reportUi };
}
