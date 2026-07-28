import type {
    OrganisationFormData,
} from '../organisationTypes'

type StepOrganisationProps = {
    form: OrganisationFormData
    errors: {
        name?: string
        slug?: string
    }
    disabled?: boolean
    onChange: <
        K extends keyof OrganisationFormData,
    >(
        field: K,
        value: OrganisationFormData[K]
    ) => void
}

function createSlug(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

export function StepOrganisation({
                                     form,
                                     errors,
                                     disabled = false,
                                     onChange,
                                 }: StepOrganisationProps) {
    return (
        <section className="space-y-6">
            <div>
                <p className="text-sm font-semibold text-emerald-700">
                    Step 1
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-950">
                    Organisation details
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Enter the customer organisation details
                    that will be used across the admin portal
                    and public website.
                </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                    <label
                        htmlFor="organisation-wizard-name"
                        className="block text-sm font-semibold text-slate-800"
                    >
                        Organisation name
                        <span className="text-red-600">
                            {' '}
                            *
                        </span>
                    </label>

                    <input
                        id="organisation-wizard-name"
                        type="text"
                        value={form.name}
                        disabled={disabled}
                        autoFocus
                        placeholder="Meridian Football Club"
                        aria-invalid={Boolean(errors.name)}
                        aria-describedby={
                            errors.name
                                ? 'organisation-wizard-name-error'
                                : undefined
                        }
                        onChange={(event) => {
                            const name =
                                event.target.value

                            onChange('name', name)

                            onChange(
                                'slug',
                                createSlug(name)
                            )
                        }}
                        className={[
                            'w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition',
                            'placeholder:text-slate-400 focus:ring-4',
                            errors.name
                                ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-100',
                            disabled
                                ? 'cursor-not-allowed bg-slate-100 opacity-70'
                                : '',
                        ].join(' ')}
                    />

                    {errors.name && (
                        <p
                            id="organisation-wizard-name-error"
                            className="text-sm text-red-600"
                        >
                            {errors.name}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="organisation-wizard-slug"
                        className="block text-sm font-semibold text-slate-800"
                    >
                        Organisation slug
                        <span className="text-red-600">
                            {' '}
                            *
                        </span>
                    </label>

                    <input
                        id="organisation-wizard-slug"
                        type="text"
                        value={form.slug}
                        disabled={disabled}
                        placeholder="meridian-football-club"
                        aria-invalid={Boolean(errors.slug)}
                        aria-describedby={
                            errors.slug
                                ? 'organisation-wizard-slug-error'
                                : 'organisation-wizard-slug-help'
                        }
                        onChange={(event) =>
                            onChange(
                                'slug',
                                createSlug(
                                    event.target.value
                                )
                            )
                        }
                        className={[
                            'w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition',
                            'placeholder:text-slate-400 focus:ring-4',
                            errors.slug
                                ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-100',
                            disabled
                                ? 'cursor-not-allowed bg-slate-100 opacity-70'
                                : '',
                        ].join(' ')}
                    />

                    {errors.slug ? (
                        <p
                            id="organisation-wizard-slug-error"
                            className="text-sm text-red-600"
                        >
                            {errors.slug}
                        </p>
                    ) : (
                        <p
                            id="organisation-wizard-slug-help"
                            className="text-sm text-slate-500"
                        >
                            This will be used in the customer
                            URL, for example:
                            {' '}
                            <span className="font-medium text-slate-700">
                                tournamenthq.co.uk/
                                {form.slug ||
                                    'organisation-name'}
                            </span>
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="organisation-wizard-status"
                        className="block text-sm font-semibold text-slate-800"
                    >
                        Organisation status
                    </label>

                    <select
                        id="organisation-wizard-status"
                        value={form.status}
                        disabled={disabled}
                        onChange={(event) =>
                            onChange(
                                'status',
                                event.target
                                    .value as OrganisationFormData['status']
                            )
                        }
                        className={[
                            'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition',
                            'focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100',
                            disabled
                                ? 'cursor-not-allowed bg-slate-100 opacity-70'
                                : '',
                        ].join(' ')}
                    >
                        <option value="active">
                            Active
                        </option>

                        <option value="inactive">
                            Inactive
                        </option>

                        <option value="suspended">
                            Suspended
                        </option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="organisation-wizard-public-site"
                        className="block text-sm font-semibold text-slate-800"
                    >
                        Public website
                    </label>

                    <label
                        htmlFor="organisation-wizard-public-site"
                        className={[
                            'flex min-h-[50px] items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3',
                            disabled
                                ? 'cursor-not-allowed opacity-70'
                                : 'cursor-pointer',
                        ].join(' ')}
                    >
                        <span>
                            <span className="block text-sm font-medium text-slate-800">
                                Enable public site
                            </span>

                            <span className="mt-0.5 block text-xs text-slate-500">
                                Allow this organisation to
                                publish competitions and
                                results publicly.
                            </span>
                        </span>

                        <input
                            id="organisation-wizard-public-site"
                            type="checkbox"
                            checked={
                                form.public_site_enabled
                            }
                            disabled={disabled}
                            onChange={(event) =>
                                onChange(
                                    'public_site_enabled',
                                    event.target.checked
                                )
                            }
                            className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                    </label>
                </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-900">
                    Customer environment
                </p>

                <p className="mt-1 text-sm leading-6 text-emerald-800">
                    TournamentHQ will use these details to
                    create the organisation workspace, route
                    customer data correctly and prepare its
                    public-facing URL.
                </p>
            </div>
        </section>
    )
}