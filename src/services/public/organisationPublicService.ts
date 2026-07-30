import { supabase } from '../../lib/supabaseClient'
import type { Organisation } from '../../components/admin/Organisations/organisationTypes'
import type { Competition } from '../../types/competitionTypes'

export type PublicArticle = {
    id: string
    organisation_id?: string | null
    competition_id?: string | null
    title?: string | null
    slug?: string | null
    excerpt?: string | null
    summary?: string | null
    content?: string | null
    featured_image_url?: string | null
    image_url?: string | null
    published?: boolean | null
    published_at?: string | null
    created_at?: string | null
    [key: string]: unknown
}

export type PublicSponsor = {
    id: string
    organisation_id?: string | null
    competition_id?: string | null
    name?: string | null
    tier?: string | null
    logo_url?: string | null
    website_url?: string | null
    description?: string | null
    active?: boolean | null
    created_at?: string | null
    [key: string]: unknown
}

export type PublicMediaItem = {
    id: string
    organisation_id?: string | null
    competition_id?: string | null
    title?: string | null
    description?: string | null
    media_type?: string | null
    url?: string | null
    media_url?: string | null
    image_url?: string | null
    thumbnail_url?: string | null
    published?: boolean | null
    created_at?: string | null
    [key: string]: unknown
}

export type PublicOrganisationData = {
    organisation: Organisation
    competitions: Competition[]
    articles: PublicArticle[]
    sponsors: PublicSponsor[]
    media: PublicMediaItem[]
}

function isMissingRelationError(error: {
    code?: string
    message?: string
} | null) {
    if (!error) return false

    return (
        error.code === '42P01' ||
        error.message
            ?.toLowerCase()
            .includes('does not exist') === true
    )
}

function logOptionalSectionError(
    section: string,
    error: {
        code?: string
        message?: string
    } | null,
) {
    if (!error) return

    if (isMissingRelationError(error)) {
        console.warn(
            `Public ${section} table is not available yet.`,
        )
        return
    }

    console.error(
        `Failed to load public ${section}:`,
        error,
    )
}

async function getPublishedCompetitions(
    organisationId: string,
): Promise<Competition[]> {
    const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .eq('organisation_id', organisationId)
        .eq('published', true)
        .order('start_date', {
            ascending: true,
            nullsFirst: false,
        })
        .order('created_at', {
            ascending: true,
        })

    if (error) {
        console.error(
            'Failed to load public competitions:',
            error,
        )
        throw error
    }

    return (data ?? []) as Competition[]
}

async function getPublishedArticles(
    organisationId: string,
): Promise<PublicArticle[]> {
    const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('organisation_id', organisationId)
        .eq('published', true)
        .order('published_at', {
            ascending: false,
            nullsFirst: false,
        })
        .order('created_at', {
            ascending: false,
        })
        .limit(6)

    if (error) {
        logOptionalSectionError(
            'articles',
            error,
        )
        return []
    }

    return (data ?? []) as PublicArticle[]
}

async function getActiveSponsors(
    organisationId: string,
    competitionIds: string[],
): Promise<PublicSponsor[]> {
    const {
        data: organisationSponsors,
        error: organisationSponsorsError,
    } = await supabase
        .from('sponsors')
        .select('*')
        .eq('organisation_id', organisationId)
        .eq('active', true)
        .order('created_at', {
            ascending: false,
        })

    if (!organisationSponsorsError) {
        return (
            organisationSponsors ?? []
        ) as PublicSponsor[]
    }

    if (competitionIds.length === 0) {
        logOptionalSectionError(
            'sponsors',
            organisationSponsorsError,
        )
        return []
    }

    const {
        data: competitionSponsors,
        error: competitionSponsorsError,
    } = await supabase
        .from('sponsors')
        .select('*')
        .in(
            'competition_id',
            competitionIds,
        )
        .eq('active', true)
        .order('created_at', {
            ascending: false,
        })

    if (competitionSponsorsError) {
        logOptionalSectionError(
            'sponsors',
            competitionSponsorsError,
        )
        return []
    }

    return (
        competitionSponsors ?? []
    ) as PublicSponsor[]
}

export const organisationPublicService = {
    async getOrganisationBySlug(
        slug: string,
    ): Promise<Organisation | null> {
        const {data, error} = await supabase
            .from('organisations')
            .select('*')
            .eq('slug', slug)
            .eq(
                'public_site_enabled',
                true,
            )
            .eq('status', 'active')
            .maybeSingle()

        if (error) {
            console.error(
                'Failed to load public organisation:',
                error,
            )
            throw error
        }

        return data as Organisation | null
    },

    async getPublicOrganisationData(
        slug: string,
    ): Promise<PublicOrganisationData | null> {
        const organisation =
            await organisationPublicService
                .getOrganisationBySlug(
                    slug,
                )

        if (!organisation) {
            return null
        }

        const competitions =
            await getPublishedCompetitions(
                organisation.id,
            )

        const competitionIds =
            competitions.map(
                (competition) =>
                    competition.id,
            )

        const [
            articles,
            sponsors,
        ] = await Promise.all([
            getPublishedArticles(
                organisation.id,
            ),
            getActiveSponsors(
                organisation.id,
                competitionIds,
            ),
        ])

        return {
            organisation,
            competitions,
            articles,
            sponsors,
            media: [],
        }
    },
}