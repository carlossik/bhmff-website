import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useOrganisation } from "../../../context/OrganisationContext";
import { useCompetition } from "../../../contexts/CompetitionContext";
import { ConfirmDialog } from "../../common/ConfirmDialog";

const mediaCategories = [
    "Match Highlights",
    "Full Match Replay",
    "Player Interview",
    "Coach Interview",
    "Livestream",
    "Competition Trailer",
    "Behind the Scenes",
    "Photo Gallery",
    "Podcast",
    "Sponsor Feature",
] as const;

const mediaStatuses = [
    "draft",
    "review",
    "scheduled",
    "published",
    "archived",
] as const;

type MediaCategory = (typeof mediaCategories)[number];

type MediaStatus = (typeof mediaStatuses)[number];

type DbMedia = {
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

type MediaFormState = {
    title: string;
    slug: string;
    category: MediaCategory;
    status: MediaStatus;
    description: string;
    youtubeUrl: string;
    embedUrl: string;
    thumbnailUrl: string;
    thumbnailAlt: string;
    featured: boolean;
    publishedAt: string;
};

const initialFormState: MediaFormState = {
    title: "",
    slug: "",
    category: "Match Highlights",
    status: "draft",
    description: "",
    youtubeUrl: "",
    embedUrl: "",
    thumbnailUrl: "",
    thumbnailAlt: "",
    featured: false,
    publishedAt: "",
};

function createSlug(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function extractYouTubeId(value: string) {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
        return null;
    }

    try {
        const url = new URL(trimmedValue);

        if (url.hostname.includes("youtu.be")) {
            return url.pathname.replace("/", "").split("/")[0] || null;
        }

        if (url.hostname.includes("youtube.com")) {
            if (url.pathname.startsWith("/embed/")) {
                return url.pathname.split("/embed/")[1]?.split("/")[0] ?? null;
            }

            if (url.pathname.startsWith("/shorts/")) {
                return url.pathname.split("/shorts/")[1]?.split("/")[0] ?? null;
            }

            return url.searchParams.get("v");
        }
    } catch {
        return null;
    }

    return null;
}

function createEmbedUrl(youtubeUrl: string) {
    const videoId = extractYouTubeId(youtubeUrl);

    return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
}

function createThumbnailUrl(youtubeUrl: string) {
    const videoId = extractYouTubeId(youtubeUrl);

    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";
}

function toDateTimeLocal(value: string | null) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const offset = date.getTimezoneOffset();

    const localDate = new Date(date.getTime() - offset * 60_000);

    return localDate.toISOString().slice(0, 16);
}

export function MediaManager() {
    const { currentOrganisation } = useOrganisation();

    const {
        currentCompetition,
        currentCompetitionId,
    } = useCompetition();

    const [mediaItems, setMediaItems] = useState<DbMedia[]>([]);

    const [form, setForm] = useState<MediaFormState>(initialFormState);

    const [editingId, setEditingId] = useState<string | null>(null);

    const [mediaToDelete, setMediaToDelete] =
        useState<DbMedia | null>(null);

    const [showMediaForm, setShowMediaForm] = useState(false);

    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    const [message, setMessage] = useState<string | null>(null);

    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const editingMediaItem = useMemo(
        () => mediaItems.find((item) => item.id === editingId) ?? null,
        [mediaItems, editingId],
    );

    const loadMedia = useCallback(async () => {
        setLoading(true);
        setErrorMessage(null);

        if (
            !currentOrganisation?.id ||
            !currentCompetitionId
        ) {
            setMediaItems([]);
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from("media")
            .select(
                `
                        id,
                        organisation_id,
                        competition_id,
                        title,
                        slug,
                        category,
                        status,
                        description,
                        youtube_url,
                        embed_url,
                        thumbnail_url,
                        thumbnail_alt,
                        featured,
                        fixture_id,
                        published_at,
                        created_at,
                        updated_at
                    `,
            )
            .eq(
                "organisation_id",
                currentOrganisation.id,
            )
            .eq(
                "competition_id",
                currentCompetitionId,
            )
            .order("created_at", {
                ascending: false,
            });

        if (error) {
            console.error("Failed to load media:", error);

            setErrorMessage("Unable to load media records.");

            setMediaItems([]);
            setLoading(false);
            return;
        }

        setMediaItems((data ?? []) as DbMedia[]);

        setLoading(false);
    }, [
        currentCompetitionId,
        currentOrganisation?.id,
    ]);

    useEffect(() => {
        void loadMedia();
    }, [loadMedia]);

    function updateForm<Key extends keyof MediaFormState>(
        key: Key,
        value: MediaFormState[Key],
    ) {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    }

    function handleTitleChange(title: string) {
        setForm((current) => ({
            ...current,
            title,
            slug: editingId || current.slug ? current.slug : createSlug(title),
        }));
    }

    function handleYouTubeUrlChange(youtubeUrl: string) {
        setForm((current) => {
            const embedUrl = createEmbedUrl(youtubeUrl);

            const thumbnailUrl =
                current.thumbnailUrl || createThumbnailUrl(youtubeUrl);

            return {
                ...current,
                youtubeUrl,
                embedUrl,
                thumbnailUrl,
            };
        });
    }

    function resetForm() {
        setForm(initialFormState);
        setEditingId(null);
        setShowMediaForm(false);
        setMessage(null);
        setErrorMessage(null);
    }

    function openCreateMediaForm() {
        setForm(initialFormState);
        setEditingId(null);
        setShowMediaForm(true);
        setMessage(null);
        setErrorMessage(null);
    }

    function startEditing(item: DbMedia) {
        setEditingId(item.id);
        setShowMediaForm(true);

        setForm({
            title: item.title,
            slug: item.slug,
            category: item.category,
            status: item.status,
            description: item.description,
            youtubeUrl: item.youtube_url ?? "",
            embedUrl: item.embed_url ?? "",
            thumbnailUrl: item.thumbnail_url ?? "",
            thumbnailAlt: item.thumbnail_alt ?? "",
            featured: item.featured,
            publishedAt: toDateTimeLocal(item.published_at),
        });

        setMessage(null);
        setErrorMessage(null);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    function validateForm() {
        if (!currentOrganisation?.id) {
            return "Select an organisation before adding media.";
        }

        if (!currentCompetitionId) {
            return "Select a competition before adding media.";
        }

        if (!form.title.trim()) {
            return "Media title is required.";
        }

        if (!form.slug.trim()) {
            return "Media slug is required.";
        }

        if (
            form.category !== "Photo Gallery" &&
            form.category !== "Podcast" &&
            !form.youtubeUrl.trim()
        ) {
            return "A YouTube URL is required for this media category.";
        }

        if (form.youtubeUrl.trim() && !extractYouTubeId(form.youtubeUrl)) {
            return "Enter a valid YouTube URL.";
        }

        return null;
    }

    async function saveMedia() {
        const validationError = validateForm();

        if (validationError) {
            setErrorMessage(validationError);
            setMessage(null);
            return;
        }

        setSaving(true);
        setMessage(null);
        setErrorMessage(null);

        const youtubeUrl = form.youtubeUrl.trim();

        const embedUrl = youtubeUrl
            ? createEmbedUrl(youtubeUrl)
            : form.embedUrl.trim();

        const thumbnailUrl =
            form.thumbnailUrl.trim() || createThumbnailUrl(youtubeUrl);

        const publishedAt =
            form.status === "published"
                ? form.publishedAt
                    ? new Date(form.publishedAt).toISOString()
                    : (editingMediaItem?.published_at ?? new Date().toISOString())
                : form.publishedAt
                    ? new Date(form.publishedAt).toISOString()
                    : null;

        const payload = {
            organisation_id:
            currentOrganisation.id,
            competition_id:
            currentCompetitionId,
            title: form.title.trim(),
            slug: createSlug(form.slug),
            category: form.category,
            status: form.status,
            description: form.description.trim(),
            youtube_url: youtubeUrl || null,
            embed_url: embedUrl || null,
            thumbnail_url: thumbnailUrl || null,
            thumbnail_alt: form.thumbnailAlt.trim() || form.title.trim() || null,
            featured: form.featured,
            published_at: publishedAt,
        };

        const response = editingId
            ? await supabase
                .from("media")
                .update(payload)
                .eq("id", editingId)
                .eq(
                    "organisation_id",
                    currentOrganisation.id,
                )
                .eq(
                    "competition_id",
                    currentCompetitionId,
                )
            : await supabase
                .from("media")
                .insert(payload);

        if (response.error) {
            console.error("Failed to save media:", response.error);

            setErrorMessage(
                response.error.code === "23505"
                    ? "A media record with this slug already exists."
                    : response.error.message,
            );

            setSaving(false);
            return;
        }

        setMessage(
            editingId
                ? "Media record updated successfully."
                : "Media record created successfully.",
        );

        setForm(initialFormState);
        setEditingId(null);
        setShowMediaForm(false);

        await loadMedia();

        setSaving(false);
    }

    async function updateStatus(item: DbMedia, status: MediaStatus) {
        if (
            !currentOrganisation?.id ||
            !currentCompetitionId
        ) {
            setErrorMessage(
                "Select an organisation and competition before updating media.",
            );
            return;
        }

        setMessage(null);
        setErrorMessage(null);

        const publishedAt =
            status === "published"
                ? (item.published_at ?? new Date().toISOString())
                : item.published_at;

        const { error } = await supabase
            .from("media")
            .update({
                status,
                published_at: publishedAt,
            })
            .eq("id", item.id)
            .eq(
                "organisation_id",
                currentOrganisation.id,
            )
            .eq(
                "competition_id",
                currentCompetitionId,
            );

        if (error) {
            console.error("Failed to update media status:", error);

            setErrorMessage("Unable to update media status.");
            return;
        }

        setMessage(`Media status changed to ${status}.`);

        await loadMedia();
    }

    async function deleteMedia() {
        if (
            !mediaToDelete ||
            saving ||
            !currentOrganisation?.id ||
            !currentCompetitionId
        ) {
            return;
        }

        const item = mediaToDelete;

        setSaving(true);
        setMessage(null);
        setErrorMessage(null);

        const { error } = await supabase
            .from("media")
            .delete()
            .eq("id", item.id)
            .eq(
                "organisation_id",
                currentOrganisation.id,
            )
            .eq(
                "competition_id",
                currentCompetitionId,
            );

        if (error) {
            console.error("Failed to delete media:", error);

            setErrorMessage("Unable to delete this media record.");
            setSaving(false);
            return;
        }

        if (editingId === item.id) {
            resetForm();
        }

        setMediaToDelete(null);
        setMessage("Media record deleted successfully.");

        await loadMedia();

        setSaving(false);
    }

    return (
        <div>
            <div className="adminWorkspaceHeader">
                <div>
                    <h3>Media Library</h3>

                    <p className="muted">
                        Manage competition media including highlights, full matches,
                        interviews, livestreams, podcasts and promotional content.
                    </p>

                    {currentCompetition && (
                        <p className="muted">
                            Managing media for{" "}
                            <strong>
                                {currentCompetition.name}
                            </strong>
                        </p>
                    )}
                </div>

                {!showMediaForm ? (
                    <button
                        className="btn primary"
                        type="button"
                        onClick={openCreateMediaForm}
                    >
                        + Add Media
                    </button>
                ) : (
                    <button
                        className="btn secondary"
                        type="button"
                        disabled={saving}
                        onClick={resetForm}
                    >
                        Cancel
                    </button>
                )}
            </div>

            {message && <p className="adminSuccessMessage">{message}</p>}

            {errorMessage && <p className="adminErrorMessage">{errorMessage}</p>}

            {showMediaForm && (
                <div className="articleAdminForm">
                    <div className="adminFormGrid">
                        <label>
                            <span>Media title</span>

                            <input
                                value={form.title}
                                onChange={(event) => handleTitleChange(event.target.value)}
                                placeholder="Enter media title"
                            />
                        </label>

                        <label>
                            <span>URL slug</span>

                            <input
                                value={form.slug}
                                onChange={(event) => updateForm("slug", event.target.value)}
                                placeholder="media-url-slug"
                            />
                        </label>

                        <label>
                            <span>Category</span>

                            <select
                                value={form.category}
                                onChange={(event) =>
                                    updateForm("category", event.target.value as MediaCategory)
                                }
                            >
                                {mediaCategories.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            <span>Status</span>

                            <select
                                value={form.status}
                                onChange={(event) =>
                                    updateForm("status", event.target.value as MediaStatus)
                                }
                            >
                                {mediaStatuses.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            <span>Publication date</span>

                            <input
                                type="datetime-local"
                                value={form.publishedAt}
                                onChange={(event) =>
                                    updateForm("publishedAt", event.target.value)
                                }
                            />
                        </label>

                        <label className="adminCheckboxLabel">
                            <input
                                type="checkbox"
                                checked={form.featured}
                                onChange={(event) =>
                                    updateForm("featured", event.target.checked)
                                }
                            />

                            <span>Featured media</span>
                        </label>

                        <label className="adminFormFullWidth">
                            <span>Description</span>

                            <textarea
                                value={form.description}
                                onChange={(event) =>
                                    updateForm("description", event.target.value)
                                }
                                placeholder="Describe this media item"
                                rows={4}
                            />
                        </label>

                        <label className="adminFormFullWidth">
                            <span>YouTube URL</span>

                            <input
                                type="url"
                                value={form.youtubeUrl}
                                onChange={(event) => handleYouTubeUrlChange(event.target.value)}
                                placeholder="https://www.youtube.com/watch?v=..."
                            />
                        </label>

                        <label>
                            <span>Embed URL</span>

                            <input
                                type="url"
                                value={form.embedUrl}
                                onChange={(event) => updateForm("embedUrl", event.target.value)}
                                placeholder="Generated automatically"
                            />
                        </label>

                        <label>
                            <span>Thumbnail URL</span>

                            <input
                                type="url"
                                value={form.thumbnailUrl}
                                onChange={(event) =>
                                    updateForm("thumbnailUrl", event.target.value)
                                }
                                placeholder="Generated automatically"
                            />
                        </label>

                        <label className="adminFormFullWidth">
                            <span>Thumbnail alt text</span>

                            <input
                                value={form.thumbnailAlt}
                                onChange={(event) =>
                                    updateForm("thumbnailAlt", event.target.value)
                                }
                                placeholder="Describe the thumbnail"
                            />
                        </label>
                    </div>

                    {form.embedUrl && (
                        <div className="mediaAdminPreview">
                            <iframe
                                src={form.embedUrl}
                                title={form.title || "Media preview"}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    )}

                    <div className="adminFormActions">
                        <button
                            className="btn primary"
                            type="button"
                            disabled={saving}
                            onClick={() => void saveMedia()}
                        >
                            {saving
                                ? "Saving..."
                                : editingId
                                    ? "Update Media"
                                    : "Save Media"}
                        </button>

                        <button
                            className="btn secondary"
                            type="button"
                            disabled={saving}
                            onClick={resetForm}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="adminRecordList">
                <h4>Current media</h4>

                {loading ? (
                    <p className="muted">Loading media...</p>
                ) : mediaItems.length ? (
                    mediaItems.map((item) => (
                        <article className="adminRecord articleAdminRecord" key={item.id}>
                            {item.thumbnail_url && (
                                <img
                                    className="articleAdminThumbnail"
                                    src={item.thumbnail_url}
                                    alt={item.thumbnail_alt ?? item.title}
                                />
                            )}

                            <div className="articleAdminRecordDetails">
                                <div className="articleAdminRecordBadges">
                                    <span className="badge">{item.category}</span>

                                    <span
                                        className={`articleStatusBadge articleStatus-${item.status}`}
                                    >
                    {item.status}
                  </span>

                                    {item.featured && (
                                        <span className="featuredBadge">Featured Content</span>
                                    )}
                                </div>

                                <strong>{item.title}</strong>

                                <span className="muted">/{item.slug}</span>

                                <p>{item.description}</p>
                            </div>

                            <div className="articleAdminRecordActions">
                                <button type="button" onClick={() => startEditing(item)}>
                                    Edit
                                </button>

                                {item.status !== "published" && (
                                    <button
                                        type="button"
                                        onClick={() => void updateStatus(item, "published")}
                                    >
                                        Publish
                                    </button>
                                )}

                                {item.status === "published" && (
                                    <button
                                        type="button"
                                        onClick={() => void updateStatus(item, "draft")}
                                    >
                                        Unpublish
                                    </button>
                                )}

                                {item.status !== "archived" && (
                                    <button
                                        type="button"
                                        onClick={() => void updateStatus(item, "archived")}
                                    >
                                        Archive
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="dangerButton"
                                    onClick={() => setMediaToDelete(item)}
                                >
                                    Delete
                                </button>
                            </div>
                        </article>
                    ))
                ) : (
                    <p className="muted">No competition media has been added yet.</p>
                )}
            </div>

            {mediaToDelete && (
                <ConfirmDialog
                    title="Delete Media"
                    message={`Are you sure you want to delete "${mediaToDelete.title}"? This action cannot be undone.`}
                    confirmText={
                        saving
                            ? "Deleting..."
                            : "Delete"
                    }
                    cancelText="Cancel"
                    onCancel={() => {
                        if (!saving) {
                            setMediaToDelete(null);
                        }
                    }}
                    onConfirm={() => {
                        if (!saving) {
                            void deleteMedia();
                        }
                    }}
                />
            )}
        </div>
    );
}