"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, Save, X } from "lucide-react";
import { MAX_IMAGERY, MAX_REFERENCE, MAX_REFERENCES, MAX_VOICE, type Brand } from "@/lib/ads/brand";
import { ADS_ERRORS, FALLBACK } from "../../errors";

const field =
  "w-full border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-milou-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500";

const VOICE_HINT = `Exempel:
Vi tilltalar läsaren med ni. Tonen är rak och varm, aldrig skrikig. Rubriker är högst sex ord och börjar med erbjudandet, inte med företagsnamnet.
Använd: "hos oss", "boka", "gäller till". Undvik: "unik", "revolutionerande", utropstecken, versaler i löptext.
Erbjudanden skrivs "20 % rabatt", med mellanslag före procenttecknet.`;
const IMAGERY_HINT = `Exempel:
Naturligt dagsljus, vardagliga miljöer och riktiga människor i rörelse. Varma, dämpade färger. Motivet i övre halvan av bilden så att mallen får plats längst ned.
Aldrig: stockfoto-leenden, mörka eller dramatiska bilder, logotyper från andra märken.`;

/** Skrivguide, förebilder och bildspråk för ett företag. AI:n läser det vid varje annons. */
export default function BrandEditor({ companyId, initial }: { companyId: string; initial: Brand }) {
  const router = useRouter();
  const [voice, setVoice] = useState(initial.voice);
  const [imagery, setImagery] = useState(initial.imagery);
  const [refs, setRefs] = useState<string[]>(initial.references.length > 0 ? initial.references : [""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const touch = () => setSaved(false);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/annonser/companies/${companyId}/brand`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice, imagery, references: refs }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(ADS_ERRORS[data.error] ?? FALLBACK);
      setRefs(data.references.length > 0 ? data.references : [""]);
      setSaved(true);
      router.refresh();
    } catch {
      setError(FALLBACK);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="flex flex-col gap-6 max-w-[80ch]"
    >
      <p className="text-sm text-gray-600">
        Det här läser AI:n vid varje annons. Skrivguiden och förebilderna styr hur texten låter, bildspråket styr vilka bilder som väljs och hur nya bilder beskrivs.
        Priser, procent och datum hämtas fortfarande bara ur budskapet, oavsett vad som står här.
      </p>

      <section className="bg-white p-4" aria-label="Skrivguide">
        <label htmlFor="voice" className="font-bold text-sm block">
          Skrivguide
        </label>
        <p className="text-xs text-gray-600 mb-2">Tilltal, ton, ord ni använder och undviker, rubriklängd, hur erbjudanden skrivs.</p>
        <textarea
          id="voice"
          rows={7}
          maxLength={MAX_VOICE}
          value={voice}
          onChange={(e) => (setVoice(e.target.value), touch())}
          placeholder={VOICE_HINT}
          className={field}
        />
        <p className="text-xs text-gray-600 mt-1">
          {voice.length} av {MAX_VOICE} tecken
        </p>
      </section>

      <section className="bg-white p-4" aria-label="Förebilder">
        <h3 className="font-bold text-sm">Förebilder</h3>
        <p className="text-xs text-gray-600 mb-2">
          Rubriker och texter ni gillar, en per rad: &quot;så här vill vi låta&quot;. Tre till sex bra exempel gör mest nytta. Högst {MAX_REFERENCES}.
        </p>
        <ul className="flex flex-col gap-2">
          {refs.map((r, i) => (
            <li key={i} className="flex gap-2">
              <input
                aria-label={`Förebild ${i + 1}`}
                value={r}
                maxLength={MAX_REFERENCE}
                onChange={(e) => (setRefs((l) => l.map((x, j) => (j === i ? e.target.value : x))), touch())}
                className={field}
              />
              <button
                type="button"
                aria-label={`Ta bort förebild ${i + 1}`}
                onClick={() => (setRefs((l) => (l.length > 1 ? l.filter((_, j) => j !== i) : [""])), touch())}
                className="px-2 border border-gray-300 bg-white hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        {refs.length < MAX_REFERENCES && (
          <button
            type="button"
            onClick={() => setRefs((l) => [...l, ""])}
            className="mt-2 flex items-center gap-1.5 text-sm font-bold border border-gray-300 bg-white hover:bg-gray-100 px-3 py-1.5"
          >
            <Plus className="w-4 h-4" aria-hidden /> Lägg till förebild
          </button>
        )}
      </section>

      <section className="bg-white p-4" aria-label="Bildspråk">
        <label htmlFor="imagery" className="font-bold text-sm block">
          Bildspråk
        </label>
        <p className="text-xs text-gray-600 mb-2">Stil, ljus, motiv och vad som aldrig ska synas. Gäller både val ur bildbanken och nya bilder.</p>
        <textarea
          id="imagery"
          rows={5}
          maxLength={MAX_IMAGERY}
          value={imagery}
          onChange={(e) => (setImagery(e.target.value), touch())}
          placeholder={IMAGERY_HINT}
          className={field}
        />
        <p className="text-xs text-gray-600 mt-1">
          {imagery.length} av {MAX_IMAGERY} tecken
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="flex items-center gap-1.5 text-sm font-bold bg-milou-500 hover:bg-milou-600 disabled:opacity-40 text-white px-4 py-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Save className="w-4 h-4" aria-hidden />}
          Spara
        </button>
        <p role="status" className="text-sm text-gray-700 empty:hidden">
          {saved && "Sparat. Nästa annons följer det här."}
        </p>
        <p role="alert" className="text-sm text-milou-600 empty:hidden">
          {error}
        </p>
      </div>
    </form>
  );
}
