import { supabase } from "../lib/supabaseClient";
export type CalendarEvent = {
  id: string;
  organisation_id: string;
  team_id: string;
  season_id: string;
  series_id: string | null;
  title: string;
  event_type: "training" | "club_event";
  starts_at: string;
  ends_at: string;
  timezone: string;
  venue: string;
  notes: string;
  status: "scheduled" | "cancelled";
  reminder_minutes: number | null;
  reminder_channels: string[];
};
export type CalendarDraft = {
  teamId: string;
  seasonId: string;
  title: string;
  type: "training" | "club_event";
  start: string;
  end: string;
  timezone: string;
  venue: string;
  notes: string;
  repeat: "none" | "weekly" | "fortnightly";
  until: string;
  reminder: string;
  email: boolean;
  whatsapp: boolean;
};
function checked<T>({
  data,
  error,
}: {
  data: T;
  error: { message: string } | null;
}): T {
  if (error) throw new Error(error.message);
  return data;
}
export const clubCalendarService = {
  async events(org: string, start: string, end: string) {
    return checked(
      await supabase
        .from("club_calendar_events")
        .select("*")
        .eq("organisation_id", org)
        .gte("starts_at", start)
        .lt("starts_at", end)
        .order("starts_at"),
    ) as CalendarEvent[];
  },
  async next(org: string) {
    return checked(
      await supabase
        .from("club_calendar_events")
        .select("*")
        .eq("organisation_id", org)
        .eq("status", "scheduled")
        .eq("event_type", "training")
        .gt("ends_at", new Date().toISOString())
        .order("starts_at")
        .limit(1)
        .maybeSingle(),
    ) as CalendarEvent | null;
  },
  async create(org: string, d: CalendarDraft) {
    return checked(
      await supabase.rpc("create_calendar_series", {
        p_org: org,
        p_team: d.teamId,
        p_season: d.seasonId,
        p_title: d.title,
        p_type: d.type,
        p_start: d.start,
        p_end: d.end,
        p_timezone: d.timezone,
        p_venue: d.venue,
        p_notes: d.notes,
        p_repeat: d.repeat,
        p_until: d.until || null,
        p_reminder: d.reminder ? Number(d.reminder) : null,
        p_channels: [
          ...(d.email ? ["email"] : []),
          ...(d.whatsapp ? ["whatsapp"] : []),
        ],
      }),
    ) as number;
  },
  async edit(event: CalendarEvent, d: CalendarDraft) {
    checked(
      await supabase
        .from("club_calendar_events")
        .update({
          title: d.title,
          event_type: d.type,
          starts_at: localToInstant(d.start, d.timezone),
          ends_at: localToInstant(d.end, d.timezone),
          venue: d.venue,
          notes: d.notes,
          reminder_minutes: d.reminder ? Number(d.reminder) : null,
          reminder_channels: [
            ...(d.email ? ["email"] : []),
            ...(d.whatsapp ? ["whatsapp"] : []),
          ],
        })
        .eq("id", event.id)
        .eq("organisation_id", event.organisation_id)
        .select("id")
        .single(),
    );
  },
  async cancel(event: CalendarEvent, series = false) {
    let query = supabase
      .from("club_calendar_events")
      .update({ status: "cancelled" })
      .eq("organisation_id", event.organisation_id)
      .eq("team_id", event.team_id);
    query =
      series && event.series_id
        ? query
            .eq("series_id", event.series_id)
            .gte("starts_at", event.starts_at)
        : query.eq("id", event.id);
    checked(await query.select("id"));
  },
  async attendance(event: CalendarEvent) {
    const [roster, attendance] = await Promise.all([
      supabase
        .from("club_squad_members")
        .select("id,squad_number,club_players(first_name,last_name)")
        .eq("organisation_id", event.organisation_id)
        .eq("team_id", event.team_id)
        .eq("season_id", event.season_id)
        .eq("active", true),
      supabase
        .from("club_calendar_attendance")
        .select("*")
        .eq("event_id", event.id),
    ]);
    return {
      roster: checked(roster) ?? [],
      attendance: checked(attendance) ?? [],
    };
  },
  async mark(eventId: string, memberId: string, attendance: string) {
    checked(
      await supabase
        .from("club_calendar_attendance")
        .upsert(
          {
            event_id: eventId,
            squad_member_id: memberId,
            attendance,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "event_id,squad_member_id" },
        ),
    );
  },
  async responses(eventId: string) {
    return checked(
      await supabase.rpc("get_calendar_responses", { p_event: eventId }),
    ) as {
      contactName: string;
      channel: string;
      status: string;
      response: string | null;
      error: string | null;
    }[];
  },
};
// Convert an edited local date to its IANA-zone instant without using the operator's device timezone.
export function localToInstant(value: string, zone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Enter a valid date and time.");
  const [, y, m, d, h, min] = match;
  const target = Date.UTC(+y, +m - 1, +d, +h, +min);
  let instant = target;
  const parts = (t: number) =>
    Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(new Date(t))
        .map((p) => [p.type, p.value]),
    );
  for (let i = 0; i < 3; i++) {
    const p = parts(instant);
    const displayed = Date.UTC(
      +p.year,
      +p.month - 1,
      +p.day,
      +p.hour,
      +p.minute,
    );
    instant += target - displayed;
  }
  const p = parts(instant);
  if (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) !== target)
    throw new Error(
      "This time does not exist when the clocks change. Choose another time.",
    );
  return new Date(instant).toISOString();
}
export function zonedInput(value: string, zone: string): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(value))
      .map((p) => [p.type, p.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function calendarDate(value: string, zone = "Europe/London"): string {
  return zonedInput(value, zone).slice(0, 10);
}
