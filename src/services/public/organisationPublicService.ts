import { supabase } from "../../lib/supabaseClient";

import type { Organisation } from "../../components/admin/Organisations/organisationTypes";
import type { Competition } from "../../types/competitionTypes";

export type PublicArticle = {
    id: string;
    organisation_id?: string | null;
    slug?: string | null;
    title?: string | null;
    category?: string | null;
    status?: string | null;
    summary?: string | null;
    hero?: string | null;
    read_time?: string | null;
    body?: unknown;
    author?: string | null;
    published_at?: string | null;
    featured?: boolean | null;
    image_url?: string | null;
    image_alt?: string | null;
    tags?: unknown;
    actions?: unknown;
    created_at?: string | null;
    updated_at?: string | null;
    [key: string]: unknown;
};

export type PublicSponsor = {
    id: string;
    organisation_id?: string | null;
    competition_id?: string | null;
    name?: string | null;
    tier?: string | null;
    logo_url?: string | null;
    website_url?: string | null;
    description?: string | null;
    active?: boolean | null;
    created_at?: string | null;
    updated_at?: string | null;
    [key: string]: unknown;
};

export type PublicMediaItem = {
    id: string;
    organisation_id?: string | null;
    competition_id?: string | null;
    title?: string | null;
    slug?: string | null;
    category?: string | null;
    description?: string | null;
    youtube_url?: string | null;
    embed_url?: string | null;
    thumbnail_url?: string | null;
    thumbnail_alt?: string | null;
    featured?: boolean | null;
    status?: string | null;
    published_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    [key: string]: unknown;
};

export type PublicOrganisationData = {
    organisation: Organisation;
    competitions: Competition[];
    articles: PublicArticle[];
    sponsors: PublicSponsor[];
    media: PublicMediaItem[];
};

function logOptionalSectionError(
    section: string,
    error: {
        code?: string;
        message?: string;
    } | null,
) {
    if (!error) {
        return;
    }

    console.error(
        `Failed to load public ${section}:`,
        error,
    );
}

async function getPublishedCompetitions(
    organisationId: string,
): Promise<Competition[]> {
    const { data, error } = await supabase
        .from("competitions")
        .select("*")
        .eq(
            "organisation_id",
            organisationId,
        )
        .eq("published", true)
        .order("start_date", {
            ascending: false,
            nullsFirst: false,
        })
        .order("created_at", {
            ascending: false,
        });

    if (error) {
        console.error(
            "Failed to load public competitions:",
            error,
        );
        throw error;
    }

    return (data ?? []) as Competition[];
}

async function getPublishedArticles(
    organisationId: string,
): Promise<PublicArticle[]> {
    const { data, error } = await supabase
        .from("articles")
        .select(`
            id,
            organisation_id,
            slug,
            title,
            category,
            status,
            summary,
            hero,
            read_time,
            body,
            author,
            published_at,
            featured,
            image_url,
            image_alt,
            tags,
            actions,
            created_at,
            updated_at
        `)
        .eq(
            "organisation_id",
            organisationId,
        )
        .eq("status", "published")
        .order("featured", {
            ascending: false,
        })
        .order("published_at", {
            ascending: false,
            nullsFirst: false,
        })
        .order("created_at", {
            ascending: false,
        });

    if (error) {
        logOptionalSectionError(
            "articles",
            error,
        );
        return [];
    }

    return (data ?? []) as PublicArticle[];
}

async function getPublishedMedia(
    organisation: Organisation,
    competitionIds: string[],
): Promise<PublicMediaItem[]> {
    /*
     * Club media belongs to the club organisation first. A club does not need
     * a competition in order to publish videos, galleries or other media.
     *
     * Competition-organiser media remains restricted to competitions that are
     * themselves published. This mirrors the public RLS policy and prevents a
     * public page from depending on the visitor being authenticated.
     */
    if (
        organisation.organisation_type !== "club" &&
        competitionIds.length === 0
    ) {
        return [];
    }

    let query = supabase
        .from("media")
        .select(`
            id,
            organisation_id,
            competition_id,
            title,
            slug,
            category,
            description,
            youtube_url,
            embed_url,
            thumbnail_url,
            thumbnail_alt,
            featured,
            status,
            published_at,
            created_at,
            updated_at
        `)
        .eq(
            "organisation_id",
            organisation.id,
        )
        .eq("status", "published")
        .order("featured", {
            ascending: false,
        })
        .order("published_at", {
            ascending: false,
            nullsFirst: false,
        })
        .order("created_at", {
            ascending: false,
        });

    if (organisation.organisation_type !== "club") {
        query = competitionIds.length === 1
            ? query.eq(
                  "competition_id",
                  competitionIds[0],
              )
            : query.in(
                  "competition_id",
                  competitionIds,
              );
    }

    const { data, error } =
        await query;

    if (error) {
        logOptionalSectionError(
            "media",
            error,
        );
        return [];
    }

    return (data ?? []) as PublicMediaItem[];
}

async function getActiveSponsors(
    organisationId: string,
    competitionIds: string[],
): Promise<PublicSponsor[]> {
    const organisationResponse =
        await supabase
            .from("sponsors")
            .select("*")
            .eq(
                "organisation_id",
                organisationId,
            )
            .eq("active", true)
            .order("created_at", {
                ascending: true,
            });

    if (
        !organisationResponse.error
    ) {
        return (
            organisationResponse.data ??
            []
        ) as PublicSponsor[];
    }

    if (
        competitionIds.length ===
        0
    ) {
        logOptionalSectionError(
            "sponsors",
            organisationResponse.error,
        );
        return [];
    }

    const competitionResponse =
        await supabase
            .from("sponsors")
            .select("*")
            .in(
                "competition_id",
                competitionIds,
            )
            .eq("active", true)
            .order("created_at", {
                ascending: true,
            });

    if (
        competitionResponse.error
    ) {
        logOptionalSectionError(
            "sponsors",
            competitionResponse.error,
        );
        return [];
    }

    return (
        competitionResponse.data ??
        []
    ) as PublicSponsor[];
}

export const organisationPublicService = {
    async getOrganisationBySlug(
        slug: string,
    ): Promise<Organisation | null> {
        const normalisedSlug =
            slug.trim();

        if (!normalisedSlug) {
            return null;
        }

        const { data, error } =
            await supabase
                .from("organisations")
                .select("*")
                .eq(
                    "slug",
                    normalisedSlug,
                )
                .eq(
                    "public_site_enabled",
                    true,
                )
                .eq(
                    "status",
                    "active",
                )
                .maybeSingle();

        if (error) {
            console.error(
                "Failed to load public organisation:",
                error,
            );
            throw error;
        }

        return data as
            | Organisation
            | null;
    },

    async getPublicOrganisationData(
        slug: string,
    ): Promise<PublicOrganisationData | null> {
        const organisation =
            await organisationPublicService
                .getOrganisationBySlug(
                    slug,
                );

        if (!organisation) {
            return null;
        }

        const competitions =
            await getPublishedCompetitions(
                organisation.id,
            );

        const competitionIds =
            competitions.map(
                (competition) =>
                    competition.id,
            );

        const [
            articles,
            sponsors,
            media,
        ] = await Promise.all([
            getPublishedArticles(
                organisation.id,
            ),
            getActiveSponsors(
                organisation.id,
                competitionIds,
            ),
            getPublishedMedia(
                organisation,
                competitionIds,
            ),
        ]);

        return {
            organisation,
            competitions,
            articles,
            sponsors,
            media,
        };
    },
};