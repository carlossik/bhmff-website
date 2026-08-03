import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useLocation,
} from "react-router-dom";

import {
    organisationPublicService,
    type PublicOrganisationData,
} from "../../services/public/organisationPublicService";

import {
    PublicOrganisationProvider,
} from "../../context/PublicOrganisationContext";

import {
    PublicHomePage,
} from "./PublicHomePage";

import {
    PublicCompetitionsPage,
} from "./PublicCompetitionsPage";

import {
    PublicSponsorsPage,
} from "./PublicSponsorsPage";

import {
    PublicContactPage,
} from "./PublicContactPage";

import {
    PublicNewsPage,
} from "./PublicNewsPage";

import {
    PublicMediaPage,
} from "./PublicMediaPage";

import {
    PublicTeamsPage,
} from "./PublicTeamsPage";

import {
    PublicFixturesPage,
} from "./PublicFixturesPage";

import {
    PublicResultsPage,
} from "./PublicResultsPage";

import {
    PublicTablesPage,
} from "./PublicTablesPage";

function getOrganisationSlug(
    pathname: string,
) {
    const match =
        pathname.match(
            /^\/o\/([^/]+)(?:\/.*)?$/,
        );

    return match
        ? decodeURIComponent(
            match[1],
        )
        : "";
}

function createReadableTextColour(
    backgroundColour: string,
) {
    const colour =
        backgroundColour.replace(
            "#",
            "",
        );

    if (colour.length !== 6) {
        return "#ffffff";
    }

    const red =
        parseInt(
            colour.substring(0, 2),
            16,
        );

    const green =
        parseInt(
            colour.substring(2, 4),
            16,
        );

    const blue =
        parseInt(
            colour.substring(4, 6),
            16,
        );

    const brightness =
        red * 0.299 +
        green * 0.587 +
        blue * 0.114;

    return brightness > 160
        ? "#071006"
        : "#ffffff";
}

export function PublicOrganisationLayout() {
    const location =
        useLocation();

    const [
        publicData,
        setPublicData,
    ] =
        useState<PublicOrganisationData | null>(
            null,
        );

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [error, setError] =
        useState("");

    useEffect(() => {
        async function loadOrganisation() {
            const slug =
                getOrganisationSlug(
                    location.pathname,
                );

            if (!slug) {
                setPublicData(null);
                setError(
                    "The organisation link is invalid.",
                );
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");

                const result =
                    await organisationPublicService
                        .getPublicOrganisationData(
                            slug,
                        );

                setPublicData(
                    result,
                );
            } catch (loadError) {
                console.error(
                    "Unable to load the public organisation:",
                    loadError,
                );

                setPublicData(null);
                setError(
                    "We could not load this organisation right now.",
                );
            } finally {
                setLoading(false);
            }
        }

        void loadOrganisation();
    }, [location.pathname]);

    const organisation =
        publicData?.organisation ??
        null;

    const theme =
        useMemo(() => {
            const backgroundColour =
                organisation
                    ?.background_colour ||
                "#071006";

            const surfaceColour =
                organisation
                    ?.surface_colour ||
                "#10190f";

            const textColour =
                organisation
                    ?.text_colour ||
                "#ffffff";

            const primaryColour =
                organisation
                    ?.primary_colour ||
                "#84cc16";

            const secondaryColour =
                organisation
                    ?.secondary_colour ||
                "#0f172a";

            const accentColour =
                organisation
                    ?.accent_colour ||
                primaryColour;

            return {
                backgroundColour,
                surfaceColour,
                textColour,
                primaryColour,
                secondaryColour,
                accentColour,
                accentTextColour:
                    createReadableTextColour(
                        accentColour,
                    ),
            };
        }, [organisation]);

    if (loading) {
        return (
            <main className="grid min-h-screen place-items-center bg-[#071006] p-8 text-white">
                <p>
                    Loading organisation...
                </p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="grid min-h-screen place-items-center bg-[#071006] p-8 text-center text-white">
                <div>
                    <h1 className="text-3xl font-black">
                        Public site unavailable
                    </h1>

                    <p className="mt-3 text-slate-400">
                        {error}
                    </p>
                </div>
            </main>
        );
    }

    if (
        !organisation ||
        !publicData
    ) {
        return (
            <main className="grid min-h-screen place-items-center bg-[#071006] p-8 text-center text-white">
                <div>
                    <h1 className="text-3xl font-black">
                        Organisation not found
                    </h1>

                    <p className="mt-3 text-slate-400">
                        This public organisation
                        site does not exist or is
                        not currently published.
                    </p>
                </div>
            </main>
        );
    }

    const resolvedOrganisation = organisation;
    const resolvedPublicData = publicData;

    const basePath =
        `/o/${encodeURIComponent(
            resolvedOrganisation.slug,
        )}`;

    const navigationItems = [
        {
            label: "Home",
            href: basePath,
        },
        {
            label: "Competitions",
            href:
                `${basePath}/competitions`,
        },
        {
            label: "Fixtures",
            href:
                `${basePath}/fixtures`,
        },
        {
            label: "Results",
            href:
                `${basePath}/results`,
        },
        {
            label: "Tables",
            href:
                `${basePath}/tables`,
        },
        {
            label: "Teams",
            href:
                `${basePath}/teams`,
        },
        {
            label: "News",
            href:
                `${basePath}/news`,
        },
        {
            label: "Media",
            href:
                `${basePath}/media`,
        },
        {
            label: "Sponsors",
            href:
                `${basePath}/sponsors`,
        },
        {
            label: "Contact",
            href:
                `${basePath}/contact`,
        },
        {
            label: "Admin Portal",
            href: "/admin",
        },
    ];

    const commonPageProps = {
        backgroundColour:
        theme.backgroundColour,
        surfaceColour:
        theme.surfaceColour,
        textColour:
        theme.textColour,
        accentColour:
        theme.accentColour,
        accentTextColour:
        theme.accentTextColour,
        basePath,
    };

    function renderCurrentPage() {
        switch (
            location.pathname
            ) {
            case basePath:
            case `${basePath}/`:
                return (
                    <PublicHomePage
                        organisationName={
                            resolvedOrganisation.name
                        }
                        competitions={
                            resolvedPublicData.competitions
                        }
                        articles={
                            resolvedPublicData.articles
                        }
                        sponsors={
                            resolvedPublicData.sponsors
                        }
                        media={
                            resolvedPublicData.media
                        }
                        {...commonPageProps}
                    />
                );

            case `${basePath}/competitions`:
                return (
                    <PublicCompetitionsPage
                        organisationId={
                            resolvedOrganisation.id
                        }
                        organisationName={
                            resolvedOrganisation.name
                        }
                        surfaceColour={
                            theme.surfaceColour
                        }
                        textColour={
                            theme.textColour
                        }
                        accentColour={
                            theme.accentColour
                        }
                        basePath={
                            basePath
                        }
                    />
                );

            case `${basePath}/fixtures`:
                return (
                    <PublicFixturesPage
                        organisationId={
                            resolvedOrganisation.id
                        }
                        organisationName={
                            resolvedOrganisation.name
                        }
                        competitions={
                            resolvedPublicData.competitions
                        }
                        {...commonPageProps}
                    />
                );

            case `${basePath}/results`:
                return (
                    <PublicResultsPage
                        organisationId={
                            resolvedOrganisation.id
                        }
                        organisationName={
                            resolvedOrganisation.name
                        }
                        competitions={
                            resolvedPublicData.competitions
                        }
                        {...commonPageProps}
                    />
                );

            case `${basePath}/tables`:
                return (
                    <PublicTablesPage
                        organisationId={
                            resolvedOrganisation.id
                        }
                        organisationName={
                            resolvedOrganisation.name
                        }
                        competitions={
                            resolvedPublicData.competitions
                        }
                        {...commonPageProps}
                    />
                );

            case `${basePath}/teams`:
                return (
                    <PublicTeamsPage
                        organisationId={
                            resolvedOrganisation.id
                        }
                        organisationName={
                            resolvedOrganisation.name
                        }
                        {...commonPageProps}
                    />
                );

            case `${basePath}/news`:
                return (
                    <PublicNewsPage
                        organisationName={
                            resolvedOrganisation.name
                        }
                        articles={
                            resolvedPublicData.articles
                        }
                        {...commonPageProps}
                    />
                );

            case `${basePath}/media`:
                return (
                    <PublicMediaPage
                        organisationName={
                            resolvedOrganisation.name
                        }
                        media={
                            resolvedPublicData.media
                        }
                        {...commonPageProps}
                    />
                );

            case `${basePath}/sponsors`:
                return (
                    <PublicSponsorsPage
                        organisationName={
                            resolvedOrganisation.name
                        }
                        sponsors={
                            resolvedPublicData.sponsors
                        }
                        {...commonPageProps}
                    />
                );

            case `${basePath}/contact`:
                return (
                    <PublicContactPage
                        organisationId={
                            resolvedOrganisation.id
                        }
                        organisationName={
                            resolvedOrganisation.name
                        }
                        competitions={
                            resolvedPublicData.competitions
                        }
                        {...commonPageProps}
                    />
                );

            default:
                return (
                    <PublicHomePage
                        organisationName={
                            resolvedOrganisation.name
                        }
                        competitions={
                            resolvedPublicData.competitions
                        }
                        articles={
                            resolvedPublicData.articles
                        }
                        sponsors={
                            resolvedPublicData.sponsors
                        }
                        media={
                            resolvedPublicData.media
                        }
                        {...commonPageProps}
                    />
                );
        }
    }

    return (
        <PublicOrganisationProvider
            organisation={
                resolvedOrganisation
            }
            basePath={
                basePath
            }
            publicData={
                resolvedPublicData
            }
        >
            <main
                className="min-h-screen"
                style={{
                    background:
                    theme.backgroundColour,
                    color:
                    theme.textColour,
                }}
            >
                <header
                    className="sticky top-0 z-20 border-b backdrop-blur-xl"
                    style={{
                        background:
                            `${theme.backgroundColour}f2`,
                        borderColor:
                            `${theme.accentColour}30`,
                    }}
                >
                    <div className="mx-auto flex min-h-[76px] w-[min(1240px,calc(100%-2rem))] flex-wrap items-center justify-between gap-6 py-3">
                        <a
                            href={basePath}
                            className="flex items-center gap-3 no-underline"
                            style={{
                                color:
                                theme.textColour,
                            }}
                        >
                            {resolvedOrganisation.logo_url ? (
                                <img
                                    src={
                                        resolvedOrganisation.logo_url
                                    }
                                    alt={`${resolvedOrganisation.name} logo`}
                                    className="h-12 w-12 rounded-xl object-contain"
                                />
                            ) : (
                                <div
                                    className="grid h-12 w-12 place-items-center rounded-xl font-black"
                                    style={{
                                        background:
                                        theme.accentColour,
                                        color:
                                        theme.accentTextColour,
                                    }}
                                >
                                    {resolvedOrganisation.name
                                        .charAt(0)
                                        .toUpperCase()}
                                </div>
                            )}

                            <div>
                                <strong className="block text-base">
                                    {
                                        resolvedOrganisation.name
                                    }
                                </strong>

                                <span className="mt-0.5 block text-xs font-bold uppercase tracking-wider opacity-60">
                                    Powered by
                                    TournamentHQ
                                </span>
                            </div>
                        </a>

                        <a
                            href="https://tournamenthq.co.uk"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Visit TournamentHQ"
                            className="inline-flex shrink-0 items-center justify-center no-underline"
                        >
                            <img
                                src="/assets/tournamenthq-logo.png"
                                alt="TournamentHQ"
                                className="block h-auto max-h-12 w-[clamp(130px,12vw,175px)] object-contain"
                            />
                        </a>

                        <nav
                            aria-label="Public site navigation"
                            className="flex flex-wrap items-center justify-end gap-1"
                        >
                            {navigationItems.map(
                                ({
                                     label,
                                     href,
                                 }) => {
                                    const active =
                                        location.pathname ===
                                        href;

                                    return (
                                        <a
                                            key={
                                                label
                                            }
                                            href={
                                                href
                                            }
                                            className="inline-flex min-h-10 items-center rounded-full px-3 py-2 text-sm font-bold no-underline transition"
                                            style={{
                                                color:
                                                    active
                                                        ? theme.accentTextColour
                                                        : theme.textColour,
                                                background:
                                                    active
                                                        ? theme.accentColour
                                                        : "transparent",
                                                opacity:
                                                    active
                                                        ? 1
                                                        : 0.82,
                                            }}
                                        >
                                            {
                                                label
                                            }
                                        </a>
                                    );
                                },
                            )}
                        </nav>
                    </div>
                </header>

                {renderCurrentPage()}

                <footer
                    className="border-t"
                    style={{
                        borderColor:
                            `${theme.accentColour}20`,
                        background:
                        theme.surfaceColour,
                    }}
                >
                    <div className="mx-auto flex min-h-[150px] w-[min(1240px,calc(100%-2rem))] flex-wrap items-center justify-between gap-6 py-8">
                        <div>
                            <strong>
                                {
                                    resolvedOrganisation.name
                                }
                            </strong>

                            <p className="mt-2 opacity-60">
                                Official competition
                                website
                            </p>
                        </div>

                        <a
                            href="https://tournamenthq.co.uk"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Visit TournamentHQ"
                            className="inline-flex flex-col items-end gap-2 no-underline"
                            style={{
                                color:
                                theme.textColour,
                            }}
                        >
                            <span className="text-xs font-bold uppercase tracking-wider opacity-60">
                                Powered by
                            </span>

                            <img
                                src="/assets/tournamenthq-logo.png"
                                alt="TournamentHQ"
                                className="block h-auto max-h-[52px] w-[180px] max-w-full object-contain"
                            />
                        </a>
                    </div>
                </footer>
            </main>
        </PublicOrganisationProvider>
    );
}