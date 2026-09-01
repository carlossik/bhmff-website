import type {
    SubscriptionPlan,
} from '../organisationTypes'
import {
    PLAN_MODULE_DEFINITIONS,
    getPlanLimits,
    getPlanModules as getPlanModulesForWorkspace,
    isModuleEntitledForPlan,
    type PlanModuleDefinition,
    type PlanModuleKey,
} from '../../../../config/planEntitlements'

export type OrganisationModuleKey = PlanModuleKey
export type OrganisationModuleDefinition = PlanModuleDefinition

export type SubscriptionPlanDefinition = {
    key: SubscriptionPlan
    name: string
    description: string
    maxUsers: number
    maxCompetitions: number
    modules: OrganisationModuleKey[]
    featured?: boolean
}

export const ORGANISATION_MODULES:
    OrganisationModuleDefinition[] =
    PLAN_MODULE_DEFINITIONS.filter(
        (definition) =>
            definition.key !== 'Organisations',
    )

export const SUBSCRIPTION_PLANS:
    SubscriptionPlanDefinition[] = [
    {
        key: 'starter',
        name: 'Starter',
        description:
            'Essential competition or club management for smaller organisations.',
        maxUsers:
            getPlanLimits('starter').maxUsers,
        maxCompetitions:
            getPlanLimits('starter')
                .maxCompetitions,
        modules:
            getPlanModulesForWorkspace(
                'starter',
                'competition_organiser',
            ) as OrganisationModuleKey[],
    },
    {
        key: 'professional',
        name: 'Professional',
        description:
            'Advanced finance, communications, content and operational tools for growing organisations.',
        maxUsers:
            getPlanLimits('professional')
                .maxUsers,
        maxCompetitions:
            getPlanLimits('professional')
                .maxCompetitions,
        modules:
            getPlanModulesForWorkspace(
                'professional',
                'competition_organiser',
            ) as OrganisationModuleKey[],
        featured: true,
    },
    {
        key: 'enterprise',
        name: 'Enterprise',
        description:
            'Full TournamentHQ capability with tailored scale and governance.',
        maxUsers:
            getPlanLimits('enterprise').maxUsers,
        maxCompetitions:
            getPlanLimits('enterprise')
                .maxCompetitions,
        modules:
            getPlanModulesForWorkspace(
                'enterprise',
                'competition_organiser',
            ) as OrganisationModuleKey[],
    },
]

export function getSubscriptionPlan(
    plan: SubscriptionPlan,
): SubscriptionPlanDefinition {
    return (
        SUBSCRIPTION_PLANS.find(
            (definition) =>
                definition.key === plan,
        ) ?? SUBSCRIPTION_PLANS[0]
    )
}

export function getModulesForPlan(
    plan: SubscriptionPlan,
): OrganisationModuleKey[] {
    return getPlanModulesForWorkspace(
        plan,
        'competition_organiser',
    ) as OrganisationModuleKey[]
}

export function isModuleEnabled(
    enabledModules: string[],
    moduleKey: OrganisationModuleKey,
): boolean {
    return enabledModules.includes(
        moduleKey,
    )
}

export {
    isModuleEntitledForPlan,
}
