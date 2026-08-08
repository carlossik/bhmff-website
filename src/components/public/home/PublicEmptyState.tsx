import type { LucideIcon } from 'lucide-react'

export type PublicEmptyStateProps = {
    title: string
    description: string
    icon: LucideIcon
    surfaceColour: string
    textColour: string
    accentColour: string
}

export function PublicEmptyState({
                                     title,
                                     description,
                                     icon: Icon,
                                     surfaceColour,
                                     textColour,
                                     accentColour,
                                 }: PublicEmptyStateProps) {
    return (
        <div
            className="rounded-2xl border px-6 py-10 text-center shadow-sm sm:px-10 sm:py-12"
            style={{
                backgroundColor: surfaceColour,
                borderColor: `${accentColour}30`,
                color: textColour,
            }}
        >
            <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{
                    backgroundColor: `${accentColour}18`,
                    color: accentColour,
                }}
            >
                <Icon
                    aria-hidden="true"
                    className="h-6 w-6"
                    strokeWidth={2.2}
                />
            </div>

            <h3 className="mt-5 text-lg font-black sm:text-xl">
                {title}
            </h3>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 opacity-75 sm:text-base">
                {description}
            </p>
        </div>
    )
}