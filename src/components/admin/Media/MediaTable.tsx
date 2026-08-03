import {
    formatStatusLabel,
    type MediaCategory,
    type MediaStatus,
} from "./mediaHelpers";

export type DbMedia = {
    id: string;
    organisation_id: string;
    competition_id: string;
    title: string;
    slug: string;
    category: MediaCategory;
    status: MediaStatus;
    description: string;
    youtube_url: string | null;
    embed_url: string | null;
    thumbnail_url: string | null;
    thumbnail_alt: string | null;
    featured: boolean;
    fixture_id: string | null;
    published_at: string | null;
    created_at: string;
    updated_at: string;
};

type MediaTableProps = {
    loading: boolean;
    mediaItems: DbMedia[];
    competitionName: string;
    onEdit: (item: DbMedia) => void;
    onPublish: (item: DbMedia) => void;
    onUnpublish: (item: DbMedia) => void;
    onArchive: (item: DbMedia) => void;
    onDelete: (item: DbMedia) => void;
};

export default function MediaTable({
                                       loading,
                                       mediaItems,
                                       competitionName,
                                       onEdit,
                                       onPublish,
                                       onUnpublish,
                                       onArchive,
                                       onDelete,
                                   }: MediaTableProps) {
    return (
        <section className="space-y-4">
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-400">
                    Media Library
                </p>

                <h4 className="mt-1 text-xl font-bold text-white">
                    Current media for{" "}
                    {competitionName}
                </h4>
            </div>

            {loading ? (
                <div className="rounded-2xl border border-lime-900/50 bg-[#0b150a] p-6 text-slate-400">
                    Loading media...
                </div>
            ) : mediaItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-lime-900/60 bg-[#0b150a] p-8 text-center">
                    <h5 className="text-lg font-bold text-white">
                        No media yet
                    </h5>

                    <p className="mt-2 text-sm text-slate-400">
                        Add the first media item for{" "}
                        {competitionName}.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {mediaItems.map((item) => (
                        <article
                            key={item.id}
                            className="grid gap-5 rounded-2xl border border-lime-900/50 bg-[#0b150a] p-5 lg:grid-cols-[180px_1fr_auto]"
                        >
                            <div className="overflow-hidden rounded-xl border border-lime-900/50 bg-black/20">
                                {item.thumbnail_url ? (
                                    <img
                                        src={
                                            item.thumbnail_url
                                        }
                                        alt={
                                            item.thumbnail_alt ??
                                            item.title
                                        }
                                        className="h-36 w-full object-cover lg:h-full"
                                    />
                                ) : (
                                    <div className="flex h-36 items-center justify-center text-sm text-slate-500 lg:h-full">
                                        No thumbnail
                                    </div>
                                )}
                            </div>

                            <div className="min-w-0">
                                <div className="flex flex-wrap gap-2">
                                    <span className="rounded-full border border-lime-800/60 bg-lime-400/10 px-3 py-1 text-xs font-bold text-lime-300">
                                        {item.category}
                                    </span>

                                    <span className="rounded-full border border-sky-800/60 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-300">
                                        {formatStatusLabel(
                                            item.status,
                                        )}
                                    </span>

                                    {item.featured && (
                                        <span className="rounded-full border border-amber-700/60 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">
                                            Featured
                                        </span>
                                    )}
                                </div>

                                <h5 className="mt-4 text-xl font-black text-white">
                                    {item.title}
                                </h5>

                                <p className="mt-1 text-sm text-slate-500">
                                    /{item.slug}
                                </p>

                                <p className="mt-3 text-sm leading-6 text-slate-300">
                                    {item.description ||
                                        "No description provided."}
                                </p>
                            </div>

                            <div className="flex flex-wrap content-start gap-2 lg:w-36 lg:flex-col">
                                <button
                                    type="button"
                                    onClick={() =>
                                        onEdit(item)
                                    }
                                    className="rounded-xl border border-lime-900/70 px-4 py-2 text-sm font-bold text-white hover:border-lime-400"
                                >
                                    Edit
                                </button>

                                {item.status !==
                                "published" ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onPublish(
                                                item,
                                            )
                                        }
                                        className="rounded-xl border border-lime-900/70 px-4 py-2 text-sm font-bold text-lime-300 hover:border-lime-400"
                                    >
                                        Publish
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onUnpublish(
                                                item,
                                            )
                                        }
                                        className="rounded-xl border border-lime-900/70 px-4 py-2 text-sm font-bold text-lime-300 hover:border-lime-400"
                                    >
                                        Unpublish
                                    </button>
                                )}

                                {item.status !==
                                    "archived" && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onArchive(
                                                    item,
                                                )
                                            }
                                            className="rounded-xl border border-lime-900/70 px-4 py-2 text-sm font-bold text-slate-300 hover:border-lime-400"
                                        >
                                            Archive
                                        </button>
                                    )}

                                <button
                                    type="button"
                                    onClick={() =>
                                        onDelete(item)
                                    }
                                    className="rounded-xl border border-red-900/70 px-4 py-2 text-sm font-bold text-red-300 hover:border-red-500"
                                >
                                    Delete
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}