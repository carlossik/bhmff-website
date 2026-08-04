import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { supabase } from "../../../lib/supabaseClient";
import { useOrganisation } from "../../../context/OrganisationContext";
import { ConfirmDialog } from "../../common/ConfirmDialog";

import {
    getOrganisationContentConfig,
} from "../../../config/organisationContent";

import ArticleModal from "./ArticleModal";
import ArticlesTable, {
    type DbArticle,
} from "./ArticlesTable";

import {
    ARTICLE_IMAGE_BUCKET,
    MAX_IMAGE_SIZE_BYTES,
    allowedImageTypes,
    createSafeFileName,
    createSlug,
    formatActions,
    normaliseArticleActions,
    parseActions,
    parseBody,
    parseTags,
    toDateTimeLocal,
} from "./articleHelpers";

import {
    validateArticle,
    type ArticleFormState,
} from "./articleValidation";

import type {
    ArticleStatus,
} from "../../../data/festivalData";


type ArticlesManagerProps = {
    onArticlesChanged?: () => void;
    createRequestKey?: number;
};

const baseInitialFormState: ArticleFormState = {
    title: "",
    slug: "",
    category: "Competition News" as ArticleFormState["category"],
    status: "draft",
    summary: "",
    hero: "",
    readTime: "3 min read",
    body: "",
    author: "Editorial Team",
    publishedAt: "",
    featured: false,
    imageUrl: "",
    imageAlt: "",
    tags: "",
    actions: "",
};

function createImagePath(
    organisationId: string,
    fileName: string,
) {
    const uniqueId =
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`;

    return `${organisationId}/articles/${Date.now()}-${uniqueId}-${createSafeFileName(
        fileName,
    )}`;
}

function getEnteredActionLines(value: string) {
    return value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
}

function normaliseArticleBody(
    value: DbArticle["body"],
): string {
    if (Array.isArray(value)) {
        return value
            .map((paragraph) =>
                String(paragraph).trim(),
            )
            .filter(Boolean)
            .join("\n\n");
    }

    if (typeof value === "string") {
        const trimmedValue =
            value.trim();

        if (!trimmedValue) {
            return "";
        }

        try {
            const parsedValue =
                JSON.parse(trimmedValue);

            if (Array.isArray(parsedValue)) {
                return parsedValue
                    .map((paragraph) =>
                        String(
                            paragraph,
                        ).trim(),
                    )
                    .filter(Boolean)
                    .join("\n\n");
            }
        } catch {
            // The value is ordinary article text.
        }

        return value;
    }

    return "";
}

function normaliseArticleTags(
    value: DbArticle["tags"],
): string {
    if (Array.isArray(value)) {
        return value
            .map((tag) =>
                String(tag).trim(),
            )
            .filter(Boolean)
            .join(", ");
    }

    if (typeof value === "string") {
        const trimmedValue =
            value.trim();

        if (!trimmedValue) {
            return "";
        }

        try {
            const parsedValue =
                JSON.parse(trimmedValue);

            if (Array.isArray(parsedValue)) {
                return parsedValue
                    .map((tag) =>
                        String(tag).trim(),
                    )
                    .filter(Boolean)
                    .join(", ");
            }
        } catch {
            // The value is already display text.
        }

        return value;
    }

    return "";
}

export function ArticlesManager({
                                    onArticlesChanged,
                                    createRequestKey = 0,
                                }: ArticlesManagerProps) {
    const { currentOrganisation } =
        useOrganisation();

    const organisationId =
        currentOrganisation?.id ?? null;

    const contentConfig = useMemo(
        () =>
            getOrganisationContentConfig(
                currentOrganisation?.slug,
            ),
        [currentOrganisation?.slug],
    );

    const initialFormState =
        useMemo<ArticleFormState>(
            () => ({
                ...baseInitialFormState,
                category:
                    contentConfig.defaultArticleCategory as ArticleFormState["category"],
            }),
            [contentConfig.defaultArticleCategory],
        );

    const [articles, setArticles] =
        useState<DbArticle[]>([]);

    const [form, setForm] =
        useState<ArticleFormState>(
            initialFormState,
        );

    const [editingId, setEditingId] =
        useState<string | null>(null);

    const [
        showArticleModal,
        setShowArticleModal,
    ] = useState(false);

    const [
        articleToDelete,
        setArticleToDelete,
    ] = useState<DbArticle | null>(null);

    useEffect(() => {
        if (createRequestKey > 0) {
            openCreateArticleModal();
        }
    }, [createRequestKey]);

    const [loading, setLoading] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    const [
        uploadingImage,
        setUploadingImage,
    ] = useState(false);

    const [message, setMessage] =
        useState<string | null>(null);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState<string | null>(null);

    const editingArticle = useMemo(
        () =>
            articles.find(
                (article) =>
                    article.id === editingId,
            ) ?? null,
        [articles, editingId],
    );

    const resetForm = useCallback(() => {
        setForm(initialFormState);
        setEditingId(null);
        setShowArticleModal(false);
    }, []);

    const loadArticles =
        useCallback(async () => {
            if (!organisationId) {
                setArticles([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            setErrorMessage(null);

            const { data, error } =
                await supabase
                    .from("articles")
                    .select(
                        `
                            id,
                            organisation_id,
                            slug,
                            title,
                            category,
                            status,
                            summary,
                            hero,
                            read_time,
                            body,
                            author,
                            published_at,
                            featured,
                            image_url,
                            image_alt,
                            tags,
                            actions,
                            created_at,
                            updated_at
                        `,
                    )
                    .eq(
                        "organisation_id",
                        organisationId,
                    )
                    .order("created_at", {
                        ascending: false,
                    });

            if (error) {
                console.error(
                    "Failed to load articles:",
                    error,
                );

                setArticles([]);
                setErrorMessage(
                    "Unable to load articles for this organisation.",
                );
                setLoading(false);
                return;
            }

            setArticles(
                (data ?? []) as DbArticle[],
            );
            setLoading(false);
        }, [organisationId]);

    useEffect(() => {
        setArticles([]);
        setArticleToDelete(null);
        resetForm();

        void loadArticles();
    }, [
        loadArticles,
        organisationId,
        resetForm,
    ]);

    function updateForm<
        Key extends keyof ArticleFormState,
    >(
        key: Key,
        value: ArticleFormState[Key],
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
            editingArticle?.status ===
            "published" ||
            editingArticle?.status ===
            "archived";

        setForm((current) => ({
            ...current,
            title,
            slug: shouldPreserveSlug
                ? current.slug
                : createSlug(title),
        }));
    }

    function openCreateArticleModal() {
        if (!organisationId) {
            setErrorMessage(
                "Select an organisation before creating an article.",
            );
            return;
        }

        setForm(initialFormState);
        setEditingId(null);
        setMessage(null);
        setErrorMessage(null);
        setShowArticleModal(true);
    }

    function openEditArticleModal(
        article: DbArticle,
    ) {
        if (
            !organisationId ||
            article.organisation_id !==
            organisationId
        ) {
            setErrorMessage(
                "This article does not belong to the selected organisation.",
            );
            return;
        }

        setForm({
            title: article.title ?? "",
            slug: article.slug ?? "",
            category:
                article.category ??
                (contentConfig.defaultArticleCategory as ArticleFormState["category"]),
            status:
                article.status ?? "draft",
            summary: article.summary ?? "",
            hero: article.hero ?? "",
            readTime:
                article.read_time ??
                "3 min read",
            body: normaliseArticleBody(
                article.body,
            ),
            author:
                article.author ??
                "Editorial Team",
            publishedAt: toDateTimeLocal(
                article.published_at,
            ),
            featured:
                article.featured ?? false,
            imageUrl:
                article.image_url ?? "",
            imageAlt:
                article.image_alt ?? "",
            tags: normaliseArticleTags(
                article.tags,
            ),
            actions: formatActions(
                normaliseArticleActions(
                    article.actions,
                ),
            ),
        });

        setEditingId(article.id);
        setMessage(null);
        setErrorMessage(null);
        setShowArticleModal(true);
    }

    async function uploadArticleImage(
        file: File,
    ) {
        setMessage(null);
        setErrorMessage(null);

        if (!organisationId) {
            setErrorMessage(
                "Select an organisation before uploading an image.",
            );
            return;
        }

        if (
            !allowedImageTypes.includes(
                file.type,
            )
        ) {
            setErrorMessage(
                "Please select a JPEG, PNG or WebP image.",
            );
            return;
        }

        if (
            file.size >
            MAX_IMAGE_SIZE_BYTES
        ) {
            setErrorMessage(
                "The image must be no larger than 5 MB.",
            );
            return;
        }

        setUploadingImage(true);

        try {
            const imagePath =
                createImagePath(
                    organisationId,
                    file.name,
                );

            const {
                error: uploadError,
            } = await supabase.storage
                .from(
                    ARTICLE_IMAGE_BUCKET,
                )
                .upload(imagePath, file, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type,
                });

            if (uploadError) {
                console.error(
                    "Failed to upload article image:",
                    uploadError,
                );

                setErrorMessage(
                    uploadError.message ||
                    "Unable to upload the image.",
                );
                return;
            }

            const {
                data: publicUrlData,
            } = supabase.storage
                .from(
                    ARTICLE_IMAGE_BUCKET,
                )
                .getPublicUrl(imagePath);

            const publicUrl =
                publicUrlData.publicUrl;

            if (!publicUrl) {
                setErrorMessage(
                    "The image uploaded, but its public URL could not be generated.",
                );
                return;
            }

            setForm((current) => ({
                ...current,
                imageUrl: publicUrl,
                imageAlt:
                    current.imageAlt.trim() ||
                    current.title.trim(),
            }));

            setMessage(
                "Hero image uploaded successfully. Save the article to keep this image.",
            );
        } finally {
            setUploadingImage(false);
        }
    }

    function clearArticleImage() {
        setForm((current) => ({
            ...current,
            imageUrl: "",
            imageAlt: "",
        }));

        setMessage(
            "The hero image has been removed. Save the article to apply the change.",
        );
        setErrorMessage(null);
    }

    async function saveArticle() {
        const validationError =
            validateArticle(
                form,
                organisationId,
            );

        if (validationError) {
            setErrorMessage(
                validationError,
            );
            setMessage(null);
            return;
        }

        const enteredActionLines =
            getEnteredActionLines(
                form.actions,
            );

        const parsedActions =
            parseActions(form.actions);

        if (
            enteredActionLines.length !==
            parsedActions.length
        ) {
            setErrorMessage(
                "Each further-reading link must be entered as 'Link label | https://example.com'.",
            );
            setMessage(null);
            return;
        }

        if (!organisationId) {
            return;
        }

        setSaving(true);
        setMessage(null);
        setErrorMessage(null);

        try {
            const publishedAt =
                form.status === "published"
                    ? form.publishedAt
                        ? new Date(
                            form.publishedAt,
                        ).toISOString()
                        : editingArticle
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
                title: form.title.trim(),
                slug: createSlug(
                    form.slug ||
                    form.title,
                ),
                category: form.category,
                status: form.status,
                summary:
                    form.summary.trim(),
                hero: form.hero.trim(),
                read_time:
                    form.readTime.trim() ||
                    "3 min read",
                body: parseBody(form.body),
                author:
                    form.author.trim(),
                published_at:
                publishedAt,
                featured: form.featured,
                image_url:
                    form.imageUrl.trim() ||
                    null,
                image_alt:
                    form.imageAlt.trim() ||
                    form.title.trim() ||
                    null,
                tags: parseTags(
                    form.tags,
                ),
                actions: parsedActions,
            };

            const response = editingId
                ? await supabase
                    .from("articles")
                    .update(payload)
                    .eq("id", editingId)
                    .eq(
                        "organisation_id",
                        organisationId,
                    )
                : await supabase
                    .from("articles")
                    .insert(payload);

            if (response.error) {
                console.error(
                    "Failed to save article:",
                    response.error,
                );

                setErrorMessage(
                    response.error.code ===
                    "23505"
                        ? "An article with this URL already exists."
                        : response.error.message,
                );
                return;
            }

            setMessage(
                editingId
                    ? "Article updated successfully."
                    : "Article created successfully.",
            );

            resetForm();
            await loadArticles();
            onArticlesChanged?.();
        } catch (error) {
            console.error(
                "Unexpected error while saving article:",
                error,
            );

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to save the article.",
            );
        } finally {
            setSaving(false);
        }
    }

    async function updateStatus(
        article: DbArticle,
        status: ArticleStatus,
    ) {
        if (
            !organisationId ||
            article.organisation_id !==
            organisationId
        ) {
            setErrorMessage(
                "This article does not belong to the selected organisation.",
            );
            return;
        }

        setMessage(null);
        setErrorMessage(null);

        const publishedAt =
            status === "published"
                ? article.published_at ??
                new Date().toISOString()
                : article.published_at;

        const { error } =
            await supabase
                .from("articles")
                .update({
                    status,
                    published_at:
                    publishedAt,
                })
                .eq("id", article.id)
                .eq(
                    "organisation_id",
                    organisationId,
                );

        if (error) {
            console.error(
                "Failed to update article status:",
                error,
            );

            setErrorMessage(
                "Unable to update article status.",
            );
            return;
        }

        setMessage(
            `Article status changed to ${status}.`,
        );

        await loadArticles();
        onArticlesChanged?.();
    }

    async function deleteArticle() {
        if (
            !articleToDelete ||
            !organisationId ||
            saving
        ) {
            return;
        }

        if (
            articleToDelete
                .organisation_id !==
            organisationId
        ) {
            setErrorMessage(
                "This article does not belong to the selected organisation.",
            );
            setArticleToDelete(null);
            return;
        }

        const article =
            articleToDelete;

        setSaving(true);
        setMessage(null);
        setErrorMessage(null);

        try {
            const { error } =
                await supabase
                    .from("articles")
                    .delete()
                    .eq(
                        "id",
                        article.id,
                    )
                    .eq(
                        "organisation_id",
                        organisationId,
                    );

            if (error) {
                console.error(
                    "Failed to delete article:",
                    error,
                );

                setErrorMessage(
                    "Unable to delete the article.",
                );
                return;
            }

            if (
                editingId ===
                article.id
            ) {
                resetForm();
            }

            setArticleToDelete(null);
            setMessage(
                "Article deleted successfully.",
            );

            await loadArticles();
            onArticlesChanged?.();
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
                    Select an organisation before managing articles.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-lime-900/50 bg-[#0b150a] p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-400">
                        Content Management
                    </p>

                    <h3 className="mt-1 text-3xl font-black text-white">
                        Manage Articles
                    </h3>

                    <p className="mt-2 text-sm text-slate-400">
                        Create, edit, review and publish content for{" "}
                        <strong className="text-white">
                            {currentOrganisation.name}
                        </strong>
                        .
                    </p>
                </div>

                <button
                    type="button"
                    onClick={
                        openCreateArticleModal
                    }
                    className="rounded-xl bg-lime-400 px-5 py-3 font-black text-black transition hover:bg-lime-300"
                >
                    + Add Article
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

            <ArticlesTable
                loading={loading}
                organisationName={
                    currentOrganisation.name
                }
                articles={articles}
                onEdit={
                    openEditArticleModal
                }
                onPublish={(article) =>
                    void updateStatus(
                        article,
                        "published",
                    )
                }
                onUnpublish={(article) =>
                    void updateStatus(
                        article,
                        "draft",
                    )
                }
                onArchive={(article) =>
                    void updateStatus(
                        article,
                        "archived",
                    )
                }
                onDelete={
                    setArticleToDelete
                }
            />

            <ArticleModal
                open={showArticleModal}
                mode={
                    editingId
                        ? "edit"
                        : "create"
                }
                values={form}
                organisationName={
                    currentOrganisation.name
                }
                uploadingImage={
                    uploadingImage
                }
                saving={saving}
                message={message}
                errorMessage={errorMessage}
                onChange={updateForm}
                onTitleChange={
                    handleTitleChange
                }
                onUploadImage={
                    uploadArticleImage
                }
                onRemoveImage={
                    clearArticleImage
                }
                onSave={saveArticle}
                onCancel={resetForm}
            />

            {articleToDelete && (
                <ConfirmDialog
                    title="Delete Article"
                    message={`Are you sure you want to delete "${articleToDelete.title}"? This action cannot be undone.`}
                    confirmText={
                        saving
                            ? "Deleting..."
                            : "Delete"
                    }
                    cancelText="Cancel"
                    onCancel={() => {
                        if (!saving) {
                            setArticleToDelete(
                                null,
                            );
                        }
                    }}
                    onConfirm={() => {
                        if (!saving) {
                            void deleteArticle();
                        }
                    }}
                />
            )}
        </div>
    );
}