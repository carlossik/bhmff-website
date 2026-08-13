import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'

import { supabase } from '../lib/supabaseClient'
import { getCurrentUser } from '../services/auth'
import {
    createSetupWizardDraft,
    setupWizardService,
} from '../services/setupWizardService'
import {
    SETUP_WIZARD_STEPS,
    type SetupWizardDraft,
    type SetupWizardStep,
} from '../types/setupWizard'

type UseSetupWizardResult = {
    draft: SetupWizardDraft
    currentStep: SetupWizardStep
    currentStepIndex: number
    totalSteps: number
    progressPercent: number
    canGoBack: boolean
    canGoForward: boolean
    isReady: boolean
    goToStep: (
        step: SetupWizardStep,
    ) => void
    goBack: () => void
    goForward: () => void
    completeCurrentStep: () => void
    setOrganisationId: (
        organisationId: string,
    ) => void
    setCompetitionId: (
        competitionId: string,
    ) => void
    finish: () => void
    reset: () => void
}

async function canResumeOrganisation(
    userId: string,
    organisationId: string,
): Promise<boolean> {
    const { data, error } = await supabase
        .from('organisation_memberships')
        .select('id')
        .eq('user_id', userId)
        .eq(
            'organisation_id',
            organisationId,
        )
        .eq('active', true)
        .maybeSingle()

    if (error) {
        console.error(
            'Unable to validate onboarding organisation ownership:',
            error,
        )

        return false
    }

    return Boolean(data)
}

async function validateDraftForUser(
    userId: string,
    draft: SetupWizardDraft,
): Promise<SetupWizardDraft> {
    if (!draft.organisationId) {
        return draft
    }

    const canResume =
        await canResumeOrganisation(
            userId,
            draft.organisationId,
        )

    if (canResume) {
        return draft
    }

    setupWizardService.clear(userId)

    return createSetupWizardDraft()
}

export function useSetupWizard():
    UseSetupWizardResult {
    const [draft, setDraft] =
        useState<SetupWizardDraft>(
            createSetupWizardDraft,
        )
    const [isReady, setIsReady] =
        useState(false)

    const userIdRef =
        useRef<string | null>(null)

    useEffect(() => {
        let mounted = true

        async function hydrateDraft() {
            const user =
                await getCurrentUser()

            if (!mounted) {
                return
            }

            if (!user) {
                userIdRef.current = null
                setupWizardService.clearLegacy()
                setDraft(
                    createSetupWizardDraft(),
                )
                setIsReady(true)
                return
            }

            userIdRef.current = user.id

            let nextDraft =
                setupWizardService.load(
                    user.id,
                )

            if (
                !setupWizardService.hasStoredDraft(
                    user.id,
                )
            ) {
                const legacyDraft =
                    setupWizardService.loadLegacy()

                if (legacyDraft) {
                    const validatedLegacyDraft =
                        await validateDraftForUser(
                            user.id,
                            legacyDraft,
                        )

                    if (
                        validatedLegacyDraft
                            .organisationId
                    ) {
                        nextDraft =
                            setupWizardService.save(
                                user.id,
                                validatedLegacyDraft,
                            )
                    }
                }
            }

            setupWizardService.clearLegacy()

            nextDraft =
                await validateDraftForUser(
                    user.id,
                    nextDraft,
                )

            if (!mounted) {
                return
            }

            setDraft(nextDraft)
            setIsReady(true)
        }

        void hydrateDraft()

        return () => {
            mounted = false
        }
    }, [])

    const updateDraft = useCallback(
        (
            updater: (
                current:
                    SetupWizardDraft,
                userId: string,
            ) => SetupWizardDraft,
        ) => {
            const userId =
                userIdRef.current

            if (!userId) {
                return
            }

            setDraft((current) =>
                updater(
                    current,
                    userId,
                ),
            )
        },
        [],
    )

    const currentStepIndex =
        SETUP_WIZARD_STEPS.indexOf(
            draft.currentStep,
        )

    const totalSteps =
        SETUP_WIZARD_STEPS.length

    const progressPercent =
        useMemo(
            () =>
                totalSteps <= 1
                    ? 100
                    : Math.round(
                          (currentStepIndex /
                              (totalSteps -
                                  1)) *
                              100,
                      ),
            [
                currentStepIndex,
                totalSteps,
            ],
        )

    const goToStep = useCallback(
        (step: SetupWizardStep) => {
            updateDraft(
                (
                    current,
                    userId,
                ) =>
                    setupWizardService.setStep(
                        userId,
                        current,
                        step,
                    ),
            )
        },
        [updateDraft],
    )

    const goBack = useCallback(() => {
        updateDraft(
            (
                current,
                userId,
            ) => {
                const index =
                    SETUP_WIZARD_STEPS.indexOf(
                        current.currentStep,
                    )

                if (index <= 0) {
                    return current
                }

                return setupWizardService.setStep(
                    userId,
                    current,
                    SETUP_WIZARD_STEPS[
                        index - 1
                    ],
                )
            },
        )
    }, [updateDraft])

    const goForward =
        useCallback(() => {
            updateDraft(
                (
                    current,
                    userId,
                ) => {
                    const index =
                        SETUP_WIZARD_STEPS.indexOf(
                            current.currentStep,
                        )

                    if (
                        index < 0 ||
                        index >=
                            SETUP_WIZARD_STEPS.length -
                                1
                    ) {
                        return current
                    }

                    const completed =
                        setupWizardService.completeStep(
                            userId,
                            current,
                            current.currentStep,
                        )

                    return setupWizardService.setStep(
                        userId,
                        completed,
                        SETUP_WIZARD_STEPS[
                            index + 1
                        ],
                    )
                },
            )
        }, [updateDraft])

    const completeCurrentStep =
        useCallback(() => {
            updateDraft(
                (
                    current,
                    userId,
                ) =>
                    setupWizardService.completeStep(
                        userId,
                        current,
                        current.currentStep,
                    ),
            )
        }, [updateDraft])

    const setOrganisationId =
        useCallback(
            (
                organisationId:
                    string,
            ) => {
                updateDraft(
                    (
                        current,
                        userId,
                    ) =>
                        setupWizardService.setOrganisation(
                            userId,
                            current,
                            organisationId,
                        ),
                )
            },
            [updateDraft],
        )

    const setCompetitionId =
        useCallback(
            (
                competitionId:
                    string,
            ) => {
                updateDraft(
                    (
                        current,
                        userId,
                    ) =>
                        setupWizardService.setCompetition(
                            userId,
                            current,
                            competitionId,
                        ),
                )
            },
            [updateDraft],
        )

    const finish = useCallback(() => {
        updateDraft(
            (
                current,
                userId,
            ) =>
                setupWizardService.finish(
                    userId,
                    current,
                ),
        )
    }, [updateDraft])

    const reset = useCallback(() => {
        const userId =
            userIdRef.current

        if (userId) {
            setupWizardService.clear(
                userId,
            )
        }

        setupWizardService.clearLegacy()
        setDraft(
            createSetupWizardDraft(),
        )
    }, [])

    return {
        draft,
        currentStep:
            draft.currentStep,
        currentStepIndex,
        totalSteps,
        progressPercent,
        canGoBack:
            isReady &&
            currentStepIndex > 0,
        canGoForward:
            isReady &&
            currentStepIndex >= 0 &&
            currentStepIndex <
                totalSteps - 1,
        isReady,
        goToStep,
        goBack,
        goForward,
        completeCurrentStep,
        setOrganisationId,
        setCompetitionId,
        finish,
        reset,
    }
}
