import {
    useRef,
    useState,
    type ChangeEvent,
} from 'react'
import { supabase } from '../../lib/supabaseClient'

type ImageUploadProps = {
    value: string
    organisationId: string
    folder: string
    label?: string
    disabled?: boolean
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
        <div className="imageUploadField">
            <span className="imageUploadLabel">
                {label}
            </span>

            {value ? (
                <div className="imageUploadPreview">
                    <img
                        src={value}
                        alt={`${label} preview`}
                        style={{
                            width: '120px',
                            height: '120px',
                            objectFit: 'contain',
                            borderRadius: '10px',
                            border: '1px solid #d7dce5',
                            background: '#ffffff',
                            padding: '8px',
                        }}
                    />

                    <div className="imageUploadActions">
                        <button
                            className="btn secondary"
                            type="button"
                            disabled={isDisabled}
                            onClick={() =>
                                inputRef.current?.click()
                            }
                        >
                            {uploading
                                ? 'Uploading...'
                                : 'Replace Badge'}
                        </button>

                        <button
                            className="btn danger"
                            type="button"
                            disabled={isDisabled}
                            onClick={() => onChange('')}
                        >
                            Remove
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    className="btn secondary"
                    type="button"
                    disabled={isDisabled}
                    onClick={() =>
                        inputRef.current?.click()
                    }
                >
                    {uploading
                        ? 'Uploading...'
                        : 'Upload Club Badge'}
                </button>
            )}

            <input
                ref={inputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                hidden
                disabled={isDisabled}
                onChange={handleFileChange}
            />

            <small className="muted">
                PNG, JPG, WebP or SVG. Maximum 5 MB.
            </small>

            {error && (
                <p className="formError">
                    {error}
                </p>
            )}
        </div>
    )
}