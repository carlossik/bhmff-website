import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { supabase } from "../../../lib/supabaseClient";
import { useOrganisation } from "../../../context/OrganisationContext";
import { useCompetition } from "../../../contexts/CompetitionContext";
import { ConfirmDialog } from "../../common/ConfirmDialog";

import MediaModal from "./MediaModal";
import MediaTable, {
    type DbMedia,
} from "./MediaTable";

import {
    createEmbedUrl,
    createSlug,
    createThumbnailUrl,
    toDateTimeLocal,
    type MediaStatus,
} from "./mediaHelpers";

import {
    validateMedia,
    type MediaFormState,
} from "./mediaValidation";

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

export function MediaManager() {
    const { currentOrganisation } =
        useOrganisation();

    const {
        currentCompetition,
        currentCompetitionId,
    } = useCompetition();

    const organisationId =
        currentOrganisation?.id ?? null;

    const isClub =
        currentOrganisation?.organisation_type === "club";

    const mediaContextName =
        isClub
            ? currentOrganisation?.name ?? "this club"
            : currentCompetition?.name ?? "the selected competition";

    const [mediaItems, setMediaItems] =
        useState<DbMedia[]>([]);

    const [form, setForm] =
        useState<MediaFormState>(
            initialFormState,
        );

    const [editingId, setEditingId] =
        useState<string | null>(null);

    const [
        mediaToDelete,
        setMediaToDelete,
    ] = useState<DbMedia | null>(null);

    const [
        showMediaModal,
        setShowMediaModal,
    ] = useState(false);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [message, setMessage] =
        useState<string | null>(null);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState<string | null>(null);

    const editingMediaItem = useMemo(
        () =>
            mediaItems.find(
                (item) =>
                    item.id === editingId,
            ) ?? null,
        [mediaItems, editingId],
    );

    const resetForm = useCallback(() => {
        setForm(initialFormState);
        setEditingId(null);
        setShowMediaModal(false);
    }, []);

    const loadMedia =
        useCallback(async () => {
            setLoading(true);
            setErrorMessage(null);

            if (!organisationId) {
                setMediaItems([]);
                setLoading(false);
                return;
            }

            let query =
                supabase
                    .from("media")
                    .select(`
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
                    `)
                    .eq(
                        "organisation_id",
                        organisationId,
                    );

            if (!isClub) {
                if (!currentCompetitionId) {
                    setMediaItems([]);
                    setLoading(false);
                    return;
                }

                query =
                    query.eq(
                        "competition_id",
                        currentCompetitionId,
                    );
            }

            const { data, error } =
                await query.order(
                    "created_at",
                    {
                        ascending: false,
                    },
                );

            if (error) {
                console.error(
                    "Failed to load media:",
                    error,
                );

                setMediaItems([]);
                setErrorMessage(
                    "Unable to load media records.",
                );
                setLoading(false);
                return;
            }

            setMediaItems(
                (data ?? []) as DbMedia[],
            );
            setLoading(false);
        }, [
            currentCompetitionId,
            isClub,
            organisationId,
        ]);

    useEffect(() => {
        setMediaItems([]);
        setMediaToDelete(null);
        resetForm();
        void loadMedia();
    }, [
        loadMedia,
        resetForm,
    ]);

    function updateForm<
        Key extends keyof MediaFormState,
    >(
        key: Key,
        value: MediaFormState[Key],
    ) {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    }

    function handleTitleChange(
        title: string,
    ) {
        const shouldPreserveSlug =
            editingMediaItem?.status ===
            "published" ||
            editingMediaItem?.status ===
            "archived";

        setForm((current) => ({
            ...current,
            title,
            slug: shouldPreserveSlug
                ? current.slug
                : createSlug(title),
        }));
    }

    function handleYouTubeUrlChange(
        youtubeUrl: string,
    ) {
        setForm((current) => {
            const embedUrl =
                createEmbedUrl(youtubeUrl);

            const thumbnailUrl =
                current.thumbnailUrl ||
                createThumbnailUrl(
                    youtubeUrl,
                );

            return {
                ...current,
                youtubeUrl,
                embedUrl,
                thumbnailUrl,
            };
        });
    }

    function openCreateMediaModal() {
        if (
            !organisationId ||
            (!isClub && !currentCompetitionId)
        ) {
            setErrorMessage(
                isClub
                    ? "Select a club before adding media."
                    : "Select an organisation and competition before adding media.",
            );
            return;
        }

        setForm(initialFormState);
        setEditingId(null);
        setMessage(null);
        setErrorMessage(null);
        setShowMediaModal(true);
    }

    function openEditMediaModal(
        item: DbMedia,
    ) {
        if (
            !organisationId ||
            item.organisation_id !==
                organisationId ||
            (
                !isClub &&
                (
                    !currentCompetitionId ||
                    item.competition_id !==
                        currentCompetitionId
                )
            )
        ) {
            setErrorMessage(
                isClub
                    ? "This media item does not belong to the selected club."
                    : "This media item does not belong to the selected organisation and competition.",
            );
            return;
        }

        setEditingId(item.id);

        setForm({
            title: item.title,
            slug: item.slug,
            category: item.category,
            status: item.status,
            description:
                item.description ?? "",
            youtubeUrl:
                item.youtube_url ?? "",
            embedUrl:
                item.embed_url ?? "",
            thumbnailUrl:
                item.thumbnail_url ?? "",
            thumbnailAlt:
                item.thumbnail_alt ?? "",
            featured:
                item.featured ?? false,
            publishedAt:
                toDateTimeLocal(
                    item.published_at,
                ),
        });

        setMessage(null);
        setErrorMessage(null);
        setShowMediaModal(true);
    }

    async function saveMedia() {
        const validationError =
            isClub
                ? !organisationId
                    ? "Select a club before adding media."
                    : !form.title.trim()
                        ? "Media title is required."
                        : !form.slug.trim()
                            ? "Media slug is required."
                            : null
                : validateMedia(
                    form,
                    organisationId,
                    currentCompetitionId,
                );

        if (validationError) {
            setErrorMessage(
                validationError,
            );
            setMessage(null);
            return;
        }

        if (
            !organisationId ||
            (!isClub && !currentCompetitionId)
        ) {
            return;
        }

        setSaving(true);
        setMessage(null);
        setErrorMessage(null);

        try {
            const youtubeUrl =
                form.youtubeUrl.trim();

            const embedUrl = youtubeUrl
                ? createEmbedUrl(
                    youtubeUrl,
                )
                : form.embedUrl.trim();

            const thumbnailUrl =
                form.thumbnailUrl.trim() ||
                createThumbnailUrl(
                    youtubeUrl,
                );

            const publishedAt =
                form.status ===
                "published"
                    ? form.publishedAt
                        ? new Date(
                            form.publishedAt,
                        ).toISOString()
                        : editingMediaItem
                            ?.published_at ??
                        new Date().toISOString()
                    : form.publishedAt
                        ? new Date(
                            form.publishedAt,
                        ).toISOString()
                        : null;

            const payload = {
                organisation_id:
                organisationId,
                competition_id:
                    isClub
                        ? null
                        : currentCompetitionId,
                title:
                    form.title.trim(),
                slug: createSlug(
                    form.slug ||
                    form.title,
                ),
                category: form.category,
                status: form.status,
                description:
                    form.description.trim(),
                youtube_url:
                    youtubeUrl || null,
                embed_url:
                    embedUrl || null,
                thumbnail_url:
                    thumbnailUrl || null,
                thumbnail_alt:
                    form.thumbnailAlt.trim() ||
                    form.title.trim() ||
                    null,
                featured: form.featured,
                published_at:
                publishedAt,
            };

            let response;

            if (editingId) {
                let updateQuery =
                    supabase
                        .from("media")
                        .update(payload)
                        .eq("id", editingId)
                        .eq(
                            "organisation_id",
                            organisationId,
                        );

                if (!isClub) {
                    updateQuery =
                        updateQuery.eq(
                            "competition_id",
                            currentCompetitionId,
                        );
                }

                response =
                    await updateQuery;
            } else {
                response =
                    await supabase
                        .from("media")
                        .insert(payload);
            }

            if (response.error) {
                console.error(
                    "Failed to save media:",
                    response.error,
                );

                setErrorMessage(
                    response.error.code ===
                    "23505"
                        ? "A media record with this URL already exists."
                        : response.error.message,
                );
                return;
            }

            const wasEditing =
                Boolean(editingId);

            resetForm();

            await loadMedia();

            setMessage(
                wasEditing
                    ? "Media record updated successfully."
                    : "Media record created successfully.",
            );
        } catch (error) {
            console.error(
                "Unexpected error while saving media:",
                error,
            );

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to save this media item.",
            );
        } finally {
            setSaving(false);
        }
    }

    async function updateStatus(
        item: DbMedia,
        status: MediaStatus,
    ) {
        if (
            !organisationId ||
            (!isClub && !currentCompetitionId)
        ) {
            setErrorMessage(
                isClub
                    ? "Select a club before updating media."
                    : "Select an organisation and competition before updating media.",
            );
            return;
        }

        setMessage(null);
        setErrorMessage(null);

        const publishedAt =
            status === "published"
                ? item.published_at ??
                new Date().toISOString()
                : item.published_at;

        let statusQuery =
            supabase
                .from("media")
                .update({
                    status,
                    published_at:
                        publishedAt,
                })
                .eq("id", item.id)
                .eq(
                    "organisation_id",
                    organisationId,
                );

        if (!isClub) {
            statusQuery =
                statusQuery.eq(
                    "competition_id",
                    currentCompetitionId,
                );
        }

        const { error } =
            await statusQuery;

        if (error) {
            console.error(
                "Failed to update media status:",
                error,
            );

            setErrorMessage(
                "Unable to update media status.",
            );
            return;
        }

        setMessage(
            `Media status changed to ${status}.`,
        );

        await loadMedia();
    }

    async function deleteMedia() {
        if (
            !mediaToDelete ||
            saving ||
            !organisationId ||
            (!isClub && !currentCompetitionId)
        ) {
            return;
        }

        const item = mediaToDelete;

        setSaving(true);
        setMessage(null);
        setErrorMessage(null);

        try {
            let deleteQuery =
                supabase
                    .from("media")
                    .delete()
                    .eq("id", item.id)
                    .eq(
                        "organisation_id",
                        organisationId,
                    );

            if (!isClub) {
                deleteQuery =
                    deleteQuery.eq(
                        "competition_id",
                        currentCompetitionId,
                    );
            }

            const { error } =
                await deleteQuery;

            if (error) {
                console.error(
                    "Failed to delete media:",
                    error,
                );

                setErrorMessage(
                    "Unable to delete this media record.",
                );
                return;
            }

            if (
                editingId === item.id
            ) {
                resetForm();
            }

            setMediaToDelete(null);

            await loadMedia();

            setMessage(
                "Media record deleted successfully.",
            );
        } finally {
            setSaving(false);
        }
    }

    if (
        !currentOrganisation ||
        (!isClub && !currentCompetition)
    ) {
        return (
            <div className="rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] p-8 text-center">
                <h3 className="text-xl font-bold text-[var(--organisation-text)]">
                    {isClub
                        ? "Select a club"
                        : "Select an organisation and competition"}
                </h3>

                <p className="mt-2 text-[var(--organisation-muted)]">
                    {isClub
                        ? "Choose the club you want to manage before opening the media library."
                        : "Choose the context you want to manage before opening the media library."}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--organisation-accent)]">
                        Content Management
                    </p>

                    <h3 className="mt-1 text-3xl font-black text-[var(--organisation-text)]">
                        Media Library
                    </h3>

                    <p className="mt-2 text-sm text-[var(--organisation-muted)]">
                        Manage highlights, full matches, interviews, livestreams, podcasts and promotional content for{" "}
                        <strong className="text-[var(--organisation-text)]">
                            {mediaContextName}
                        </strong>
                        .
                    </p>
                </div>

                <button
                    type="button"
                    onClick={
                        openCreateMediaModal
                    }
                    className="rounded-xl bg-[var(--organisation-accent)] px-5 py-3 font-black text-[var(--organisation-on-accent)] transition hover:bg-[var(--organisation-accent)]"
                >
                    + Add Media
                </button>
            </div>

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

            <MediaTable
                loading={loading}
                mediaItems={mediaItems}
                competitionName={
                    mediaContextName
                }
                onEdit={
                    openEditMediaModal
                }
                onPublish={(item) =>
                    void updateStatus(
                        item,
                        "published",
                    )
                }
                onUnpublish={(item) =>
                    void updateStatus(
                        item,
                        "draft",
                    )
                }
                onArchive={(item) =>
                    void updateStatus(
                        item,
                        "archived",
                    )
                }
                onDelete={
                    setMediaToDelete
                }
            />

            <MediaModal
                open={showMediaModal}
                mode={
                    editingId
                        ? "edit"
                        : "create"
                }
                values={form}
                organisationName={
                    currentOrganisation.name
                }
                competitionName={
                    mediaContextName
                }
                saving={saving}
                message={message}
                errorMessage={errorMessage}
                onChange={updateForm}
                onTitleChange={
                    handleTitleChange
                }
                onYouTubeUrlChange={
                    handleYouTubeUrlChange
                }
                onSave={() =>
                    void saveMedia()
                }
                onCancel={resetForm}
            />

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
                            setMediaToDelete(
                                null,
                            );
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