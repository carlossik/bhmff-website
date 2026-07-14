import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Modal } from '../common/Modal'

type DemoRequestModalProps = {
    onClose: () => void
}

type DemoRequestForm = {
    organisation: string
    contactName: string
    email: string
    phone: string
    competitionType: string
    numberOfTeams: string
    message: string
}

const initialForm: DemoRequestForm = {
    organisation: '',
    contactName: '',
    email: '',
    phone: '',
    competitionType: '',
    numberOfTeams: '',
    message: '',
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        value.trim()
    )
}

function isValidPhone(value: string) {
    const trimmedValue = value.trim()

    if (!trimmedValue) {
        return true
    }

    if (!/^[0-9+() -]+$/.test(trimmedValue)) {
        return false
    }

    if (
        trimmedValue.includes('+') &&
        !trimmedValue.startsWith('+')
    ) {
        return false
    }

    if (
        (trimmedValue.match(/\+/g) ?? []).length > 1
    ) {
        return false
    }

    const digitCount =
        trimmedValue.replace(/\D/g, '').length

    return digitCount >= 7 && digitCount <= 15
}

export function DemoRequestModal({
                                     onClose,
                                 }: DemoRequestModalProps) {
    const [form, setForm] =
        useState<DemoRequestForm>(initialForm)

    const [isSubmitting, setIsSubmitting] =
        useState(false)

    const [errorMessage, setErrorMessage] =
        useState('')

    const [successMessage, setSuccessMessage] =
        useState('')

    function updateForm<
        Key extends keyof DemoRequestForm
    >(
        key: Key,
        value: DemoRequestForm[Key]
    ) {
        setForm((current) => ({
            ...current,
            [key]: value,
        }))

        setErrorMessage('')
    }

    function validateForm() {
        if (!form.organisation.trim()) {
            return 'Organisation name is required.'
        }

        if (!form.contactName.trim()) {
            return 'Contact name is required.'
        }

        if (!isValidEmail(form.email)) {
            return 'Enter a valid email address.'
        }

        if (!isValidPhone(form.phone)) {
            return 'Enter a valid phone number containing 7 to 15 digits.'
        }

        if (!form.competitionType) {
            return 'Select a competition type.'
        }

        if (
            form.numberOfTeams &&
            (
                Number.isNaN(
                    Number(form.numberOfTeams)
                ) ||
                Number(form.numberOfTeams) < 2
            )
        ) {
            return 'Number of teams must be at least 2.'
        }

        if (!form.message.trim()) {
            return 'Tell us briefly about the competition or requirement.'
        }

        return null
    }

    async function submitRequest() {
        const validationError =
            validateForm()

        if (validationError) {
            setErrorMessage(validationError)
            return
        }

        setIsSubmitting(true)
        setErrorMessage('')
        setSuccessMessage('')

        const { error } = await supabase
            .from('demo_requests')
            .insert({
                organisation:
                    form.organisation.trim(),
                contact_name:
                    form.contactName.trim(),
                email: form.email.trim(),
                phone:
                    form.phone.trim() || null,
                competition_type:
                form.competitionType,
                number_of_teams:
                    form.numberOfTeams
                        ? Number(
                            form.numberOfTeams
                        )
                        : null,
                message: form.message.trim(),
                status: 'new',
            })

        if (error) {
            console.error(
                'Failed to submit demo request:',
                error
            )

            setErrorMessage(
                'Your demo request could not be submitted. Please try again.'
            )
            setIsSubmitting(false)
            return
        }

        setForm(initialForm)
        setSuccessMessage(
            'Thank you. Your demo request has been received and the CKEFA team will contact you.'
        )
        setIsSubmitting(false)
    }

    return (
        <Modal
            title="Book a Demonstration"
            onClose={onClose}
        >
            {successMessage ? (
                <div>
                    <p className="adminSuccessMessage">
                        {successMessage}
                    </p>

                    <div className="modalActions">
                        <button
                            className="btn primary"
                            type="button"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <p className="muted">
                        Tell us about your league,
                        cup or tournament and we will
                        arrange a tailored platform
                        demonstration.
                    </p>

                    {errorMessage && (
                        <p className="formError">
                            {errorMessage}
                        </p>
                    )}

                    <div className="adminFormGrid">
                        <label>
                            <span>
                                Organisation *
                            </span>

                            <input
                                value={
                                    form.organisation
                                }
                                maxLength={150}
                                onChange={(event) =>
                                    updateForm(
                                        'organisation',
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label>
                            <span>
                                Contact Name *
                            </span>

                            <input
                                value={
                                    form.contactName
                                }
                                maxLength={120}
                                autoComplete="name"
                                onChange={(event) =>
                                    updateForm(
                                        'contactName',
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label>
                            <span>Email *</span>

                            <input
                                type="email"
                                value={form.email}
                                maxLength={254}
                                autoComplete="email"
                                onChange={(event) =>
                                    updateForm(
                                        'email',
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label>
                            <span>Phone</span>

                            <input
                                type="tel"
                                inputMode="tel"
                                value={form.phone}
                                maxLength={25}
                                autoComplete="tel"
                                pattern="[0-9+() -]*"
                                placeholder="e.g. 07951 750370"
                                onChange={(event) => {
                                    const value =
                                        event.target.value

                                    if (
                                        /^[0-9+() -]*$/.test(
                                            value
                                        )
                                    ) {
                                        updateForm(
                                            'phone',
                                            value
                                        )
                                    }
                                }}
                            />
                        </label>

                        <label>
                            <span>
                                Competition Type *
                            </span>

                            <select
                                value={
                                    form.competitionType
                                }
                                onChange={(event) =>
                                    updateForm(
                                        'competitionType',
                                        event.target
                                            .value
                                    )
                                }
                            >
                                <option value="">
                                    Select type
                                </option>
                                <option value="league">
                                    League
                                </option>
                                <option value="cup">
                                    Cup
                                </option>
                                <option value="tournament">
                                    Tournament
                                </option>
                                <option value="school_competition">
                                    School Competition
                                </option>
                                <option value="other">
                                    Other
                                </option>
                            </select>
                        </label>

                        <label>
                            <span>
                                Approximate Number of
                                Teams
                            </span>

                            <input
                                type="number"
                                min="2"
                                max="1000"
                                value={
                                    form.numberOfTeams
                                }
                                onChange={(event) =>
                                    updateForm(
                                        'numberOfTeams',
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label className="adminFormFullWidth">
                            <span>
                                Requirement *
                            </span>

                            <textarea
                                value={form.message}
                                maxLength={2000}
                                rows={5}
                                placeholder="Tell us about your competition, expected dates and what you need the platform to manage."
                                onChange={(event) =>
                                    updateForm(
                                        'message',
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>
                    </div>

                    <div className="modalActions">
                        <button
                            className="btn secondary"
                            type="button"
                            disabled={
                                isSubmitting
                            }
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            className="btn primary"
                            type="button"
                            disabled={
                                isSubmitting
                            }
                            onClick={() =>
                                void submitRequest()
                            }
                        >
                            {isSubmitting
                                ? 'Submitting...'
                                : 'Request Demo'}
                        </button>
                    </div>
                </>
            )}
        </Modal>
    )
}