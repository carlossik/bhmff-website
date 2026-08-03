export const sponsorStatuses = [
    "new",
    "contacted",
    "proposal_sent",
    "negotiating",
    "secured",
    "closed",
] as const;

export const demoStatuses = [
    "new",
    "contacted",
    "qualified",
    "closed",
] as const;

export type SponsorEnquiryStatus =
    (typeof sponsorStatuses)[number];

export type DemoRequestStatus =
    (typeof demoStatuses)[number];

export type CommercialEnquiryStatus =
    | SponsorEnquiryStatus
    | DemoRequestStatus;

export type EnquiryType =
    | "sponsorship"
    | "demo";

export type EnquiryFilter =
    | "all"
    | EnquiryType;

export type SponsorEnquiryRow = {
    id: string;
    created_at: string;
    competition_id: string | null;
    company_name: string;
    contact_name: string;
    email: string;
    phone: string | null;
    sponsorship_interest: string | null;
    estimated_budget: string | null;
    message: string;
    status: SponsorEnquiryStatus;
    internal_notes: string | null;
};

export type DemoRequestRow = {
    id: string;
    created_at: string;
    organisation: string;
    contact_name: string;
    email: string;
    phone: string | null;
    competition_type: string;
    number_of_teams: number | null;
    message: string;
    status: DemoRequestStatus;
    internal_notes: string | null;
};

export type CommercialEnquiry = {
    id: string;
    type: EnquiryType;
    createdAt: string;
    organisation: string;
    contactName: string;
    email: string;
    phone: string | null;
    message: string;
    status: CommercialEnquiryStatus;
    internalNotes: string | null;
    sponsorshipInterest: string | null;
    estimatedBudget: string | null;
    competitionType: string | null;
    numberOfTeams: number | null;
    competitionId: string | null;
};

export type EnquiryStats = {
    all: number;
    new: number;
    sponsorship: number;
    demos: number;
};

export function mapSponsorEnquiry(
    sponsor: SponsorEnquiryRow,
): CommercialEnquiry {
    return {
        id: sponsor.id,
        type: "sponsorship",
        createdAt: sponsor.created_at,
        organisation: sponsor.company_name,
        contactName: sponsor.contact_name,
        email: sponsor.email,
        phone: sponsor.phone,
        message: sponsor.message,
        status: sponsor.status,
        internalNotes: sponsor.internal_notes,
        sponsorshipInterest:
        sponsor.sponsorship_interest,
        estimatedBudget:
        sponsor.estimated_budget,
        competitionType: null,
        numberOfTeams: null,
        competitionId:
        sponsor.competition_id,
    };
}

export function mapDemoRequest(
    demo: DemoRequestRow,
): CommercialEnquiry {
    return {
        id: demo.id,
        type: "demo",
        createdAt: demo.created_at,
        organisation: demo.organisation,
        contactName: demo.contact_name,
        email: demo.email,
        phone: demo.phone,
        message: demo.message,
        status: demo.status,
        internalNotes: demo.internal_notes,
        sponsorshipInterest: null,
        estimatedBudget: null,
        competitionType:
        demo.competition_type,
        numberOfTeams:
        demo.number_of_teams,
        competitionId: null,
    };
}

export function mergeEnquiries(
    sponsorEnquiries: CommercialEnquiry[],
    demoRequests: CommercialEnquiry[],
) {
    return [
        ...sponsorEnquiries,
        ...demoRequests,
    ].sort(
        (first, second) =>
            new Date(
                second.createdAt,
            ).getTime() -
            new Date(
                first.createdAt,
            ).getTime(),
    );
}

export function getEnquiryStats(
    enquiries: CommercialEnquiry[],
): EnquiryStats {
    return {
        all: enquiries.length,
        new: enquiries.filter(
            (enquiry) =>
                enquiry.status === "new",
        ).length,
        sponsorship:
        enquiries.filter(
            (enquiry) =>
                enquiry.type ===
                "sponsorship",
        ).length,
        demos: enquiries.filter(
            (enquiry) =>
                enquiry.type === "demo",
        ).length,
    };
}

export function formatStatus(
    status: CommercialEnquiryStatus,
) {
    return status
        .split("_")
        .map(
            (word) =>
                word.charAt(0).toUpperCase() +
                word.slice(1),
        )
        .join(" ");
}

export function formatDate(
    value: string,
) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleString(
        "en-GB",
        {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        },
    );
}

export function formatEnquiryType(
    type: EnquiryType,
) {
    return type === "sponsorship"
        ? "Sponsorship"
        : "Demo Request";
}

export function formatCompetitionType(
    value: string | null,
) {
    if (!value) {
        return "Not specified";
    }

    return value
        .split("_")
        .map(
            (word) =>
                word.charAt(0).toUpperCase() +
                word.slice(1),
        )
        .join(" ");
}

export function getStatusOptions(
    enquiry: CommercialEnquiry,
): readonly CommercialEnquiryStatus[] {
    return enquiry.type ===
    "sponsorship"
        ? sponsorStatuses
        : demoStatuses;
}

export function isStatusAllowed(
    enquiry: CommercialEnquiry,
    status: CommercialEnquiryStatus,
) {
    return getStatusOptions(
        enquiry,
    ).some(
        (option) =>
            option === status,
    );
}

export function getSourceTable(
    enquiry: CommercialEnquiry,
) {
    return enquiry.type ===
    "sponsorship"
        ? "sponsor_enquiries"
        : "demo_requests";
}

export function createEmailSubject(
    enquiry: CommercialEnquiry,
) {
    return enquiry.type ===
    "sponsorship"
        ? "TournamentHQ Partnership Enquiry"
        : "TournamentHQ Platform Demo";
}

export function getStatusBadgeClasses(
    status: CommercialEnquiryStatus,
) {
    switch (status) {
        case "new":
            return "border-sky-700/60 bg-sky-500/10 text-sky-300";
        case "contacted":
            return "border-amber-700/60 bg-amber-500/10 text-amber-300";
        case "proposal_sent":
            return "border-violet-700/60 bg-violet-500/10 text-violet-300";
        case "negotiating":
            return "border-orange-700/60 bg-orange-500/10 text-orange-300";
        case "qualified":
            return "border-cyan-700/60 bg-cyan-500/10 text-cyan-300";
        case "secured":
            return "border-emerald-700/60 bg-emerald-500/10 text-emerald-300";
        case "closed":
            return "border-slate-700 bg-slate-800 text-slate-300";
        default:
            return "border-slate-700 bg-slate-800 text-slate-300";
    }
}

export function truncateMessage(
    value: string,
    maximumLength = 180,
) {
    const normalised = value.trim();

    if (
        normalised.length <=
        maximumLength
    ) {
        return normalised;
    }

    return `${normalised.slice(
        0,
        maximumLength,
    ).trimEnd()}…`;
}