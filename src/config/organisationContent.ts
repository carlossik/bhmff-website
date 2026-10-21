export type OrganisationContentConfig = {
    articleCategories: readonly string[];
    defaultArticleCategory: string;
    articleTagsPlaceholder: string;
};

const BHMFF_CONTENT: OrganisationContentConfig = {
    articleCategories: [
        "Black Football History",
        "Player Stories",
        "Coach & Volunteer Spotlights",
        "Club & Community Features",
        "Festival News",
        "Match Reports",
        "Careers in Football",
        "Opinion & Education",
        "Sponsor & Partner Stories",
        "Youth Voices",
    ],
    defaultArticleCategory:
        "Festival News",
    articleTagsPlaceholder:
        "Football history, Community, Festival",
};

const DEFAULT_CONTENT: OrganisationContentConfig = {
    articleCategories: [
        "Competition News",
        "Match Reports",
        "Club Updates",
        "Player Stories",
        "Coach & Volunteer Spotlights",
        "Community",
        "Announcements",
        "Features",
        "Sponsor & Partner Stories",
        "Youth Sport",
    ],
    defaultArticleCategory:
        "Competition News",
    articleTagsPlaceholder:
        "Competition news, Community, Match report",
};

export function getOrganisationContentConfig(
    organisationSlug: string | null | undefined,
): OrganisationContentConfig {
    const normalisedSlug =
        organisationSlug
            ?.trim()
            .toLowerCase() ?? "";

    return normalisedSlug === "bhmff"
        ? BHMFF_CONTENT
        : DEFAULT_CONTENT;
}

export function getOrganisationPublicSiteUrl(
    origin: string,
    organisationSlug: string,
): string {
    const url = new URL(origin);
    // Only local development uses the current origin. All published
    // organisation websites belong on the TournamentHQ application.
    const isLocal = ["localhost", "127.0.0.1"].includes(url.hostname);
    const publicOrigin = isLocal ? url.origin : "https://app.tournamenthq.co.uk";
    const encodedSlug = encodeURIComponent(organisationSlug.trim());
    return `${publicOrigin}/${encodedSlug}`;
}