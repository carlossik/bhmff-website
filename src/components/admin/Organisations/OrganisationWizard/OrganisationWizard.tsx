import {
    useMemo,
    useState,
    type FormEvent,
} from 'react'

import type {
    OrganisationFormData,
} from '../organisationTypes'

import { StepBranding } from './StepBranding'
import { StepOrganisation } from './StepOrganisation'
import { StepOwner } from './StepOwner'
import { StepReview } from './StepReview'
import { StepSubscription } from './StepSubscription'
import {
    WizardNavigation,
    type WizardStep,
} from './WizardNavigation'

export type OrganisationWizardErrors = {
    name?: string
    slug?: string
    logo_url?: string
    owner_name?: string
    owner_email?: string
    owner_phone?: string
    submit?: string
}

type OrganisationWizardProps = {
    form: OrganisationFormData
    errors?: OrganisationWizardErrors
    disabled?: boolean
    isSubmitting?: boolean
    submitLabel?: string
    organisationId: string
    onChange: <
        K extends keyof OrganisationFormData,
    >(
        field: K,
        value: OrganisationFormData[K]
    ) => void
    onSubmit: () => void | Promise<void>
    onCancel: () => void
}

const WIZARD_STEPS: WizardStep[] = [
    {
        id: 1,
        label: 'Organisation',
        description:
            'Workspace identity and public website.',
    },
    {
        id: 2,
        label: 'Branding',
        description:
            'Logo, colours and portal appearance.',
    },
    {
        id: 3,
        label: 'Subscription',
        description:
            'Plan, limits and enabled modules.',
    },
    {
        id: 4,
        label: 'Administrator',
        description:
            'Customer owner and contact details.',
    },
    {
        id: 5,
        label: 'Review',
        description:
            'Confirm the setup before creation.',
    },
]

const FIRST_STEP = 1
const LAST_STEP = WIZARD_STEPS.length

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        value.trim()
    )
}

function isValidUrl(value: string) {
    if (!value.trim()) {
        return true
    }

    try {
        const url = new URL(value)
        return (
            url.protocol === 'http:' ||
            url.protocol === 'https:'
        )
    } catch {
        return false
    }
}

function isValidHexColour(value: string) {
    return /^#[0-9a-fA-F]{6}$/.test(
        value.trim()
    )
}

export function OrganisationWizard({
    form,
    errors = {},
    disabled = false,
    isSubmitting = false,
    submitLabel = 'Create organisation',
    organisationId,
    onChange,
    onSubmit,
    onCancel,
}: OrganisationWizardProps) {
    const [currentStep, setCurrentStep] =
        useState(FIRST_STEP)

    const [completedSteps, setCompletedSteps] =
        useState<number[]>([])

    const [localErrors, setLocalErrors] =
        useState<OrganisationWizardErrors>({})

    const combinedErrors = useMemo(
        () => ({
            ...localErrors,
            ...errors,
        }),
        [errors, localErrors]
    )

    const controlsDisabled =
        disabled || isSubmitting

    function clearLocalErrors(
        fields?: Array<
            keyof OrganisationWizardErrors
        >
    ) {
        if (!fields) {
            setLocalErrors({})
            return
        }

        setLocalErrors((current) => {
            const next = {
                ...current,
            }

            fields.forEach((field) => {
                delete next[field]
            })

            return next
        })
    }

    function validateOrganisationStep() {
        const nextErrors: OrganisationWizardErrors =
            {}

        if (!form.name.trim()) {
            nextErrors.name =
                'Enter the organisation name.'
        }

        if (!form.slug.trim()) {
            nextErrors.slug =
                'Enter the organisation slug.'
        } else if (
            !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
                form.slug
            )
        ) {
            nextErrors.slug =
                'Use lowercase letters, numbers and single hyphens only.'
        }

        setLocalErrors((current) => ({
            ...current,
            name: nextErrors.name,
            slug: nextErrors.slug,
        }))

        return (
            !nextErrors.name &&
            !nextErrors.slug
        )
    }

    function validateBrandingStep() {
        const logoIsValid =
            isValidUrl(form.logo_url)

        const coloursAreValid = [
            form.primary_colour,
            form.secondary_colour,
            form.accent_colour,
            form.background_colour,
            form.surface_colour,
            form.text_colour,
        ].every(isValidHexColour)

        setLocalErrors((current) => ({
            ...current,
            logo_url: logoIsValid
                ? undefined
                : 'The uploaded logo URL is invalid.',
        }))

        return (
            logoIsValid &&
            coloursAreValid
        )
    }

    function validateSubscriptionStep() {
        return (
            form.max_users >= 1 &&
            form.max_competitions >= 1 &&
            form.enabled_modules.length > 0
        )
    }

    function validateOwnerStep() {
        const nextErrors: OrganisationWizardErrors =
            {}

        if (!form.owner_name.trim()) {
            nextErrors.owner_name =
                'Enter the administrator name.'
        }

        if (!form.owner_email.trim()) {
            nextErrors.owner_email =
                'Enter the administrator email address.'
        } else if (
            !isValidEmail(form.owner_email)
        ) {
            nextErrors.owner_email =
                'Enter a valid email address.'
        }

        setLocalErrors((current) => ({
            ...current,
            owner_name:
                nextErrors.owner_name,
            owner_email:
                nextErrors.owner_email,
        }))

        return (
            !nextErrors.owner_name &&
            !nextErrors.owner_email
        )
    }

    function validateStep(step: number) {
        switch (step) {
            case 1:
                return validateOrganisationStep()
            case 2:
                return validateBrandingStep()
            case 3:
                return validateSubscriptionStep()
            case 4:
                return validateOwnerStep()
            case 5:
                return (
                    validateOrganisationStep() &&
                    validateBrandingStep() &&
                    validateSubscriptionStep() &&
                    validateOwnerStep()
                )
            default:
                return false
        }
    }

    function markStepCompleted(step: number) {
        setCompletedSteps((current) =>
            current.includes(step)
                ? current
                : [...current, step].sort(
                      (a, b) => a - b
                  )
        )
    }

    function handleNext() {
        if (!validateStep(currentStep)) {
            return
        }

        markStepCompleted(currentStep)
        setCurrentStep((current) =>
            Math.min(
                current + 1,
                LAST_STEP
            )
        )
    }

    function handleBack() {
        clearLocalErrors()
        setCurrentStep((current) =>
            Math.max(
                current - 1,
                FIRST_STEP
            )
        )
    }

    function handleStepSelect(step: number) {
        if (
            step === currentStep ||
            controlsDisabled
        ) {
            return
        }

        if (step < currentStep) {
            clearLocalErrors()
            setCurrentStep(step)
            return
        }

        if (
            step === currentStep + 1 &&
            validateStep(currentStep)
        ) {
            markStepCompleted(currentStep)
            setCurrentStep(step)
        }
    }

    function handleFieldChange<
        K extends keyof OrganisationFormData,
    >(
        field: K,
        value: OrganisationFormData[K]
    ) {
        onChange(field, value)

        clearLocalErrors([
            field as keyof OrganisationWizardErrors,
            'submit',
        ])
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()

        if (currentStep < LAST_STEP) {
            handleNext()
            return
        }

        const organisationValid =
            validateOrganisationStep()
        const brandingValid =
            validateBrandingStep()
        const subscriptionValid =
            validateSubscriptionStep()
        const ownerValid =
            validateOwnerStep()

        if (!organisationValid) {
            setCurrentStep(1)
            return
        }

        if (!brandingValid) {
            setCurrentStep(2)
            return
        }

        if (!subscriptionValid) {
            setCurrentStep(3)
            return
        }

        if (!ownerValid) {
            setCurrentStep(4)
            return
        }

        clearLocalErrors()
        await onSubmit()
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="organisation-wizard"
            noValidate
        >
            <WizardNavigation
                steps={WIZARD_STEPS}
                currentStep={currentStep}
                completedSteps={
                    completedSteps
                }
                onStepSelect={
                    controlsDisabled
                        ? undefined
                        : handleStepSelect
                }
            />

            <div className="organisation-wizard-content">
                {currentStep === 1 && (
                    <StepOrganisation
                        form={form}
                        errors={{
                            name:
                                combinedErrors.name,
                            slug:
                                combinedErrors.slug,
                        }}
                        disabled={
                            controlsDisabled
                        }
                        onChange={
                            handleFieldChange
                        }
                    />
                )}

                {currentStep === 2 && (
                    <StepBranding
                        form={form}
                        organisationId={
                            organisationId
                        }
                        disabled={
                            controlsDisabled
                        }
                        onChange={
                            handleFieldChange
                        }
                    />
                )}

                {currentStep === 3 && (
                    <StepSubscription
                        form={form}
                        disabled={
                            controlsDisabled
                        }
                        onChange={
                            handleFieldChange
                        }
                    />
                )}

                {currentStep === 4 && (
                    <StepOwner
                        form={form}
                        errors={{
                            owner_name:
                                combinedErrors.owner_name,
                            owner_email:
                                combinedErrors.owner_email,
                            owner_phone:
                                combinedErrors.owner_phone,
                        }}
                        disabled={
                            controlsDisabled
                        }
                        onChange={
                            handleFieldChange
                        }
                    />
                )}

                {currentStep === 5 && (
                    <StepReview form={form} />
                )}
            </div>

            {combinedErrors.submit && (
                <div
                    role="alert"
                    className="organisation-wizard-error"
                >
                    <strong>
                        Organisation could not be saved
                    </strong>

                    <span>
                        {combinedErrors.submit}
                    </span>
                </div>
            )}

            <footer className="organisation-wizard-footer">
                <button
                    type="button"
                    disabled={
                        controlsDisabled
                    }
                    onClick={onCancel}
                    className="organisation-wizard-button secondary"
                >
                    Cancel
                </button>

                <div className="organisation-wizard-footer-actions">
                    {currentStep >
                        FIRST_STEP && (
                        <button
                            type="button"
                            disabled={
                                controlsDisabled
                            }
                            onClick={handleBack}
                            className="organisation-wizard-button secondary"
                        >
                            Back
                        </button>
                    )}

                    <button
                        type="submit"
                        disabled={
                            controlsDisabled
                        }
                        className="organisation-wizard-button primary"
                    >
                        {isSubmitting
                            ? 'Saving organisation...'
                            : currentStep ===
                                LAST_STEP
                              ? submitLabel
                              : 'Continue'}
                    </button>
                </div>
            </footer>
        </form>
    )
}
