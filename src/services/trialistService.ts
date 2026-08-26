import { supabase } from '../lib/supabaseClient'
import type { TrialAssessment, TrialDecision, Trialist, TrialistFormValues, TrialistStatus } from '../types/trialistTypes'

type ErrorLike = { message: string }
function fail(error: ErrorLike | null, context: string): void {
    if (!error) return
    console.error(`${context}:`, error)
    throw new Error(error.message)
}
function optional(value: string): string | null { const v = value.trim(); return v || null }
function payload(values: TrialistFormValues) {
    return {
        season_id: values.season_id || null,
        team_id: values.team_id || null,
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        date_of_birth: values.date_of_birth || null,
        position: optional(values.position),
        preferred_foot: optional(values.preferred_foot),
        email: optional(values.email),
        phone: optional(values.phone),
        guardian_name: optional(values.guardian_name),
        guardian_email: optional(values.guardian_email),
        guardian_phone: optional(values.guardian_phone),
        previous_club: optional(values.previous_club),
        referred_by: optional(values.referred_by),
        trial_date: values.trial_date ? new Date(values.trial_date).toISOString() : null,
        trial_type: values.trial_type,
        venue_name: optional(values.venue_name),
        venue_address: optional(values.venue_address),
        eligible_for_match_trial: values.eligible_for_match_trial,
        internal_notes: optional(values.internal_notes),
        updated_at: new Date().toISOString(),
    }
}

export const trialistService = {
    async list(organisationId: string): Promise<Trialist[]> {
        const { data, error } = await supabase.from('club_trialists').select('*').eq('organisation_id', organisationId).order('created_at', { ascending: false })
        fail(error, 'Failed to load trialists')
        return (data ?? []) as Trialist[]
    },
    async create(organisationId: string, values: TrialistFormValues): Promise<Trialist> {
        const { data, error } = await supabase.from('club_trialists').insert({ organisation_id: organisationId, ...payload(values) }).select('*').single()
        fail(error, 'Failed to create trialist')
        if (!data) throw new Error('Trialist was created but not returned.')
        return data as Trialist
    },
    async update(id: string, values: TrialistFormValues): Promise<Trialist> {
        const { data, error } = await supabase.from('club_trialists').update(payload(values)).eq('id', id).select('*').single()
        fail(error, 'Failed to update trialist')
        if (!data) throw new Error('Trialist was updated but not returned.')
        return data as Trialist
    },
    async setStatus(id: string, status: TrialistStatus, decision?: TrialDecision): Promise<void> {
        const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
        if (decision !== undefined) patch.decision = decision
        const { error } = await supabase.from('club_trialists').update(patch).eq('id', id)
        fail(error, 'Failed to update trialist status')
    },
    async getAssessment(trialistId: string): Promise<TrialAssessment | null> {
        const { data, error } = await supabase.from('club_trial_assessments').select('*').eq('trialist_id', trialistId).maybeSingle()
        fail(error, 'Failed to load trial assessment')
        return data as TrialAssessment | null
    },
    async saveAssessment(input: Omit<TrialAssessment, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
        const { error } = await supabase.from('club_trial_assessments').upsert({ ...input, updated_at: new Date().toISOString() }, { onConflict: 'trialist_id' })
        fail(error, 'Failed to save trial assessment')
        await this.setStatus(input.trialist_id, 'under_review', input.recommendation)
    },
    async sendInvitation(organisationId: string, trialistId: string): Promise<void> {
        const { data, error } = await supabase.functions.invoke<{ error?: string }>('trialist-admin', { body: { action: 'send_invitation', organisationId, trialistId } })
        if (error) throw new Error(error.message)
        if (data?.error) throw new Error(data.error)
    },
    async sendReport(organisationId: string, trialistId: string): Promise<void> {
        const { data, error } = await supabase.functions.invoke<{ error?: string }>('trialist-admin', { body: { action: 'send_report', organisationId, trialistId } })
        if (error) throw new Error(error.message)
        if (data?.error) throw new Error(data.error)
    },
    async addToSquadAsTrialist(trialist: Trialist): Promise<void> {
        if (!trialist.season_id || !trialist.team_id) throw new Error('Assign the trialist to a season and team first.')
        if (trialist.linked_squad_member_id) return
        const { data: player, error: playerError } = await supabase.from('club_players').insert({
            organisation_id: trialist.organisation_id,
            first_name: trialist.first_name,
            last_name: trialist.last_name,
            email: trialist.guardian_email ?? trialist.email,
            phone: trialist.guardian_phone ?? trialist.phone,
            active: true,
        }).select('id').single()
        fail(playerError, 'Failed to create trialist player')
        if (!player) throw new Error('Player record was not returned.')
        const { data: member, error: memberError } = await supabase.from('club_squad_members').insert({
            organisation_id: trialist.organisation_id,
            season_id: trialist.season_id,
            team_id: trialist.team_id,
            player_id: player.id,
            registration_status: 'trialist',
            sign_on_fee_amount: 0,
            sign_on_fee_status: 'not_due',
            active: true,
        }).select('id').single()
        if (memberError || !member) {
            await supabase.from('club_players').delete().eq('id', player.id)
            fail(memberError, 'Failed to add trialist to squad')
            throw new Error('Squad member was not returned.')
        }
        const { error } = await supabase.from('club_trialists').update({ linked_player_id: player.id, linked_squad_member_id: member.id, updated_at: new Date().toISOString() }).eq('id', trialist.id)
        fail(error, 'Failed to link trialist to squad')
    },
}
