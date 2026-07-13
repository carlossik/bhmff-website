import {
    useEffect,
    useState,
    type FormEvent,
} from 'react'
import { supabase } from '../../lib/supabaseClient'

type PublicSponsor = {
    id: string
    name: string
    tier: string | null
    logo_url: string | null
    website_url: string | null
    description: string | null
}

type SponsorEnquiryForm = {
    companyName: string
    contactName: string
    email: string
    phone: string
    sponsorshipInterest: string
    estimatedBudget: string
    message: string
}

const initialEnquiryForm: SponsorEnquiryForm = {
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    sponsorshipInterest: '',
    estimatedBudget: '',
    message: '',
}

export function PublicSponsors() {
    const [sponsors, setSponsors] =
        useState<PublicSponsor[]>([])

    const [isLoading, setIsLoading] =
        useState(true)

    const [
        activeFestivalId,
        setActiveFestivalId,
    ] = useState<string | null>(null)

    const [
        showEnquiryForm,
        setShowEnquiryForm,
    ] = useState(false)

    const [form, setForm] =
        useState<SponsorEnquiryForm>(
            initialEnquiryForm
        )

    const [isSubmitting, setIsSubmitting] =
        useState(false)

    const [
        submissionMessage,
        setSubmissionMessage,
    ] = useState<string | null>(null)

    const [
        submissionError,
        setSubmissionError,
    ] = useState<string | null>(null)

    useEffect(() => {
        async function loadSponsors() {
            try {
                const {
                    data: festival,
                    error: festivalError,
                } = await supabase
                    .from('festivals')
                    .select('id')
                    .eq('status', 'active')
                    .order('year', {
                        ascending: false,
                    })
                    .limit(1)
                    .maybeSingle()

                if (festivalError) {
                    throw festivalError
                }

                if (!festival) {
                    setActiveFestivalId(null)
                    setSponsors([])
                    return
                }

                setActiveFestivalId(festival.id)

                const { data, error } =
                    await supabase
                        .from('sponsors')
                        .select(`
                            id,
                            name,
                            tier,
                            logo_url,
                            website_url,
                            description
                        `)
                        .eq(
                            'festival_id',
                            festival.id
                        )
                        .eq('active', true)
                        .order('created_at', {
                            ascending: true,
                        })

                if (error) {
                    throw error
                }

                setSponsors(data ?? [])
            } catch (error) {
                console.error(
                    'Failed to load public sponsors:',
                    error
                )

                setSponsors([])
            } finally {
                setIsLoading(false)
            }
        }

        void loadSponsors()
    }, [])

    function updateForm<
        Key extends keyof SponsorEnquiryForm
    >(
        key: Key,
        value: SponsorEnquiryForm[Key]
    ) {
        setForm((current) => ({
            ...current,
            [key]: value,
        }))
    }

    function openEnquiryForm() {
        setSubmissionMessage(null)
        setSubmissionError(null)
        setShowEnquiryForm(true)
    }

    function closeEnquiryForm() {
        if (isSubmitting) {
            return
        }

        setShowEnquiryForm(false)
        setSubmissionMessage(null)
        setSubmissionError(null)
        setForm(initialEnquiryForm)
    }

    function validateEnquiry() {
        if (!form.companyName.trim()) {
            return 'Organisation name is required.'
        }

        if (!form.contactName.trim()) {
            return 'Contact name is required.'
        }

        if (!form.email.trim()) {
            return 'Email address is required.'
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                form.email.trim()
            )
        ) {
            return 'Enter a valid email address.'
        }

        if (!form.message.trim()) {
            return 'Please enter a short message.'
        }

        if (!activeFestivalId) {
            return 'The active festival could not be identified.'
        }

        return null
    }

    async function submitEnquiry(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()

        const validationError =
            validateEnquiry()

        if (validationError) {
            setSubmissionError(
                validationError
            )
            setSubmissionMessage(null)
            return
        }

        setIsSubmitting(true)
        setSubmissionError(null)
        setSubmissionMessage(null)

        const { error } = await supabase
            .from('sponsor_enquiries')
            .insert({
                festival_id:
                activeFestivalId,
                company_name:
                    form.companyName.trim(),
                contact_name:
                    form.contactName.trim(),
                email: form.email.trim(),
                phone:
                    form.phone.trim() ||
                    null,
                sponsorship_interest:
                    form.sponsorshipInterest.trim() ||
                    null,
                estimated_budget:
                    form.estimatedBudget.trim() ||
                    null,
                message:
                    form.message.trim(),
                status: 'new',
            })

        if (error) {
            console.error(
                'Failed to submit sponsorship enquiry:',
                error
            )

            setSubmissionError(
                'Your enquiry could not be submitted. Please try again.'
            )

            setIsSubmitting(false)
            return
        }

        setSubmissionMessage(
            'Thank you. Your partnership enquiry has been received and a member of the festival team will contact you shortly.'
        )

        setForm(initialEnquiryForm)
        setIsSubmitting(false)
    }

    if (isLoading) {
        return (
            <p className="muted">
                Loading festival partners...
            </p>
        )
    }

    return (
        <>
            <div className="cardGrid three">
                {sponsors.map((sponsor) => (
                    <article
                        className="card sponsorCard publicSponsorCard"
                        key={sponsor.id}
                    >
                        {sponsor.logo_url && (
                            <div className="publicSponsorLogo">
                                <img
                                    src={
                                        sponsor.logo_url
                                    }
                                    alt={`${sponsor.name} logo`}
                                    loading="lazy"
                                />
                            </div>
                        )}

                        <span className="badge">
                            {sponsor.tier ??
                                'Festival Partner'}
                        </span>

                        <h3>
                            {sponsor.name}
                        </h3>

                        {sponsor.description && (
                            <p>
                                {
                                    sponsor.description
                                }
                            </p>
                        )}

                        {sponsor.website_url && (
                            <a
                                className="btn secondary small"
                                href={
                                    sponsor.website_url
                                }
                                target="_blank"
                                rel="noreferrer"
                            >
                                Visit Partner
                            </a>
                        )}
                    </article>
                ))}

                <article className="card sponsorCard partnershipCallout">
                    <span className="badge">
                        Partnership Opportunities
                    </span>

                    <h3>
                        Become a Festival Partner
                    </h3>

                    <p>
                        Support grassroots football,
                        community development and Black
                        History Month while promoting
                        your organisation to players,
                        families and the wider
                        community.
                    </p>

                    <button
                        className="btn primary small"
                        type="button"
                        onClick={
                            openEnquiryForm
                        }
                    >
                        Discuss Partnership
                    </button>
                </article>
            </div>

            {showEnquiryForm && (
                <div
                    className="sponsorEnquiryOverlay"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeEnquiryForm()
                        }
                    }}
                >
                    <section
                        className="sponsorEnquiryModal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="sponsor-enquiry-title"
                    >
                        <div className="sponsorEnquiryHeader">
                            <div>
                                <span className="eyebrow">
                                    Festival Partnership
                                </span>

                                <h2 id="sponsor-enquiry-title">
                                    Discuss Sponsorship
                                </h2>

                                <p className="muted">
                                    Tell us about your
                                    organisation and how
                                    you would like to
                                    support the festival.
                                </p>
                            </div>

                            <button
                                className="btn secondary small"
                                type="button"
                                disabled={
                                    isSubmitting
                                }
                                onClick={
                                    closeEnquiryForm
                                }
                            >
                                Close
                            </button>
                        </div>

                        {submissionMessage ? (
                            <div className="sponsorEnquirySuccess">
                                <h3>
                                    Enquiry received
                                </h3>

                                <p>
                                    {
                                        submissionMessage
                                    }
                                </p>

                                <button
                                    className="btn primary"
                                    type="button"
                                    onClick={
                                        closeEnquiryForm
                                    }
                                >
                                    Close
                                </button>
                            </div>
                        ) : (
                            <form
                                onSubmit={
                                    submitEnquiry
                                }
                            >
                                {submissionError && (
                                    <p className="adminErrorMessage">
                                        {
                                            submissionError
                                        }
                                    </p>
                                )}

                                <div className="adminFormGrid">
                                    <label>
                                        <span>
                                            Organisation
                                        </span>

                                        <input
                                            value={
                                                form.companyName
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateForm(
                                                    'companyName',
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="Organisation name"
                                            autoComplete="organization"
                                        />
                                    </label>

                                    <label>
                                        <span>
                                            Contact name
                                        </span>

                                        <input
                                            value={
                                                form.contactName
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateForm(
                                                    'contactName',
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="Your name"
                                            autoComplete="name"
                                        />
                                    </label>

                                    <label>
                                        <span>
                                            Email
                                        </span>

                                        <input
                                            type="email"
                                            value={
                                                form.email
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateForm(
                                                    'email',
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="name@organisation.com"
                                            autoComplete="email"
                                        />
                                    </label>

                                    <label>
                                        <span>
                                            Phone
                                        </span>

                                        <input
                                            type="tel"
                                            value={
                                                form.phone
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateForm(
                                                    'phone',
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="Telephone number"
                                            autoComplete="tel"
                                        />
                                    </label>

                                    <label>
                                        <span>
                                            Partnership
                                            interest
                                        </span>

                                        <select
                                            value={
                                                form.sponsorshipInterest
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateForm(
                                                    'sponsorshipInterest',
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        >
                                            <option value="">
                                                Select an
                                                option
                                            </option>

                                            <option value="Festival sponsorship">
                                                Festival
                                                sponsorship
                                            </option>

                                            <option value="Match sponsorship">
                                                Match
                                                sponsorship
                                            </option>

                                            <option value="Finals sponsorship">
                                                Finals
                                                sponsorship
                                            </option>

                                            <option value="Health and welfare partnership">
                                                Health and
                                                welfare
                                                partnership
                                            </option>

                                            <option value="Media and livestream sponsorship">
                                                Media and
                                                livestream
                                                sponsorship
                                            </option>

                                            <option value="Community partnership">
                                                Community
                                                partnership
                                            </option>

                                            <option value="Open to discussion">
                                                Open to
                                                discussion
                                            </option>
                                        </select>
                                    </label>

                                    <label>
                                        <span>
                                            Estimated budget
                                        </span>

                                        <select
                                            value={
                                                form.estimatedBudget
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateForm(
                                                    'estimatedBudget',
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        >
                                            <option value="">
                                                Select an
                                                option
                                            </option>

                                            <option value="Under £1,000">
                                                Under £1,000
                                            </option>

                                            <option value="£1,000 - £2,500">
                                                £1,000 -
                                                £2,500
                                            </option>

                                            <option value="£2,500 - £5,000">
                                                £2,500 -
                                                £5,000
                                            </option>

                                            <option value="£5,000 - £10,000">
                                                £5,000 -
                                                £10,000
                                            </option>

                                            <option value="Over £10,000">
                                                Over £10,000
                                            </option>

                                            <option value="Open to discussion">
                                                Open to
                                                discussion
                                            </option>
                                        </select>
                                    </label>

                                    <label className="adminFormFullWidth">
                                        <span>
                                            Message
                                        </span>

                                        <textarea
                                            value={
                                                form.message
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateForm(
                                                    'message',
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="Tell us how your organisation would like to support the festival."
                                            rows={6}
                                        />
                                    </label>
                                </div>

                                <div className="adminFormActions">
                                    <button
                                        className="btn primary"
                                        type="submit"
                                        disabled={
                                            isSubmitting
                                        }
                                    >
                                        {isSubmitting
                                            ? 'Submitting...'
                                            : 'Send Enquiry'}
                                    </button>

                                    <button
                                        className="btn secondary"
                                        type="button"
                                        disabled={
                                            isSubmitting
                                        }
                                        onClick={
                                            closeEnquiryForm
                                        }
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </section>
                </div>
            )}
        </>
    )
}