export type OrganisationStatus =
    | 'active'
    | 'inactive'
    | 'suspended'

export type SubscriptionPlan =
    | 'starter'
    | 'professional'
    | 'enterprise'

export type SubscriptionStatus =
    | 'trial'
    | 'active'
    | 'suspended'
    | 'cancelled'

export interface Organisation {
    id: string

    name: string
    slug: string

    status: OrganisationStatus

    logo_url: string | null

    primary_colour: string | null
    secondary_colour: string | null

    accent_colour: string | null
    background_colour: string | null
    surface_colour: string | null
    text_colour: string | null

    subscription_plan: SubscriptionPlan
    subscription_status: SubscriptionStatus

    trial_end: string | null

    max_users: number
    max_competitions: number

    public_site_enabled: boolean

    owner_name: string | null
    owner_email: string |null
    owner_phone: string |null

    enabled_modules: string[]

    created_at: string
    updated_at: string
}

export interface OrganisationFormData {

    // Organisation

    name: string
    slug: string

    status: OrganisationStatus

    // Branding

    logo_url: string

    primary_colour: string
    secondary_colour: string

    accent_colour: string
    background_colour: string
    surface_colour: string
    text_colour: string

    // Subscription

    subscription_plan: SubscriptionPlan
    subscription_status: SubscriptionStatus

    trial_end: string

    max_users: number
    max_competitions: number

    public_site_enabled: boolean

    // Owner

    owner_name: string
    owner_email: string
    owner_phone: string

    // Modules

    enabled_modules: string[]
}

export const defaultOrganisation: OrganisationFormData = {

    // Organisation

    name: '',
    slug: '',

    status: 'active',

    // Branding

    logo_url: '',

    primary_colour: '#0f766e',
    secondary_colour: '#0f172a',

    accent_colour: '#84cc16',
    background_colour: '#071006',
    surface_colour: '#10190f',
    text_colour: '#ffffff',

    // Subscription

    subscription_plan: 'starter',
    subscription_status: 'trial',

    trial_end: '',

    max_users: 5,
    max_competitions: 2,

    public_site_enabled: true,

    // Owner

    owner_name: '',
    owner_email: '',
    owner_phone: '',

    // Modules

    enabled_modules: [
        'Dashboard',
        'Competitions',
        'Clubs',
        'Teams',
        'Competition Teams',
        'Groups',
        'Venues',
        'Fixtures',
        'Results'
    ]
}