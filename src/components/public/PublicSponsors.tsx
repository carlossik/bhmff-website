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

type SponsorshipContent = {
    loadingLabel: string;
    defaultTierLabel: string;
    opportunityLabel: string;
    callToActionTitle: string;
    callToActionDescription: string;
    callToActionButton: string;
    modalEyebrow: string;
    modalTitle: string;
    modalDescription: string;
    successMessage: string;
    primaryInterestValue: string;
    primaryInterestLabel: string;
    messagePlaceholder: string;
};

const BHMFF_SPONSORSHIP_CONTENT: SponsorshipContent = {
    loadingLabel: "Loading festival partners...",
    defaultTierLabel: "Festival Partner",
    opportunityLabel: "Partnership Opportunities",
    callToActionTitle: "Become a Festival Partner",
    callToActionDescription:
        "Support grassroots football, community development and Black History Month while promoting your organisation to players, families and the wider community.",
    callToActionButton: "Discuss Partnership",
    modalEyebrow: "Festival Partnership",
    modalTitle: "Discuss Sponsorship",
    modalDescription:
        "Tell us about your organisation and how you would like to support the festival.",
    successMessage:
        "Thank you. Your partnership enquiry has been received and a member of the festival team will contact you shortly.",
    primaryInterestValue: "Festival sponsorship",
    primaryInterestLabel: "Festival sponsorship",
    messagePlaceholder:
        "Tell us how your organisation would like to support the festival.",
};

const GENERIC_SPONSORSHIP_CONTENT: SponsorshipContent = {
    loadingLabel: "Loading competition sponsors...",
    defaultTierLabel: "Competition Sponsor",
    opportunityLabel: "Sponsorship Opportunities",
    callToActionTitle: "Become a Competition Sponsor",
    callToActionDescription:
        "Support this competition while promoting your organisation to players, coaches, officials and supporters. Sponsorship opportunities are available for organisations looking to increase their visibility and support grassroots sport.",
    callToActionButton: "Discuss Sponsorship",
    modalEyebrow: "Competition Sponsorship",
    modalTitle: "Discuss Sponsorship",
    modalDescription:
        "Tell us about your organisation and how you would like to support this competition.",
    successMessage:
        "Thank you. Your sponsorship enquiry has been received and a member of the competition team will contact you shortly.",
    primaryInterestValue: "Competition sponsorship",
    primaryInterestLabel: "Competition sponsorship",
    messagePlaceholder:
        "Tell us how your organisation would like to support this competition.",
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


function getSponsorLogoUrl(
    sponsor: PublicSponsor,
) {
    if (
        sponsor.logo_url?.trim()
    ) {
        return sponsor.logo_url.trim();
    }

    const normalisedName =
        sponsor.name
            .trim()
            .toLowerCase();

    if (
        normalisedName.includes(
            "ckefa software",
        )
    ) {
        return "/assets/ckefa-software-logo.png";
    }

    if (
        normalisedName.includes(
            "ckefa media",
        )
    ) {
        return "/assets/ckefa-media-logo.jpg";
    }

    if (
        normalisedName.includes(
            "fcfs",
        )
    ) {
        return "/assets/fcfs-logo.png";
    }

    if (
        normalisedName.includes(
            "tournamenthq",
        ) ||
        normalisedName.includes(
            "tournament hq",
        )
    ) {
        return "/assets/tournamenthq-logo.png";
    }

    return "";
}

function getSponsorLogoImageClass(
    sponsor: PublicSponsor,
) {
    const normalisedName =
        sponsor.name
            .trim()
            .toLowerCase();

    if (
        normalisedName.includes(
            "ckefa media",
        )
    ) {
        return "h-full w-full scale-[1.7] object-cover";
    }

    if (
        normalisedName.includes(
            "ckefa software",
        )
    ) {
        return "h-full w-full scale-[1.32] object-cover";
    }

    return "max-h-24 max-w-full object-contain";
}

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

export type PublicSponsorsProps = {
    surfaceColour: string
    textColour: string
    accentColour: string
    accentTextColour?: string
}

export function PublicSponsors({
                                   surfaceColour,
                                   textColour,
                                   accentColour,
                                   accentTextColour = '#ffffff',
                               }: PublicSponsorsProps) {
    const publicOrganisation =
        useOptionalPublicOrganisation();

    const configuredOrganisationSlug =
        (
            import.meta.env
                .VITE_PUBLIC_ORGANISATION_SLUG as
                | string
                | undefined
        )
            ?.trim()
            .toLowerCase() ??
        "";

    const organisationSlug =
        publicOrganisation
            ?.organisationSlug
            .trim()
            .toLowerCase() ||
        configuredOrganisationSlug ||
        "bhmff";

    const sponsorshipContent: SponsorshipContent =
        organisationSlug === "bhmff"
            ? BHMFF_SPONSORSHIP_CONTENT
            : GENERIC_SPONSORSHIP_CONTENT;

    const [sponsors, setSponsors] =
        useState<PublicSponsor[]>([]);

    const [
        expandedSponsorIds,
        setExpandedSponsorIds,
    ] = useState<Set<string>>(
        new Set(),
    );

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

    function toggleSponsorDescription(
        sponsorId: string,
    ) {
        setExpandedSponsorIds(
            (current) => {
                const next =
                    new Set(current);

                if (next.has(sponsorId)) {
                    next.delete(sponsorId);
                } else {
                    next.add(sponsorId);
                }

                return next;
            },
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
            sponsorshipContent.successMessage,
        );

        setForm(
            initialEnquiryForm,
        );
        setIsSubmitting(false);
    }

    if (isLoading) {
        return (
            <p className="text-sm font-semibold text-slate-400">
                {sponsorshipContent.loadingLabel}
            </p>
        );
    }

    const inputClassName =
        "mt-2 w-full rounded-xl border border-lime-900/70 bg-[#071006] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-lime-400 disabled:cursor-not-allowed disabled:opacity-60";

    return (
        <>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {sponsors.map(
                    (sponsor) => {
                        const sponsorLogoUrl =
                            getSponsorLogoUrl(
                                sponsor,
                            );

                        return (
                            <article
                                key={
                                    sponsor.id
                                }
                                className="rounded-2xl border p-5 shadow-sm"
                                style={{
                                    backgroundColor: surfaceColour,
                                    borderColor: `${accentColour}30`,
                                    color: textColour,
                                }}
                            >
                                {sponsorLogoUrl && (
                                    <div className="grid h-36 overflow-hidden rounded-xl bg-black">
                                        <img
                                            src={
                                                sponsorLogoUrl
                                            }
                                            alt={`${sponsor.name} logo`}
                                            loading="lazy"
                                            className={getSponsorLogoImageClass(
                                                sponsor,
                                            )}
                                        />
                                    </div>
                                )}

                                <span className="mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-bold"
                                      style={{
                                          backgroundColor: `${accentColour}18`,
                                          borderColor: `${accentColour}35`,
                                          color: accentColour,
                                      }}>
                                {sponsor.tier ??
                                    sponsorshipContent.defaultTierLabel}
                            </span>

                                <h3 className="mt-4 text-xl font-black">
                                    {
                                        sponsor.name
                                    }
                                </h3>

                                {sponsor.description && (
                                    <div className="mt-3">
                                        <p
                                            className={`text-sm leading-6 opacity-75 ${
                                                expandedSponsorIds.has(
                                                    sponsor.id,
                                                )
                                                    ? ""
                                                    : "line-clamp-4"
                                            }`}
                                        >
                                            {
                                                sponsor.description
                                            }
                                        </p>

                                        {sponsor.description.length >
                                            180 && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        toggleSponsorDescription(
                                                            sponsor.id,
                                                        )
                                                    }
                                                    className="mt-3 text-sm font-black transition-opacity hover:opacity-75" style={{ color: accentColour }}
                                                >
                                                    {expandedSponsorIds.has(
                                                        sponsor.id,
                                                    )
                                                        ? "Show less"
                                                        : "Read more"}
                                                </button>
                                            )}
                                    </div>
                                )}

                                {sponsor.website_url && (
                                    <a
                                        href={
                                            sponsor.website_url
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-5 inline-flex rounded-xl border px-4 py-2 text-sm font-bold no-underline transition-opacity hover:opacity-75"
                                        style={{
                                            borderColor: `${accentColour}40`,
                                            color: accentColour,
                                        }}
                                    >
                                        Visit Partner
                                    </a>
                                )}
                            </article>
                        );
                    },
                )}

                <article
                    className="rounded-2xl border p-6 shadow-sm"
                    style={{
                        background: `linear-gradient(135deg, ${accentColour}16, ${surfaceColour})`,
                        borderColor: `${accentColour}40`,
                        color: textColour,
                    }}
                >
                    <Handshake
                        size={30}
                        style={{ color: accentColour }}
                    />

                    <span className="mt-5 inline-flex rounded-full border px-3 py-1 text-xs font-bold"
                          style={{
                              backgroundColor: `${accentColour}18`,
                              borderColor: `${accentColour}35`,
                              color: accentColour,
                          }}>
                        {sponsorshipContent.opportunityLabel}
                    </span>

                    <h3 className="mt-4 text-2xl font-black">
                        {sponsorshipContent.callToActionTitle}
                    </h3>

                    <p className="mt-3 text-sm leading-6 opacity-75">
                        {sponsorshipContent.callToActionDescription}
                    </p>

                    <button
                        type="button"
                        onClick={
                            openEnquiryForm
                        }
                        className="mt-6 rounded-xl px-5 py-3 font-black transition-opacity hover:opacity-90"
                        style={{
                            backgroundColor: accentColour,
                            color: accentTextColour,
                        }}
                    >
                        {sponsorshipContent.callToActionButton}
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
                                    {sponsorshipContent.modalEyebrow}
                                </p>

                                <h2
                                    id="sponsor-enquiry-title"
                                    className="mt-2 text-4xl font-black text-white"
                                >
                                    {sponsorshipContent.modalTitle}
                                </h2>

                                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                                    {sponsorshipContent.modalDescription}
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
                                                <option
                                                    value={
                                                        sponsorshipContent.primaryInterestValue
                                                    }
                                                >
                                                    {
                                                        sponsorshipContent.primaryInterestLabel
                                                    }
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
                                                placeholder={
                                                    sponsorshipContent.messagePlaceholder
                                                }
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