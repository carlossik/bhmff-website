import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";

import {
    ExternalLink,
    ImagePlus,
    Palette,
    RefreshCw,
    Save,
    Trash2,
} from "lucide-react";

import {
    supabase,
} from "../../../lib/supabaseClient";

import {
    useOrganisation,
} from "../../../context/OrganisationContext";

type ColourKey =
    | "primary_colour"
    | "secondary_colour"
    | "accent_colour"
    | "background_colour"
    | "surface_colour"
    | "text_colour";

type BrandingState = Record<
    ColourKey,
    string
> & {
    logo_url: string;
    public_site_enabled: boolean;
};

const colourFields: Array<{
    key: ColourKey;
    label: string;
}> = [
    {
        key: "primary_colour",
        label: "Primary",
    },
    {
        key: "secondary_colour",
        label: "Secondary",
    },
    {
        key: "accent_colour",
        label: "Accent",
    },
    {
        key: "background_colour",
        label: "Background",
    },
    {
        key: "surface_colour",
        label: "Surface",
    },
    {
        key: "text_colour",
        label: "Text",
    },
];

const defaults: BrandingState = {
    logo_url: "",
    public_site_enabled: true,
    primary_colour: "#0F766E",
    secondary_colour: "#0F172A",
    accent_colour: "#84CC16",
    background_colour: "#071006",
    surface_colour: "#10190F",
    text_colour: "#FFFFFF",
};

function isValidHex(
    value: string,
) {
    return /^#[0-9a-f]{6}$/i.test(
        value.trim(),
    );
}

export function ClubWebsiteSettingsManager() {
    const {
        currentOrganisation,
    } =
        useOrganisation();

    const logoInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const [
        values,
        setValues,
    ] =
        useState<BrandingState>(
            defaults,
        );

    const [
        saving,
        setSaving,
    ] =
        useState(false);

    const [
        uploadingLogo,
        setUploadingLogo,
    ] =
        useState(false);

    const [
        message,
        setMessage,
    ] =
        useState<string | null>(
            null,
        );

    const [
        errorMessage,
        setErrorMessage,
    ] =
        useState<string | null>(
            null,
        );

    useEffect(() => {
        if (!currentOrganisation) {
            return;
        }

        setValues({
            logo_url:
                currentOrganisation.logo_url ??
                "",
            public_site_enabled:
                currentOrganisation.public_site_enabled ??
                true,
            primary_colour:
                currentOrganisation.primary_colour ??
                defaults.primary_colour,
            secondary_colour:
                currentOrganisation.secondary_colour ??
                defaults.secondary_colour,
            accent_colour:
                currentOrganisation.accent_colour ??
                defaults.accent_colour,
            background_colour:
                currentOrganisation.background_colour ??
                defaults.background_colour,
            surface_colour:
                currentOrganisation.surface_colour ??
                defaults.surface_colour,
            text_colour:
                currentOrganisation.text_colour ??
                defaults.text_colour,
        });
    }, [currentOrganisation]);

    if (!currentOrganisation) {
        return (
            <div className="rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] p-8 text-center text-[var(--organisation-text)]">
                Select a club before editing its public website.
            </div>
        );
    }

    const publicUrl =
        `${window.location.origin}/${encodeURIComponent(
            currentOrganisation.slug,
        )}`;

    function updateColour(
        key: ColourKey,
        value: string,
    ) {
        setValues(
            (current) => ({
                ...current,
                [key]:
                    value.toUpperCase(),
            }),
        );
    }

    async function handleLogoChange(
        event: ChangeEvent<HTMLInputElement>,
    ) {
        const file =
            event.target.files?.[0];

        event.target.value = "";

        if (!file) {
            return;
        }

        const allowedTypes = [
            "image/png",
            "image/jpeg",
            "image/webp",
            "image/svg+xml",
        ];

        if (
            !allowedTypes.includes(
                file.type,
            )
        ) {
            setErrorMessage(
                "Upload a PNG, JPEG, WebP or SVG club logo.",
            );
            return;
        }

        if (
            file.size >
            5 * 1024 * 1024
        ) {
            setErrorMessage(
                "The club logo must be 5 MB or smaller.",
            );
            return;
        }

        setUploadingLogo(true);
        setErrorMessage(null);

        try {
            const extension =
                file.name
                    .split(".")
                    .pop()
                    ?.toLowerCase() ??
                "png";

            const filePath =
                [
                    currentOrganisation.id,
                    "organisation-branding",
                    `${crypto.randomUUID()}.${extension}`,
                ].join("/");

            const {
                error: uploadError,
            } =
                await supabase.storage
                    .from(
                        "organisation-assets",
                    )
                    .upload(
                        filePath,
                        file,
                        {
                            cacheControl:
                                "3600",
                            contentType:
                                file.type,
                            upsert: false,
                        },
                    );

            if (uploadError) {
                throw uploadError;
            }

            const {
                data: publicUrlData,
            } =
                supabase.storage
                    .from(
                        "organisation-assets",
                    )
                    .getPublicUrl(
                        filePath,
                    );

            setValues(
                (current) => ({
                    ...current,
                    logo_url:
                        publicUrlData.publicUrl,
                }),
            );

            setMessage(
                "Logo uploaded. Save changes to publish it.",
            );
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to upload the club logo.",
            );
        } finally {
            setUploadingLogo(false);
        }
    }

    async function saveSettings(
        event: FormEvent,
    ) {
        event.preventDefault();

        const invalidColour =
            colourFields.find(
                ({ key }) =>
                    !isValidHex(
                        values[key],
                    ),
            );

        if (invalidColour) {
            setErrorMessage(
                `${invalidColour.label} must be a six-digit hex colour such as #84CC16.`,
            );
            return;
        }

        setSaving(true);
        setMessage(null);
        setErrorMessage(null);

        const {
            error,
        } =
            await supabase
                .from(
                    "organisations",
                )
                .update({
                    logo_url:
                        values.logo_url.trim() ||
                        null,
                    public_site_enabled:
                        values.public_site_enabled,
                    primary_colour:
                        values.primary_colour,
                    secondary_colour:
                        values.secondary_colour,
                    accent_colour:
                        values.accent_colour,
                    background_colour:
                        values.background_colour,
                    surface_colour:
                        values.surface_colour,
                    text_colour:
                        values.text_colour,
                })
                .eq(
                    "id",
                    currentOrganisation.id,
                );

        setSaving(false);

        if (error) {
            setErrorMessage(
                error.message,
            );
            return;
        }

        setMessage(
            "Club website branding saved successfully. Refreshing the workspace so the new theme is applied...",
        );

        window.setTimeout(
            () => {
                window.location.reload();
            },
            650,
        );
    }

    return (
        <div className="space-y-6">
            <section className="rounded-3xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] p-6 lg:p-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--organisation-accent)]">
                            Club Website
                        </p>

                        <h2 className="mt-2 text-3xl font-black text-[var(--organisation-text)]">
                            Branding & Public Site
                        </h2>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--organisation-muted)]">
                            Manage the club badge and the same white-label colour palette used by TournamentHQ's organisation public websites.
                        </p>
                    </div>

                    <a
                        href={
                            publicUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--organisation-border)] px-4 py-3 text-sm font-bold text-[var(--organisation-text)] no-underline"
                    >
                        <ExternalLink className="h-4 w-4" />
                        View Public Site
                    </a>
                </div>
            </section>

            {message && (
                <p className="rounded-xl border border-emerald-700/50 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                    {message}
                </p>
            )}

            {errorMessage && (
                <p className="rounded-xl border border-red-800/60 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                    {errorMessage}
                </p>
            )}

            <form
                onSubmit={
                    saveSettings
                }
                className="grid gap-6 xl:grid-cols-12"
            >
                <section className="rounded-3xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] p-6 xl:col-span-4">
                    <div className="flex items-center gap-3">
                        <ImagePlus className="h-5 w-5 text-[var(--organisation-accent)]" />
                        <h3 className="text-xl font-black text-[var(--organisation-text)]">
                            Club Logo
                        </h3>
                    </div>

                    <div className="mt-5 flex min-h-40 items-center justify-center rounded-2xl border border-[color:var(--organisation-border)] bg-black/20 p-5">
                        {values.logo_url ? (
                            <img
                                src={
                                    values.logo_url
                                }
                                alt={`${currentOrganisation.name} logo`}
                                className="max-h-32 max-w-full object-contain"
                            />
                        ) : (
                            <div className="text-center text-sm text-[var(--organisation-muted)]">
                                No club logo uploaded
                            </div>
                        )}
                    </div>

                    <input
                        ref={
                            logoInputRef
                        }
                        type="file"
                        hidden
                        accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={
                            handleLogoChange
                        }
                    />

                    <div className="mt-4 grid gap-3">
                        <button
                            type="button"
                            disabled={
                                uploadingLogo
                            }
                            onClick={() =>
                                logoInputRef.current?.click()
                            }
                            className="rounded-xl bg-[var(--organisation-accent)] px-4 py-3 text-sm font-black text-[var(--organisation-on-accent)] disabled:opacity-50"
                        >
                            {uploadingLogo
                                ? "Uploading..."
                                : values.logo_url
                                    ? "Replace Logo"
                                    : "Upload Logo"}
                        </button>

                        {values.logo_url && (
                            <button
                                type="button"
                                onClick={() =>
                                    setValues(
                                        (
                                            current,
                                        ) => ({
                                            ...current,
                                            logo_url:
                                                "",
                                        }),
                                    )
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-800/50 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200"
                            >
                                <Trash2 className="h-4 w-4" />
                                Remove Logo
                            </button>
                        )}
                    </div>
                </section>

                <section className="rounded-3xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] p-6 xl:col-span-8">
                    <div className="flex items-center gap-3">
                        <Palette className="h-5 w-5 text-[var(--organisation-accent)]" />
                        <h3 className="text-xl font-black text-[var(--organisation-text)]">
                            White-label Colours
                        </h3>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {colourFields.map(
                            ({
                                key,
                                label,
                            }) => (
                                <label
                                    key={
                                        key
                                    }
                                >
                                    <span className="text-sm font-semibold text-slate-300">
                                        {
                                            label
                                        }
                                    </span>

                                    <div className="mt-2 flex items-center gap-2 rounded-xl border border-[color:var(--organisation-border)] bg-black/20 p-2">
                                        <input
                                            type="color"
                                            value={
                                                values[
                                                    key
                                                ]
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                updateColour(
                                                    key,
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            className="h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent"
                                        />

                                        <input
                                            value={
                                                values[
                                                    key
                                                ]
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                updateColour(
                                                    key,
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            className="min-w-0 flex-1 bg-transparent px-2 text-sm font-mono text-white outline-none"
                                        />
                                    </div>
                                </label>
                            ),
                        )}
                    </div>

                    <div className="mt-6 rounded-2xl border border-[color:var(--organisation-border)] p-5">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--organisation-accent)]">
                            Live Preview
                        </p>

                        <div
                            className="mt-4 rounded-2xl border p-5"
                            style={{
                                background:
                                    values.background_colour,
                                color:
                                    values.text_colour,
                                borderColor:
                                    values.accent_colour,
                            }}
                        >
                            <div className="flex items-center gap-3">
                                {values.logo_url ? (
                                    <img
                                        src={
                                            values.logo_url
                                        }
                                        alt=""
                                        className="h-12 w-12 object-contain"
                                    />
                                ) : (
                                    <div
                                        className="grid h-12 w-12 place-items-center rounded-xl font-black"
                                        style={{
                                            background:
                                                values.accent_colour,
                                            color:
                                                values.background_colour,
                                        }}
                                    >
                                        {currentOrganisation.name
                                            .charAt(
                                                0,
                                            )
                                            .toUpperCase()}
                                    </div>
                                )}

                                <div>
                                    <strong>
                                        {
                                            currentOrganisation.name
                                        }
                                    </strong>
                                    <p className="text-xs opacity-65">
                                        Powered by TournamentHQ
                                    </p>
                                </div>
                            </div>

                            <div
                                className="mt-5 rounded-xl p-4"
                                style={{
                                    background:
                                        values.surface_colour,
                                }}
                            >
                                Club fixtures, results, squad, news and match media.
                            </div>
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] p-6 xl:col-span-12">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <label className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={
                                    values.public_site_enabled
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setValues(
                                        (
                                            current,
                                        ) => ({
                                            ...current,
                                            public_site_enabled:
                                                event
                                                    .target
                                                    .checked,
                                        }),
                                    )
                                }
                                className="mt-1"
                            />

                            <span>
                                <strong className="block text-[var(--organisation-text)]">
                                    Enable public club website
                                </strong>
                                <span className="text-sm text-[var(--organisation-muted)]">
                                    When enabled, published fixtures, results, squad, media, news and sponsors can appear publicly.
                                </span>
                            </span>
                        </label>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setValues(
                                        defaults,
                                    )
                                }
                                className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--organisation-border)] px-4 py-3 text-sm font-bold text-[var(--organisation-text)]"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Reset Colours
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    saving ||
                                    uploadingLogo
                                }
                                className="inline-flex items-center gap-2 rounded-xl bg-[var(--organisation-accent)] px-5 py-3 text-sm font-black text-[var(--organisation-on-accent)] disabled:opacity-50"
                            >
                                <Save className="h-4 w-4" />
                                {saving
                                    ? "Saving..."
                                    : "Save Website Settings"}
                            </button>
                        </div>
                    </div>
                </section>
            </form>
        </div>
    );
}
