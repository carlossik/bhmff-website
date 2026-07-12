import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'
import { supabase } from '../../../lib/supabaseClient'
import type {
    ArticleAction,
    ArticleCategory,
    ArticleStatus,
} from '../../../data/festivalData'

const ARTICLE_IMAGE_BUCKET = 'article-images'
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

const allowedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
]

const articleCategories: ArticleCategory[] = [
    'Black Football History',
    'Player Stories',
    'Coach & Volunteer Spotlights',
    'Club & Community Features',
    'Festival News',
    'Match Reports',
    'Careers in Football',
    'Opinion & Education',
    'Sponsor & Partner Stories',
    'Youth Voices',
]

const articleStatuses: ArticleStatus[] = [
    'draft',
    'review',
    'scheduled',
    'published',
    'archived',
]

type DbArticle = {
    id: string
    slug: string
    title: string
    category: ArticleCategory
    status: ArticleStatus
    summary: string
    hero: string
    read_time: string
    body: string[]
    author: string
    published_at: string | null
    featured: boolean
    image_url: string | null
    image_alt: string | null
    tags: string[]
    actions: ArticleAction[]
    created_at: string
    updated_at: string
}

type ArticleFormState = {
    title: string
    slug: string
    category: ArticleCategory
    status: ArticleStatus
    summary: string
    hero: string
    readTime: string
    body: string
    author: string
    publishedAt: string
    featured: boolean
    imageUrl: string
    imageAlt: string
    tags: string
    actions: string
}

type ArticlesManagerProps = {
    onArticlesChanged?: () => void
}

const initialFormState: ArticleFormState = {
    title: '',
    slug: '',
    category: 'Festival News',
    status: 'draft',
    summary: '',
    hero: '',
    readTime: '3 min read',
    body: '',
    author: 'CKEFA Media Editorial Team',
    publishedAt: '',
    featured: false,
    imageUrl: '',
    imageAlt: '',
    tags: '',
    actions: '',
}

function createSlug(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function createSafeFileName(fileName: string) {
    const extension = fileName
        .split('.')
        .pop()
        ?.toLowerCase()

    const baseName = fileName
        .replace(/\.[^/.]+$/, '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    const safeBaseName = baseName || 'article-image'

    return extension
        ? `${safeBaseName}.${extension}`
        : safeBaseName
}

function createImagePath(fileName: string) {
    const uniqueId =
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`

    return `articles/${Date.now()}-${uniqueId}-${createSafeFileName(
        fileName
    )}`
}

function toDateTimeLocal(value: string | null) {
    if (!value) {
        return ''
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return ''
    }

    const offset = date.getTimezoneOffset()

    const localDate = new Date(
        date.getTime() - offset * 60_000
    )

    return localDate.toISOString().slice(0, 16)
}

function parseBody(value: string) {
    return value
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
}

function parseTags(value: string) {
    return value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
}

function parseActions(
    value: string
): ArticleAction[] {
    return value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const separatorIndex =
                line.indexOf('|')

            if (separatorIndex === -1) {
                return null
            }

            const label = line
                .slice(0, separatorIndex)
                .trim()

            const href = line
                .slice(separatorIndex + 1)
                .trim()

            if (!label || !href) {
                return null
            }

            return {
                label,
                href,
            }
        })
        .filter(
            (
                action
            ): action is ArticleAction =>
                action !== null
        )
}

function formatActions(
    actions: ArticleAction[] | null
) {
    return (actions ?? [])
        .map(
            (action) =>
                `${action.label} | ${action.href}`
        )
        .join('\n')
}

export function ArticlesManager({
                                    onArticlesChanged,
                                }: ArticlesManagerProps) {
    const [articles, setArticles] =
        useState<DbArticle[]>([])

    const [form, setForm] =
        useState<ArticleFormState>(
            initialFormState
        )

    const [editingId, setEditingId] =
        useState<string | null>(null)

    const [loading, setLoading] =
        useState(true)

    const [saving, setSaving] =
        useState(false)

    const [uploadingImage, setUploadingImage] =
        useState(false)

    const [message, setMessage] =
        useState<string | null>(null)

    const [
        errorMessage,
        setErrorMessage,
    ] = useState<string | null>(null)

    const editingArticle = useMemo(
        () =>
            articles.find(
                (article) =>
                    article.id === editingId
            ) ?? null,
        [articles, editingId]
    )

    const loadArticles =
        useCallback(async () => {
            setLoading(true)
            setErrorMessage(null)

            const { data, error } =
                await supabase
                    .from('articles')
                    .select(`
                        id,
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
                    `)
                    .order('created_at', {
                        ascending: false,
                    })

            if (error) {
                console.error(
                    'Failed to load articles:',
                    error
                )

                setErrorMessage(
                    'Unable to load articles.'
                )

                setArticles([])
                setLoading(false)
                return
            }

            setArticles(
                (data ?? []) as DbArticle[]
            )

            setLoading(false)
        }, [])

    useEffect(() => {
        void loadArticles()
    }, [loadArticles])

    function updateForm<
        Key extends keyof ArticleFormState
    >(
        key: Key,
        value: ArticleFormState[Key]
    ) {
        setForm((current) => ({
            ...current,
            [key]: value,
        }))
    }

    function handleTitleChange(title: string) {
        setForm((current) => ({
            ...current,
            title,
            slug:
                editingId || current.slug
                    ? current.slug
                    : createSlug(title),
        }))
    }

    function resetForm() {
        setForm(initialFormState)
        setEditingId(null)
        setMessage(null)
        setErrorMessage(null)
    }

    function startEditing(
        article: DbArticle
    ) {
        setEditingId(article.id)

        setForm({
            title: article.title,
            slug: article.slug,
            category: article.category,
            status: article.status,
            summary: article.summary,
            hero: article.hero,
            readTime: article.read_time,
            body: article.body.join('\n\n'),
            author: article.author,
            publishedAt: toDateTimeLocal(
                article.published_at
            ),
            featured: article.featured,
            imageUrl:
                article.image_url ?? '',
            imageAlt:
                article.image_alt ?? '',
            tags: article.tags.join(', '),
            actions: formatActions(
                article.actions
            ),
        })

        setMessage(null)
        setErrorMessage(null)

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        })
    }

    function validateForm() {
        if (!form.title.trim()) {
            return 'Article title is required.'
        }

        if (!form.slug.trim()) {
            return 'Article slug is required.'
        }

        if (!form.summary.trim()) {
            return 'Article summary is required.'
        }

        if (!form.hero.trim()) {
            return 'Article introduction is required.'
        }

        if (!form.body.trim()) {
            return 'Article body is required.'
        }

        if (!form.author.trim()) {
            return 'Article author is required.'
        }

        return null
    }

    async function uploadArticleImage(
        file: File
    ) {
        setMessage(null)
        setErrorMessage(null)

        if (
            !allowedImageTypes.includes(
                file.type
            )
        ) {
            setErrorMessage(
                'Please select a JPEG, PNG or WebP image.'
            )
            return
        }

        if (
            file.size >
            MAX_IMAGE_SIZE_BYTES
        ) {
            setErrorMessage(
                'The image must be no larger than 5 MB.'
            )
            return
        }

        setUploadingImage(true)

        const imagePath =
            createImagePath(file.name)

        const { error: uploadError } =
            await supabase.storage
                .from(ARTICLE_IMAGE_BUCKET)
                .upload(imagePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type,
                })

        if (uploadError) {
            console.error(
                'Failed to upload article image:',
                uploadError
            )

            setErrorMessage(
                uploadError.message ||
                'Unable to upload the image.'
            )

            setUploadingImage(false)
            return
        }

        const { data: publicUrlData } =
            supabase.storage
                .from(ARTICLE_IMAGE_BUCKET)
                .getPublicUrl(imagePath)

        const publicUrl =
            publicUrlData.publicUrl

        if (!publicUrl) {
            setErrorMessage(
                'The image uploaded, but its public URL could not be generated.'
            )

            setUploadingImage(false)
            return
        }

        setForm((current) => ({
            ...current,
            imageUrl: publicUrl,
            imageAlt:
                current.imageAlt.trim() ||
                current.title.trim(),
        }))

        setMessage(
            'Hero image uploaded successfully. Save the article to keep this image.'
        )

        setUploadingImage(false)
    }

    function clearArticleImage() {
        setForm((current) => ({
            ...current,
            imageUrl: '',
            imageAlt: '',
        }))

        setMessage(
            'The hero image has been removed from the form. Save the article to apply the change.'
        )

        setErrorMessage(null)
    }

    async function saveArticle() {
        const validationError =
            validateForm()

        if (validationError) {
            setErrorMessage(
                validationError
            )
            setMessage(null)
            return
        }

        setSaving(true)
        setMessage(null)
        setErrorMessage(null)

        const publishedAt =
            form.status === 'published'
                ? form.publishedAt
                    ? new Date(
                        form.publishedAt
                    ).toISOString()
                    : editingArticle
                        ?.published_at ??
                    new Date().toISOString()
                : form.publishedAt
                    ? new Date(
                        form.publishedAt
                    ).toISOString()
                    : null

        const payload = {
            title: form.title.trim(),
            slug: createSlug(form.slug),
            category: form.category,
            status: form.status,
            summary: form.summary.trim(),
            hero: form.hero.trim(),
            read_time:
                form.readTime.trim() ||
                '3 min read',
            body: parseBody(form.body),
            author: form.author.trim(),
            published_at: publishedAt,
            featured: form.featured,
            image_url:
                form.imageUrl.trim() ||
                null,
            image_alt:
                form.imageAlt.trim() ||
                null,
            tags: parseTags(form.tags),
            actions: parseActions(
                form.actions
            ),
        }

        const response = editingId
            ? await supabase
                .from('articles')
                .update(payload)
                .eq('id', editingId)
            : await supabase
                .from('articles')
                .insert(payload)

        if (response.error) {
            console.error(
                'Failed to save article:',
                response.error
            )

            setErrorMessage(
                response.error.code ===
                '23505'
                    ? 'An article with this slug already exists.'
                    : response.error.message
            )

            setSaving(false)
            return
        }

        setMessage(
            editingId
                ? 'Article updated successfully.'
                : 'Article created successfully.'
        )

        setForm(initialFormState)
        setEditingId(null)

        await loadArticles()
        onArticlesChanged?.()

        setSaving(false)
    }

    async function updateStatus(
        article: DbArticle,
        status: ArticleStatus
    ) {
        setMessage(null)
        setErrorMessage(null)

        const publishedAt =
            status === 'published'
                ? article.published_at ??
                new Date().toISOString()
                : article.published_at

        const { error } = await supabase
            .from('articles')
            .update({
                status,
                published_at:
                publishedAt,
            })
            .eq('id', article.id)

        if (error) {
            console.error(
                'Failed to update article status:',
                error
            )

            setErrorMessage(
                'Unable to update article status.'
            )
            return
        }

        setMessage(
            `Article status changed to ${status}.`
        )

        await loadArticles()
        onArticlesChanged?.()
    }

    async function deleteArticle(
        article: DbArticle
    ) {
        const confirmed =
            window.confirm(
                `Delete "${article.title}"? This action cannot be undone.`
            )

        if (!confirmed) {
            return
        }

        setMessage(null)
        setErrorMessage(null)

        const { error } = await supabase
            .from('articles')
            .delete()
            .eq('id', article.id)

        if (error) {
            console.error(
                'Failed to delete article:',
                error
            )

            setErrorMessage(
                'Unable to delete the article.'
            )
            return
        }

        if (editingId === article.id) {
            resetForm()
        }

        setMessage(
            'Article deleted successfully.'
        )

        await loadArticles()
        onArticlesChanged?.()
    }

    return (
        <div>
            <div className="adminWorkspaceHeader">
                <div>
                    <h3>
                        Manage Black History
                        Articles
                    </h3>

                    <p className="muted">
                        Create, edit, review and
                        publish content for the Black
                        History Hub.
                    </p>
                </div>

                {editingId && (
                    <button
                        className="btn secondary small"
                        type="button"
                        onClick={resetForm}
                    >
                        Create new article
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

            <div className="articleAdminForm">
                <div className="adminFormGrid">
                    <label>
                        <span>
                            Article title
                        </span>

                        <input
                            value={form.title}
                            onChange={(event) =>
                                handleTitleChange(
                                    event.target
                                        .value
                                )
                            }
                            placeholder="Enter article title"
                        />
                    </label>

                    <label>
                        <span>URL slug</span>

                        <input
                            value={form.slug}
                            onChange={(event) =>
                                updateForm(
                                    'slug',
                                    event.target
                                        .value
                                )
                            }
                            placeholder="article-url-slug"
                        />
                    </label>

                    <label>
                        <span>Category</span>

                        <select
                            value={
                                form.category
                            }
                            onChange={(event) =>
                                updateForm(
                                    'category',
                                    event.target
                                        .value as ArticleCategory
                                )
                            }
                        >
                            {articleCategories.map(
                                (category) => (
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
                                )
                            )}
                        </select>
                    </label>

                    <label>
                        <span>Status</span>

                        <select
                            value={form.status}
                            onChange={(event) =>
                                updateForm(
                                    'status',
                                    event.target
                                        .value as ArticleStatus
                                )
                            }
                        >
                            {articleStatuses.map(
                                (status) => (
                                    <option
                                        key={status}
                                        value={
                                            status
                                        }
                                    >
                                        {status}
                                    </option>
                                )
                            )}
                        </select>
                    </label>

                    <label>
                        <span>Author</span>

                        <input
                            value={form.author}
                            onChange={(event) =>
                                updateForm(
                                    'author',
                                    event.target
                                        .value
                                )
                            }
                            placeholder="Article author"
                        />
                    </label>

                    <label>
                        <span>Read time</span>

                        <input
                            value={
                                form.readTime
                            }
                            onChange={(event) =>
                                updateForm(
                                    'readTime',
                                    event.target
                                        .value
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
                            onChange={(event) =>
                                updateForm(
                                    'publishedAt',
                                    event.target
                                        .value
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
                            onChange={(event) =>
                                updateForm(
                                    'featured',
                                    event.target
                                        .checked
                                )
                            }
                        />

                        <span>
                            Featured article
                        </span>
                    </label>

                    <label className="adminFormFullWidth">
                        <span>Summary</span>

                        <textarea
                            value={form.summary}
                            onChange={(event) =>
                                updateForm(
                                    'summary',
                                    event.target
                                        .value
                                )
                            }
                            placeholder="Short card summary"
                            rows={3}
                        />
                    </label>

                    <label className="adminFormFullWidth">
                        <span>
                            Article introduction
                        </span>

                        <textarea
                            value={form.hero}
                            onChange={(event) =>
                                updateForm(
                                    'hero',
                                    event.target
                                        .value
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
                            value={form.body}
                            onChange={(event) =>
                                updateForm(
                                    'body',
                                    event.target
                                        .value
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
                                Upload a JPEG, PNG
                                or WebP image. Maximum
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
                                    event
                                ) => {
                                    const file =
                                        event
                                            .target
                                            .files?.[0]

                                    if (file) {
                                        void uploadArticleImage(
                                            file
                                        )
                                    }

                                    event.target.value =
                                        ''
                                }}
                            />

                            <span className="btn secondary">
                                {uploadingImage
                                    ? 'Uploading...'
                                    : 'Choose image'}
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
                                        'Article hero preview'
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
                            onChange={(event) =>
                                updateForm(
                                    'imageUrl',
                                    event.target
                                        .value
                                )
                            }
                            placeholder="Automatically populated after upload"
                        />
                    </label>

                    <label>
                        <span>
                            Hero image alt text
                        </span>

                        <input
                            value={
                                form.imageAlt
                            }
                            onChange={(event) =>
                                updateForm(
                                    'imageAlt',
                                    event.target
                                        .value
                                )
                            }
                            placeholder="Describe the image"
                        />
                    </label>

                    <label className="adminFormFullWidth">
                        <span>Tags</span>

                        <input
                            value={form.tags}
                            onChange={(event) =>
                                updateForm(
                                    'tags',
                                    event.target
                                        .value
                                )
                            }
                            placeholder="Football history, Grassroots football, Community"
                        />
                    </label>

                    <label className="adminFormFullWidth">
                        <span>
                            Further-reading links
                        </span>

                        <textarea
                            value={
                                form.actions
                            }
                            onChange={(event) =>
                                updateForm(
                                    'actions',
                                    event.target
                                        .value
                                )
                            }
                            placeholder={
                                'Link label | https://example.com\nSecond link | https://example.com/page'
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
                            ? 'Saving...'
                            : editingId
                                ? 'Update article'
                                : 'Create article'}
                    </button>

                    {editingId && (
                        <button
                            className="btn secondary"
                            type="button"
                            disabled={
                                saving ||
                                uploadingImage
                            }
                            onClick={resetForm}
                        >
                            Cancel editing
                        </button>
                    )}
                </div>
            </div>

            <div className="adminRecordList">
                <h4>
                    Current articles
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
                                                article
                                            )
                                        }
                                    >
                                        Edit
                                    </button>

                                    {article.status !==
                                        'published' && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void updateStatus(
                                                        article,
                                                        'published'
                                                    )
                                                }
                                            >
                                                Publish
                                            </button>
                                        )}

                                    {article.status ===
                                        'published' && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void updateStatus(
                                                        article,
                                                        'draft'
                                                    )
                                                }
                                            >
                                                Unpublish
                                            </button>
                                        )}

                                    {article.status !==
                                        'archived' && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void updateStatus(
                                                        article,
                                                        'archived'
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
                                                article
                                            )
                                        }
                                    >
                                        Delete
                                    </button>
                                </div>
                            </article>
                        )
                    )
                ) : (
                    <p className="muted">
                        No articles have been
                        created.
                    </p>
                )}
            </div>
        </div>
    )
}