export type OrganisationStatus =
    | 'active'
    | 'inactive'
    | 'suspended'

export type OrganisationType =
    | 'competition_organiser'
    | 'club'

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
    organisation_type: OrganisationType

    logo_url: string | null
    description: string | null
    sport: string | null
    country: string | null
    currency: string | null
    founded_year: number | null
    home_ground: string | null
    website_url: string | null
    contact_email: string | null
    facebook_url: string | null
    instagram_url: string | null
    twitter_url: string | null
    youtube_url: string | null

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
    organisation_type: OrganisationType

    // Branding

    logo_url: string
    description: string
    sport: string
    country: string
    currency: string
    founded_year: number | null
    home_ground: string
    website_url: string
    contact_email: string
    facebook_url: string
    instagram_url: string
    twitter_url: string
    youtube_url: string

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
    organisation_type: 'competition_organiser',

    // Branding

    logo_url: '',
    description: '',
    sport: '',
    country: 'United Kingdom',
    currency: 'GBP',
    founded_year: null,
    home_ground: '',
    website_url: '',
    contact_email: '',
    facebook_url: '',
    instagram_url: '',
    twitter_url: '',
    youtube_url: '',

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