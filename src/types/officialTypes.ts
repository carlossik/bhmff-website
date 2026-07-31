/**
 * TournamentHQ - Sports Officials Module
 * --------------------------------------------------------------------
 * Enterprise-grade type definitions for Officials Management.
 *
 * Design Goals
 * -------------
 * ✓ Multi-tenant
 * ✓ Multi-sport
 * ✓ Enterprise scale
 * ✓ AI assignment ready
 * ✓ Public marketplace ready
 * ✓ Payment ready
 * ✓ Future-proof
 *
 * This file intentionally contains ONLY shared TypeScript types.
 * Business logic belongs in officialService.ts.
 */

export type UUID = string;

/* -------------------------------------------------------------------------- */
/* ENUMS                                                                       */
/* -------------------------------------------------------------------------- */

export type OfficialRole =
    | 'referee'
    | 'assistant_referee'
    | 'fourth_official'
    | 'match_commissioner'
    | 'assessor'
    | 'observer'
    | 'timekeeper'
    | 'scorekeeper'
    | 'umpire'
    | 'line_judge'
    | 'table_official'
    | 'marshal'
    | 'technical_delegate'
    | 'venue_official'
    | 'medical_official'
    | 'other';

export type OfficialStatus =
    | 'active'
    | 'inactive'
    | 'pending'
    | 'suspended'
    | 'retired'
    | 'archived';

export type AvailabilityStatus =
    | 'available'
    | 'unavailable'
    | 'tentative'
    | 'holiday'
    | 'blocked';

export type AssignmentStatus =
    | 'draft'
    | 'proposed'
    | 'offered'
    | 'accepted'
    | 'declined'
    | 'confirmed'
    | 'completed'
    | 'cancelled'
    | 'no_show';

export type QualificationStatus =
    | 'active'
    | 'expired'
    | 'pending'
    | 'suspended';

export type PaymentStatus =
    | 'pending'
    | 'approved'
    | 'processing'
    | 'paid'
    | 'failed'
    | 'cancelled';

export type VerificationStatus =
    | 'not_verified'
    | 'pending'
    | 'verified'
    | 'rejected';

export type ComplianceStatus =
    | 'valid'
    | 'expiring'
    | 'expired'
    | 'missing';

export type MarketplaceVisibility =
    | 'private'
    | 'organisation_only'
    | 'public';

export type Gender =
    | 'male'
    | 'female'
    | 'non_binary'
    | 'prefer_not_to_say';

export type TravelPreference =
    | 'local_only'
    | 'regional'
    | 'national'
    | 'international';

export type AssignmentSource =
    | 'manual'
    | 'ai'
    | 'marketplace';

/* -------------------------------------------------------------------------- */
/* CORE OFFICIAL                                                               */
/* -------------------------------------------------------------------------- */

export interface Official {

    id: UUID;

    organisation_id: UUID;

    user_id?: UUID | null;

    sport_id?: UUID | null;

    first_name: string;

    last_name: string;

    full_name: string;

    email: string;

    phone?: string | null;

    date_of_birth?: string | null;

    gender?: Gender | null;

    role: OfficialRole;

    status: OfficialStatus;

    verification_status: VerificationStatus;

    marketplace_visibility: MarketplaceVisibility;

    profile_photo_url?: string | null;

    biography?: string | null;

    nationality?: string | null;

    county?: string | null;

    city?: string | null;

    postcode?: string | null;

    latitude?: number | null;

    longitude?: number | null;

    travel_preference?: TravelPreference;

    maximum_travel_distance_km?: number | null;

    emergency_contact_name?: string | null;

    emergency_contact_phone?: string | null;

    notes?: string | null;

    average_rating?: number | null;

    total_ratings?: number;

    completed_matches?: number;

    completed_tournaments?: number;

    ai_assignment_score?: number | null;

    created_at: string;

    updated_at: string;
}

/* -------------------------------------------------------------------------- */
/* QUALIFICATIONS                                                              */
/* -------------------------------------------------------------------------- */

export interface OfficialQualification {

    id: UUID;

    official_id: UUID;

    organisation_id: UUID;

    sport_id?: UUID | null;

    qualification_name: string;

    issuing_body: string;

    qualification_level?: string | null;

    certificate_number?: string | null;

    issue_date?: string | null;

    expiry_date?: string | null;

    status: QualificationStatus;

    document_url?: string | null;

    created_at: string;

    updated_at: string;
}

/* -------------------------------------------------------------------------- */
/* COMPLIANCE                                                                  */
/* -------------------------------------------------------------------------- */

export interface OfficialCompliance {

    id: UUID;

    official_id: UUID;

    organisation_id: UUID;

    compliance_name: string;

    status: ComplianceStatus;

    issue_date?: string | null;

    expiry_date?: string |null;

    document_url?: string | null;

    notes?: string | null;

    created_at: string;

    updated_at: string;
}

/* -------------------------------------------------------------------------- */
/* AVAILABILITY                                                                */
/* -------------------------------------------------------------------------- */

export interface OfficialAvailability {

    id: UUID;

    official_id: UUID;

    organisation_id: UUID;

    start_datetime: string;

    end_datetime: string;

    status: AvailabilityStatus;

    recurring: boolean;

    recurrence_rule?: string | null;

    notes?: string | null;

    created_at: string;

    updated_at: string;
}

/* -------------------------------------------------------------------------- */
/* ASSIGNMENTS                                                                 */
/* -------------------------------------------------------------------------- */

export interface OfficialAssignment {

    id: UUID;

    organisation_id: UUID;

    official_id: UUID;

    competition_id?: UUID | null;

    fixture_id?: UUID | null;

    venue_id?: UUID | null;

    sport_id?: UUID | null;

    role: OfficialRole;

    source: AssignmentSource;

    status: AssignmentStatus;

    assignment_score?: number | null;

    travel_distance_km?: number | null;

    travel_duration_minutes?: number | null;

    assigned_fee?: number | null;

    assigned_expenses?: number | null;

    assigned_by?: UUID | null;

    assigned_at?: string | null;

    accepted_at?: string | null;

    notes?: string | null;

    created_at: string;

    updated_at: string;
}

/* -------------------------------------------------------------------------- */
/* RATINGS                                                                     */
/* -------------------------------------------------------------------------- */

export interface OfficialRating {

    id: UUID;

    organisation_id: UUID;

    official_id: UUID;

    assignment_id?: UUID | null;

    fixture_id?: UUID | null;

    overall_rating: number;

    punctuality_rating?: number | null;

    professionalism_rating?: number | null;

    communication_rating?: number | null;

    knowledge_rating?: number | null;

    fairness_rating?: number | null;

    comments?: string | null;

    rated_by?: UUID | null;

    created_at: string;
}

/* -------------------------------------------------------------------------- */
/* PAYMENTS                                                                    */
/* -------------------------------------------------------------------------- */

export interface OfficialPayment {

    id: UUID;

    organisation_id: UUID;

    official_id: UUID;

    assignment_id?: UUID | null;

    fixture_id?: UUID | null;

    payment_status: PaymentStatus;

    match_fee: number;

    travel_expenses: number;

    accommodation_expenses: number;

    bonus_amount: number;

    deductions: number;

    total_amount: number;

    payment_reference?: string | null;

    payment_date?: string | null;

    created_at: string;

    updated_at: string;
}

/* -------------------------------------------------------------------------- */
/* MARKETPLACE PROFILE                                                         */
/* -------------------------------------------------------------------------- */

export interface OfficialMarketplaceProfile {

    official_id: UUID;

    headline?: string | null;

    summary?: string | null;

    years_experience?: number | null;

    available_for_hire: boolean;

    accepts_last_minute: boolean;

    hourly_rate?: number | null;

    match_rate?: number | null;

    preferred_sports: UUID[];

    preferred_roles: OfficialRole[];

    languages: string[];

    created_at: string;

    updated_at: string;
}

/* -------------------------------------------------------------------------- */
/* AI ASSIGNMENT                                                               */
/* -------------------------------------------------------------------------- */

export interface AIAssignmentRecommendation {

    official_id: UUID;

    score: number;

    availability_score: number;

    qualification_score: number;

    travel_score: number;

    experience_score: number;

    rating_score: number;

    workload_score: number;

    explanation: string[];
}

/* -------------------------------------------------------------------------- */
/* SEARCH FILTERS                                                              */
/* -------------------------------------------------------------------------- */

export interface OfficialFilters {

    search?: string;

    sport_id?: UUID;

    role?: OfficialRole;

    status?: OfficialStatus;

    verification_status?: VerificationStatus;

    marketplace_visibility?: MarketplaceVisibility;

    qualification?: string;

    available_from?: string;

    available_to?: string;

    minimum_rating?: number;

    location?: string;
}

/* -------------------------------------------------------------------------- */
/* DASHBOARD                                                                   */
/* -------------------------------------------------------------------------- */

export interface OfficialDashboardStats {

    totalOfficials: number;

    activeOfficials: number;

    availableOfficials: number;

    suspendedOfficials: number;

    pendingVerification: number;

    expiringCompliance: number;

    assignmentsToday: number;

    assignmentsThisWeek: number;

    paymentsPending: number;

    averageRating: number;
}