import { useState } from "react";
import { Building2, Mail, Phone, Presentation, X } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useOptionalPublicOrganisation } from "../../context/PublicOrganisationContext";

type DemoRequestModalProps = {
    onClose: () => void;
};

type DemoRequestForm = {
    organisation: string;
    contactName: string;
    email: string;
    phone: string;
    competitionType: string;
    numberOfTeams: string;
    message: string;
};

const initialForm: DemoRequestForm = {
    organisation: "",
    contactName: "",
    email: "",
    phone: "",
    competitionType: "",
    numberOfTeams: "",
    message: "",
};

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value: string) {
    const trimmedValue = value.trim();

    if (!trimmedValue) return true;
    if (!/^[0-9+() -]+$/.test(trimmedValue)) return false;
    if (trimmedValue.includes("+") && !trimmedValue.startsWith("+")) return false;
    if ((trimmedValue.match(/\+/g) ?? []).length > 1) return false;

    const digitCount = trimmedValue.replace(/\D/g, "").length;
    return digitCount >= 7 && digitCount <= 15;
}

export function DemoRequestModal({ onClose }: DemoRequestModalProps) {
    const publicOrganisation = useOptionalPublicOrganisation();
    const [form, setForm] = useState<DemoRequestForm>(initialForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    function updateForm<Key extends keyof DemoRequestForm>(
        key: Key,
        value: DemoRequestForm[Key],
    ) {
        setForm((current) => ({ ...current, [key]: value }));
        setErrorMessage("");
    }

    function validateForm() {
        if (!form.organisation.trim()) return "Organisation name is required.";
        if (!form.contactName.trim()) return "Contact name is required.";
        if (!isValidEmail(form.email)) return "Enter a valid email address.";
        if (!isValidPhone(form.phone)) {
            return "Enter a valid phone number containing 7 to 15 digits.";
        }
        if (!form.competitionType) return "Select a competition type.";
        if (
            form.numberOfTeams &&
            (Number.isNaN(Number(form.numberOfTeams)) ||
                Number(form.numberOfTeams) < 2)
        ) {
            return "Number of teams must be at least 2.";
        }
        if (!form.message.trim()) {
            return "Tell us briefly about the competition or requirement.";
        }
        return null;
    }

    async function submitRequest() {
        const validationError = validateForm();

        if (validationError) {
            setErrorMessage(validationError);
            return;
        }

        setIsSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        const { error } = await supabase.from("demo_requests").insert({
            organisation_id: publicOrganisation?.organisationId ?? null,
            organisation: form.organisation.trim(),
            contact_name: form.contactName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || null,
            competition_type: form.competitionType,
            number_of_teams: form.numberOfTeams
                ? Number(form.numberOfTeams)
                : null,
            message: form.message.trim(),
            status: "new",
        });

        if (error) {
            console.error("Failed to submit demo request:", error);
            setErrorMessage(
                "Your demo request could not be submitted. Please try again.",
            );
            setIsSubmitting(false);
            return;
        }

        setForm(initialForm);
        setSuccessMessage(
            "Thank you. Your demo request has been received and the CKEFA team will contact you.",
        );
        setIsSubmitting(false);
    }

    const inputClassName =
        "mt-2 w-full rounded-xl border border-lime-900/70 bg-[#071006] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-lime-400 disabled:cursor-not-allowed disabled:opacity-60";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !isSubmitting) {
                    onClose();
                }
            }}
        >
            <section
                className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-lime-800/60 bg-[#071006] shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="demo-request-title"
            >
                <header className="sticky top-0 z-10 flex flex-col gap-5 border-b border-lime-900/50 bg-[#071006]/95 p-6 backdrop-blur sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <img
                            src="/assets/tournamenthq-logo.png"
                            alt="TournamentHQ"
                            className="mb-5 h-auto max-h-12 w-[190px] object-contain"
                        />

                        <p className="text-xs font-black uppercase tracking-[0.2em] text-lime-400">
                            TournamentHQ
                        </p>

                        <h2
                            id="demo-request-title"
                            className="mt-2 text-4xl font-black text-white"
                        >
                            Book a Demonstration
                        </h2>

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                            Tell us about your league, cup or tournament and we
                            will arrange a tailored platform demonstration.
                        </p>
                    </div>

                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-white transition hover:border-lime-500 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <X size={17} />
                        Close
                    </button>
                </header>

                <div className="p-6 sm:p-8">
                    {successMessage ? (
                        <div className="rounded-2xl border border-emerald-700/50 bg-emerald-500/10 p-8 text-center">
                            <Presentation
                                size={42}
                                className="mx-auto text-emerald-300"
                            />

                            <h3 className="mt-4 text-2xl font-black text-white">
                                Demo request received
                            </h3>

                            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-emerald-200">
                                {successMessage}
                            </p>

                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-6 rounded-xl bg-lime-400 px-5 py-3 font-black text-black transition hover:bg-lime-300"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {errorMessage && (
                                <p className="rounded-xl border border-red-800/60 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                                    {errorMessage}
                                </p>
                            )}

                            <div className="grid gap-5 sm:grid-cols-2">
                                <label className="block text-sm font-bold text-white">
                                    <span className="inline-flex items-center gap-2">
                                        <Building2
                                            size={16}
                                            className="text-lime-400"
                                        />
                                        Organisation *
                                    </span>
                                    <input
                                        value={form.organisation}
                                        maxLength={150}
                                        onChange={(event) =>
                                            updateForm(
                                                "organisation",
                                                event.target.value,
                                            )
                                        }
                                        disabled={isSubmitting}
                                        className={inputClassName}
                                    />
                                </label>

                                <label className="block text-sm font-bold text-white">
                                    Contact Name *
                                    <input
                                        value={form.contactName}
                                        maxLength={120}
                                        autoComplete="name"
                                        onChange={(event) =>
                                            updateForm(
                                                "contactName",
                                                event.target.value,
                                            )
                                        }
                                        disabled={isSubmitting}
                                        className={inputClassName}
                                    />
                                </label>

                                <label className="block text-sm font-bold text-white">
                                    <span className="inline-flex items-center gap-2">
                                        <Mail
                                            size={16}
                                            className="text-lime-400"
                                        />
                                        Email *
                                    </span>
                                    <input
                                        type="email"
                                        value={form.email}
                                        maxLength={254}
                                        autoComplete="email"
                                        onChange={(event) =>
                                            updateForm(
                                                "email",
                                                event.target.value,
                                            )
                                        }
                                        disabled={isSubmitting}
                                        className={inputClassName}
                                    />
                                </label>

                                <label className="block text-sm font-bold text-white">
                                    <span className="inline-flex items-center gap-2">
                                        <Phone
                                            size={16}
                                            className="text-lime-400"
                                        />
                                        Phone
                                    </span>
                                    <input
                                        type="tel"
                                        inputMode="tel"
                                        value={form.phone}
                                        maxLength={25}
                                        autoComplete="tel"
                                        pattern="[0-9+() -]*"
                                        placeholder="e.g. 07951 750370"
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            if (/^[0-9+() -]*$/.test(value)) {
                                                updateForm("phone", value);
                                            }
                                        }}
                                        disabled={isSubmitting}
                                        className={inputClassName}
                                    />
                                </label>

                                <label className="block text-sm font-bold text-white">
                                    Competition Type *
                                    <select
                                        value={form.competitionType}
                                        onChange={(event) =>
                                            updateForm(
                                                "competitionType",
                                                event.target.value,
                                            )
                                        }
                                        disabled={isSubmitting}
                                        className={inputClassName}
                                    >
                                        <option value="">Select type</option>
                                        <option value="league">League</option>
                                        <option value="cup">Cup</option>
                                        <option value="tournament">
                                            Tournament
                                        </option>
                                        <option value="school_competition">
                                            School Competition
                                        </option>
                                        <option value="other">Other</option>
                                    </select>
                                </label>

                                <label className="block text-sm font-bold text-white">
                                    Approximate Number of Teams
                                    <input
                                        type="number"
                                        min="2"
                                        max="1000"
                                        value={form.numberOfTeams}
                                        onChange={(event) =>
                                            updateForm(
                                                "numberOfTeams",
                                                event.target.value,
                                            )
                                        }
                                        disabled={isSubmitting}
                                        className={inputClassName}
                                    />
                                </label>

                                <label className="block text-sm font-bold text-white sm:col-span-2">
                                    Requirement *
                                    <textarea
                                        value={form.message}
                                        maxLength={2000}
                                        rows={6}
                                        placeholder="Tell us about your competition, expected dates and what you need the platform to manage."
                                        onChange={(event) =>
                                            updateForm(
                                                "message",
                                                event.target.value,
                                            )
                                        }
                                        disabled={isSubmitting}
                                        className={`${inputClassName} resize-y`}
                                    />
                                </label>
                            </div>

                            <div className="flex flex-wrap gap-3 border-t border-lime-900/50 pt-6">
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => void submitRequest()}
                                    className="rounded-xl bg-lime-400 px-5 py-3 font-black text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSubmitting
                                        ? "Submitting..."
                                        : "Request Demo"}
                                </button>

                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={onClose}
                                    className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-white transition hover:border-lime-500 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}