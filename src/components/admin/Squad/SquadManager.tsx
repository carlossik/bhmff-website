import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import type {
    FormEvent,
} from 'react'
import {
    Download,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Upload,
    UserRound,
    Users,
} from 'lucide-react'

import {
    useOrganisation,
} from '../../../context/OrganisationContext'
import {
    ConfirmDialog,
} from '../../common/ConfirmDialog/ConfirmDialog'
import {
    TournamentHQBrand,
} from '../../common/TournamentHQBrand'
import {
    ClubTeamSeasonSelector,
} from '../ClubTeams/ClubTeamSeasonSelector'
import {
    TeamPaymentSettings,
} from '../ClubTeams/TeamPaymentSettings'
import {
    clubTeamSeasonService,
} from '../ClubTeams/clubTeamSeasonService'
import type {
    ClubTeamSeason,
} from '../ClubTeams/clubTeamSeasonTypes'
import {
    clubFixtureService,
} from '../Fixtures/clubFixtureService'
import type {
    ClubSeason,
} from '../Fixtures/clubFixtureTypes'
import {
    clubSquadService,
} from './clubSquadService'
import type {
    ClubPaymentStatus,
    ClubPlayerRegistrationStatus,
    ClubSquadCsvRow,
    ClubSquadMember,
    ClubSquadMemberFormValues,
} from './squadTypes'

const emptyForm:
    ClubSquadMemberFormValues = {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        squad_number: '',
        position: '',
        registration_status:
            'pending',
        sign_on_fee_amount: '0',
        sign_on_fee_status:
            'not_due',
        notes: '',
        active: true,
    }

const registrationOptions:
Array<{
    value:
        ClubPlayerRegistrationStatus
    label: string
}> = [
    {
        value: 'pending',
        label: 'Pending',
    },
    {
        value: 'registered',
        label: 'Registered',
    },
    {
        value: 'trialist',
        label: 'Trialist',
    },
    {
        value: 'not_registered',
        label: 'Not registered',
    },
    {
        value: 'inactive',
        label: 'Inactive',
    },
]

const paymentOptions:
Array<{
    value: ClubPaymentStatus
    label: string
}> = [
    {
        value: 'not_due',
        label: 'Not due',
    },
    {
        value: 'due',
        label: 'Due',
    },
    {
        value: 'part_paid',
        label: 'Part paid',
    },
    {
        value: 'paid',
        label: 'Paid',
    },
    {
        value: 'waived',
        label: 'Waived',
    },
]

function csvEscape(
    value:
        | string
        | number
        | null,
): string {
    const text =
        value === null
            ? ''
            : String(value)

    return `"${text
        .split('"')
        .join('""')}"`
}

function parseCsvLine(
    line: string,
): string[] {
    const values: string[] = []
    let current = ''
    let quoted = false

    for (
        let index = 0;
        index < line.length;
        index += 1
    ) {
        const character =
            line[index]

        if (character === '"') {
            if (
                quoted &&
                line[index + 1] ===
                    '"'
            ) {
                current += '"'
                index += 1
            } else {
                quoted = !quoted
            }
        } else if (
            character === ',' &&
            !quoted
        ) {
            values.push(
                current.trim(),
            )
            current = ''
        } else {
            current += character
        }
    }

    values.push(current.trim())
    return values
}

function normaliseRegistration(
    value: string,
): ClubPlayerRegistrationStatus {
    const normalised =
        value
            .trim()
            .toLowerCase()
            .split(' ')
            .join('_')

    return registrationOptions.some(
        option =>
            option.value ===
            normalised,
    )
        ? normalised as
              ClubPlayerRegistrationStatus
        : 'pending'
}

function normalisePayment(
    value: string,
): ClubPaymentStatus {
    const normalised =
        value
            .trim()
            .toLowerCase()
            .split(' ')
            .join('_')

    return paymentOptions.some(
        option =>
            option.value ===
            normalised,
    )
        ? normalised as
              ClubPaymentStatus
        : 'not_due'
}

function teamStorageKey(
    organisationId: string,
    seasonId: string,
): string {
    return `tournamenthq-club-team:${organisationId}:${seasonId}`
}

export function SquadManager() {
    const {
        currentOrganisation,
    } = useOrganisation()

    const organisationId =
        currentOrganisation?.id ??
        null

    const fileInputRef =
        useRef<HTMLInputElement | null>(
            null,
        )

    const [seasons, setSeasons] =
        useState<ClubSeason[]>([])

    const [seasonId, setSeasonId] =
        useState('')

    const [
        teamSeasons,
        setTeamSeasons,
    ] =
        useState<ClubTeamSeason[]>(
            [],
        )

    const [teamId, setTeamId] =
        useState('')

    const [members, setMembers] =
        useState<
            ClubSquadMember[]
        >([])

    const [search, setSearch] =
        useState('')

    const [loading, setLoading] =
        useState(true)

    const [
        loadingTeams,
        setLoadingTeams,
    ] = useState(false)

    const [saving, setSaving] =
        useState(false)

    const [
        showForm,
        setShowForm,
    ] = useState(false)

    const [
        editingMember,
        setEditingMember,
    ] =
        useState<ClubSquadMember | null>(
            null,
        )

    const [
        memberToRemove,
        setMemberToRemove,
    ] =
        useState<ClubSquadMember | null>(
            null,
        )

    const [form, setForm] =
        useState<
            ClubSquadMemberFormValues
        >(emptyForm)

    const [error, setError] =
        useState<string | null>(
            null,
        )

    const [notice, setNotice] =
        useState<string | null>(
            null,
        )

    const selectedSeason =
        useMemo(
            () =>
                seasons.find(
                    season =>
                        season.id ===
                        seasonId,
                ) ?? null,
            [
                seasonId,
                seasons,
            ],
        )

    const selectedTeamSeason =
        useMemo(
            () =>
                teamSeasons.find(
                    item =>
                        item.team_id ===
                        teamId,
                ) ?? null,
            [
                teamId,
                teamSeasons,
            ],
        )

    const loadSeasons =
        useCallback(
            async () => {
                if (!organisationId) {
                    setSeasons([])
                    setSeasonId('')
                    return
                }

                const rows =
                    await clubFixtureService
                        .getSeasons(
                            organisationId,
                        )

                setSeasons(rows)

                setSeasonId(
                    previous => {
                        if (
                            rows.some(
                                season =>
                                    season.id ===
                                    previous,
                            )
                        ) {
                            return previous
                        }

                        return (
                            rows.find(
                                season =>
                                    season.status ===
                                    'active',
                            )?.id ??
                            rows[0]
                                ?.id ??
                            ''
                        )
                    },
                )
            },
            [organisationId],
        )

    const loadTeamSeasons =
        useCallback(
            async () => {
                if (
                    !organisationId ||
                    !seasonId
                ) {
                    setTeamSeasons(
                        [],
                    )
                    setTeamId('')
                    return
                }

                try {
                    setLoadingTeams(
                        true,
                    )

                    const rows =
                        await clubTeamSeasonService
                            .getTeamSeasons(
                                organisationId,
                                seasonId,
                            )

                    setTeamSeasons(
                        rows,
                    )

                    const stored =
                        window.localStorage
                            .getItem(
                                teamStorageKey(
                                    organisationId,
                                    seasonId,
                                ),
                            )

                    setTeamId(
                        previous => {
                            if (
                                rows.some(
                                    row =>
                                        row.team_id ===
                                        previous,
                                )
                            ) {
                                return previous
                            }

                            if (
                                stored &&
                                rows.some(
                                    row =>
                                        row.team_id ===
                                        stored,
                                )
                            ) {
                                return stored
                            }

                            return (
                                rows[0]
                                    ?.team_id ??
                                ''
                            )
                        },
                    )
                } finally {
                    setLoadingTeams(
                        false,
                    )
                }
            },
            [
                organisationId,
                seasonId,
            ],
        )

    const loadSquad =
        useCallback(
            async () => {
                if (
                    !organisationId ||
                    !seasonId ||
                    !teamId
                ) {
                    setMembers([])
                    setLoading(false)
                    return
                }

                try {
                    setLoading(true)
                    setError(null)

                    setMembers(
                        await clubSquadService
                            .getSquad(
                                organisationId,
                                seasonId,
                                teamId,
                            ),
                    )
                } catch (
                    caughtError
                ) {
                    console.error(
                        caughtError,
                    )

                    setMembers([])

                    setError(
                        caughtError instanceof
                            Error
                            ? caughtError.message
                            : 'Unable to load squad.',
                    )
                } finally {
                    setLoading(false)
                }
            },
            [
                organisationId,
                seasonId,
                teamId,
            ],
        )

    useEffect(() => {
        void loadSeasons().catch(
            caughtError => {
                console.error(
                    caughtError,
                )

                setError(
                    caughtError instanceof
                        Error
                        ? caughtError.message
                        : 'Unable to load seasons.',
                )

                setLoading(false)
            },
        )
    }, [loadSeasons])

    useEffect(() => {
        void loadTeamSeasons().catch(
            caughtError => {
                console.error(
                    caughtError,
                )

                setError(
                    caughtError instanceof
                        Error
                        ? caughtError.message
                        : 'Unable to load teams for this season.',
                )
            },
        )
    }, [loadTeamSeasons])

    useEffect(() => {
        void loadSquad()
    }, [loadSquad])

    const filteredMembers =
        useMemo(() => {
            const term =
                search
                    .trim()
                    .toLowerCase()

            if (!term) {
                return members
            }

            return members.filter(
                member =>
                    `${member.player.first_name} ${member.player.last_name}`
                        .toLowerCase()
                        .includes(
                            term,
                        ) ||
                    (
                        member.position ??
                        ''
                    )
                        .toLowerCase()
                        .includes(
                            term,
                        ) ||
                    String(
                        member.squad_number ??
                            '',
                    ).includes(
                        term,
                    ),
            )
        }, [
            members,
            search,
        ])

    const outstandingCount =
        useMemo(
            () =>
                members.filter(
                    member =>
                        [
                            'due',
                            'part_paid',
                        ].includes(
                            member.sign_on_fee_status,
                        ),
                ).length,
            [members],
        )

    function handleTeamChange(
        nextTeamId: string,
    ) {
        setTeamId(nextTeamId)
        setSearch('')
        setNotice(null)
        setShowForm(false)
        setEditingMember(null)

        if (
            organisationId &&
            seasonId &&
            nextTeamId
        ) {
            window.localStorage.setItem(
                teamStorageKey(
                    organisationId,
                    seasonId,
                ),
                nextTeamId,
            )
        }
    }

    function updateForm<
        K extends keyof ClubSquadMemberFormValues,
    >(
        key: K,
        value:
            ClubSquadMemberFormValues[K],
    ) {
        setForm(
            previous => ({
                ...previous,
                [key]: value,
            }),
        )
    }

    function openCreate() {
        setEditingMember(null)
        setForm(emptyForm)
        setShowForm(true)
        setError(null)
    }

    function openEdit(
        member: ClubSquadMember,
    ) {
        setEditingMember(member)

        setForm({
            first_name:
                member.player
                    .first_name,
            last_name:
                member.player
                    .last_name,
            email:
                member.player.email ??
                '',
            phone:
                member.player.phone ??
                '',
            squad_number:
                member.squad_number ===
                null
                    ? ''
                    : String(
                          member.squad_number,
                      ),
            position:
                member.position ??
                '',
            registration_status:
                member.registration_status,
            sign_on_fee_amount:
                String(
                    member.sign_on_fee_amount,
                ),
            sign_on_fee_status:
                member.sign_on_fee_status,
            notes:
                member.notes ?? '',
            active:
                member.active,
        })

        setShowForm(true)
        setError(null)
    }

    async function saveMember(
        event: FormEvent,
    ) {
        event.preventDefault()

        if (
            !organisationId ||
            !seasonId ||
            !teamId
        ) {
            setError(
                'Select a season and team before adding players.',
            )
            return
        }

        if (
            !form.first_name.trim() ||
            !form.last_name.trim()
        ) {
            setError(
                'First name and last name are required.',
            )
            return
        }

        try {
            setSaving(true)
            setError(null)

            if (editingMember) {
                await clubSquadService
                    .updateMember(
                        editingMember,
                        form,
                    )
            } else {
                await clubSquadService
                    .createMember(
                        organisationId,
                        seasonId,
                        teamId,
                        form,
                    )
            }

            setShowForm(false)
            setEditingMember(null)
            setForm(emptyForm)

            setNotice(
                editingMember
                    ? 'Player updated.'
                    : 'Player added to squad.',
            )

            await loadSquad()
        } catch (caughtError) {
            console.error(
                caughtError,
            )

            setError(
                caughtError instanceof
                    Error
                    ? caughtError.message
                    : 'Unable to save player.',
            )
        } finally {
            setSaving(false)
        }
    }

    async function removeMember() {
        if (!memberToRemove) {
            return
        }

        try {
            setSaving(true)

            await clubSquadService
                .removeMember(
                    memberToRemove,
                )

            setMemberToRemove(null)

            setNotice(
                'Player removed from this team squad.',
            )

            await loadSquad()
        } catch (caughtError) {
            console.error(
                caughtError,
            )

            setError(
                caughtError instanceof
                    Error
                    ? caughtError.message
                    : 'Unable to remove player.',
            )
        } finally {
            setSaving(false)
        }
    }

    function exportCsv() {
        const headers = [
            'first_name',
            'last_name',
            'email',
            'phone',
            'squad_number',
            'position',
            'registration_status',
            'sign_on_fee_amount',
            'sign_on_fee_status',
            'notes',
        ]

        const rows =
            members.map(
                member =>
                    [
                        member.player
                            .first_name,
                        member.player
                            .last_name,
                        member.player
                            .email ??
                            '',
                        member.player
                            .phone ??
                            '',
                        member.squad_number,
                        member.position ??
                            '',
                        member.registration_status,
                        member.sign_on_fee_amount,
                        member.sign_on_fee_status,
                        member.notes ??
                            '',
                    ]
                        .map(
                            csvEscape,
                        )
                        .join(
                            ',',
                        ),
            )

        const csv = [
            headers.join(','),
            ...rows,
        ].join('\n')

        const blob =
            new Blob(
                [csv],
                {
                    type: 'text/csv;charset=utf-8',
                },
            )

        const url =
            URL.createObjectURL(
                blob,
            )

        const anchor =
            document.createElement(
                'a',
            )

        anchor.href = url

        anchor.download =
            `${
                currentOrganisation
                    ?.slug ??
                'club'
            }-${
                selectedTeamSeason
                    ?.team.name ??
                'team'
            }-${
                selectedSeason
                    ?.season_label ??
                'squad'
            }.csv`
                .toLowerCase()
                .split(' ')
                .join('-')

        anchor.click()

        URL.revokeObjectURL(
            url,
        )
    }

    async function importCsv(
        file: File,
    ) {
        if (
            !organisationId ||
            !seasonId ||
            !teamId
        ) {
            setError(
                'Select a season and team before importing players.',
            )
            return
        }

        try {
            setSaving(true)
            setError(null)

            const text =
                await file.text()

            const lines =
                text
                    .split('\r\n')
                    .join('\n')
                    .split('\r')
                    .join('\n')
                    .split('\n')
                    .filter(
                        (line: string) =>
                            Boolean(line.trim()),
                    )

            if (
                lines.length < 2
            ) {
                throw new Error(
                    'The CSV does not contain any player rows.',
                )
            }

            const headers =
                parseCsvLine(
                    lines[0],
                ).map(
                    (header: string) =>
                        header
                            .trim()
                            .toLowerCase(),
                )

            const required = [
                'first_name',
                'last_name',
            ]

            if (
                required.some(
                    header =>
                        !headers.includes(
                            header,
                        ),
                )
            ) {
                throw new Error(
                    'CSV must include first_name and last_name columns.',
                )
            }

            const rows:
                ClubSquadCsvRow[] =
                lines
                    .slice(1)
                    .map(
                        (line: string) => {
                            const values =
                                parseCsvLine(
                                    line,
                                )

                            const value =
                                (
                                    name:
                                        string,
                                ) =>
                                    values[
                                        headers.indexOf(
                                            name,
                                        )
                                    ] ??
                                    ''

                            return {
                                first_name:
                                    value(
                                        'first_name',
                                    ),
                                last_name:
                                    value(
                                        'last_name',
                                    ),
                                email:
                                    value(
                                        'email',
                                    ),
                                phone:
                                    value(
                                        'phone',
                                    ),
                                squad_number:
                                    value(
                                        'squad_number',
                                    ),
                                position:
                                    value(
                                        'position',
                                    ),
                                registration_status:
                                    value(
                                        'registration_status',
                                    ),
                                sign_on_fee_amount:
                                    value(
                                        'sign_on_fee_amount',
                                    ),
                                sign_on_fee_status:
                                    value(
                                        'sign_on_fee_status',
                                    ),
                                notes:
                                    value(
                                        'notes',
                                    ),
                            }
                        },
                    )
                    .filter(
                        (row: ClubSquadCsvRow) =>
                            Boolean(
                                row.first_name.trim() &&
                                row.last_name.trim(),
                            ),
                    )

            for (
                const row of rows
            ) {
                await clubSquadService
                    .createMember(
                        organisationId,
                        seasonId,
                        teamId,
                        {
                            first_name:
                                row.first_name,
                            last_name:
                                row.last_name,
                            email:
                                row.email,
                            phone:
                                row.phone,
                            squad_number:
                                row.squad_number,
                            position:
                                row.position,
                            registration_status:
                                normaliseRegistration(
                                    row.registration_status,
                                ),
                            sign_on_fee_amount:
                                row.sign_on_fee_amount ||
                                '0',
                            sign_on_fee_status:
                                normalisePayment(
                                    row.sign_on_fee_status,
                                ),
                            notes:
                                row.notes,
                            active:
                                true,
                        },
                    )
            }

            setNotice(
                `${rows.length} player${
                    rows.length === 1
                        ? ''
                        : 's'
                } imported.`,
            )

            await loadSquad()
        } catch (caughtError) {
            console.error(
                caughtError,
            )

            setError(
                caughtError instanceof
                    Error
                    ? caughtError.message
                    : 'Unable to import CSV.',
            )
        } finally {
            setSaving(false)

            if (
                fileInputRef.current
            ) {
                fileInputRef.current.value =
                    ''
            }
        }
    }

    if (!organisationId) {
        return (
            <div className="rounded-2xl border border-white/10 bg-[#0b1510] p-8 text-sm text-slate-400">
                Select a club before managing its squad.
            </div>
        )
    }

    return (
        <div className="space-y-5">
            <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#0b1510] p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8cf566]">
                        Club Operations
                    </p>

                    <h2 className="mt-1 !text-2xl !leading-tight font-black text-white">
                        Squad
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                        Manage registered players and trialists by team and season. Match availability is independent of payment status; one-off signing-on fees remain tracked separately.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <input
                        ref={
                            fileInputRef
                        }
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={event => {
                            const file =
                                event
                                    .target
                                    .files?.[0]

                            if (file) {
                                void importCsv(
                                    file,
                                )
                            }
                        }}
                    />

                    <button
                        type="button"
                        disabled={
                            !seasonId ||
                            !teamId ||
                            saving
                        }
                        onClick={() =>
                            fileInputRef.current
                                ?.click()
                        }
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-bold text-white disabled:opacity-40"
                    >
                        <Upload className="h-4 w-4" />
                        Import CSV
                    </button>

                    <button
                        type="button"
                        disabled={
                            !seasonId ||
                            !teamId ||
                            members.length ===
                                0
                        }
                        onClick={
                            exportCsv
                        }
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-bold text-white disabled:opacity-40"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>

                    <button
                        type="button"
                        disabled={
                            !seasonId ||
                            !teamId
                        }
                        onClick={
                            openCreate
                        }
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#8cf566] px-4 text-sm font-black text-[#061008] disabled:opacity-40"
                    >
                        <Plus className="h-4 w-4" />
                        Add Player
                    </button>
                </div>
            </section>

            {error && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
                    {error}
                </div>
            )}

            {notice && (
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">
                    {notice}
                </div>
            )}

            <section className="grid gap-3 md:grid-cols-[minmax(220px,320px)_1fr_auto]">
                <label className="text-sm font-semibold text-slate-300">
                    Season
                    <select
                        value={
                            seasonId
                        }
                        onChange={event => {
                            setSeasonId(
                                event.target
                                    .value,
                            )
                            setTeamId('')
                            setSearch('')
                        }}
                        className="mt-1 block min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"
                    >
                        <option value="">
                            Select season
                        </option>

                        {seasons.map(
                            season => (
                                <option
                                    key={
                                        season.id
                                    }
                                    value={
                                        season.id
                                    }
                                >
                                    {
                                        season.name
                                    }{' '}
                                    (
                                    {
                                        season.season_label
                                    }
                                    )
                                </option>
                            ),
                        )}
                    </select>
                </label>

                <label className="text-sm font-semibold text-slate-300">
                    Search squad
                    <span className="mt-1 flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#071009] px-3">
                        <Search className="h-4 w-4 text-slate-500" />

                        <input
                            value={
                                search
                            }
                            onChange={event =>
                                setSearch(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            placeholder="Name, position or number"
                            className="w-full bg-transparent text-sm text-white outline-none"
                        />
                    </span>
                </label>

                <button
                    type="button"
                    onClick={() => {
                        void loadTeamSeasons()
                        void loadSquad()
                    }}
                    className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-bold text-white"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </button>
            </section>

            {seasonId && (
                <ClubTeamSeasonSelector
                    teamSeasons={
                        teamSeasons
                    }
                    value={teamId}
                    onChange={
                        handleTeamChange
                    }
                    disabled={
                        loadingTeams
                    }
                />
            )}

            {selectedTeamSeason && (
                <TeamPaymentSettings
                    teamSeason={
                        selectedTeamSeason
                    }
                    onSaved={
                        loadTeamSeasons
                    }
                />
            )}

            <section className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-[#0b1510] p-4">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Squad size
                    </span>
                    <strong className="mt-1 block text-2xl text-white">
                        {
                            members.length
                        }
                    </strong>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0b1510] p-4">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Registered
                    </span>
                    <strong className="mt-1 block text-2xl text-white">
                        {
                            members.filter(
                                member =>
                                    member.registration_status ===
                                    'registered',
                            ).length
                        }
                    </strong>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0b1510] p-4">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Signing-on fees to chase
                    </span>
                    <strong className="mt-1 block text-2xl text-white">
                        {
                            outstandingCount
                        }
                    </strong>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1510]">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-white/10 bg-black/20 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3">
                                    #
                                </th>
                                <th className="px-4 py-3">
                                    Player
                                </th>
                                <th className="px-4 py-3">
                                    Position
                                </th>
                                <th className="px-4 py-3">
                                    Registration
                                </th>
                                <th className="px-4 py-3">
                                    Signing-on
                                </th>
                                <th className="px-4 py-3 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-white/10">
                            {loading && (
                                <tr>
                                    <td
                                        colSpan={
                                            6
                                        }
                                        className="px-4 py-12 text-center text-slate-400"
                                    >
                                        Loading squad...
                                    </td>
                                </tr>
                            )}

                            {!loading &&
                                (!seasonId ||
                                    !teamId) && (
                                    <tr>
                                        <td
                                            colSpan={
                                                6
                                            }
                                            className="px-4 py-12 text-center text-slate-400"
                                        >
                                            Select a season and team to manage its squad.
                                        </td>
                                    </tr>
                                )}

                            {!loading &&
                                seasonId &&
                                teamId &&
                                filteredMembers.length ===
                                    0 && (
                                    <tr>
                                        <td
                                            colSpan={
                                                6
                                            }
                                            className="px-4 py-12 text-center"
                                        >
                                            <Users className="mx-auto h-7 w-7 text-[#8cf566]" />

                                            <strong className="mt-3 block text-white">
                                                No squad players yet.
                                            </strong>

                                            <button
                                                type="button"
                                                onClick={
                                                    openCreate
                                                }
                                                className="mt-3 text-sm font-bold text-[#8cf566]"
                                            >
                                                Add the first player
                                            </button>
                                        </td>
                                    </tr>
                                )}

                            {!loading &&
                                filteredMembers.map(
                                    member => (
                                        <tr
                                            key={
                                                member.id
                                            }
                                            className="text-slate-300"
                                        >
                                            <td className="px-4 py-3 font-black text-white">
                                                {member.squad_number ??
                                                    '—'}
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="grid h-9 w-9 place-items-center rounded-full bg-white/5">
                                                        <UserRound className="h-4 w-4" />
                                                    </span>

                                                    <div>
                                                        <strong className="block text-white">
                                                            {
                                                                member
                                                                    .player
                                                                    .first_name
                                                            }{' '}
                                                            {
                                                                member
                                                                    .player
                                                                    .last_name
                                                            }
                                                        </strong>

                                                        <span className="text-xs text-slate-500">
                                                            {member
                                                                .player
                                                                .email ??
                                                                'No email'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3">
                                                {member.position ??
                                                    '—'}
                                            </td>

                                            <td className="px-4 py-3">
                                                {
                                                    registrationOptions.find(
                                                        option =>
                                                            option.value ===
                                                            member.registration_status,
                                                    )
                                                        ?.label
                                                }
                                            </td>

                                            <td className="px-4 py-3">
                                                £
                                                {member.sign_on_fee_amount.toFixed(
                                                    2,
                                                )}{' '}
                                                ·{' '}
                                                {
                                                    paymentOptions.find(
                                                        option =>
                                                            option.value ===
                                                            member.sign_on_fee_status,
                                                    )
                                                        ?.label
                                                }
                                            </td>

                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openEdit(
                                                            member,
                                                        )
                                                    }
                                                    className="mr-2 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-[#8cf566]"
                                                    title="Edit player"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setMemberToRemove(
                                                            member,
                                                        )
                                                    }
                                                    className="rounded-lg border border-red-400/20 px-3 py-2 text-xs font-bold text-red-200"
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ),
                                )}
                        </tbody>
                    </table>
                </div>
            </section>

            {showForm &&
                selectedTeamSeason && (
                    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
                        <form
                            onSubmit={
                                saveMember
                            }
                            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-lime-900/60 bg-[#0b1510] shadow-2xl"
                        >
                            <header className="flex items-start justify-between gap-4 border-b border-white/10 bg-black/20 p-6">
                                <div className="flex items-start gap-4">
                                    <TournamentHQBrand
                                        variant="full"
                                        size="sm"
                                    />

                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8cf566]">
                                            {
                                                selectedTeamSeason
                                                    .team
                                                    .name
                                            }{' '}
                                            ·{' '}
                                            {selectedSeason?.season_label ??
                                                'Season'}{' '}
                                            Squad
                                        </p>

                                        <h3 className="mt-1 !text-xl !leading-tight font-black text-white">
                                            {editingMember
                                                ? 'Edit Player'
                                                : 'Add Player'}
                                        </h3>

                                        <p className="mt-1 text-xs text-slate-400">
                                            Player registration tracks the one-off signing-on fee only. Recurring payments follow the team payment policy.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    disabled={
                                        saving
                                    }
                                    onClick={() =>
                                        setShowForm(
                                            false,
                                        )
                                    }
                                    className="text-sm font-bold text-slate-400"
                                >
                                    Close
                                </button>
                            </header>

                            <div className="grid gap-4 p-6 md:grid-cols-2">
                                <label className="text-sm font-semibold text-slate-300">
                                    First name
                                    <input
                                        value={
                                            form.first_name
                                        }
                                        onChange={event =>
                                            updateForm(
                                                'first_name',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"
                                    />
                                </label>

                                <label className="text-sm font-semibold text-slate-300">
                                    Last name
                                    <input
                                        value={
                                            form.last_name
                                        }
                                        onChange={event =>
                                            updateForm(
                                                'last_name',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"
                                    />
                                </label>

                                <label className="text-sm font-semibold text-slate-300">
                                    Squad number
                                    <input
                                        type="number"
                                        min="0"
                                        max="999"
                                        value={
                                            form.squad_number
                                        }
                                        onChange={event =>
                                            updateForm(
                                                'squad_number',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"
                                    />
                                </label>

                                <label className="text-sm font-semibold text-slate-300">
                                    Position
                                    <input
                                        value={
                                            form.position
                                        }
                                        onChange={event =>
                                            updateForm(
                                                'position',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        placeholder="e.g. Centre Back"
                                        className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"
                                    />
                                </label>

                                <label className="text-sm font-semibold text-slate-300">
                                    Email
                                    <input
                                        type="email"
                                        value={
                                            form.email
                                        }
                                        onChange={event =>
                                            updateForm(
                                                'email',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"
                                    />
                                </label>

                                <label className="text-sm font-semibold text-slate-300">
                                    Phone
                                    <input
                                        value={
                                            form.phone
                                        }
                                        onChange={event =>
                                            updateForm(
                                                'phone',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"
                                    />
                                </label>

                                <label className="text-sm font-semibold text-slate-300">
                                    Registration
                                    <select
                                        value={
                                            form.registration_status
                                        }
                                        onChange={event =>
                                            updateForm(
                                                'registration_status',
                                                event
                                                    .target
                                                    .value as
                                                    ClubPlayerRegistrationStatus,
                                            )
                                        }
                                        className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"
                                    >
                                        {registrationOptions.map(
                                            option => (
                                                <option
                                                    key={
                                                        option.value
                                                    }
                                                    value={
                                                        option.value
                                                    }
                                                >
                                                    {
                                                        option.label
                                                    }
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </label>

                                <div />

                                <label className="text-sm font-semibold text-slate-300">
                                    Signing-on fee (£)
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            form.sign_on_fee_amount
                                        }
                                        onChange={event =>
                                            updateForm(
                                                'sign_on_fee_amount',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"
                                    />
                                </label>

                                <label className="text-sm font-semibold text-slate-300">
                                    Signing-on status
                                    <select
                                        value={
                                            form.sign_on_fee_status
                                        }
                                        onChange={event =>
                                            updateForm(
                                                'sign_on_fee_status',
                                                event
                                                    .target
                                                    .value as
                                                    ClubPaymentStatus,
                                            )
                                        }
                                        className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"
                                    >
                                        {paymentOptions.map(
                                            option => (
                                                <option
                                                    key={
                                                        option.value
                                                    }
                                                    value={
                                                        option.value
                                                    }
                                                >
                                                    {
                                                        option.label
                                                    }
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </label>

                                <label className="text-sm font-semibold text-slate-300 md:col-span-2">
                                    Notes
                                    <textarea
                                        rows={3}
                                        value={
                                            form.notes
                                        }
                                        onChange={event =>
                                            updateForm(
                                                'notes',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#071009] px-3 py-2 text-white"
                                    />
                                </label>

                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 md:col-span-2">
                                    <input
                                        type="checkbox"
                                        checked={
                                            form.active
                                        }
                                        onChange={event =>
                                            updateForm(
                                                'active',
                                                event
                                                    .target
                                                    .checked,
                                            )
                                        }
                                    />
                                    Active squad member
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 border-t border-white/10 p-6">
                                <button
                                    type="button"
                                    disabled={
                                        saving
                                    }
                                    onClick={() =>
                                        setShowForm(
                                            false,
                                        )
                                    }
                                    className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-white"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saving
                                    }
                                    className="rounded-xl bg-[#8cf566] px-5 py-2.5 text-sm font-black text-[#061008] disabled:opacity-50"
                                >
                                    {saving
                                        ? 'Saving...'
                                        : editingMember
                                          ? 'Save Changes'
                                          : 'Add Player'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

            <ConfirmDialog
                open={
                    !!memberToRemove
                }
                title="Remove Player"
                message={
                    memberToRemove
                        ? `Remove ${memberToRemove.player.first_name} ${memberToRemove.player.last_name} from ${selectedTeamSeason?.team.name ?? 'this team'} for this season? The player record remains available for future seasons.`
                        : ''
                }
                confirmLabel="Remove"
                cancelLabel="Cancel"
                isProcessing={saving}
                onConfirm={
                    removeMember
                }
                onCancel={() => {
                    if (!saving) {
                        setMemberToRemove(
                            null,
                        )
                    }
                }}
            />
        </div>
    )
}
