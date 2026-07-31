import { supabase } from '../lib/supabaseClient'
import {
    AIAssignmentRecommendation,
    AssignmentStatus,
    Official,
    OfficialAssignment,
    OfficialAvailability,
    OfficialCompliance,
    OfficialDashboardStats,
    OfficialFilters,
    OfficialMarketplaceProfile,
    OfficialPayment,
    OfficialQualification,
    OfficialRating,
    PaymentStatus,
    UUID,
} from '../types/officialTypes'

const OFFICIALS_TABLE = 'officials'
const QUALIFICATIONS_TABLE = 'official_qualifications'
const COMPLIANCE_TABLE = 'official_compliance'
const AVAILABILITY_TABLE = 'official_availability'
const ASSIGNMENTS_TABLE = 'official_assignments'
const RATINGS_TABLE = 'official_ratings'
const PAYMENTS_TABLE = 'official_payments'
const MARKETPLACE_PROFILES_TABLE = 'official_marketplace_profiles'

export type CreateOfficialInput = Omit<
    Official,
    | 'id'
    | 'created_at'
    | 'updated_at'
    | 'average_rating'
    | 'total_ratings'
    | 'completed_matches'
    | 'completed_tournaments'
    | 'ai_assignment_score'
>

export type UpdateOfficialInput = Partial<
    Omit<Official, 'id' | 'organisation_id' | 'created_at' | 'updated_at'>
>

export type CreateQualificationInput = Omit<
    OfficialQualification,
    'id' | 'created_at' | 'updated_at'
>

export type UpdateQualificationInput = Partial<
    Omit<
        OfficialQualification,
        'id' | 'official_id' | 'organisation_id' | 'created_at' | 'updated_at'
    >
>

export type CreateComplianceInput = Omit<
    OfficialCompliance,
    'id' | 'created_at' | 'updated_at'
>

export type UpdateComplianceInput = Partial<
    Omit<
        OfficialCompliance,
        'id' | 'official_id' | 'organisation_id' | 'created_at' | 'updated_at'
    >
>

export type CreateAvailabilityInput = Omit<
    OfficialAvailability,
    'id' | 'created_at' | 'updated_at'
>

export type UpdateAvailabilityInput = Partial<
    Omit<
        OfficialAvailability,
        'id' | 'official_id' | 'organisation_id' | 'created_at' | 'updated_at'
    >
>

export type CreateAssignmentInput = Omit<
    OfficialAssignment,
    'id' | 'created_at' | 'updated_at'
>

export type UpdateAssignmentInput = Partial<
    Omit<
        OfficialAssignment,
        'id' | 'official_id' | 'organisation_id' | 'created_at' | 'updated_at'
    >
>

export type CreateRatingInput = Omit<OfficialRating, 'id' | 'created_at'>

export type UpdateRatingInput = Partial<
    Omit<
        OfficialRating,
        'id' | 'official_id' | 'organisation_id' | 'created_at'
    >
>

export type CreatePaymentInput = Omit<
    OfficialPayment,
    'id' | 'created_at' | 'updated_at' | 'total_amount'
> & {
    total_amount?: number
}

export type UpdatePaymentInput = Partial<
    Omit<
        OfficialPayment,
        'id' | 'official_id' | 'organisation_id' | 'created_at' | 'updated_at'
    >
>

export type UpsertMarketplaceProfileInput = Omit<
    OfficialMarketplaceProfile,
    'created_at' | 'updated_at'
>

const escapeSearchTerm = (value: string): string =>
    value.replace(/[%_,()]/g, character => `\\${character}`)

const calculatePaymentTotal = (
    payment: Pick<
        OfficialPayment,
        | 'match_fee'
        | 'travel_expenses'
        | 'accommodation_expenses'
        | 'bonus_amount'
        | 'deductions'
    >
): number =>
    payment.match_fee +
    payment.travel_expenses +
    payment.accommodation_expenses +
    payment.bonus_amount -
    payment.deductions

export const officialService = {
    async getAll(
        organisationId: string,
        filters: OfficialFilters = {}
    ): Promise<Official[]> {
        let query = supabase
            .from(OFFICIALS_TABLE)
            .select('*')
            .eq('organisation_id', organisationId)
            .order('last_name')
            .order('first_name')

        if (filters.search?.trim()) {
            const search = escapeSearchTerm(filters.search.trim())
            query = query.or(
                `first_name.ilike.%${search}%,last_name.ilike.%${search}%,full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
            )
        }

        if (filters.sport_id) {
            query = query.eq('sport_id', filters.sport_id)
        }

        if (filters.role) {
            query = query.eq('role', filters.role)
        }

        if (filters.status) {
            query = query.eq('status', filters.status)
        }

        if (filters.verification_status) {
            query = query.eq(
                'verification_status',
                filters.verification_status
            )
        }

        if (filters.marketplace_visibility) {
            query = query.eq(
                'marketplace_visibility',
                filters.marketplace_visibility
            )
        }

        if (filters.minimum_rating !== undefined) {
            query = query.gte('average_rating', filters.minimum_rating)
        }

        if (filters.location?.trim()) {
            const location = escapeSearchTerm(filters.location.trim())
            query = query.or(
                `city.ilike.%${location}%,county.ilike.%${location}%,postcode.ilike.%${location}%`
            )
        }

        const { data, error } = await query

        if (error) throw error

        return data as Official[]
    },

    async getById(id: string): Promise<Official | null> {
        const { data, error } = await supabase
            .from(OFFICIALS_TABLE)
            .select('*')
            .eq('id', id)
            .maybeSingle()

        if (error) throw error

        return data as Official | null
    },

    async create(input: CreateOfficialInput): Promise<Official> {
        const fullName = input.full_name?.trim()
            ? input.full_name.trim()
            : `${input.first_name} ${input.last_name}`.trim()

        const { data, error } = await supabase
            .from(OFFICIALS_TABLE)
            .insert({
                ...input,
                full_name: fullName,
            })
            .select()
            .single()

        if (error) throw error

        return data as Official
    },

    async update(id: string, updates: UpdateOfficialInput): Promise<Official> {
        const payload: UpdateOfficialInput = { ...updates }

        if (updates.first_name !== undefined || updates.last_name !== undefined) {
            const current = await this.getById(id)

            if (!current) {
                throw new Error('Official not found')
            }

            payload.full_name = `${updates.first_name ?? current.first_name} ${
                updates.last_name ?? current.last_name
            }`.trim()
        }

        const { data, error } = await supabase
            .from(OFFICIALS_TABLE)
            .update(payload)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return data as Official
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from(OFFICIALS_TABLE)
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    async getByRole(
        organisationId: string,
        role: Official['role']
    ): Promise<Official[]> {
        return this.getAll(organisationId, { role })
    },

    async getBySport(
        organisationId: string,
        sportId: string
    ): Promise<Official[]> {
        return this.getAll(organisationId, { sport_id: sportId })
    },

    async getVerifiedOfficials(organisationId: string): Promise<Official[]> {
        return this.getAll(organisationId, {
            verification_status: 'verified',
            status: 'active',
        })
    },

    async getAvailableOfficials(
        organisationId: string,
        startDatetime: string,
        endDatetime: string,
        filters: OfficialFilters = {}
    ): Promise<Official[]> {
        const { data: unavailableRows, error } = await supabase
            .from(AVAILABILITY_TABLE)
            .select('official_id')
            .eq('organisation_id', organisationId)
            .in('status', ['unavailable', 'holiday', 'blocked'])
            .lt('start_datetime', endDatetime)
            .gt('end_datetime', startDatetime)

        if (error) throw error

        const unavailableIds = new Set(
            (unavailableRows ?? []).map(row => row.official_id as string)
        )

        const officials = await this.getAll(organisationId, {
            ...filters,
            status: filters.status ?? 'active',
        })

        return officials.filter(official => !unavailableIds.has(official.id))
    },

    async getQualifications(
        officialId: string
    ): Promise<OfficialQualification[]> {
        const { data, error } = await supabase
            .from(QUALIFICATIONS_TABLE)
            .select('*')
            .eq('official_id', officialId)
            .order('expiry_date', { ascending: true, nullsFirst: false })

        if (error) throw error

        return data as OfficialQualification[]
    },

    async addQualification(
        input: CreateQualificationInput
    ): Promise<OfficialQualification> {
        const { data, error } = await supabase
            .from(QUALIFICATIONS_TABLE)
            .insert(input)
            .select()
            .single()

        if (error) throw error

        return data as OfficialQualification
    },

    async updateQualification(
        id: string,
        updates: UpdateQualificationInput
    ): Promise<OfficialQualification> {
        const { data, error } = await supabase
            .from(QUALIFICATIONS_TABLE)
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return data as OfficialQualification
    },

    async removeQualification(id: string): Promise<void> {
        const { error } = await supabase
            .from(QUALIFICATIONS_TABLE)
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    async getCompliance(officialId: string): Promise<OfficialCompliance[]> {
        const { data, error } = await supabase
            .from(COMPLIANCE_TABLE)
            .select('*')
            .eq('official_id', officialId)
            .order('expiry_date', { ascending: true, nullsFirst: false })

        if (error) throw error

        return data as OfficialCompliance[]
    },

    async addCompliance(
        input: CreateComplianceInput
    ): Promise<OfficialCompliance> {
        const { data, error } = await supabase
            .from(COMPLIANCE_TABLE)
            .insert(input)
            .select()
            .single()

        if (error) throw error

        return data as OfficialCompliance
    },

    async updateCompliance(
        id: string,
        updates: UpdateComplianceInput
    ): Promise<OfficialCompliance> {
        const { data, error } = await supabase
            .from(COMPLIANCE_TABLE)
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return data as OfficialCompliance
    },

    async removeCompliance(id: string): Promise<void> {
        const { error } = await supabase
            .from(COMPLIANCE_TABLE)
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    async getAvailability(
        officialId: string,
        startDatetime?: string,
        endDatetime?: string
    ): Promise<OfficialAvailability[]> {
        let query = supabase
            .from(AVAILABILITY_TABLE)
            .select('*')
            .eq('official_id', officialId)
            .order('start_datetime')

        if (startDatetime) {
            query = query.gte('end_datetime', startDatetime)
        }

        if (endDatetime) {
            query = query.lte('start_datetime', endDatetime)
        }

        const { data, error } = await query

        if (error) throw error

        return data as OfficialAvailability[]
    },

    async saveAvailability(
        input: CreateAvailabilityInput
    ): Promise<OfficialAvailability> {
        const { data, error } = await supabase
            .from(AVAILABILITY_TABLE)
            .insert(input)
            .select()
            .single()

        if (error) throw error

        return data as OfficialAvailability
    },

    async updateAvailability(
        id: string,
        updates: UpdateAvailabilityInput
    ): Promise<OfficialAvailability> {
        const { data, error } = await supabase
            .from(AVAILABILITY_TABLE)
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return data as OfficialAvailability
    },

    async deleteAvailability(id: string): Promise<void> {
        const { error } = await supabase
            .from(AVAILABILITY_TABLE)
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    async getAssignments(
        organisationId: string,
        officialId?: string,
        status?: AssignmentStatus
    ): Promise<OfficialAssignment[]> {
        let query = supabase
            .from(ASSIGNMENTS_TABLE)
            .select('*')
            .eq('organisation_id', organisationId)
            .order('created_at', { ascending: false })

        if (officialId) {
            query = query.eq('official_id', officialId)
        }

        if (status) {
            query = query.eq('status', status)
        }

        const { data, error } = await query

        if (error) throw error

        return data as OfficialAssignment[]
    },

    async getAssignmentsForFixture(
        fixtureId: string
    ): Promise<OfficialAssignment[]> {
        const { data, error } = await supabase
            .from(ASSIGNMENTS_TABLE)
            .select('*')
            .eq('fixture_id', fixtureId)
            .order('role')

        if (error) throw error

        return data as OfficialAssignment[]
    },

    async assignOfficial(
        input: CreateAssignmentInput
    ): Promise<OfficialAssignment> {
        const { data, error } = await supabase
            .from(ASSIGNMENTS_TABLE)
            .insert({
                ...input,
                assigned_at: input.assigned_at ?? new Date().toISOString(),
            })
            .select()
            .single()

        if (error) throw error

        return data as OfficialAssignment
    },

    async updateAssignment(
        id: string,
        updates: UpdateAssignmentInput
    ): Promise<OfficialAssignment> {
        const payload: UpdateAssignmentInput = { ...updates }

        if (updates.status === 'accepted' && !updates.accepted_at) {
            payload.accepted_at = new Date().toISOString()
        }

        const { data, error } = await supabase
            .from(ASSIGNMENTS_TABLE)
            .update(payload)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return data as OfficialAssignment
    },

    async deleteAssignment(id: string): Promise<void> {
        const { error } = await supabase
            .from(ASSIGNMENTS_TABLE)
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    async getRatings(officialId: string): Promise<OfficialRating[]> {
        const { data, error } = await supabase
            .from(RATINGS_TABLE)
            .select('*')
            .eq('official_id', officialId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return data as OfficialRating[]
    },

    async addRating(input: CreateRatingInput): Promise<OfficialRating> {
        const { data, error } = await supabase
            .from(RATINGS_TABLE)
            .insert(input)
            .select()
            .single()

        if (error) throw error

        return data as OfficialRating
    },

    async updateRating(
        id: string,
        updates: UpdateRatingInput
    ): Promise<OfficialRating> {
        const { data, error } = await supabase
            .from(RATINGS_TABLE)
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return data as OfficialRating
    },

    async deleteRating(id: string): Promise<void> {
        const { error } = await supabase
            .from(RATINGS_TABLE)
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    async getPayments(
        organisationId: string,
        officialId?: string,
        status?: PaymentStatus
    ): Promise<OfficialPayment[]> {
        let query = supabase
            .from(PAYMENTS_TABLE)
            .select('*')
            .eq('organisation_id', organisationId)
            .order('created_at', { ascending: false })

        if (officialId) {
            query = query.eq('official_id', officialId)
        }

        if (status) {
            query = query.eq('payment_status', status)
        }

        const { data, error } = await query

        if (error) throw error

        return data as OfficialPayment[]
    },

    async createPayment(input: CreatePaymentInput): Promise<OfficialPayment> {
        const totalAmount =
            input.total_amount ??
            calculatePaymentTotal({
                match_fee: input.match_fee,
                travel_expenses: input.travel_expenses,
                accommodation_expenses: input.accommodation_expenses,
                bonus_amount: input.bonus_amount,
                deductions: input.deductions,
            })

        const { data, error } = await supabase
            .from(PAYMENTS_TABLE)
            .insert({
                ...input,
                total_amount: totalAmount,
            })
            .select()
            .single()

        if (error) throw error

        return data as OfficialPayment
    },

    async updatePayment(
        id: string,
        updates: UpdatePaymentInput
    ): Promise<OfficialPayment> {
        const { data, error } = await supabase
            .from(PAYMENTS_TABLE)
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return data as OfficialPayment
    },

    async getMarketplaceProfile(
        officialId: string
    ): Promise<OfficialMarketplaceProfile | null> {
        const { data, error } = await supabase
            .from(MARKETPLACE_PROFILES_TABLE)
            .select('*')
            .eq('official_id', officialId)
            .maybeSingle()

        if (error) throw error

        return data as OfficialMarketplaceProfile | null
    },

    async upsertMarketplaceProfile(
        input: UpsertMarketplaceProfileInput
    ): Promise<OfficialMarketplaceProfile> {
        const { data, error } = await supabase
            .from(MARKETPLACE_PROFILES_TABLE)
            .upsert(input, { onConflict: 'official_id' })
            .select()
            .single()

        if (error) throw error

        return data as OfficialMarketplaceProfile
    },

    async getPublicMarketplaceOfficials(
        filters: OfficialFilters = {}
    ): Promise<Official[]> {
        let query = supabase
            .from(OFFICIALS_TABLE)
            .select('*')
            .eq('marketplace_visibility', 'public')
            .eq('status', 'active')
            .eq('verification_status', 'verified')
            .order('average_rating', { ascending: false, nullsFirst: false })
            .order('completed_matches', {
                ascending: false,
                nullsFirst: false,
            })

        if (filters.search?.trim()) {
            const search = escapeSearchTerm(filters.search.trim())
            query = query.or(
                `first_name.ilike.%${search}%,last_name.ilike.%${search}%,full_name.ilike.%${search}%`
            )
        }

        if (filters.sport_id) {
            query = query.eq('sport_id', filters.sport_id)
        }

        if (filters.role) {
            query = query.eq('role', filters.role)
        }

        if (filters.minimum_rating !== undefined) {
            query = query.gte('average_rating', filters.minimum_rating)
        }

        if (filters.location?.trim()) {
            const location = escapeSearchTerm(filters.location.trim())
            query = query.or(
                `city.ilike.%${location}%,county.ilike.%${location}%,postcode.ilike.%${location}%`
            )
        }

        const { data, error } = await query

        if (error) throw error

        return data as Official[]
    },

    async getDashboardStats(
        organisationId: string
    ): Promise<OfficialDashboardStats> {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        const todayEnd = new Date(todayStart)
        todayEnd.setDate(todayEnd.getDate() + 1)

        const weekEnd = new Date(todayStart)
        weekEnd.setDate(weekEnd.getDate() + 7)

        const expiringDate = new Date(todayStart)
        expiringDate.setDate(expiringDate.getDate() + 30)

        const [
            officialsResult,
            complianceResult,
            assignmentsResult,
            paymentsResult,
        ] = await Promise.all([
            supabase
                .from(OFFICIALS_TABLE)
                .select(
                    'id,status,verification_status,average_rating',
                    { count: 'exact' }
                )
                .eq('organisation_id', organisationId),
            supabase
                .from(COMPLIANCE_TABLE)
                .select('id,status,expiry_date')
                .eq('organisation_id', organisationId),
            supabase
                .from(ASSIGNMENTS_TABLE)
                .select('id,assigned_at,status')
                .eq('organisation_id', organisationId)
                .neq('status', 'cancelled'),
            supabase
                .from(PAYMENTS_TABLE)
                .select('id,payment_status')
                .eq('organisation_id', organisationId)
                .in('payment_status', ['pending', 'approved', 'processing']),
        ])

        if (officialsResult.error) throw officialsResult.error
        if (complianceResult.error) throw complianceResult.error
        if (assignmentsResult.error) throw assignmentsResult.error
        if (paymentsResult.error) throw paymentsResult.error

        const officials = (officialsResult.data ?? []) as Pick<
            Official,
            'id' | 'status' | 'verification_status' | 'average_rating'
        >[]
        const compliance = (complianceResult.data ?? []) as Pick<
            OfficialCompliance,
            'id' | 'status' | 'expiry_date'
        >[]
        const assignments = (assignmentsResult.data ?? []) as Pick<
            OfficialAssignment,
            'id' | 'assigned_at' | 'status'
        >[]

        const ratings = officials
            .map(official => official.average_rating)
            .filter((rating): rating is number => typeof rating === 'number')

        const averageRating = ratings.length
            ? ratings.reduce((sum, rating) => sum + rating, 0) /
            ratings.length
            : 0

        const todayStartTime = todayStart.getTime()
        const todayEndTime = todayEnd.getTime()
        const weekEndTime = weekEnd.getTime()
        const expiringTime = expiringDate.getTime()

        return {
            totalOfficials: officials.length,
            activeOfficials: officials.filter(
                official => official.status === 'active'
            ).length,
            availableOfficials: officials.filter(
                official => official.status === 'active'
            ).length,
            suspendedOfficials: officials.filter(
                official => official.status === 'suspended'
            ).length,
            pendingVerification: officials.filter(
                official => official.verification_status === 'pending'
            ).length,
            expiringCompliance: compliance.filter(item => {
                if (!item.expiry_date || item.status === 'expired') return false

                const expiry = new Date(item.expiry_date).getTime()
                return expiry >= todayStartTime && expiry <= expiringTime
            }).length,
            assignmentsToday: assignments.filter(assignment => {
                if (!assignment.assigned_at) return false

                const assignedAt = new Date(assignment.assigned_at).getTime()
                return assignedAt >= todayStartTime && assignedAt < todayEndTime
            }).length,
            assignmentsThisWeek: assignments.filter(assignment => {
                if (!assignment.assigned_at) return false

                const assignedAt = new Date(assignment.assigned_at).getTime()
                return assignedAt >= todayStartTime && assignedAt < weekEndTime
            }).length,
            paymentsPending: paymentsResult.data?.length ?? 0,
            averageRating: Number(averageRating.toFixed(2)),
        }
    },

    async saveAIRecommendations(
        organisationId: UUID,
        fixtureId: UUID,
        recommendations: AIAssignmentRecommendation[]
    ): Promise<OfficialAssignment[]> {
        if (!recommendations.length) {
            return []
        }

        const assignments = recommendations.map(recommendation => ({
            organisation_id: organisationId,
            official_id: recommendation.official_id,
            fixture_id: fixtureId,
            role: 'referee' as const,
            source: 'ai' as const,
            status: 'proposed' as const,
            assignment_score: recommendation.score,
            notes: recommendation.explanation.join('\n'),
        }))

        const { data, error } = await supabase
            .from(ASSIGNMENTS_TABLE)
            .insert(assignments)
            .select()

        if (error) throw error

        return data as OfficialAssignment[]
    },
}