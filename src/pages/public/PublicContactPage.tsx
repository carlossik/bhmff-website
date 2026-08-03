import {
    FormEvent,
    useMemo,
    useState,
} from "react";

import { supabase } from "../../lib/supabaseClient";
import type { Competition } from "../../types/competitionTypes";

type PublicContactPageProps = {
    organisationId: string;
    organisationName: string;
    competitions?: Competition[];
    backgroundColour: string;
    surfaceColour: string;
    textColour: string;
    accentColour: string;
    accentTextColour: string;
    basePath: string;
};

type EnquiryMode =
    | "sponsorship"
    | "demo";

type SponsorshipFormState = {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    sponsorshipInterest: string;
    estimatedBudget: string;
    competitionId: string;
    message: string;
};

type DemoFormState = {
    organisation: string;
    contactName: string;
    email: string;
    phone: string;
    competitionType: string;
    numberOfTeams: string;
    message: string;
};

const initialSponsorshipForm: SponsorshipFormState = {
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    sponsorshipInterest: "",
    estimatedBudget: "",
    competitionId: "",
    message: "",
};

const initialDemoForm: DemoFormState = {
    organisation: "",
    contactName: "",
    email: "",
    phone: "",
    competitionType: "",
    numberOfTeams: "",
    message: "",
};

function getCompetitionName(
    competition: Competition,
) {
    const record =
        competition as Competition &
            Record<string, unknown>;

    const candidate =
        record.name ??
        record.title;

    return typeof candidate === "string" &&
    candidate.trim()
        ? candidate.trim()
        : "Competition";
}

function validateEmail(
    value: string,
) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        value.trim(),
    );
}

export function PublicContactPage({
                                      organisationId,
                                      organisationName,
                                      competitions = [],
                                      backgroundColour,
                                      surfaceColour,
                                      textColour,
                                      accentColour,
                                      accentTextColour,
                                      basePath,
                                  }: PublicContactPageProps) {
    const [
        enquiryMode,
        setEnquiryMode,
    ] =
        useState<EnquiryMode>(
            "sponsorship",
        );

    const [
        sponsorshipForm,
        setSponsorshipForm,
    ] =
        useState<SponsorshipFormState>(
            initialSponsorshipForm,
        );

    const [demoForm, setDemoForm] =
        useState<DemoFormState>(
            initialDemoForm,
        );

    const [submitting, setSubmitting] =
        useState(false);

    const [successMessage, setSuccessMessage] =
        useState("");

    const [errorMessage, setErrorMessage] =
        useState("");

    const publishedCompetitions =
        useMemo(
            () =>
                competitions.filter(
                    (competition) =>
                        Boolean(
                            competition.id,
                        ),
                ),
            [competitions],
        );

    const pageWidth =
        "min(1180px, calc(100% - 2rem))";

    function clearMessages() {
        setSuccessMessage("");
        setErrorMessage("");
    }

    function changeMode(
        mode: EnquiryMode,
    ) {
        setEnquiryMode(mode);
        clearMessages();
    }

    async function submitSponsorshipEnquiry(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        clearMessages();

        if (
            !sponsorshipForm.companyName.trim() ||
            !sponsorshipForm.contactName.trim() ||
            !sponsorshipForm.email.trim() ||
            !sponsorshipForm.message.trim()
        ) {
            setErrorMessage(
                "Company name, contact name, email and message are required.",
            );
            return;
        }

        if (
            !validateEmail(
                sponsorshipForm.email,
            )
        ) {
            setErrorMessage(
                "Enter a valid email address.",
            );
            return;
        }

        setSubmitting(true);

        try {
            const { error } =
                await supabase
                    .from(
                        "sponsor_enquiries",
                    )
                    .insert({
                        organisation_id:
                        organisationId,
                        competition_id:
                            sponsorshipForm
                                .competitionId ||
                            null,
                        company_name:
                            sponsorshipForm
                                .companyName
                                .trim(),
                        contact_name:
                            sponsorshipForm
                                .contactName
                                .trim(),
                        email:
                            sponsorshipForm
                                .email
                                .trim()
                                .toLowerCase(),
                        phone:
                            sponsorshipForm
                                .phone
                                .trim() ||
                            null,
                        sponsorship_interest:
                            sponsorshipForm
                                .sponsorshipInterest
                                .trim() ||
                            null,
                        estimated_budget:
                            sponsorshipForm
                                .estimatedBudget
                                .trim() ||
                            null,
                        message:
                            sponsorshipForm
                                .message
                                .trim(),
                        status: "new",
                        internal_notes:
                            null,
                    });

            if (error) {
                console.error(
                    "Failed to submit sponsorship enquiry:",
                    error,
                );

                setErrorMessage(
                    error.message ||
                    "Your enquiry could not be submitted.",
                );
                return;
            }

            setSponsorshipForm(
                initialSponsorshipForm,
            );

            setSuccessMessage(
                `Thank you. Your sponsorship enquiry has been sent to ${organisationName}.`,
            );
        } catch (error) {
            console.error(
                "Unexpected sponsorship enquiry error:",
                error,
            );

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Your enquiry could not be submitted.",
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function submitDemoRequest(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        clearMessages();

        if (
            !demoForm.organisation.trim() ||
            !demoForm.contactName.trim() ||
            !demoForm.email.trim() ||
            !demoForm.message.trim()
        ) {
            setErrorMessage(
                "Organisation, contact name, email and message are required.",
            );
            return;
        }

        if (
            !validateEmail(
                demoForm.email,
            )
        ) {
            setErrorMessage(
                "Enter a valid email address.",
            );
            return;
        }

        const numberOfTeams =
            demoForm.numberOfTeams.trim()
                ? Number(
                    demoForm.numberOfTeams,
                )
                : null;

        if (
            numberOfTeams !== null &&
            (!Number.isInteger(
                    numberOfTeams,
                ) ||
                numberOfTeams < 1)
        ) {
            setErrorMessage(
                "Number of teams must be a whole number greater than zero.",
            );
            return;
        }

        setSubmitting(true);

        try {
            const { error } =
                await supabase
                    .from(
                        "demo_requests",
                    )
                    .insert({
                        organisation_id:
                        organisationId,
                        organisation:
                            demoForm
                                .organisation
                                .trim(),
                        contact_name:
                            demoForm
                                .contactName
                                .trim(),
                        email:
                            demoForm
                                .email
                                .trim()
                                .toLowerCase(),
                        phone:
                            demoForm
                                .phone
                                .trim() ||
                            null,
                        competition_type:
                            demoForm
                                .competitionType
                                .trim() ||
                            "not_specified",
                        number_of_teams:
                        numberOfTeams,
                        message:
                            demoForm
                                .message
                                .trim(),
                        status: "new",
                        internal_notes:
                            null,
                    });

            if (error) {
                console.error(
                    "Failed to submit demo request:",
                    error,
                );

                setErrorMessage(
                    error.message ||
                    "Your demo request could not be submitted.",
                );
                return;
            }

            setDemoForm(
                initialDemoForm,
            );

            setSuccessMessage(
                "Thank you. Your TournamentHQ demo request has been submitted.",
            );
        } catch (error) {
            console.error(
                "Unexpected demo request error:",
                error,
            );

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Your demo request could not be submitted.",
            );
        } finally {
            setSubmitting(false);
        }
    }

    const inputClassName =
        "mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none transition placeholder:text-slate-500 focus:border-current disabled:cursor-not-allowed disabled:opacity-60";

    return (
        <div
            className="min-h-screen"
            style={{
                background:
                backgroundColour,
                color: textColour,
            }}
        >
            <section
                className="border-b py-16"
                style={{
                    borderColor:
                        `${accentColour}30`,
                    background: `radial-gradient(circle at 75% 20%, ${accentColour}1f, transparent 35%), ${backgroundColour}`,
                }}
            >
                <div
                    className="mx-auto"
                    style={{
                        width: pageWidth,
                    }}
                >
                    <p
                        className="text-xs font-black uppercase tracking-[0.2em]"
                        style={{
                            color: accentColour,
                        }}
                    >
                        Contact & Partnerships
                    </p>

                    <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
                        Connect with{" "}
                        {organisationName}
                    </h1>

                    <p className="mt-5 max-w-3xl text-base leading-7 opacity-75 sm:text-lg">
                        Discuss sponsorship,
                        partnership opportunities,
                        competition participation or
                        arrange a demonstration of the
                        TournamentHQ platform.
                    </p>
                </div>
            </section>

            <section className="py-12">
                <div
                    className="mx-auto grid gap-8 lg:grid-cols-[0.8fr_1.4fr]"
                    style={{
                        width: pageWidth,
                    }}
                >
                    <aside
                        className="rounded-2xl border p-6"
                        style={{
                            background:
                            surfaceColour,
                            borderColor:
                                `${accentColour}35`,
                        }}
                    >
                        <p
                            className="text-xs font-black uppercase tracking-[0.18em]"
                            style={{
                                color:
                                accentColour,
                            }}
                        >
                            How can we help?
                        </p>

                        <h2 className="mt-2 text-2xl font-black">
                            Choose an enquiry type
                        </h2>

                        <div className="mt-6 space-y-3">
                            <button
                                type="button"
                                onClick={() =>
                                    changeMode(
                                        "sponsorship",
                                    )
                                }
                                className="w-full rounded-xl border p-4 text-left transition"
                                style={{
                                    borderColor:
                                        enquiryMode ===
                                        "sponsorship"
                                            ? accentColour
                                            : `${accentColour}25`,
                                    background:
                                        enquiryMode ===
                                        "sponsorship"
                                            ? `${accentColour}16`
                                            : "transparent",
                                }}
                            >
                                <strong className="block">
                                    Sponsorship Enquiry
                                </strong>

                                <span className="mt-1 block text-sm opacity-70">
                                    Support the competition,
                                    teams and community.
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    changeMode(
                                        "demo",
                                    )
                                }
                                className="w-full rounded-xl border p-4 text-left transition"
                                style={{
                                    borderColor:
                                        enquiryMode ===
                                        "demo"
                                            ? accentColour
                                            : `${accentColour}25`,
                                    background:
                                        enquiryMode ===
                                        "demo"
                                            ? `${accentColour}16`
                                            : "transparent",
                                }}
                            >
                                <strong className="block">
                                    TournamentHQ Demo
                                </strong>

                                <span className="mt-1 block text-sm opacity-70">
                                    Explore the platform for
                                    your own competitions.
                                </span>
                            </button>
                        </div>

                        <div
                            className="mt-8 rounded-xl border p-4"
                            style={{
                                borderColor:
                                    `${accentColour}25`,
                                background:
                                    `${backgroundColour}80`,
                            }}
                        >
                            <h3 className="font-black">
                                Competition website
                            </h3>

                            <p className="mt-2 text-sm leading-6 opacity-70">
                                Return to the public
                                competition centre for
                                fixtures, teams, results,
                                news and sponsors.
                            </p>

                            <a
                                href={basePath}
                                className="mt-4 inline-flex rounded-lg px-4 py-2 text-sm font-black"
                                style={{
                                    background:
                                    accentColour,
                                    color:
                                    accentTextColour,
                                    textDecoration:
                                        "none",
                                }}
                            >
                                Back to Home
                            </a>
                        </div>
                    </aside>

                    <main
                        className="rounded-2xl border p-6 sm:p-8"
                        style={{
                            background:
                            surfaceColour,
                            borderColor:
                                `${accentColour}35`,
                        }}
                    >
                        {successMessage && (
                            <p className="mb-6 rounded-xl border border-emerald-600/50 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300">
                                {
                                    successMessage
                                }
                            </p>
                        )}

                        {errorMessage && (
                            <p className="mb-6 rounded-xl border border-red-700/50 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
                                {
                                    errorMessage
                                }
                            </p>
                        )}

                        {enquiryMode ===
                        "sponsorship" ? (
                            <form
                                onSubmit={
                                    submitSponsorshipEnquiry
                                }
                                className="space-y-6"
                            >
                                <div>
                                    <p
                                        className="text-xs font-black uppercase tracking-[0.18em]"
                                        style={{
                                            color:
                                            accentColour,
                                        }}
                                    >
                                        Partnership
                                        Opportunities
                                    </p>

                                    <h2 className="mt-2 text-3xl font-black">
                                        Become a Sponsor
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 opacity-70">
                                        Tell the organiser
                                        how your organisation
                                        would like to support
                                        the competition.
                                    </p>
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <label className="block text-sm font-bold">
                                        Company or Organisation
                                        <input
                                            type="text"
                                            required
                                            disabled={
                                                submitting
                                            }
                                            value={
                                                sponsorshipForm.companyName
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setSponsorshipForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,
                                                        companyName:
                                                        event
                                                            .target
                                                            .value,
                                                    }),
                                                )
                                            }
                                            className={
                                                inputClassName
                                            }
                                            style={{
                                                color:
                                                textColour,
                                            }}
                                        />
                                    </label>

                                    <label className="block text-sm font-bold">
                                        Contact Name
                                        <input
                                            type="text"
                                            required
                                            disabled={
                                                submitting
                                            }
                                            value={
                                                sponsorshipForm.contactName
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setSponsorshipForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,
                                                        contactName:
                                                        event
                                                            .target
                                                            .value,
                                                    }),
                                                )
                                            }
                                            className={
                                                inputClassName
                                            }
                                            style={{
                                                color:
                                                textColour,
                                            }}
                                        />
                                    </label>

                                    <label className="block text-sm font-bold">
                                        Email
                                        <input
                                            type="email"
                                            required
                                            disabled={
                                                submitting
                                            }
                                            value={
                                                sponsorshipForm.email
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setSponsorshipForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,
                                                        email:
                                                        event
                                                            .target
                                                            .value,
                                                    }),
                                                )
                                            }
                                            className={
                                                inputClassName
                                            }
                                            style={{
                                                color:
                                                textColour,
                                            }}
                                        />
                                    </label>

                                    <label className="block text-sm font-bold">
                                        Phone
                                        <input
                                            type="tel"
                                            disabled={
                                                submitting
                                            }
                                            value={
                                                sponsorshipForm.phone
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setSponsorshipForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,
                                                        phone:
                                                        event
                                                            .target
                                                            .value,
                                                    }),
                                                )
                                            }
                                            className={
                                                inputClassName
                                            }
                                            style={{
                                                color:
                                                textColour,
                                            }}
                                        />
                                    </label>

                                    <label className="block text-sm font-bold">
                                        Sponsorship Interest
                                        <select
                                            disabled={
                                                submitting
                                            }
                                            value={
                                                sponsorshipForm.sponsorshipInterest
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setSponsorshipForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,
                                                        sponsorshipInterest:
                                                        event
                                                            .target
                                                            .value,
                                                    }),
                                                )
                                            }
                                            className={
                                                inputClassName
                                            }
                                            style={{
                                                color:
                                                textColour,
                                            }}
                                        >
                                            <option value="">
                                                Select an option
                                            </option>
                                            <option value="headline_sponsor">
                                                Headline Sponsor
                                            </option>
                                            <option value="competition_sponsor">
                                                Competition Sponsor
                                            </option>
                                            <option value="team_sponsor">
                                                Team Sponsor
                                            </option>
                                            <option value="media_partner">
                                                Media Partner
                                            </option>
                                            <option value="community_partner">
                                                Community Partner
                                            </option>
                                            <option value="other">
                                                Other
                                            </option>
                                        </select>
                                    </label>

                                    <label className="block text-sm font-bold">
                                        Estimated Budget
                                        <select
                                            disabled={
                                                submitting
                                            }
                                            value={
                                                sponsorshipForm.estimatedBudget
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setSponsorshipForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,
                                                        estimatedBudget:
                                                        event
                                                            .target
                                                            .value,
                                                    }),
                                                )
                                            }
                                            className={
                                                inputClassName
                                            }
                                            style={{
                                                color:
                                                textColour,
                                            }}
                                        >
                                            <option value="">
                                                Prefer not to say
                                            </option>
                                            <option value="under_500">
                                                Under £500
                                            </option>
                                            <option value="500_1000">
                                                £500–£1,000
                                            </option>
                                            <option value="1000_2500">
                                                £1,000–£2,500
                                            </option>
                                            <option value="2500_5000">
                                                £2,500–£5,000
                                            </option>
                                            <option value="over_5000">
                                                Over £5,000
                                            </option>
                                        </select>
                                    </label>

                                    <label className="block text-sm font-bold sm:col-span-2">
                                        Competition
                                        <select
                                            disabled={
                                                submitting
                                            }
                                            value={
                                                sponsorshipForm.competitionId
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setSponsorshipForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,
                                                        competitionId:
                                                        event
                                                            .target
                                                            .value,
                                                    }),
                                                )
                                            }
                                            className={
                                                inputClassName
                                            }
                                            style={{
                                                color:
                                                textColour,
                                            }}
                                        >
                                            <option value="">
                                                General organisation sponsorship
                                            </option>

                                            {publishedCompetitions.map(
                                                (
                                                    competition,
                                                ) => (
                                                    <option
                                                        key={
                                                            competition.id
                                                        }
                                                        value={
                                                            competition.id
                                                        }
                                                    >
                                                        {getCompetitionName(
                                                            competition,
                                                        )}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </label>

                                    <label className="block text-sm font-bold sm:col-span-2">
                                        Message
                                        <textarea
                                            required
                                            rows={7}
                                            disabled={
                                                submitting
                                            }
                                            value={
                                                sponsorshipForm.message
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setSponsorshipForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,
                                                        message:
                                                        event
                                                            .target
                                                            .value,
                                                    }),
                                                )
                                            }
                                            placeholder="Tell us about your organisation, objectives and preferred partnership."
                                            className={`${inputClassName} resize-y`}
                                            style={{
                                                color:
                                                textColour,
                                            }}
                                        />
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={
                                        submitting
                                    }
                                    className="rounded-xl px-6 py-3 font-black transition disabled:cursor-not-allowed disabled:opacity-60"
                                    style={{
                                        background:
                                        accentColour,
                                        color:
                                        accentTextColour,
                                    }}
                                >
                                    {submitting
                                        ? "Submitting..."
                                        : "Submit Sponsorship Enquiry"}
                                </button>
                            </form>
                        ) : (
                            <form
                                onSubmit={
                                    submitDemoRequest
                                }
                                className="space-y-6"
                            >
                                <div>
                                    <p
                                        className="text-xs font-black uppercase tracking-[0.18em]"
                                        style={{
                                            color:
                                            accentColour,
                                        }}
                                    >
                                        Platform Enquiry
                                    </p>

                                    <h2 className="mt-2 text-3xl font-black">
                                        Request a TournamentHQ Demo
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 opacity-70">
                                        Tell us about the
                                        competitions you
                                        manage and what you
                                        want to improve.
                                    </p>
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <label className="block text-sm font-bold">
                                        Organisation
                                        <input
                                            type="text"
                                            required
                                            disabled={
                                                submitting
                                            }
                                            value={
                                                demoForm.organisation
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setDemoForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,
                                                        organisation:
                                                        event
                                                            .target
                                                            .value,
                                                    }),
                                                )
                                            }
                                            className={
                                                inputClassName
                                            }
                                            style={{
                                                color:
                                                textColour,
                                            }}
                                        />
                                    </label>

                                    <label className="block text-sm font-bold">
                                        Contact Name
                                        <input
                                            type="text"
                                            required
                                            disabled={
                                                submitting
                                            }
                                            value={
                                                demoForm.contactName
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setDemoForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,
                                                        contactName:
                                                        event
                                                            .target
                                                            .value,
                                                    }),
                                                )
                                            }
                                            className={
                                                inputClassName
                                            }
                                            style={{
                                                color:
                                                textColour,
                                            }}
                                        />
                                    </label>

                                    <label className="block text-sm font-bold">
                                        Email
                                        <input
                                            type="email"
                                            required
                                            disabled={
                                                submitting
                                            }
                                            value={
                                                demoForm.email
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setDemoForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,
                                                        email:
                                                        event
                                                            .target
                                                            .value,
                                                    }),
                                                )
                                            }
                                            className={
                                                inputClassName
                                            }
                                            style={{
                                                color:
                                                textColour,
                                            }}
                                        />
                                    </label>

                                    <label className="block text-sm font-bold">
                                        Phone
                                        <input
                                            type="tel"
                                            disabled={
                                                submitting
                                            }
                                            value={
                                                demoForm.phone
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setDemoForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,
                                                        phone:
                                                        event
                                                            .target
                                                            .value,
                                                    }),
                                                )
                                            }
                                            className={
                                                inputClassName
                                            }
                                            style={{
                                                color:
                                                textColour,
                                            }}
                                        />
                                    </label>

                                    <label className="block text-sm font-bold">
                                        Competition Type
                                        <select
                                            disabled={
                                                submitting
                                            }
                                            value={
                                                demoForm.competitionType
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setDemoForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,
                                                        competitionType:
                                                        event
                                                            .target
                                                            .value,
                                                    }),
                                                )
                                            }
                                            className={
                                                inputClassName
                                            }
                                            style={{
                                                color:
                                                textColour,
                                            }}
                                        >
                                            <option value="">
                                                Select type
                                            </option>
                                            <option value="league">
                                                League
                                            </option>
                                            <option value="tournament">
                                                Tournament
                                            </option>
                                            <option value="festival">
                                                Festival
                                            </option>
                                            <option value="cup">
                                                Cup
                                            </option>
                                            <option value="multi_sport">
                                                Multi-sport
                                            </option>
                                            <option value="other">
                                                Other
                                            </option>
                                        </select>
                                    </label>

                                    <label className="block text-sm font-bold">
                                        Approximate Teams
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            disabled={
                                                submitting
                                            }
                                            value={
                                                demoForm.numberOfTeams
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setDemoForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,
                                                        numberOfTeams:
                                                        event
                                                            .target
                                                            .value,
                                                    }),
                                                )
                                            }
                                            className={
                                                inputClassName
                                            }
                                            style={{
                                                color:
                                                textColour,
                                            }}
                                        />
                                    </label>

                                    <label className="block text-sm font-bold sm:col-span-2">
                                        Message
                                        <textarea
                                            required
                                            rows={7}
                                            disabled={
                                                submitting
                                            }
                                            value={
                                                demoForm.message
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setDemoForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,
                                                        message:
                                                        event
                                                            .target
                                                            .value,
                                                    }),
                                                )
                                            }
                                            placeholder="Describe your current process, competition format and what you would like TournamentHQ to improve."
                                            className={`${inputClassName} resize-y`}
                                            style={{
                                                color:
                                                textColour,
                                            }}
                                        />
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={
                                        submitting
                                    }
                                    className="rounded-xl px-6 py-3 font-black transition disabled:cursor-not-allowed disabled:opacity-60"
                                    style={{
                                        background:
                                        accentColour,
                                        color:
                                        accentTextColour,
                                    }}
                                >
                                    {submitting
                                        ? "Submitting..."
                                        : "Request Demo"}
                                </button>
                            </form>
                        )}
                    </main>
                </div>
            </section>
        </div>
    );
}