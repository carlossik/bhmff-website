import { useEffect, useState } from "react";
import { useOrganisation } from "../../../context/OrganisationContext";
import {
  clubCalendarService,
  type CalendarEvent,
} from "../../../services/clubCalendarService";
export function NextSessionCard({ onOpen }: { onOpen: () => void }) {
  const { currentOrganisation } = useOrganisation();
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setEvent(null);
    setError("");
    clubCalendarService
      .next(currentOrganisation.id)
      .then((e) => {
        if (active) setEvent(e);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [currentOrganisation.id]);
  return (
    <section className="rounded-2xl border border-lime-400/30 bg-lime-400/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-black">Next session</h3>
        <button
          type="button"
          onClick={onOpen}
          className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold"
        >
          Open calendar
        </button>
      </div>
      {event ? (
        <>
          <p className="mt-3 font-bold">{event.title}</p>
          <p className="mt-1 text-sm text-slate-400">
            {new Intl.DateTimeFormat("en-GB", {
              timeZone: event.timezone,
              dateStyle: "full",
              timeStyle: "short",
            }).format(new Date(event.starts_at))}{" "}
            · {event.venue || "Venue to be confirmed"}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-400">
          {error ||
            "No upcoming training session. Add sessions in your club calendar."}
        </p>
      )}
    </section>
  );
}
