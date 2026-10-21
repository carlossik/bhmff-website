export function sessionReminderText(
  event: { title: string; starts_at: string; timezone: string; venue: string },
  organisation: string,
  url: string,
): string {
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: event.timezone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(event.starts_at));
  return `${organisation}\nSession reminder: ${event.title}\n${date}\nVenue: ${event.venue || "To be confirmed"}\nPlease confirm availability: ${url}`;
}
export function reminderTemplateParameters(
  event: { title: string; starts_at: string; timezone: string; venue: string },
  organisation: string,
  url: string,
): Record<string, string> {
  return {
    "body:1": organisation,
    "body:2": event.title,
    "body:3": new Intl.DateTimeFormat("en-GB", {
      timeZone: event.timezone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(event.starts_at)),
    "body:4": event.venue || "To be confirmed",
    "body:5": url,
  };
}
export async function workerSecretMatches(
  provided: string,
  expected: string,
): Promise<boolean> {
  if (!provided || !expected) return false;
  const hash = async (value: string) =>
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    );
  const [a, b] = await Promise.all([hash(provided), hash(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
