import type {
    CommercialEnquiry,
    EnquiryFilter,
} from "./enquiryHelpers";

import {
    formatCompetitionType,
    formatDate,
    formatEnquiryType,
    formatStatus,
    getStatusBadgeClasses,
    truncateMessage,
} from "./enquiryHelpers";

type EnquiriesTableProps = {
    enquiries: CommercialEnquiry[];
    loading: boolean;
    activeFilter: EnquiryFilter;
    organisationName: string;
    saving: boolean;
    onFilterChange: (
        filter: EnquiryFilter,
    ) => void;
    onView: (
        enquiry: CommercialEnquiry,
    ) => void;
    onMarkContacted: (
        enquiry: CommercialEnquiry,
    ) => void;
    onDelete: (
        enquiry: CommercialEnquiry,
    ) => void;
};

const filters: Array<{
    value: EnquiryFilter;
    label: string;
}> = [
    {
        value: "all",
        label: "All",
    },
    {
        value: "sponsorship",
        label: "Sponsorship",
    },
    {
        value: "demo",
        label: "Demo Requests",
    },
];

export default function EnquiriesTable({
                                           enquiries,
                                           loading,
                                           activeFilter,
                                           organisationName,
                                           saving,
                                           onFilterChange,
                                           onView,
                                           onMarkContacted,
                                           onDelete,
                                       }: EnquiriesTableProps) {
    if (loading) {
        return (
            <div className="rounded-2xl border border-lime-900/50 bg-[#0b150a] p-10 text-center">
                <p className="text-sm font-semibold text-slate-400">
                    Loading enquiries...
                </p>
            </div>
        );
    }

    return (
        <section className="space-y-4">
            <div className="flex flex-wrap gap-2 rounded-2xl border border-lime-900/50 bg-[#0b150a] p-3">
                {filters.map(
                    (filter) => (
                        <button
                            key={
                                filter.value
                            }
                            type="button"
                            onClick={() =>
                                onFilterChange(
                                    filter.value,
                                )
                            }
                            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                                activeFilter ===
                                filter.value
                                    ? "bg-lime-400 text-black"
                                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                            }`}
                        >
                            {filter.label}
                        </button>
                    ),
                )}
            </div>

            {enquiries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-lime-900/60 bg-[#0b150a] p-12 text-center">
                    <h4 className="text-xl font-black text-white">
                        No enquiries found
                    </h4>

                    <p className="mt-2 text-sm text-slate-400">
                        New sponsorship and demo requests associated with{" "}
                        <strong className="text-slate-200">
                            {organisationName}
                        </strong>{" "}
                        will appear here.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                    {enquiries.map(
                        (enquiry) => (
                            <article
                                key={`${enquiry.type}-${enquiry.id}`}
                                className="rounded-2xl border border-lime-900/50 bg-[#0b150a] p-5 shadow-sm transition hover:border-lime-700/70"
                            >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="flex flex-wrap gap-2">
                                            <span
                                                className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusBadgeClasses(
                                                    enquiry.status,
                                                )}`}
                                            >
                                                {formatStatus(
                                                    enquiry.status,
                                                )}
                                            </span>

                                            <span className="rounded-full border border-lime-800/70 bg-lime-400/10 px-3 py-1 text-xs font-bold text-lime-300">
                                                {formatEnquiryType(
                                                    enquiry.type,
                                                )}
                                            </span>
                                        </div>

                                        <h4 className="mt-3 text-xl font-black text-white">
                                            {
                                                enquiry.organisation
                                            }
                                        </h4>
                                    </div>

                                    <time className="text-xs font-semibold text-slate-500">
                                        {formatDate(
                                            enquiry.createdAt,
                                        )}
                                    </time>
                                </div>

                                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                                    <div>
                                        <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            Contact
                                        </dt>
                                        <dd className="mt-1 font-bold text-white">
                                            {
                                                enquiry.contactName
                                            }
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            Email
                                        </dt>
                                        <dd className="mt-1 break-all">
                                            <a
                                                className="font-semibold text-lime-300 hover:text-lime-200"
                                                href={`mailto:${enquiry.email}`}
                                            >
                                                {
                                                    enquiry.email
                                                }
                                            </a>
                                        </dd>
                                    </div>

                                    {enquiry.type ===
                                    "sponsorship" ? (
                                        <>
                                            <div>
                                                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                    Interest
                                                </dt>
                                                <dd className="mt-1 text-slate-300">
                                                    {enquiry.sponsorshipInterest ??
                                                        "Not specified"}
                                                </dd>
                                            </div>

                                            <div>
                                                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                    Budget
                                                </dt>
                                                <dd className="mt-1 text-slate-300">
                                                    {enquiry.estimatedBudget ??
                                                        "Not specified"}
                                                </dd>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                    Competition
                                                </dt>
                                                <dd className="mt-1 text-slate-300">
                                                    {formatCompetitionType(
                                                        enquiry.competitionType,
                                                    )}
                                                </dd>
                                            </div>

                                            <div>
                                                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                    Teams
                                                </dt>
                                                <dd className="mt-1 text-slate-300">
                                                    {enquiry.numberOfTeams ??
                                                        "Not specified"}
                                                </dd>
                                            </div>
                                        </>
                                    )}
                                </dl>

                                <p className="mt-5 rounded-xl border border-white/5 bg-black/20 p-4 text-sm leading-6 text-slate-300">
                                    {truncateMessage(
                                        enquiry.message,
                                    )}
                                </p>

                                <div className="mt-5 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onView(
                                                enquiry,
                                            )
                                        }
                                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-white transition hover:border-lime-500 hover:text-lime-300"
                                    >
                                        View
                                    </button>

                                    {enquiry.status !==
                                        "contacted" && (
                                            <button
                                                type="button"
                                                disabled={
                                                    saving
                                                }
                                                onClick={() =>
                                                    onMarkContacted(
                                                        enquiry,
                                                    )
                                                }
                                                className="rounded-xl border border-amber-700/60 bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-300 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Mark Contacted
                                            </button>
                                        )}

                                    <button
                                        type="button"
                                        disabled={
                                            saving
                                        }
                                        onClick={() =>
                                            onDelete(
                                                enquiry,
                                            )
                                        }
                                        className="rounded-xl border border-red-800/70 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </article>
                        ),
                    )}
                </div>
            )}
        </section>
    );
}