import { useEffect } from "react";

import type {
    CommercialEnquiry,
    CommercialEnquiryStatus,
} from "./enquiryHelpers";

import {
    createEmailSubject,
    formatCompetitionType,
    formatDate,
    formatEnquiryType,
    formatStatus,
    getStatusBadgeClasses,
    getStatusOptions,
} from "./enquiryHelpers";

import {
    MAX_INTERNAL_NOTES_LENGTH,
} from "./enquiryValidation";

type EnquiryModalProps = {
    open: boolean;
    enquiry: CommercialEnquiry | null;
    internalNotes: string;
    saving: boolean;
    message: string | null;
    errorMessage: string | null;
    onNotesChange: (
        value: string,
    ) => void;
    onStatusChange: (
        status: CommercialEnquiryStatus,
    ) => void;
    onSaveNotes: () => void;
    onDelete: (
        enquiry: CommercialEnquiry,
    ) => void;
    onClose: () => void;
};

export default function EnquiryModal({
                                         open,
                                         enquiry,
                                         internalNotes,
                                         saving,
                                         message,
                                         errorMessage,
                                         onNotesChange,
                                         onStatusChange,
                                         onSaveNotes,
                                         onDelete,
                                         onClose,
                                     }: EnquiryModalProps) {
    useEffect(() => {
        if (!open) {
            return;
        }

        function handleKeyDown(
            event: KeyboardEvent,
        ) {
            if (
                event.key === "Escape" &&
                !saving
            ) {
                onClose();
            }
        }

        document.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () =>
            document.removeEventListener(
                "keydown",
                handleKeyDown,
            );
    }, [open, onClose, saving]);

    if (!open || !enquiry) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget &&
                    !saving
                ) {
                    onClose();
                }
            }}
        >
            <section
                className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-lime-800/60 bg-[#071006] shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="enquiry-modal-title"
            >
                <header className="sticky top-0 z-10 flex flex-col gap-4 border-b border-lime-900/50 bg-[#071006]/95 p-6 backdrop-blur sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-lime-800/70 bg-lime-400/10 px-3 py-1 text-xs font-bold text-lime-300">
                                {formatEnquiryType(
                                    enquiry.type,
                                )}
                            </span>

                            <span
                                className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusBadgeClasses(
                                    enquiry.status,
                                )}`}
                            >
                                {formatStatus(
                                    enquiry.status,
                                )}
                            </span>
                        </div>

                        <h2
                            id="enquiry-modal-title"
                            className="mt-3 text-3xl font-black text-white"
                        >
                            {
                                enquiry.organisation
                            }
                        </h2>

                        <p className="mt-1 text-sm text-slate-400">
                            Submitted{" "}
                            {formatDate(
                                enquiry.createdAt,
                            )}
                        </p>
                    </div>

                    <button
                        type="button"
                        disabled={saving}
                        onClick={onClose}
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-white transition hover:border-lime-500 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Close
                    </button>
                </header>

                <div className="space-y-6 p-6">
                    {message && (
                        <p className="rounded-xl border border-emerald-700/50 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                            {message}
                        </p>
                    )}

                    {errorMessage && (
                        <p className="rounded-xl border border-red-800/60 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                            {errorMessage}
                        </p>
                    )}

                    <dl className="grid gap-4 rounded-2xl border border-white/5 bg-[#0b150a] p-5 sm:grid-cols-2 lg:grid-cols-3">
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

                        <div>
                            <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Phone
                            </dt>
                            <dd className="mt-1">
                                {enquiry.phone ? (
                                    <a
                                        className="font-semibold text-lime-300 hover:text-lime-200"
                                        href={`tel:${enquiry.phone}`}
                                    >
                                        {
                                            enquiry.phone
                                        }
                                    </a>
                                ) : (
                                    <span className="text-slate-400">
                                        Not provided
                                    </span>
                                )}
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
                                        Estimated Budget
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
                                        Competition Type
                                    </dt>
                                    <dd className="mt-1 text-slate-300">
                                        {formatCompetitionType(
                                            enquiry.competitionType,
                                        )}
                                    </dd>
                                </div>

                                <div>
                                    <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Approximate Teams
                                    </dt>
                                    <dd className="mt-1 text-slate-300">
                                        {enquiry.numberOfTeams ??
                                            "Not specified"}
                                    </dd>
                                </div>
                            </>
                        )}

                        <label className="block">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Pipeline Status
                            </span>

                            <select
                                value={
                                    enquiry.status
                                }
                                disabled={saving}
                                onChange={(event) =>
                                    onStatusChange(
                                        event
                                            .target
                                            .value as CommercialEnquiryStatus,
                                    )
                                }
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-[#071006] px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-lime-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {getStatusOptions(
                                    enquiry,
                                ).map(
                                    (status) => (
                                        <option
                                            key={
                                                status
                                            }
                                            value={
                                                status
                                            }
                                        >
                                            {formatStatus(
                                                status,
                                            )}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>
                    </dl>

                    <section className="rounded-2xl border border-white/5 bg-[#0b150a] p-5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Enquiry Message
                        </h3>

                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                            {
                                enquiry.message
                            }
                        </p>
                    </section>

                    <label className="block">
                        <span className="text-sm font-bold text-white">
                            Internal Notes
                        </span>

                        <textarea
                            value={
                                internalNotes
                            }
                            onChange={(event) =>
                                onNotesChange(
                                    event.target
                                        .value,
                                )
                            }
                            maxLength={
                                MAX_INTERNAL_NOTES_LENGTH
                            }
                            rows={7}
                            placeholder="Record calls, meetings, proposals and follow-up actions."
                            className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-[#0b150a] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-lime-400"
                        />

                        <span className="mt-1 block text-right text-xs text-slate-500">
                            {
                                internalNotes.length
                            }
                            /
                            {
                                MAX_INTERNAL_NOTES_LENGTH
                            }
                        </span>
                    </label>

                    <div className="flex flex-wrap gap-3 border-t border-lime-900/50 pt-6">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={
                                onSaveNotes
                            }
                            className="rounded-xl bg-lime-400 px-5 py-3 font-black text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving
                                ? "Saving..."
                                : "Save Notes"}
                        </button>

                        <a
                            className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-white transition hover:border-lime-500 hover:text-lime-300"
                            href={`mailto:${enquiry.email}?subject=${encodeURIComponent(
                                createEmailSubject(
                                    enquiry,
                                ),
                            )}`}
                        >
                            Email Contact
                        </a>

                        <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                                onDelete(
                                    enquiry,
                                )
                            }
                            className="rounded-xl border border-red-800/70 bg-red-500/10 px-5 py-3 font-bold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Delete Enquiry
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}