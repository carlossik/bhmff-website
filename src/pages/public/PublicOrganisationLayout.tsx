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
    ClubPublicHomePage,
} from "./ClubPublicHomePage";

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

import {
    applyOrganisationBrowserBranding,
    resetTournamentHQBrowserBranding,
} from "../../services/publicBrandingService";

function getOrganisationSlugFromPath(
    pathname: string,
) {
    const legacyMatch =
        pathname.match(
            /^\/o\/([^/]+)(?:\/.*)?$/,
        );

    if (legacyMatch) {
        return decodeURIComponent(
            legacyMatch[1],
        );
    }

    const cleanMatch =
        pathname.match(
            /^\/([^/]+)(?:\/.*)?$/,
        );

    return cleanMatch
        ? decodeURIComponent(
            cleanMatch[1],
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

type PublicOrganisationLayoutProps = {
    organisationSlugOverride?: string
    useRootPath?: boolean
}

export function PublicOrganisationLayout({
                                             organisationSlugOverride,
                                             useRootPath = false,
                                         }: PublicOrganisationLayoutProps) {
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
                organisationSlugOverride
                    ?.trim()
                    .toLowerCase() ||
                getOrganisationSlugFromPath(
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
    }, [
        location.pathname,
        organisationSlugOverride,
    ]);

    useEffect(() => {
        if (!location.hash) {
            return;
        }

        const sectionId =
            decodeURIComponent(
                location.hash.slice(1),
            );

        const timeoutId =
            window.setTimeout(() => {
                const section =
                    document.getElementById(
                        sectionId,
                    );

                if (!section) {
                    return;
                }

                const headerOffset = 96;
                const sectionTop =
                    section.getBoundingClientRect()
                        .top +
                    window.scrollY -
                    headerOffset;

                window.scrollTo({
                    top: sectionTop,
                    behavior: "smooth",
                });
            }, 80);

        return () => {
            window.clearTimeout(
                timeoutId,
            );
        };
    }, [
        location.hash,
        location.pathname,
        publicData,
    ]);

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

    useEffect(() => {
        if (!organisation) {
            resetTournamentHQBrowserBranding();
            return;
        }

        return applyOrganisationBrowserBranding(
            organisation,
        );
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
        useRootPath
            ? ""
            : `/${encodeURIComponent(
                resolvedOrganisation.slug,
            )}`;

    const isBhmff =
        resolvedOrganisation.slug
            .trim()
            .toLowerCase() === "bhmff";

    const isClub =
        resolvedOrganisation.organisation_type === "club";

    const navigationItems = [
        {
            label: "Home",
            href:
                basePath || "/",
            sectionId: "",
        },
        {
            label: isBhmff
                ? "Festival"
                : "Overview",
            href:
                `${basePath}#${isClub ? "overview" : "festival"}`,
            sectionId:
                isClub
                    ? "overview"
                    : "festival",
        },
        {
            label: "Fixtures",
            href:
                `${basePath}#fixtures`,
            sectionId: "fixtures",
        },
        {
            label: "Results",
            href:
                `${basePath}#results`,
            sectionId: "results",
        },
        {
            label: isClub ? "Squad" : "Teams",
            href:
                `${basePath}#${isClub ? "squad" : "teams"}`,
            sectionId:
                isClub
                    ? "squad"
                    : "teams",
        },
        {
            label: "Statistics",
            href:
                `${basePath}#statistics`,
            sectionId: "statistics",
        },
        {
            label: "Media",
            href:
                `${basePath}#media`,
            sectionId: "media",
        },
        {
            label: isBhmff
                ? "Black History"
                : "News",
            href:
                `${basePath}#history`,
            sectionId: "history",
        },
        {
            label: "Sponsors",
            href:
                `${basePath}#sponsors`,
            sectionId: "sponsors",
        },
        {
            label: "Admin Portal",
            href: "/admin",
            sectionId: "",
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
            case "/":
                return isClub ? (
                    <ClubPublicHomePage
                        organisationName={
                            resolvedOrganisation.name
                        }
                        organisationLogoUrl={
                            resolvedOrganisation.logo_url
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
                ) : (
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
                return isClub ? (
                    <ClubPublicHomePage
                        organisationName={
                            resolvedOrganisation.name
                        }
                        organisationLogoUrl={
                            resolvedOrganisation.logo_url
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
                ) : (
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
                return isClub ? (
                    <ClubPublicHomePage
                        organisationName={
                            resolvedOrganisation.name
                        }
                        organisationLogoUrl={
                            resolvedOrganisation.logo_url
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
                ) : (
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
                return isClub ? (
                    <ClubPublicHomePage
                        organisationName={
                            resolvedOrganisation.name
                        }
                        organisationLogoUrl={
                            resolvedOrganisation.logo_url
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
                ) : (
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
                return isClub ? (
                    <ClubPublicHomePage
                        organisationName={
                            resolvedOrganisation.name
                        }
                        organisationLogoUrl={
                            resolvedOrganisation.logo_url
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
                ) : (
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
                return isClub ? (
                    <ClubPublicHomePage
                        organisationName={
                            resolvedOrganisation.name
                        }
                        organisationLogoUrl={
                            resolvedOrganisation.logo_url
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
                ) : (
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
                id="top"
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
                    <div className="mx-auto flex min-h-[76px] w-[min(1240px,calc(100%-2rem))] flex-wrap items-center gap-x-8 gap-y-3 py-3">
                        <div className="flex items-center gap-3">
                            <a
                                href={
                                    basePath || "/"
                                }
                                className="flex shrink-0 items-center no-underline"
                                style={{
                                    color:
                                    theme.textColour,
                                }}
                                aria-label={`Visit ${resolvedOrganisation.name} home`}
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
                            </a>

                            <div>
                                <a
                                    href={
                                        basePath || "/"
                                    }
                                    className="block text-base font-bold no-underline"
                                    style={{
                                        color:
                                        theme.textColour,
                                    }}
                                >
                                    {
                                        resolvedOrganisation.name
                                    }
                                </a>

                                <div className="mt-1 flex items-center gap-2">
                                    <span className="text-[11px] font-bold opacity-60">
                                        Powered By
                                    </span>

                                    <a
                                        href="https://tournamenthq.co.uk"
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label="Visit TournamentHQ"
                                        className="inline-flex items-center no-underline transition-opacity hover:opacity-85"
                                    >
                                        <img
                                            src="/assets/tournamenthq-logo.png"
                                            alt="TournamentHQ"
                                            className="block h-auto w-[110px] object-contain"
                                        />
                                    </a>
                                </div>
                            </div>
                        </div>

                        <nav
                            aria-label="Public site navigation"
                            className="ml-auto flex flex-wrap items-center justify-end gap-1"
                        >
                            {navigationItems.map(
                                ({
                                     label,
                                     href,
                                     sectionId,
                                 }) => {
                                    const isHomePage =
                                        location.pathname ===
                                        basePath ||
                                        location.pathname ===
                                        `${basePath}/`;

                                    const active =
                                        label ===
                                        "Home"
                                            ? isHomePage &&
                                            !location.hash
                                            : sectionId
                                                ? isHomePage &&
                                                location.hash ===
                                                `#${sectionId}`
                                                : location.pathname ===
                                                href;

                                    return (
                                        <a
                                            key={
                                                label
                                            }
                                            href={
                                                href
                                            }
                                            aria-current={
                                                active
                                                    ? "page"
                                                    : undefined
                                            }
                                            onClick={(
                                                event,
                                            ) => {
                                                if (
                                                    !sectionId ||
                                                    !isHomePage
                                                ) {
                                                    return;
                                                }

                                                const section =
                                                    document.getElementById(
                                                        sectionId,
                                                    );

                                                if (!section) {
                                                    return;
                                                }

                                                event.preventDefault();

                                                window.history.pushState(
                                                    null,
                                                    "",
                                                    `${basePath}#${sectionId}`,
                                                );

                                                const headerOffset =
                                                    96;

                                                const sectionTop =
                                                    section.getBoundingClientRect()
                                                        .top +
                                                    window.scrollY -
                                                    headerOffset;

                                                window.scrollTo({
                                                    top: sectionTop,
                                                    behavior:
                                                        "smooth",
                                                });
                                            }}
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
                    {isClub ? (
                        <div className="mx-auto w-[min(1240px,calc(100%-2rem))] py-3 sm:py-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex min-w-0 flex-wrap items-center gap-x-7 gap-y-2">
                                    <div className="min-w-0">
                                        <strong className="block truncate text-sm font-black sm:text-base">
                                            {
                                                resolvedOrganisation.name
                                            }
                                        </strong>

                                        <p className="mt-0.5 text-[11px] opacity-55 sm:text-xs">
                                            Official club website · ©{" "}
                                            {new Date().getFullYear()}
                                        </p>
                                    </div>

                                    <nav
                                        aria-label="Club footer navigation"
                                        className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold"
                                    >
                                        {[
                                            [
                                                "Home",
                                                basePath || "/",
                                            ],
                                            [
                                                "Fixtures",
                                                `${basePath}#fixtures`,
                                            ],
                                            [
                                                "Results",
                                                `${basePath}#results`,
                                            ],
                                            [
                                                "Squad",
                                                `${basePath}#squad`,
                                            ],
                                            [
                                                "Sponsors",
                                                `${basePath}#sponsors`,
                                            ],
                                        ].map(
                                            ([label, href]) => (
                                                <a
                                                    key={label}
                                                    href={href}
                                                    className="no-underline transition-opacity hover:opacity-100"
                                                    style={{
                                                        color:
                                                        theme.textColour,
                                                        opacity:
                                                            0.62,
                                                    }}
                                                >
                                                    {label}
                                                </a>
                                            ),
                                        )}
                                    </nav>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-3 lg:justify-end">
                                    <a
                                        href="https://tournamenthq.co.uk"
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label="Visit TournamentHQ"
                                        className="inline-flex items-center gap-2 no-underline"
                                        style={{
                                            color:
                                            theme.textColour,
                                        }}
                                    >
                                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">
                                            Powered by
                                        </span>

                                        <img
                                            src="/assets/tournamenthq-logo.png"
                                            alt="TournamentHQ"
                                            className="block h-auto max-h-7 w-[104px] max-w-full object-contain"
                                        />
                                    </a>

                                    <span
                                        aria-hidden="true"
                                        className="hidden h-8 w-px opacity-20 sm:block"
                                        style={{
                                            background:
                                            theme.accentColour,
                                        }}
                                    />

                                    <div
                                        aria-label="CKEFA digital ecosystem"
                                        className="flex flex-wrap items-center gap-3"
                                    >
                                        <span className="hidden text-[10px] font-bold uppercase tracking-[0.12em] opacity-45 xl:inline">
                                            CKEFA ecosystem
                                        </span>

                                        <a
                                            href="https://fcfs.app/home"
                                            target="_blank"
                                            rel="noreferrer"
                                            aria-label="Visit FCFS"
                                            className="inline-grid h-8 w-[82px] place-items-center no-underline transition-opacity hover:opacity-80"
                                        >
                                            <img
                                                src="/assets/fcfs-logo.png"
                                                alt="FCFS"
                                                className="max-h-7 max-w-[82px] object-contain"
                                            />
                                        </a>

                                        <a
                                            href="https://ckefamedia.co.uk"
                                            target="_blank"
                                            rel="noreferrer"
                                            aria-label="Visit CKEFA Media"
                                            className="inline-grid h-8 w-[88px] place-items-center overflow-hidden no-underline transition-opacity hover:opacity-80"
                                        >
                                            <img
                                                src="/assets/ckefa-media-logo.jpg"
                                                alt="CKEFA Media"
                                                data-fallback-index="0"
                                                className="h-8 w-[88px] scale-[1.45] object-cover"
                                                onError={(event) => {
                                                    const image =
                                                        event.currentTarget;
                                                    const fallbackImages = [
                                                        "/assets/ckefa-media-logo.jpeg",
                                                        "/assets/ckefa-media-logo.JPG",
                                                        "/assets/ckefa-media-logo.png",
                                                    ];
                                                    const fallbackIndex =
                                                        Number(
                                                            image.dataset
                                                                .fallbackIndex ??
                                                            "0",
                                                        );
                                                    const nextSource =
                                                        fallbackImages[
                                                            fallbackIndex
                                                            ];

                                                    if (nextSource) {
                                                        image.dataset.fallbackIndex =
                                                            String(
                                                                fallbackIndex +
                                                                1,
                                                            );
                                                        image.src =
                                                            nextSource;
                                                        return;
                                                    }

                                                    image.style.display =
                                                        "none";
                                                }}
                                            />
                                        </a>

                                        <a
                                            href="https://ckefa.co.uk"
                                            target="_blank"
                                            rel="noreferrer"
                                            aria-label="Visit CKEFA Software"
                                            className="inline-grid h-8 w-[96px] place-items-center no-underline transition-opacity hover:opacity-80"
                                        >
                                            <img
                                                src="/assets/ckefa-software-logo.png"
                                                alt="CKEFA Software Solutions"
                                                className="max-h-7 max-w-[96px] object-contain"
                                            />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mx-auto flex min-h-[150px] w-[min(1240px,calc(100%-2rem))] flex-wrap items-center justify-between gap-6 py-8">
                            <div>
                                <strong>
                                    {
                                        resolvedOrganisation.name
                                    }
                                </strong>

                                <p className="mt-2 opacity-60">
                                    Official competition website
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
                                    className="block h-auto max-h-[36px] w-[120px] max-w-full object-contain"
                                />
                            </a>
                        </div>
                    )}
                </footer>
            </main>
        </PublicOrganisationProvider>
    );
}