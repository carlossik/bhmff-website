import {
    useRef,
    useState,
    type ChangeEvent,
} from 'react'
import {
    ImagePlus,
    RefreshCw,
    Trash2,
} from 'lucide-react'

import { supabase } from '../../lib/supabaseClient'

type ImageUploadProps = {
    value: string
    organisationId: string
    folder: string
    label?: string
    disabled?: boolean
    uploadLabel?: string
    replaceLabel?: string
    removeLabel?: string
    helperText?: string
    previewAlt?: string
    onChange: (url: string) => void
}

const allowedTypes = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
]

const maximumFileSize = 5 * 1024 * 1024

function sanitiseFolderName(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
}

export function ImageUpload({
    value,
    organisationId,
    folder,
    label = 'Image',
    disabled = false,
    uploadLabel = 'Upload image',
    replaceLabel = 'Replace image',
    removeLabel = 'Remove image',
    helperText =
        'PNG, JPG, WebP or SVG. Maximum 5 MB.',
    previewAlt,
    onChange,
}: ImageUploadProps) {
    const inputRef =
        useRef<HTMLInputElement | null>(null)

    const [uploading, setUploading] =
        useState(false)

    const [error, setError] =
        useState<string | null>(null)

    async function handleFileChange(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const file = event.target.files?.[0]

        if (!file) {
            return
        }

        setError(null)

        if (!organisationId.trim()) {
            setError(
                'The organisation must be saved before an image can be uploaded.'
            )
            event.target.value = ''
            return
        }

        if (!allowedTypes.includes(file.type)) {
            setError(
                'Please select a PNG, JPG, JPEG, WebP or SVG image.'
            )
            event.target.value = ''
            return
        }

        if (file.size > maximumFileSize) {
            setError(
                'The image must be smaller than 5 MB.'
            )
            event.target.value = ''
            return
        }

        setUploading(true)

        try {
            const extension =
                file.name
                    .split('.')
                    .pop()
                    ?.toLowerCase() || 'png'

            const safeFolder =
                sanitiseFolderName(folder) || 'images'

            const filePath = [
                organisationId,
                safeFolder,
                `${crypto.randomUUID()}.${extension}`,
            ].join('/')

            const {
                error: uploadError,
            } = await supabase.storage
                .from('organisation-assets')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    contentType: file.type,
                    upsert: false,
                })

            if (uploadError) {
                throw uploadError
            }

            const {
                data: publicUrlData,
            } = supabase.storage
                .from('organisation-assets')
                .getPublicUrl(filePath)

            if (!publicUrlData.publicUrl) {
                throw new Error(
                    'Supabase did not return an image URL.'
                )
            }

            onChange(publicUrlData.publicUrl)
        } catch (uploadError) {
            console.error(
                'Image upload failed:',
                uploadError
            )

            setError(
                uploadError instanceof Error
                    ? uploadError.message
                    : 'The image could not be uploaded.'
            )
        } finally {
            setUploading(false)

            if (inputRef.current) {
                inputRef.current.value = ''
            }
        }
    }

    const isDisabled = disabled || uploading

    return (
        <div className="space-y-3">
            <span className="block text-sm font-semibold text-slate-800">
                {label}
            </span>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                {value ? (
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                            <img
                                src={value}
                                alt={
                                    previewAlt ??
                                    `${label} preview`
                                }
                                className="h-full w-full object-contain"
                            />
                        </div>

                        <div className="flex flex-1 flex-wrap gap-3">
                            <button
                                type="button"
                                disabled={isDisabled}
                                onClick={() =>
                                    inputRef.current?.click()
                                }
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <RefreshCw className="h-4 w-4" />

                                {uploading
                                    ? 'Uploading...'
                                    : replaceLabel}
                            </button>

                            <button
                                type="button"
                                disabled={isDisabled}
                                onClick={() => onChange('')}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Trash2 className="h-4 w-4" />
                                {removeLabel}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                            <ImagePlus className="h-7 w-7" />
                        </div>

                        <button
                            type="button"
                            disabled={isDisabled}
                            onClick={() =>
                                inputRef.current?.click()
                            }
                            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <ImagePlus className="h-4 w-4" />

                            {uploading
                                ? 'Uploading...'
                                : uploadLabel}
                        </button>
                    </div>
                )}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                hidden
                disabled={isDisabled}
                onChange={handleFileChange}
            />

            <p className="text-xs leading-5 text-slate-500">
                {helperText}
            </p>

            {error && (
                <p
                    role="alert"
                    className="text-sm font-medium text-red-600"
                >
                    {error}
                </p>
            )}
        </div>
    )
}
