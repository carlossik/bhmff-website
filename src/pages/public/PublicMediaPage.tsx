import {
    useMemo,
    useState,
} from "react";

import {
    Camera,
    ExternalLink,
    Film,
    Image as ImageIcon,
    PlayCircle,
    Search,
} from "lucide-react";

import type {
    PublicMediaItem,
} from "../../services/public/organisationPublicService";

type PublicMediaPageProps = {
    organisationName: string;
    media?: PublicMediaItem[];
    backgroundColour: string;
    surfaceColour: string;
    textColour: string;
    accentColour: string;
    accentTextColour: string;
    basePath: string;
};

type MediaViewModel = {
    id: string;
    title: string;
    description: string;
    mediaType: string;
    mediaUrl: string;
    thumbnailUrl: string;
    createdAt: string;
    featured: boolean;
};

function getString(
    item: PublicMediaItem,
    keys: string[],
) {
    for (const key of keys) {
        const value = item[key];

        if (
            typeof value === "string" &&
            value.trim()
        ) {
            return value.trim();
        }
    }

    return "";
}

function getBoolean(
    item: PublicMediaItem,
    keys: string[],
) {
    for (const key of keys) {
        const value = item[key];

        if (
            typeof value === "boolean"
        ) {
            return value;
        }
    }

    return false;
}

function normaliseMediaType(
    value: string,
) {
    const normalised = value.trim().toLowerCase();

    if (
        normalised.includes("youtube") ||
        normalised.includes("video")
    ) {
        return "video";
    }

    if (
        normalised.includes("image") ||
        normalised.includes("photo") ||
        normalised.includes("gallery")
    ) {
        return "image";
    }

    return "other";
}

function mapMediaItem(
    item: PublicMediaItem,
): MediaViewModel {
    const mediaType = normaliseMediaType(
        getString(item, [
            "media_type",
            "type",
        ]),
    );

    return {
        id: item.id,
        title:
            getString(item, [
                "title",
            ]) ||
            "Competition media",
        description:
            getString(item, [
                "description",
                "summary",
            ]) ||
            "Official competition media coverage.",
        mediaType,
        mediaUrl:
            getString(item, [
                "media_url",
                "url",
            ]),
        thumbnailUrl:
            getString(item, [
                "thumbnail_url",
                "image_url",
            ]),
        createdAt:
            getString(item, [
                "created_at",
                "published_at",
            ]),
        featured:
            getBoolean(item, [
                "featured",
            ]),
    };
}

function formatDate(
    value: string,
) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return "";
    }

    return new Intl.DateTimeFormat(
        "en-GB",
        {
            day: "numeric",
            month: "short",
            year: "numeric",
        },
    ).format(date);
}

function getYoutubeEmbedUrl(
    value: string,
) {
    if (!value) {
        return "";
    }

    try {
        const url = new URL(value);

        if (
            url.hostname.includes(
                "youtu.be",
            )
        ) {
            const id = url.pathname
                .replace("/", "")
                .trim();

            return id
                ? `https://www.youtube.com/embed/${id}`
                : "";
        }

        if (
            url.hostname.includes(
                "youtube.com",
            )
        ) {
            if (
                url.pathname.startsWith(
                    "/embed/",
                )
            ) {
                return value;
            }

            const id = url.searchParams.get("v");

            return id
                ? `https://www.youtube.com/embed/${id}`
                : "";
        }
    } catch {
        return "";
    }

    return "";
}

export function PublicMediaPage({
                                    organisationName,
                                    media = [],
                                    backgroundColour,
                                    surfaceColour,
                                    textColour,
                                    accentColour,
                                    accentTextColour,
                                    basePath,
                                }: PublicMediaPageProps) {
    const [searchTerm, setSearchTerm] =
        useState("");

    const [activeFilter, setActiveFilter] =
        useState<
            "all" |
            "video" |
            "image"
        >("all");

    const mediaItems = useMemo(
        () =>
            media
                .map(mapMediaItem)
                .sort(
                    (
                        first,
                        second,
                    ) =>
                        new Date(
                            second.createdAt,
                        ).getTime() -
                        new Date(
                            first.createdAt,
                        ).getTime(),
                ),
        [media],
    );

    const featuredItem = useMemo(
        () =>
            mediaItems.find(
                (item) =>
                    item.featured,
            ) ??
            mediaItems[0] ??
            null,
        [mediaItems],
    );

    const filteredItems = useMemo(() => {
        const normalisedSearch = searchTerm
            .trim()
            .toLowerCase();

        return mediaItems.filter(
            (item) => {
                const typeMatches =
                    activeFilter ===
                    "all" ||
                    item.mediaType ===
                    activeFilter;

                const searchMatches =
                    !normalisedSearch ||
                    item.title
                        .toLowerCase()
                        .includes(
                            normalisedSearch,
                        ) ||
                    item.description
                        .toLowerCase()
                        .includes(
                            normalisedSearch,
                        );

                return (
                    typeMatches &&
                    searchMatches
                );
            },
        );
    }, [
        mediaItems,
        activeFilter,
        searchTerm,
    ]);

    const pageWidth =
        "min(1180px, calc(100% - 2rem))";

    return (
        <div
            className="min-h-screen"
            style={{
                background:
                backgroundColour,
                color:
                textColour,
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
                        width:
                        pageWidth,
                    }}
                >
                    <p
                        className="text-xs font-black uppercase tracking-[0.2em]"
                        style={{
                            color:
                            accentColour,
                        }}
                    >
                        Official Coverage
                    </p>

                    <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
                        Media Centre
                    </h1>

                    <p className="mt-5 max-w-3xl text-base leading-7 opacity-75 sm:text-lg">
                        Watch highlights, interviews,
                        match coverage and official media
                        from{" "}
                        <strong>
                            {organisationName}
                        </strong>
                        .
                    </p>
                </div>
            </section>

            <section className="py-10">
                <div
                    className="mx-auto"
                    style={{
                        width:
                        pageWidth,
                    }}
                >
                    <div
                        className="flex flex-col gap-4 rounded-2xl border p-4 lg:flex-row lg:items-center lg:justify-between"
                        style={{
                            background:
                            surfaceColour,
                            borderColor:
                                `${accentColour}35`,
                        }}
                    >
                        <div className="relative w-full lg:max-w-md">
                            <Search
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50"
                            />

                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(event) =>
                                    setSearchTerm(
                                        event.target.value,
                                    )
                                }
                                placeholder="Search media..."
                                className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-current"
                                style={{
                                    color:
                                    textColour,
                                }}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {[
                                {
                                    value: "all",
                                    label: "All",
                                    icon: Camera,
                                },
                                {
                                    value: "video",
                                    label: "Videos",
                                    icon: Film,
                                },
                                {
                                    value: "image",
                                    label: "Images",
                                    icon: ImageIcon,
                                },
                            ].map(
                                ({
                                     value,
                                     label,
                                     icon: Icon,
                                 }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() =>
                                            setActiveFilter(
                                                value as
                                                    | "all"
                                                    | "video"
                                                    | "image",
                                            )
                                        }
                                        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition"
                                        style={{
                                            background:
                                                activeFilter ===
                                                value
                                                    ? accentColour
                                                    : `${accentColour}12`,
                                            color:
                                                activeFilter ===
                                                value
                                                    ? accentTextColour
                                                    : textColour,
                                        }}
                                    >
                                        <Icon
                                            size={16}
                                        />
                                        {label}
                                    </button>
                                ),
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {featuredItem &&
            activeFilter === "all" &&
            !searchTerm.trim() ? (
                <section className="pb-10">
                    <div
                        className="mx-auto"
                        style={{
                            width:
                            pageWidth,
                        }}
                    >
                        <article
                            className="grid overflow-hidden rounded-2xl border lg:grid-cols-[1.35fr_1fr]"
                            style={{
                                background:
                                surfaceColour,
                                borderColor:
                                    `${accentColour}35`,
                            }}
                        >
                            <FeaturedMediaVisual
                                item={featuredItem}
                                backgroundColour={backgroundColour}
                                accentColour={accentColour}
                            />

                            <div className="flex flex-col justify-center p-7 sm:p-10">
                                <span
                                    className="w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider"
                                    style={{
                                        background:
                                            `${accentColour}18`,
                                        color:
                                        accentColour,
                                    }}
                                >
                                    Featured Media
                                </span>

                                <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
                                    {featuredItem.title}
                                </h2>

                                <p className="mt-4 text-base leading-7 opacity-75">
                                    {featuredItem.description}
                                </p>

                                {featuredItem.createdAt ? (
                                    <p className="mt-4 text-sm opacity-55">
                                        {formatDate(
                                            featuredItem.createdAt,
                                        )}
                                    </p>
                                ) : null}

                                {featuredItem.mediaUrl ? (
                                    <a
                                        href={featuredItem.mediaUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-7 inline-flex w-fit items-center gap-2 rounded-xl px-5 py-3 font-black transition hover:opacity-90"
                                        style={{
                                            background:
                                            accentColour,
                                            color:
                                            accentTextColour,
                                            textDecoration:
                                                "none",
                                        }}
                                    >
                                        Open Media
                                        <ExternalLink
                                            size={18}
                                        />
                                    </a>
                                ) : null}
                            </div>
                        </article>
                    </div>
                </section>
            ) : null}

            <section className="pb-14">
                <div
                    className="mx-auto"
                    style={{
                        width:
                        pageWidth,
                    }}
                >
                    {filteredItems.length === 0 ? (
                        <div
                            className="rounded-2xl border p-12 text-center"
                            style={{
                                background:
                                surfaceColour,
                                borderColor:
                                    `${accentColour}35`,
                            }}
                        >
                            <Camera
                                size={42}
                                className="mx-auto"
                                color={accentColour}
                            />

                            <h2 className="mt-5 text-2xl font-black">
                                No media found
                            </h2>

                            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 opacity-70">
                                Published media matching the
                                selected filters will appear
                                here.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {filteredItems.map(
                                (item) => (
                                    <article
                                        key={item.id}
                                        className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border transition hover:-translate-y-0.5"
                                        style={{
                                            background:
                                            surfaceColour,
                                            borderColor:
                                                `${accentColour}35`,
                                        }}
                                    >
                                        <MediaCardVisual
                                            item={item}
                                            backgroundColour={backgroundColour}
                                            accentColour={accentColour}
                                        />

                                        <div className="flex flex-1 flex-col p-6">
                                            <div className="flex items-center justify-between gap-3">
                                                <span
                                                    className="text-xs font-black uppercase tracking-[0.16em]"
                                                    style={{
                                                        color:
                                                        accentColour,
                                                    }}
                                                >
                                                    {item.mediaType ===
                                                    "video"
                                                        ? "Video"
                                                        : item.mediaType ===
                                                        "image"
                                                            ? "Image"
                                                            : "Media"}
                                                </span>

                                                {item.createdAt ? (
                                                    <span className="text-xs opacity-55">
                                                        {formatDate(
                                                            item.createdAt,
                                                        )}
                                                    </span>
                                                ) : null}
                                            </div>

                                            <h2 className="mt-4 text-2xl font-black leading-tight">
                                                {item.title}
                                            </h2>

                                            <p className="mt-3 text-sm leading-6 opacity-72">
                                                {item.description}
                                            </p>

                                            {item.mediaUrl ? (
                                                <div className="mt-auto pt-6">
                                                    <a
                                                        href={item.mediaUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-2 text-sm font-black no-underline"
                                                        style={{
                                                            color:
                                                            accentColour,
                                                        }}
                                                    >
                                                        View Media
                                                        <ExternalLink
                                                            size={16}
                                                        />
                                                    </a>
                                                </div>
                                            ) : null}
                                        </div>
                                    </article>
                                ),
                            )}
                        </div>
                    )}
                </div>
            </section>

            <section className="pb-14">
                <div
                    className="mx-auto rounded-2xl border p-8 text-center sm:p-12"
                    style={{
                        width:
                        pageWidth,
                        borderColor:
                            `${accentColour}40`,
                        background: `linear-gradient(135deg, ${surfaceColour}, ${accentColour}14)`,
                    }}
                >
                    <p
                        className="text-xs font-black uppercase tracking-[0.18em]"
                        style={{
                            color:
                            accentColour,
                        }}
                    >
                        Stay Connected
                    </p>

                    <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                        Follow the competition story
                    </h2>

                    <p className="mx-auto mt-3 max-w-2xl text-base leading-7 opacity-70">
                        Return to the competition centre
                        for fixtures, results, teams and
                        the latest published news.
                    </p>

                    <a
                        href={basePath}
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
                        Back to Competition Home
                    </a>
                </div>
            </section>
        </div>
    );
}

type MediaVisualProps = {
    item: MediaViewModel;
    backgroundColour: string;
    accentColour: string;
};

function FeaturedMediaVisual({
                                 item,
                                 backgroundColour,
                                 accentColour,
                             }: MediaVisualProps) {
    const embedUrl =
        item.mediaType ===
        "video"
            ? getYoutubeEmbedUrl(
                item.mediaUrl,
            )
            : "";

    if (embedUrl) {
        return (
            <div className="min-h-[360px] bg-black">
                <iframe
                    src={embedUrl}
                    title={item.title}
                    className="h-full min-h-[360px] w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
        );
    }

    if (
        item.thumbnailUrl ||
        (
            item.mediaType ===
            "image" &&
            item.mediaUrl
        )
    ) {
        const image =
            item.thumbnailUrl ||
            item.mediaUrl;

        return (
            <img
                src={image}
                alt={item.title}
                className="h-full min-h-[360px] w-full object-cover"
            />
        );
    }

    return (
        <div
            className="grid min-h-[360px] place-items-center"
            style={{
                background: `radial-gradient(circle, ${accentColour}30, transparent 42%), ${backgroundColour}`,
            }}
        >
            {item.mediaType ===
            "video" ? (
                <PlayCircle
                    size={72}
                    color={accentColour}
                />
            ) : (
                <Camera
                    size={72}
                    color={accentColour}
                />
            )}
        </div>
    );
}

function MediaCardVisual({
                             item,
                             backgroundColour,
                             accentColour,
                         }: MediaVisualProps) {
    const image =
        item.thumbnailUrl ||
        (
            item.mediaType ===
            "image"
                ? item.mediaUrl
                : ""
        );

    if (image) {
        return (
            <div className="relative">
                <img
                    src={image}
                    alt={item.title}
                    className="h-[220px] w-full object-cover"
                />

                {item.mediaType ===
                    "video" && (
                        <div className="absolute inset-0 grid place-items-center bg-black/20">
                            <PlayCircle
                                size={54}
                                color="#ffffff"
                            />
                        </div>
                    )}
            </div>
        );
    }

    return (
        <div
            className="grid min-h-[220px] place-items-center"
            style={{
                background: `radial-gradient(circle, ${accentColour}25, transparent 45%), ${backgroundColour}`,
            }}
        >
            {item.mediaType ===
            "video" ? (
                <PlayCircle
                    size={50}
                    color={accentColour}
                />
            ) : (
                <ImageIcon
                    size={50}
                    color={accentColour}
                />
            )}
        </div>
    );
}