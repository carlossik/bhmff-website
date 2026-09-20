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
    public_visible: boolean
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
    publicVisible: boolean
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

export type CompetitionRulesAcceptanceAuditItem = {
    userId: string
    fullName: string | null
    email: string | null
    role: AdminRole
    accepted: boolean
    acceptedAt: string | null
}

type MembershipRow = {
    user_id: string
    role: AdminRole
}

type ProfileRow = {
    id: string
    full_name: string | null
    email: string | null
}

type AcceptanceRow = {
    user_id: string
    accepted_at: string
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

export async function getPublicCompetitionRules(
    organisationId: string,
    competitionIds: string[],
): Promise<CompetitionRules[]> {
    if (!organisationId || competitionIds.length === 0) {
        return []
    }

    const { data, error } = await supabase
        .from('competition_rules')
        .select('*')
        .eq('organisation_id', organisationId)
        .eq('active', true)
        .eq('public_visible', true)
        .in('competition_id', competitionIds)
        .order('updated_at', { ascending: false })

    if (error) {
        throw new Error(error.message)
    }

    return (data ?? []) as CompetitionRules[]
}

export async function saveCompetitionRules({
    organisationId,
    competitionId,
    title,
    rulesText,
    rulesUrl,
    requiresAcceptance,
    publicVisible,
    existingRules,
}: CompetitionRulesSaveInput): Promise<CompetitionRules> {
    const normalisedTitle = title.trim()
    const normalisedText = rulesText.trim()
    const normalisedUrl = normaliseOptionalUrl(rulesUrl ?? '')

    if (!normalisedTitle) {
        throw new Error('Enter a rules title before saving.')
    }

    if (
        (requiresAcceptance || publicVisible) &&
        !normalisedText &&
        !normalisedUrl
    ) {
        throw new Error(
            'Add rules text or a rules document link before publishing or requiring acceptance.',
        )
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
        public_visible: publicVisible,
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

export async function getCompetitionRulesAcceptanceAudit(
    organisationId: string,
    competitionId: string,
    ruleId: string,
    ruleVersion: number,
): Promise<CompetitionRulesAcceptanceAuditItem[]> {
    const { data: membershipData, error: membershipError } = await supabase
        .from('organisation_memberships')
        .select('user_id, role')
        .eq('organisation_id', organisationId)
        .eq('active', true)

    if (membershipError) {
        throw new Error(membershipError.message)
    }

    const memberships = (membershipData ?? []) as MembershipRow[]

    if (memberships.length === 0) {
        return []
    }

    const userIds = [...new Set(memberships.map((row) => row.user_id))]

    const [profilesResponse, acceptancesResponse] = await Promise.all([
        supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds),
        supabase
            .from('competition_rule_acceptances')
            .select('user_id, accepted_at')
            .eq('organisation_id', organisationId)
            .eq('competition_id', competitionId)
            .eq('rule_id', ruleId)
            .eq('rule_version', ruleVersion),
    ])

    if (profilesResponse.error) {
        throw new Error(profilesResponse.error.message)
    }

    if (acceptancesResponse.error) {
        throw new Error(acceptancesResponse.error.message)
    }

    const profiles = (profilesResponse.data ?? []) as ProfileRow[]
    const acceptances = (acceptancesResponse.data ?? []) as AcceptanceRow[]

    const profilesById = new Map(
        profiles.map((profile) => [profile.id, profile]),
    )
    const acceptancesByUserId = new Map(
        acceptances.map((acceptance) => [acceptance.user_id, acceptance]),
    )

    return memberships
        .map((membership): CompetitionRulesAcceptanceAuditItem => {
            const profile = profilesById.get(membership.user_id)
            const acceptance = acceptancesByUserId.get(membership.user_id)

            return {
                userId: membership.user_id,
                fullName: profile?.full_name ?? null,
                email: profile?.email ?? null,
                role: membership.role,
                accepted: Boolean(acceptance),
                acceptedAt: acceptance?.accepted_at ?? null,
            }
        })
        .sort((first, second) => {
            if (first.accepted !== second.accepted) {
                return first.accepted ? 1 : -1
            }

            const firstLabel = first.fullName ?? first.email ?? first.userId
            const secondLabel = second.fullName ?? second.email ?? second.userId
            return firstLabel.localeCompare(secondLabel)
        })
}
