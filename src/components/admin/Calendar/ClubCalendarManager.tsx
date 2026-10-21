import { CalendarContacts } from "./CalendarContacts";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useOrganisation } from "../../../context/OrganisationContext";
import { supabase } from "../../../lib/supabaseClient";
import {
  clubCalendarService,
  calendarDate,
  zonedInput,
  type CalendarDraft,
  type CalendarEvent,
} from "../../../services/clubCalendarService";
import { userService } from "../Users/userService";
import type { AdminUser } from "../Users/userTypes";
import { Modal } from "../../common/Modal";
type Team = { id: string; name: string };
type Season = { id: string; name: string; status: string };
type Fixture = {
  id: string;
  team_id: string | null;
  fixture_date: string;
  kickoff_time: string | null;
  venue_name: string | null;
  status: string;
  club_opponents: { name: string } | null;
};
const fresh = (): CalendarDraft => ({
  teamId: "",
  seasonId: "",
  title: "",
  type: "training",
  start: "",
  end: "",
  timezone: "Europe/London",
  venue: "",
  notes: "",
  repeat: "none",
  until: "",
  reminder: "1440",
  email: true,
  whatsapp: false,
});
const input =
  "mt-1 w-full rounded-xl border border-white/15 bg-[#0c180f] p-3 text-white";
const button =
  "rounded-xl border border-white/20 px-4 py-2 text-sm font-bold disabled:opacity-50";
export function ClubCalendarManager() {
  const { currentOrganisation, currentRole, profile } = useOrganisation();
  const org = currentOrganisation.id;
  const admin =
    profile.isPlatformAdmin ||
    ["super_admin", "competition_manager"].includes(currentRole);
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [team, setTeam] = useState("all");
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<CalendarDraft | null>(null);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [roster, setRoster] = useState<
    { id: string; name: string; attendance: string }[]
  >([]);
  const [responses, setResponses] = useState<
    Awaited<ReturnType<typeof clubCalendarService.responses>>
  >([]);
  const [members, setMembers] = useState<AdminUser[]>([]);
  const [coachTeam, setCoachTeam] = useState("");
  const [coachUser, setCoachUser] = useState("");
  const [coaches, setCoaches] = useState<
    { team_id: string; user_id: string }[]
  >([]);
  const start = `${month}-01T00:00:00Z`;
  const end = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1),
  ).toISOString();
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const e = await clubCalendarService.events(
        org,
        new Date(new Date(start).getTime() - 86400000).toISOString(),
        new Date(new Date(end).getTime() + 86400000).toISOString(),
      );
      setEvents(e);
      const f = await supabase
        .from("club_fixtures")
        .select(
          "id,team_id,fixture_date,kickoff_time,venue_name,status,club_opponents(name)",
        )
        .eq("organisation_id", org)
        .gte("fixture_date", start.slice(0, 10))
        .lt("fixture_date", end.slice(0, 10))
        .neq("status", "cancelled");
      if (f.error) throw f.error;
      setFixtures((f.data ?? []) as unknown as Fixture[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load calendar.");
    } finally {
      setBusy(false);
    }
  }, [org, start, end]);
  useEffect(() => {
    setSelected(null);
    setForm(null);
    setEditing(null);
    setTeam("all");
    setTeams([]);
    setSeasons([]);
    let active = true;
    void (async () => {
      try {
        const [t, s, c] = await Promise.all([
          supabase
            .from("teams")
            .select("id,name")
            .eq("organisation_id", org)
            .order("name"),
          supabase
            .from("club_seasons")
            .select("id,name,status")
            .eq("organisation_id", org)
            .order("start_date", { ascending: false }),
          supabase
            .from("club_calendar_coaches")
            .select("team_id,user_id")
            .eq("organisation_id", org),
        ]);
        if (t.error || s.error || c.error) throw t.error || s.error || c.error;
        if (!active) return;
        const allowed = admin
          ? (t.data ?? [])
          : (t.data ?? []).filter((row) =>
              (c.data ?? []).some(
                (a) => a.team_id === row.id && a.user_id === profile.id,
              ),
            );
        setTeams(allowed);
        setSeasons(s.data ?? []);
        setCoaches(c.data ?? []);
        if (admin) {
          const users = await userService.getUsers(org);
          if (active)
            setMembers(
              users.filter((u) => u.active && u.role === "match_official"),
            );
        }
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "Unable to load teams.");
      }
    })();
    return () => {
      active = false;
    };
  }, [org, admin, profile.id]);
  useEffect(() => {
    void load();
  }, [load]);
  const allowedIds = useMemo(() => new Set(teams.map((t) => t.id)), [teams]);
  const shown = events.filter(
    (e) =>
      allowedIds.has(e.team_id) &&
      (team === "all" || e.team_id === team) &&
      calendarDate(e.starts_at, e.timezone).startsWith(month),
  );
  const shownFixtures = fixtures.filter(
    (f) =>
      f.team_id &&
      allowedIds.has(f.team_id) &&
      (team === "all" || f.team_id === team),
  );
  const teamName = (id: string) =>
    teams.find((t) => t.id === id)?.name || "Team";
  const first = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1),
  );
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  function newEvent(date = `${month}-01`) {
    setEditing(null);
    setForm({
      ...fresh(),
      teamId: team === "all" ? (teams[0]?.id ?? "") : team,
      seasonId:
        seasons.find((s) => s.status === "active")?.id ?? seasons[0]?.id ?? "",
      start: `${date}T18:00`,
      end: `${date}T19:30`,
    });
  }
  function editEvent(e: CalendarEvent) {
    setEditing(e);
    setSelected(null);
    setForm({
      teamId: e.team_id,
      seasonId: e.season_id,
      title: e.title,
      type: e.event_type,
      start: zonedInput(e.starts_at, e.timezone),
      end: zonedInput(e.ends_at, e.timezone),
      timezone: e.timezone,
      venue: e.venue,
      notes: e.notes,
      repeat: "none",
      until: "",
      reminder: e.reminder_minutes?.toString() ?? "",
      email: e.reminder_channels.includes("email"),
      whatsapp: e.reminder_channels.includes("whatsapp"),
    });
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError("");
    try {
      if (editing) {
        await clubCalendarService.edit(editing, form);
        setNotice(
          "Session updated. Previously submitted reminders are retained.",
        );
      } else {
        const count = await clubCalendarService.create(org, form);
        setNotice(`${count} session${count === 1 ? "" : "s"} created.`);
      }
      setForm(null);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save session.");
    } finally {
      setBusy(false);
    }
  }
  async function open(e: CalendarEvent) {
    setSelected(e);
    setRoster([]);
    setResponses([]);
    setError("");
    try {
      const [a, r] = await Promise.all([
        clubCalendarService.attendance(e),
        clubCalendarService.responses(e.id),
      ]);
      setRoster(
        a.roster.map((row) => {
          const p = row.club_players as unknown as {
            first_name: string;
            last_name: string;
          } | null;
          return {
            id: row.id,
            name: p ? `${p.first_name} ${p.last_name}` : "Player",
            attendance:
              a.attendance.find((x) => x.squad_member_id === row.id)
                ?.attendance ?? "unknown",
          };
        }),
      );
      setResponses(r ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load attendance.");
    }
  }
  async function cancel(e: CalendarEvent, series = false) {
    setBusy(true);
    try {
      await clubCalendarService.cancel(e, series);
      setSelected(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to cancel session.");
    } finally {
      setBusy(false);
    }
  }
  async function mark(id: string, value: string) {
    if (!selected) return;
    try {
      await clubCalendarService.mark(selected.id, id, value);
      setRoster((v) =>
        v.map((x) => (x.id === id ? { ...x, attendance: value } : x)),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Attendance could not be saved.",
      );
    }
  }
  async function assignCoach() {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("club_calendar_coaches")
        .upsert(
          { organisation_id: org, team_id: coachTeam, user_id: coachUser },
          { onConflict: "team_id,user_id" },
        );
      if (error) throw error;
      setCoaches((v) => [
        ...v.filter((x) => x.team_id !== coachTeam || x.user_id !== coachUser),
        { team_id: coachTeam, user_id: coachUser },
      ]);
      setNotice("Coach calendar access saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to assign coach.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black">Club calendar</h2>
          <p className="mt-2 text-sm text-slate-400">
            Training, matches and club events. Session times use the event’s
            timezone.
          </p>
        </div>
        <button
          type="button"
          className={button}
          onClick={() => newEvent()}
          disabled={!teams.length || !seasons.length}
        >
          Add session or event
        </button>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-400/40 p-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-lime-300">
          {notice}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm">
          Month
          <input
            type="month"
            value={month}
            onChange={(e) => {
              if (e.target.value) setMonth(e.target.value);
            }}
            className={input}
          />
        </label>
        <label className="text-sm">
          Team
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className={input}
          >
            <option value="all">All my teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={button}
          disabled={busy}
          onClick={() => void load()}
        >
          {busy ? "Loading…" : "Refresh"}
        </button>
      </div>
      {!teams.length && (
        <p className="text-sm text-slate-400">
          {admin
            ? "Add a team and season to start scheduling."
            : "Ask your club administrator to assign your team under Coach access."}
        </p>
      )}
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <div className="grid min-w-[560px] grid-cols-7">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div
              key={d}
              className="border-b border-white/10 p-2 text-center text-xs font-bold text-slate-400"
            >
              {d}
            </div>
          ))}
          {Array.from({ length: offset + days }, (_, i) => {
            const day = i - offset + 1;
            const date = `${month}-${String(day).padStart(2, "0")}`;
            return (
              <div
                key={i}
                className="min-h-28 border-b border-r border-white/10 p-2"
              >
                {day > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => newEvent(date)}
                      className="mb-2 text-xs font-bold"
                      aria-label={`Add event on ${date}`}
                    >
                      {day}
                    </button>
                    {shown
                      .filter(
                        (e) => calendarDate(e.starts_at, e.timezone) === date,
                      )
                      .map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => void open(e)}
                          className={`mb-1 block w-full rounded-lg p-2 text-left text-xs ${e.status === "cancelled" ? "bg-red-400/10 line-through" : "bg-lime-400/10"}`}
                        >
                          {new Intl.DateTimeFormat("en-GB", {
                            timeZone: e.timezone,
                            timeStyle: "short",
                          }).format(new Date(e.starts_at))}{" "}
                          {e.title}
                        </button>
                      ))}
                    {shownFixtures
                      .filter((f) => f.fixture_date === date)
                      .map((f) => (
                        <div
                          key={f.id}
                          className="mb-1 rounded-lg bg-blue-400/10 p-2 text-xs"
                        >
                          Match · {f.kickoff_time?.slice(0, 5) || "TBC"}
                          <br />
                          {teamName(f.team_id!)} v{" "}
                          {f.club_opponents?.name || "Opponent"}
                        </div>
                      ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <section className="space-y-3">
        <h3 className="text-lg font-bold">Sessions and events</h3>
        {shown.length === 0 && (
          <p className="text-sm text-slate-400">No sessions in this month.</p>
        )}
        {shown.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => void open(e)}
            className="block w-full rounded-xl border border-white/10 p-4 text-left"
          >
            <span className="font-bold">
              {e.title} · {teamName(e.team_id)}
            </span>
            <span className="mt-1 block text-sm text-slate-400">
              {new Intl.DateTimeFormat("en-GB", {
                timeZone: e.timezone,
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(e.starts_at))}{" "}
              · {e.venue || "Venue TBC"} · {e.status}
              {e.series_id ? " · Recurring" : ""}
            </span>
          </button>
        ))}
      </section>
      {admin && <CalendarContacts organisationId={org} teams={teams} />}
      {admin && (
        <details className="rounded-xl border border-white/10 p-4">
          <summary className="font-bold">Coach access</summary>
          <p className="mt-3 text-sm text-slate-400">
            Invite a coach as Match Official in User Access, then assign their
            club team here. They can manage only sessions for assigned teams.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              Team
              <select
                className={input}
                value={coachTeam}
                onChange={(e) => setCoachTeam(e.target.value)}
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
              Coach
              <select
                className={input}
                value={coachUser}
                onChange={(e) => setCoachUser(e.target.value)}
              >
                <option value="">Choose coach</option>
                {members.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.full_name || u.email || u.user_id}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void assignCoach()}
              disabled={busy || !coachTeam || !coachUser}
              className={button}
            >
              Grant access
            </button>
          </div>
          {coaches.map((c) => (
            <div
              key={`${c.team_id}-${c.user_id}`}
              className="mt-3 flex items-center gap-3 text-sm"
            >
              <span>
                {teamName(c.team_id)} ·{" "}
                {members.find((m) => m.user_id === c.user_id)?.full_name ||
                  c.user_id}
              </span>
              <button
                type="button"
                className={button}
                onClick={() => {
                  void supabase
                    .from("club_calendar_coaches")
                    .delete()
                    .eq("team_id", c.team_id)
                    .eq("user_id", c.user_id)
                    .then(({ error }) => {
                      if (error) setError(error.message);
                      else setCoaches((v) => v.filter((x) => x !== c));
                    });
                }}
              >
                Remove access
              </button>
            </div>
          ))}
        </details>
      )}
      {form && (
        <Modal
          title={editing ? "Edit this occurrence" : "Add session or event"}
          onClose={() => {
            setForm(null);
            setEditing(null);
          }}
        >
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {error && (
              <p role="alert" className="text-sm text-red-200 sm:col-span-2">
                {error}
              </p>
            )}
            <label className="text-sm">
              Title
              <input
                required
                maxLength={160}
                className={input}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Type
              <select
                className={input}
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value as CalendarDraft["type"],
                  })
                }
              >
                <option value="training">Training session</option>
                <option value="club_event">Club event</option>
              </select>
            </label>
            <label className="text-sm">
              Team
              <select
                required
                disabled={!!editing}
                className={input}
                value={form.teamId}
                onChange={(e) => setForm({ ...form, teamId: e.target.value })}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Season
              <select
                required
                disabled={!!editing}
                className={input}
                value={form.seasonId}
                onChange={(e) => setForm({ ...form, seasonId: e.target.value })}
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Starts (local time)
              <input
                required
                type="datetime-local"
                className={input}
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Ends (local time)
              <input
                required
                type="datetime-local"
                min={form.start}
                className={input}
                value={form.end}
                onChange={(e) => setForm({ ...form, end: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Timezone
              <select
                disabled={!!editing}
                className={input}
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              >
                {[
                  "Europe/London",
                  "Europe/Dublin",
                  "Europe/Paris",
                  "Africa/Accra",
                  "Africa/Lagos",
                  "America/New_York",
                  "UTC",
                ].map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Venue
              <input
                className={input}
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Notes (private)
              <textarea
                className={input}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
            {!editing && (
              <>
                <label className="text-sm">
                  Repeat
                  <select
                    className={input}
                    value={form.repeat}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        repeat: e.target.value as CalendarDraft["repeat"],
                      })
                    }
                  >
                    <option value="none">One-off</option>
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Every two weeks</option>
                  </select>
                </label>
                {form.repeat !== "none" && (
                  <label className="text-sm">
                    Repeat until
                    <input
                      required
                      type="date"
                      min={form.start.slice(0, 10)}
                      className={input}
                      value={form.until}
                      onChange={(e) =>
                        setForm({ ...form, until: e.target.value })
                      }
                    />
                  </label>
                )}
              </>
            )}
            <label className="text-sm">
              Reminder
              <select
                className={input}
                value={form.reminder}
                onChange={(e) => setForm({ ...form, reminder: e.target.value })}
              >
                <option value="">No reminder</option>
                <option value="60">1 hour before</option>
                <option value="120">2 hours before</option>
                <option value="1440">1 day before</option>
                <option value="2880">2 days before</option>
              </select>
            </label>
            <fieldset className="text-sm">
              <legend>Reminder channels</legend>
              <label className="mt-2 flex gap-2">
                <input
                  type="checkbox"
                  checked={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.checked })
                  }
                />
                Email
              </label>
              <label className="mt-2 flex gap-2">
                <input
                  type="checkbox"
                  checked={form.whatsapp}
                  onChange={(e) =>
                    setForm({ ...form, whatsapp: e.target.checked })
                  }
                />
                WhatsApp (approved session template required)
              </label>
            </fieldset>
            <p className="text-xs leading-5 text-slate-400 sm:col-span-2">
              Reminders go to active team contacts in Communications who have
              enabled that channel. For juniors, use parent or guardian contact
              details. The scheduled worker must be configured before automatic
              delivery.
            </p>
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={busy} className={button}>
                {busy ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className={button}
                onClick={() => setForm(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <p className="text-sm text-slate-400">
            {teamName(selected.team_id)} · {selected.venue || "Venue TBC"} ·{" "}
            {selected.status}
          </p>
          {error && (
            <p role="alert" className="my-3 text-red-200">
              {error}
            </p>
          )}
          <p className="my-3 whitespace-pre-wrap text-sm">{selected.notes}</p>
          {selected.status === "scheduled" && (
            <div className="my-4 flex flex-wrap gap-3">
              <button
                type="button"
                className={button}
                onClick={() => editEvent(selected)}
              >
                Edit this session
              </button>
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() => void cancel(selected)}
              >
                Cancel this session
              </button>
              {selected.series_id && (
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() => void cancel(selected, true)}
                >
                  Cancel this and later sessions
                </button>
              )}
            </div>
          )}
          <h3 className="my-3 font-bold">Attendance</h3>
          {roster.length === 0 && (
            <p className="text-sm text-slate-400">
              No active squad members for this team and season.
            </p>
          )}
          {roster.map((p) => (
            <label
              key={p.id}
              className="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-3 text-sm"
            >
              <span>{p.name}</span>
              <select
                value={p.attendance}
                onChange={(e) => void mark(p.id, e.target.value)}
                className="rounded-lg bg-[#0c180f] p-2"
              >
                {["unknown", "present", "absent", "late", "excused"].map(
                  (a) => (
                    <option key={a}>{a}</option>
                  ),
                )}
              </select>
            </label>
          ))}
          <h3 className="mb-3 mt-6 font-bold">Reminder delivery and RSVP</h3>
          {responses.length === 0 && (
            <p className="text-sm text-slate-400">
              No reminders processed yet. Responses appear here once contacts
              receive their private reply link.
            </p>
          )}
          {responses.map((r, i) => (
            <p key={i} className="mb-2 text-sm">
              {r.contactName} · {r.channel} · {r.status} ·{" "}
              {r.response || "No reply"}
              {r.error ? ` · ${r.error}` : ""}
            </p>
          ))}
        </Modal>
      )}
    </div>
  );
}
