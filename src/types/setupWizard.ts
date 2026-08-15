export const SETUP_WIZARD_STEPS = [
    'welcome',
    'organisation',
    'billing',
    'branding',
    'competition',
    'finish',
] as const

export type SetupWizardStep =
    (typeof SETUP_WIZARD_STEPS)[number]

export type SetupWizardDraft = {
    version: 1
    currentStep: SetupWizardStep
    completedSteps: SetupWizardStep[]
    organisationId: string | null
    competitionId: string | null
    startedAt: string
    updatedAt: string
    completedAt: string | null
}
