import type {
    CommercialEnquiry,
    CommercialEnquiryStatus,
} from "./enquiryHelpers";

export const MAX_INTERNAL_NOTES_LENGTH =
    5000;

export function validateStatusUpdate(
    enquiry: CommercialEnquiry | null,
    status: CommercialEnquiryStatus,
) {
    if (!enquiry) {
        return "Select an enquiry before changing its status.";
    }

    if (!status) {
        return "Select a valid enquiry status.";
    }

    return null;
}

export function validateInternalNotes(
    enquiry: CommercialEnquiry | null,
    notes: string,
) {
    if (!enquiry) {
        return "Select an enquiry before saving notes.";
    }

    if (
        notes.length >
        MAX_INTERNAL_NOTES_LENGTH
    ) {
        return `Internal notes must be ${MAX_INTERNAL_NOTES_LENGTH.toLocaleString(
            "en-GB",
        )} characters or fewer.`;
    }

    return null;
}

export function normaliseInternalNotes(
    notes: string,
) {
    const value = notes.trim();

    return value || null;
}