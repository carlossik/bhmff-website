import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
export function BexleyPilotManager() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function approve() {
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.rpc("approve_bexley_pilot_email", {
        p_email: email.trim(),
      });
      if (error) throw error;
      setMessage(
        "Registration email approved. Ask this contact to create Bexley Borough as a club and enter BEXLEY2027 in Plan & Billing.",
      );
      setEmail("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to approve email.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-2xl border border-white/10 p-5">
      <h3 className="text-lg font-bold">Bexley Borough season pilot</h3>
      <p className="mt-2 text-sm text-slate-400">
        Full Professional club functionality for three teams through 30 June
        2027. Code: <strong>BEXLEY2027</strong>. Approve the coach’s exact
        registration email before signup. No card or automatic renewal.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <input
          aria-label="Approved Bexley registration email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 rounded-xl bg-black/30 p-3"
          placeholder="Coach’s registration email"
        />
        <button
          type="button"
          disabled={busy || !email.trim()}
          onClick={() => void approve()}
          className="rounded-xl border px-4 py-2 disabled:opacity-50"
        >
          Approve email
        </button>
      </div>
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
