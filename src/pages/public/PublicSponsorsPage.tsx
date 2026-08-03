import {
    ExternalLink,
    Handshake,
    Megaphone,
    ShieldCheck,
    Sparkles,
    Users,
} from "lucide-react";

import type {
    PublicSponsor,
} from "../../services/public/organisationPublicService";

type PublicSponsorsPageProps = {
    organisationName: string;
    sponsors?: PublicSponsor[];
    backgroundColour: string;
    surfaceColour: string;
    textColour: string;
    accentColour: string;
    accentTextColour: string;
    basePath: string;
};

type SponsorGroup = {
    label: string;
    sponsors: PublicSponsor[];
};

function normaliseTier(
    value: string | null | undefined,
) {
    return (
        value
            ?.trim()
            .toLowerCase()
            .replace(/\s+/g, "_") ?? ""
    );
}

function formatTier(
    value: string,
) {
    if (!value) {
        return "Partner";
    }

    return value
        .split("_")
        .map(
            (word) =>
                word.charAt(0).toUpperCase() +
                word.slice(1),
        )
        .join(" ");
}

function groupSponsors(
    sponsors: PublicSponsor[],
): SponsorGroup[] {
    const order = [
        "headline",
        "platinum",
        "gold",
        "silver",
        "bronze",
        "community",
        "media",
        "partner",
        "other",
    ];

    const groups =
        new Map<string, PublicSponsor[]>();

    sponsors.forEach((sponsor) => {
        const tier =
            normaliseTier(sponsor.tier) ||
            "partner";

        const current =
            groups.get(tier) ?? [];

        current.push(sponsor);
        groups.set(tier, current);
    });

    return Array.from(
        groups.entries(),
    )
        .sort(
            ([firstTier], [secondTier]) => {
                const firstIndex =
                    order.indexOf(firstTier);
                const secondIndex =
                    order.indexOf(secondTier);

                const resolvedFirst =
                    firstIndex === -1
                        ? order.length
                        : firstIndex;

                const resolvedSecond =
                    secondIndex === -1
                        ? order.length
                        : secondIndex;

                return (
                    resolvedFirst -
                    resolvedSecond
                );
            },
        )
        .map(([tier, items]) => ({
            label: formatTier(tier),
            sponsors: items,
        }));
}

export function PublicSponsorsPage({
                                       organisationName,
                                       sponsors = [],
                                       backgroundColour,
                                       surfaceColour,
                                       textColour,
                                       accentColour,
                                       accentTextColour,
                                       basePath,
                                   }: PublicSponsorsPageProps) {
    const activeSponsors =
        sponsors.filter(
            (sponsor) =>
                sponsor.active !== false,
        );

    const sponsorGroups =
        groupSponsors(activeSponsors);

    const pageWidth =
        "min(1180px, calc(100% - 2rem))";

    const benefits = [
        {
            title:
                "Brand Visibility",
            text:
                "Position your organisation across the competition website, event communications and official promotional activity.",
            icon: Megaphone,
        },
        {
            title:
                "Community Impact",
            text:
                "Support grassroots sport, participant development and meaningful opportunities within the local community.",
            icon: Users,
        },
        {
            title:
                "Trusted Association",
            text:
                "Align your brand with a professionally managed competition focused on quality, inclusion and strong governance.",
            icon: ShieldCheck,
        },
        {
            title:
                "Flexible Partnerships",
            text:
                "Explore headline, competition, media, team and community partnership opportunities tailored to your objectives.",
            icon: Sparkles,
        },
    ];

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
                    background: `radial-gradient(circle at 75% 20%, ${accentColour}20, transparent 35%), ${backgroundColour}`,
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
                        Partnerships
                    </p>

                    <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
                        Sponsors & Partners
                    </h1>

                    <p className="mt-5 max-w-3xl text-base leading-7 opacity-75 sm:text-lg">
                        Meet the organisations
                        supporting{" "}
                        <strong>
                            {organisationName}
                        </strong>{" "}
                        and helping deliver meaningful
                        opportunities for teams, players
                        and the wider community.
                    </p>

                    <a
                        href={`${basePath}/contact`}
                        className="mt-7 inline-flex rounded-xl px-5 py-3 font-black transition hover:opacity-90"
                        style={{
                            background:
                            accentColour,
                            color:
                            accentTextColour,
                            textDecoration:
                                "none",
                        }}
                    >
                        Become a Sponsor
                    </a>
                </div>
            </section>

            <section className="py-12">
                <div
                    className="mx-auto space-y-10"
                    style={{
                        width: pageWidth,
                    }}
                >
                    {sponsorGroups.length >
                    0 ? (
                        sponsorGroups.map(
                            (group) => (
                                <section
                                    key={
                                        group.label
                                    }
                                    className="rounded-2xl border p-6 sm:p-8"
                                    style={{
                                        background:
                                        surfaceColour,
                                        borderColor:
                                            `${accentColour}35`,
                                    }}
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <p
                                                className="text-xs font-black uppercase tracking-[0.18em]"
                                                style={{
                                                    color:
                                                    accentColour,
                                                }}
                                            >
                                                Sponsor Tier
                                            </p>

                                            <h2 className="mt-1 text-3xl font-black">
                                                {
                                                    group.label
                                                }
                                            </h2>
                                        </div>

                                        <span className="text-sm font-bold opacity-60">
                                            {
                                                group
                                                    .sponsors
                                                    .length
                                            }{" "}
                                            {group
                                                .sponsors
                                                .length ===
                                            1
                                                ? "partner"
                                                : "partners"}
                                        </span>
                                    </div>

                                    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                        {group.sponsors.map(
                                            (
                                                sponsor,
                                            ) => {
                                                const card =
                                                    sponsor.website_url
                                                        ? (
                                                            <a
                                                                href={
                                                                    sponsor.website_url
                                                                }
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="group block rounded-2xl border p-5 transition hover:-translate-y-0.5"
                                                                style={{
                                                                    borderColor:
                                                                        `${accentColour}25`,
                                                                    background:
                                                                        `${backgroundColour}80`,
                                                                    color:
                                                                    textColour,
                                                                    textDecoration:
                                                                        "none",
                                                                }}
                                                            >
                                                                <SponsorContent
                                                                    sponsor={
                                                                        sponsor
                                                                    }
                                                                    accentColour={
                                                                        accentColour
                                                                    }
                                                                />
                                                            </a>
                                                        )
                                                        : (
                                                            <article
                                                                className="rounded-2xl border p-5"
                                                                style={{
                                                                    borderColor:
                                                                        `${accentColour}25`,
                                                                    background:
                                                                        `${backgroundColour}80`,
                                                                }}
                                                            >
                                                                <SponsorContent
                                                                    sponsor={
                                                                        sponsor
                                                                    }
                                                                    accentColour={
                                                                        accentColour
                                                                    }
                                                                />
                                                            </article>
                                                        );

                                                return (
                                                    <div
                                                        key={
                                                            sponsor.id
                                                        }
                                                    >
                                                        {
                                                            card
                                                        }
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                </section>
                            ),
                        )
                    ) : (
                        <section
                            className="rounded-2xl border p-10 text-center"
                            style={{
                                background:
                                surfaceColour,
                                borderColor:
                                    `${accentColour}35`,
                            }}
                        >
                            <div
                                className="mx-auto grid h-16 w-16 place-items-center rounded-2xl"
                                style={{
                                    background:
                                        `${accentColour}18`,
                                    color:
                                    accentColour,
                                }}
                            >
                                <Handshake
                                    size={30}
                                />
                            </div>

                            <h2 className="mt-5 text-3xl font-black">
                                Partnership opportunities
                            </h2>

                            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 opacity-70">
                                No sponsors have been
                                published yet. Your
                                organisation could become
                                one of the first official
                                partners supporting{" "}
                                {organisationName}.
                            </p>

                            <a
                                href={`${basePath}/contact`}
                                className="mt-6 inline-flex rounded-xl px-5 py-3 font-black transition hover:opacity-90"
                                style={{
                                    background:
                                    accentColour,
                                    color:
                                    accentTextColour,
                                    textDecoration:
                                        "none",
                                }}
                            >
                                Discuss Sponsorship
                            </a>
                        </section>
                    )}
                </div>
            </section>

            <section
                className="border-y py-14"
                style={{
                    borderColor:
                        `${accentColour}25`,
                    background:
                    surfaceColour,
                }}
            >
                <div
                    className="mx-auto"
                    style={{
                        width: pageWidth,
                    }}
                >
                    <p
                        className="text-xs font-black uppercase tracking-[0.18em]"
                        style={{
                            color: accentColour,
                        }}
                    >
                        Why Partner With Us
                    </p>

                    <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                        More than logo placement
                    </h2>

                    <p className="mt-3 max-w-3xl text-base leading-7 opacity-70">
                        Partnership packages can be
                        shaped around brand awareness,
                        community engagement, media
                        coverage and direct support for
                        participants.
                    </p>

                    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {benefits.map(
                            ({
                                 title,
                                 text,
                                 icon: Icon,
                             }) => (
                                <article
                                    key={
                                        title
                                    }
                                    className="rounded-2xl border p-5"
                                    style={{
                                        borderColor:
                                            `${accentColour}25`,
                                        background:
                                            `${backgroundColour}80`,
                                    }}
                                >
                                    <Icon
                                        size={26}
                                        color={
                                            accentColour
                                        }
                                    />

                                    <h3 className="mt-4 text-lg font-black">
                                        {
                                            title
                                        }
                                    </h3>

                                    <p className="mt-2 text-sm leading-6 opacity-70">
                                        {
                                            text
                                        }
                                    </p>
                                </article>
                            ),
                        )}
                    </div>
                </div>
            </section>

            <section className="py-14">
                <div
                    className="mx-auto rounded-2xl border p-8 text-center sm:p-12"
                    style={{
                        width: pageWidth,
                        borderColor:
                            `${accentColour}40`,
                        background: `linear-gradient(135deg, ${surfaceColour}, ${accentColour}14)`,
                    }}
                >
                    <p
                        className="text-xs font-black uppercase tracking-[0.18em]"
                        style={{
                            color: accentColour,
                        }}
                    >
                        Start a Conversation
                    </p>

                    <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                        Become part of the competition
                    </h2>

                    <p className="mx-auto mt-3 max-w-2xl text-base leading-7 opacity-70">
                        Tell us about your organisation,
                        objectives and preferred level of
                        involvement. The organiser can
                        then discuss the most suitable
                        partnership opportunity with you.
                    </p>

                    <a
                        href={`${basePath}/contact`}
                        className="mt-6 inline-flex rounded-xl px-6 py-3 font-black transition hover:opacity-90"
                        style={{
                            background:
                            accentColour,
                            color:
                            accentTextColour,
                            textDecoration:
                                "none",
                        }}
                    >
                        Submit a Sponsorship Enquiry
                    </a>
                </div>
            </section>
        </div>
    );
}

type SponsorContentProps = {
    sponsor: PublicSponsor;
    accentColour: string;
};

function SponsorContent({
                            sponsor,
                            accentColour,
                        }: SponsorContentProps) {
    return (
        <div className="flex h-full flex-col">
            <div className="grid min-h-32 place-items-center rounded-xl bg-white p-4">
                {sponsor.logo_url ? (
                    <img
                        src={
                            sponsor.logo_url
                        }
                        alt={
                            sponsor.name ||
                            "Sponsor logo"
                        }
                        className="max-h-24 max-w-full object-contain"
                    />
                ) : (
                    <strong className="text-center text-xl font-black text-slate-900">
                        {sponsor.name ||
                            "Official Partner"}
                    </strong>
                )}
            </div>

            <div className="mt-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-black">
                            {sponsor.name ||
                                "Official Partner"}
                        </h3>

                        <p
                            className="mt-1 text-xs font-black uppercase tracking-[0.15em]"
                            style={{
                                color:
                                accentColour,
                            }}
                        >
                            {formatTier(
                                normaliseTier(
                                    sponsor.tier,
                                ),
                            )}
                        </p>
                    </div>

                    {sponsor.website_url && (
                        <ExternalLink
                            size={18}
                            color={
                                accentColour
                            }
                        />
                    )}
                </div>

                {sponsor.description && (
                    <p className="mt-3 text-sm leading-6 opacity-70">
                        {
                            sponsor.description
                        }
                    </p>
                )}
            </div>
        </div>
    );
}