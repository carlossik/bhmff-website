import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { ConfirmDialog } from '../../common/ConfirmDialog'

const enquiryStatuses = [
    'new',
    'contacted',
    'proposal_sent',
    'negotiating',
    'secured',
    'closed',
] as const

type EnquiryStatus =
    (typeof enquiryStatuses)[number]

type SponsorEnquiry = {
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
    status: EnquiryStatus
    internal_notes: string | null
}

function formatStatus(status: EnquiryStatus) {
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
    return new Date(value).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function EnquiriesManager() {
    const [enquiries, setEnquiries] =
        useState<SponsorEnquiry[]>([])

    const [selectedEnquiry, setSelectedEnquiry] =
        useState<SponsorEnquiry | null>(null)

    const [enquiryToDelete, setEnquiryToDelete] =
        useState<SponsorEnquiry | null>(null)

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

            const { data, error } =
                await supabase
                    .from('sponsor_enquiries')
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
                    .order('created_at', {
                        ascending: false,
                    })

            if (error) {
                console.error(
                    'Failed to load sponsor enquiries:',
                    error
                )

                setErrorMessage(
                    'Unable to load sponsorship enquiries.'
                )
                setEnquiries([])
                setLoading(false)
                return
            }

            setEnquiries(
                (data ?? []) as SponsorEnquiry[]
            )
            setLoading(false)
        }, [])

    useEffect(() => {
        void loadEnquiries()
    }, [loadEnquiries])

    const stats = useMemo(() => {
        const countByStatus = (
            status: EnquiryStatus
        ) =>
            enquiries.filter(
                (enquiry) =>
                    enquiry.status === status
            ).length

        return [
            {
                label: 'New',
                value: countByStatus('new'),
            },
            {
                label: 'Contacted',
                value: countByStatus('contacted'),
            },
            {
                label: 'Proposal Sent',
                value: countByStatus(
                    'proposal_sent'
                ),
            },
            {
                label: 'Secured',
                value: countByStatus('secured'),
            },
        ]
    }, [enquiries])

    function openEnquiry(
        enquiry: SponsorEnquiry
    ) {
        setSelectedEnquiry(enquiry)
        setInternalNotes(
            enquiry.internal_notes ?? ''
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
        enquiry: SponsorEnquiry,
        status: EnquiryStatus
    ) {
        setSaving(true)
        setMessage(null)
        setErrorMessage(null)

        const { error } = await supabase
            .from('sponsor_enquiries')
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

        setSelectedEnquiry((current) =>
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

        const { error } = await supabase
            .from('sponsor_enquiries')
            .update({
                internal_notes:
                    internalNotes.trim() || null,
            })
            .eq('id', selectedEnquiry.id)

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

        setSelectedEnquiry((current) =>
            current
                ? {
                    ...current,
                    internal_notes:
                        internalNotes.trim() ||
                        null,
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

        const enquiry = enquiryToDelete

        setSaving(true)
        setMessage(null)
        setErrorMessage(null)

        const { error } = await supabase
            .from('sponsor_enquiries')
            .delete()
            .eq('id', enquiry.id)

        if (error) {
            console.error(
                'Failed to delete sponsor enquiry:',
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
            enquiry.id
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
                        Sponsorship Enquiries
                    </h3>

                    <p className="muted">
                        Review partnership enquiries,
                        track progress and record
                        follow-up activity.
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

            {loading ? (
                <p className="muted">
                    Loading enquiries...
                </p>
            ) : enquiries.length ? (
                <div className="enquiriesGrid">
                    {enquiries.map(
                        (enquiry) => (
                            <article
                                className="enquiryCard"
                                key={enquiry.id}
                            >
                                <div className="enquiryCardHeader">
                                    <div>
                                        <span
                                            className={`enquiryStatusBadge enquiryStatus-${enquiry.status}`}
                                        >
                                            {formatStatus(
                                                enquiry.status
                                            )}
                                        </span>

                                        <h4>
                                            {
                                                enquiry.company_name
                                            }
                                        </h4>
                                    </div>

                                    <span className="muted enquiryDate">
                                        {formatDate(
                                            enquiry.created_at
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
                                                enquiry.contact_name
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span className="teamAdminFieldLabel">
                                            Interest
                                        </span>

                                        <span>
                                            {enquiry.sponsorship_interest ??
                                                'Not specified'}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="teamAdminFieldLabel">
                                            Budget
                                        </span>

                                        <span>
                                            {enquiry.estimated_budget ??
                                                'Not specified'}
                                        </span>
                                    </div>

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

                                    <button
                                        className="btn secondary small"
                                        type="button"
                                        disabled={
                                            saving
                                        }
                                        onClick={() =>
                                            void updateStatus(
                                                enquiry,
                                                'proposal_sent'
                                            )
                                        }
                                    >
                                        Proposal Sent
                                    </button>
                                </div>
                            </article>
                        )
                    )}
                </div>
            ) : (
                <div className="teamsEmptyState">
                    <h3>
                        No sponsorship enquiries
                    </h3>

                    <p>
                        New public partnership
                        enquiries will appear here.
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
                                <span className="eyebrow">
                                    Sponsorship Pipeline
                                </span>

                                <h2 id="enquiry-admin-title">
                                    {
                                        selectedEnquiry.company_name
                                    }
                                </h2>

                                <p className="muted">
                                    Submitted{' '}
                                    {formatDate(
                                        selectedEnquiry.created_at
                                    )}
                                </p>
                            </div>

                            <button
                                className="btn secondary small"
                                type="button"
                                disabled={saving}
                                onClick={closeEnquiry}
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
                                        selectedEnquiry.contact_name
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

                            <div>
                                <span className="teamAdminFieldLabel">
                                    Interest
                                </span>

                                <span>
                                    {selectedEnquiry.sponsorship_interest ??
                                        'Not specified'}
                                </span>
                            </div>

                            <div>
                                <span className="teamAdminFieldLabel">
                                    Estimated budget
                                </span>

                                <span>
                                    {selectedEnquiry.estimated_budget ??
                                        'Not specified'}
                                </span>
                            </div>

                            <label>
                                <span>
                                    Pipeline status
                                </span>

                                <select
                                    value={
                                        selectedEnquiry.status
                                    }
                                    disabled={saving}
                                    onChange={(
                                        event
                                    ) =>
                                        void updateStatus(
                                            selectedEnquiry,
                                            event.target
                                                .value as EnquiryStatus
                                        )
                                    }
                                >
                                    {enquiryStatuses.map(
                                        (status) => (
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
                                onChange={(event) =>
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
                                href={`mailto:${selectedEnquiry.email}?subject=Black History Month Football Festival Partnership`}
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
                    message={`Are you sure you want to delete the sponsorship enquiry from ${enquiryToDelete.company_name}? This action cannot be undone.`}
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