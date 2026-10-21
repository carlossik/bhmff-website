import { useState } from "react";
import { WhatsAppConnectionPanel } from "../admin/Communications/WhatsAppConnectionPanel";
export function WhatsAppSetupStep({
  organisationId,
  onBack,
  onContinue,
}: {
  organisationId: string | null;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [choice, setChoice] = useState<"later" | "business_app" | "platform">(
    "later",
  );
  const button =
    "rounded-xl border border-white/20 px-5 py-3 font-bold text-white";
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black text-white">
          Set up your WhatsApp communications
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Choose how your club currently uses WhatsApp. Connect securely with
          Meta, or finish setup now and return to Communications later.
        </p>
      </header>
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-bold text-white">
          Your current setup
        </legend>
        {(
          [
            ["later", "Set up later / use ordinary WhatsApp groups"],
            ["business_app", "I use the WhatsApp Business app on a phone"],
            [
              "platform",
              "I have a WhatsApp Business Platform / Cloud API account",
            ],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className="flex items-start gap-3 rounded-xl border border-white/10 p-4 text-sm text-white"
          >
            <input
              type="radio"
              name="whatsapp-setup"
              value={value}
              checked={choice === value}
              onChange={() => setChoice(value)}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      {choice !== "later" && organisationId && (
        <>
          <p className="text-sm text-slate-400">
            Have access to the Meta business portfolio and your business phone
            ready. Meta collects the account and phone details; you do not need
            to copy access tokens into TournamentHQ.
          </p>
          <WhatsAppConnectionPanel
            key={choice}
            initialMode={choice}
            organisationId={organisationId}
            onChanged={() => {}}
          />
        </>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onBack} className={button}>
          Back
        </button>
        <button type="button" onClick={onContinue} className={button}>
          {choice === "later" ? "Skip and finish setup" : "Continue to finish"}
        </button>
      </div>
    </div>
  );
}
