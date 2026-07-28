import type {
    OrganisationFormData,
} from '../organisationTypes'

type StepOwnerProps = {
    form: OrganisationFormData
    errors: {
        owner_name?: string
        owner_email?: string
        owner_phone?: string
    }
    disabled?: boolean
    onChange: <
        K extends keyof OrganisationFormData,
    >(
        field: K,
        value: OrganisationFormData[K]
    ) => void
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        value.trim()
    )
}

export function StepOwner({
                              form,
                              errors,
                              disabled = false,
                              onChange,
                          }: StepOwnerProps) {
    const emailIsValid =
        !form.owner_email.trim() ||
        isValidEmail(form.owner_email)

    return (
        <section className="space-y-6">
            <div>
                <p className="text-sm font-semibold text-emerald-700">
                    Step 4
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-950">
                    Customer administrator
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Enter the details of the customer who will
                    own and administer this TournamentHQ
                    organisation.
                </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                    <label
                        htmlFor="organisation-wizard-owner-name"
                        className="block text-sm font-semibold text-slate-800"
                    >
                        Administrator name
                        <span className="text-red-600">
                            {' '}
                            *
                        </span>
                    </label>

                    <input
                        id="organisation-wizard-owner-name"
                        type="text"
                        value={form.owner_name}
                        disabled={disabled}
                        placeholder="Carlos Attafuah"
                        autoComplete="name"
                        aria-invalid={Boolean(
                            errors.owner_name
                        )}
                        aria-describedby={
                            errors.owner_name
                                ? 'organisation-wizard-owner-name-error'
                                : undefined
                        }
                        onChange={(event) =>
                            onChange(
                                'owner_name',
                                event.target.value
                            )
                        }
                        className={[
                            'w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition',
                            'placeholder:text-slate-400 focus:ring-4',
                            errors.owner_name
                                ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-100',
                            disabled
                                ? 'cursor-not-allowed bg-slate-100 opacity-70'
                                : '',
                        ].join(' ')}
                    />

                    {errors.owner_name && (
                        <p
                            id="organisation-wizard-owner-name-error"
                            className="text-sm text-red-600"
                        >
                            {errors.owner_name}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="organisation-wizard-owner-email"
                        className="block text-sm font-semibold text-slate-800"
                    >
                        Administrator email
                        <span className="text-red-600">
                            {' '}
                            *
                        </span>
                    </label>

                    <input
                        id="organisation-wizard-owner-email"
                        type="email"
                        value={form.owner_email}
                        disabled={disabled}
                        placeholder="admin@example.com"
                        autoComplete="email"
                        aria-invalid={
                            Boolean(
                                errors.owner_email
                            ) || !emailIsValid
                        }
                        aria-describedby={
                            errors.owner_email ||
                            !emailIsValid
                                ? 'organisation-wizard-owner-email-error'
                                : 'organisation-wizard-owner-email-help'
                        }
                        onChange={(event) =>
                            onChange(
                                'owner_email',
                                event.target.value
                            )
                        }
                        className={[
                            'w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition',
                            'placeholder:text-slate-400 focus:ring-4',
                            errors.owner_email ||
                            !emailIsValid
                                ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-100',
                            disabled
                                ? 'cursor-not-allowed bg-slate-100 opacity-70'
                                : '',
                        ].join(' ')}
                    />

                    {errors.owner_email ||
                    !emailIsValid ? (
                        <p
                            id="organisation-wizard-owner-email-error"
                            className="text-sm text-red-600"
                        >
                            {errors.owner_email ??
                                'Enter a valid email address.'}
                        </p>
                    ) : (
                        <p
                            id="organisation-wizard-owner-email-help"
                            className="text-sm text-slate-500"
                        >
                            This email will be used for the
                            customer invitation and account
                            setup.
                        </p>
                    )}
                </div>

                <div className="space-y-2 md:col-span-2">
                    <label
                        htmlFor="organisation-wizard-owner-phone"
                        className="block text-sm font-semibold text-slate-800"
                    >
                        Phone number
                    </label>

                    <input
                        id="organisation-wizard-owner-phone"
                        type="tel"
                        value={form.owner_phone}
                        disabled={disabled}
                        placeholder="+44 7700 900000"
                        autoComplete="tel"
                        aria-invalid={Boolean(
                            errors.owner_phone
                        )}
                        aria-describedby={
                            errors.owner_phone
                                ? 'organisation-wizard-owner-phone-error'
                                : 'organisation-wizard-owner-phone-help'
                        }
                        onChange={(event) =>
                            onChange(
                                'owner_phone',
                                event.target.value
                            )
                        }
                        className={[
                            'w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition',
                            'placeholder:text-slate-400 focus:ring-4',
                            errors.owner_phone
                                ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-100',
                            disabled
                                ? 'cursor-not-allowed bg-slate-100 opacity-70'
                                : '',
                        ].join(' ')}
                    />

                    {errors.owner_phone ? (
                        <p
                            id="organisation-wizard-owner-phone-error"
                            className="text-sm text-red-600"
                        >
                            {errors.owner_phone}
                        </p>
                    ) : (
                        <p
                            id="organisation-wizard-owner-phone-help"
                            className="text-sm text-slate-500"
                        >
                            Optional. Include the international
                            dialling code where possible.
                        </p>
                    )}
                </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <p className="text-sm font-semibold text-blue-950">
                    Secure customer access
                </p>

                <p className="mt-1 text-sm leading-6 text-blue-800">
                    TournamentHQ will not store or email a
                    password. The administrator will receive a
                    secure invitation and create their own
                    password through Supabase authentication.
                </p>
            </div>
        </section>
    )
}