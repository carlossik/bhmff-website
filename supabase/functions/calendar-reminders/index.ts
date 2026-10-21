import { createAdminClient } from "../_shared/auth.ts";
import { jsonResponse } from "../_shared/http.ts";
import {
  sendWithProvider,
  channelDryRunEnabled,
} from "../_shared/communicationsProviders.ts";
import {
  loadWhatsAppConnection,
  connectionReady,
  listWhatsAppTemplates,
  sendClubWhatsApp,
} from "../_shared/clubWhatsApp.ts";
import {
  sessionReminderText,
  reminderTemplateParameters,
  workerSecretMatches,
} from "../_shared/calendarReminders.ts";
// @ts-ignore
Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== "POST")
    return jsonResponse({ error: "Method not allowed." }, 405);
  const provided =
    request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
  // @ts-ignore
  if (
    !(await workerSecretMatches(
      provided,
      Deno.env.get("THQ_CALENDAR_WORKER_SECRET")?.trim() ?? "",
    ))
  )
    return jsonResponse({ error: "Unauthorised worker request." }, 401);
  try {
    const admin = createAdminClient();
    const appUrl = Deno.env.get("TOURNAMENTHQ_APP_URL")?.trim();
    if (!appUrl || !/^https:\/\//.test(appUrl))
      throw new Error("Configure the HTTPS TournamentHQ application URL.");
    const expiry = await admin.rpc("expire_season_pilots");
    if (expiry.error) throw expiry.error;
    const { data: claims, error } = await admin.rpc(
      "claim_calendar_reminders",
      { p_limit: 25 },
    );
    if (error) throw error;
    let accepted = 0,
      failed = 0;
    for (const claim of claims ?? []) {
      try {
        const { data: job, error: jobError } = await admin
          .from("club_calendar_reminders")
          .select("*,club_calendar_events(*),communication_contacts(*)")
          .eq("id", claim.job_id)
          .single();
        if (jobError) throw jobError;
        const event = job.club_calendar_events,
          contact = job.communication_contacts;
        const [
          { data: org, error: orgError },
          { data: settings, error: settingsError },
        ] = await Promise.all([
          admin
            .from("organisations")
            .select(
              "name,status,subscription_status,trial_end,pilot_expires_at",
            )
            .eq("id", event.organisation_id)
            .single(),
          admin
            .from("communication_settings")
            .select("email_enabled,whatsapp_enabled,reply_to_email")
            .eq("organisation_id", event.organisation_id)
            .maybeSingle(),
        ]);
        if (orgError || settingsError)
          throw new Error("Unable to read organisation reminder settings.");
        // Recheck opt-outs and cancellations immediately before submitting to a provider.
        if (
          !contact.active ||
          contact.team_id !== event.team_id ||
          event.status !== "scheduled" ||
          new Date(event.starts_at).getTime() <= Date.now() ||
          org?.status !== "active" ||
          !["active", "trial", "past_due"].includes(org.subscription_status)
        )
          throw new Error("Session or recipient is no longer eligible.");
        const url = `${appUrl.replace(/\/$/, "")}/calendar/respond#token=${claim.token}`;
        let result;
        if (job.channel === "email") {
          if (
            !contact.operational_email_enabled ||
            settings?.email_enabled === false ||
            !contact.email
          )
            throw new Error(
              "Email reminders are disabled for this recipient or organisation.",
            );
          result = await sendWithProvider({
            channel: "email",
            recipientName: contact.display_name,
            email: contact.email,
            phone: null,
            subject: `Session reminder: ${event.title}`,
            body: sessionReminderText(event, org.name, url),
            senderName: org.name,
            replyToEmail: settings?.reply_to_email ?? null,
            providerTemplateRef: null,
            variables: {},
          });
        } else {
          if (
            !contact.operational_whatsapp_enabled ||
            settings?.whatsapp_enabled === false
          )
            throw new Error(
              "WhatsApp reminders are disabled for this recipient or organisation.",
            );
          const connection = await loadWhatsAppConnection(
            admin,
            event.organisation_id,
          );
          if (!connectionReady(connection))
            throw new Error(
              "Connect your organisation WhatsApp account before using session reminders.",
            );
          const name =
            Deno.env.get("THQ_CALENDAR_WHATSAPP_TEMPLATE")?.trim() ||
            "thq_session_reminder";
          const language =
            Deno.env.get("THQ_CALENDAR_WHATSAPP_LANGUAGE")?.trim() || "en_GB";
          const template = (await listWhatsAppTemplates(connection!)).find(
            (t) => t.name === name && t.language === language,
          );
          if (!template)
            throw new Error(
              "The approved utility session-reminder template is not available in this WhatsApp account.",
            );
          result = await sendClubWhatsApp(
            connection!,
            contact.whatsapp_e164 || contact.phone_e164,
            template,
            reminderTemplateParameters(event, org.name, url),
            job.id,
          );
        }
        const simulated =
          channelDryRunEnabled(job.channel) ||
          result.provider === "mock" ||
          result.providerMessageId?.startsWith("dry-run-");
        const saved = await admin
          .from("club_calendar_reminders")
          .update({
            status: simulated ? "dry_run" : "accepted",
            provider_message_id: result.providerMessageId,
            error_message: null,
          })
          .eq("id", job.id);
        if (saved.error)
          throw new Error(
            "Submission status could not be saved; review the provider before resending.",
          );
        accepted++;
      } catch (error) {
        failed++;
        await admin
          .from("club_calendar_reminders")
          .update({
            status: "failed",
            error_message:
              error instanceof Error
                ? error.message.slice(0, 400)
                : "Reminder failed. Review configuration.",
          })
          .eq("id", claim.job_id);
      }
    }
    return jsonResponse({ processed: (claims ?? []).length, accepted, failed });
  } catch {
    return jsonResponse(
      {
        error:
          "Calendar reminder processing failed. Check the worker configuration.",
      },
      500,
    );
  }
});
