import { SETUP_WIZARD_STEPS, type SetupWizardDraft, type SetupWizardStep } from '../types/setupWizard'

const STORAGE_KEY = 'tournamenthq-setup-wizard-v1'

function nowIso(): string { return new Date().toISOString() }

function isSetupWizardStep(value: unknown): value is SetupWizardStep {
    return typeof value === 'string' && SETUP_WIZARD_STEPS.includes(value as SetupWizardStep)
}

function isDraft(value: unknown): value is SetupWizardDraft {
    if (!value || typeof value !== 'object') return false
    const record = value as Record<string, unknown>
    return record.version === 1 && isSetupWizardStep(record.currentStep) && Array.isArray(record.completedSteps) && record.completedSteps.every(isSetupWizardStep) && typeof record.startedAt === 'string' && typeof record.updatedAt === 'string'
}

export function createSetupWizardDraft(): SetupWizardDraft {
    const timestamp = nowIso()
    return { version: 1, currentStep: 'welcome', completedSteps: [], organisationId: null, competitionId: null, startedAt: timestamp, updatedAt: timestamp, completedAt: null }
}

function canUseStorage(): boolean { return typeof window !== 'undefined' && Boolean(window.localStorage) }

function normaliseDraft(draft: SetupWizardDraft): SetupWizardDraft {
    const uniqueCompletedSteps = SETUP_WIZARD_STEPS.filter(step => draft.completedSteps.includes(step))
    return { ...draft, completedSteps: uniqueCompletedSteps, updatedAt: nowIso() }
}

export const setupWizardService = {
    load(): SetupWizardDraft {
        if (!canUseStorage()) return createSetupWizardDraft()
        const stored = window.localStorage.getItem(STORAGE_KEY)
        if (!stored) return createSetupWizardDraft()
        try {
            const parsed: unknown = JSON.parse(stored)
            return isDraft(parsed) ? parsed : createSetupWizardDraft()
        } catch { return createSetupWizardDraft() }
    },
    save(draft: SetupWizardDraft): SetupWizardDraft {
        const normalised = normaliseDraft(draft)
        if (canUseStorage()) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalised))
        return normalised
    },
    clear(): void { if (canUseStorage()) window.localStorage.removeItem(STORAGE_KEY) },
    setStep(draft: SetupWizardDraft, step: SetupWizardStep): SetupWizardDraft { return this.save({ ...draft, currentStep: step }) },
    completeStep(draft: SetupWizardDraft, step: SetupWizardStep): SetupWizardDraft {
        const completedSteps = draft.completedSteps.includes(step) ? draft.completedSteps : [...draft.completedSteps, step]
        return this.save({ ...draft, completedSteps })
    },
    setOrganisation(draft: SetupWizardDraft, organisationId: string): SetupWizardDraft { return this.save({ ...draft, organisationId }) },
    setCompetition(draft: SetupWizardDraft, competitionId: string): SetupWizardDraft { return this.save({ ...draft, competitionId }) },
    finish(draft: SetupWizardDraft): SetupWizardDraft {
        const completedSteps = SETUP_WIZARD_STEPS.filter(step => step !== 'finish')
        return this.save({ ...draft, currentStep: 'finish', completedSteps, completedAt: nowIso() })
    },
}
