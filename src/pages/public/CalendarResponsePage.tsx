import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
type Details = {
  title: string;
  organisation: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  venue: string;
  response: string | null;
};
export function CalendarResponsePage() {
  const [details, setDetails] = useState<Details | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const token =
    new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
  useEffect(() => {
    let active = true;
    void supabase
      .rpc("calendar_rsvp", { p_token: token, p_response: null })
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data)
          setError("This session link is invalid, cancelled or expired.");
        else setDetails(data as Details);
        setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [token]);
  async function reply(value: string) {
    setBusy(true);
    setError("");
    try {
      const { data, error } = await supabase.rpc("calendar_rsvp", {
        p_token: token,
        p_response: value,
      });
      if (error) throw error;
      if (!data) throw new Error("This link has expired.");
      setDetails(data as Details);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save response.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-screen bg-[#071006] p-5 text-white">
      <section className="mx-auto mt-10 max-w-xl rounded-2xl border border-white/15 p-6">
        <p className="text-sm font-bold text-lime-300">
          TournamentHQ · Session availability
        </p>
        {details && (
          <>
            <h1 className="mt-4 text-2xl font-black">{details.title}</h1>
            <p className="mt-3">{details.organisation}</p>
            <p className="mt-2 text-sm text-slate-400">
              {new Intl.DateTimeFormat("en-GB", {
                timeZone: details.timezone,
                dateStyle: "full",
                timeStyle: "short",
              }).format(new Date(details.startsAt))}{" "}
              · {details.venue || "Venue TBC"}
            </p>
            <p className="mt-5 font-bold">Can you attend?</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {(
                [
                  ["yes", "Yes"],
                  ["no", "No"],
                  ["maybe", "Maybe"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  disabled={
                    busy || new Date(details.startsAt).getTime() <= Date.now()
                  }
                  onClick={() => void reply(value)}
                  aria-pressed={details.response === value}
                  className={`rounded-xl border px-5 py-3 font-bold disabled:opacity-50 ${details.response === value ? "border-lime-400 bg-lime-400/15" : "border-white/20"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {details.response && (
              <p role="status" className="mt-4 text-sm text-lime-300">
                Response saved: {details.response}. You can change it before the
                session starts.
              </p>
            )}
          </>
        )}
        {busy && <p className="mt-4 text-sm">Loading…</p>}
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-200">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
