import {
    useState,
    type CSSProperties,
} from 'react'

type TournamentHQBrandProps = {
    variant?: 'full' | 'compact' | 'shield'
    size?: 'sm' | 'md' | 'lg'
    className?: string
    linkToHome?: boolean
}

const sizeStyles: Record<
    NonNullable<TournamentHQBrandProps['size']>,
    {
        full: string
        shield: string
        fallbackText: string
    }
> = {
    sm: {
        full: 'h-7',
        shield: 'h-8 w-8',
        fallbackText: 'text-sm',
    },
    md: {
        full: 'h-10',
        shield: 'h-11 w-11',
        fallbackText: 'text-base',
    },
    lg: {
        full: 'h-16',
        shield: 'h-16 w-16',
        fallbackText: 'text-xl',
    },
}

function ShieldFallback({
                            size,
                        }: {
    size: 'sm' | 'md' | 'lg'
}) {
    const dimensions =
        sizeStyles[size].shield

    return (
        <span
            aria-hidden="true"
            className={`inline-flex shrink-0 items-center justify-center rounded-[28%_28%_42%_42%] border-2 border-white bg-lime-500 font-black text-slate-950 shadow-[0_0_0_2px_#111827] ${dimensions}`}
        >
            HQ
        </span>
    )
}

export function TournamentHQBrand({
                                      variant = 'full',
                                      size = 'md',
                                      className = '',
                                      linkToHome = false,
                                  }: TournamentHQBrandProps) {
    const [imageFailed, setImageFailed] =
        useState(false)

    const isShield =
        variant === 'shield'

    const imageSource = isShield
        ? '/assets/tournamenthq-shield.png'
        : '/assets/tournamenthq-logo.png'

    const imageClassName = isShield
        ? `${sizeStyles[size].shield} object-contain`
        : `${sizeStyles[size].full} w-auto max-w-full object-contain`

    const content = imageFailed ? (
        isShield ? (
            <ShieldFallback size={size} />
        ) : (
            <span
                className={`inline-flex items-baseline font-black tracking-tight ${sizeStyles[size].fallbackText}`}
            >
                <span className="text-white">
                    Tournament
                </span>

                <span className="text-lime-400">
                    HQ
                </span>
            </span>
        )
    ) : (
        <img
            src={imageSource}
            alt="TournamentHQ"
            className={imageClassName}
            onError={() =>
                setImageFailed(true)
            }
        />
    )

    const wrapperStyle: CSSProperties = {
        lineHeight: 1,
    }

    if (linkToHome) {
        return (
            <a
                href="/"
                aria-label="TournamentHQ home"
                className={`inline-flex items-center ${className}`}
                style={wrapperStyle}
            >
                {content}
            </a>
        )
    }

    return (
        <span
            className={`inline-flex items-center ${className}`}
            style={wrapperStyle}
        >
            {content}
        </span>
    )
}