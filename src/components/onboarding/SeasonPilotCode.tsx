import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
export function SeasonPilotCode({
  organisationId,
  onActivated,
}: {
  organisationId: string;
  onActivated: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function apply() {
    setBusy(true);
    setError("");
    try {
      const result = await supabase.functions.invoke("redeem-season-pilot", {
        body: { organisationId, code: code.trim() },
      });
      if (result.error) {
        const context = result.error.context;
        const details =
          context instanceof Response
            ? await context.json().catch(() => null)
            : null;
        throw new Error(details?.error || result.error.message);
      }
      if (!result.data?.activated)
        throw new Error(
          result.data?.error || "The season pass could not be activated.",
        );
      onActivated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to apply code.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-2xl border border-white/10 p-5">
      <label className="block text-sm font-bold text-white">
        Season pass or pilot code
        <div className="mt-2 flex flex-wrap gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={80}
            autoComplete="off"
            className="min-w-0 rounded-xl bg-black/30 p-3 text-white"
            placeholder="Enter your code"
          />
          <button
            type="button"
            disabled={busy || !code.trim()}
            onClick={() => void apply()}
            className="rounded-xl border border-lime-400/50 px-4 py-2 font-bold text-lime-300 disabled:opacity-50"
          >
            {busy ? "Applying…" : "Apply code"}
          </button>
        </div>
      </label>
      <p className="mt-2 text-xs text-slate-400">
        Invited pilot clubs can activate their season pass without a payment
        card. No automatic charge at the end.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-200">
          {error}
        </p>
      )}
    </section>
  );
}
