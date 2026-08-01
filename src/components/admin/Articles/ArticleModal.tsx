import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Eye,
    FileText,
    Image,
    Newspaper,
    Save,
    Tag,
    X,
} from "lucide-react";

import {
    TournamentHQBrand,
} from "../../common/TournamentHQBrand";

import type {
    ArticleCategory,
    ArticleStatus,
} from "../../../data/festivalData";

import type {
    ArticleFormState,
} from "./articleValidation";

const articleCategories: ArticleCategory[] = [
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
];

const articleStatuses: ArticleStatus[] = [
    "draft",
    "review",
    "scheduled",
    "published",
    "archived",
];

type ArticleModalProps = {
    open: boolean;
    mode: "create" | "edit";
    values: ArticleFormState;
    organisationName: string;
    competitionName?: string;
    sportName?: string;
    uploadingImage: boolean;
    saving: boolean;
    message?: string | null;
    errorMessage?: string | null;
    onChange: <
        Key extends keyof ArticleFormState,
    >(
        key: Key,
        value: ArticleFormState[Key],
    ) => void;
    onTitleChange: (
        value: string,
    ) => void;
    onUploadImage: (
        file: File,
    ) => Promise<void>;
    onRemoveImage: () => void;
    onSave: () => Promise<void>;
    onCancel: () => void;
};

const fieldClassName =
    "mt-2 w-full rounded-xl border border-lime-900/60 bg-[#081207] px-4 py-3 text-white outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20";

const labelClassName =
    "block text-sm font-semibold text-slate-200";

const sectionClassName =
    "rounded-2xl border border-lime-900/50 bg-[#0b150a] p-5 sm:p-6";

export default function ArticleModal({
                                         open,
                                         mode,
                                         values,
                                         organisationName,
                                         competitionName,
                                         sportName,
                                         uploadingImage,
                                         saving,
                                         message,
                                         errorMessage,
                                         onChange,
                                         onTitleChange,
                                         onUploadImage,
                                         onRemoveImage,
                                         onSave,
                                         onCancel,
                                     }: ArticleModalProps) {
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

    const modalTitle =
        mode === "create"
            ? "Create Article"
            : "Edit Article";

    if (showPreview) {
        const previewParagraphs =
            values.body
                .split(/\n\s*\n/)
                .map((paragraph) =>
                    paragraph.trim(),
                )
                .filter(Boolean);

        return (
            <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#071006]">
                <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-lime-900/50 bg-[#10190f]/95 px-5 py-4 backdrop-blur sm:px-8">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-400">
                            Preview Mode — Not Public
                        </p>

                        <h2 className="mt-1 text-xl font-black text-white">
                            Article Preview
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
                    <div className="mb-8 flex flex-wrap gap-2">
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

                    <h1 className="text-4xl font-black leading-tight text-white sm:text-6xl">
                        {values.title ||
                            "Untitled article"}
                    </h1>

                    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                        <span>
                            By{" "}
                            {values.author ||
                                "Editorial Team"}
                        </span>

                        <span>
                            {values.readTime ||
                                "3 min read"}
                        </span>

                        {values.publishedAt && (
                            <span>
                                {new Date(
                                    values.publishedAt,
                                ).toLocaleString()}
                            </span>
                        )}
                    </div>

                    {values.imageUrl && (
                        <img
                            src={values.imageUrl}
                            alt={
                                values.imageAlt ||
                                values.title ||
                                "Article hero image"
                            }
                            className="mt-8 max-h-[520px] w-full rounded-3xl object-cover"
                        />
                    )}

                    {values.summary && (
                        <p className="mt-8 text-xl font-semibold leading-8 text-lime-100">
                            {values.summary}
                        </p>
                    )}

                    {values.hero && (
                        <p className="mt-6 text-lg leading-8 text-slate-300">
                            {values.hero}
                        </p>
                    )}

                    <div className="mt-8 space-y-6 text-base leading-8 text-slate-200">
                        {previewParagraphs.length ? (
                            previewParagraphs.map(
                                (
                                    paragraph,
                                    index,
                                ) => (
                                    <p key={index}>
                                        {paragraph}
                                    </p>
                                ),
                            )
                        ) : (
                            <p className="italic text-slate-500">
                                Article body has not been entered yet.
                            </p>
                        )}
                    </div>

                    {values.tags.trim() && (
                        <div className="mt-10 flex flex-wrap gap-2 border-t border-lime-900/50 pt-6">
                            {values.tags
                                .split(",")
                                .map((tag) =>
                                    tag.trim(),
                                )
                                .filter(Boolean)
                                .map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-full border border-lime-900/60 px-3 py-1 text-xs font-semibold text-lime-300"
                                    >
                                        {tag}
                                    </span>
                                ))}
                        </div>
                    )}
                </main>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6">
            <div
                className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-lime-900/60 bg-[#071006] shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="article-modal-title"
            >
                <header className="flex shrink-0 items-start justify-between gap-5 border-b border-lime-900/50 bg-[#10190f] px-5 py-5 sm:px-8">
                    <div className="flex min-w-0 items-start gap-4">
                        <TournamentHQBrand
                            variant="full"
                            size="sm"
                        />

                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-400">
                                Content Management
                            </p>

                            <h2
                                id="article-modal-title"
                                className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl"
                            >
                                {modalTitle}
                            </h2>

                            <p className="mt-2 text-sm text-sky-200/80">
                                Create, review and publish competition content.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={
                            saving ||
                            uploadingImage
                        }
                        className="rounded-xl border border-lime-900/70 p-3 text-slate-300 transition hover:border-lime-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Close article modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-7">
                    <section className="mb-6 rounded-2xl border border-lime-800/50 bg-lime-400/5 p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-400">
                            Competition Context
                        </p>

                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                                    Organisation
                                </p>
                                <p className="mt-1 font-semibold text-white">
                                    {organisationName}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                                    Competition
                                </p>
                                <p className="mt-1 font-semibold text-white">
                                    {competitionName ??
                                        "Organisation-wide content"}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                                    Sport
                                </p>
                                <p className="mt-1 font-semibold text-white">
                                    {sportName ??
                                        "Inherited from competition"}
                                </p>
                            </div>
                        </div>
                    </section>

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

                    <div className="space-y-6">
                        <section className={sectionClassName}>
                            <div className="flex items-center gap-3">
                                <div className="rounded-xl bg-lime-400/10 p-3">
                                    <Newspaper className="h-5 w-5 text-lime-400" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        General
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        Core article and publication details.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                <label className={labelClassName}>
                                    Article title
                                    <span className="ml-1 text-red-400">*</span>

                                    <input
                                        className={fieldClassName}
                                        value={values.title}
                                        onChange={(event) =>
                                            onTitleChange(
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Enter article title"
                                    />
                                </label>

                                <label className={labelClassName}>
                                    URL
                                    <input
                                        className={`${fieldClassName} cursor-not-allowed bg-black/20 text-slate-400`}
                                        value={
                                            values.slug
                                                ? `/${values.slug}`
                                                : ""
                                        }
                                        readOnly
                                        placeholder="/generated-from-title"
                                    />
                                </label>

                                <label className={labelClassName}>
                                    Category
                                    <select
                                        className={fieldClassName}
                                        value={values.category}
                                        onChange={(event) =>
                                            onChange(
                                                "category",
                                                event.target.value as ArticleCategory,
                                            )
                                        }
                                    >
                                        {articleCategories.map(
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
                                        className={fieldClassName}
                                        value={values.status}
                                        onChange={(event) =>
                                            onChange(
                                                "status",
                                                event.target.value as ArticleStatus,
                                            )
                                        }
                                    >
                                        {articleStatuses.map(
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

                                <label className={labelClassName}>
                                    Author
                                    <span className="ml-1 text-red-400">*</span>

                                    <input
                                        className={fieldClassName}
                                        value={values.author}
                                        onChange={(event) =>
                                            onChange(
                                                "author",
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Editorial Team"
                                    />
                                </label>

                                <label className={labelClassName}>
                                    Read time
                                    <input
                                        className={fieldClassName}
                                        value={values.readTime}
                                        onChange={(event) =>
                                            onChange(
                                                "readTime",
                                                event.target.value,
                                            )
                                        }
                                        placeholder="3 min read"
                                    />
                                </label>

                                <div className="md:col-span-2">
                                    <span className={labelClassName}>
                                        Publication date and time
                                    </span>

                                    <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                        <select
                                            className={fieldClassName.replace("mt-2 ", "")}
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
                                                { length: 31 },
                                                (_, index) =>
                                                    String(index + 1).padStart(2, "0"),
                                            ).map((value) => (
                                                <option
                                                    key={value}
                                                    value={value}
                                                >
                                                    {value}
                                                </option>
                                            ))}
                                        </select>

                                        <select
                                            className={fieldClassName.replace("mt-2 ", "")}
                                            value={month}
                                            onChange={(event) => {
                                                const nextMonth =
                                                    event.target.value;

                                                setMonth(nextMonth);

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
                                            className={fieldClassName.replace("mt-2 ", "")}
                                            value={year}
                                            onChange={(event) => {
                                                const nextYear =
                                                    event.target.value;

                                                setYear(nextYear);

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
                                                        value={String(value)}
                                                    >
                                                        {value}
                                                    </option>
                                                ),
                                            )}
                                        </select>

                                        <input
                                            type="time"
                                            className={fieldClassName.replace("mt-2 ", "")}
                                            value={time}
                                            onChange={(event) => {
                                                const nextTime =
                                                    event.target.value;

                                                setTime(nextTime);

                                                updatePublishedAt(
                                                    day,
                                                    month,
                                                    year,
                                                    nextTime,
                                                );
                                            }}
                                        />
                                    </div>

                                    <p className="mt-2 text-xs text-slate-500">
                                        Select a valid calendar date and time. Invalid dates are rejected automatically.
                                    </p>
                                </div>

                                <label className="flex min-h-[74px] items-center gap-3 rounded-xl border border-lime-900/60 bg-[#081207] px-4 py-3 text-sm font-semibold text-slate-200">
                                    <input
                                        type="checkbox"
                                        checked={values.featured}
                                        onChange={(event) =>
                                            onChange(
                                                "featured",
                                                event.target.checked,
                                            )
                                        }
                                        className="h-5 w-5 accent-lime-400"
                                    />
                                    Featured article
                                </label>
                            </div>
                        </section>

                        <section className={sectionClassName}>
                            <div className="flex items-center gap-3">
                                <div className="rounded-xl bg-lime-400/10 p-3">
                                    <FileText className="h-5 w-5 text-lime-400" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        Article content
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        Summary, introduction and full article body.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 space-y-5">
                                <label className={labelClassName}>
                                    Summary
                                    <span className="ml-1 text-red-400">*</span>

                                    <textarea
                                        rows={3}
                                        className={fieldClassName}
                                        value={values.summary}
                                        onChange={(event) =>
                                            onChange(
                                                "summary",
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Short summary displayed on article cards"
                                    />
                                </label>

                                <label className={labelClassName}>
                                    Introduction
                                    <span className="ml-1 text-red-400">*</span>

                                    <textarea
                                        rows={4}
                                        className={fieldClassName}
                                        value={values.hero}
                                        onChange={(event) =>
                                            onChange(
                                                "hero",
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Opening introduction displayed beneath the title"
                                    />
                                </label>

                                <label className={labelClassName}>
                                    Article body
                                    <span className="ml-1 text-red-400">*</span>

                                    <textarea
                                        rows={12}
                                        className={fieldClassName}
                                        value={values.body}
                                        onChange={(event) =>
                                            onChange(
                                                "body",
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Separate paragraphs with a blank line"
                                    />
                                </label>
                            </div>
                        </section>

                        <section className={sectionClassName}>
                            <div className="flex items-center gap-3">
                                <div className="rounded-xl bg-lime-400/10 p-3">
                                    <Image className="h-5 w-5 text-lime-400" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        Hero image
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        JPEG, PNG or WebP. Maximum size 5 MB.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 space-y-5">
                                <label className={labelClassName}>
                                    Upload image
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        disabled={uploadingImage}
                                        className={`${fieldClassName} file:mr-4 file:rounded-lg file:border-0 file:bg-lime-400 file:px-4 file:py-2 file:font-bold file:text-black`}
                                        onChange={(event) => {
                                            const file =
                                                event.target.files?.[0];

                                            if (file) {
                                                void onUploadImage(
                                                    file,
                                                );
                                            }

                                            event.target.value =
                                                "";
                                        }}
                                    />
                                </label>

                                {values.imageUrl && (
                                    <div className="overflow-hidden rounded-2xl border border-lime-900/50 bg-black/20 p-4">
                                        <img
                                            src={values.imageUrl}
                                            alt={
                                                values.imageAlt ||
                                                values.title ||
                                                "Article hero preview"
                                            }
                                            className="max-h-80 w-full rounded-xl object-cover"
                                        />

                                        <div className="mt-4 flex flex-wrap gap-3">
                                            <a
                                                href={values.imageUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="rounded-xl border border-lime-900/70 px-4 py-2 text-sm font-semibold text-white hover:border-lime-400"
                                            >
                                                Open image
                                            </a>

                                            <button
                                                type="button"
                                                onClick={onRemoveImage}
                                                className="rounded-xl border border-red-900/70 px-4 py-2 text-sm font-semibold text-red-300 hover:border-red-500"
                                            >
                                                Remove image
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                    <label className={labelClassName}>
                                        Image URL
                                        <input
                                            type="url"
                                            className={fieldClassName}
                                            value={values.imageUrl}
                                            onChange={(event) =>
                                                onChange(
                                                    "imageUrl",
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Automatically populated after upload"
                                        />
                                    </label>

                                    <label className={labelClassName}>
                                        Image alt text
                                        <input
                                            className={fieldClassName}
                                            value={values.imageAlt}
                                            onChange={(event) =>
                                                onChange(
                                                    "imageAlt",
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Describe the image"
                                        />
                                    </label>
                                </div>
                            </div>
                        </section>

                        <section className={sectionClassName}>
                            <div className="flex items-center gap-3">
                                <div className="rounded-xl bg-lime-400/10 p-3">
                                    <Tag className="h-5 w-5 text-lime-400" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        Metadata
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        Tags and further-reading resources.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 space-y-5">
                                <label className={labelClassName}>
                                    Tags
                                    <input
                                        className={fieldClassName}
                                        value={values.tags}
                                        onChange={(event) =>
                                            onChange(
                                                "tags",
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Football history, Community, Festival"
                                    />
                                </label>

                                <label className={labelClassName}>
                                    Further-reading links
                                    <textarea
                                        rows={4}
                                        className={fieldClassName}
                                        value={values.actions}
                                        onChange={(event) =>
                                            onChange(
                                                "actions",
                                                event.target.value,
                                            )
                                        }
                                        placeholder={
                                            "Link label | https://example.com\nhttps://example.com/page"
                                        }
                                    />
                                </label>
                            </div>
                        </section>
                    </div>
                </div>

                <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-lime-900/50 bg-[#10190f] px-5 py-4 sm:flex-row sm:justify-end sm:px-8">
                    <button
                        type="button"
                        disabled={
                            saving ||
                            uploadingImage
                        }
                        onClick={() =>
                            setShowPreview(true)
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-800/70 px-6 py-3 font-bold text-sky-200 transition hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Eye className="h-5 w-5" />
                        Preview
                    </button>

                    <button
                        type="button"
                        disabled={
                            saving ||
                            uploadingImage
                        }
                        onClick={onCancel}
                        className="rounded-xl border border-lime-900/70 px-6 py-3 font-bold text-white transition hover:border-lime-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        disabled={
                            saving ||
                            uploadingImage
                        }
                        onClick={() =>
                            void onSave()
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-6 py-3 font-black text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Save className="h-5 w-5" />

                        {saving
                            ? "Saving..."
                            : mode === "create"
                                ? "Create Article"
                                : "Update Article"}
                    </button>
                </footer>
            </div>
        </div>
    );
}