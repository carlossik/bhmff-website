import {
    useMemo,
    useRef,
    useState,
} from 'react'
import {
    FileSpreadsheet,
    Upload,
    X,
} from 'lucide-react'

import type {
    FixtureFormValues,
    FixtureGroup,
    FixtureGroupMembership,
    FixtureTeam,
    FixtureVenue,
} from './fixtureTypes'

type Props = {
    teams: FixtureTeam[]
    venues: FixtureVenue[]
    groups: FixtureGroup[]
    groupMemberships: FixtureGroupMembership[]
    isImporting: boolean
    onClose: () => void
    onImport: (
        rows: FixtureFormValues[],
    ) => Promise<void>
}

type PreviewRow = {
    rowNumber: number
    summary: string
    values: FixtureFormValues | null
    error: string | null
}

function norm(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[–—]/g, '-')
        .replace(/\s+/g, ' ')
}

function parseLine(
    line: string,
    delimiter: string,
) {
    const cells: string[] = []
    let value = ''
    let quoted = false

    for (
        let index = 0;
        index < line.length;
        index += 1
    ) {
        const char = line[index]

        if (char === '"') {
            if (
                quoted &&
                line[index + 1] === '"'
            ) {
                value += '"'
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
            cells.push(value.trim())
            value = ''
            continue
        }

        value += char
    }

    cells.push(value.trim())
    return cells
}

function parseRows(text: string) {
    const lines = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .filter((line) => line.trim())

    if (!lines.length) {
        return []
    }

    const delimiter =
        lines[0].includes('\t')
            ? '\t'
            : ','

    return lines.map((line) =>
        parseLine(line, delimiter),
    )
}

function parseDate(value: string) {
    const iso =
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(
            value.trim(),
        )
    const uk =
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(
            value.trim(),
        )

    const year = iso
        ? Number(iso[1])
        : uk
          ? Number(uk[3])
          : Number.NaN
    const month = iso
        ? Number(iso[2])
        : uk
          ? Number(uk[2])
          : Number.NaN
    const day = iso
        ? Number(iso[3])
        : uk
          ? Number(uk[1])
          : Number.NaN

    const date = new Date(
        year,
        month - 1,
        day,
    )

    if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day) ||
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null
    }

    return `${year}-${String(month).padStart(
        2,
        '0',
    )}-${String(day).padStart(
        2,
        '0',
    )}`
}

function parseTime(value: string) {
    const match =
        /^(\d{1,2}):(\d{2})$/.exec(
            value.trim(),
        )

    if (!match) {
        return null
    }

    const hour = Number(match[1])
    const minute = Number(match[2])

    if (
        hour > 23 ||
        minute > 59
    ) {
        return null
    }

    return `${String(hour).padStart(
        2,
        '0',
    )}:${String(minute).padStart(
        2,
        '0',
    )}`
}

function teamLabel(team: FixtureTeam) {
    return team.club_name
        ? `${team.club_name} — ${team.team_name}`
        : team.team_name
}

function downloadTemplate() {
    const content = [
        'Stage,Group,Date,Time,Home Team,Away Team,Venue,Status',
        'Group Stage,Group A,15/08/2026,10:00,Home Team,Away Team,Main Ground,scheduled',
    ].join('\n')

    const url = URL.createObjectURL(
        new Blob([content], {
            type:
                'text/csv;charset=utf-8',
        }),
    )
    const link =
        document.createElement('a')

    link.href = url
    link.download =
        'TournamentHQ-fixture-import-template.csv'
    link.click()
    URL.revokeObjectURL(url)
}

export function FixtureImportModal({
    teams,
    venues,
    groups,
    groupMemberships,
    isImporting,
    onClose,
    onImport,
}: Props) {
    const inputRef =
        useRef<HTMLInputElement | null>(
            null,
        )
    const [text, setText] =
        useState('')
    const [sourceName, setSourceName] =
        useState('')

    const teamMap = useMemo(() => {
        const map =
            new Map<string, FixtureTeam>()

        teams.forEach((team) => {
            [
                team.team_name,
                team.club_name ?? '',
                teamLabel(team),
            ]
                .filter(Boolean)
                .forEach((name) =>
                    map.set(
                        norm(name),
                        team,
                    ),
                )
        })

        return map
    }, [teams])

    const venueMap = useMemo(
        () =>
            new Map(
                venues.map((venue) => [
                    norm(venue.name),
                    venue,
                ]),
            ),
        [venues],
    )

    const groupMap = useMemo(
        () =>
            new Map(
                groups.map((group) => [
                    norm(group.name),
                    group,
                ]),
            ),
        [groups],
    )

    const preview = useMemo<
        PreviewRow[]
    >(() => {
        const rows = parseRows(text)

        if (!rows.length) {
            return []
        }

        const first =
            rows[0].map(norm)
        const hasHeader =
            first.some((cell) =>
                cell.includes('home'),
            ) &&
            first.some((cell) =>
                cell.includes('away'),
            )

        return (
            hasHeader
                ? rows.slice(1)
                : rows
        ).map((cells, index) => {
            const [
                stageRaw = '',
                groupRaw = '',
                dateRaw = '',
                timeRaw = '',
                homeRaw = '',
                awayRaw = '',
                venueRaw = '',
                statusRaw = '',
            ] = cells

            const rowNumber =
                index +
                (hasHeader ? 2 : 1)
            const stage =
                stageRaw.trim() ||
                'Group Stage'
            const home = teamMap.get(
                norm(homeRaw),
            )
            const away = teamMap.get(
                norm(awayRaw),
            )
            const group =
                groupRaw.trim()
                    ? groupMap.get(
                          norm(groupRaw),
                      )
                    : undefined
            const venue =
                venueRaw.trim()
                    ? venueMap.get(
                          norm(venueRaw),
                      )
                    : undefined
            const date =
                parseDate(dateRaw)
            const time =
                parseTime(timeRaw)
            const summary =
                `${homeRaw || 'Home TBC'} vs ${awayRaw || 'Away TBC'}`

            const fail = (
                error: string,
            ): PreviewRow => ({
                rowNumber,
                summary,
                values: null,
                error,
            })

            if (!home) {
                return fail(
                    `Home team "${homeRaw}" was not found.`,
                )
            }

            if (!away) {
                return fail(
                    `Away team "${awayRaw}" was not found.`,
                )
            }

            if (
                home.competition_team_id ===
                away.competition_team_id
            ) {
                return fail(
                    'Home and away teams cannot be the same.',
                )
            }

            if (!date) {
                return fail(
                    `Invalid date "${dateRaw}". Use DD/MM/YYYY or YYYY-MM-DD.`,
                )
            }

            if (!time) {
                return fail(
                    `Invalid time "${timeRaw}". Use HH:MM.`,
                )
            }

            const groupStage =
                norm(stage) ===
                norm('Group Stage')

            if (
                groupStage &&
                !group
            ) {
                return fail(
                    `Group "${groupRaw}" was not found.`,
                )
            }

            if (
                groupStage &&
                group
            ) {
                const allocated =
                    new Set(
                        groupMemberships
                            .filter(
                                (
                                    membership,
                                ) =>
                                    membership.group_id ===
                                    group.id,
                            )
                            .map(
                                (
                                    membership,
                                ) =>
                                    membership.competition_team_id,
                            ),
                    )

                if (
                    !allocated.has(
                        home.competition_team_id,
                    ) ||
                    !allocated.has(
                        away.competition_team_id,
                    )
                ) {
                    return fail(
                        `Both teams must belong to ${group.name}.`,
                    )
                }
            }

            if (
                venueRaw.trim() &&
                !venue
            ) {
                return fail(
                    `Venue "${venueRaw}" was not found.`,
                )
            }

            const rawStatus =
                norm(
                    statusRaw ||
                        'scheduled',
                )

            const status =
                rawStatus ===
                    'postponed' ||
                rawStatus ===
                    'completed' ||
                rawStatus ===
                    'cancelled'
                    ? rawStatus
                    : 'scheduled'

            return {
                rowNumber,
                summary,
                error: null,
                values: {
                    stage,
                    group_id:
                        groupStage
                            ? group?.id ??
                              ''
                            : '',
                    home_competition_team_id:
                        home.competition_team_id,
                    away_competition_team_id:
                        away.competition_team_id,
                    venue_id:
                        venue?.id ??
                        '',
                    kickoff_time:
                        `${date}T${time}`,
                    status,
                    referee_official_id:
                        '',
                    assistant_referee_1_official_id:
                        '',
                    assistant_referee_2_official_id:
                        '',
                    fourth_official_id:
                        '',
                },
            }
        })
    }, [
        groupMap,
        groupMemberships,
        teamMap,
        text,
        venueMap,
    ])

    const validRows =
        preview.filter(
            (
                row,
            ): row is PreviewRow & {
                values:
                    FixtureFormValues
            } =>
                row.values !== null &&
                row.error === null,
        )

    const errors =
        preview.length -
        validRows.length

    async function loadFile(
        file: File,
    ) {
        const lower =
            file.name.toLowerCase()

        if (
            !lower.endsWith('.csv') &&
            !lower.endsWith('.tsv') &&
            !lower.endsWith('.txt')
        ) {
            setSourceName(
                'Export the spreadsheet as CSV or TSV first.',
            )
            setText('')
            return
        }

        setSourceName(file.name)
        setText(await file.text())
    }

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
            <section
                role="dialog"
                aria-modal="true"
                className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--organisation-background)] shadow-2xl"
            >
                <header className="flex items-start justify-between gap-5 border-b border-white/10 bg-[var(--organisation-surface)] p-6 sm:p-8">
                    <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-[color:var(--organisation-accent)]/10 p-3">
                            <FileSpreadsheet className="h-6 w-6 text-[var(--organisation-accent)]" />
                        </div>

                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--organisation-accent)]">
                                Fixture Import
                            </p>
                            <h2 className="mt-1 text-3xl font-black text-white">
                                Import Existing Schedule
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                                Upload CSV/TSV exported from Excel or Google Sheets, or paste rows directly.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        aria-label="Close fixture import"
                        onClick={onClose}
                        disabled={isImporting}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-slate-300 disabled:opacity-40"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8">
                    <div className="grid gap-5 lg:grid-cols-2">
                        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                            <h3 className="font-black text-white">
                                Spreadsheet data
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                Columns: Stage, Group, Date, Time, Home Team, Away Team, Venue, Status.
                            </p>

                            <input
                                ref={inputRef}
                                type="file"
                                accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                                className="hidden"
                                onChange={(event) => {
                                    const file =
                                        event.target.files?.[0]

                                    if (file) {
                                        void loadFile(
                                            file,
                                        )
                                    }
                                }}
                            />

                            <div className="mt-5 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        inputRef.current?.click()
                                    }
                                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--organisation-accent)] px-4 py-3 text-sm font-black text-[var(--organisation-on-accent)]"
                                >
                                    <Upload className="h-4 w-4" />
                                    Choose CSV/TSV
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        downloadTemplate
                                    }
                                    className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white"
                                >
                                    Download template
                                </button>
                            </div>

                            {sourceName && (
                                <p className="mt-3 text-xs text-slate-400">
                                    {sourceName}
                                </p>
                            )}

                            <textarea
                                rows={12}
                                value={text}
                                onChange={(event) => {
                                    setSourceName(
                                        'Pasted spreadsheet data',
                                    )
                                    setText(
                                        event.target.value,
                                    )
                                }}
                                placeholder={`Stage\tGroup\tDate\tTime\tHome Team\tAway Team\tVenue\tStatus`}
                                className="mt-5 w-full resize-y rounded-2xl border border-white/10 bg-black/20 p-4 font-mono text-xs leading-6 text-white outline-none focus:border-[var(--organisation-accent)]"
                            />
                        </section>

                        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="font-black text-white">
                                        Validation preview
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-400">
                                        {validRows.length}{' '}
                                        ready /{' '}
                                        {errors}{' '}
                                        errors
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 max-h-[470px] space-y-2 overflow-y-auto">
                                {!preview.length ? (
                                    <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
                                        Upload or paste fixtures to preview them.
                                    </div>
                                ) : (
                                    preview.map(
                                        (row) => (
                                            <div
                                                key={
                                                    row.rowNumber
                                                }
                                                className={`rounded-xl border p-3 ${
                                                    row.error
                                                        ? 'border-red-400/20 bg-red-400/[0.06]'
                                                        : 'border-emerald-400/20 bg-emerald-400/[0.05]'
                                                }`}
                                            >
                                                <strong className="text-sm text-white">
                                                    Row{' '}
                                                    {
                                                        row.rowNumber
                                                    }
                                                    :{' '}
                                                    {
                                                        row.summary
                                                    }
                                                </strong>
                                                <p
                                                    className={`mt-1 text-xs ${
                                                        row.error
                                                            ? 'text-red-300'
                                                            : 'text-slate-400'
                                                    }`}
                                                >
                                                    {row.error ??
                                                        'Ready to import'}
                                                </p>
                                            </div>
                                        ),
                                    )
                                )}
                            </div>
                        </section>
                    </div>
                </div>

                <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-white/10 bg-[var(--organisation-surface)] p-5 sm:flex-row sm:justify-end sm:px-8">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isImporting}
                        className="rounded-xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        disabled={
                            isImporting ||
                            !validRows.length ||
                            errors > 0
                        }
                        onClick={() =>
                            void onImport(
                                validRows.map(
                                    (row) =>
                                        row.values,
                                ),
                            )
                        }
                        className="rounded-xl bg-[var(--organisation-accent)] px-5 py-3 text-sm font-black text-[var(--organisation-on-accent)] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                    >
                        {isImporting
                            ? 'Importing...'
                            : `Import ${validRows.length} Fixture${
                                  validRows.length ===
                                  1
                                      ? ''
                                      : 's'
                              }`}
                    </button>
                </footer>
            </section>
        </div>
    )
}
