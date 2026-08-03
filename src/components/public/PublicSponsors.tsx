import {
    useEffect,
    useState,
    type FormEvent,
} from "react";

import {
    Building2,
    Handshake,
    Mail,
    Phone,
    X,
} from "lucide-react";

import { supabase } from "../../lib/supabaseClient";
import { useOptionalPublicOrganisation } from "../../context/PublicOrganisationContext";

type PublicSponsor = {
    id: string;
    name: string;
    tier: string | null;
    logo_url: string | null;
    website_url: string | null;
    description: string | null;
};

type SponsorEnquiryForm = {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    sponsorshipInterest: string;
    estimatedBudget: string;
    message: string;
};

const initialEnquiryForm: SponsorEnquiryForm = {
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    sponsorshipInterest: "",
    estimatedBudget: "",
    message: "",
};

function isValidPhoneNumber(value: string) {
    const trimmedValue =
        value.trim();

    if (!trimmedValue) {
        return true;
    }

    if (
        !/^[0-9+() -]+$/.test(
            trimmedValue,
        )
    ) {
        return false;
    }

    if (
        trimmedValue.includes("+") &&
        !trimmedValue.startsWith("+")
    ) {
        return false;
    }

    if (
        (
            trimmedValue.match(
                /\+/g,
            ) ?? []
        ).length > 1
    ) {
        return false;
    }

    const digitCount =
        trimmedValue.replace(
            /\D/g,
            "",
        ).length;

    return (
        digitCount >= 7 &&
        digitCount <= 15
    );
}

export function PublicSponsors() {
    const publicOrganisation =
        useOptionalPublicOrganisation();

    const [sponsors, setSponsors] =
        useState<PublicSponsor[]>([]);

    const [isLoading, setIsLoading] =
        useState(true);

    const [
        activeCompetitionId,
        setActiveCompetitionId,
    ] =
        useState<string | null>(
            null,
        );

    const [
        activeOrganisationId,
        setActiveOrganisationId,
    ] =
        useState<string | null>(
            publicOrganisation
                ?.organisationId ??
            null,
        );

    const [
        showEnquiryForm,
        setShowEnquiryForm,
    ] =
        useState(false);

    const [form, setForm] =
        useState<SponsorEnquiryForm>(
            initialEnquiryForm,
        );

    const [
        isSubmitting,
        setIsSubmitting,
    ] =
        useState(false);

    const [
        submissionMessage,
        setSubmissionMessage,
    ] =
        useState<string | null>(
            null,
        );

    const [
        submissionError,
        setSubmissionError,
    ] =
        useState<string | null>(
            null,
        );

    useEffect(() => {
        async function loadSponsors() {
            try {
                let resolvedOrganisationId =
                    publicOrganisation
                        ?.organisationId ??
                    null;

                if (!resolvedOrganisationId) {
                    const legacyOrganisationSlug =
                        (
                            import.meta.env
                                .VITE_PUBLIC_ORGANISATION_SLUG as
                                | string
                                | undefined
                        )?.trim() ||
                        "bhmff";

                    const {
                        data: legacyOrganisation,
                        error:
                            legacyOrganisationError,
                    } = await supabase
                        .from(
                            "organisations",
                        )
                        .select("id")
                        .eq(
                            "slug",
                            legacyOrganisationSlug,
                        )
                        .eq(
                            "public_site_enabled",
                            true,
                        )
                        .eq(
                            "status",
                            "active",
                        )
                        .maybeSingle();

                    if (
                        legacyOrganisationError
                    ) {
                        throw legacyOrganisationError;
                    }

                    resolvedOrganisationId =
                        legacyOrganisation?.id ??
                        null;
                }

                if (!resolvedOrganisationId) {
                    throw new Error(
                        "The BHMFF organisation could not be identified.",
                    );
                }

                const {
                    data: competition,
                    error:
                        competitionError,
                } = await supabase
                    .from(
                        "competitions",
                    )
                    .select(
                        "id, organisation_id",
                    )
                    .eq(
                        "organisation_id",
                        resolvedOrganisationId,
                    )
                    .eq(
                        "status",
                        "ACTIVE",
                    )
                    .eq(
                        "published",
                        true,
                    )
                    .order(
                        "start_date",
                        {
                            ascending:
                                false,
                            nullsFirst:
                                false,
                        },
                    )
                    .order(
                        "created_at",
                        {
                            ascending:
                                false,
                        },
                    )
                    .limit(1)
                    .maybeSingle();

                if (
                    competitionError
                ) {
                    throw competitionError;
                }

                if (!competition) {
                    setActiveCompetitionId(
                        null,
                    );
                    setActiveOrganisationId(
                        publicOrganisation
                            ?.organisationId ??
                        null,
                    );
                    setSponsors([]);
                    return;
                }

                setActiveCompetitionId(
                    competition.id,
                );

                setActiveOrganisationId(
                    competition.organisation_id,
                );

                const {
                    data,
                    error,
                } =
                    await supabase
                        .from(
                            "sponsors",
                        )
                        .select(
                            `
                                id,
                                name,
                                tier,
                                logo_url,
                                website_url,
                                description
                            `,
                        )
                        .eq(
                            "organisation_id",
                            competition
                                .organisation_id,
                        )
                        .eq(
                            "competition_id",
                            competition.id,
                        )
                        .eq(
                            "active",
                            true,
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    true,
                            },
                        );

                if (error) {
                    throw error;
                }

                setSponsors(
                    data ?? [],
                );
            } catch (error) {
                console.error(
                    "Failed to load public sponsors:",
                    error,
                );

                setSponsors([]);
            } finally {
                setIsLoading(
                    false,
                );
            }
        }

        void loadSponsors();
    }, [
        publicOrganisation
            ?.organisationId,
    ]);

    function updateForm<
        Key extends keyof SponsorEnquiryForm,
    >(
        key: Key,
        value: SponsorEnquiryForm[Key],
    ) {
        setForm(
            (current) => ({
                ...current,
                [key]: value,
            }),
        );
    }

    function openEnquiryForm() {
        setSubmissionMessage(
            null,
        );
        setSubmissionError(
            null,
        );
        setShowEnquiryForm(
            true,
        );
    }

    function closeEnquiryForm() {
        if (isSubmitting) {
            return;
        }

        setShowEnquiryForm(
            false,
        );
        setSubmissionMessage(
            null,
        );
        setSubmissionError(
            null,
        );
        setForm(
            initialEnquiryForm,
        );
    }

    function validateEnquiry() {
        if (
            !form.companyName.trim()
        ) {
            return "Organisation name is required.";
        }

        if (
            !form.contactName.trim()
        ) {
            return "Contact name is required.";
        }

        if (
            !form.email.trim()
        ) {
            return "Email address is required.";
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                form.email.trim(),
            )
        ) {
            return "Enter a valid email address.";
        }

        if (
            !isValidPhoneNumber(
                form.phone,
            )
        ) {
            return "Enter a valid phone number containing 7 to 15 digits.";
        }

        if (
            !form.message.trim()
        ) {
            return "Please enter a short message.";
        }

        if (
            !activeOrganisationId
        ) {
            return "The public organisation could not be identified.";
        }

        if (
            !activeCompetitionId
        ) {
            return "The active competition could not be identified.";
        }

        return null;
    }

    async function submitEnquiry(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        const validationError =
            validateEnquiry();

        if (validationError) {
            setSubmissionError(
                validationError,
            );
            setSubmissionMessage(
                null,
            );
            return;
        }

        if (
            !activeOrganisationId ||
            !activeCompetitionId
        ) {
            return;
        }

        setIsSubmitting(true);
        setSubmissionError(
            null,
        );
        setSubmissionMessage(
            null,
        );

        const { error } =
            await supabase
                .from(
                    "sponsor_enquiries",
                )
                .insert({
                    organisation_id:
                    activeOrganisationId,
                    competition_id:
                    activeCompetitionId,
                    company_name:
                        form.companyName.trim(),
                    contact_name:
                        form.contactName.trim(),
                    email:
                        form.email.trim(),
                    phone:
                        form.phone.trim() ||
                        null,
                    sponsorship_interest:
                        form.sponsorshipInterest.trim() ||
                        null,
                    estimated_budget:
                        form.estimatedBudget.trim() ||
                        null,
                    message:
                        form.message.trim(),
                    status: "new",
                });

        if (error) {
            console.error(
                "Failed to submit sponsorship enquiry:",
                error,
            );

            setSubmissionError(
                "Your enquiry could not be submitted. Please try again.",
            );

            setIsSubmitting(
                false,
            );
            return;
        }

        setSubmissionMessage(
            "Thank you. Your partnership enquiry has been received and a member of the festival team will contact you shortly.",
        );

        setForm(
            initialEnquiryForm,
        );
        setIsSubmitting(false);
    }

    if (isLoading) {
        return (
            <p className="text-sm font-semibold text-slate-400">
                Loading festival partners...
            </p>
        );
    }

    const inputClassName =
        "mt-2 w-full rounded-xl border border-lime-900/70 bg-[#071006] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-lime-400 disabled:cursor-not-allowed disabled:opacity-60";

    return (
        <>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {sponsors.map(
                    (sponsor) => (
                        <article
                            key={
                                sponsor.id
                            }
                            className="rounded-2xl border border-lime-900/50 bg-[#0b150a] p-5"
                        >
                            {sponsor.logo_url && (
                                <div className="grid min-h-32 place-items-center rounded-xl bg-white p-4">
                                    <img
                                        src={
                                            sponsor.logo_url
                                        }
                                        alt={`${sponsor.name} logo`}
                                        loading="lazy"
                                        className="max-h-24 max-w-full object-contain"
                                    />
                                </div>
                            )}

                            <span className="mt-4 inline-flex rounded-full border border-lime-800/60 bg-lime-400/10 px-3 py-1 text-xs font-bold text-lime-300">
                                {sponsor.tier ??
                                    "Festival Partner"}
                            </span>

                            <h3 className="mt-4 text-xl font-black text-white">
                                {
                                    sponsor.name
                                }
                            </h3>

                            {sponsor.description && (
                                <p className="mt-3 text-sm leading-6 text-slate-400">
                                    {
                                        sponsor.description
                                    }
                                </p>
                            )}

                            {sponsor.website_url && (
                                <a
                                    href={
                                        sponsor.website_url
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-5 inline-flex rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-white no-underline transition hover:border-lime-500 hover:text-lime-300"
                                >
                                    Visit Partner
                                </a>
                            )}
                        </article>
                    ),
                )}

                <article className="rounded-2xl border border-lime-700/50 bg-gradient-to-br from-lime-400/10 to-[#0b150a] p-6">
                    <Handshake
                        size={30}
                        className="text-lime-400"
                    />

                    <span className="mt-5 inline-flex rounded-full border border-lime-800/60 bg-lime-400/10 px-3 py-1 text-xs font-bold text-lime-300">
                        Partnership Opportunities
                    </span>

                    <h3 className="mt-4 text-2xl font-black text-white">
                        Become a Festival Partner
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-slate-400">
                        Support grassroots football,
                        community development and Black
                        History Month while promoting
                        your organisation to players,
                        families and the wider
                        community.
                    </p>

                    <button
                        type="button"
                        onClick={
                            openEnquiryForm
                        }
                        className="mt-6 rounded-xl bg-lime-400 px-5 py-3 font-black text-black transition hover:bg-lime-300"
                    >
                        Discuss Partnership
                    </button>
                </article>
            </div>

            {showEnquiryForm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
                    role="presentation"
                    onMouseDown={(
                        event,
                    ) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeEnquiryForm();
                        }
                    }}
                >
                    <section
                        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-lime-800/60 bg-[#071006] shadow-2xl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="sponsor-enquiry-title"
                    >
                        <header className="sticky top-0 z-10 flex flex-col gap-5 border-b border-lime-900/50 bg-[#071006]/95 p-6 backdrop-blur sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <img
                                    src="/assets/tournamenthq-logo.png"
                                    alt="TournamentHQ"
                                    className="mb-5 h-auto max-h-12 w-[190px] object-contain"
                                />

                                <p className="text-xs font-black uppercase tracking-[0.2em] text-lime-400">
                                    Festival Partnership
                                </p>

                                <h2
                                    id="sponsor-enquiry-title"
                                    className="mt-2 text-4xl font-black text-white"
                                >
                                    Discuss Sponsorship
                                </h2>

                                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                                    Tell us about your
                                    organisation and how
                                    you would like to
                                    support the festival.
                                </p>
                            </div>

                            <button
                                type="button"
                                disabled={
                                    isSubmitting
                                }
                                onClick={
                                    closeEnquiryForm
                                }
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-white transition hover:border-lime-500 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X
                                    size={17}
                                />
                                Close
                            </button>
                        </header>

                        <div className="p-6 sm:p-8">
                            {submissionMessage ? (
                                <div className="rounded-2xl border border-emerald-700/50 bg-emerald-500/10 p-8 text-center">
                                    <Handshake
                                        size={42}
                                        className="mx-auto text-emerald-300"
                                    />

                                    <h3 className="mt-4 text-2xl font-black text-white">
                                        Enquiry received
                                    </h3>

                                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-emerald-200">
                                        {
                                            submissionMessage
                                        }
                                    </p>

                                    <button
                                        type="button"
                                        onClick={
                                            closeEnquiryForm
                                        }
                                        className="mt-6 rounded-xl bg-lime-400 px-5 py-3 font-black text-black transition hover:bg-lime-300"
                                    >
                                        Close
                                    </button>
                                </div>
                            ) : (
                                <form
                                    onSubmit={
                                        submitEnquiry
                                    }
                                    className="space-y-6"
                                >
                                    {submissionError && (
                                        <p className="rounded-xl border border-red-800/60 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                                            {
                                                submissionError
                                            }
                                        </p>
                                    )}

                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <label className="block text-sm font-bold text-white">
                                            <span className="inline-flex items-center gap-2">
                                                <Building2
                                                    size={16}
                                                    className="text-lime-400"
                                                />
                                                Organisation
                                            </span>

                                            <input
                                                value={
                                                    form.companyName
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateForm(
                                                        "companyName",
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                placeholder="Organisation name"
                                                autoComplete="organization"
                                                disabled={
                                                    isSubmitting
                                                }
                                                className={
                                                    inputClassName
                                                }
                                            />
                                        </label>

                                        <label className="block text-sm font-bold text-white">
                                            Contact name

                                            <input
                                                value={
                                                    form.contactName
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateForm(
                                                        "contactName",
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                placeholder="Your name"
                                                autoComplete="name"
                                                disabled={
                                                    isSubmitting
                                                }
                                                className={
                                                    inputClassName
                                                }
                                            />
                                        </label>

                                        <label className="block text-sm font-bold text-white">
                                            <span className="inline-flex items-center gap-2">
                                                <Mail
                                                    size={16}
                                                    className="text-lime-400"
                                                />
                                                Email
                                            </span>

                                            <input
                                                type="email"
                                                value={
                                                    form.email
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateForm(
                                                        "email",
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                placeholder="name@organisation.com"
                                                autoComplete="email"
                                                disabled={
                                                    isSubmitting
                                                }
                                                className={
                                                    inputClassName
                                                }
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
                                                value={
                                                    form.phone
                                                }
                                                maxLength={
                                                    25
                                                }
                                                pattern="[0-9+() -]*"
                                                onChange={(
                                                    event,
                                                ) => {
                                                    const value =
                                                        event
                                                            .target
                                                            .value;

                                                    if (
                                                        /^[0-9+() -]*$/.test(
                                                            value,
                                                        )
                                                    ) {
                                                        updateForm(
                                                            "phone",
                                                            value,
                                                        );
                                                    }
                                                }}
                                                placeholder="e.g. 07951 750370"
                                                autoComplete="tel"
                                                disabled={
                                                    isSubmitting
                                                }
                                                className={
                                                    inputClassName
                                                }
                                            />
                                        </label>

                                        <label className="block text-sm font-bold text-white">
                                            Partnership interest

                                            <select
                                                value={
                                                    form.sponsorshipInterest
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateForm(
                                                        "sponsorshipInterest",
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                disabled={
                                                    isSubmitting
                                                }
                                                className={
                                                    inputClassName
                                                }
                                            >
                                                <option value="">
                                                    Select an option
                                                </option>
                                                <option value="Festival sponsorship">
                                                    Festival sponsorship
                                                </option>
                                                <option value="Match sponsorship">
                                                    Match sponsorship
                                                </option>
                                                <option value="Finals sponsorship">
                                                    Finals sponsorship
                                                </option>
                                                <option value="Health and welfare partnership">
                                                    Health and welfare partnership
                                                </option>
                                                <option value="Media and livestream sponsorship">
                                                    Media and livestream sponsorship
                                                </option>
                                                <option value="Community partnership">
                                                    Community partnership
                                                </option>
                                                <option value="Open to discussion">
                                                    Open to discussion
                                                </option>
                                            </select>
                                        </label>

                                        <label className="block text-sm font-bold text-white">
                                            Estimated budget

                                            <select
                                                value={
                                                    form.estimatedBudget
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateForm(
                                                        "estimatedBudget",
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                disabled={
                                                    isSubmitting
                                                }
                                                className={
                                                    inputClassName
                                                }
                                            >
                                                <option value="">
                                                    Select an option
                                                </option>
                                                <option value="Under £1,000">
                                                    Under £1,000
                                                </option>
                                                <option value="£1,000 - £2,500">
                                                    £1,000 - £2,500
                                                </option>
                                                <option value="£2,500 - £5,000">
                                                    £2,500 - £5,000
                                                </option>
                                                <option value="£5,000 - £10,000">
                                                    £5,000 - £10,000
                                                </option>
                                                <option value="Over £10,000">
                                                    Over £10,000
                                                </option>
                                                <option value="Open to discussion">
                                                    Open to discussion
                                                </option>
                                            </select>
                                        </label>

                                        <label className="block text-sm font-bold text-white sm:col-span-2">
                                            Message

                                            <textarea
                                                value={
                                                    form.message
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateForm(
                                                        "message",
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                placeholder="Tell us how your organisation would like to support the festival."
                                                rows={6}
                                                disabled={
                                                    isSubmitting
                                                }
                                                className={`${inputClassName} resize-y`}
                                            />
                                        </label>
                                    </div>

                                    <div className="flex flex-wrap gap-3 border-t border-lime-900/50 pt-6">
                                        <button
                                            type="submit"
                                            disabled={
                                                isSubmitting
                                            }
                                            className="rounded-xl bg-lime-400 px-5 py-3 font-black text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {isSubmitting
                                                ? "Submitting..."
                                                : "Send Enquiry"}
                                        </button>

                                        <button
                                            type="button"
                                            disabled={
                                                isSubmitting
                                            }
                                            onClick={
                                                closeEnquiryForm
                                            }
                                            className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-white transition hover:border-lime-500 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </>
    );
}