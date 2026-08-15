import {
    CreditCard,
    Save,
    ShieldAlert,
} from 'lucide-react'
import {
    useEffect,
    useState,
} from 'react'

import {
    TournamentHQBrand,
} from '../../common/TournamentHQBrand'
import {
    clubTeamSeasonService,
} from './clubTeamSeasonService'
import type {
    ClubTeamPaymentFormValues,
    ClubTeamPaymentModel,
    ClubTeamSeason,
} from './clubTeamSeasonTypes'

type TeamPaymentSettingsProps = {
    teamSeason: ClubTeamSeason
    onSaved: () => Promise<void> | void
}

const paymentModels: Array<{
    value: ClubTeamPaymentModel
    label: string
    description: string
}> = [
    {
        value: 'none',
        label: 'No recurring payment',
        description:
            'Only one-off registration/signing-on charges are tracked.',
    },
    {
        value: 'matchday',
        label: 'Matchday subs',
        description:
            'A player contribution is tracked against each selected match squad.',
    },
    {
        value: 'monthly',
        label: 'Monthly fees',
        description:
            'A monthly player charge is tracked through the monthly collection ledger.',
    },
    {
        value: 'hybrid',
        label: 'Monthly + matchday',
        description:
            'Track both monthly membership fees and a contribution for each match.',
    },
]

function toForm(
    teamSeason: ClubTeamSeason,
): ClubTeamPaymentFormValues {
    return {
        payment_model:
            teamSeason.payment_model,
        monthly_fee_amount: String(
            teamSeason.monthly_fee_amount,
        ),
        matchday_sub_amount: String(
            teamSeason.matchday_sub_amount,
        ),
        monthly_due_day: String(
            teamSeason.monthly_due_day,
        ),
        yellow_card_fine_amount: String(
            teamSeason.yellow_card_fine_amount,
        ),
        red_card_fine_amount: String(
            teamSeason.red_card_fine_amount,
        ),
        notes: teamSeason.notes ?? '',
    }
}

export function TeamPaymentSettings({
    teamSeason,
    onSaved,
}: TeamPaymentSettingsProps) {
    const [form, setForm] =
        useState<ClubTeamPaymentFormValues>(
            toForm(teamSeason),
        )
    const [saving, setSaving] =
        useState(false)
    const [error, setError] =
        useState<string | null>(null)
    const [notice, setNotice] =
        useState<string | null>(null)

    useEffect(() => {
        setForm(toForm(teamSeason))
        setError(null)
        setNotice(null)
    }, [teamSeason])

    function updateForm<
        K extends keyof ClubTeamPaymentFormValues,
    >(
        key: K,
        value: ClubTeamPaymentFormValues[K],
    ) {
        setForm(previous => ({
            ...previous,
            [key]: value,
        }))
    }

    const usesMonthly =
        form.payment_model === 'monthly' ||
        form.payment_model === 'hybrid'

    const usesMatchday =
        form.payment_model === 'matchday' ||
        form.payment_model === 'hybrid'

    async function save() {
        try {
            setSaving(true)
            setError(null)
            setNotice(null)

            await clubTeamSeasonService
                .updatePaymentPolicy(
                    teamSeason,
                    form,
                )

            await onSaved()

            setNotice(
                `Payment settings saved for ${teamSeason.team.name}.`,
            )
        } catch (caughtError) {
            console.error(caughtError)
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to save team payment settings.',
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1510]">
            <header className="flex flex-col gap-4 border-b border-white/10 bg-black/20 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                    <TournamentHQBrand
                        variant="shield"
                        size="sm"
                    />

                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8cf566]">
                            Team finance policy
                        </p>

                        <h3 className="mt-1 text-lg font-black text-white">
                            {teamSeason.team.name}
                        </h3>

                        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
                            Choose how recurring player payments work for this team in this season. Signing-on fees remain on player registration.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    disabled={saving}
                    onClick={() => void save()}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#8cf566] px-4 text-sm font-black text-[#061008] disabled:opacity-50"
                >
                    <Save className="h-4 w-4" />
                    {saving
                        ? 'Saving...'
                        : 'Save payment settings'}
                </button>
            </header>

            <div className="space-y-5 p-5">
                {error && (
                    <div
                        role="alert"
                        className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200"
                    >
                        {error}
                    </div>
                )}

                {notice && (
                    <div
                        role="status"
                        className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100"
                    >
                        {notice}
                    </div>
                )}

                <div>
                    <div className="mb-3 flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-[#8cf566]" />
                        <h4 className="font-black text-white">
                            Recurring payment structure
                        </h4>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                        {paymentModels.map(option => {
                            const selected =
                                form.payment_model ===
                                option.value

                            return (
                                <button
                                    key={
                                        option.value
                                    }
                                    type="button"
                                    onClick={() =>
                                        updateForm(
                                            'payment_model',
                                            option.value,
                                        )
                                    }
                                    className={`rounded-xl border p-4 text-left transition ${
                                        selected
                                            ? 'border-[#8cf566]/60 bg-[#8cf566]/10'
                                            : 'border-white/10 bg-[#071009] hover:border-white/20'
                                    }`}
                                >
                                    <strong
                                        className={
                                            selected
                                                ? 'text-[#8cf566]'
                                                : 'text-white'
                                        }
                                    >
                                        {
                                            option.label
                                        }
                                    </strong>

                                    <span className="mt-1 block text-xs leading-5 text-slate-400">
                                        {
                                            option.description
                                        }
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {(usesMonthly ||
                    usesMatchday) && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {usesMonthly && (
                            <>
                                <label className="text-sm font-semibold text-slate-300">
                                    Monthly fee (£)
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            form.monthly_fee_amount
                                        }
                                        onChange={event =>
                                            updateForm(
                                                'monthly_fee_amount',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"
                                    />
                                </label>

                                <label className="text-sm font-semibold text-slate-300">
                                    Monthly due day
                                    <input
                                        type="number"
                                        min="1"
                                        max="28"
                                        value={
                                            form.monthly_due_day
                                        }
                                        onChange={event =>
                                            updateForm(
                                                'monthly_due_day',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"
                                    />
                                </label>
                            </>
                        )}

                        {usesMatchday && (
                            <label className="text-sm font-semibold text-slate-300">
                                Matchday sub (£)
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={
                                        form.matchday_sub_amount
                                    }
                                    onChange={event =>
                                        updateForm(
                                            'matchday_sub_amount',
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"
                                />
                            </label>
                        )}
                    </div>
                )}

                <div className="rounded-xl border border-amber-300/15 bg-amber-300/5 p-4">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-amber-300" />
                        <h4 className="font-black text-white">
                            Discipline fine defaults
                        </h4>
                    </div>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                        These are private club finance defaults. Cards may be published as football events, but fine amounts and payment status are never public.
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label className="text-sm font-semibold text-slate-300">
                            Yellow card fine (£)
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                    form.yellow_card_fine_amount
                                }
                                onChange={event =>
                                    updateForm(
                                        'yellow_card_fine_amount',
                                        event.target.value,
                                    )
                                }
                                className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"
                            />
                        </label>

                        <label className="text-sm font-semibold text-slate-300">
                            Red card fine (£)
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                    form.red_card_fine_amount
                                }
                                onChange={event =>
                                    updateForm(
                                        'red_card_fine_amount',
                                        event.target.value,
                                    )
                                }
                                className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"
                            />
                        </label>
                    </div>
                </div>

                <label className="block text-sm font-semibold text-slate-300">
                    Finance notes
                    <textarea
                        rows={3}
                        value={form.notes}
                        onChange={event =>
                            updateForm(
                                'notes',
                                event.target.value,
                            )
                        }
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#071009] px-3 py-2 text-white"
                    />
                </label>
            </div>
        </section>
    )
}
