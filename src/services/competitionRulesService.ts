import { supabase } from '../lib/supabaseClient'
import type { AdminRole } from './accessControl'

export type CompetitionRules = {
    id: string
    organisation_id: string
    competition_id: string
    title: string
    rules_text: string
    rules_url: string | null
    version: number
    requires_acceptance: boolean
    active: boolean
    created_at: string
    updated_at: string
}

export type CompetitionRulesSaveInput = {
    organisationId: string
    competitionId: string
    title: string
    rulesText: string
    rulesUrl: string | null
    requiresAcceptance: boolean
    existingRules: CompetitionRules | null
}

export type CompetitionRulesAcceptanceInput = {
    organisationId: string
    competitionId: string
    ruleId: string
    ruleVersion: number
    userId: string
    role: AdminRole
}

function normaliseOptionalUrl(value: string): string | null {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
}

function hasRulesChanged(
    existingRules: CompetitionRules,
    title: string,
    rulesText: string,
    rulesUrl: string | null,
    requiresAcceptance: boolean,
): boolean {
    return (
        existingRules.title !== title ||
        existingRules.rules_text !== rulesText ||
        existingRules.rules_url !== rulesUrl ||
        existingRules.requires_acceptance !== requiresAcceptance
    )
}

export async function getCompetitionRules(
    organisationId: string,
    competitionId: string,
): Promise<CompetitionRules | null> {
    const { data, error } = await supabase
        .from('competition_rules')
        .select('*')
        .eq('organisation_id', organisationId)
        .eq('competition_id', competitionId)
        .eq('active', true)
        .maybeSingle()

    if (error) {
        throw new Error(error.message)
    }

    return (data ?? null) as CompetitionRules | null
}

export async function saveCompetitionRules({
    organisationId,
    competitionId,
    title,
    rulesText,
    rulesUrl,
    requiresAcceptance,
    existingRules,
}: CompetitionRulesSaveInput): Promise<CompetitionRules> {
    const normalisedTitle = title.trim()
    const normalisedText = rulesText.trim()
    const normalisedUrl = normaliseOptionalUrl(rulesUrl ?? '')

    if (!normalisedTitle) {
        throw new Error('Enter a rules title before saving.')
    }

    if (requiresAcceptance && !normalisedText && !normalisedUrl) {
        throw new Error('Add rules text or a rules document link before requiring acceptance.')
    }

    const nextVersion = existingRules && hasRulesChanged(
        existingRules,
        normalisedTitle,
        normalisedText,
        normalisedUrl,
        requiresAcceptance,
    )
        ? existingRules.version + 1
        : existingRules?.version ?? 1

    const payload = {
        organisation_id: organisationId,
        competition_id: competitionId,
        title: normalisedTitle,
        rules_text: normalisedText,
        rules_url: normalisedUrl,
        version: nextVersion,
        requires_acceptance: requiresAcceptance,
        active: true,
        updated_at: new Date().toISOString(),
    }

    if (existingRules) {
        const { data, error } = await supabase
            .from('competition_rules')
            .update(payload)
            .eq('id', existingRules.id)
            .select('*')
            .single()

        if (error) {
            throw new Error(error.message)
        }

        return data as CompetitionRules
    }

    const { data, error } = await supabase
        .from('competition_rules')
        .insert(payload)
        .select('*')
        .single()

    if (error) {
        throw new Error(error.message)
    }

    return data as CompetitionRules
}

export async function hasAcceptedCompetitionRules(
    ruleId: string,
    ruleVersion: number,
    userId: string,
): Promise<boolean> {
    const { data, error } = await supabase
        .from('competition_rule_acceptances')
        .select('id')
        .eq('rule_id', ruleId)
        .eq('rule_version', ruleVersion)
        .eq('user_id', userId)
        .maybeSingle()

    if (error) {
        throw new Error(error.message)
    }

    return Boolean(data)
}

export async function acceptCompetitionRules({
    organisationId,
    competitionId,
    ruleId,
    ruleVersion,
    userId,
    role,
}: CompetitionRulesAcceptanceInput): Promise<void> {
    const { error } = await supabase
        .from('competition_rule_acceptances')
        .upsert(
            {
                organisation_id: organisationId,
                competition_id: competitionId,
                rule_id: ruleId,
                rule_version: ruleVersion,
                user_id: userId,
                role_at_acceptance: role,
                accepted_at: new Date().toISOString(),
            },
            {
                onConflict: 'rule_id,rule_version,user_id',
            },
        )

    if (error) {
        throw new Error(error.message)
    }
}
