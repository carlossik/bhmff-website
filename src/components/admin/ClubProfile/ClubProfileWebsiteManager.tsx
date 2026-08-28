import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
} from 'react'
import {
    ExternalLink,
    Globe2,
    Image as ImageIcon,
    LoaderCircle,
    Palette,
    Power,
    PowerOff,
    Save,
    Trash2,
} from 'lucide-react'

import { useOrganisation } from '../../../context/OrganisationContext'
import { supabase } from '../../../lib/supabaseClient'
import { ConfirmDialog } from '../../common/ConfirmDialog/ConfirmDialog'

type BrandingField =
    | 'primary_colour'
    | 'secondary_colour'
    | 'accent_colour'
    | 'background_colour'
    | 'surface_colour'
    | 'text_colour'

type BrandingForm = {
    logo_url: string
    primary_colour: string
    secondary_colour: string
    accent_colour: string
    background_colour: string
    surface_colour: string
    text_colour: string
}

type OrganisationSettingsRow = {
    name: string
    logo_url: string | null
    primary_colour: string | null
    secondary_colour: string | null
    accent_colour: string | null
    background_colour: string | null
    surface_colour: string | null
    text_colour: string | null
    public_site_enabled: boolean
    updated_at: string | null
}

type WebsiteStatusRow = {
    public_site_enabled: boolean
    updated_at: string | null
}

const DEFAULT_BRANDING: BrandingForm = {
    logo_url: '',
    primary_colour: '#84CC16',
    secondary_colour: '#0F172A',
    accent_colour: '#84CC16',
    background_colour: '#071006',
    surface_colour: '#10190F',
    text_colour: '#FFFFFF',
}

const COLOUR_FIELDS: ReadonlyArray<{
    field: BrandingField
    label: string
}> = [
    {
        field: 'primary_colour',
        label: 'Primary',
    },
    {
        field: 'secondary_colour',
        label: 'Secondary',
    },
    {
        field: 'accent_colour',
        label: 'Accent',
    },
    {
        field: 'background_colour',
        label: 'Background',
    },
    {
        field: 'surface_colour',
        label: 'Surface',
    },
    {
        field: 'text_colour',
        label: 'Text',
    },
]

function normaliseColour(
    value: string | null,
    fallback: string,
): string {
    const trimmed = value?.trim()

    if (!trimmed) {
        return fallback
    }

    return trimmed.toUpperCase()
}

function isValidHexColour(value: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(value.trim())
}

function formatUpdatedAt(value: string | null): string {
    if (!value) {
        return 'Not recorded'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return 'Not recorded'
    }

    return new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date)
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
    ) {
        return error.message
    }

    return 'The setting could not be updated.'
}

export function ClubProfileWebsiteManager() {
    const { currentOrganisation } = useOrganisation()
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const [clubName, setClubName] = useState(
        currentOrganisation.name,
    )
    const [branding, setBranding] =
        useState<BrandingForm>(DEFAULT_BRANDING)
    const [websiteEnabled, setWebsiteEnabled] =
        useState(false)
    const [lastUpdatedAt, setLastUpdatedAt] =
        useState<string | null>(null)

    const [loading, setLoading] = useState(true)
    const [savingBranding, setSavingBranding] =
        useState(false)
    const [uploadingLogo, setUploadingLogo] =
        useState(false)
    const [updatingWebsite, setUpdatingWebsite] =
        useState(false)
    const [confirmDisable, setConfirmDisable] =
        useState(false)

    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    const publicSiteUrl = useMemo(
        () =>
            `${window.location.origin}/${encodeURIComponent(
                currentOrganisation.slug.trim(),
            )}`,
        [currentOrganisation.slug],
    )

    const previewStyle = useMemo(
        () => ({
            background: branding.background_colour,
            color: branding.text_colour,
            borderColor: `${branding.accent_colour}45`,
        }),
        [branding],
    )

    useEffect(() => {
        let disposed = false

        async function loadSettings() {
            setLoading(true)
            setMessage('')
            setErrorMessage('')

            const { data, error } = await supabase
                .from('organisations')
                .select(`
                    name,
                    logo_url,
                    primary_colour,
                    secondary_colour,
                    accent_colour,
                    background_colour,
                    surface_colour,
                    text_colour,
                    public_site_enabled,
                    updated_at
                `)
                .eq('id', currentOrganisation.id)
                .single()

            if (disposed) {
                return
            }

            if (error) {
                setErrorMessage(error.message)
                setLoading(false)
                return
            }

            const row = data as OrganisationSettingsRow

            setClubName(row.name)
            setBranding({
                logo_url: row.logo_url ?? '',
                primary_colour: normaliseColour(
                    row.primary_colour,
                    DEFAULT_BRANDING.primary_colour,
                ),
                secondary_colour: normaliseColour(
                    row.secondary_colour,
                    DEFAULT_BRANDING.secondary_colour,
                ),
                accent_colour: normaliseColour(
                    row.accent_colour,
                    DEFAULT_BRANDING.accent_colour,
                ),
                background_colour: normaliseColour(
                    row.background_colour,
                    DEFAULT_BRANDING.background_colour,
                ),
                surface_colour: normaliseColour(
                    row.surface_colour,
                    DEFAULT_BRANDING.surface_colour,
                ),
                text_colour: normaliseColour(
                    row.text_colour,
                    DEFAULT_BRANDING.text_colour,
                ),
            })
            setWebsiteEnabled(row.public_site_enabled)
            setLastUpdatedAt(row.updated_at)
            setLoading(false)
        }

        void loadSettings()

        return () => {
            disposed = true
        }
    }, [currentOrganisation.id])

    function updateColour(
        field: BrandingField,
        value: string,
    ) {
        setBranding((current) => ({
            ...current,
            [field]: value.toUpperCase(),
        }))
        setMessage('')
        setErrorMessage('')
    }

    async function handleLogoUpload(
        event: ChangeEvent<HTMLInputElement>,
    ) {
        const file = event.target.files?.[0]

        if (!file) {
            return
        }

        if (
            ![
                'image/png',
                'image/jpeg',
                'image/webp',
                'image/svg+xml',
            ].includes(file.type)
        ) {
            setErrorMessage(
                'Use a PNG, JPG, WebP or SVG logo.',
            )
            event.target.value = ''
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            setErrorMessage(
                'The logo must be 5 MB or smaller.',
            )
            event.target.value = ''
            return
        }

        setUploadingLogo(true)
        setMessage('')
        setErrorMessage('')

        try {
            const extension =
                file.name
                    .split('.')
                    .pop()
                    ?.toLowerCase() || 'png'
            const path = `${currentOrganisation.id}/organisation-branding/${crypto.randomUUID()}.${extension}`

            const { error: uploadError } =
                await supabase.storage
                    .from('organisation-assets')
                    .upload(path, file, {
                        cacheControl: '3600',
                        contentType: file.type,
                        upsert: false,
                    })

            if (uploadError) {
                throw uploadError
            }

            const { data: publicUrlData } =
                supabase.storage
                    .from('organisation-assets')
                    .getPublicUrl(path)

            if (!publicUrlData.publicUrl) {
                throw new Error(
                    'Supabase did not return a public logo URL.',
                )
            }

            setBranding((current) => ({
                ...current,
                logo_url: publicUrlData.publicUrl,
            }))
            setMessage(
                'Logo uploaded. Save Profile & Branding to publish it.',
            )
        } catch (error) {
            setErrorMessage(getErrorMessage(error))
        } finally {
            setUploadingLogo(false)
            event.target.value = ''
        }
    }

    async function saveBranding() {
        const resolvedClubName = clubName.trim()

        if (!resolvedClubName) {
            setErrorMessage('Club name is required.')
            return
        }

        const invalidField = COLOUR_FIELDS.find(
            ({ field }) =>
                !isValidHexColour(branding[field]),
        )

        if (invalidField) {
            setErrorMessage(
                `${invalidField.label} colour must be a six-digit hex value.`,
            )
            return
        }

        setSavingBranding(true)
        setMessage('')
        setErrorMessage('')

        const now = new Date().toISOString()

        try {
            const { data, error } = await supabase
                .from('organisations')
                .update({
                    name: resolvedClubName,
                    logo_url:
                        branding.logo_url.trim() || null,
                    primary_colour:
                        branding.primary_colour,
                    secondary_colour:
                        branding.secondary_colour,
                    accent_colour:
                        branding.accent_colour,
                    background_colour:
                        branding.background_colour,
                    surface_colour:
                        branding.surface_colour,
                    text_colour: branding.text_colour,
                    updated_at: now,
                })
                .eq('id', currentOrganisation.id)
                .select(`
                    name,
                    logo_url,
                    primary_colour,
                    secondary_colour,
                    accent_colour,
                    background_colour,
                    surface_colour,
                    text_colour,
                    public_site_enabled,
                    updated_at
                `)
                .maybeSingle()

            if (error) {
                throw error
            }

            if (!data) {
                throw new Error(
                    'The branding update could not be verified.',
                )
            }

            const verified = data as OrganisationSettingsRow

            setClubName(verified.name)
            setBranding({
                logo_url: verified.logo_url ?? '',
                primary_colour: normaliseColour(
                    verified.primary_colour,
                    DEFAULT_BRANDING.primary_colour,
                ),
                secondary_colour: normaliseColour(
                    verified.secondary_colour,
                    DEFAULT_BRANDING.secondary_colour,
                ),
                accent_colour: normaliseColour(
                    verified.accent_colour,
                    DEFAULT_BRANDING.accent_colour,
                ),
                background_colour: normaliseColour(
                    verified.background_colour,
                    DEFAULT_BRANDING.background_colour,
                ),
                surface_colour: normaliseColour(
                    verified.surface_colour,
                    DEFAULT_BRANDING.surface_colour,
                ),
                text_colour: normaliseColour(
                    verified.text_colour,
                    DEFAULT_BRANDING.text_colour,
                ),
            })
            setWebsiteEnabled(
                verified.public_site_enabled,
            )
            setLastUpdatedAt(verified.updated_at)
            setMessage(
                'Club branding saved successfully.',
            )
        } catch (error) {
            setErrorMessage(getErrorMessage(error))
        } finally {
            setSavingBranding(false)
        }
    }

    async function updateWebsiteStatus(
        enabled: boolean,
    ) {
        if (updatingWebsite) {
            return
        }

        const previousValue = websiteEnabled

        setUpdatingWebsite(true)
        setMessage('')
        setErrorMessage('')

        const now = new Date().toISOString()

        try {
            const { data, error } = await supabase
                .from('organisations')
                .update({
                    public_site_enabled: enabled,
                    updated_at: now,
                })
                .eq('id', currentOrganisation.id)
                .select(
                    'public_site_enabled,updated_at',
                )
                .maybeSingle()

            if (error) {
                throw error
            }

            if (!data) {
                throw new Error(
                    'The public website setting could not be verified.',
                )
            }

            const verified = data as WebsiteStatusRow

            if (
                verified.public_site_enabled !== enabled
            ) {
                throw new Error(
                    'Supabase returned a different website status than requested.',
                )
            }

            setWebsiteEnabled(
                verified.public_site_enabled,
            )
            setLastUpdatedAt(verified.updated_at)
            setMessage(
                enabled
                    ? 'Public website is now LIVE.'
                    : 'Public website is now OFFLINE.',
            )
        } catch (error) {
            setWebsiteEnabled(previousValue)
            setErrorMessage(getErrorMessage(error))
        } finally {
            setUpdatingWebsite(false)
        }
    }

    function requestWebsiteStatusChange() {
        if (updatingWebsite) {
            return
        }

        if (websiteEnabled) {
            setConfirmDisable(true)
            return
        }

        void updateWebsiteStatus(true)
    }

    if (loading) {
        return (
            <div className="teamsEmptyState">
                <h3>Loading club profile</h3>
                <p>
                    Loading your public website settings.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            <div className="adminWorkspaceHeader">
                <div>
                    <h3>Club Profile &amp; Website</h3>
                    <p className="muted">
                        Manage the crest, colours and public-site appearance for{' '}
                        <strong>
                            {currentOrganisation.name}
                        </strong>
                        .
                    </p>
                </div>

                <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--organisation-accent)] px-5 py-3 text-sm font-black text-[var(--organisation-on-accent)] transition hover:brightness-110 disabled:opacity-60"
                    disabled={
                        savingBranding ||
                        uploadingLogo ||
                        updatingWebsite
                    }
                    onClick={() => void saveBranding()}
                >
                    <Save className="h-4 w-4" />
                    {savingBranding
                        ? 'Saving Profile...'
                        : 'Save Profile & Branding'}
                </button>
            </div>

            {message && (
                <p className="adminSuccessMessage">
                    {message}
                </p>
            )}

            {errorMessage && (
                <p className="adminErrorMessage">
                    {errorMessage}
                </p>
            )}

            <section className="rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] p-5">
                <div className="max-w-2xl">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--organisation-accent)]">
                        Club identity
                    </p>
                    <h4 className="mt-2 font-black">
                        Public club name
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-[var(--organisation-muted)]">
                        Update the club name shown in the admin portal and on the public club website.
                    </p>
                    <label className="mt-5 block text-sm font-bold text-[var(--organisation-text)]">
                        Club name
                        <input
                            type="text"
                            value={clubName}
                            disabled={savingBranding || uploadingLogo}
                            onChange={(event) => {
                                setClubName(event.currentTarget.value)
                                setMessage('')
                                setErrorMessage('')
                            }}
                            className="mt-2 w-full rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-4 py-3 text-[var(--organisation-text)] outline-none transition focus:border-[var(--organisation-accent)] focus:ring-2 focus:ring-[var(--organisation-accent)]/10 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                    </label>
                </div>
            </section>

            <section className="rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                        <div
                            className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
                                websiteEnabled
                                    ? 'bg-emerald-500/15 text-emerald-300'
                                    : 'bg-slate-500/15 text-slate-400'
                            }`}
                        >
                            {websiteEnabled ? (
                                <Globe2 className="h-6 w-6" />
                            ) : (
                                <PowerOff className="h-6 w-6" />
                            )}
                        </div>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                                <h4 className="font-black">
                                    Public Website
                                </h4>
                                <span
                                    className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
                                        websiteEnabled
                                            ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                                            : 'border-slate-600 bg-slate-800/60 text-slate-400'
                                    }`}
                                >
                                    {updatingWebsite
                                        ? 'Updating...'
                                        : websiteEnabled
                                          ? 'Live'
                                          : 'Offline'}
                                </span>
                            </div>

                            <p className="mt-2 max-w-3xl text-sm text-[var(--organisation-muted)]">
                                {websiteEnabled
                                    ? 'Your club website is currently visible to the public. Turning it off takes effect immediately.'
                                    : 'Your club website is currently hidden from the public. Turning it on takes effect immediately.'}
                            </p>

                            <p className="mt-2 text-xs text-[var(--organisation-muted)] opacity-75">
                                Last settings update:{' '}
                                {formatUpdatedAt(lastUpdatedAt)}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {websiteEnabled && (
                            <a
                                href={publicSiteUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl border border-[var(--organisation-border)] px-4 py-2.5 text-sm font-bold no-underline transition hover:brightness-110"
                                style={{
                                    color: 'var(--organisation-text)',
                                }}
                            >
                                <ExternalLink className="h-4 w-4" />
                                View Public Site
                            </a>
                        )}

                        <button
                            type="button"
                            aria-pressed={websiteEnabled}
                            disabled={updatingWebsite}
                            onClick={requestWebsiteStatusChange}
                            className={`relative inline-flex min-w-[170px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                websiteEnabled
                                    ? 'bg-rose-500/15 text-rose-200 ring-1 ring-inset ring-rose-400/30 hover:bg-rose-500/20'
                                    : 'bg-emerald-500 text-slate-950 hover:brightness-110'
                            }`}
                        >
                            {updatingWebsite ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : websiteEnabled ? (
                                <PowerOff className="h-4 w-4" />
                            ) : (
                                <Power className="h-4 w-4" />
                            )}

                            {updatingWebsite
                                ? 'Updating...'
                                : websiteEnabled
                                  ? 'Take Website Offline'
                                  : 'Make Website Live'}
                        </button>
                    </div>
                </div>

                <div className="mt-4 rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-4 py-3 text-sm text-[var(--organisation-muted)]">
                    Website visibility is saved immediately. You do not need to click Save Profile & Branding after changing LIVE/OFFLINE status.
                </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
                <section className="rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] p-5">
                    <div className="flex items-center gap-3">
                        <ImageIcon className="h-5 w-5 text-[var(--organisation-accent)]" />
                        <div>
                            <h4 className="font-black">
                                Club crest / logo
                            </h4>
                            <p className="mt-1 text-sm text-[var(--organisation-muted)]">
                                PNG, JPG, WebP or SVG. Maximum 5 MB.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] p-5">
                        {branding.logo_url ? (
                            <img
                                src={branding.logo_url}
                                alt={`${currentOrganisation.name} logo`}
                                className="mx-auto h-36 w-36 object-contain"
                            />
                        ) : (
                            <div className="grid h-36 place-items-center text-sm text-[var(--organisation-muted)]">
                                No club logo uploaded
                            </div>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(event) =>
                            void handleLogoUpload(event)
                        }
                    />

                    <div className="mt-4 flex flex-wrap gap-3">
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl bg-[var(--organisation-accent)] px-4 py-2.5 text-sm font-black text-[var(--organisation-on-accent)] disabled:opacity-60"
                            disabled={uploadingLogo}
                            onClick={() =>
                                fileInputRef.current?.click()
                            }
                        >
                            {uploadingLogo ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                                <ImageIcon className="h-4 w-4" />
                            )}
                            {uploadingLogo
                                ? 'Uploading...'
                                : branding.logo_url
                                  ? 'Replace Logo'
                                  : 'Upload Logo'}
                        </button>

                        {branding.logo_url && (
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-xl border border-[var(--organisation-border)] px-4 py-2.5 text-sm font-bold"
                                onClick={() => {
                                    setBranding((current) => ({
                                        ...current,
                                        logo_url: '',
                                    }))
                                    setMessage(
                                        'Logo removed from the preview. Save Profile & Branding to publish the change.',
                                    )
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                                Remove Logo
                            </button>
                        )}
                    </div>
                </section>

                <section className="rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] p-5">
                    <div className="flex items-center gap-3">
                        <Palette className="h-5 w-5 text-[var(--organisation-accent)]" />
                        <div>
                            <h4 className="font-black">
                                Public website colours
                            </h4>
                            <p className="mt-1 text-sm text-[var(--organisation-muted)]">
                                These colours control the club&apos;s public-facing TournamentHQ site.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {COLOUR_FIELDS.map(
                            ({ field, label }) => (
                                <label
                                    key={field}
                                    className="rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] p-4"
                                >
                                    <span className="text-sm font-black">
                                        {label}
                                    </span>

                                    <div className="mt-3 flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={branding[field]}
                                            onChange={(event) =>
                                                updateColour(
                                                    field,
                                                    event.target.value,
                                                )
                                            }
                                            className="h-11 w-14 cursor-pointer rounded-lg border border-[var(--organisation-border)] bg-transparent p-1"
                                        />
                                        <input
                                            type="text"
                                            value={branding[field]}
                                            onChange={(event) =>
                                                updateColour(
                                                    field,
                                                    event.target.value,
                                                )
                                            }
                                            className="min-w-0 flex-1 rounded-lg border border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-3 py-2 font-mono text-xs uppercase text-[var(--organisation-text)]"
                                            aria-label={`${label} colour hex value`}
                                        />
                                    </div>
                                </label>
                            ),
                        )}
                    </div>
                </section>
            </div>

            <section
                className="rounded-2xl border p-5"
                style={previewStyle}
            >
                <p
                    className="text-xs font-black uppercase tracking-[0.15em]"
                    style={{
                        color: branding.accent_colour,
                    }}
                >
                    Live branding preview
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-4">
                    {branding.logo_url && (
                        <img
                            src={branding.logo_url}
                            alt="Club branding preview"
                            className="h-16 w-16 object-contain"
                        />
                    )}
                    <div>
                        <h4 className="text-xl font-black">
                            {currentOrganisation.name}
                        </h4>
                        <p className="mt-1 text-sm opacity-70">
                            Official club website · Powered by TournamentHQ
                        </p>
                    </div>
                </div>
            </section>

            {confirmDisable && (
                <ConfirmDialog
                    title="Take public website offline?"
                    message={`This will immediately hide ${currentOrganisation.name}'s public website from visitors. Your admin data, teams, fixtures, results and content will remain safely stored and can be made public again at any time.`}
                    confirmText={
                        updatingWebsite
                            ? 'Updating...'
                            : 'Take Website Offline'
                    }
                    cancelText="Keep Website Live"
                    onCancel={() => {
                        if (!updatingWebsite) {
                            setConfirmDisable(false)
                        }
                    }}
                    onConfirm={() => {
                        if (!updatingWebsite) {
                            setConfirmDisable(false)
                            void updateWebsiteStatus(false)
                        }
                    }}
                />
            )}
        </div>
    )
}
