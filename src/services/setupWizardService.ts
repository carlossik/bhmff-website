import {
    SETUP_WIZARD_STEPS,
    type SetupWizardDraft,
    type SetupWizardStep,
} from '../types/setupWizard'

const STORAGE_PREFIX =
    'tournamenthq-setup-wizard-v2'
const LEGACY_STORAGE_KEY =
    'tournamenthq-setup-wizard-v1'

function nowIso(): string {
    return new Date().toISOString()
}

function isSetupWizardStep(
    value: unknown,
): value is SetupWizardStep {
    return (
        typeof value === 'string' &&
        SETUP_WIZARD_STEPS.includes(
            value as SetupWizardStep,
        )
    )
}

function isDraft(
    value: unknown,
): value is SetupWizardDraft {
    if (!value || typeof value !== 'object') {
        return false
    }

    const record =
        value as Record<string, unknown>

    return (
        record.version === 1 &&
        isSetupWizardStep(
            record.currentStep,
        ) &&
        Array.isArray(
            record.completedSteps,
        ) &&
        record.completedSteps.every(
            isSetupWizardStep,
        ) &&
        typeof record.startedAt ===
            'string' &&
        typeof record.updatedAt ===
            'string'
    )
}

export function createSetupWizardDraft():
    SetupWizardDraft {
    const timestamp = nowIso()

    return {
        version: 1,
        currentStep: 'welcome',
        completedSteps: [],
        organisationId: null,
        competitionId: null,
        startedAt: timestamp,
        updatedAt: timestamp,
        completedAt: null,
    }
}

function canUseStorage(): boolean {
    return (
        typeof window !== 'undefined' &&
        Boolean(window.localStorage)
    )
}

function getStorageKey(
    userId: string,
): string {
    return `${STORAGE_PREFIX}:${userId}`
}

function normaliseDraft(
    draft: SetupWizardDraft,
): SetupWizardDraft {
    const uniqueCompletedSteps =
        SETUP_WIZARD_STEPS.filter(
            (step) =>
                draft.completedSteps.includes(
                    step,
                ),
        )

    return {
        ...draft,
        completedSteps:
            uniqueCompletedSteps,
        updatedAt: nowIso(),
    }
}

function parseDraft(
    stored: string | null,
): SetupWizardDraft | null {
    if (!stored) {
        return null
    }

    try {
        const parsed: unknown =
            JSON.parse(stored)

        return isDraft(parsed)
            ? parsed
            : null
    } catch {
        return null
    }
}

export const setupWizardService = {
    load(
        userId: string,
    ): SetupWizardDraft {
        if (!canUseStorage()) {
            return createSetupWizardDraft()
        }

        const stored =
            window.localStorage.getItem(
                getStorageKey(userId),
            )

        return (
            parseDraft(stored) ??
            createSetupWizardDraft()
        )
    },

    hasStoredDraft(
        userId: string,
    ): boolean {
        if (!canUseStorage()) {
            return false
        }

        return Boolean(
            parseDraft(
                window.localStorage.getItem(
                    getStorageKey(userId),
                ),
            ),
        )
    },

    loadLegacy():
        SetupWizardDraft | null {
        if (!canUseStorage()) {
            return null
        }

        return parseDraft(
            window.localStorage.getItem(
                LEGACY_STORAGE_KEY,
            ),
        )
    },

    clearLegacy(): void {
        if (!canUseStorage()) {
            return
        }

        window.localStorage.removeItem(
            LEGACY_STORAGE_KEY,
        )
    },

    save(
        userId: string,
        draft: SetupWizardDraft,
    ): SetupWizardDraft {
        const normalised =
            normaliseDraft(draft)

        if (canUseStorage()) {
            window.localStorage.setItem(
                getStorageKey(userId),
                JSON.stringify(
                    normalised,
                ),
            )
        }

        return normalised
    },

    clear(userId: string): void {
        if (!canUseStorage()) {
            return
        }

        window.localStorage.removeItem(
            getStorageKey(userId),
        )
    },

    setStep(
        userId: string,
        draft: SetupWizardDraft,
        step: SetupWizardStep,
    ): SetupWizardDraft {
        return this.save(
            userId,
            {
                ...draft,
                currentStep: step,
            },
        )
    },

    completeStep(
        userId: string,
        draft: SetupWizardDraft,
        step: SetupWizardStep,
    ): SetupWizardDraft {
        const completedSteps =
            draft.completedSteps.includes(
                step,
            )
                ? draft.completedSteps
                : [
                      ...draft.completedSteps,
                      step,
                  ]

        return this.save(
            userId,
            {
                ...draft,
                completedSteps,
            },
        )
    },

    setOrganisation(
        userId: string,
        draft: SetupWizardDraft,
        organisationId: string,
    ): SetupWizardDraft {
        return this.save(
            userId,
            {
                ...draft,
                organisationId,
                competitionId:
                    draft.organisationId ===
                    organisationId
                        ? draft.competitionId
                        : null,
            },
        )
    },

    setCompetition(
        userId: string,
        draft: SetupWizardDraft,
        competitionId: string,
    ): SetupWizardDraft {
        return this.save(
            userId,
            {
                ...draft,
                competitionId,
            },
        )
    },

    finish(
        userId: string,
        draft: SetupWizardDraft,
    ): SetupWizardDraft {
        const completedSteps =
            SETUP_WIZARD_STEPS.filter(
                (step) =>
                    step !== 'finish',
            )

        const completedDraft =
            normaliseDraft({
                ...draft,
                currentStep: 'finish',
                completedSteps,
                completedAt: nowIso(),
            })

        this.clear(userId)

        return completedDraft
    },
}
