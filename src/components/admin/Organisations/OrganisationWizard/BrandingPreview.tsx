import {
    useState,
    type CSSProperties,
} from 'react'

type BrandingPreviewProps = {
    organisationName: string
    logoUrl: string
    publicSiteEnabled: boolean
    primaryColour: string
    secondaryColour: string
    accentColour: string
    backgroundColour: string
    surfaceColour: string
    textColour: string
}

type PreviewMode =
    | 'admin'
    | 'public'

export function BrandingPreview({
    organisationName,
    logoUrl,
    publicSiteEnabled,
    primaryColour,
    secondaryColour,
    accentColour,
    backgroundColour,
    surfaceColour,
    textColour,
}: BrandingPreviewProps) {
    const [mode, setMode] =
        useState<PreviewMode>('admin')

    const previewStyle = {
        '--preview-primary': primaryColour,
        '--preview-secondary': secondaryColour,
        '--preview-accent': accentColour,
        '--preview-background': backgroundColour,
        '--preview-surface': surfaceColour,
        '--preview-text': textColour,
    } as CSSProperties

    const displayName =
        organisationName.trim() ||
        'Your Organisation'

    function renderLogo(
        className: string
    ) {
        return (
            <div
                className={className}
                style={{
                    background:
                        'var(--preview-primary)',
                    color:
                        'var(--preview-text)',
                }}
            >
                {logoUrl.trim() ? (
                    <img
                        src={logoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                    />
                ) : (
                    displayName
                        .charAt(0)
                        .toUpperCase()
                )}
            </div>
        )
    }

    function renderAdminPreview() {
        return (
            <div
                className="min-h-[430px]"
                style={{
                    background:
                        'var(--preview-background)',
                    color: 'var(--preview-text)',
                }}
            >
                <header
                    className="flex items-center justify-between border-b px-5 py-4"
                    style={{
                        background:
                            'var(--preview-surface)',
                        borderColor:
                            'color-mix(in srgb, var(--preview-text) 12%, transparent)',
                    }}
                >
                    <div className="flex min-w-0 items-center gap-3">
                        {renderLogo(
                            'flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl font-bold'
                        )}

                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                                {displayName}
                            </p>

                            <p className="text-xs opacity-70">
                                TournamentHQ
                            </p>
                        </div>
                    </div>

                    <div
                        className="rounded-full px-3 py-1 text-xs font-semibold"
                        style={{
                            background:
                                'var(--preview-accent)',
                            color:
                                'var(--preview-secondary)',
                        }}
                    >
                        Live
                    </div>
                </header>

                <div className="grid gap-4 p-5 md:grid-cols-[0.72fr_1.28fr]">
                    <aside
                        className="rounded-2xl p-4"
                        style={{
                            background:
                                'var(--preview-surface)',
                        }}
                    >
                        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] opacity-60">
                            Navigation
                        </p>

                        <div className="space-y-2">
                            {[
                                'Dashboard',
                                'Competitions',
                                'Teams',
                                'Fixtures',
                                'Results',
                            ].map(
                                (
                                    item,
                                    index
                                ) => (
                                    <div
                                        key={item}
                                        className="rounded-xl px-3 py-2.5 text-sm font-medium"
                                        style={
                                            index === 0
                                                ? {
                                                    background:
                                                        'var(--preview-primary)',
                                                    color:
                                                        'var(--preview-text)',
                                                }
                                                : undefined
                                        }
                                    >
                                        {item}
                                    </div>
                                )
                            )}
                        </div>
                    </aside>

                    <main className="space-y-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.18em] opacity-60">
                                Dashboard
                            </p>

                            <h3 className="mt-1 text-xl font-bold">
                                Welcome back
                            </h3>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {[
                                ['4', 'Competitions'],
                                ['32', 'Teams'],
                                ['68', 'Fixtures'],
                            ].map(([value, label]) => (
                                <article
                                    key={label}
                                    className="rounded-2xl p-4"
                                    style={{
                                        background:
                                            'var(--preview-surface)',
                                    }}
                                >
                                    <p className="text-xl font-bold">
                                        {value}
                                    </p>

                                    <p className="mt-1 text-xs opacity-65">
                                        {label}
                                    </p>
                                </article>
                            ))}
                        </div>

                        <article
                            className="rounded-2xl p-4"
                            style={{
                                background:
                                    'var(--preview-surface)',
                            }}
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold">
                                        Upcoming fixture
                                    </p>

                                    <p className="mt-1 text-xs opacity-65">
                                        Saturday · 15:00
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="rounded-xl px-4 py-2 text-sm font-semibold"
                                    style={{
                                        background:
                                            'var(--preview-accent)',
                                        color:
                                            'var(--preview-secondary)',
                                    }}
                                >
                                    View fixture
                                </button>
                            </div>

                            <div
                                className="mt-4 h-2 overflow-hidden rounded-full"
                                style={{
                                    background:
                                        'color-mix(in srgb, var(--preview-text) 10%, transparent)',
                                }}
                            >
                                <div
                                    className="h-full w-2/3 rounded-full"
                                    style={{
                                        background:
                                            'var(--preview-primary)',
                                    }}
                                />
                            </div>
                        </article>
                    </main>
                </div>
            </div>
        )
    }

    function renderPublicPreview() {
        if (!publicSiteEnabled) {
            return (
                <div
                    className="flex min-h-[430px] items-center justify-center p-8 text-center"
                    style={{
                        background:
                            'var(--preview-background)',
                        color:
                            'var(--preview-text)',
                    }}
                >
                    <div
                        className="max-w-md rounded-3xl p-8"
                        style={{
                            background:
                                'var(--preview-surface)',
                        }}
                    >
                        <p className="text-lg font-bold">
                            Public website disabled
                        </p>

                        <p className="mt-3 text-sm leading-6 opacity-70">
                            Enable the public website in
                            Organisation Details to preview
                            the customer-facing experience.
                        </p>
                    </div>
                </div>
            )
        }

        return (
            <div
                className="min-h-[430px]"
                style={{
                    background:
                        'var(--preview-background)',
                    color:
                        'var(--preview-text)',
                }}
            >
                <header
                    className="flex items-center justify-between border-b px-5 py-4"
                    style={{
                        background:
                            'var(--preview-surface)',
                        borderColor:
                            'color-mix(in srgb, var(--preview-text) 12%, transparent)',
                    }}
                >
                    <div className="flex items-center gap-3">
                        {renderLogo(
                            'flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl font-bold'
                        )}

                        <p className="font-bold">
                            {displayName}
                        </p>
                    </div>

                    <nav className="hidden gap-5 text-xs font-semibold md:flex">
                        <span>Home</span>
                        <span>Fixtures</span>
                        <span>Results</span>
                        <span>News</span>
                    </nav>
                </header>

                <section className="grid gap-6 px-6 py-8 md:grid-cols-[1.2fr_0.8fr] md:px-8">
                    <div>
                        <p
                            className="text-xs font-bold uppercase tracking-[0.2em]"
                            style={{
                                color:
                                    'var(--preview-primary)',
                            }}
                        >
                            Official competition website
                        </p>

                        <h3 className="mt-3 max-w-xl text-3xl font-black leading-tight">
                            Follow every fixture, result and
                            tournament update.
                        </h3>

                        <p className="mt-4 max-w-xl text-sm leading-6 opacity-72">
                            Welcome to the official public
                            website for {displayName}.
                        </p>

                        <button
                            type="button"
                            className="mt-6 rounded-xl px-5 py-3 text-sm font-bold"
                            style={{
                                background:
                                    'var(--preview-accent)',
                                color:
                                    'var(--preview-secondary)',
                            }}
                        >
                            View fixtures
                        </button>
                    </div>

                    <article
                        className="rounded-3xl p-5"
                        style={{
                            background:
                                'var(--preview-surface)',
                        }}
                    >
                        <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-60">
                            Next fixture
                        </p>

                        <div className="mt-5 flex items-center justify-between gap-3">
                            <div className="text-center">
                                <div
                                    className="mx-auto h-12 w-12 rounded-full"
                                    style={{
                                        background:
                                            'var(--preview-primary)',
                                    }}
                                />
                                <p className="mt-2 text-xs font-semibold">
                                    Home
                                </p>
                            </div>

                            <div className="text-center">
                                <p className="text-lg font-black">
                                    15:00
                                </p>
                                <p className="text-xs opacity-60">
                                    Saturday
                                </p>
                            </div>

                            <div className="text-center">
                                <div
                                    className="mx-auto h-12 w-12 rounded-full"
                                    style={{
                                        background:
                                            'var(--preview-accent)',
                                    }}
                                />
                                <p className="mt-2 text-xs font-semibold">
                                    Away
                                </p>
                            </div>
                        </div>
                    </article>
                </section>

                <section className="grid gap-4 px-6 pb-8 md:grid-cols-3 md:px-8">
                    {[
                        ['Latest result', '2 – 1'],
                        ['Competitions', '4 active'],
                        ['Latest news', 'Tournament update'],
                    ].map(([title, value]) => (
                        <article
                            key={title}
                            className="rounded-2xl p-4"
                            style={{
                                background:
                                    'var(--preview-surface)',
                            }}
                        >
                            <p className="text-xs opacity-60">
                                {title}
                            </p>

                            <p className="mt-2 font-bold">
                                {value}
                            </p>
                        </article>
                    ))}
                </section>
            </div>
        )
    }

    return (
        <section
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            style={previewStyle}
            aria-label="Organisation branding preview"
        >
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-semibold text-slate-900">
                        Live preview
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        Switch between the customer portal and
                        public website.
                    </p>
                </div>

                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                    <button
                        type="button"
                        onClick={() =>
                            setMode('admin')
                        }
                        className={[
                            'rounded-lg px-3 py-2 text-xs font-semibold transition',
                            mode === 'admin'
                                ? 'bg-white text-slate-950 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800',
                        ].join(' ')}
                    >
                        Admin portal
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setMode('public')
                        }
                        className={[
                            'rounded-lg px-3 py-2 text-xs font-semibold transition',
                            mode === 'public'
                                ? 'bg-white text-slate-950 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800',
                        ].join(' ')}
                    >
                        Public website
                    </button>
                </div>
            </div>

            {mode === 'admin'
                ? renderAdminPreview()
                : renderPublicPreview()}
        </section>
    )
}
