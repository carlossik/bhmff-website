import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
} from 'react'
import {
    ImagePlus,
    Palette,
    Save,
    Trash2,
} from 'lucide-react'

import { useOrganisation } from '../../../context/OrganisationContext'
import { supabase } from '../../../lib/supabaseClient'

type BrandingState = {
    logo_url: string
    primary_colour: string
    secondary_colour: string
    accent_colour: string
    background_colour: string
    surface_colour: string
    text_colour: string
    public_site_enabled: boolean
}

type ColourField = {
    field:
        | 'primary_colour'
        | 'secondary_colour'
        | 'accent_colour'
        | 'background_colour'
        | 'surface_colour'
        | 'text_colour'
    label: string
}

const colourFields: ColourField[] = [
    { field: 'primary_colour', label: 'Primary' },
    { field: 'secondary_colour', label: 'Secondary' },
    { field: 'accent_colour', label: 'Accent' },
    { field: 'background_colour', label: 'Background' },
    { field: 'surface_colour', label: 'Surface' },
    { field: 'text_colour', label: 'Text' },
]

const defaults: BrandingState = {
    logo_url: '',
    primary_colour: '#84CC16',
    secondary_colour: '#0F172A',
    accent_colour: '#84CC16',
    background_colour: '#071006',
    surface_colour: '#10190F',
    text_colour: '#FFFFFF',
    public_site_enabled: true,
}

function isHex(value: string) {
    return /^#[0-9a-fA-F]{6}$/.test(value)
}

export function ClubProfileWebsiteManager() {
    const { currentOrganisation } =
        useOrganisation()

    const [form, setForm] =
        useState<BrandingState>(defaults)
    const [loading, setLoading] =
        useState(true)
    const [saving, setSaving] =
        useState(false)
    const [uploading, setUploading] =
        useState(false)
    const [message, setMessage] =
        useState('')
    const [error, setError] =
        useState('')
    const fileInputRef =
        useRef<HTMLInputElement | null>(null)

    useEffect(() => {
        let disposed = false

        async function load() {
            setLoading(true)
            setError('')

            const { data, error: loadError } =
                await supabase
                    .from('organisations')
                    .select(`
                        logo_url,
                        primary_colour,
                        secondary_colour,
                        accent_colour,
                        background_colour,
                        surface_colour,
                        text_colour,
                        public_site_enabled
                    `)
                    .eq('id', currentOrganisation.id)
                    .single()

            if (disposed) return

            if (loadError) {
                setError(loadError.message)
                setLoading(false)
                return
            }

            setForm({
                logo_url: data.logo_url ?? '',
                primary_colour:
                    data.primary_colour ?? defaults.primary_colour,
                secondary_colour:
                    data.secondary_colour ?? defaults.secondary_colour,
                accent_colour:
                    data.accent_colour ?? defaults.accent_colour,
                background_colour:
                    data.background_colour ?? defaults.background_colour,
                surface_colour:
                    data.surface_colour ?? defaults.surface_colour,
                text_colour:
                    data.text_colour ?? defaults.text_colour,
                public_site_enabled:
                    data.public_site_enabled ?? true,
            })
            setLoading(false)
        }

        void load()

        return () => {
            disposed = true
        }
    }, [currentOrganisation.id])

    const previewStyle = useMemo(
        () => ({
            background: form.background_colour,
            color: form.text_colour,
            borderColor: `${form.accent_colour}45`,
        }),
        [form],
    )

    function updateColour(
        field: ColourField['field'],
        value: string,
    ) {
        setForm((current) => ({
            ...current,
            [field]: value.toUpperCase(),
        }))
        setMessage('')
        setError('')
    }

    async function uploadLogo(
        event: ChangeEvent<HTMLInputElement>,
    ) {
        const file = event.target.files?.[0]
        if (!file) return

        const allowed = [
            'image/png',
            'image/jpeg',
            'image/webp',
            'image/svg+xml',
        ]

        if (!allowed.includes(file.type)) {
            setError('Use a PNG, JPG, WebP or SVG logo.')
            event.target.value = ''
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('The logo must be 5 MB or smaller.')
            event.target.value = ''
            return
        }

        setUploading(true)
        setError('')
        setMessage('')

        try {
            const extension =
                file.name.split('.').pop()?.toLowerCase() || 'png'
            const filePath =
                `${currentOrganisation.id}/organisation-branding/${crypto.randomUUID()}.${extension}`

            const { error: uploadError } =
                await supabase.storage
                    .from('organisation-assets')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        contentType: file.type,
                        upsert: false,
                    })

            if (uploadError) {
                throw uploadError
            }

            const { data } =
                supabase.storage
                    .from('organisation-assets')
                    .getPublicUrl(filePath)

            if (!data.publicUrl) {
                throw new Error('Supabase did not return a public logo URL.')
            }

            setForm((current) => ({
                ...current,
                logo_url: data.publicUrl,
            }))
            setMessage('Logo uploaded. Save changes to publish it.')
        } catch (uploadError) {
            setError(
                uploadError instanceof Error
                    ? uploadError.message
                    : 'The logo could not be uploaded.',
            )
        } finally {
            setUploading(false)
            event.target.value = ''
        }
    }

    async function save() {
        const invalidColour =
            colourFields.find(
                ({ field }) =>
                    !isHex(form[field]),
            )

        if (invalidColour) {
            setError(
                `${invalidColour.label} colour must be a six-digit hex value.`,
            )
            return
        }

        setSaving(true)
        setError('')
        setMessage('')

        const { error: saveError } =
            await supabase
                .from('organisations')
                .update({
                    logo_url:
                        form.logo_url.trim() || null,
                    primary_colour:
                        form.primary_colour,
                    secondary_colour:
                        form.secondary_colour,
                    accent_colour:
                        form.accent_colour,
                    background_colour:
                        form.background_colour,
                    surface_colour:
                        form.surface_colour,
                    text_colour:
                        form.text_colour,
                    public_site_enabled:
                        form.public_site_enabled,
                })
                .eq('id', currentOrganisation.id)

        if (saveError) {
            setError(saveError.message)
            setSaving(false)
            return
        }

        setMessage('Club branding and public website settings saved.')
        setSaving(false)
    }

    if (loading) {
        return (
            <div className="teamsEmptyState">
                <h3>Loading club profile</h3>
                <p>Loading your public website branding.</p>
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
                        <strong>{currentOrganisation.name}</strong>.
                    </p>
                </div>

                <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--organisation-accent)] px-5 py-3 text-sm font-black text-[var(--organisation-on-accent)] transition hover:brightness-110 disabled:opacity-60"
                    disabled={saving || uploading}
                    onClick={() => void save()}
                >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {message && (
                <p className="adminSuccessMessage">{message}</p>
            )}
            {error && (
                <p className="adminErrorMessage">{error}</p>
            )}

            <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
                <section className="rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] p-5">
                    <div className="flex items-center gap-3">
                        <ImagePlus className="h-5 w-5 text-[var(--organisation-accent)]" />
                        <div>
                            <h4 className="font-black">Club crest / logo</h4>
                            <p className="mt-1 text-sm text-[var(--organisation-muted)]">
                                PNG, JPG, WebP or SVG. Maximum 5 MB.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] p-5">
                        {form.logo_url ? (
                            <img
                                src={form.logo_url}
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
                        onChange={(event) => void uploadLogo(event)}
                    />

                    <div className="mt-4 flex flex-wrap gap-3">
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl bg-[var(--organisation-accent)] px-4 py-2.5 text-sm font-black text-[var(--organisation-on-accent)]"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <ImagePlus className="h-4 w-4" />
                            {uploading
                                ? 'Uploading...'
                                : form.logo_url
                                  ? 'Replace Logo'
                                  : 'Upload Logo'}
                        </button>

                        {form.logo_url && (
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-xl border border-[var(--organisation-border)] px-4 py-2.5 text-sm font-bold"
                                onClick={() =>
                                    setForm((current) => ({
                                        ...current,
                                        logo_url: '',
                                    }))
                                }
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
                            <h4 className="font-black">Public website colours</h4>
                            <p className="mt-1 text-sm text-[var(--organisation-muted)]">
                                These colours control the club's public-facing TournamentHQ site.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {colourFields.map(({ field, label }) => (
                            <label
                                key={field}
                                className="rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] p-4"
                            >
                                <span className="text-sm font-black">{label}</span>
                                <div className="mt-3 flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={form[field]}
                                        onChange={(event) =>
                                            updateColour(field, event.target.value)
                                        }
                                        className="h-11 w-14 cursor-pointer rounded-lg border border-[var(--organisation-border)] bg-transparent p-1"
                                    />
                                    <input
                                        type="text"
                                        value={form[field]}
                                        onChange={(event) =>
                                            updateColour(field, event.target.value)
                                        }
                                        className="min-w-0 flex-1 rounded-lg border border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-3 py-2 font-mono text-xs uppercase text-[var(--organisation-text)]"
                                    />
                                </div>
                            </label>
                        ))}
                    </div>

                    <label className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] p-4">
                        <input
                            type="checkbox"
                            checked={form.public_site_enabled}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    public_site_enabled: event.target.checked,
                                }))
                            }
                            className="mt-1"
                        />
                        <span>
                            <strong className="block">Enable public club website</strong>
                            <span className="mt-1 block text-sm text-[var(--organisation-muted)]">
                                Published fixtures, results, squad, media, news and sponsorship content remain available publicly.
                            </span>
                        </span>
                    </label>
                </section>
            </div>

            <section
                className="rounded-2xl border p-5"
                style={previewStyle}
            >
                <p
                    className="text-xs font-black uppercase tracking-[0.15em]"
                    style={{ color: form.accent_colour }}
                >
                    Live branding preview
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-4">
                    {form.logo_url && (
                        <img
                            src={form.logo_url}
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
        </div>
    )
}
