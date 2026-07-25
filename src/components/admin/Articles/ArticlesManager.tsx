import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useOrganisation } from "../../../context/OrganisationContext";
import type {
    ArticleAction,
    ArticleCategory,
    ArticleStatus,
} from "../../../data/festivalData";

const ARTICLE_IMAGE_BUCKET = "article-images";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const allowedImageTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

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

type DbArticle = {
    id: string;
    organisation_id: string;
    slug: string;
    title: string;
    category: ArticleCategory;
    status: ArticleStatus;
    summary: string;
    hero: string;
    read_time: string;
    body: string[];
    author: string;
    published_at: string | null;
    featured: boolean;
    image_url: string | null;
    image_alt: string | null;
    tags: string[];
    actions: ArticleAction[];
    created_at: string;
    updated_at: string;
};

type ArticleFormState = {
    title: string;
    slug: string;
    category: ArticleCategory;
    status: ArticleStatus;
    summary: string;
    hero: string;
    readTime: string;
    body: string;
    author: string;
    publishedAt: string;
    featured: boolean;
    imageUrl: string;
    imageAlt: string;
    tags: string;
    actions: string;
};

type ArticlesManagerProps = {
    onArticlesChanged?: () => void;
};

const initialFormState: ArticleFormState = {
    title: "",
    slug: "",
    category: "Festival News",
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

function createSlug(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function createSafeFileName(fileName: string) {
    const extension = fileName
        .split(".")
        .pop()
        ?.toLowerCase();

    const baseName = fileName
        .replace(/\.[^/.]+$/, "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const safeBaseName =
        baseName || "article-image";

    return extension
        ? `${safeBaseName}.${extension}`
        : safeBaseName;
}

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

function toDateTimeLocal(value: string | null) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const offset = date.getTimezoneOffset();

    const localDate = new Date(
        date.getTime() - offset * 60_000,
    );

    return localDate
        .toISOString()
        .slice(0, 16);
}

function parseBody(value: string) {
    return value
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
}

function parseTags(value: string) {
    return value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function isValidHttpUrl(value: string) {
    try {
        const url = new URL(value);

        return (
            url.protocol === "http:" ||
            url.protocol === "https:"
        );
    } catch {
        return false;
    }
}

function parseActions(
    value: string,
): ArticleAction[] {
    return value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const markdownMatch = line.match(
                /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/i,
            );

            if (markdownMatch) {
                return {
                    label: markdownMatch[1].trim(),
                    href: markdownMatch[2].trim(),
                };
            }

            const separatorIndex =
                line.indexOf("|");

            if (separatorIndex !== -1) {
                const label = line
                    .slice(0, separatorIndex)
                    .trim();

                const href = line
                    .slice(separatorIndex + 1)
                    .trim();

                if (
                    label &&
                    isValidHttpUrl(href)
                ) {
                    return {
                        label,
                        href,
                    };
                }

                return null;
            }

            if (isValidHttpUrl(line)) {
                try {
                    const url = new URL(line);

                    return {
                        label: url.hostname.replace(
                            /^www\./,
                            "",
                        ),
                        href: line,
                    };
                } catch {
                    return null;
                }
            }

            return null;
        })
        .filter(
            (
                action,
            ): action is ArticleAction =>
                action !== null,
        );
}

function normaliseArticleActions(
    value: unknown,
): ArticleAction[] {
    if (Array.isArray(value)) {
        return value
            .map((item) => {
                if (
                    !item ||
                    typeof item !== "object"
                ) {
                    return null;
                }

                const action =
                    item as Record<
                        string,
                        unknown
                    >;

                if (
                    typeof action.label !==
                    "string" ||
                    typeof action.href !==
                    "string" ||
                    !isValidHttpUrl(
                        action.href,
                    )
                ) {
                    return null;
                }

                return {
                    label: action.label,
                    href: action.href,
                };
            })
            .filter(
                (
                    action,
                ): action is ArticleAction =>
                    action !== null,
            );
    }

    if (typeof value === "string") {
        try {
            return normaliseArticleActions(
                JSON.parse(value),
            );
        } catch {
            return parseActions(value);
        }
    }

    return [];
}

function formatActions(
    actions: ArticleAction[] | null,
) {
    return (actions ?? [])
        .map(
            (action) =>
                `${action.label} | ${action.href}`,
        )
        .join("\n");
}

export function ArticlesManager({
                                    onArticlesChanged,
                                }: ArticlesManagerProps) {
    const { currentOrganisation } =
        useOrganisation();

    const [articles, setArticles] =
        useState<DbArticle[]>([]);

    const [form, setForm] =
        useState<ArticleFormState>(
            initialFormState,
        );

    const [editingId, setEditingId] =
        useState<string | null>(null);

    const [
        showArticleForm,
        setShowArticleForm,
    ] = useState(false);

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

    const organisationId =
        currentOrganisation?.id ?? null;

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
        setShowArticleForm(false);
        setMessage(null);
        setErrorMessage(null);
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

                setErrorMessage(
                    "Unable to load articles for this organisation.",
                );

                setArticles([]);
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
        resetForm();

        void loadArticles();
    }, [
        organisationId,
        loadArticles,
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
        setForm((current) => ({
            ...current,
            title,
            slug:
                editingId || current.slug
                    ? current.slug
                    : createSlug(title),
        }));
    }

    function openCreateArticleForm() {
        if (!organisationId) {
            setErrorMessage(
                "Select an organisation before creating an article.",
            );
            return;
        }

        setForm(initialFormState);
        setEditingId(null);
        setShowArticleForm(true);
        setMessage(null);
        setErrorMessage(null);
    }

    function startEditing(
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

        const articleBody = Array.isArray(
            article.body,
        )
            ? article.body.join("\n\n")
            : typeof article.body === "string"
                ? article.body
                : "";

        const articleTags = Array.isArray(
            article.tags,
        )
            ? article.tags.join(", ")
            : typeof article.tags === "string"
                ? article.tags
                : "";

        const articleActions =
            formatActions(
                normaliseArticleActions(
                    article.actions,
                ),
            );

        setForm({
            title: article.title ?? "",
            slug: article.slug ?? "",
            category:
                article.category ??
                "Festival News",
            status:
                article.status ?? "draft",
            summary: article.summary ?? "",
            hero: article.hero ?? "",
            readTime:
                article.read_time ??
                "3 min read",
            body: articleBody,
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
            tags: articleTags,
            actions: articleActions,
        });

        setEditingId(article.id);
        setShowArticleForm(true);
        setMessage(null);
        setErrorMessage(null);

        requestAnimationFrame(() => {
            document
                .querySelector<HTMLElement>(
                    ".articleAdminForm",
                )
                ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
        });
    }

    function validateForm() {
        if (!organisationId) {
            return "Select an organisation before saving an article.";
        }

        if (!form.title.trim()) {
            return "Article title is required.";
        }

        if (!form.slug.trim()) {
            return "Article slug is required.";
        }

        if (!form.summary.trim()) {
            return "Article summary is required.";
        }

        if (!form.hero.trim()) {
            return "Article introduction is required.";
        }

        if (!form.body.trim()) {
            return "Article body is required.";
        }

        if (!form.author.trim()) {
            return "Article author is required.";
        }

        return null;
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

        const imagePath = createImagePath(
            organisationId,
            file.name,
        );

        const { error: uploadError } =
            await supabase.storage
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

            setUploadingImage(false);
            return;
        }

        const { data: publicUrlData } =
            supabase.storage
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

            setUploadingImage(false);
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

        setUploadingImage(false);
    }

    function clearArticleImage() {
        setForm((current) => ({
            ...current,
            imageUrl: "",
            imageAlt: "",
        }));

        setMessage(
            "The hero image has been removed from the form. Save the article to apply the change.",
        );

        setErrorMessage(null);
    }

    async function saveArticle() {
        const validationError =
            validateForm();

        const enteredActionLines =
            form.actions
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean);

        const parsedActions =
            parseActions(form.actions);

        if (
            enteredActionLines.length !==
            parsedActions.length
        ) {
            setErrorMessage(
                "Each further-reading link must be entered as 'Link label | https://example.com', a plain https:// URL, or Markdown such as '[Link label](https://example.com)'.",
            );

            setMessage(null);
            return;
        }

        if (validationError) {
            setErrorMessage(
                validationError,
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
                    form.slug,
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
                        ? "An article with this slug already exists."
                        : response.error
                            .message,
                );

                return;
            }

            setMessage(
                editingId
                    ? "Article updated successfully."
                    : "Article created successfully.",
            );

            setForm(initialFormState);
            setEditingId(null);
            setShowArticleForm(false);

            await loadArticles();
            onArticlesChanged?.();
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

        const { error } = await supabase
            .from("articles")
            .update({
                status,
                published_at: publishedAt,
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

    async function deleteArticle(
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

        const confirmed =
            window.confirm(
                `Delete "${article.title}"? This action cannot be undone.`,
            );

        if (!confirmed) {
            return;
        }

        setMessage(null);
        setErrorMessage(null);

        const { error } = await supabase
            .from("articles")
            .delete()
            .eq("id", article.id)
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
            editingId === article.id
        ) {
            resetForm();
        }

        setMessage(
            "Article deleted successfully.",
        );

        await loadArticles();
        onArticlesChanged?.();
    }

    if (!currentOrganisation) {
        return (
            <div className="teamsEmptyState">
                <h3>No organisation selected</h3>

                <p>
                    Select an organisation before
                    managing articles.
                </p>
            </div>
        );
    }

    return (
        <div>
            <div className="adminWorkspaceHeader">
                <div>
                    <h3>Manage Articles</h3>

                    <p className="muted">
                        Create, edit, review and
                        publish content for{" "}
                        <strong>
                            {
                                currentOrganisation.name
                            }
                        </strong>
                        .
                    </p>
                </div>

                {!showArticleForm ? (
                    <button
                        className="btn primary"
                        type="button"
                        onClick={
                            openCreateArticleForm
                        }
                    >
                        + Add Article
                    </button>
                ) : (
                    <button
                        className="btn secondary"
                        type="button"
                        disabled={
                            saving ||
                            uploadingImage
                        }
                        onClick={resetForm}
                    >
                        Cancel
                    </button>
                )}
            </div>

            {message && (
                <p className="adminSuccessMessage">
                    {message}
                </p>
            )}

            {errorMessage && (
                <p className="adminErrorMessage">
                    {errorMessage}
                </p>
            )}

            {showArticleForm && (
                <div className="articleAdminForm">
                    <div className="adminFormGrid">
                        <label>
                            <span>
                                Article title
                            </span>

                            <input
                                value={form.title}
                                onChange={(
                                    event,
                                ) =>
                                    handleTitleChange(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Enter article title"
                            />
                        </label>

                        <label>
                            <span>
                                URL slug
                            </span>

                            <input
                                value={form.slug}
                                onChange={(
                                    event,
                                ) =>
                                    updateForm(
                                        "slug",
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="article-url-slug"
                            />
                        </label>

                        <label>
                            <span>
                                Category
                            </span>

                            <select
                                value={
                                    form.category
                                }
                                onChange={(
                                    event,
                                ) =>
                                    updateForm(
                                        "category",
                                        event
                                            .target
                                            .value as ArticleCategory,
                                    )
                                }
                            >
                                {articleCategories.map(
                                    (
                                        category,
                                    ) => (
                                        <option
                                            key={
                                                category
                                            }
                                            value={
                                                category
                                            }
                                        >
                                            {
                                                category
                                            }
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>

                        <label>
                            <span>
                                Status
                            </span>

                            <select
                                value={
                                    form.status
                                }
                                onChange={(
                                    event,
                                ) =>
                                    updateForm(
                                        "status",
                                        event
                                            .target
                                            .value as ArticleStatus,
                                    )
                                }
                            >
                                {articleStatuses.map(
                                    (status) => (
                                        <option
                                            key={
                                                status
                                            }
                                            value={
                                                status
                                            }
                                        >
                                            {
                                                status
                                            }
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>

                        <label>
                            <span>
                                Author
                            </span>

                            <input
                                value={
                                    form.author
                                }
                                onChange={(
                                    event,
                                ) =>
                                    updateForm(
                                        "author",
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Article author"
                            />
                        </label>

                        <label>
                            <span>
                                Read time
                            </span>

                            <input
                                value={
                                    form.readTime
                                }
                                onChange={(
                                    event,
                                ) =>
                                    updateForm(
                                        "readTime",
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="3 min read"
                            />
                        </label>

                        <label>
                            <span>
                                Publication date
                            </span>

                            <input
                                type="datetime-local"
                                value={
                                    form.publishedAt
                                }
                                onChange={(
                                    event,
                                ) =>
                                    updateForm(
                                        "publishedAt",
                                        event
                                            .target
                                            .value,
                                    )
                                }
                            />
                        </label>

                        <label className="adminCheckboxLabel">
                            <input
                                type="checkbox"
                                checked={
                                    form.featured
                                }
                                onChange={(
                                    event,
                                ) =>
                                    updateForm(
                                        "featured",
                                        event
                                            .target
                                            .checked,
                                    )
                                }
                            />

                            <span>
                                Featured article
                            </span>
                        </label>

                        <label className="adminFormFullWidth">
                            <span>
                                Summary
                            </span>

                            <textarea
                                value={
                                    form.summary
                                }
                                onChange={(
                                    event,
                                ) =>
                                    updateForm(
                                        "summary",
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Short card summary"
                                rows={3}
                            />
                        </label>

                        <label className="adminFormFullWidth">
                            <span>
                                Article
                                introduction
                            </span>

                            <textarea
                                value={
                                    form.hero
                                }
                                onChange={(
                                    event,
                                ) =>
                                    updateForm(
                                        "hero",
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Opening introduction displayed beneath the title"
                                rows={4}
                            />
                        </label>

                        <label className="adminFormFullWidth">
                            <span>
                                Article body
                            </span>

                            <textarea
                                value={
                                    form.body
                                }
                                onChange={(
                                    event,
                                ) =>
                                    updateForm(
                                        "body",
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Separate paragraphs with a blank line"
                                rows={12}
                            />
                        </label>

                        <div className="adminFormFullWidth articleImageUploadSection">
                            <div>
                                <span className="articleImageUploadLabel">
                                    Hero image
                                </span>

                                <p className="muted articleImageUploadHelp">
                                    Upload a JPEG,
                                    PNG or WebP
                                    image. Maximum
                                    file size: 5 MB.
                                </p>
                            </div>

                            <label className="articleImageUploadButton">
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    disabled={
                                        uploadingImage
                                    }
                                    onChange={(
                                        event,
                                    ) => {
                                        const file =
                                            event
                                                .target
                                                .files?.[0];

                                        if (
                                            file
                                        ) {
                                            void uploadArticleImage(
                                                file,
                                            );
                                        }

                                        event.target.value =
                                            "";
                                    }}
                                />

                                <span className="btn secondary">
                                    {uploadingImage
                                        ? "Uploading..."
                                        : "Choose image"}
                                </span>
                            </label>

                            {form.imageUrl && (
                                <div className="articleImagePreview">
                                    <img
                                        src={
                                            form.imageUrl
                                        }
                                        alt={
                                            form.imageAlt ||
                                            form.title ||
                                            "Article hero preview"
                                        }
                                    />

                                    <div className="articleImagePreviewActions">
                                        <a
                                            className="btn secondary small"
                                            href={
                                                form.imageUrl
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Open image
                                        </a>

                                        <button
                                            className="btn secondary small dangerButton"
                                            type="button"
                                            onClick={
                                                clearArticleImage
                                            }
                                        >
                                            Remove image
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <label>
                            <span>
                                Hero image URL
                            </span>

                            <input
                                type="url"
                                value={
                                    form.imageUrl
                                }
                                onChange={(
                                    event,
                                ) =>
                                    updateForm(
                                        "imageUrl",
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Automatically populated after upload"
                            />
                        </label>

                        <label>
                            <span>
                                Hero image alt
                                text
                            </span>

                            <input
                                value={
                                    form.imageAlt
                                }
                                onChange={(
                                    event,
                                ) =>
                                    updateForm(
                                        "imageAlt",
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Describe the image"
                            />
                        </label>

                        <label className="adminFormFullWidth">
                            <span>Tags</span>

                            <input
                                value={
                                    form.tags
                                }
                                onChange={(
                                    event,
                                ) =>
                                    updateForm(
                                        "tags",
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Football history, Grassroots football, Community"
                            />
                        </label>

                        <label className="adminFormFullWidth">
                            <span>
                                Further-reading
                                links
                            </span>

                            <textarea
                                value={
                                    form.actions
                                }
                                onChange={(
                                    event,
                                ) =>
                                    updateForm(
                                        "actions",
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder={
                                    "Link label | https://example.com\nhttps://example.com/page\n[Another resource](https://example.com/resource)"
                                }
                                rows={4}
                            />
                        </label>
                    </div>

                    <div className="adminFormActions">
                        <button
                            className="btn primary"
                            type="button"
                            disabled={
                                saving ||
                                uploadingImage
                            }
                            onClick={() =>
                                void saveArticle()
                            }
                        >
                            {saving
                                ? "Saving..."
                                : editingId
                                    ? "Update article"
                                    : "Create article"}
                        </button>

                        <button
                            className="btn secondary"
                            type="button"
                            disabled={
                                saving ||
                                uploadingImage
                            }
                            onClick={resetForm}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="adminRecordList">
                <h4>
                    Current articles for{" "}
                    {currentOrganisation.name}
                </h4>

                {loading ? (
                    <p className="muted">
                        Loading articles...
                    </p>
                ) : articles.length ? (
                    articles.map(
                        (article) => (
                            <article
                                className="adminRecord articleAdminRecord"
                                key={
                                    article.id
                                }
                            >
                                {article.image_url && (
                                    <img
                                        className="articleAdminThumbnail"
                                        src={
                                            article.image_url
                                        }
                                        alt={
                                            article.image_alt ??
                                            article.title
                                        }
                                    />
                                )}

                                <div className="articleAdminRecordDetails">
                                    <div className="articleAdminRecordBadges">
                                        <span className="badge">
                                            {
                                                article.category
                                            }
                                        </span>

                                        <span
                                            className={`articleStatusBadge articleStatus-${article.status}`}
                                        >
                                            {
                                                article.status
                                            }
                                        </span>

                                        {article.featured && (
                                            <span className="featuredBadge">
                                                Featured
                                            </span>
                                        )}
                                    </div>

                                    <strong>
                                        {
                                            article.title
                                        }
                                    </strong>

                                    <span className="muted">
                                        /
                                        {
                                            article.slug
                                        }
                                    </span>

                                    <p>
                                        {
                                            article.summary
                                        }
                                    </p>
                                </div>

                                <div className="articleAdminRecordActions">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            startEditing(
                                                article,
                                            )
                                        }
                                    >
                                        Edit
                                    </button>

                                    {article.status !==
                                        "published" && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void updateStatus(
                                                        article,
                                                        "published",
                                                    )
                                                }
                                            >
                                                Publish
                                            </button>
                                        )}

                                    {article.status ===
                                        "published" && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void updateStatus(
                                                        article,
                                                        "draft",
                                                    )
                                                }
                                            >
                                                Unpublish
                                            </button>
                                        )}

                                    {article.status !==
                                        "archived" && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void updateStatus(
                                                        article,
                                                        "archived",
                                                    )
                                                }
                                            >
                                                Archive
                                            </button>
                                        )}

                                    <button
                                        type="button"
                                        className="dangerButton"
                                        onClick={() =>
                                            void deleteArticle(
                                                article,
                                            )
                                        }
                                    >
                                        Delete
                                    </button>
                                </div>
                            </article>
                        ),
                    )
                ) : (
                    <p className="muted">
                        No articles have been
                        created for{" "}
                        {
                            currentOrganisation.name
                        }
                        .
                    </p>
                )}
            </div>
        </div>
    );
}