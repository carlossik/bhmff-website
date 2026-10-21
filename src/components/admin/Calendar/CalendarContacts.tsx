import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../../lib/supabaseClient";
type Contact = {
  id: string;
  display_name: string;
  team_id: string;
  email: string | null;
  whatsapp_e164: string | null;
  operational_email_enabled: boolean;
  operational_whatsapp_enabled: boolean;
};
export function CalendarContacts({
  organisationId,
  teams,
}: {
  organisationId: string;
  teams: { id: string; name: string }[];
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsApp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    const { data, error } = await supabase
      .from("communication_contacts")
      .select(
        "id,display_name,team_id,email,whatsapp_e164,operational_email_enabled,operational_whatsapp_enabled",
      )
      .eq("organisation_id", organisationId)
      .eq("active", true)
      .order("display_name");
    if (error) throw error;
    setContacts((data ?? []) as Contact[]);
  }
  useEffect(() => {
    setContacts([]);
    setName("");
    setTeam("");
    setEmail("");
    setPhone("");
    setWhatsApp(false);
    void load().catch((e) => setError(e.message));
  }, [organisationId]);
  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() && !phone.trim()) {
      setError("Enter an email or WhatsApp number.");
      return;
    }
    if (phone.trim() && !/^\+[1-9]\d{7,14}$/.test(phone.trim())) {
      setError("Use an international number such as +447700900001.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("communication_contacts")
        .insert({
          organisation_id: organisationId,
          team_id: team,
          display_name: name.trim(),
          subject_type: "guardian",
          relationship_label: "Session contact",
          email: email.trim() || null,
          whatsapp_e164: phone.trim() || null,
          operational_email_enabled: !!email.trim(),
          operational_whatsapp_enabled: whatsapp && !!phone.trim(),
          operational_sms_enabled: false,
          marketing_email_enabled: false,
          marketing_sms_enabled: false,
          marketing_whatsapp_enabled: false,
        });
      if (error) throw error;
      setName("");
      setEmail("");
      setPhone("");
      setWhatsApp(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save contact.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("communication_contacts")
        .update({ active: false })
        .eq("id", id)
        .eq("organisation_id", organisationId);
      if (error) throw error;
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to disable contact.");
    } finally {
      setBusy(false);
    }
  }
  const input =
    "mt-1 w-full rounded-xl border border-white/15 bg-[#0c180f] p-3 text-white";
  const button =
    "rounded-xl border border-white/20 px-4 py-2 text-sm font-bold disabled:opacity-50";
  return (
    <details className="rounded-xl border border-white/10 p-4">
      <summary className="font-bold">Reminder contacts</summary>
      <p className="mt-3 text-sm text-slate-400">
        Add the parent, guardian or adult team contact who should receive
        session reminders. Contacts stay private. Email reminders include a
        private availability link.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-200">
          {error}
        </p>
      )}
      <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Contact name
          <input
            className={input}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Team
          <select
            className={input}
            required
            value={team}
            onChange={(e) => setTeam(e.target.value)}
          >
            <option value="">Choose team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Email
          <input
            type="email"
            className={input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="text-sm">
          WhatsApp number (international format)
          <input
            className={input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+447700900001"
          />
        </label>
        <label className="flex items-start gap-3 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={whatsapp}
            onChange={(e) => setWhatsApp(e.target.checked)}
          />
          <span>
            This contact has agreed to receive WhatsApp session reminders.
          </span>
        </label>
        <button type="submit" disabled={busy} className={button}>
          Save contact
        </button>
      </form>
      <div className="mt-4 space-y-2">
        {contacts
          .filter((c) => teams.some((t) => t.id === c.team_id))
          .map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-3 text-sm"
            >
              <span>
                {c.display_name} · {teams.find((t) => t.id === c.team_id)?.name}
                <span className="mt-1 block text-xs text-slate-400">
                  {c.operational_email_enabled ? "Email enabled" : ""}
                  {c.operational_whatsapp_enabled ? " · WhatsApp enabled" : ""}
                </span>
              </span>
              <button
                type="button"
                disabled={busy}
                className={button}
                onClick={() => void remove(c.id)}
              >
                Disable contact
              </button>
            </div>
          ))}
      </div>
    </details>
  );
}
