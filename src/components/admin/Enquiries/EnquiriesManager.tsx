import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { ConfirmDialog } from '../../common/ConfirmDialog'

const sponsorStatuses = [
    'new',
    'contacted',
    'proposal_sent',
    'negotiating',
    'secured',
    'closed',
] as const

const demoStatuses = [
    'new',
    'contacted',
    'qualified',
    'closed',
] as const

type SponsorEnquiryStatus =
    (typeof sponsorStatuses)[number]

type DemoRequestStatus =
    (typeof demoStatuses)[number]

type CommercialEnquiryStatus =
    | SponsorEnquiryStatus
    | DemoRequestStatus

type EnquiryType =
    | 'sponsorship'
    | 'demo'

type EnquiryFilter =
    | 'all'
    | EnquiryType

type SponsorEnquiryRow = {
    id: string
    created_at: string
    festival_id: string | null
    company_name: string
    contact_name: string
    email: string
    phone: string | null
    sponsorship_interest: string | null
    estimated_budget: string | null
    message: string
    status: SponsorEnquiryStatus
    internal_notes: string | null
}

type DemoRequestRow = {
    id: string
    created_at: string
    organisation: string
    contact_name: string
    email: string
    phone: string | null
    competition_type: string
    number_of_teams: number | null
    message: string
    status: DemoRequestStatus
    internal_notes: string | null
}

type CommercialEnquiry = {
    id: string
    type: EnquiryType
    createdAt: string
    organisation: string
    contactName: string
    email: string
    phone: string | null
    message: string
    status: CommercialEnquiryStatus
    internalNotes: string | null
    sponsorshipInterest: string | null
    estimatedBudget: string | null
    competitionType: string | null
    numberOfTeams: number | null
}

function formatStatus(
    status: CommercialEnquiryStatus
) {
    return status
        .split('_')
        .map(
            (word) =>
                word.charAt(0).toUpperCase() +
                word.slice(1)
        )
        .join(' ')
}

function formatDate(value: string) {
    return new Date(value).toLocaleString(
        'en-GB',
        {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }
    )
}

function formatEnquiryType(
    type: EnquiryType
) {
    return type === 'sponsorship'
        ? 'Sponsorship'
        : 'Demo Request'
}

function formatCompetitionType(
    value: string | null
) {
    if (!value) {
        return 'Not specified'
    }

    return value
        .split('_')
        .map(
            (word) =>
                word.charAt(0).toUpperCase() +
                word.slice(1)
        )
        .join(' ')
}

function getStatusOptions(
    enquiry: CommercialEnquiry
) {
    return enquiry.type === 'sponsorship'
        ? sponsorStatuses
        : demoStatuses
}

function getSourceTable(
    enquiry: CommercialEnquiry
) {
    return enquiry.type === 'sponsorship'
        ? 'sponsor_enquiries'
        : 'demo_requests'
}

export function EnquiriesManager() {
    const [enquiries, setEnquiries] =
        useState<CommercialEnquiry[]>([])

    const [selectedEnquiry, setSelectedEnquiry] =
        useState<CommercialEnquiry | null>(null)

    const [enquiryToDelete, setEnquiryToDelete] =
        useState<CommercialEnquiry | null>(null)

    const [activeFilter, setActiveFilter] =
        useState<EnquiryFilter>('all')

    const [internalNotes, setInternalNotes] =
        useState('')

    const [loading, setLoading] =
        useState(true)

    const [saving, setSaving] =
        useState(false)

    const [message, setMessage] =
        useState<string | null>(null)

    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    const loadEnquiries =
        useCallback(async () => {
            setLoading(true)
            setErrorMessage(null)

            const [
                sponsorResponse,
                demoResponse,
            ] = await Promise.all([
                supabase
                    .from(
                        'sponsor_enquiries'
                    )
                    .select(`
                        id,
                        created_at,
                        festival_id,
                        company_name,
                        contact_name,
                        email,
                        phone,
                        sponsorship_interest,
                        estimated_budget,
                        message,
                        status,
                        internal_notes
                    `)
                    .order(
                        'created_at',
                        {
                            ascending: false,
                        }
                    ),

                supabase
                    .from('demo_requests')
                    .select(`
                        id,
                        created_at,
                        organisation,
                        contact_name,
                        email,
                        phone,
                        competition_type,
                        number_of_teams,
                        message,
                        status,
                        internal_notes
                    `)
                    .order(
                        'created_at',
                        {
                            ascending: false,
                        }
                    ),
            ])

            const errors: string[] = []

            if (
                sponsorResponse.error
            ) {
                console.error(
                    'Failed to load sponsorship enquiries:',
                    sponsorResponse.error
                )

                errors.push(
                    'sponsorship enquiries'
                )
            }

            if (demoResponse.error) {
                console.error(
                    'Failed to load demo requests:',
                    demoResponse.error
                )

                errors.push(
                    'demo requests'
                )
            }

            const sponsorEnquiries =
                (
                    sponsorResponse.data ??
                    []
                ).map((row) => {
                    const sponsor =
                        row as SponsorEnquiryRow

                    return {
                        id: sponsor.id,
                        type:
                            'sponsorship' as const,
                        createdAt:
                        sponsor.created_at,
                        organisation:
                        sponsor.company_name,
                        contactName:
                        sponsor.contact_name,
                        email:
                        sponsor.email,
                        phone:
                        sponsor.phone,
                        message:
                        sponsor.message,
                        status:
                        sponsor.status,
                        internalNotes:
                        sponsor.internal_notes,
                        sponsorshipInterest:
                        sponsor.sponsorship_interest,
                        estimatedBudget:
                        sponsor.estimated_budget,
                        competitionType:
                            null,
                        numberOfTeams:
                            null,
                    }
                })

            const demoEnquiries =
                (
                    demoResponse.data ??
                    []
                ).map((row) => {
                    const demo =
                        row as DemoRequestRow

                    return {
                        id: demo.id,
                        type: 'demo' as const,
                        createdAt:
                        demo.created_at,
                        organisation:
                        demo.organisation,
                        contactName:
                        demo.contact_name,
                        email: demo.email,
                        phone: demo.phone,
                        message:
                        demo.message,
                        status:
                        demo.status,
                        internalNotes:
                        demo.internal_notes,
                        sponsorshipInterest:
                            null,
                        estimatedBudget:
                            null,
                        competitionType:
                        demo.competition_type,
                        numberOfTeams:
                        demo.number_of_teams,
                    }
                })

            const merged = [
                ...sponsorEnquiries,
                ...demoEnquiries,
            ].sort(
                (first, second) =>
                    new Date(
                        second.createdAt
                    ).getTime() -
                    new Date(
                        first.createdAt
                    ).getTime()
            )

            setEnquiries(merged)

            if (errors.length) {
                setErrorMessage(
                    `Unable to load ${errors.join(
                        ' and '
                    )}.`
                )
            }

            setLoading(false)
        }, [])

    useEffect(() => {
        void loadEnquiries()
    }, [loadEnquiries])

    const filteredEnquiries =
        useMemo(
            () =>
                activeFilter === 'all'
                    ? enquiries
                    : enquiries.filter(
                        (enquiry) =>
                            enquiry.type ===
                            activeFilter
                    ),
            [
                activeFilter,
                enquiries,
            ]
        )

    const stats = useMemo(() => {
        return [
            {
                label: 'All',
                value:
                enquiries.length,
            },
            {
                label: 'New',
                value:
                enquiries.filter(
                    (enquiry) =>
                        enquiry.status ===
                        'new'
                ).length,
            },
            {
                label: 'Sponsorship',
                value:
                enquiries.filter(
                    (enquiry) =>
                        enquiry.type ===
                        'sponsorship'
                ).length,
            },
            {
                label: 'Demo Requests',
                value:
                enquiries.filter(
                    (enquiry) =>
                        enquiry.type ===
                        'demo'
                ).length,
            },
        ]
    }, [enquiries])

    function openEnquiry(
        enquiry: CommercialEnquiry
    ) {
        setSelectedEnquiry(enquiry)
        setInternalNotes(
            enquiry.internalNotes ?? ''
        )
        setMessage(null)
        setErrorMessage(null)
    }

    function closeEnquiry() {
        if (saving) {
            return
        }

        setSelectedEnquiry(null)
        setInternalNotes('')
        setMessage(null)
        setErrorMessage(null)
    }

    async function updateStatus(
        enquiry: CommercialEnquiry,
        status: CommercialEnquiryStatus
    ) {
        const allowedStatuses =
            getStatusOptions(enquiry)

        if (
            !allowedStatuses.includes(
                status as never
            )
        ) {
            setErrorMessage(
                'The selected status is not valid for this enquiry type.'
            )
            return
        }

        setSaving(true)
        setMessage(null)
        setErrorMessage(null)

        const table =
            getSourceTable(enquiry)

        const { error } = await supabase
            .from(table)
            .update({ status })
            .eq('id', enquiry.id)

        if (error) {
            console.error(
                'Failed to update enquiry status:',
                error
            )

            setErrorMessage(
                'Unable to update the enquiry status.'
            )
            setSaving(false)
            return
        }

        setSelectedEnquiry(
            (current) =>
                current
                    ? {
                        ...current,
                        status,
                    }
                    : current
        )

        setMessage(
            `Enquiry status changed to ${formatStatus(
                status
            )}.`
        )

        await loadEnquiries()
        setSaving(false)
    }

    async function saveNotes() {
        if (!selectedEnquiry) {
            return
        }

        setSaving(true)
        setMessage(null)
        setErrorMessage(null)

        const table =
            getSourceTable(
                selectedEnquiry
            )

        const notes =
            internalNotes.trim() ||
            null

        const { error } = await supabase
            .from(table)
            .update({
                internal_notes: notes,
            })
            .eq(
                'id',
                selectedEnquiry.id
            )

        if (error) {
            console.error(
                'Failed to save enquiry notes:',
                error
            )

            setErrorMessage(
                'Unable to save internal notes.'
            )
            setSaving(false)
            return
        }

        setSelectedEnquiry(
            (current) =>
                current
                    ? {
                        ...current,
                        internalNotes:
                        notes,
                    }
                    : current
        )

        setMessage(
            'Internal notes saved successfully.'
        )

        await loadEnquiries()
        setSaving(false)
    }

    async function confirmDeleteEnquiry() {
        if (!enquiryToDelete) {
            return
        }

        const enquiry =
            enquiryToDelete

        setSaving(true)
        setMessage(null)
        setErrorMessage(null)

        const table =
            getSourceTable(enquiry)

        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', enquiry.id)

        if (error) {
            console.error(
                'Failed to delete enquiry:',
                error
            )

            setErrorMessage(
                'Unable to delete the enquiry.'
            )
            setSaving(false)
            return
        }

        if (
            selectedEnquiry?.id ===
            enquiry.id &&
            selectedEnquiry.type ===
            enquiry.type
        ) {
            setSelectedEnquiry(null)
            setInternalNotes('')
        }

        setEnquiryToDelete(null)

        setMessage(
            'Enquiry deleted successfully.'
        )

        await loadEnquiries()
        setSaving(false)
    }

    return (
        <div>
            <div className="adminWorkspaceHeader">
                <div>
                    <h3>
                        Commercial Enquiries
                    </h3>

                    <p className="muted">
                        Review sponsorship
                        opportunities and platform
                        demonstration requests from one
                        central inbox.
                    </p>
                </div>
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

            <div className="statGrid adminStats enquiriesStats">
                {stats.map((stat) => (
                    <div key={stat.label}>
                        <strong>
                            {stat.value}
                        </strong>

                        <span>
                            {stat.label}
                        </span>
                    </div>
                ))}
            </div>

            <div className="adminTabList">
                {(
                    [
                        [
                            'all',
                            'All',
                        ],
                        [
                            'sponsorship',
                            'Sponsorship',
                        ],
                        [
                            'demo',
                            'Demo Requests',
                        ],
                    ] as const
                ).map(
                    ([
                         value,
                         label,
                     ]) => (
                        <button
                            key={value}
                            type="button"
                            className={
                                activeFilter ===
                                value
                                    ? 'active'
                                    : ''
                            }
                            onClick={() =>
                                setActiveFilter(
                                    value
                                )
                            }
                        >
                            {label}
                        </button>
                    )
                )}
            </div>

            {loading ? (
                <p className="muted">
                    Loading enquiries...
                </p>
            ) : filteredEnquiries.length ? (
                <div className="enquiriesGrid">
                    {filteredEnquiries.map(
                        (enquiry) => (
                            <article
                                className="enquiryCard"
                                key={`${enquiry.type}-${enquiry.id}`}
                            >
                                <div className="enquiryCardHeader">
                                    <div>
                                        <div className="teamAdminBadges">
                                            <span
                                                className={`enquiryStatusBadge enquiryStatus-${enquiry.status}`}
                                            >
                                                {formatStatus(
                                                    enquiry.status
                                                )}
                                            </span>

                                            <span className="teamVisibilityBadge teamVisibilityPublished">
                                                {formatEnquiryType(
                                                    enquiry.type
                                                )}
                                            </span>
                                        </div>

                                        <h4>
                                            {
                                                enquiry.organisation
                                            }
                                        </h4>
                                    </div>

                                    <span className="muted enquiryDate">
                                        {formatDate(
                                            enquiry.createdAt
                                        )}
                                    </span>
                                </div>

                                <div className="enquirySummaryGrid">
                                    <div>
                                        <span className="teamAdminFieldLabel">
                                            Contact
                                        </span>

                                        <strong>
                                            {
                                                enquiry.contactName
                                            }
                                        </strong>
                                    </div>

                                    {enquiry.type ===
                                    'sponsorship' ? (
                                        <>
                                            <div>
                                                <span className="teamAdminFieldLabel">
                                                    Interest
                                                </span>

                                                <span>
                                                    {enquiry.sponsorshipInterest ??
                                                        'Not specified'}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="teamAdminFieldLabel">
                                                    Budget
                                                </span>

                                                <span>
                                                    {enquiry.estimatedBudget ??
                                                        'Not specified'}
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <span className="teamAdminFieldLabel">
                                                    Competition
                                                </span>

                                                <span>
                                                    {formatCompetitionType(
                                                        enquiry.competitionType
                                                    )}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="teamAdminFieldLabel">
                                                    Teams
                                                </span>

                                                <span>
                                                    {enquiry.numberOfTeams ??
                                                        'Not specified'}
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    <div>
                                        <span className="teamAdminFieldLabel">
                                            Email
                                        </span>

                                        <a
                                            href={`mailto:${enquiry.email}`}
                                        >
                                            {
                                                enquiry.email
                                            }
                                        </a>
                                    </div>
                                </div>

                                <p className="enquiryMessagePreview">
                                    {
                                        enquiry.message
                                    }
                                </p>

                                <div className="teamAdminCardActions">
                                    <button
                                        className="btn secondary small"
                                        type="button"
                                        onClick={() =>
                                            openEnquiry(
                                                enquiry
                                            )
                                        }
                                    >
                                        View
                                    </button>

                                    {enquiry.status !==
                                        'contacted' && (
                                            <button
                                                className="btn secondary small"
                                                type="button"
                                                disabled={
                                                    saving
                                                }
                                                onClick={() =>
                                                    void updateStatus(
                                                        enquiry,
                                                        'contacted'
                                                    )
                                                }
                                            >
                                                Mark Contacted
                                            </button>
                                        )}

                                    <button
                                        className="btn secondary small dangerButton"
                                        type="button"
                                        disabled={
                                            saving
                                        }
                                        onClick={() =>
                                            setEnquiryToDelete(
                                                enquiry
                                            )
                                        }
                                    >
                                        Delete
                                    </button>
                                </div>
                            </article>
                        )
                    )}
                </div>
            ) : (
                <div className="teamsEmptyState">
                    <h3>
                        No enquiries found
                    </h3>

                    <p>
                        New sponsorship and demo
                        requests will appear here.
                    </p>
                </div>
            )}

            {selectedEnquiry && (
                <div
                    className="sponsorEnquiryOverlay"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeEnquiry()
                        }
                    }}
                >
                    <section
                        className="sponsorEnquiryModal enquiryAdminModal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="enquiry-admin-title"
                    >
                        <div className="sponsorEnquiryHeader">
                            <div>
                                <div className="teamAdminBadges">
                                    <span className="eyebrow">
                                        Commercial
                                        Enquiry
                                    </span>

                                    <span className="teamVisibilityBadge teamVisibilityPublished">
                                        {formatEnquiryType(
                                            selectedEnquiry.type
                                        )}
                                    </span>
                                </div>

                                <h2 id="enquiry-admin-title">
                                    {
                                        selectedEnquiry.organisation
                                    }
                                </h2>

                                <p className="muted">
                                    Submitted{' '}
                                    {formatDate(
                                        selectedEnquiry.createdAt
                                    )}
                                </p>
                            </div>

                            <button
                                className="btn secondary small"
                                type="button"
                                disabled={saving}
                                onClick={
                                    closeEnquiry
                                }
                            >
                                Close
                            </button>
                        </div>

                        <div className="enquiryDetailGrid">
                            <div>
                                <span className="teamAdminFieldLabel">
                                    Contact
                                </span>

                                <strong>
                                    {
                                        selectedEnquiry.contactName
                                    }
                                </strong>
                            </div>

                            <div>
                                <span className="teamAdminFieldLabel">
                                    Email
                                </span>

                                <a
                                    href={`mailto:${selectedEnquiry.email}`}
                                >
                                    {
                                        selectedEnquiry.email
                                    }
                                </a>
                            </div>

                            <div>
                                <span className="teamAdminFieldLabel">
                                    Phone
                                </span>

                                {selectedEnquiry.phone ? (
                                    <a
                                        href={`tel:${selectedEnquiry.phone}`}
                                    >
                                        {
                                            selectedEnquiry.phone
                                        }
                                    </a>
                                ) : (
                                    <span>
                                        Not provided
                                    </span>
                                )}
                            </div>

                            {selectedEnquiry.type ===
                            'sponsorship' ? (
                                <>
                                    <div>
                                        <span className="teamAdminFieldLabel">
                                            Interest
                                        </span>

                                        <span>
                                            {selectedEnquiry.sponsorshipInterest ??
                                                'Not specified'}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="teamAdminFieldLabel">
                                            Estimated
                                            budget
                                        </span>

                                        <span>
                                            {selectedEnquiry.estimatedBudget ??
                                                'Not specified'}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <span className="teamAdminFieldLabel">
                                            Competition
                                            type
                                        </span>

                                        <span>
                                            {formatCompetitionType(
                                                selectedEnquiry.competitionType
                                            )}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="teamAdminFieldLabel">
                                            Approximate
                                            teams
                                        </span>

                                        <span>
                                            {selectedEnquiry.numberOfTeams ??
                                                'Not specified'}
                                        </span>
                                    </div>
                                </>
                            )}

                            <label>
                                <span>
                                    Pipeline status
                                </span>

                                <select
                                    value={
                                        selectedEnquiry.status
                                    }
                                    disabled={
                                        saving
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        void updateStatus(
                                            selectedEnquiry,
                                            event.target
                                                .value as CommercialEnquiryStatus
                                        )
                                    }
                                >
                                    {getStatusOptions(
                                        selectedEnquiry
                                    ).map(
                                        (
                                            status
                                        ) => (
                                            <option
                                                key={
                                                    status
                                                }
                                                value={
                                                    status
                                                }
                                            >
                                                {formatStatus(
                                                    status
                                                )}
                                            </option>
                                        )
                                    )}
                                </select>
                            </label>
                        </div>

                        <div className="enquiryMessagePanel">
                            <span className="teamAdminFieldLabel">
                                Enquiry message
                            </span>

                            <p>
                                {
                                    selectedEnquiry.message
                                }
                            </p>
                        </div>

                        <label className="adminFormFullWidth enquiryNotesField">
                            <span>
                                Internal notes
                            </span>

                            <textarea
                                value={
                                    internalNotes
                                }
                                onChange={(
                                    event
                                ) =>
                                    setInternalNotes(
                                        event.target
                                            .value
                                    )
                                }
                                placeholder="Record calls, meetings, proposals and follow-up actions."
                                rows={6}
                            />
                        </label>

                        <div className="adminFormActions">
                            <button
                                className="btn primary"
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                    void saveNotes()
                                }
                            >
                                {saving
                                    ? 'Saving...'
                                    : 'Save Notes'}
                            </button>

                            <a
                                className="btn secondary"
                                href={`mailto:${selectedEnquiry.email}?subject=${encodeURIComponent(
                                    selectedEnquiry.type ===
                                    'sponsorship'
                                        ? 'CKEFA Partnership Enquiry'
                                        : 'CKEFA Competition Platform Demo'
                                )}`}
                            >
                                Email Contact
                            </a>

                            <button
                                className="btn secondary dangerButton"
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                    setEnquiryToDelete(
                                        selectedEnquiry
                                    )
                                }
                            >
                                Delete Enquiry
                            </button>
                        </div>
                    </section>
                </div>
            )}

            {enquiryToDelete && (
                <ConfirmDialog
                    title="Delete Enquiry"
                    message={`Are you sure you want to delete the ${formatEnquiryType(
                        enquiryToDelete.type
                    ).toLowerCase()} from ${enquiryToDelete.organisation}? This action cannot be undone.`}
                    confirmText={
                        saving
                            ? 'Deleting...'
                            : 'Delete'
                    }
                    cancelText="Cancel"
                    onCancel={() => {
                        if (!saving) {
                            setEnquiryToDelete(
                                null
                            )
                        }
                    }}
                    onConfirm={() => {
                        if (!saving) {
                            void confirmDeleteEnquiry()
                        }
                    }}
                />
            )}
        </div>
    )
}