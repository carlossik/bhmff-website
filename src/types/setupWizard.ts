export const SETUP_WIZARD_STEPS = [
    'welcome',
    'organisation',
    'branding',
    'competition',
    'finish',
] as const

export type SetupWizardStep =
    (typeof SETUP_WIZARD_STEPS)[number]

export type SetupWizardStepDefinition = {
    id: SetupWizardStep
    title: string
    shortTitle: string
    description: string
}

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

export const SETUP_WIZARD_STEP_DEFINITIONS:
    readonly SetupWizardStepDefinition[] = [
        { id: 'welcome', title: 'Welcome to TournamentHQ', shortTitle: 'Welcome', description: 'A short guided setup to get your organisation ready.' },
        { id: 'organisation', title: 'Your organisation', shortTitle: 'Organisation', description: 'Set the organisation identity, owner details and operating defaults.' },
        { id: 'branding', title: 'Brand your experience', shortTitle: 'Branding', description: 'Apply your logo and colours to the TournamentHQ experience.' },
        { id: 'competition', title: 'Create your first competition', shortTitle: 'Competition', description: 'Set up the first league, tournament, cup or event you want to manage.' },
        { id: 'finish', title: 'You are ready', shortTitle: 'Finish', description: 'Review your setup and continue into TournamentHQ.' },
    ] as const
