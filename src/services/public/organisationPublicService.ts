import { supabase } from "../../lib/supabaseClient";

import type {
    Organisation,
} from "../../components/admin/Organisations/organisationTypes";

import type {
    Competition,
} from "../../types/competitionTypes";

export type PublicArticle = {
    id: string;
    organisation_id?: string | null;
    competition_id?: string | null;
    title?: string | null;
    slug?: string | null;
    category?: string | null;
    excerpt?: string | null;
    summary?: string | null;
    hero?: string | null;
    content?: string | null;
    body?: unknown;
    author?: string | null;
    featured?: boolean | null;
    featured_image_url?: string | null;
    image_url?: string | null;
    image_alt?: string | null;
    published?: boolean | null;
    status?: string | null;
    published_at?: string | null;
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
    description?: string | null;
    media_type?: string | null;
    url?: string | null;
    media_url?: string | null;
    image_url?: string | null;
    thumbnail_url?: string | null;
    published?: boolean | null;
    featured?: boolean | null;
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

type SupabaseErrorLike = {
    code?: string;
    message?: string;
} | null;

function isMissingRelationError(
    error: SupabaseErrorLike,
) {
    if (!error) {
        return false;
    }

    const message =
        error.message?.toLowerCase() ??
        "";

    return (
        error.code === "42P01" ||
        message.includes(
            "does not exist",
        )
    );
}

function isMissingColumnError(
    error: SupabaseErrorLike,
) {
    if (!error) {
        return false;
    }

    const message =
        error.message?.toLowerCase() ??
        "";

    return (
        error.code === "42703" ||
        message.includes(
            "column",
        ) &&
        message.includes(
            "does not exist",
        )
    );
}

function logOptionalSectionError(
    section: string,
    error: SupabaseErrorLike,
) {
    if (!error) {
        return;
    }

    if (
        isMissingRelationError(error)
    ) {
        console.warn(
            `Public ${section} table is not available yet.`,
        );
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
    const {
        data,
        error,
    } = await supabase
        .from("competitions")
        .select("*")
        .eq(
            "organisation_id",
            organisationId,
        )
        .eq(
            "published",
            true,
        )
        .order(
            "start_date",
            {
                ascending: true,
                nullsFirst: false,
            },
        )
        .order(
            "created_at",
            {
                ascending: true,
            },
        );

    if (error) {
        console.error(
            "Failed to load public competitions:",
            error,
        );
        throw error;
    }

    return (
        data ?? []
    ) as Competition[];
}

async function getPublishedArticles(
    organisationId: string,
): Promise<PublicArticle[]> {
    const publishedResponse =
        await supabase
            .from("articles")
            .select("*")
            .eq(
                "organisation_id",
                organisationId,
            )
            .eq(
                "published",
                true,
            )
            .order(
                "published_at",
                {
                    ascending: false,
                    nullsFirst: false,
                },
            )
            .order(
                "created_at",
                {
                    ascending: false,
                },
            );

    if (
        !publishedResponse.error
    ) {
        return (
            publishedResponse.data ??
            []
        ) as PublicArticle[];
    }

    if (
        !isMissingColumnError(
            publishedResponse.error,
        )
    ) {
        logOptionalSectionError(
            "articles",
            publishedResponse.error,
        );
        return [];
    }

    const statusResponse =
        await supabase
            .from("articles")
            .select("*")
            .eq(
                "organisation_id",
                organisationId,
            )
            .eq(
                "status",
                "published",
            )
            .order(
                "published_at",
                {
                    ascending: false,
                    nullsFirst: false,
                },
            )
            .order(
                "created_at",
                {
                    ascending: false,
                },
            );

    if (statusResponse.error) {
        logOptionalSectionError(
            "articles",
            statusResponse.error,
        );
        return [];
    }

    return (
        statusResponse.data ??
        []
    ) as PublicArticle[];
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
            .eq(
                "active",
                true,
            )
            .order(
                "created_at",
                {
                    ascending: false,
                },
            );

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
            .eq(
                "active",
                true,
            )
            .order(
                "created_at",
                {
                    ascending: false,
                },
            );

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

async function getPublishedMedia(
    organisationId: string,
    competitionIds: string[],
): Promise<PublicMediaItem[]> {
    const organisationResponse =
        await supabase
            .from("media")
            .select("*")
            .eq(
                "organisation_id",
                organisationId,
            )
            .eq(
                "published",
                true,
            )
            .order(
                "featured",
                {
                    ascending: false,
                },
            )
            .order(
                "created_at",
                {
                    ascending: false,
                },
            );

    if (
        !organisationResponse.error
    ) {
        return (
            organisationResponse.data ??
            []
        ) as PublicMediaItem[];
    }

    if (
        competitionIds.length ===
        0
    ) {
        logOptionalSectionError(
            "media",
            organisationResponse.error,
        );
        return [];
    }

    const competitionResponse =
        await supabase
            .from("media")
            .select("*")
            .in(
                "competition_id",
                competitionIds,
            )
            .eq(
                "published",
                true,
            )
            .order(
                "featured",
                {
                    ascending: false,
                },
            )
            .order(
                "created_at",
                {
                    ascending: false,
                },
            );

    if (
        competitionResponse.error
    ) {
        logOptionalSectionError(
            "media",
            competitionResponse.error,
        );
        return [];
    }

    return (
        competitionResponse.data ??
        []
    ) as PublicMediaItem[];
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

        const {
            data,
            error,
        } = await supabase
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
                organisation.id,
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