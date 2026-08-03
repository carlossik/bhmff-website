import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { supabase } from "../../../lib/supabaseClient";
import { useOrganisation } from "../../../context/OrganisationContext";
import { ConfirmDialog } from "../../common/ConfirmDialog";

import EnquiriesTable from "./EnquiriesTable";
import EnquiryModal from "./EnquiryModal";

import {
    formatEnquiryType,
    formatStatus,
    getEnquiryStats,
    getSourceTable,
    isStatusAllowed,
    mapDemoRequest,
    mapSponsorEnquiry,
    mergeEnquiries,
    type CommercialEnquiry,
    type CommercialEnquiryStatus,
    type DemoRequestRow,
    type EnquiryFilter,
    type SponsorEnquiryRow,
} from "./enquiryHelpers";

import {
    normaliseInternalNotes,
    validateInternalNotes,
    validateStatusUpdate,
} from "./enquiryValidation";

export function EnquiriesManager() {
    const { currentOrganisation } =
        useOrganisation();

    const organisationId =
        currentOrganisation?.id ?? null;

    const [enquiries, setEnquiries] =
        useState<CommercialEnquiry[]>([]);

    const [
        selectedEnquiry,
        setSelectedEnquiry,
    ] =
        useState<CommercialEnquiry | null>(
            null,
        );

    const [
        enquiryToDelete,
        setEnquiryToDelete,
    ] =
        useState<CommercialEnquiry | null>(
            null,
        );

    const [
        activeFilter,
        setActiveFilter,
    ] =
        useState<EnquiryFilter>("all");

    const [
        internalNotes,
        setInternalNotes,
    ] = useState("");

    const [loading, setLoading] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    const [message, setMessage] =
        useState<string | null>(null);

    const [
        errorMessage,
        setErrorMessage,
    ] =
        useState<string | null>(null);

    const loadEnquiries =
        useCallback(async () => {
            if (!organisationId) {
                setEnquiries([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            setErrorMessage(null);

            try {
                const [
                    sponsorResponse,
                    demoResponse,
                ] = await Promise.all([
                    supabase
                        .from(
                            "sponsor_enquiries",
                        )
                        .select(
                            `
                                id,
                                created_at,
                                organisation_id,
                                competition_id,
                                company_name,
                                contact_name,
                                email,
                                phone,
                                sponsorship_interest,
                                estimated_budget,
                                message,
                                status,
                                internal_notes
                            `,
                        )
                        .eq(
                            "organisation_id",
                            currentOrganisation.id,
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false,
                            },
                        ),

                    supabase
                        .from(
                            "demo_requests",
                        )
                        .select(
                            `
                                id,
                                created_at,
                                organisation_id,
                                organisation,
                                contact_name,
                                email,
                                phone,
                                competition_type,
                                number_of_teams,
                                message,
                                status,
                                internal_notes
                            `,
                        )
                        .eq(
                            "organisation_id",
                            currentOrganisation.id,
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false,
                            },
                        ),
                ]);

                const errors: string[] =
                    [];

                if (
                    sponsorResponse.error
                ) {
                    console.error(
                        "Failed to load sponsorship enquiries:",
                        sponsorResponse.error,
                    );

                    errors.push(
                        "sponsorship enquiries",
                    );
                }

                if (
                    demoResponse.error
                ) {
                    console.error(
                        "Failed to load demo requests:",
                        demoResponse.error,
                    );

                    errors.push(
                        "demo requests",
                    );
                }

                const sponsorEnquiries =
                    (
                        sponsorResponse.data ??
                        []
                    ).map((row) =>
                        mapSponsorEnquiry(
                            row as SponsorEnquiryRow,
                        ),
                    );

                const demoRequests =
                    (
                        demoResponse.data ??
                        []
                    ).map((row) =>
                        mapDemoRequest(
                            row as DemoRequestRow,
                        ),
                    );

                setEnquiries(
                    mergeEnquiries(
                        sponsorEnquiries,
                        demoRequests,
                    ),
                );

                if (errors.length) {
                    setErrorMessage(
                        `Unable to load ${errors.join(
                            " and ",
                        )}.`,
                    );
                }
            } catch (error) {
                console.error(
                    "Unexpected error while loading enquiries:",
                    error,
                );

                setEnquiries([]);
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Unable to load enquiries.",
                );
            } finally {
                setLoading(false);
            }
        }, [organisationId]);

    useEffect(() => {
        setEnquiries([]);
        setSelectedEnquiry(null);
        setEnquiryToDelete(null);
        setInternalNotes("");
        setActiveFilter("all");
        setMessage(null);
        setErrorMessage(null);

        void loadEnquiries();
    }, [
        loadEnquiries,
        organisationId,
    ]);

    const filteredEnquiries =
        useMemo(
            () =>
                activeFilter === "all"
                    ? enquiries
                    : enquiries.filter(
                        (enquiry) =>
                            enquiry.type ===
                            activeFilter,
                    ),
            [
                activeFilter,
                enquiries,
            ],
        );

    const stats = useMemo(
        () =>
            getEnquiryStats(
                enquiries,
            ),
        [enquiries],
    );

    const openEnquiry =
        useCallback(
            (
                enquiry: CommercialEnquiry,
            ) => {
                setSelectedEnquiry(
                    enquiry,
                );
                setInternalNotes(
                    enquiry.internalNotes ??
                    "",
                );
                setMessage(null);
                setErrorMessage(null);
            },
            [],
        );

    const closeEnquiry =
        useCallback(() => {
            if (saving) {
                return;
            }

            setSelectedEnquiry(null);
            setInternalNotes("");
            setMessage(null);
            setErrorMessage(null);
        }, [saving]);

    async function updateStatus(
        enquiry: CommercialEnquiry,
        status: CommercialEnquiryStatus,
    ) {
        const validationError =
            validateStatusUpdate(
                enquiry,
                status,
            );

        if (validationError) {
            setErrorMessage(
                validationError,
            );
            setMessage(null);
            return;
        }

        if (
            !isStatusAllowed(
                enquiry,
                status,
            )
        ) {
            setErrorMessage(
                "The selected status is not valid for this enquiry type.",
            );
            setMessage(null);
            return;
        }

        setSaving(true);
        setMessage(null);
        setErrorMessage(null);

        try {
            const table =
                getSourceTable(
                    enquiry,
                );

            const { error } =
                await supabase
                    .from(table)
                    .update({ status })
                    .eq(
                        "id",
                        enquiry.id,
                    );

            if (error) {
                console.error(
                    "Failed to update enquiry status:",
                    error,
                );

                setErrorMessage(
                    "Unable to update the enquiry status.",
                );
                return;
            }

            setSelectedEnquiry(
                (current) =>
                    current &&
                    current.id ===
                    enquiry.id &&
                    current.type ===
                    enquiry.type
                        ? {
                            ...current,
                            status,
                        }
                        : current,
            );

            setMessage(
                `Enquiry status changed to ${formatStatus(
                    status,
                )}.`,
            );

            await loadEnquiries();
        } finally {
            setSaving(false);
        }
    }

    async function saveNotes() {
        const validationError =
            validateInternalNotes(
                selectedEnquiry,
                internalNotes,
            );

        if (validationError) {
            setErrorMessage(
                validationError,
            );
            setMessage(null);
            return;
        }

        if (!selectedEnquiry) {
            return;
        }

        setSaving(true);
        setMessage(null);
        setErrorMessage(null);

        try {
            const notes =
                normaliseInternalNotes(
                    internalNotes,
                );

            const table =
                getSourceTable(
                    selectedEnquiry,
                );

            const { error } =
                await supabase
                    .from(table)
                    .update({
                        internal_notes:
                        notes,
                    })
                    .eq(
                        "id",
                        selectedEnquiry.id,
                    );

            if (error) {
                console.error(
                    "Failed to save enquiry notes:",
                    error,
                );

                setErrorMessage(
                    "Unable to save internal notes.",
                );
                return;
            }

            setSelectedEnquiry(
                (current) =>
                    current
                        ? {
                            ...current,
                            internalNotes:
                            notes,
                        }
                        : current,
            );

            setMessage(
                "Internal notes saved successfully.",
            );

            await loadEnquiries();
        } finally {
            setSaving(false);
        }
    }

    async function deleteEnquiry() {
        if (
            !enquiryToDelete ||
            saving
        ) {
            return;
        }

        const enquiry =
            enquiryToDelete;

        setSaving(true);
        setMessage(null);
        setErrorMessage(null);

        try {
            const table =
                getSourceTable(
                    enquiry,
                );

            const { error } =
                await supabase
                    .from(table)
                    .delete()
                    .eq(
                        "id",
                        enquiry.id,
                    );

            if (error) {
                console.error(
                    "Failed to delete enquiry:",
                    error,
                );

                setErrorMessage(
                    "Unable to delete the enquiry.",
                );
                return;
            }

            if (
                selectedEnquiry?.id ===
                enquiry.id &&
                selectedEnquiry.type ===
                enquiry.type
            ) {
                setSelectedEnquiry(
                    null,
                );
                setInternalNotes("");
            }

            setEnquiryToDelete(null);
            setMessage(
                "Enquiry deleted successfully.",
            );

            await loadEnquiries();
        } finally {
            setSaving(false);
        }
    }

    if (!currentOrganisation) {
        return (
            <div className="rounded-2xl border border-lime-900/50 bg-[#0b150a] p-8 text-center">
                <h3 className="text-xl font-bold text-white">
                    No organisation selected
                </h3>

                <p className="mt-2 text-slate-400">
                    Select an organisation before managing enquiries.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="rounded-2xl border border-lime-900/50 bg-[#0b150a] p-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-400">
                    Commercial Management
                </p>

                <h3 className="mt-1 text-3xl font-black text-white">
                    Manage Enquiries
                </h3>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Review sponsorship opportunities and platform demonstration requests for{" "}
                    <strong className="text-white">
                        {
                            currentOrganisation.name
                        }
                    </strong>{" "}
                    from one central workspace.
                </p>
            </header>

            {message &&
                !selectedEnquiry && (
                    <p className="rounded-xl border border-emerald-700/50 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                        {message}
                    </p>
                )}

            {errorMessage &&
                !selectedEnquiry && (
                    <p className="rounded-xl border border-red-800/60 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                        {
                            errorMessage
                        }
                    </p>
                )}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    {
                        label: "All",
                        value:
                        stats.all,
                    },
                    {
                        label: "New",
                        value:
                        stats.new,
                    },
                    {
                        label:
                            "Sponsorship",
                        value:
                        stats.sponsorship,
                    },
                    {
                        label:
                            "Demo Requests",
                        value:
                        stats.demos,
                    },
                ].map((stat) => (
                    <article
                        key={
                            stat.label
                        }
                        className="rounded-2xl border border-lime-900/50 bg-[#0b150a] p-5"
                    >
                        <strong className="block text-3xl font-black text-white">
                            {
                                stat.value
                            }
                        </strong>

                        <span className="mt-1 block text-sm font-semibold text-slate-400">
                            {
                                stat.label
                            }
                        </span>
                    </article>
                ))}
            </section>

            <EnquiriesTable
                enquiries={
                    filteredEnquiries
                }
                loading={loading}
                activeFilter={
                    activeFilter
                }
                organisationName={
                    currentOrganisation.name
                }
                saving={saving}
                onFilterChange={
                    setActiveFilter
                }
                onView={
                    openEnquiry
                }
                onMarkContacted={(
                    enquiry,
                ) =>
                    void updateStatus(
                        enquiry,
                        "contacted",
                    )
                }
                onDelete={
                    setEnquiryToDelete
                }
            />

            <EnquiryModal
                open={
                    Boolean(
                        selectedEnquiry,
                    )
                }
                enquiry={
                    selectedEnquiry
                }
                internalNotes={
                    internalNotes
                }
                saving={saving}
                message={message}
                errorMessage={
                    errorMessage
                }
                onNotesChange={
                    setInternalNotes
                }
                onStatusChange={(
                    status,
                ) => {
                    if (
                        selectedEnquiry
                    ) {
                        void updateStatus(
                            selectedEnquiry,
                            status,
                        );
                    }
                }}
                onSaveNotes={() =>
                    void saveNotes()
                }
                onDelete={
                    setEnquiryToDelete
                }
                onClose={
                    closeEnquiry
                }
            />

            {enquiryToDelete && (
                <ConfirmDialog
                    title="Delete Enquiry"
                    message={`Are you sure you want to delete the ${formatEnquiryType(
                        enquiryToDelete.type,
                    ).toLowerCase()} from ${enquiryToDelete.organisation}? This action cannot be undone.`}
                    confirmText={
                        saving
                            ? "Deleting..."
                            : "Delete"
                    }
                    cancelText="Cancel"
                    onCancel={() => {
                        if (!saving) {
                            setEnquiryToDelete(
                                null,
                            );
                        }
                    }}
                    onConfirm={() => {
                        if (!saving) {
                            void deleteEnquiry();
                        }
                    }}
                />
            )}
        </div>
    );
}