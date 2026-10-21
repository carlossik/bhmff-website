import { requireBillingAdmin } from "../_shared/auth.ts";
import {
  corsHeaders,
  HttpError,
  errorResponse,
  jsonResponse,
} from "../_shared/http.ts";
Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return jsonResponse({ error: "Method not allowed." }, 405);
  try {
    const body = await request.json();
    if (
      typeof body.organisationId !== "string" ||
      typeof body.code !== "string" ||
      body.code.length > 80
    )
      throw new HttpError(400, "Enter a valid season pass code.");
    const { admin, user } = await requireBillingAdmin(
      request,
      body.organisationId,
    );
    const { error } = await admin.rpc("redeem_bexley_pilot", {
      p_organisation: body.organisationId,
      p_user: user.id,
      p_code: body.code,
    });
    if (error) throw new HttpError(400, error.message);
    return jsonResponse({
      activated: true,
      endsOn: "2027-06-30",
      maxTeams: 3,
      automaticCharge: false,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
