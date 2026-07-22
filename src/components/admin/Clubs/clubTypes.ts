export type DbClub = {
    id: string
    organisation_id: string
    name: string
    short_name: string | null
    badge_url: string | null
    website: string | null
    email: string | null
    phone: string | null
    address: string | null
    manager_name: string | null
    secretary_name: string | null
    facebook_url: string | null
    instagram_url: string | null
    twitter_url: string | null
    founded_year: number | null
    colours: string | null
    description: string | null
    created_at?: string
    updated_at?: string
}

export type ClubFormValues = {
    name: string
    shortName: string
    badgeUrl: string
    website: string
    email: string
    phone: string
    address: string
    managerName: string
    secretaryName: string
    facebookUrl: string
    instagramUrl: string
    twitterUrl: string
    foundedYear: string
    colours: string
    description: string
}

export const emptyClubForm: ClubFormValues = {
    name: '',
    shortName: '',
    badgeUrl: '',
    website: '',
    email: '',
    phone: '',
    address: '',
    managerName: '',
    secretaryName: '',
    facebookUrl: '',
    instagramUrl: '',
    twitterUrl: '',
    foundedYear: '',
    colours: '',
    description: '',
}

export function mapClubToForm(
    club: DbClub
): ClubFormValues {
    return {
        name: club.name,
        shortName: club.short_name ?? '',
        badgeUrl: club.badge_url ?? '',
        website: club.website ?? '',
        email: club.email ?? '',
        phone: club.phone ?? '',
        address: club.address ?? '',
        managerName: club.manager_name ?? '',
        secretaryName:
            club.secretary_name ?? '',
        facebookUrl:
            club.facebook_url ?? '',
        instagramUrl:
            club.instagram_url ?? '',
        twitterUrl:
            club.twitter_url ?? '',
        foundedYear:
            club.founded_year?.toString() ??
            '',
        colours: club.colours ?? '',
        description:
            club.description ?? '',
    }
}