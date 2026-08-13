import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'

import {
    Download,
    FileSpreadsheet,
    Plus,
    Trash2,
    Upload,
    X,
} from 'lucide-react'

import { useOrganisation } from '../../../context/OrganisationContext'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { Toast } from '../../common/Toast'
import { clubFixtureService } from './clubFixtureService'

import type {
    ClubFixture,
    ClubFixtureFormValues,
    ClubFixtureStatus,
    ClubFixtureType,
    ClubHomeAway,
    ClubOpponent,
    ClubOpponentFormValues,
    ClubSeason,
} from './clubFixtureTypes'

const emptyForm: ClubFixtureFormValues = {
    slot_id: '',
    opponent_id: '',
    fixture_date: '',
    kickoff_time: '',
    home_away: 'home',
    fixture_type: 'league',
    venue_name: '',
    venue_address: '',
    status: 'scheduled',
    opponent_contact_name: '',
    opponent_contact_phone: '',
    opponent_contact_email: '',
    referee_name: '',
    notes: '',
    published: false,
    cancellation_reason: '',
    replaced_fixture_id: '',
}

type ToastType =
    | 'success'
    | 'error'
    | 'info'

type ImportRow = {
    rowNumber: number
    date: string
    kickoff: string
    homeTeam: string
    awayTeam: string
    venue: string
    fixtureType: ClubFixtureType
    status: ClubFixtureStatus
    published: boolean
    contactName: string
    contactPhone: string
    contactEmail: string
    referee: string
    notes: string
    homeAway: ClubHomeAway | null
    opponentName: string
    errors: string[]
}

type HeaderMap = Record<
    string,
    number
>

const fixtureTypes: ClubFixtureType[] = [
    'league',
    'cup',
    'friendly',
    'tournament',
    'other',
]

const fixtureStatuses: ClubFixtureStatus[] = [
    'proposed',
    'scheduled',
    'confirmed',
    'played',
    'cancelled',
    'postponed',
    'abandoned',
]

function normalise(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '')
}

function normaliseClubName(
    value: string,
): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(
            /\b(football club|football team|fc|afc|cf|club|team)\b/g,
            '',
        )
        .replace(/[^a-z0-9]+/g, '')
}

function namesReferToSameClub(
    left: string,
    right: string,
): boolean {
    const leftStrict =
        normalise(left)

    const rightStrict =
        normalise(right)

    if (
        leftStrict &&
        leftStrict ===
            rightStrict
    ) {
        return true
    }

    const leftClub =
        normaliseClubName(left)

    const rightClub =
        normaliseClubName(right)

    return (
        leftClub.length >= 3 &&
        rightClub.length >= 3 &&
        leftClub ===
            rightClub
    )
}

function parseBoolean(
    value: string,
    fallback = true,
): boolean {
    const cleaned =
        value.trim().toLowerCase()

    if (!cleaned) {
        return fallback
    }

    return [
        'true',
        'yes',
        'y',
        '1',
        'published',
    ].includes(cleaned)
}

function parseDate(
    value: string,
): string | null {
    const cleaned =
        value.trim()

    if (!cleaned) {
        return null
    }

    const isoMatch =
        cleaned.match(
            /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
        )

    if (isoMatch) {
        const year =
            Number(isoMatch[1])
        const month =
            Number(isoMatch[2])
        const day =
            Number(isoMatch[3])

        const date =
            new Date(
                Date.UTC(
                    year,
                    month - 1,
                    day,
                ),
            )

        if (
            date.getUTCFullYear() ===
                year &&
            date.getUTCMonth() ===
                month - 1 &&
            date.getUTCDate() ===
                day
        ) {
            return [
                String(year).padStart(
                    4,
                    '0',
                ),
                String(month).padStart(
                    2,
                    '0',
                ),
                String(day).padStart(
                    2,
                    '0',
                ),
            ].join('-')
        }

        return null
    }

    const ukMatch =
        cleaned.match(
            /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})$/,
        )

    if (!ukMatch) {
        return null
    }

    const day =
        Number(ukMatch[1])
    const month =
        Number(ukMatch[2])

    let year =
        Number(ukMatch[3])

    if (year < 100) {
        year +=
            year >= 70
                ? 1900
                : 2000
    }

    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day,
            ),
        )

    if (
        date.getUTCFullYear() !==
            year ||
        date.getUTCMonth() !==
            month - 1 ||
        date.getUTCDate() !==
            day
    ) {
        return null
    }

    return [
        String(year).padStart(
            4,
            '0',
        ),
        String(month).padStart(
            2,
            '0',
        ),
        String(day).padStart(
            2,
            '0',
        ),
    ].join('-')
}

function parseDelimitedText(
    text: string,
): string[][] {
    const rows: string[][] = []
    let row: string[] = []
    let cell = ''
    let quoted = false

    const delimiter =
        text.includes('\t')
            ? '\t'
            : ','

    for (
        let index = 0;
        index < text.length;
        index += 1
    ) {
        const char =
            text[index]

        const next =
            text[index + 1]

        if (char === '"') {
            if (
                quoted &&
                next === '"'
            ) {
                cell += '"'
                index += 1
            } else {
                quoted = !quoted
            }

            continue
        }

        if (
            char === delimiter &&
            !quoted
        ) {
            row.push(cell.trim())
            cell = ''
            continue
        }

        if (
            (char === '\n' ||
                char === '\r') &&
            !quoted
        ) {
            if (
                char === '\r' &&
                next === '\n'
            ) {
                index += 1
            }

            row.push(cell.trim())
            cell = ''

            if (
                row.some(
                    (value) =>
                        value.trim()
                            .length > 0,
                )
            ) {
                rows.push(row)
            }

            row = []
            continue
        }

        cell += char
    }

    row.push(cell.trim())

    if (
        row.some(
            (value) =>
                value.trim()
                    .length > 0,
        )
    ) {
        rows.push(row)
    }

    return rows
}

function createHeaderMap(
    headers: string[],
): HeaderMap {
    return headers.reduce<HeaderMap>(
        (
            result,
            header,
            index,
        ) => {
            result[
                normalise(header)
            ] = index

            return result
        },
        {},
    )
}

function readColumn(
    row: string[],
    headers: HeaderMap,
    aliases: string[],
): string {
    for (const alias of aliases) {
        const index =
            headers[
                normalise(alias)
            ]

        if (
            index !== undefined
        ) {
            return row[
                index
            ]?.trim() ?? ''
        }
    }

    return ''
}

function isSameTeamName(
    left: string,
    right: string,
): boolean {
    return namesReferToSameClub(
        left,
        right,
    )
}

function determineScheduleClubName(
    dataRows: string[][],
    headers: HeaderMap,
    organisationName: string,
): string {
    const candidates =
        new Map<
            string,
            {
                name: string
                count: number
            }
        >()

    for (const row of dataRows) {
        const homeTeam =
            readColumn(
                row,
                headers,
                [
                    'home_team',
                    'home team',
                    'home',
                ],
            )

        const awayTeam =
            readColumn(
                row,
                headers,
                [
                    'away_team',
                    'away team',
                    'away',
                ],
            )

        for (const teamName of [
            homeTeam,
            awayTeam,
        ]) {
            if (!teamName) {
                continue
            }

            if (
                namesReferToSameClub(
                    teamName,
                    organisationName,
                )
            ) {
                return teamName
            }

            const key =
                normaliseClubName(
                    teamName,
                )

            if (!key) {
                continue
            }

            const existing =
                candidates.get(
                    key,
                )

            candidates.set(
                key,
                {
                    name:
                        existing
                            ?.name ??
                        teamName,
                    count:
                        (existing
                            ?.count ??
                            0) +
                        1,
                },
            )
        }
    }

    const expectedRows =
        dataRows.length

    const repeated =
        Array.from(
            candidates.values(),
        )
            .filter(
                (candidate) =>
                    candidate.count >=
                    Math.max(
                        2,
                        Math.ceil(
                            expectedRows *
                                0.6,
                        ),
                    ),
            )
            .sort(
                (left, right) =>
                    right.count -
                    left.count,
            )

    return (
        repeated[0]?.name ??
        organisationName
    )
}

function resolveFixtureType(
    value: string,
): ClubFixtureType {
    const cleaned =
        value.trim().toLowerCase()

    return fixtureTypes.includes(
        cleaned as ClubFixtureType,
    )
        ? (
            cleaned as ClubFixtureType
        )
        : 'league'
}

function resolveStatus(
    value: string,
): ClubFixtureStatus {
    const cleaned =
        value.trim().toLowerCase()

    return fixtureStatuses.includes(
        cleaned as ClubFixtureStatus,
    )
        ? (
            cleaned as ClubFixtureStatus
        )
        : 'scheduled'
}

function buildImportRows(
    text: string,
    clubName: string,
): ImportRow[] {
    const rows =
        parseDelimitedText(
            text,
        )

    if (rows.length < 2) {
        return []
    }

    const headers =
        createHeaderMap(
            rows[0],
        )

    const dataRows =
        rows.slice(1)

    const scheduleClubName =
        determineScheduleClubName(
            dataRows,
            headers,
            clubName,
        )

    return dataRows
        .map(
            (
                row,
                rowIndex,
            ): ImportRow => {
                const rawDate =
                    readColumn(
                        row,
                        headers,
                        [
                            'date',
                            'fixture_date',
                            'fixture date',
                        ],
                    )

                const date =
                    parseDate(
                        rawDate,
                    ) ?? ''

                const homeTeam =
                    readColumn(
                        row,
                        headers,
                        [
                            'home_team',
                            'home team',
                            'home',
                        ],
                    )

                const awayTeam =
                    readColumn(
                        row,
                        headers,
                        [
                            'away_team',
                            'away team',
                            'away',
                        ],
                    )

                const explicitHomeAway =
                    readColumn(
                        row,
                        headers,
                        [
                            'home_away',
                            'home/away',
                            'h/a',
                        ],
                    )
                        .trim()
                        .toLowerCase()

                let homeAway:
                    | ClubHomeAway
                    | null = null

                let opponentName = ''

                if (
                    homeTeam &&
                    awayTeam
                ) {
                    if (
                        isSameTeamName(
                            homeTeam,
                            scheduleClubName,
                        ) &&
                        !isSameTeamName(
                            awayTeam,
                            scheduleClubName,
                        )
                    ) {
                        homeAway = 'home'
                        opponentName =
                            awayTeam
                    } else if (
                        isSameTeamName(
                            awayTeam,
                            scheduleClubName,
                        ) &&
                        !isSameTeamName(
                            homeTeam,
                            scheduleClubName,
                        )
                    ) {
                        homeAway = 'away'
                        opponentName =
                            homeTeam
                    }
                } else if (
                    explicitHomeAway ===
                        'home' ||
                    explicitHomeAway ===
                        'away' ||
                    explicitHomeAway ===
                        'neutral'
                ) {
                    homeAway =
                        explicitHomeAway

                    opponentName =
                        readColumn(
                            row,
                            headers,
                            [
                                'opponent',
                                'opponent_name',
                                'opponent name',
                            ],
                        )
                }

                const errors: string[] =
                    []

                if (!date) {
                    errors.push(
                        rawDate
                            ? `Invalid date "${rawDate}".`
                            : 'Date is required.',
                    )
                }

                if (!homeAway) {
                    errors.push(
                        'Could not determine whether the club is home or away.',
                    )
                }

                if (!opponentName) {
                    errors.push(
                        'Opponent is required.',
                    )
                }

                if (
                    homeTeam &&
                    awayTeam &&
                    isSameTeamName(
                        homeTeam,
                        awayTeam,
                    )
                ) {
                    errors.push(
                        'Home and away teams cannot be the same.',
                    )
                }

                return {
                    rowNumber:
                        rowIndex + 2,
                    date,
                    kickoff:
                        readColumn(
                            row,
                            headers,
                            [
                                'kickoff',
                                'kick_off',
                                'kick-off',
                                'time',
                            ],
                        ),
                    homeTeam,
                    awayTeam,
                    venue:
                        readColumn(
                            row,
                            headers,
                            [
                                'venue',
                                'venue_name',
                                'venue name',
                            ],
                        ),
                    fixtureType:
                        resolveFixtureType(
                            readColumn(
                                row,
                                headers,
                                [
                                    'fixture_type',
                                    'fixture type',
                                    'type',
                                ],
                            ),
                        ),
                    status:
                        resolveStatus(
                            readColumn(
                                row,
                                headers,
                                [
                                    'status',
                                ],
                            ),
                        ),
                    published:
                        parseBoolean(
                            readColumn(
                                row,
                                headers,
                                [
                                    'published',
                                    'publish',
                                ],
                            ),
                            true,
                        ),
                    contactName:
                        readColumn(
                            row,
                            headers,
                            [
                                'contact_name',
                                'contact name',
                            ],
                        ),
                    contactPhone:
                        readColumn(
                            row,
                            headers,
                            [
                                'contact_phone',
                                'contact phone',
                                'phone',
                                'contact number',
                            ],
                        ),
                    contactEmail:
                        readColumn(
                            row,
                            headers,
                            [
                                'contact_email',
                                'contact email',
                                'email',
                            ],
                        ),
                    referee:
                        readColumn(
                            row,
                            headers,
                            [
                                'referee',
                                'referee_name',
                                'referee name',
                            ],
                        ),
                    notes:
                        readColumn(
                            row,
                            headers,
                            [
                                'notes',
                                'note',
                            ],
                        ),
                    homeAway,
                    opponentName:
                        opponentName.trim(),
                    errors,
                }
            },
        )
}

function downloadCsv(
    filename: string,
    content: string,
) {
    const blob =
        new Blob(
            [content],
            {
                type:
                    'text/csv;charset=utf-8',
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
        filename

    document.body.appendChild(
        anchor,
    )

    anchor.click()
    anchor.remove()

    URL.revokeObjectURL(
        url,
    )
}

export function ClubFixturesManager() {
    const {
        currentOrganisation,
    } =
        useOrganisation()

    const [
        seasons,
        setSeasons,
    ] =
        useState<ClubSeason[]>(
            [],
        )

    const [
        seasonId,
        setSeasonId,
    ] =
        useState('')

    const [
        opponents,
        setOpponents,
    ] =
        useState<
            ClubOpponent[]
        >([])

    const [
        fixtures,
        setFixtures,
    ] =
        useState<
            ClubFixture[]
        >([])

    const [
        form,
        setForm,
    ] =
        useState<
            ClubFixtureFormValues
        >(emptyForm)

    const [
        editing,
        setEditing,
    ] =
        useState<
            ClubFixture | null
        >(null)

    const [
        deleting,
        setDeleting,
    ] =
        useState<
            ClubFixture | null
        >(null)

    const [
        show,
        setShow,
    ] =
        useState(false)

    const [
        toast,
        setToast,
    ] =
        useState('')

    const [
        type,
        setType,
    ] =
        useState<ToastType>(
            'success',
        )

    const [
        busy,
        setBusy,
    ] =
        useState(false)

    const [
        showImport,
        setShowImport,
    ] =
        useState(false)

    const [
        importRows,
        setImportRows,
    ] =
        useState<
            ImportRow[]
        >([])

    const [
        importing,
        setImporting,
    ] =
        useState(false)

    const [
        importFileName,
        setImportFileName,
    ] =
        useState('')

    const [
        selectedFixtureIds,
        setSelectedFixtureIds,
    ] = useState<string[]>([])

    const [
        showBulkEdit,
        setShowBulkEdit,
    ] = useState(false)

    const [
        bulkFixtureType,
        setBulkFixtureType,
    ] = useState<ClubFixtureType | ''>('')

    const [
        bulkStatus,
        setBulkStatus,
    ] = useState<ClubFixtureStatus | ''>('')

    const [
        bulkPublished,
        setBulkPublished,
    ] = useState<'keep' | 'publish' | 'unpublish'>('keep')

    const fileInputRef =
        useRef<HTMLInputElement | null>(
            null,
        )

    const notify = useCallback(
        (
            message: string,
            toastType: ToastType =
                'success',
        ) => {
            setToast(message)
            setType(toastType)
        },
        [],
    )

    const load =
        useCallback(
            async () => {
                try {
                    const [
                        seasonRows,
                        opponentRows,
                    ] =
                        await Promise.all([
                            clubFixtureService.getSeasons(
                                currentOrganisation.id,
                            ),
                            clubFixtureService.getOpponents(
                                currentOrganisation.id,
                            ),
                        ])

                    setSeasons(
                        seasonRows,
                    )

                    setOpponents(
                        opponentRows,
                    )

                    const selected =
                        seasonId ||
                        seasonRows.find(
                            (
                                item,
                            ) =>
                                item.status ===
                                'active',
                        )?.id ||
                        seasonRows[0]
                            ?.id ||
                        ''

                    setSeasonId(
                        selected,
                    )

                    setFixtures(
                        selected
                            ? await clubFixtureService.getFixtures(
                                  selected,
                              )
                            : [],
                    )
                } catch (error) {
                    notify(
                        error instanceof
                            Error
                            ? error.message
                            : 'Failed to load club fixtures.',
                        'error',
                    )
                }
            },
            [
                currentOrganisation.id,
                notify,
                seasonId,
            ],
        )

    useEffect(() => {
        void load()
    }, [load])

    const season =
        useMemo(
            () =>
                seasons.find(
                    (item) =>
                        item.id ===
                        seasonId,
                ),
            [
                seasons,
                seasonId,
            ],
        )

    const readyRows =
        useMemo(
            () =>
                importRows.filter(
                    (row) =>
                        row.errors
                            .length === 0,
                ),
            [importRows],
        )

    const errorRows =
        importRows.length -
        readyRows.length

    async function changeSeason(
        id: string,
    ) {
        setSeasonId(id)

        try {
            setFixtures(
                id
                    ? await clubFixtureService.getFixtures(
                          id,
                      )
                    : [],
            )
        } catch (error) {
            notify(
                error instanceof
                    Error
                    ? error.message
                    : 'Failed to load fixtures.',
                'error',
            )
        }
    }

    function edit(
        fixture: ClubFixture,
    ) {
        setEditing(
            fixture,
        )

        setForm({
            slot_id:
                fixture.slot_id ??
                '',
            opponent_id:
                fixture.opponent_id ??
                '',
            fixture_date:
                fixture.fixture_date,
            kickoff_time:
                fixture.kickoff_time?.slice(
                    0,
                    5,
                ) ?? '',
            home_away:
                fixture.home_away,
            fixture_type:
                fixture.fixture_type,
            venue_name:
                fixture.venue_name ??
                '',
            venue_address:
                fixture.venue_address ??
                '',
            status:
                fixture.status,
            opponent_contact_name:
                fixture.opponent_contact_name ??
                '',
            opponent_contact_phone:
                fixture.opponent_contact_phone ??
                '',
            opponent_contact_email:
                fixture.opponent_contact_email ??
                '',
            referee_name:
                fixture.referee_name ??
                '',
            notes:
                fixture.notes ??
                '',
            published:
                fixture.published,
            cancellation_reason:
                fixture.cancellation_reason ??
                '',
            replaced_fixture_id:
                fixture.replaced_fixture_id ??
                '',
        })

        setShow(true)
    }

    async function save() {
        if (
            !seasonId ||
            !form.fixture_date
        ) {
            notify(
                'Select a season and fixture date.',
                'error',
            )

            return
        }

        setBusy(true)

        try {
            if (editing) {
                await clubFixtureService.updateFixture(
                    editing.id,
                    form,
                )
            } else {
                await clubFixtureService.createFixture(
                    currentOrganisation.id,
                    seasonId,
                    form,
                )
            }

            setShow(false)
            setEditing(null)
            setForm(
                emptyForm,
            )

            setFixtures(
                await clubFixtureService.getFixtures(
                    seasonId,
                ),
            )

            notify(
                editing
                    ? 'Fixture updated.'
                    : 'Fixture created.',
            )
        } catch (error) {
            notify(
                error instanceof
                    Error
                    ? error.message
                    : 'Failed to save fixture.',
                'error',
            )
        } finally {
            setBusy(false)
        }
    }

    async function remove() {
        if (!deleting) {
            return
        }

        setBusy(true)

        try {
            await clubFixtureService.deleteFixture(
                deleting.id,
            )

            setDeleting(null)

            setFixtures(
                await clubFixtureService.getFixtures(
                    seasonId,
                ),
            )

            notify(
                'Fixture deleted.',
            )
        } catch (error) {
            notify(
                error instanceof
                    Error
                    ? error.message
                    : 'Failed to delete fixture.',
                'error',
            )
        } finally {
            setBusy(false)
        }
    }

    function openImport() {
        if (!seasonId) {
            notify(
                'Select a season before importing fixtures.',
                'error',
            )

            return
        }

        setImportRows([])
        setImportFileName('')
        setShowImport(true)
    }

    function closeImport() {
        if (importing) {
            return
        }

        setShowImport(false)
        setImportRows([])
        setImportFileName('')
    }

    async function handleImportFile(
        file: File,
    ) {
        try {
            const text =
                await file.text()

            const rows =
                buildImportRows(
                    text,
                    currentOrganisation.name,
                )

            setImportRows(
                rows,
            )

            setImportFileName(
                file.name,
            )

            if (
                rows.length === 0
            ) {
                notify(
                    'The file did not contain any fixture rows.',
                    'error',
                )
            }
        } catch (error) {
            notify(
                error instanceof
                    Error
                    ? error.message
                    : 'Unable to read the fixture file.',
                'error',
            )
        }
    }

    function downloadTemplate() {
        const club =
            currentOrganisation.name
                .replace(/"/g, '""')

        const csv = [
            'date,kickoff,home_team,away_team,venue,fixture_type,status,published,contact_name,contact_phone,contact_email,referee,notes',
            `19/09/2026,10:30,"${club}","Example FC","Home Ground",league,scheduled,true,"Alex Smith","07123456789","alex@example.com","",""`,
            `26/09/2026,11:00,"Example United","${club}","Away Ground",cup,scheduled,true,"Sam Jones","07987654321","","",""`,
        ].join('\n')

        downloadCsv(
            'tournamenthq-club-fixtures-template.csv',
            csv,
        )
    }

    async function importFixtures() {
        if (
            !seasonId ||
            readyRows.length ===
                0 ||
            importing
        ) {
            return
        }

        setImporting(true)

        try {
            const opponentCache =
                new Map<
                    string,
                    ClubOpponent
                >(
                    opponents.map(
                        (
                            opponent,
                        ) => [
                            normalise(
                                opponent.name,
                            ),
                            opponent,
                        ],
                    ),
                )

            let imported = 0

            for (const row of readyRows) {
                const opponentKey =
                    normalise(
                        row.opponentName,
                    )

                let opponent =
                    opponentCache.get(
                        opponentKey,
                    )

                if (!opponent) {
                    const values:
                        ClubOpponentFormValues =
                        {
                            name:
                                row.opponentName,
                            contact_name:
                                row.contactName,
                            contact_phone:
                                row.contactPhone,
                            contact_email:
                                row.contactEmail,
                            notes: '',
                            active: true,
                        }

                    opponent =
                        await clubFixtureService.createOpponent(
                            currentOrganisation.id,
                            values,
                        )

                    opponentCache.set(
                        opponentKey,
                        opponent,
                    )
                }

                const fixtureValues:
                    ClubFixtureFormValues =
                    {
                        ...emptyForm,
                        opponent_id:
                            opponent.id,
                        fixture_date:
                            row.date,
                        kickoff_time:
                            row.kickoff,
                        home_away:
                            row.homeAway ??
                            'home',
                        fixture_type:
                            row.fixtureType,
                        venue_name:
                            row.venue,
                        status:
                            row.status,
                        opponent_contact_name:
                            row.contactName,
                        opponent_contact_phone:
                            row.contactPhone,
                        opponent_contact_email:
                            row.contactEmail,
                        referee_name:
                            row.referee,
                        notes:
                            row.notes,
                        published:
                            row.published,
                    }

                await clubFixtureService.createFixture(
                    currentOrganisation.id,
                    seasonId,
                    fixtureValues,
                )

                imported += 1
            }

            const refreshedOpponents =
                await clubFixtureService.getOpponents(
                    currentOrganisation.id,
                )

            setOpponents(
                refreshedOpponents,
            )

            setFixtures(
                await clubFixtureService.getFixtures(
                    seasonId,
                ),
            )

            setShowImport(false)
            setImportRows([])
            setImportFileName('')

            notify(
                `${imported} fixture${imported === 1 ? '' : 's'} imported successfully.`,
            )
        } catch (error) {
            notify(
                error instanceof
                    Error
                    ? error.message
                    : 'Fixture import failed.',
                'error',
            )
        } finally {
            setImporting(false)
        }
    }

    const allSelected =
        fixtures.length > 0 &&
        selectedFixtureIds.length === fixtures.length

    function toggleFixtureSelection(
        fixtureId: string,
    ) {
        setSelectedFixtureIds(
            (current) =>
                current.includes(fixtureId)
                    ? current.filter(
                          (id) => id !== fixtureId,
                      )
                    : [...current, fixtureId],
        )
    }

    function toggleAllFixtures() {
        setSelectedFixtureIds(
            allSelected
                ? []
                : fixtures.map(
                      (fixture) => fixture.id,
                  ),
        )
    }

    async function applyBulkEdit() {
        if (
            selectedFixtureIds.length === 0
        ) {
            return
        }

        const changes: {
            fixture_type?: ClubFixtureType
            status?: ClubFixtureStatus
            published?: boolean
        } = {}

        if (bulkFixtureType) {
            changes.fixture_type =
                bulkFixtureType
        }

        if (bulkStatus) {
            changes.status =
                bulkStatus
        }

        if (bulkPublished === 'publish') {
            changes.published = true
        } else if (
            bulkPublished === 'unpublish'
        ) {
            changes.published = false
        }

        if (
            Object.keys(changes).length === 0
        ) {
            notify(
                'Choose at least one change to apply.',
                'error',
            )
            return
        }

        setBusy(true)

        try {
            await clubFixtureService.bulkUpdateFixtures(
                selectedFixtureIds,
                changes,
            )

            setFixtures(
                await clubFixtureService.getFixtures(
                    seasonId,
                ),
            )
            setSelectedFixtureIds([])
            setShowBulkEdit(false)
            setBulkFixtureType('')
            setBulkStatus('')
            setBulkPublished('keep')

            notify(
                `${selectedFixtureIds.length} fixture${
                    selectedFixtureIds.length === 1
                        ? ''
                        : 's'
                } updated successfully.`,
            )
        } catch (error) {
            notify(
                error instanceof Error
                    ? error.message
                    : 'Failed to bulk update fixtures.',
                'error',
            )
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-5">
            <Toast
                message={toast}
                type={type}
                onClose={() =>
                    setToast('')
                }
            />

            <div className="flex flex-col gap-4 rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] p-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h3>
                        Club Fixtures
                    </h3>

                    <p className="muted">
                        Manage the club fixture programme by season. Add fixtures manually or import an existing schedule from CSV/TSV.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <select
                        className="rounded-xl border border-white/15 bg-[#071009] px-4 py-3 text-white outline-none [color-scheme:dark] focus:border-lime-400"
                        value={
                            seasonId
                        }
                        onChange={(
                            event,
                        ) =>
                            void changeSeason(
                                event
                                    .target
                                    .value,
                            )
                        }
                    >
                        <option
                            className="bg-[#071009] text-white"
                            value=""
                        >
                            Select season
                        </option>

                        {seasons.map(
                            (
                                item,
                            ) => (
                                <option
                                    className="bg-[#071009] text-white"
                                    key={
                                        item.id
                                    }
                                    value={
                                        item.id
                                    }
                                >
                                    {
                                        item.name
                                    }
                                </option>
                            ),
                        )}
                    </select>

                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-5 py-3 font-bold text-[var(--organisation-text)] disabled:opacity-50"
                        disabled={
                            !seasonId
                        }
                        onClick={
                            openImport
                        }
                    >
                        <Upload size={17} />
                        Import CSV/TSV
                    </button>

                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-5 py-3 font-bold text-[var(--organisation-text)] disabled:opacity-40"
                        disabled={
                            selectedFixtureIds.length === 0
                        }
                        onClick={() =>
                            setShowBulkEdit(true)
                        }
                    >
                        Bulk Edit ({selectedFixtureIds.length})
                    </button>

                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--organisation-accent)] px-5 py-3 font-bold text-[var(--organisation-on-accent)] disabled:opacity-50"
                        disabled={
                            !seasonId
                        }
                        onClick={() => {
                            setEditing(
                                null,
                            )
                            setForm(
                                emptyForm,
                            )
                            setShow(
                                true,
                            )
                        }}
                    >
                        <Plus size={17} />
                        Add Fixture
                    </button>
                </div>
            </div>

            {!seasonId ? (
                <div className="rounded-2xl border border-dashed border-[var(--organisation-border)] p-8 text-center">
                    <h4>
                        Create or select a season first
                    </h4>

                    <p className="muted">
                        Fixtures belong to a club season rather than a TournamentHQ competition.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-[var(--organisation-border)]">
                    <table className="w-full text-left">
                        <thead>
                            <tr>
                                <th className="p-4">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={toggleAllFixtures}
                                        aria-label="Select all fixtures"
                                    />
                                </th>
                                <th>
                                    Date
                                </th>
                                <th>
                                    Opponent
                                </th>
                                <th>
                                    H/A
                                </th>
                                <th>
                                    Type
                                </th>
                                <th>
                                    Status
                                </th>
                                <th>
                                    Published
                                </th>
                                <th />
                            </tr>
                        </thead>

                        <tbody>
                            {fixtures.map(
                                (
                                    fixture,
                                ) => (
                                    <tr
                                        key={
                                            fixture.id
                                        }
                                        className="border-t border-[var(--organisation-border)]"
                                    >
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    selectedFixtureIds.includes(
                                                        fixture.id,
                                                    )
                                                }
                                                onChange={() =>
                                                    toggleFixtureSelection(
                                                        fixture.id,
                                                    )
                                                }
                                                aria-label={`Select fixture ${fixture.fixture_date}`}
                                            />
                                        </td>
                                        <td>
                                            {
                                                fixture.fixture_date
                                            }
                                            {fixture.kickoff_time
                                                ? ` ${fixture.kickoff_time.slice(
                                                      0,
                                                      5,
                                                  )}`
                                                : ''}
                                        </td>

                                        <td>
                                            {opponents.find(
                                                (
                                                    opponent,
                                                ) =>
                                                    opponent.id ===
                                                    fixture.opponent_id,
                                            )
                                                ?.name ??
                                                'TBC'}
                                        </td>

                                        <td className="capitalize">
                                            {
                                                fixture.home_away
                                            }
                                        </td>

                                        <td className="capitalize">
                                            {
                                                fixture.fixture_type
                                            }
                                        </td>

                                        <td className="capitalize">
                                            {
                                                fixture.status
                                            }
                                        </td>

                                        <td>
                                            {fixture.published
                                                ? 'Yes'
                                                : 'No'}
                                        </td>

                                        <td className="p-3">
                                            <button
                                                type="button"
                                                className="mr-3 font-semibold"
                                                onClick={() =>
                                                    edit(
                                                        fixture,
                                                    )
                                                }
                                            >
                                                Edit
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setDeleting(
                                                        fixture,
                                                    )
                                                }
                                                aria-label="Delete fixture"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ),
                            )}

                            {fixtures.length ===
                                0 && (
                                <tr>
                                    <td
                                        colSpan={
                                            8
                                        }
                                        className="p-8 text-center muted"
                                    >
                                        No fixtures in{' '}
                                        {season?.name ??
                                            'this season'}{' '}
                                        yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {show && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1510] p-6 text-white shadow-2xl">
                        <h3>
                            {editing
                                ? 'Edit Fixture'
                                : 'Add Fixture'}
                        </h3>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <label>
                                Date
                                <input
                                    type="date"
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white outline-none [color-scheme:dark] focus:border-lime-400"
                                    value={
                                        form.fixture_date
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm(
                                            {
                                                ...form,
                                                fixture_date:
                                                    event
                                                        .target
                                                        .value,
                                            },
                                        )
                                    }
                                />
                            </label>

                            <label>
                                Kick-off
                                <input
                                    type="time"
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white outline-none [color-scheme:dark] focus:border-lime-400"
                                    value={
                                        form.kickoff_time
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm(
                                            {
                                                ...form,
                                                kickoff_time:
                                                    event
                                                        .target
                                                        .value,
                                            },
                                        )
                                    }
                                />
                            </label>

                            <label>
                                Opponent
                                <select
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white outline-none [color-scheme:dark] focus:border-lime-400"
                                    value={
                                        form.opponent_id
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm(
                                            {
                                                ...form,
                                                opponent_id:
                                                    event
                                                        .target
                                                        .value,
                                            },
                                        )
                                    }
                                >
                                    <option
                                        className="bg-[#071009] text-white"
                                        value=""
                                    >
                                        TBC
                                    </option>

                                    {opponents
                                        .filter(
                                            (
                                                opponent,
                                            ) =>
                                                opponent.active,
                                        )
                                        .map(
                                            (
                                                opponent,
                                            ) => (
                                                <option
                                                    className="bg-[#071009] text-white"
                                                    key={
                                                        opponent.id
                                                    }
                                                    value={
                                                        opponent.id
                                                    }
                                                >
                                                    {
                                                        opponent.name
                                                    }
                                                </option>
                                            ),
                                        )}
                                </select>
                            </label>

                            <label>
                                Home / Away
                                <select
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white outline-none [color-scheme:dark] focus:border-lime-400"
                                    value={
                                        form.home_away
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm(
                                            {
                                                ...form,
                                                home_away:
                                                    event
                                                        .target
                                                        .value as ClubHomeAway,
                                            },
                                        )
                                    }
                                >
                                    <option
                                        className="bg-[#071009] text-white"
                                        value="home"
                                    >
                                        Home
                                    </option>
                                    <option
                                        className="bg-[#071009] text-white"
                                        value="away"
                                    >
                                        Away
                                    </option>
                                    <option
                                        className="bg-[#071009] text-white"
                                        value="neutral"
                                    >
                                        Neutral
                                    </option>
                                </select>
                            </label>

                            <label>
                                Fixture type
                                <select
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white outline-none [color-scheme:dark] focus:border-lime-400"
                                    value={
                                        form.fixture_type
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm(
                                            {
                                                ...form,
                                                fixture_type:
                                                    event
                                                        .target
                                                        .value as ClubFixtureType,
                                            },
                                        )
                                    }
                                >
                                    {fixtureTypes.map(
                                        (
                                            value,
                                        ) => (
                                            <option
                                                className="bg-[#071009] text-white capitalize"
                                                key={
                                                    value
                                                }
                                                value={
                                                    value
                                                }
                                            >
                                                {
                                                    value
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>

                            <label>
                                Status
                                <select
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white outline-none [color-scheme:dark] focus:border-lime-400"
                                    value={
                                        form.status
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm(
                                            {
                                                ...form,
                                                status:
                                                    event
                                                        .target
                                                        .value as ClubFixtureStatus,
                                            },
                                        )
                                    }
                                >
                                    {fixtureStatuses.map(
                                        (
                                            value,
                                        ) => (
                                            <option
                                                className="bg-[#071009] text-white capitalize"
                                                key={
                                                    value
                                                }
                                                value={
                                                    value
                                                }
                                            >
                                                {
                                                    value
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>

                            <label>
                                Venue
                                <input
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white outline-none focus:border-lime-400"
                                    value={
                                        form.venue_name
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm(
                                            {
                                                ...form,
                                                venue_name:
                                                    event
                                                        .target
                                                        .value,
                                            },
                                        )
                                    }
                                />
                            </label>

                            <label>
                                Referee
                                <input
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white outline-none focus:border-lime-400"
                                    value={
                                        form.referee_name
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm(
                                            {
                                                ...form,
                                                referee_name:
                                                    event
                                                        .target
                                                        .value,
                                            },
                                        )
                                    }
                                />
                            </label>

                            <label className="sm:col-span-2">
                                Notes
                                <textarea
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white outline-none focus:border-lime-400"
                                    value={
                                        form.notes
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm(
                                            {
                                                ...form,
                                                notes:
                                                    event
                                                        .target
                                                        .value,
                                            },
                                        )
                                    }
                                />
                            </label>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={
                                        form.published
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm(
                                            {
                                                ...form,
                                                published:
                                                    event
                                                        .target
                                                        .checked,
                                            },
                                        )
                                    }
                                />
                                Publish on club site
                            </label>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setShow(
                                        false,
                                    )
                                }
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                disabled={
                                    busy
                                }
                                className="rounded-xl bg-[var(--organisation-accent)] px-5 py-3 font-bold text-[var(--organisation-on-accent)]"
                                onClick={() =>
                                    void save()
                                }
                            >
                                {busy
                                    ? 'Saving...'
                                    : 'Save Fixture'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showBulkEdit && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
                    <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0b1510] p-6 text-white shadow-2xl">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-lime-400">
                            Bulk Fixture Update
                        </p>

                        <h3 className="mt-2 text-2xl font-black">
                            Edit {selectedFixtureIds.length} selected fixture{selectedFixtureIds.length === 1 ? '' : 's'}
                        </h3>

                        <p className="mt-2 text-sm text-white/65">
                            Only fields you choose below will be changed. Dates, opponents and home/away assignments remain untouched.
                        </p>

                        <div className="mt-6 grid gap-4">
                            <label>
                                Fixture type
                                <select
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white [color-scheme:dark]"
                                    value={bulkFixtureType}
                                    onChange={(event) =>
                                        setBulkFixtureType(
                                            event.target.value as ClubFixtureType | '',
                                        )
                                    }
                                >
                                    <option value="">Keep existing</option>
                                    {fixtureTypes.map((value) => (
                                        <option key={value} value={value} className="bg-[#071009] text-white capitalize">
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Status
                                <select
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white [color-scheme:dark]"
                                    value={bulkStatus}
                                    onChange={(event) =>
                                        setBulkStatus(
                                            event.target.value as ClubFixtureStatus | '',
                                        )
                                    }
                                >
                                    <option value="">Keep existing</option>
                                    {fixtureStatuses.map((value) => (
                                        <option key={value} value={value} className="bg-[#071009] text-white capitalize">
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Public site
                                <select
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#071009] p-3 text-white [color-scheme:dark]"
                                    value={bulkPublished}
                                    onChange={(event) =>
                                        setBulkPublished(
                                            event.target.value as 'keep' | 'publish' | 'unpublish',
                                        )
                                    }
                                >
                                    <option value="keep">Keep existing</option>
                                    <option value="publish">Publish selected</option>
                                    <option value="unpublish">Unpublish selected</option>
                                </select>
                            </label>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setShowBulkEdit(false)
                                }
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                disabled={busy}
                                className="rounded-xl bg-[var(--organisation-accent)] px-5 py-3 font-black text-[var(--organisation-on-accent)] disabled:opacity-50"
                                onClick={() =>
                                    void applyBulkEdit()
                                }
                            >
                                {busy
                                    ? 'Applying...'
                                    : 'Apply Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showImport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] p-6 text-[var(--organisation-text)] shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--organisation-accent)]">
                                    Fixture Import
                                </p>

                                <h3 className="mt-1 text-2xl font-black">
                                    Import Existing Schedule
                                </h3>

                                <p className="mt-2 text-sm text-[var(--organisation-muted)]">
                                    Upload CSV/TSV exported from Excel or Google Sheets. Opponents not already in TournamentHQ will be created automatically.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeImport
                                }
                                disabled={
                                    importing
                                }
                                className="rounded-xl border border-[var(--organisation-border)] p-2"
                                aria-label="Close fixture import"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
                            <section className="rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h4 className="font-black">
                                            Spreadsheet data
                                        </h4>

                                        <p className="mt-1 text-xs text-[var(--organisation-muted)]">
                                            Required: date and home/away teams. Optional: kickoff, venue, fixture type, status, publish, contacts, referee and notes.
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <input
                                            ref={
                                                fileInputRef
                                            }
                                            type="file"
                                            hidden
                                            accept=".csv,.tsv,text/csv,text/tab-separated-values"
                                            onChange={(
                                                event,
                                            ) => {
                                                const file =
                                                    event
                                                        .target
                                                        .files?.[0]

                                                event.target.value =
                                                    ''

                                                if (
                                                    file
                                                ) {
                                                    void handleImportFile(
                                                        file,
                                                    )
                                                }
                                            }}
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                            className="inline-flex items-center gap-2 rounded-xl bg-[var(--organisation-accent)] px-4 py-2.5 text-sm font-black text-[var(--organisation-on-accent)]"
                                        >
                                            <FileSpreadsheet size={16} />
                                            Choose CSV/TSV
                                        </button>

                                        <button
                                            type="button"
                                            onClick={
                                                downloadTemplate
                                            }
                                            className="inline-flex items-center gap-2 rounded-xl border border-[var(--organisation-border)] px-4 py-2.5 text-sm font-bold"
                                        >
                                            <Download size={16} />
                                            Download Template
                                        </button>
                                    </div>
                                </div>

                                {importFileName && (
                                    <p className="mt-4 rounded-xl border border-[var(--organisation-border)] px-4 py-3 text-sm">
                                        Loaded:{' '}
                                        <strong>
                                            {
                                                importFileName
                                            }
                                        </strong>
                                    </p>
                                )}

                                <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--organisation-border)]">
                                    <table className="w-full min-w-[900px] text-left text-sm">
                                        <thead>
                                            <tr>
                                                <th className="p-3">
                                                    Row
                                                </th>
                                                <th>
                                                    Date
                                                </th>
                                                <th>
                                                    Home
                                                </th>
                                                <th>
                                                    Away
                                                </th>
                                                <th>
                                                    Opponent
                                                </th>
                                                <th>
                                                    H/A
                                                </th>
                                                <th>
                                                    Venue
                                                </th>
                                                <th>
                                                    Validation
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {importRows.map(
                                                (
                                                    row,
                                                ) => (
                                                    <tr
                                                        key={
                                                            row.rowNumber
                                                        }
                                                        className="border-t border-[var(--organisation-border)] align-top"
                                                    >
                                                        <td className="p-3">
                                                            {
                                                                row.rowNumber
                                                            }
                                                        </td>
                                                        <td>
                                                            {
                                                                row.date
                                                            }
                                                        </td>
                                                        <td>
                                                            {
                                                                row.homeTeam
                                                            }
                                                        </td>
                                                        <td>
                                                            {
                                                                row.awayTeam
                                                            }
                                                        </td>
                                                        <td>
                                                            {
                                                                row.opponentName
                                                            }
                                                        </td>
                                                        <td className="capitalize">
                                                            {row.homeAway ??
                                                                '—'}
                                                        </td>
                                                        <td>
                                                            {
                                                                row.venue
                                                            }
                                                        </td>
                                                        <td className="max-w-xs p-3">
                                                            {row.errors.length ===
                                                            0 ? (
                                                                <span className="font-bold text-emerald-400">
                                                                    Ready
                                                                </span>
                                                            ) : (
                                                                <ul className="space-y-1 text-xs text-red-300">
                                                                    {row.errors.map(
                                                                        (
                                                                            error,
                                                                        ) => (
                                                                            <li
                                                                                key={
                                                                                    error
                                                                                }
                                                                            >
                                                                                {
                                                                                    error
                                                                                }
                                                                            </li>
                                                                        ),
                                                                    )}
                                                                </ul>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}

                                            {importRows.length ===
                                                0 && (
                                                <tr>
                                                    <td
                                                        colSpan={
                                                            8
                                                        }
                                                        className="p-10 text-center text-[var(--organisation-muted)]"
                                                    >
                                                        Upload a CSV or TSV file to preview fixtures before importing.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <aside className="rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] p-5">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--organisation-accent)]">
                                    Validation Preview
                                </p>

                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <div className="rounded-xl border border-[var(--organisation-border)] p-4">
                                        <strong className="block text-2xl">
                                            {
                                                readyRows.length
                                            }
                                        </strong>
                                        <span className="text-xs text-[var(--organisation-muted)]">
                                            ready
                                        </span>
                                    </div>

                                    <div className="rounded-xl border border-[var(--organisation-border)] p-4">
                                        <strong className="block text-2xl">
                                            {
                                                errorRows
                                            }
                                        </strong>
                                        <span className="text-xs text-[var(--organisation-muted)]">
                                            errors
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-3 text-sm text-[var(--organisation-muted)]">
                                    <p>
                                        Season:{' '}
                                        <strong className="text-[var(--organisation-text)]">
                                            {season?.name ??
                                                'Not selected'}
                                        </strong>
                                    </p>

                                    <p>
                                        Club:{' '}
                                        <strong className="text-[var(--organisation-text)]">
                                            {
                                                currentOrganisation.name
                                            }
                                        </strong>
                                    </p>

                                    <p>
                                        Unknown opponents will be added to the club opponent directory automatically.
                                    </p>
                                </div>
                            </aside>
                        </div>

                        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-[var(--organisation-border)] pt-5">
                            <button
                                type="button"
                                disabled={
                                    importing
                                }
                                onClick={
                                    closeImport
                                }
                                className="rounded-xl border border-[var(--organisation-border)] px-5 py-3 font-bold"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                disabled={
                                    importing ||
                                    readyRows.length ===
                                        0
                                }
                                onClick={() =>
                                    void importFixtures()
                                }
                                className="rounded-xl bg-[var(--organisation-accent)] px-5 py-3 font-black text-[var(--organisation-on-accent)] disabled:opacity-50"
                            >
                                {importing
                                    ? 'Importing...'
                                    : `Import ${readyRows.length} Fixture${readyRows.length === 1 ? '' : 's'}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleting && (
                <ConfirmDialog
                    title="Delete Fixture"
                    message="Delete this club fixture?"
                    confirmText="Delete"
                    cancelText="Cancel"
                    onCancel={() =>
                        setDeleting(
                            null,
                        )
                    }
                    onConfirm={() =>
                        void remove()
                    }
                />
            )}
        </div>
    )
}
