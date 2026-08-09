import { useCallback, useMemo, useState } from 'react'
import { SETUP_WIZARD_STEPS, type SetupWizardDraft, type SetupWizardStep } from '../types/setupWizard'
import { createSetupWizardDraft, setupWizardService } from '../services/setupWizardService'

type UseSetupWizardResult = {
    draft: SetupWizardDraft
    currentStep: SetupWizardStep
    currentStepIndex: number
    totalSteps: number
    progressPercent: number
    canGoBack: boolean
    canGoForward: boolean
    goToStep: (step: SetupWizardStep) => void
    goBack: () => void
    goForward: () => void
    completeCurrentStep: () => void
    setOrganisationId: (organisationId: string) => void
    setCompetitionId: (competitionId: string) => void
    finish: () => void
    reset: () => void
}

export function useSetupWizard(): UseSetupWizardResult {
    const [draft, setDraft] = useState<SetupWizardDraft>(() => setupWizardService.load())
    const currentStepIndex = SETUP_WIZARD_STEPS.indexOf(draft.currentStep)
    const totalSteps = SETUP_WIZARD_STEPS.length
    const progressPercent = useMemo(() => totalSteps <= 1 ? 100 : Math.round((currentStepIndex / (totalSteps - 1)) * 100), [currentStepIndex, totalSteps])
    const goToStep = useCallback((step: SetupWizardStep) => setDraft(current => setupWizardService.setStep(current, step)), [])
    const goBack = useCallback(() => setDraft(current => {
        const index = SETUP_WIZARD_STEPS.indexOf(current.currentStep)
        if (index <= 0) return current
        return setupWizardService.setStep(current, SETUP_WIZARD_STEPS[index - 1])
    }), [])
    const goForward = useCallback(() => setDraft(current => {
        const index = SETUP_WIZARD_STEPS.indexOf(current.currentStep)
        if (index < 0 || index >= SETUP_WIZARD_STEPS.length - 1) return current
        const completed = setupWizardService.completeStep(current, current.currentStep)
        return setupWizardService.setStep(completed, SETUP_WIZARD_STEPS[index + 1])
    }), [])
    const completeCurrentStep = useCallback(() => setDraft(current => setupWizardService.completeStep(current, current.currentStep)), [])
    const setOrganisationId = useCallback((organisationId: string) => setDraft(current => setupWizardService.setOrganisation(current, organisationId)), [])
    const setCompetitionId = useCallback((competitionId: string) => setDraft(current => setupWizardService.setCompetition(current, competitionId)), [])
    const finish = useCallback(() => setDraft(current => setupWizardService.finish(current)), [])
    const reset = useCallback(() => { setupWizardService.clear(); setDraft(createSetupWizardDraft()) }, [])
    return { draft, currentStep: draft.currentStep, currentStepIndex, totalSteps, progressPercent, canGoBack: currentStepIndex > 0, canGoForward: currentStepIndex >= 0 && currentStepIndex < totalSteps - 1, goToStep, goBack, goForward, completeCurrentStep, setOrganisationId, setCompetitionId, finish, reset }
}
