import { supabase } from '../../../lib/supabaseClient'
import type {
    Sponsor,
    SponsorFormValues,
} from './sponsorTypes'

const BUCKET_NAME = 'sponsor-logos'

function throwSupabaseError(
    error: { message: string } | null,
    context: string
) {
    if (!error) return

    console.error(`${context}:`, error)
    throw new Error(error.message)
}

function getStoragePath(publicUrl: string | null) {
    if (!publicUrl) return null

    const marker =
        `/storage/v1/object/public/${BUCKET_NAME}/`

    const markerIndex = publicUrl.indexOf(marker)

    if (markerIndex === -1) {
        return null
    }

    return decodeURIComponent(
        publicUrl.slice(
            markerIndex + marker.length
        )
    )
}

export const sponsorService = {
    async getActiveCompetitionId(): Promise<string | null> {
        const { data, error } = await supabase
            .from('competitions')
            .select('id')
            .eq('status', 'ACTIVE')
            .limit(1)
            .maybeSingle()

        throwSupabaseError(
            error,
            'Failed to load active competition'
        )

        return data?.id ?? null
    },

    async getSponsors(
        competitionId: string
    ): Promise<Sponsor[]> {
        const { data, error } = await supabase
            .from('sponsors')
            .select('*')
            .eq('competition_id', competitionId)
            .order('created_at', {
                ascending: false,
            })

        throwSupabaseError(
            error,
            'Failed to load sponsors'
        )

        return data ?? []
    },

    async uploadLogo(
        file: File
    ): Promise<{
        publicUrl: string
        storagePath: string
    }> {
        const extension =
            file.name
                .split('.')
                .pop()
                ?.toLowerCase() || 'png'

        const storagePath =
            `sponsors/${crypto.randomUUID()}.${extension}`

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type,
            })

        throwSupabaseError(
            error,
            'Failed to upload sponsor logo'
        )

        const { data } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(storagePath)

        return {
            publicUrl: data.publicUrl,
            storagePath,
        }
    },

    async deleteLogo(
        publicUrl: string | null
    ): Promise<void> {
        const storagePath =
            getStoragePath(publicUrl)

        if (!storagePath) return

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([storagePath])

        if (error) {
            console.error(
                'Failed to delete sponsor logo:',
                error
            )
        }
    },

    async createSponsor(
        competitionId: string,
        values: SponsorFormValues,
        logoUrl: string | null
    ): Promise<void> {
        const { error } = await supabase
            .from('sponsors')
            .insert({
                competition_id: competitionId,
                name: values.name.trim(),
                tier:
                    values.tier.trim() || null,
                logo_url: logoUrl,
                website_url:
                    values.website_url.trim() ||
                    null,
                description:
                    values.description.trim() ||
                    null,
                active: values.active,
            })

        throwSupabaseError(
            error,
            'Failed to create sponsor'
        )
    },

    async updateSponsor(
        sponsorId: string,
        values: SponsorFormValues,
        logoUrl: string | null
    ): Promise<void> {
        const { error } = await supabase
            .from('sponsors')
            .update({
                name: values.name.trim(),
                tier:
                    values.tier.trim() || null,
                logo_url: logoUrl,
                website_url:
                    values.website_url.trim() ||
                    null,
                description:
                    values.description.trim() ||
                    null,
                active: values.active,
            })
            .eq('id', sponsorId)

        throwSupabaseError(
            error,
            'Failed to update sponsor'
        )
    },

    async deleteSponsor(
        sponsorId: string
    ): Promise<void> {
        const { error } = await supabase
            .from('sponsors')
            .delete()
            .eq('id', sponsorId)

        throwSupabaseError(
            error,
            'Failed to delete sponsor'
        )
    },
}