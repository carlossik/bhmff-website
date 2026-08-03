import {
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    Calendar,
    Eye,
    Film,
    Save,
    X,
} from "lucide-react";

import {
    mediaCategories,
    mediaStatuses,
} from "./mediaHelpers";
import type { MediaFormState } from "./mediaValidation";

type MediaModalProps = {
    open: boolean;
    mode: "create" | "edit";
    values: MediaFormState;
    organisationName: string;
    competitionName: string;
    saving: boolean;
    message?: string | null;
    errorMessage?: string | null;
    onChange: <
        Key extends keyof MediaFormState,
    >(
        key: Key,
        value: MediaFormState[Key],
    ) => void;
    onTitleChange: (title: string) => void;
    onYouTubeUrlChange: (
        youtubeUrl: string,
    ) => void;
    onSave: () => void;
    onCancel: () => void;
};

const fieldClassName =
    "mt-2 w-full rounded-xl border border-lime-900/60 bg-[#071006] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-lime-400";

const labelClassName =
    "block text-sm font-bold text-slate-200";

export default function MediaModal({
                                       open,
                                       mode,
                                       values,
                                       organisationName,
                                       competitionName,
                                       saving,
                                       message,
                                       errorMessage,
                                       onChange,
                                       onTitleChange,
                                       onYouTubeUrlChange,
                                       onSave,
                                       onCancel,
                                   }: MediaModalProps) {
    const currentYear =
        new Date().getFullYear();

    const years = useMemo(
        () =>
            Array.from(
                { length: 15 },
                (_, index) =>
                    currentYear - 2 + index,
            ),
        [currentYear],
    );

    const [day, setDay] =
        useState("");
    const [month, setMonth] =
        useState("");
    const [year, setYear] =
        useState("");
    const [time, setTime] =
        useState("12:00");
    const [
        showPreview,
        setShowPreview,
    ] = useState(false);

    useEffect(() => {
        if (!open) {
            setShowPreview(false);
            return;
        }

        setShowPreview(false);

        const [datePart, timePart] =
            values.publishedAt.split("T");

        if (datePart) {
            const [
                storedYear,
                storedMonth,
                storedDay,
            ] = datePart.split("-");

            setYear(storedYear ?? "");
            setMonth(storedMonth ?? "");
            setDay(storedDay ?? "");
        } else {
            setYear("");
            setMonth("");
            setDay("");
        }

        setTime(
            timePart?.slice(0, 5) ||
            "12:00",
        );
    }, [
        open,
        values.publishedAt,
    ]);

    function updatePublishedAt(
        nextDay: string,
        nextMonth: string,
        nextYear: string,
        nextTime: string,
    ) {
        if (
            !nextDay ||
            !nextMonth ||
            !nextYear
        ) {
            onChange("publishedAt", "");
            return;
        }

        const candidate =
            `${nextYear}-${nextMonth}-${nextDay}T${nextTime || "12:00"}`;

        const candidateDate =
            new Date(candidate);

        const isValid =
            !Number.isNaN(
                candidateDate.getTime(),
            ) &&
            candidateDate.getFullYear() ===
            Number(nextYear) &&
            candidateDate.getMonth() + 1 ===
            Number(nextMonth) &&
            candidateDate.getDate() ===
            Number(nextDay);

        onChange(
            "publishedAt",
            isValid ? candidate : "",
        );
    }

    if (!open) {
        return null;
    }

    if (showPreview) {
        return (
            <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#071006]">
                <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-lime-900/50 bg-[#10190f]/95 px-5 py-4 backdrop-blur sm:px-8">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-400">
                            Preview Mode — Not Public
                        </p>

                        <h2 className="mt-1 text-xl font-black text-white">
                            Media Preview
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setShowPreview(false)
                        }
                        className="rounded-xl border border-lime-900/70 px-5 py-2.5 font-bold text-white transition hover:border-lime-400"
                    >
                        Back to editor
                    </button>
                </header>

                <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
                    <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-lime-400/10 px-3 py-1 text-xs font-bold text-lime-300">
                            {values.category}
                        </span>

                        <span className="rounded-full bg-sky-400/10 px-3 py-1 text-xs font-bold capitalize text-sky-300">
                            {values.status}
                        </span>

                        {values.featured && (
                            <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">
                                Featured
                            </span>
                        )}
                    </div>

                    <h1 className="mt-6 text-4xl font-black text-white sm:text-5xl">
                        {values.title ||
                            "Untitled media"}
                    </h1>

                    {values.embedUrl ? (
                        <div className="mt-8 overflow-hidden rounded-3xl border border-lime-900/50 bg-black">
                            <iframe
                                src={
                                    values.embedUrl
                                }
                                title={
                                    values.title ||
                                    "Media preview"
                                }
                                className="aspect-video w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    ) : values.thumbnailUrl ? (
                        <img
                            src={
                                values.thumbnailUrl
                            }
                            alt={
                                values.thumbnailAlt ||
                                values.title ||
                                "Media thumbnail"
                            }
                            className="mt-8 max-h-[520px] w-full rounded-3xl object-cover"
                        />
                    ) : (
                        <div className="mt-8 flex aspect-video items-center justify-center rounded-3xl border border-dashed border-lime-900/60 bg-[#0b150a] text-slate-500">
                            No preview available
                        </div>
                    )}

                    <p className="mt-8 text-lg leading-8 text-slate-300">
                        {values.description ||
                            "No description provided."}
                    </p>
                </main>
            </div>
        );
    }

    const modalTitle =
        mode === "create"
            ? "Add Media"
            : "Edit Media";

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget &&
                    !saving
                ) {
                    onCancel();
                }
            }}
        >
            <section
                className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-lime-900/50 bg-[#10190f] shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="media-modal-title"
            >
                <header className="flex items-start justify-between gap-4 border-b border-lime-900/50 px-5 py-5 sm:px-8">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-400">
                            Content Management
                        </p>

                        <h2
                            id="media-modal-title"
                            className="mt-1 text-2xl font-black text-white"
                        >
                            {modalTitle}
                        </h2>

                        <p className="mt-2 text-sm text-slate-400">
                            {organisationName} ·{" "}
                            {competitionName}
                        </p>
                    </div>

                    <button
                        type="button"
                        disabled={saving}
                        onClick={onCancel}
                        className="rounded-xl border border-lime-900/60 p-2 text-slate-300 transition hover:border-lime-400 hover:text-white disabled:opacity-50"
                        aria-label="Close media form"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="overflow-y-auto px-5 py-6 sm:px-8">
                    {message && (
                        <p className="mb-5 rounded-xl border border-emerald-700/50 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                            {message}
                        </p>
                    )}

                    {errorMessage && (
                        <p className="mb-5 rounded-xl border border-red-800/60 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                            {errorMessage}
                        </p>
                    )}

                    <div className="grid gap-6 lg:grid-cols-2">
                        <label className={labelClassName}>
                            Media title
                            <input
                                value={values.title}
                                onChange={(event) =>
                                    onTitleChange(
                                        event.target.value,
                                    )
                                }
                                className={fieldClassName}
                                placeholder="Enter media title"
                                autoFocus
                            />
                        </label>

                        <label className={labelClassName}>
                            URL slug
                            <input
                                value={values.slug}
                                onChange={(event) =>
                                    onChange(
                                        "slug",
                                        event.target.value,
                                    )
                                }
                                className={fieldClassName}
                                placeholder="media-url-slug"
                            />
                        </label>

                        <label className={labelClassName}>
                            Category
                            <select
                                value={values.category}
                                onChange={(event) =>
                                    onChange(
                                        "category",
                                        event.target
                                            .value as MediaFormState["category"],
                                    )
                                }
                                className={fieldClassName}
                            >
                                {mediaCategories.map(
                                    (category) => (
                                        <option
                                            key={category}
                                            value={category}
                                        >
                                            {category}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>

                        <label className={labelClassName}>
                            Status
                            <select
                                value={values.status}
                                onChange={(event) =>
                                    onChange(
                                        "status",
                                        event.target
                                            .value as MediaFormState["status"],
                                    )
                                }
                                className={fieldClassName}
                            >
                                {mediaStatuses.map(
                                    (status) => (
                                        <option
                                            key={status}
                                            value={status}
                                        >
                                            {status}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>

                        <div className="lg:col-span-2">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                                <Calendar className="h-4 w-4 text-lime-400" />
                                Publication date and time
                            </div>

                            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <select
                                    className={fieldClassName.replace(
                                        "mt-2 ",
                                        "",
                                    )}
                                    value={day}
                                    onChange={(event) => {
                                        const nextDay =
                                            event.target.value;

                                        setDay(nextDay);

                                        updatePublishedAt(
                                            nextDay,
                                            month,
                                            year,
                                            time,
                                        );
                                    }}
                                >
                                    <option value="">
                                        Day
                                    </option>

                                    {Array.from(
                                        {
                                            length: 31,
                                        },
                                        (_, index) =>
                                            String(
                                                index +
                                                1,
                                            ).padStart(
                                                2,
                                                "0",
                                            ),
                                    ).map(
                                        (value) => (
                                            <option
                                                key={value}
                                                value={value}
                                            >
                                                {value}
                                            </option>
                                        ),
                                    )}
                                </select>

                                <select
                                    className={fieldClassName.replace(
                                        "mt-2 ",
                                        "",
                                    )}
                                    value={month}
                                    onChange={(event) => {
                                        const nextMonth =
                                            event.target.value;

                                        setMonth(
                                            nextMonth,
                                        );

                                        updatePublishedAt(
                                            day,
                                            nextMonth,
                                            year,
                                            time,
                                        );
                                    }}
                                >
                                    <option value="">
                                        Month
                                    </option>

                                    {[
                                        ["01", "January"],
                                        ["02", "February"],
                                        ["03", "March"],
                                        ["04", "April"],
                                        ["05", "May"],
                                        ["06", "June"],
                                        ["07", "July"],
                                        ["08", "August"],
                                        ["09", "September"],
                                        ["10", "October"],
                                        ["11", "November"],
                                        ["12", "December"],
                                    ].map(
                                        ([
                                             value,
                                             label,
                                         ]) => (
                                            <option
                                                key={value}
                                                value={value}
                                            >
                                                {label}
                                            </option>
                                        ),
                                    )}
                                </select>

                                <select
                                    className={fieldClassName.replace(
                                        "mt-2 ",
                                        "",
                                    )}
                                    value={year}
                                    onChange={(event) => {
                                        const nextYear =
                                            event.target.value;

                                        setYear(
                                            nextYear,
                                        );

                                        updatePublishedAt(
                                            day,
                                            month,
                                            nextYear,
                                            time,
                                        );
                                    }}
                                >
                                    <option value="">
                                        Year
                                    </option>

                                    {years.map(
                                        (value) => (
                                            <option
                                                key={value}
                                                value={String(
                                                    value,
                                                )}
                                            >
                                                {value}
                                            </option>
                                        ),
                                    )}
                                </select>

                                <input
                                    type="time"
                                    className={fieldClassName.replace(
                                        "mt-2 ",
                                        "",
                                    )}
                                    value={time}
                                    onChange={(event) => {
                                        const nextTime =
                                            event.target.value;

                                        setTime(
                                            nextTime,
                                        );

                                        updatePublishedAt(
                                            day,
                                            month,
                                            year,
                                            nextTime,
                                        );
                                    }}
                                />
                            </div>
                        </div>

                        <label className="flex items-center gap-3 rounded-xl border border-lime-900/50 bg-[#071006] px-4 py-4 text-sm font-bold text-slate-200 lg:col-span-2">
                            <input
                                type="checkbox"
                                checked={
                                    values.featured
                                }
                                onChange={(event) =>
                                    onChange(
                                        "featured",
                                        event.target
                                            .checked,
                                    )
                                }
                                className="h-5 w-5 accent-lime-400"
                            />

                            Featured media
                        </label>

                        <label className={`${labelClassName} lg:col-span-2`}>
                            Description
                            <textarea
                                value={
                                    values.description
                                }
                                onChange={(event) =>
                                    onChange(
                                        "description",
                                        event.target.value,
                                    )
                                }
                                className={`${fieldClassName} min-h-32 resize-y`}
                                placeholder="Describe this media item"
                            />
                        </label>

                        <label className={`${labelClassName} lg:col-span-2`}>
                            YouTube URL
                            <input
                                type="url"
                                value={
                                    values.youtubeUrl
                                }
                                onChange={(event) =>
                                    onYouTubeUrlChange(
                                        event.target.value,
                                    )
                                }
                                className={fieldClassName}
                                placeholder="https://www.youtube.com/watch?v=..."
                            />
                        </label>

                        <label className={labelClassName}>
                            Embed URL
                            <input
                                type="url"
                                value={
                                    values.embedUrl
                                }
                                onChange={(event) =>
                                    onChange(
                                        "embedUrl",
                                        event.target.value,
                                    )
                                }
                                className={fieldClassName}
                                placeholder="Generated automatically"
                            />
                        </label>

                        <label className={labelClassName}>
                            Thumbnail URL
                            <input
                                type="url"
                                value={
                                    values.thumbnailUrl
                                }
                                onChange={(event) =>
                                    onChange(
                                        "thumbnailUrl",
                                        event.target.value,
                                    )
                                }
                                className={fieldClassName}
                                placeholder="Generated automatically"
                            />
                        </label>

                        <label className={`${labelClassName} lg:col-span-2`}>
                            Thumbnail alt text
                            <input
                                value={
                                    values.thumbnailAlt
                                }
                                onChange={(event) =>
                                    onChange(
                                        "thumbnailAlt",
                                        event.target.value,
                                    )
                                }
                                className={fieldClassName}
                                placeholder="Describe the thumbnail"
                            />
                        </label>

                        {(values.embedUrl ||
                            values.thumbnailUrl) && (
                            <div className="overflow-hidden rounded-2xl border border-lime-900/50 bg-black lg:col-span-2">
                                {values.embedUrl ? (
                                    <iframe
                                        src={
                                            values.embedUrl
                                        }
                                        title={
                                            values.title ||
                                            "Media preview"
                                        }
                                        className="aspect-video w-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : (
                                    <img
                                        src={
                                            values.thumbnailUrl
                                        }
                                        alt={
                                            values.thumbnailAlt ||
                                            values.title ||
                                            "Media thumbnail"
                                        }
                                        className="max-h-[420px] w-full object-cover"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-lime-900/50 bg-[#10190f] px-5 py-4 sm:flex-row sm:justify-end sm:px-8">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                            setShowPreview(true)
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-800/70 px-6 py-3 font-bold text-sky-200 transition hover:border-sky-400 disabled:opacity-50"
                    >
                        <Eye className="h-5 w-5" />
                        Preview
                    </button>

                    <button
                        type="button"
                        disabled={saving}
                        onClick={onCancel}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-lime-900/70 px-6 py-3 font-bold text-white transition hover:border-lime-400 disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                        Cancel
                    </button>

                    <button
                        type="button"
                        disabled={saving}
                        onClick={onSave}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-6 py-3 font-black text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Save className="h-5 w-5" />
                        {saving
                            ? "Saving..."
                            : mode === "edit"
                                ? "Update Media"
                                : "Save Media"}
                    </button>
                </footer>
            </section>
        </div>
    );
}